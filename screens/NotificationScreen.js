import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationScreen() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setNotifications(notifsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    itemContainer: { backgroundColor: colors.card, padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', alignItems: 'center' },
    iconContainer: { marginRight: 15 },
    textContainer: { flex: 1 },
    title: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    body: { fontSize: 14, color: colors.subtext, marginTop: 4 },
    emptyText: { textAlign: 'center', marginTop: 50, color: colors.subtext, fontSize: 16 },
  });

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary} />;
  }

  return (
    <FlatList
      style={styles.container}
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.itemContainer}>
          <View style={styles.iconContainer}>
             <Ionicons name="notifications" size={24} color={colors.primary} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
    />
  );
}