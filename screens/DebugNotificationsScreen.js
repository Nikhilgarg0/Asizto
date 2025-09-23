import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';

export default function DebugNotificationsScreen() {
  const { colors } = useTheme();
  const [scheduled, setScheduled] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const all = await Notifications.getAllScheduledNotificationsAsync();
        if (!mounted) return;
        setScheduled(all);
      } catch (e) {
        console.warn('Failed to get scheduled notifications', e);
        setScheduled([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const styles = createStyles(colors);

  if (loading) return <ActivityIndicator size="large" style={{ flex: 1, backgroundColor: colors.background }} color={colors.primary} />;

  if (!scheduled || scheduled.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.subtext }}>No scheduled notifications found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { padding: 12 }]}> 
      {scheduled.map((s, idx) => (
        <View key={s.identifier || idx} style={[styles.card, { backgroundColor: colors.card }]}> 
          <Text style={[styles.title, { color: colors.text }]}>{s.content?.title || 'No title'}</Text>
          <Text style={{ color: colors.subtext }}>{s.content?.body}</Text>
          <Text style={{ color: colors.subtext, marginTop: 8, fontStyle: 'italic' }}>id: {s.identifier}</Text>
          <Text style={{ color: colors.subtext, marginTop: 6 }}>data: {JSON.stringify(s.content?.data || {})}</Text>
          <Text style={{ color: colors.subtext, marginTop: 6 }}>trigger: {JSON.stringify(s.trigger || {})}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  card: { padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  title: { fontSize: 16, fontWeight: '700' },
});
