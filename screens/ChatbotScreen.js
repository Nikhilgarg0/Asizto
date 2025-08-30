import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

const INITIAL_MESSAGE = { 
  role: 'model', 
  content: 'Hello! I am Asizto. Ask me a health question and I will use your profile context to give a personalized response.\n\nDisclaimer: I am not a medical professional. Always consult a doctor for medical advice.\n' 
};

// Enhanced typing animation component with performance optimization
const AnimatedChatMessage = ({ content, onComplete }) => {
  const { colors } = useTheme();
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!content || content.length === 0) return;
    
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(prev => prev + content.charAt(i));
      i++;
      if (i >= content.length) {
        clearInterval(interval);
        setIsTyping(false);
        onComplete?.();
      }
    }, 20); // Slightly slower for better readability
    
    return () => clearInterval(interval);
  }, [content, onComplete]);

  // Skip animation for very long messages (>200 chars)
  if (content.length > 200) {
    return (
      <Text style={{ color: colors.text }}>
        {content}
      </Text>
    );
  }

  return (
    <Text style={{ color: colors.text }}>
      {displayedText}
      {isTyping && (
        <Text style={{ color: colors.primary }}>|</Text>
      )}
    </Text>
  );
};

export default function ChatbotScreen({ route }) {
  const { colors } = useTheme();

  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (route?.params?.messages) {
      setMessages(route.params.messages);
    }
  }, [route?.params?.messages]);

  const handleNewChat = async () => {
    if (!auth.currentUser) return;
    if (messages.length > 1) {
      try {
        await addDoc(collection(db, "chats"), {
          userId: auth.currentUser.uid,
          createdAt: Timestamp.now(),
          title: messages[1]?.content.substring(0, 30) || "Chat History",
          messages: messages,
        });
      } catch (error) {
        console.error("Error saving chat:", error);
      }
    }
    setMessages([INITIAL_MESSAGE]);
  };

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const fetchUserContext = async () => {
    if (!auth.currentUser) return "";
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, "users", userId);
    const userDocSnap = await getDoc(userDocRef);
    const userProfile = userDocSnap.exists() ? userDocSnap.data() : {};

    const medQuery = query(collection(db, 'medicines'), where('userId', '==', userId));
    const medSnap = await getDocs(medQuery);
    const medicines = medSnap.empty ? null : medSnap.docs.map(d => d.data().name).join(', ');

    let context = "--- User Health Context ---\n";
    if (userProfile.name) context += `Name: ${userProfile.name}\n`;
    if (userProfile.age) context += `Age: ${userProfile.age}\n`;
    if (userProfile.weight) context += `Weight: ${userProfile.weight} kg\n`;
    if (userProfile.height) context += `Height: ${userProfile.height} cm\n`;
    if (userProfile.conditions) context += `Conditions: ${userProfile.conditions}\n`;
    if (medicines) context += `Current Medicines: ${medicines}\n`;
    context += "--- End of Context ---\n\n";
    return context;
  };

  const handleSend = useCallback(async () => {
    if (input.trim().length === 0) return;
    
    // Rate limiting - prevent multiple rapid requests
    if (isLoading) return;
    
    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const userContext = await fetchUserContext();
      const prompt = `${userContext}User Question: ${input}`;
      const systemInstruction = "You are Asizto, a helpful AI health assistant. Use the provided user context to give personalized and safe information. Always remind users to consult healthcare professionals for medical advice.";
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, 
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: [
              { role: "user", parts: [{ text: prompt }] }
            ]
          })
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message || 'API returned an error');
      }
      
      const botMessageContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that. Please try rephrasing your question.";
      const botMessage = { role: 'model', content: botMessageContent };
      setMessages(prev => [...prev, botMessage]);
      
      // Log successful interaction
      console.log('Chat interaction completed successfully');
      
    } catch (error) {
      console.error("Gemini API error:", error);
      
      let errorMessage = "Sorry, I'm having trouble connecting right now. Please try again in a moment.";
      
      if (error.message.includes('API request failed: 429')) {
        errorMessage = "I'm receiving too many requests. Please wait a moment before trying again.";
      } else if (error.message.includes('API request failed: 403')) {
        errorMessage = "I'm not authorized to process this request. Please check your settings.";
      } else if (error.message.includes('network')) {
        errorMessage = "Network connection issue. Please check your internet connection.";
      }
      
      const errorMsg = { role: 'model', content: errorMessage };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading]);

  // Theme-aware styles
  const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    messageList: { padding: 10, paddingBottom: 70 },
    messageBubble: { padding: 15, borderRadius: 20, marginBottom: 10, maxWidth: '80%' },
    userBubble: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
    botBubble: { backgroundColor: colors.card, alignSelf: 'flex-start', elevation: 1 },
    userText: { color: '#fff' },
    botText: { color: colors.text },
    inputContainer: { 
      flexDirection: 'row', 
      padding: 10, 
      borderTopWidth: 1, 
      borderColor: colors.border, 
      backgroundColor: colors.card 
    },
    input: { 
      flex: 1, 
      height: 40, 
      borderColor: colors.border, 
      borderWidth: 1, 
      borderRadius: 20, 
      paddingHorizontal: 15, 
      color: colors.text, 
      backgroundColor: colors.background 
    },
    sendButton: { 
      backgroundColor: colors.primary, 
      width: 40, 
      height: 40, 
      borderRadius: 20, 
      justifyContent: 'center', 
      alignItems: 'center', 
      marginLeft: 10 
    },
  });

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Asizto AI</Text>
          <TouchableOpacity onPress={handleNewChat}>
            <Ionicons name="add" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.divider} />

        {/* Chat List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => {
            const isLastMessage = index === messages.length - 1;
            return (
              <View style={[
                styles.messageBubble, 
                item.role === 'user' ? styles.userBubble : styles.botBubble
              ]}>
                {item.role === 'model' && isLastMessage ? (
                  <AnimatedChatMessage content={item.content} />
                ) : (
                  <Text style={item.role === 'user' ? styles.userText : styles.botText}>
                    {item.content}
                  </Text>
                )}
              </View>
            );
          }}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
        />

        {isLoading && <ActivityIndicator style={{ marginVertical: 10 }} color={colors.primary} />}

        {/* Input field pinned at bottom */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask a health question..."
            placeholderTextColor={colors.subtext || '#999'}
          />
          <TouchableOpacity 
            style={styles.sendButton} 
            onPress={handleSend} 
            disabled={isLoading}
          >
            <Ionicons name="send" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
