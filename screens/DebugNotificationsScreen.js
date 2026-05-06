import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';

export default function DebugNotificationsScreen() {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadScheduledNotifications();
  }, []);

  async function loadScheduledNotifications() {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    setNotifications(scheduled);
  }

  async function cancelAll() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setNotifications([]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={cancelAll}>
        <Text style={styles.buttonText}>Cancel All Notifications</Text>
      </TouchableOpacity>
      {notifications.length === 0 ? (
        <Text style={[styles.empty, { color: colors.subtext }]}>No scheduled notifications</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.identifier}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>{item.content.title}</Text>
              <Text style={[styles.body, { color: colors.subtext }]}>{item.content.body}</Text>
              <Text style={[styles.id, { color: colors.subtext }]}>ID: {item.identifier}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  button: { padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  empty: { textAlign: 'center', marginTop: 40, fontSize: 16 },
  card: { padding: 12, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  title: { fontWeight: 'bold', fontSize: 15 },
  body: { fontSize: 13, marginTop: 4 },
  id: { fontSize: 11, marginTop: 6 },
});r