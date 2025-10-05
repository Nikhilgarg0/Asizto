// EmergencyScreen.js - Enhanced Version
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

const emergencyServices = [
  { name: 'Ambulance', number: '108', icon: 'add' },
  { name: 'Women Helpline', number: '1091', icon: 'woman-outline' },
];

export default function EmergencyScreen({ navigation }) {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ visible: false, text: '', type: 'info', action: null });
  const bannerTimeout = useRef(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Animation references
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const sosPulse = useRef(new Animated.Value(0)).current;
  const longPressProgress = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide1 = useRef(new Animated.Value(50)).current;
  const cardSlide2 = useRef(new Animated.Value(50)).current;
  const sosGlow = useRef(new Animated.Value(0)).current;

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

  // Entrance animations
  useEffect(() => {
    if (!isFocused) return;

    Animated.parallel([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide1, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide2, {
        toValue: 0,
        tension: 50,
        friction: 8,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isFocused]);

  // Ripple animations
  useEffect(() => {
    if (!isFocused) {
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);
      return;
    }

    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(ripple1, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ripple1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(600),
        Animated.timing(ripple2, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ripple2, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.delay(1200),
        Animated.timing(ripple3, {
          toValue: 1,
          duration: 2000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ripple3, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sosPulse, { 
          toValue: 1, 
          duration: 1200, 
          easing: Easing.bezier(0.4, 0, 0.6, 1), 
          useNativeDriver: true 
        }),
        Animated.timing(sosPulse, { 
          toValue: 0, 
          duration: 1200, 
          easing: Easing.bezier(0.4, 0, 0.6, 1), 
          useNativeDriver: true 
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sosGlow, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sosGlow, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop1.start();
    loop2.start();
    loop3.start();
    pulseLoop.start();
    glowLoop.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
      pulseLoop.stop();
      glowLoop.stop();
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);
    };
  }, [isFocused, ripple1, ripple2, ripple3, sosPulse, sosGlow]);

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

  const handleLongPressSOS = async () => {
    try {
      showBanner('Sending SOS...', 'info', null, 1200);

      const smsAvailable = await SMS.isAvailableAsync();
      if (!smsAvailable) {
        showBanner('SMS is not available on this device.', 'error');
        return;
      }

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
          const freshEnough = position && position.timestamp && (now - position.timestamp) < 120000;
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

      const lat = position?.coords?.latitude;
      const lon = position?.coords?.longitude;
      const mapsUrl = (typeof lat === 'number' && typeof lon === 'number')
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        : null;

      const emergencyContactList = contacts
        .map((c) => {
          if (!c.phone) return null;
          const p = String(c.phone).trim().replace(/\s+/g, '');
          const nm = c.name ? c.name : p;
          return `${nm}: ${p}`;
        })
        .filter(Boolean)
        .slice(0, 5)
        .join('; ');

      const age = computeAgeFromDOB(user?.dob);

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
    setIsLongPressing(true);
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.92,
        useNativeDriver: true,
      }),
      Animated.timing(longPressProgress, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    setIsLongPressing(false);
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(longPressProgress, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rippleCommon = {
    position: 'absolute',
    borderRadius: 120,
    backgroundColor: colors.primary,
  };

  const ripple1Style = {
    ...rippleCommon,
    width: 240,
    height: 240,
    opacity: ripple1.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0] }),
    transform: [{ scale: ripple1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
  };

  const ripple2Style = {
    ...rippleCommon,
    width: 240,
    height: 240,
    opacity: ripple2.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0] }),
    transform: [{ scale: ripple2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] }) }],
  };

  const ripple3Style = {
    ...rippleCommon,
    width: 240,
    height: 240,
    opacity: ripple3.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0] }),
    transform: [{ scale: ripple3.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
  };

  const progressRingStyle = {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 4,
    borderColor: '#ffffff',
    opacity: longPressProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.8] }),
    transform: [
      { 
        scale: longPressProgress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.05] }) 
      },
    ],
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: headerFade }}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>Emergency</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>
            Quick access to emergency services
          </Text>
        </Animated.View>

        <Animated.View 
          style={{ 
            opacity: headerFade,
            transform: [{ translateY: cardSlide1 }] 
          }}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Dial</Text>
          <View style={styles.quickRow}>
            {emergencyServices.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={[
                  styles.quickCard, 
                  { 
                    backgroundColor: colors.card,
                    shadowColor: colors.primary,
                  }
                ]}
                onPress={() => handleQuickDial(s.number)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name={s.icon} size={28} color={colors.primary} />
                </View>
                <Text style={[styles.quickName, { color: colors.text }]}>{s.name}</Text>
                <View style={[styles.numberBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.quickNumber}>{s.number}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View 
          style={{ 
            opacity: headerFade,
            transform: [{ translateY: cardSlide2 }] 
          }}
        >
          <View style={[styles.contactsCard, { backgroundColor: colors.card }]}>
            <View style={styles.contactsHeader}>
              <View>
                <Text style={[styles.contactsTitle, { color: colors.text }]}>
                  Personal Contacts
                </Text>
                <Text style={[styles.contactsSubtitle, { color: colors.subtext }]}>
                  {contacts.length} contact{contacts.length !== 1 ? 's' : ''} added
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => navigation.navigate('EmergencyContact')}
                style={[styles.addButton, { backgroundColor: `${colors.primary}15` }]}
              >
                <Ionicons name="add" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {contacts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
                  <Ionicons name="people-outline" size={48} color={colors.primary} />
                </View>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No contacts yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                  Add emergency contacts to use the SOS feature
                </Text>
                <TouchableOpacity
                  style={[styles.addContactButton, { backgroundColor: colors.primary }]}
                  onPress={() => navigation.navigate('EmergencyContact')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
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
                    <View style={[styles.contactAvatar, { backgroundColor: `${colors.primary}20` }]}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
                      <Text style={[styles.contactPhone, { color: colors.subtext }]}>{item.phone}</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => handleDeletePersonalContact(item.id)}
                      style={styles.deleteButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={deleteConfirmId === item.id ? "trash" : "trash-outline"} 
                        size={22} 
                        color="#E57373" 
                      />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </Animated.View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.subtext }]}>
            Hold the SOS button for 1 second
          </Text>
        </View>
      </ScrollView>

      <View style={styles.sosAbsoluteWrap}>
        <Animated.View pointerEvents="none" style={ripple1Style} />
        <Animated.View pointerEvents="none" style={ripple2Style} />
        <Animated.View pointerEvents="none" style={ripple3Style} />

        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onLongPress={handleLongPressSOS}
          delayLongPress={1000}
          disabled={false}
        >
          <Animated.View pointerEvents="none" style={progressRingStyle} />
          
          <Animated.View
            style={[
              styles.sosButton,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                transform: [{ scale: pressScale }],
              },
            ]}
          >
            <Animated.View
              style={{
                opacity: sosGlow.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] }),
              }}
            >
              <Ionicons name="warning" size={52} color="#fff" />
            </Animated.View>
            <Animated.Text 
              style={[
                styles.sosText, 
                { 
                  opacity: sosPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }),
                  transform: [{
                    scale: sosPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] })
                  }]
                }
              ]}
            >
              {isLongPressing ? 'SENDING...' : 'HOLD FOR SOS'}
            </Animated.Text>
          </Animated.View>
        </Pressable>
      </View>

      {banner.visible && (
        <View style={[styles.banner, { backgroundColor: colors.card }]}>
          <Text style={[styles.bannerText, { color: colors.text }]}>{banner.text}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  scrollContent: { 
    paddingHorizontal: 18, 
    paddingTop: 16,
    paddingBottom: 160, // Reduced to allow overlap
  },

  mainTitle: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    opacity: 0.7,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.3,
  },

  quickRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 18,
    gap: 10,
  },
  quickCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    elevation: 3,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickName: { 
    marginTop: 6, 
    fontSize: 14, 
    fontWeight: '700',
    textAlign: 'center',
  },
  numberBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  quickNumber: { 
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  contactsCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  contactsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  contactsTitle: { 
    fontSize: 17, 
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  contactsSubtitle: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.7,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactName: { 
    fontSize: 15, 
    fontWeight: '600',
    marginBottom: 2,
  },
  contactPhone: { 
    fontSize: 13,
    opacity: 0.7,
  },
  deleteButton: {
    padding: 6,
  },

  sep: { height: 1, width: '100%', marginVertical: 3 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyText: { 
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: { 
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  addContactButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22, 
    paddingVertical: 11, 
    borderRadius: 14,
    elevation: 2,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  addContactText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 15,
  },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },

  sosAbsoluteWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },

  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 16,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  sosText: { 
    color: '#fff', 
    marginTop: 10, 
    fontSize: 13, 
    fontWeight: '900', 
    letterSpacing: 1.2,
  },

  banner: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});