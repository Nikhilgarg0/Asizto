// EmergencyScreen.js
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
  Keyboard,
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
// Ambulance icon changed to a plus icon ('add' / '+')
const emergencyServices = [
  { name: 'Ambulance', number: '108', icon: 'add' },          // changed icon to '+'
  { name: 'Women Helpline', number: '1091', icon: 'woman-outline' },
];

export default function EmergencyScreen({ navigation }) {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ visible: false, text: '', type: 'info', action: null });
  const bannerTimeout = useRef(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const sosPulse = useRef(new Animated.Value(0)).current;

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
    if (!isFocused) {
      ripple1.setValue(0);
      ripple2.setValue(0);
      return;
    }

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple1, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ripple1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(700),
        Animated.timing(ripple2, {
          toValue: 1,
          duration: 1600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ripple2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sosPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );

    loop1.start();
    loop2.start();
    pulseLoop.start();

    return () => {
      loop1.stop();
      loop2.stop();
      pulseLoop.stop();
      ripple1.setValue(0);
      ripple2.setValue(0);
    };
  }, [isFocused, ripple1, ripple2, sosPulse]);

  const handleDeletePersonalContact = (contactId) => {
    if (deleteConfirmId !== contactId) {
      setDeleteConfirmId(contactId);
      showBanner('Tap delete again to confirm', 'info');
      setTimeout(() => setDeleteConfirmId((id) => (id === contactId ? null : id)), 4000);
      return;
    }

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

  // helper to extract DOB (supports Firestore Timestamp or Date/string)
  const computeAgeFromDOB = (dob) => {
    if (!dob) return null;
    let d = dob;
    if (dob.toDate && typeof dob.toDate === 'function') {
      d = dob.toDate();
    } else if (typeof dob === 'string' || typeof dob === 'number') {
      d = new Date(dob);
    }
    if (!(d instanceof Date) || isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
      age -= 1;
    }
    return age;
  };

  /**
   * handleLongPressSOS
   * - Ensures we request/check location permissions safely (so we don't crash with "Not authorized" errors).
   * - Attempts last known position first (wrapped in try/catch), falls back to current position with a short timeout.
   * - If no location is available or permission denied, proceeds without location.
   * - Builds a richer SOS message using profile fields (blood group, meds, allergies, age, phone, emergency contacts).
   */
  const handleLongPressSOS = async () => {
    try {
      showBanner('Sending SOS...', 'info', null, 1200);

      const smsAvailable = await SMS.isAvailableAsync();
      if (!smsAvailable) {
        showBanner('SMS is not available on this device.', 'error');
        return;
      }

      // Safe location flow:
      let position = null;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          try {
            position = await Location.getLastKnownPositionAsync();
          } catch (lkErr) {
            console.warn('getLastKnownPositionAsync failed:', lkErr);
            position = null;
          }
          const now = Date.now();
          const freshEnough = position && position.timestamp && (now - position.timestamp) < 120000; // 2 minutes
          if (!freshEnough) {
            try {
              position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 5000,
              });
            } catch (currErr) {
              console.warn('getCurrentPositionAsync quick lookup failed:', currErr);
            }
          }
        } else {
          showBanner('Location permission denied. Proceeding without location.', 'info');
          position = null;
        }
      } catch (permErr) {
        console.warn('Location permission/request error:', permErr);
        showBanner('Could not access location services. Proceeding without location.', 'info');
        position = null;
      }

      // Battery & user lookup
      const battery = await Battery.getBatteryLevelAsync().catch((e) => {
        console.warn('Battery read failed', e);
        return null;
      });

      const userId = auth.currentUser?.uid;
      const userSnap = userId ? await getDoc(doc(db, 'users', userId)) : null;
      const user = userSnap?.exists() ? userSnap.data() : {};
      const name =
        user.firstName ||
        user.name ||
        (auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'User');

      // Build location link only if we have valid coords
      const lat = position?.coords?.latitude;
      const lon = position?.coords?.longitude;
      const mapsUrl = (typeof lat === 'number' && typeof lon === 'number')
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        : null;

      // Collect emergency contacts summary (names + phones) for inclusion in message
      const emergencyContactList = contacts
        .map((c) => {
          if (!c.phone) return null;
          const p = String(c.phone).trim().replace(/\s+/g, '');
          const nm = c.name ? c.name : p;
          return `${nm}: ${p}`;
        })
        .filter(Boolean)
        .slice(0, 5) // limit to first 5 to avoid massive messages
        .join('; ');

      const age = computeAgeFromDOB(user?.dob);

      // Build message lines with extra patient info (only include if available)
      const msgLines = [
        `🚨 EMERGENCY SOS from ${name}${age ? ` (${age} yrs)` : ''}`,
        mapsUrl ? `📍 Location: ${mapsUrl}` : null,
        user?.bloodGroup ? `🩸 Blood: ${user.bloodGroup}` : null,
        user?.conditions ? `⚠️ Conditions: ${user.conditions}` : null,
        user?.medications ? `💊 Meds: ${user.medications}` : null,
        user?.allergies ? `🤧 Allergies: ${user.allergies}` : null,
        user?.phone ? `📞 Phone: ${user.phone}` : null,
        emergencyContactList ? `👥 Emergency contacts: ${emergencyContactList}` : null,
        battery != null ? `🔋 Battery: ${Math.round(battery * 100)}%` : null,
        `🕘 Time: ${new Date().toLocaleString()}`,
      ].filter(Boolean);

      const message = msgLines.join('\n');

      const recipients = contacts
        .map((c) => {
          if (!c.phone) return null;
          const p = String(c.phone).trim().replace(/\s+/g, '');
          return p.length ? p : null;
        })
        .filter(Boolean);

      if (recipients.length === 0) {
        // No personal contacts — fallback to dialing 112 instantly
        try {
          Linking.openURL('tel:112');
          return;
        } catch (e) {
          showBanner('Please add at least one emergency contact before using SOS.', 'info', {
            label: 'Add Contact',
            onPress: () => navigation.navigate('EmergencyContact'),
          });
          return;
        }
      }

      // Send SMS via the device Messages app (opens composer)
      await SMS.sendSMSAsync(recipients, message);

      showBanner('Message prepared in Messages app.', 'success');
      Keyboard.dismiss();
    } catch (e) {
      console.error('SOS Error:', e);
      showBanner('Could not send the SOS message.', 'error');
    }
  };

  const showBanner = (text, type = 'info', action = null, duration = 4000) => {
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
    opacity: ripple2.interpolate({ inputRange: [0, 1], outputRange: [0.22, 0] }),
    transform: [{ scale: ripple2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.4] }) }],
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
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 220 }]}
        showsVerticalScrollIndicator={false}
      >
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

        <View style={[styles.contactsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.contactsHeader}>
            <Text style={[styles.contactsTitle, { color: colors.text }]}>Your Contacts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EmergencyContact')}>
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {contacts.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 18 }}>
              <Text style={[styles.emptyText, { color: colors.subtext }]}>No personal contacts added yet.</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext, marginTop: 6 }]}>No contacts saved..... Call 112</Text>
              <TouchableOpacity
                style={[styles.addContactButton, { backgroundColor: colors.primary, marginTop: 14 }]}
                onPress={() => navigation.navigate('EmergencyContact')}
                accessibilityRole="button"
              >
                <Text style={styles.addContactText}>Add Contact</Text>
              </TouchableOpacity>
            </View>
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

      <View style={styles.sosAbsoluteWrap}>
        <Animated.View pointerEvents="none" style={ripple1Style} />
        <Animated.View pointerEvents="none" style={ripple2Style} />

        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onLongPress={handleLongPressSOS}
          delayLongPress={1000}
          disabled={false}
        >
          <Animated.View
            style={[
              styles.sosButton,
              {
                shadowColor: colors.primary,
                transform: [{ scale: pressScale }],
                opacity: contacts.length === 0 ? 0.95 : 1,
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="warning" size={46} color="#fff" />
            <Animated.Text style={[styles.sosText, { opacity: sosPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] }) }]}>
              HOLD FOR SOS
            </Animated.Text>
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
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 12,
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
  emptySubtitle: { textAlign: 'center', fontSize: 14 },
  addContactButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, elevation: 2 },
  addContactText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  hintText: { textAlign: 'center', marginTop: 8, fontWeight: '700' },

  sosAbsoluteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 28,
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
