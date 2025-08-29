import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function ChatHistoryScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'chats'), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chatsData = [];
      querySnapshot.forEach((doc) => {
        chatsData.push({ ...doc.data(), id: doc.id });
      });
      setChats(chatsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadChat = (chat) => {
    // This complex navigation command tells the app to go to the 'Home' screen in the drawer,
    // then find the 'MainTabs' stack, then go to the 'Chatbot' screen inside that,
    // and pass the 'messages' as a parameter.
    navigation.navigate('Home', { 
      screen: 'MainTabs', 
      params: { 
        screen: 'Chatbot', 
        params: { messages: chat.messages } 
      } 
    });
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.chatItem}
            onPress={() => loadChat(item)}
          >
            <Text style={styles.chatTitle}>{item.title}</Text>
            <Text style={styles.chatDate}>
              {item.createdAt.toDate().toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No saved chats yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatItem: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  chatDate: {
    fontSize: 12,
    color: 'gray',
    marginTop: 5,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: 'gray',
  },
});