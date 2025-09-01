import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Linking,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { useIsFocused } from '@react-navigation/native';

// Keep only Ambulance & Women Helpline
const emergencyServices = [
  { name: 'Ambulance', number: '108', icon: 'medical-outline' },
  { name: 'Women Helpline', number: '1091', icon: 'woman-outline' },
];

export default function EmergencyScreen({ navigation }) {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  // In-screen banner state (replaces popups)
  const [banner, setBanner] = useState({ visible: false, text: '', type: 'info', action: null });
  const bannerTimeout = useRef(null);
  // Two-tap delete confirmation id
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Anim values for ripples + press scale
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;
    const q = query(
      collection(db, 'emergencyContacts'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContacts(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const isFocused = useIsFocused();

  useEffect(() => {
    // Run ripple animations only while the screen is focused to save battery.
    if (!isFocused) {
      // ensure values reset when screen not focused
      ripple1.setValue(0);
      ripple2.setValue(0);
      return;
    }

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple1, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ripple1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(ripple2, {
          toValue: 1,
          duration: 2200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ripple2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    loop1.start();
    loop2.start();

    return () => {
      loop1.stop();
      loop2.stop();
      ripple1.setValue(0);
      ripple2.setValue(0);
    };
  }, [isFocused, ripple1, ripple2]);

  const handleDeletePersonalContact = (contactId) => {
    // Two-tap confirmation using in-screen banner: first tap asks to tap again to confirm
    if (deleteConfirmId !== contactId) {
      setDeleteConfirmId(contactId);
      showBanner('Tap delete again to confirm', 'info');
      // reset confirmation after 4s
      setTimeout(() => setDeleteConfirmId((id) => (id === contactId ? null : id)), 4000);
      return;
    }

    // confirmed: delete
    deleteDoc(doc(db, 'emergencyContacts', contactId))
      .then(() => showBanner('Contact deleted', 'success'))
      .catch((e) => {
        console.error('Delete error', e);
        showBanner('Could not delete contact', 'error');
      });
  };

  const handleQuickDial = (number) => {
    Linking.openURL(`tel:${number}`).catch(() =>
  showBanner('Could not open the dialer.', 'error')
    );
  };

  const handleLongPressSOS = async () => {
    try {
      const smsAvailable = await SMS.isAvailableAsync();
      if (!smsAvailable) {
  showBanner('SMS is not available on this device.', 'error');
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
  showBanner('Location permission denied. Cannot send SOS.', 'error');
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const battery = await Battery.getBatteryLevelAsync();
      const userId = auth.currentUser?.uid;
      const userSnap = userId ? await getDoc(doc(db, 'users', userId)) : null;
      const user = userSnap?.exists() ? userSnap.data() : {};
      const name =
        user.firstName ||
        user.name ||
        (auth.currentUser?.email
          ? auth.currentUser.email.split('@')[0]
          : 'User');

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      // working Google Maps link
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

      const msgLines = [
        `🚨 EMERGENCY SOS from ${name}`,
        `📍 Location: ${mapsUrl}`,
        user.conditions ? `⚠️ Conditions: ${user.conditions}` : null,
        `🔋 Battery: ${Math.round(battery * 100)}%`,
      ].filter(Boolean);

      const message = msgLines.join('\n');

      // Normalize phone numbers: trim and remove internal spaces
      const recipients = contacts
        .map((c) => {
          if (!c.phone) return null;
          const p = String(c.phone).trim().replace(/\s+/g, '');
          return p.length ? p : null;
        })
        .filter(Boolean);

      if (recipients.length === 0) {
        showBanner('Please add at least one emergency contact before using SOS.', 'info', {
          label: 'Add Contact',
          onPress: () => navigation.navigate('EmergencyContact'),
        });
        return;
      }

      // Note: Expo SMS opens Messages app with recipients+text.
      await SMS.sendSMSAsync(recipients, message);

      showBanner('Message prepared in Messages app.', 'success');
    } catch (e) {
      console.error('SOS Error:', e);
      showBanner('Could not send the SOS message.', 'error');
    }
  };

  // Banner helper: type = 'info' | 'success' | 'error', optional action {label,onPress}
  const showBanner = (text, type = 'info', action = null, duration = 4000) => {
    // clear existing
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    setBanner({ visible: true, text, type, action });
    bannerTimeout.current = setTimeout(() => setBanner((b) => ({ ...b, visible: false })), duration);
  };

  useEffect(() => {
    return () => {
      if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    };
  }, []);

  const onPressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Ripple shared shape
  const rippleCommon = {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
  };
  const ripple1Style = {
    ...rippleCommon,
    opacity: ripple1.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0] }),
    transform: [{ scale: ripple1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] }) }],
  };
  const ripple2Style = {
    ...rippleCommon,
    opacity: ripple2.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0] }),
    transform: [{ scale: ripple2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.3] }) }],
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* removed extra top spacing: content begins immediately under SafeArea */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 220 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Dial (only Ambulance & Women Helpline) */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Dial Services</Text>

        <View style={styles.quickRow}>
          {emergencyServices.map((s) => (
            <TouchableOpacity
              key={s.name}
              style={[styles.quickCard, { backgroundColor: colors.card }]}
              onPress={() => handleQuickDial(s.number)}
              activeOpacity={0.85}
            >
              <Ionicons name={s.icon} size={30} color={colors.primary} />
              <Text style={[styles.quickName, { color: colors.text }]}>{s.name}</Text>
              <Text style={[styles.quickNumber, { color: colors.subtext }]}>{s.number}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Contacts Card */}
        <View style={[styles.contactsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.contactsHeader}>
            <Text style={[styles.contactsTitle, { color: colors.text }]}>Your Contacts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmergencyContact')}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {contacts.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtext }]}>No personal contacts added yet.</Text>
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.border }]} />}
              renderItem={({ item }) => (
                <View style={styles.contactRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.contactPhone, { color: colors.subtext }]}>{item.phone}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeletePersonalContact(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#E57373" />
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>

      {/* SOS Button — lowered for easy thumb access and Apple-like soft shadow */}
      <View style={styles.sosAbsoluteWrap}>
        <Animated.View pointerEvents="none" style={ripple1Style} />
        <Animated.View pointerEvents="none" style={ripple2Style} />

        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          // Directly trigger SOS on long press (no confirmation popup)
          onLongPress={handleLongPressSOS}
          delayLongPress={1500}
          disabled={contacts.length === 0}
        >
          <Animated.View
            style={[
              styles.sosButton,
              {
                backgroundColor: colors.primary,
                shadowColor: '#000',
                transform: [{ scale: pressScale }],
                opacity: contacts.length === 0 ? 0.55 : 1,
              },
            ]}
          >
            <Ionicons name="warning" size={46} color="#fff" />
            <Text style={styles.sosText}>HOLD FOR SOS</Text>
          </Animated.View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 0 },

  sectionTitle: {
  fontSize: 20,
  fontWeight: "600",
  marginTop: 20,   // 👈 gives breathing room from above
  marginBottom: 10, // 👈 space below the heading
  paddingHorizontal: 12, // 👈 aligns text nicely with cards
},



  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  quickCard: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    elevation: 2,
  },
  quickName: { marginTop: 8, fontSize: 15, fontWeight: '600' },
  quickNumber: { marginTop: 4, fontSize: 13 },

  contactsCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 1,
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contactsTitle: { fontSize: 16, fontWeight: '700' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  contactName: { fontSize: 15, fontWeight: '600' },
  contactPhone: { marginTop: 4, fontSize: 13 },

  sep: { height: StyleSheet.hairlineWidth, width: '100%' },

  emptyText: { textAlign: 'center', paddingVertical: 16 },

  // SOS absolute wrapper — lowered for easy reach
  sosAbsoluteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28, // lowered for thumb reach; tweak this number if you want it lower/higher
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },

  sosButton: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  sosText: { color: '#fff', marginTop: 8, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
});
