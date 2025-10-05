// ChatbotScreen.js – Enhanced UI with click-to-show actions and animations
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
  Modal,
} from 'react-native';

let Clipboard = null;
try { Clipboard = require('expo-clipboard'); } catch (e) { Clipboard = null; }

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
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

// Enhanced message component with animations
const AnimatedMessage = ({ children, delay = 0 }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scaleAnim }
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

const AnimatedChatMessage = ({ content, onComplete, msgId, colors }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!content) {
      onComplete?.(msgId);
      return;
    }

    let index = 0;
    const text = content;
    const speed = 15; // milliseconds per character

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        onComplete?.(msgId);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, msgId, onComplete]);

  return (
    <Text style={{ color: colors.text }}>
      {displayedText}
      {isAnimating && <Text style={{ opacity: 0.5 }}>|</Text>}
    </Text>
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

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(32);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeightRaw, setKeyboardHeightRaw] = useState(0);
  const [effectiveShift, setEffectiveShift] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  
  const flatListRef = useRef(null);
  const shiftAnim = useRef(new Animated.Value(0)).current;
  const scrollToEnd = useCallback(() => {
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 50);
    }
  }, []);

  const animatedMsgIdsRef = useRef(new Set());
  const focusAnim = useRef(new Animated.Value(0)).current;
  const sendScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { 
    if (route?.params?.messages) setMessages(route.params.messages); 
  }, [route?.params?.messages]);
  
  useEffect(() => { 
    scrollToEnd(); 
  }, [messages, scrollToEnd]);

  // Keyboard listeners
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    // Increased adjustment to prevent keyboard overlap
    const ADJUSTMENT = Platform.OS === 'android' ? 0 : 0; // Removed negative adjustment

    const onShow = (e) => {
      const screenY = e?.endCoordinates?.screenY;
      const heightFromCoords = e?.endCoordinates?.height || 0;
      const rawHeight = screenY ? Math.max(0, Math.round(windowHeight - screenY)) : Math.max(0, Math.round(heightFromCoords));
      setKeyboardHeightRaw(rawHeight);

      // Add extra padding to ensure input stays above keyboard
      const extraPadding = 8; // Additional safe space above keyboard
      const shiftNumeric = Math.max(0, rawHeight - insets.bottom + extraPadding);
      setEffectiveShift(shiftNumeric);

      const duration = (e && e.duration) ? e.duration : 200;
      Animated.timing(shiftAnim, {
        toValue: shiftNumeric,
        duration,
        useNativeDriver: false,
      }).start();

      setKeyboardVisible(true);
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

  // Hide parent tab bar while keyboard is visible
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

  // Fetch user context
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
    setMessages([]);
    setSelectedMessageId(null);
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
    } catch (e) { 
      Toast.show({ type: 'error', text1: 'Copy failed' }); 
    }
  };

  const toggleMessageActions = (messageId) => {
    setSelectedMessageId(selectedMessageId === messageId ? null : messageId);
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

  const INPUT_BASE_HEIGHT = 36;
  const inputReservedSpace = INPUT_BASE_HEIGHT + 8;

  const styles = StyleSheet.create({
    safeArea: { 
      flex: 1, 
      backgroundColor: colors.background 
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    headerLeft: { 
      flexDirection: 'row', 
      alignItems: 'center' 
    },
    logoCircle: { 
      width: 36, 
      height: 36, 
      borderRadius: 18, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginRight: 10, 
      backgroundColor: colors.primary 
    },
    headerTitle: { 
      fontSize: 18, 
      fontWeight: '700', 
      color: colors.text 
    },
    divider: { 
      height: 1, 
      backgroundColor: colors.border 
    },
    messageList: { 
      padding: 12, 
      flexGrow: 1 
    },
    messageRow: { 
      marginBottom: 12, 
      flexDirection: 'row', 
      alignItems: 'flex-end' 
    },
    messageBubble: { 
      padding: 14, 
      borderRadius: 18, 
      maxWidth: '82%', 
      shadowColor: '#000', 
      shadowOffset: { width: 0, height: 1 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 4, 
      elevation: 2 
    },
    userBubble: { 
      backgroundColor: colors.primary, 
      alignSelf: 'flex-end', 
      borderBottomRightRadius: 4 
    },
    botBubble: { 
      backgroundColor: colors.card, 
      alignSelf: 'flex-start', 
      borderBottomLeftRadius: 4 
    },
    userText: { 
      color: '#fff', 
      lineHeight: 22,
      fontSize: 15 
    },
    botText: { 
      color: colors.text, 
      lineHeight: 22,
      fontSize: 15 
    },
    inputOuter: {
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      width: '100%',
    },
    inputContainer: {
      flex: 1,
      minHeight: 28,
      maxHeight: 110,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
    },
    input: { 
      color: colors.text, 
      fontSize: 15, 
      lineHeight: 20, 
      padding: 0, 
      margin: 0, 
      textAlignVertical: 'top' 
    },
    sendButton: { 
      width: 36, 
      height: 36, 
      borderRadius: 18, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginLeft: 8, 
      backgroundColor: colors.primary, 
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    sendButtonDisabled: { 
      opacity: 0.5 
    },
    timestampText: { 
      fontSize: 11, 
      color: colors.subtext || '#888',
      marginRight: 8,
    },
    daySeparatorContainer: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginVertical: 12 
    },
    daySeparatorText: { 
      marginHorizontal: 10, 
      fontSize: 12,
      color: colors.subtext,
      fontWeight: '500'
    },
    daySeparatorLine: { 
      flex: 1, 
      height: 1 
    },
    suggestionChip: { 
      paddingVertical: 8, 
      paddingHorizontal: 14, 
      borderRadius: 20, 
      borderWidth: 1, 
      borderColor: colors.border, 
      marginRight: 8, 
      backgroundColor: colors.card 
    },
    emptyState: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 24 
    },
    emptyTitle: { 
      fontSize: 20, 
      fontWeight: '700', 
      color: colors.text, 
      marginTop: 16,
      textAlign: 'center'
    },
    messageActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      justifyContent: 'flex-end',
    },
    copyIconButton: {
      padding: 4,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    disclaimerCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    disclaimerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    disclaimerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    disclaimerContent: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
      marginBottom: 20,
    },
    disclaimerButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    disclaimerButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

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
    shadowOpacity: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }),
    shadowRadius: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
    elevation: focusAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
  };

  const renderDaySeparator = (ts) => (
    <View style={styles.daySeparatorContainer}>
      <View style={[styles.daySeparatorLine, { backgroundColor: colors.border }]} />
      <Text style={styles.daySeparatorText}>{dayString(ts)}</Text>
      <View style={[styles.daySeparatorLine, { backgroundColor: colors.border }]} />
    </View>
  );

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    const prev = messages[index - 1];
    const showDay = !prev || dayString(prev.timestamp) !== dayString(item.timestamp);
    const isSelected = selectedMessageId === item.timestamp;
    const isLastMessage = index === messages.length - 1;
    const shouldAnimate = !animatedMsgIdsRef.current.has(item.timestamp);

    return (
      <View>
        {showDay && renderDaySeparator(item.timestamp)}
        <AnimatedMessage delay={0}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => toggleMessageActions(item.timestamp)}
            style={[styles.messageRow, { justifyContent: isUser ? 'flex-end' : 'flex-start' }]}
          >
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
              {item.role === 'model' && isLastMessage && shouldAnimate ? (
                <AnimatedChatMessage 
                  content={item.content} 
                  msgId={item.timestamp} 
                  onComplete={() => { 
                    try { 
                      animatedMsgIdsRef.current.add(item.timestamp); 
                    } catch(e){} 
                  }} 
                  colors={colors} 
                />
              ) : (
                <View>
                  {item.image ? (
                    <Image 
                      source={{ uri: item.image }} 
                      style={{ width: 180, height: 120, borderRadius: 8, marginBottom: 8 }} 
                    />
                  ) : null}
                  <Text style={isUser ? styles.userText : styles.botText}>{item.content}</Text>
                </View>
              )}

              {isSelected && (
                <View style={styles.messageActionsRow}>
                  <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
                  {!isUser && (
                    <TouchableOpacity 
                      onPress={() => handleCopyMessage(item.content)} 
                      style={styles.copyIconButton}
                    >
                      <Ionicons name="copy-outline" size={16} color={colors.subtext || '#888'} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </AnimatedMessage>
      </View>
    );
  };

  const renderFooterSuggestions = () => (
    <View style={{ paddingHorizontal: 12, paddingBottom: 10 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {suggestedQuestions.map((q, i) => (
          <TouchableOpacity 
            key={i} 
            style={styles.suggestionChip} 
            onPress={() => { setInput(q); }}
          >
            <Text style={{ color: colors.text, fontSize: 14 }}>{q}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const isEmpty = messages.length === 0;

  const kbBehavior = Platform.OS === 'ios' ? 'padding' : undefined;
  const HEADER_HEIGHT = 56;

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" />
      
      {/* Disclaimer Modal */}
      <Modal
        visible={showDisclaimer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDisclaimer(false)}
      >
        <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeader}>
              <Text style={styles.disclaimerTitle}>⚕️ Health Disclaimer</Text>
              <TouchableOpacity onPress={() => setShowDisclaimer(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.disclaimerContent}>
              Hello! I am Asizto, your AI health assistant. I use your profile information to provide personalized responses.{'\n\n'}
              <Text style={{ fontWeight: '600' }}>Important:</Text> I am not a medical professional. Always consult a qualified healthcare provider for medical advice, diagnosis, or treatment.
            </Text>

            <TouchableOpacity 
              style={styles.disclaimerButton}
              onPress={() => setShowDisclaimer(false)}
            >
              <Text style={styles.disclaimerButtonText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Modal>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={kbBehavior} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? HEADER_HEIGHT : 0}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.logoCircle}>
              <Ionicons name="medkit" size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.headerTitle}>Asizto AI</Text>
              <Text style={{ color: colors.subtext, fontSize: 12 }}>
                Health assistant • Personalized
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={exportChat} style={{ marginRight: 16 }}>
              <Ionicons 
                name="share-outline" 
                size={22} 
                color={colors.text} 
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNewChat}>
              <Ionicons name="add-circle-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Messages */}
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={64} color={colors.primary} />
            <Text style={styles.emptyTitle}>Ask me anything about your health</Text>
            <Text style={{ color: colors.subtext, marginTop: 12, textAlign: 'center', fontSize: 14 }}>
              I'll use your profile to give personalized advice
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => (item.timestamp ? String(item.timestamp) : index.toString())}
            renderItem={renderMessage}
            style={{ flex: 1 }}
            contentContainerStyle={[styles.messageList, { paddingBottom: inputReservedSpace + effectiveShift }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            ListFooterComponent={() => isLoading ? (
              <View style={{ padding: 10, alignItems: 'flex-start' }}>
                <TypingDots colors={colors} />
              </View>
            ) : null}
          />
        )}

        {messages.length === 0 && renderFooterSuggestions()}

        {/* Input Area */}
        <Animated.View style={[styles.inputOuter, { marginBottom: shiftAnim }]}>
          <View style={styles.inputWrapper}>
            <Animated.View style={[styles.inputContainer, inputAnimatedStyle]}>
              <TextInput
                style={[styles.input, { height: Math.max(28, inputHeight) }]}
                value={input}
                onChangeText={setInput}
                placeholder="Ask a health question..."
                placeholderTextColor={colors.subtext || '#9AA0A6'}
                multiline
                onFocus={onFocusInput}
                onBlur={onBlurInput}
                onContentSizeChange={(e) => setInputHeight(Math.min(110, e.nativeEvent.contentSize.height))}
                accessibilityLabel="Chat input"
                returnKeyType="send"
                onSubmitEditing={() => { 
                  if (!isLoading && input.trim()) handleSend(); 
                }}
                showSoftInputOnFocus={true}
              />
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: sendScale }], opacity: input.trim().length > 0 ? 1 : 0.6 }}>
              <TouchableOpacity
                style={[styles.sendButton, (isLoading || input.trim().length === 0) && styles.sendButtonDisabled]}
                onPress={handleSend}
                disabled={isLoading || input.trim().length === 0}
                accessibilityLabel="Send message"
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}