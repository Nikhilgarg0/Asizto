// ChatbotScreen.js — improved keyboard flush logic (uses screenY & small adjustment)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  Image,
  Share,
  StatusBar,
  Keyboard,
  Dimensions,
} from 'react-native';

let Clipboard = null;
try { Clipboard = require('expo-clipboard'); } catch (e) { Clipboard = null; }

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GEMINI_API_KEY } from '../apiKeys';
import { db, auth } from '../firebaseConfig';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';

const INITIAL_MESSAGE = {
  role: 'model',
  content:
    'Hello! I am Asizto. Ask me a health question and I will use your profile context to give a personalized response.\n\nDisclaimer: I am not a medical professional. Always consult a doctor for medical advice.\n',
  timestamp: Date.now(),
};

const formatTimestamp = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - oneDay);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return d.toLocaleDateString() + ' ' + time;
};

const dayString = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toDateString();
};

const AnimatedChatMessage = ({ content, onComplete, msgId, colors }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (!content) {
      opacity.setValue(1);
      translate.setValue(0);
      onComplete?.(msgId);
      return;
    }

    opacity.setValue(0);
    translate.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translate, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => onComplete?.(msgId));
  }, [content, msgId, onComplete, opacity, translate]);

  return (
    <Animated.Text style={{ color: colors.text, opacity, transform: [{ translateY: translate }] }}>
      {content}
    </Animated.Text>
  );
};

const TypingDots = ({ colors }) => {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(a1, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(a1, { toValue: 0.3, duration: 360, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(a2, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(a2, { toValue: 0.3, duration: 360, useNativeDriver: true }),
      ])
    );
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.delay(240),
        Animated.timing(a3, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(a3, { toValue: 0.3, duration: 360, useNativeDriver: true }),
      ])
    );

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [a1, a2, a3]);

  const dotStyle = (anim) => ({
    width: 6,
    height: 6,
    borderRadius: 6,
    marginHorizontal: 3,
    backgroundColor: colors.subtext || '#888',
    opacity: anim,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.View style={dotStyle(a1)} />
      <Animated.View style={dotStyle(a2)} />
      <Animated.View style={dotStyle(a3)} />
    </View>
  );
};

