import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function NotificationScreen() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc') // Show most recent notifications first
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setNotifications(notifsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const styles = createStyles(colors);

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} color={colors.primary} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={{ padding: 12, alignSelf: 'flex-end', marginRight: 12 }}
        onPress={() => navigation.navigate('DebugNotifications')}
      >
        <Ionicons name="bug" size={22} color={colors.primary} />
      </TouchableOpacity>
      <FlatList
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
              <Text style={styles.date}>{item.timestamp.toDate().toLocaleString()}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no notifications yet.</Text>}
      />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.background 
    },
    itemContainer: { 
        backgroundColor: colors.card, 
        padding: 20, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border, 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    iconContainer: { 
        marginRight: 15 
    },
    textContainer: { 
        flex: 1 
    },
    title: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: colors.text 
    },
    body: { 
        fontSize: 14, 
        color: colors.subtext, 
        marginTop: 4 
    },
    date: {
        fontSize: 12,
        color: colors.subtext,
        marginTop: 8,
        fontStyle: 'italic'
    },
    emptyText: { 
        textAlign: 'center', 
        marginTop: 50, 
        color: colors.subtext, 
        fontSize: 16 
    },
});