export default function ChatbotScreen({ route, navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const windowHeight = Dimensions.get('window').height;

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeightRaw, setKeyboardHeightRaw] = useState(0); // raw from event
  const [effectiveShift, setEffectiveShift] = useState(0); // numeric used by FlatList padding
  const flatListRef = useRef(null);
  const shiftAnim = useRef(new Animated.Value(0)).current; // animated for input move
  const scrollToEnd = useCallback(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 50);
    }
  }, []);

  const animatedMsgIdsRef = useRef(new Set());
  const focusAnim = useRef(new Animated.Value(0)).current;
  const sendScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { try { if (INITIAL_MESSAGE?.timestamp) animatedMsgIdsRef.current.add(INITIAL_MESSAGE.timestamp); } catch (e) {} }, []);
  useEffect(() => { if (route?.params?.messages) setMessages(route.params.messages); }, [route?.params?.messages]);
  useEffect(() => { scrollToEnd(); }, [messages, scrollToEnd]);

  // ---------- Keyboard listeners: use screenY when available, subtract insets & small adjustment ----------
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const ADJUSTMENT = Platform.OS === 'android' ? 6 : 0; // small tuner; decrease if still gap, increase if overshoot

    const onShow = (e) => {
      // prefer screenY if present (more accurate on some Android devices)
      const screenY = e?.endCoordinates?.screenY;
      const heightFromCoords = e?.endCoordinates?.height || 0;
      const rawHeight = screenY ? Math.max(0, Math.round(windowHeight - screenY)) : Math.max(0, Math.round(heightFromCoords));
      setKeyboardHeightRaw(rawHeight);

      // compute a numeric effective shift for list padding and input movement:
      // subtract bottom safe inset (home indicator) and small platform adjustment
      const shiftNumeric = Math.max(0, rawHeight - insets.bottom - ADJUSTMENT);
      setEffectiveShift(shiftNumeric);

      // animate the input's margin smoothly; use event duration if available (iOS keyboardWillShow)
      const duration = (e && e.duration) ? e.duration : 200;
      Animated.timing(shiftAnim, {
        toValue: shiftNumeric,
        duration,
        useNativeDriver: false,
      }).start();

      setKeyboardVisible(true);

      // ensure messages scroll into view
      setTimeout(() => scrollToEnd(), 90);
    };

    const onHide = (e) => {
      setKeyboardHeightRaw(0);
      setEffectiveShift(0);
      const duration = (e && e.duration) ? e.duration : 150;
      Animated.timing(shiftAnim, { toValue: 0, duration, useNativeDriver: false }).start();
      setKeyboardVisible(false);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, scrollToEnd, shiftAnim, windowHeight]);

  // Hide parent tab bar while keyboard is visible (React Navigation)
  useEffect(() => {
    try {
      const parent = navigation?.getParent?.();
      if (!parent) return;
      parent.setOptions?.({
        tabBarStyle: keyboardVisible ? { display: 'none', height: 0 } : undefined,
      });
    } catch (e) {
      console.warn('Could not update parent tab bar style', e);
    }
    return () => {
      try {
        const parent = navigation?.getParent?.();
        parent?.setOptions?.({ tabBarStyle: undefined });
      } catch (e) {}
    };
  }, [keyboardVisible, navigation]);

  // ------------ helper functions --------------
  const fetchUserContext = async () => {
    if (!auth.currentUser) return '';
    try {
      const userId = auth.currentUser.uid;
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      const userProfile = userDocSnap.exists() ? userDocSnap.data() : {};

      const medQuery = query(collection(db, 'medicines'), where('userId', '==', userId));
      const medSnap = await getDocs(medQuery);
      const medicines = medSnap.empty ? null : medSnap.docs.map(d => d.data().name).join(', ');

      let context = '--- User Health Context ---\n';
      if (userProfile.name) context += `Name: ${userProfile.name}\n`;
      if (userProfile.age) context += `Age: ${userProfile.age}\n`;
      if (userProfile.weight) context += `Weight: ${userProfile.weight} kg\n`;
      if (userProfile.height) context += `Height: ${userProfile.height} cm\n`;
      if (userProfile.conditions) context += `Conditions: ${userProfile.conditions}\n`;
      if (medicines) context += `Current Medicines: ${medicines}\n`;
      context += '--- End of Context ---\n\n';
      return context;
    } catch (err) {
      console.warn('Failed to fetch user context', err);
      return '';
    }
  };

  const handleNewChat = async () => {
    setMessages([INITIAL_MESSAGE]);
  };

  const handleSend = useCallback(async () => {
    if (input.trim().length === 0) return;
    if (isLoading) return;

    const userMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const userContext = await fetchUserContext();
      const prompt = `${userContext}User Question: ${input}`;
      const systemInstruction = 'You are Asizto, a helpful AI health assistant. Use the provided user context to give personalized and safe information. Always remind users to consult healthcare professionals for medical advice. Be concise and friendly.';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'API returned an error');

      const botMessageContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that. Please try rephrasing your question.";
      const botMessage = { role: 'model', content: botMessageContent, timestamp: Date.now() };
      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('API error:', error);
      let errorMessage = "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
      if (error.message?.includes && error.message.includes('API request failed: 429')) errorMessage = "I'm receiving too many requests. Please wait a moment before trying again.";
      else if (error.message?.includes && error.message.includes('API request failed: 403')) errorMessage = "I'm not authorized to process this request. Please check your settings.";
      else if (error.message?.includes && error.message.includes('network')) errorMessage = "Network connection issue. Please check your internet connection.";
      const errorMsg = { role: 'model', content: errorMessage, timestamp: Date.now() };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      Animated.sequence([
        Animated.timing(sendScale, { toValue: 1.15, duration: 80, useNativeDriver: true }),
        Animated.timing(sendScale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [input, isLoading]);

  const handleCopyMessage = async (content) => {
    try {
      if (Clipboard && Clipboard.setStringAsync) {
        await Clipboard.setStringAsync(content || '');
      } else if (Clipboard && Clipboard.setString) {
        Clipboard.setString(content || '');
      } else {
        Alert.alert('Copy not available', 'Clipboard support is not installed.');
        return;
      }
      Toast.show({ type: 'success', text1: 'Copied', text2: 'Message copied to clipboard' });
    } catch (e) { Toast.show({ type: 'error', text1: 'Copy failed' }); }
  };

  const suggestedQuestions = useMemo(() => [
    'What should I do for a headache?',
    'Are these medicines safe together?',
    'How often should I take my medication?',
    'What does my symptom mean?'
  ], []);

  const exportChat = async () => {
    try {
      if (!messages || messages.length === 0) {
        Alert.alert('Nothing to export', 'There are no messages to export.');
        return;
      }
      const exportText = messages.map(m => {
        const who = m.role === 'user' ? 'You' : 'Asizto';
        const time = m.timestamp ? ` [${new Date(m.timestamp).toLocaleString()}]` : '';
        return `${who}${time}: ${m.content}`;
      }).join('\n\n');

      await Share.share({ message: exportText, title: 'Asizto Chat Export' });
    } catch (err) {
      try {
        const exportText = messages.map(m => {
          const who = m.role === 'user' ? 'You' : 'Asizto';
          const time = m.timestamp ? ` [${new Date(m.timestamp).toLocaleString()}]` : '';
          return `${who}${time}: ${m.content}`;
        }).join('\n\n');

        if (Clipboard && Clipboard.setStringAsync) {
          await Clipboard.setStringAsync(exportText || '');
          Toast.show({ type: 'success', text1: 'Export copied', text2: 'Chat copied to clipboard' });
        } else if (Clipboard && Clipboard.setString) {
          Clipboard.setString(exportText || '');
          Toast.show({ type: 'success', text1: 'Export copied', text2: 'Chat copied to clipboard' });
        } else {
          Alert.alert('Export failed', 'Unable to export or copy chat.');
        }
      } catch (e) {
        Alert.alert('Export failed', 'Unable to export or copy chat.');
      }
    }
  };

  // ------------ layout constants using insets --------------
  const INPUT_BASE_HEIGHT = 48; // minimal comfortable height
  const inputReservedSpace = INPUT_BASE_HEIGHT + insets.bottom + 8; // used to pad list

  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center' },
    logoCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: colors.primary },
    headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
    divider: { height: 1, backgroundColor: colors.border },
    messageList: { padding: 10, flexGrow: 1 },
    messageRow: { marginBottom: 8, flexDirection: 'row', alignItems: 'flex-end' },
    messageBubble: { padding: 12, borderRadius: 16, maxWidth: '78%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
    userBubble: { backgroundColor: colors.primary, alignSelf: 'flex-end', borderTopRightRadius: 4 },
    botBubble: { backgroundColor: colors.card, alignSelf: 'flex-start', borderTopLeftRadius: 4 },
    userText: { color: '#fff', lineHeight: 20 },
    botText: { color: colors.text, lineHeight: 20 },
    inputOuter: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderTopWidth: 2,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
      paddingBottom: insets.bottom,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      width: '100%',
    },
    inputContainer: {
      flex: 1,
      minHeight: 36,
      maxHeight: 140,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
    },
    input: { color: colors.text, fontSize: 15, lineHeight: 20, padding: 0, margin: 0, textAlignVertical: 'top' },
    sendButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 8, backgroundColor: colors.primary, elevation: 2 },
    sendButtonDisabled: { opacity: 0.5 },
    timestampText: { marginTop: 6, marginRight: 4, fontSize: 11, color: colors.subtext || '#888', alignSelf: 'center' },
    avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    avatarText: { color: '#fff', fontWeight: '700' },
    daySeparatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
    daySeparatorText: { marginHorizontal: 8, fontSize: 12 },
    daySeparatorLine: { flex: 1, height: 1 },
    suggestionChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, marginRight: 8, backgroundColor: colors.card },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 8 },
  });

  // focus animation handlers
  const onFocusInput = () => {
    Animated.timing(focusAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    Animated.timing(sendScale, { toValue: 1.08, duration: 160, useNativeDriver: true }).start();
  };
  const onBlurInput = () => {
    Animated.timing(focusAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
    Animated.timing(sendScale, { toValue: 1, duration: 160, useNativeDriver: true }).start();
  };

  const inputAnimatedStyle = {
    backgroundColor: colors.card,
    borderColor: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] }),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }) },
    shadowOpacity: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] }),
    shadowRadius: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
    elevation: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 6] }),
  };

  const renderDaySeparator = (ts) => (
    <View style={styles.daySeparatorContainer}>
      <View style={[styles.daySeparatorLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.daySeparatorText, { color: colors.subtext }]}>{dayString(ts)}</Text>
      <View style={[styles.daySeparatorLine, { backgroundColor: colors.border }]} />
    </View>
  );

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    const prev = messages[index - 1];
    const showDay = !prev || dayString(prev.timestamp) !== dayString(item.timestamp);

    return (
      <View>
        {showDay && renderDaySeparator(item.timestamp)}
        <TouchableOpacity
          activeOpacity={0.95}
          onLongPress={() => handleCopyMessage(item.content)}
          style={[styles.messageRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}
        >
          {!isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.card }]}>
              <Ionicons name="medkit-outline" size={18} color={colors.primary} />
            </View>
          )}

          <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
            {item.role === 'model' && index === messages.length - 1 && !animatedMsgIdsRef.current.has(item.timestamp) ? (
              <AnimatedChatMessage content={item.content} msgId={item.timestamp} onComplete={() => { try { animatedMsgIdsRef.current.add(item.timestamp); } catch(e){} }} colors={colors} />
            ) : (
              <View>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={{ width: 180, height: 120, borderRadius: 8, marginBottom: 8 }} />
                ) : null}
                <Text style={isUser ? styles.userText : styles.botText}>{item.content}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: isUser ? 'flex-end' : 'flex-start', marginTop: 8 }}>
              <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
              {!isUser && (
                <TouchableOpacity onPress={() => handleCopyMessage(item.content)} style={{ marginLeft: 8 }}>
                  <Ionicons name="copy" size={16} color={colors.subtext || '#888'} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isUser && (
            <View style={[styles.avatar, { backgroundColor: colors.primary, marginLeft: 8 }]}>
              <Text style={styles.avatarText}>Y</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderFooterSuggestions = () => (
    <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {suggestedQuestions.map((q, i) => (
          <TouchableOpacity key={i} style={styles.suggestionChip} onPress={() => { setInput(q); }}>
            <Text style={{ color: colors.text }}>{q}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const isEmpty = messages.length === 0 || (messages.length === 1 && messages[0].content === INITIAL_MESSAGE.content);

  // KeyboardAvoidingView behavior: enable only on iOS
  const kbBehavior = Platform.OS === 'ios' ? 'padding' : undefined;
  const HEADER_HEIGHT = 56;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={kbBehavior} keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + HEADER_HEIGHT : 0}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Ionicons name="medkit" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Asizto AI</Text>
              <Text style={{ color: colors.subtext, fontSize: 12 }}>Health assistant • Personalized</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={exportChat} style={{ marginRight: 12 }}>
              <Ionicons name="download-outline" size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNewChat}>
              <Ionicons name="add" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Messages */}
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={48} color={colors.primary} />
            <Text style={styles.emptyTitle}>Ask a health question to get started</Text>
            <Text style={{ color: colors.subtext, marginTop: 8, textAlign: 'center' }}>Try: "What should I take for a sore throat?"</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => (item.timestamp ? String(item.timestamp) : index.toString())}
            renderItem={renderMessage}
            style={{ flex: 1 }}
            // paddingBottom ensures messages don't get hidden — uses numeric effectiveShift
            contentContainerStyle={[styles.messageList, { paddingBottom: inputReservedSpace + effectiveShift }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListFooterComponent={() => isLoading ? (<View style={{ padding: 10 }}><TypingDots colors={colors} /></View>) : null}
          />
        )}

        {renderFooterSuggestions()}

        {/* Bottom input area: animated marginBottom driven by shiftAnim (animated) */}
        <Animated.View style={[styles.inputOuter, { marginBottom: shiftAnim }]}>
          <View style={styles.inputWrapper}>
            <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
              <TextInput
                style={[styles.input, { height: Math.max(36, inputHeight) }]}
                value={input}
                onChangeText={setInput}
                placeholder="Ask a health question."
                placeholderTextColor={colors.subtext || '#9AA0A6'}
                multiline
                onFocus={onFocusInput}
                onBlur={onBlurInput}
                onContentSizeChange={(e) => setInputHeight(Math.min(140, e.nativeEvent.contentSize.height))}
                accessibilityLabel="Chat input"
                returnKeyType="send"
                onSubmitEditing={() => { if (!isLoading && input.trim()) handleSend(); }}
                showSoftInputOnFocus={true}
              />
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: sendScale }], opacity: input.trim().length > 0 ? 1 : 0.7 }}>
              <TouchableOpacity
                style={[styles.sendButton, (isLoading || input.trim().length === 0) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={isLoading || input.trim().length === 0}
                accessibilityLabel="Send message"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="send" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
