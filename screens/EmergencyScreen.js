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
  Keyboard,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { db } from '../firebaseConfig';
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
import * as Haptics from 'expo-haptics'; // UX-5
import { useIsFocused } from '@react-navigation/native';

const emergencyServices = [
  { name: 'Ambulance', number: '108', icon: 'add' },
  { name: 'Women Helpline', number: '1091', icon: 'woman-outline' },
];

export default function EmergencyScreen({ navigation }) {
  const { colors } = useTheme();
  // ERR-2: use DataContext userId — safe during sign-out
  const { userId, medicines, appointments } = useData();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState({ visible: false, text: '', type: 'info', action: null });
  const bannerTimeout = useRef(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  // Entrance animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const cardSlide1 = useRef(new Animated.Value(50)).current;
  const cardSlide2 = useRef(new Animated.Value(50)).current;

  // ERR-2: guarded with DataContext userId
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'emergencyContacts'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContacts(snapshot.docs.map((d) => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return unsubscribe;
  }, [userId]);

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



  const handleDeletePersonalContact = (contactId) => {
    if (deleteConfirmId !== contactId) {
      setDeleteConfirmId(contactId);
      showBanner('Tap delete again to confirm', 'info');
      setTimeout(() => setDeleteConfirmId((id) => (id === contactId ? null : id)), 4000);
      return;
    }

    deleteDoc(doc(db, 'emergencyContacts', contactId))
      .then(() => {
        // UX-5: haptic on successful delete
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        showBanner('Contact deleted', 'success');
      })
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
    Alert.alert(
      "Confirm Emergency SOS",
      "Are you sure you want to send emergency SOS messages containing your location and medical profile details to your emergency contacts?",
      [
        {
          text: "Cancel",
          onPress: () => {
            showBanner('SOS cancelled', 'info');
          },
          style: "cancel"
        },
        {
          text: "Send SOS",
          style: "destructive",
          onPress: async () => {
            await triggerSOSDispatch();
          }
        }
      ]
    );
  };

  const triggerSOSDispatch = async () => {
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

      // ERR-2: use DataContext userId, fall back to contact name only
      const userSnap = userId ? await getDoc(doc(db, 'users', userId)) : null;
      const user = userSnap?.exists() ? userSnap.data() : {};
      const name =
        user.firstName ||
        user.name ||
        'User';

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

      // ── Current medicines (from DataContext live list) ──────────────────
      const medicineList = medicines
        .slice(0, 8)
        .map((m) => {
          const parts = [m.name];
          if (m.dosage) parts.push(m.dosage);
          return parts.join(' ');
        })
        .join(', ');

      // ── Next upcoming appointment ────────────────────────────────────────
      const now = Date.now();
      const nextAppt = appointments
        .filter((a) => {
          const ms = a.date?.seconds ? a.date.seconds * 1000 : (a.date instanceof Date ? a.date.getTime() : 0);
          return ms > now && !a.attended;
        })
        .slice(0, 3)
        .map((a) => {
          const ms = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date).getTime();
          const dateStr = new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
          const timeStr = new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          return `${a.doctorName || 'Doctor'} on ${dateStr} at ${timeStr}`;
        })
        .join('; ');

      const msgLines = [
        `🚨 EMERGENCY SOS from ${name}${age ? ` (${age} yrs)` : ''}`,
        mapsUrl ? `📍 Location: ${mapsUrl}` : null,
        user?.bloodGroup ? `🩸 Blood Group: ${user.bloodGroup}` : null,
        user?.conditions ? `⚠️ Medical Conditions: ${user.conditions}` : null,
        user?.medications ? `💊 Medications (profile): ${user.medications}` : null,
        user?.allergies ? `🤧 Allergies: ${user.allergies}` : null,
        medicineList ? `💊 Current Medicines: ${medicineList}` : null,
        nextAppt ? `📅 Upcoming Appointments: ${nextAppt}` : null,
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
      // UX-5: haptic feedback on SOS sent
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
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
               accessibilityLabel={`Call ${s.name} at ${s.number}`}
               accessibilityRole="button"
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
                accessibilityLabel="Add emergency contact"
                accessibilityRole="link"
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
                  accessibilityLabel="Add emergency contact"
                  accessibilityRole="link"
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
                      accessibilityLabel={`Delete contact ${item.name}`}
                      accessibilityRole="button"
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
          <Text style={[styles.infoText, { color: colors.subtext, fontSize: 13, textAlign: 'center' }]}>
            Your location and emergency contacts are only used when you trigger SOS. Conversations stay private to your account.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.sosBar, { backgroundColor: 'transparent' }]}>
        <SwipeSOSButton onSOS={handleLongPressSOS} />
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
    paddingBottom: 120, // Increased to allow overlap with the floating SOS slider
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

  sosBar: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    alignItems: 'center',
    zIndex: 100,
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

function SwipeSOSButton({ onSOS }) {
  const { colors } = useTheme();
  const panX = useRef(new Animated.Value(0)).current;
  const [sosSent, setSosSent] = useState(false);
  const BUTTON_WIDTH = Dimensions.get('window').width - 48; // full width minus padding
  const KNOB_SIZE = 64;
  const SLIDE_DISTANCE = BUTTON_WIDTH - KNOB_SIZE - 8; // 8 for padding

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: panX } }],
    { useNativeDriver: false }
  );

  const handleStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationX > SLIDE_DISTANCE * 0.7) {
        // Trigger SOS
        Animated.timing(panX, {
          toValue: SLIDE_DISTANCE,
          duration: 200,
          useNativeDriver: false,
        }).start(() => {
          if (!sosSent) {
            setSosSent(true);
            onSOS();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            // Reset after 3 seconds
            setTimeout(() => {
              Animated.spring(panX, {
                toValue: 0,
                friction: 6,
                useNativeDriver: false,
              }).start(() => setSosSent(false));
            }, 3000);
          }
        });
      } else {
        // Snap back
        Animated.spring(panX, {
          toValue: 0,
          friction: 6,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  const interpolatedX = panX.interpolate({
    inputRange: [0, SLIDE_DISTANCE],
    outputRange: [0, SLIDE_DISTANCE],
    extrapolate: 'clamp',
  });

  const textOpacity = panX.interpolate({
    inputRange: [0, SLIDE_DISTANCE * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  
  const bgOpacity = panX.interpolate({
      inputRange: [0, SLIDE_DISTANCE],
      outputRange: [1, 0.4],
      extrapolate: 'clamp',
  });

  // Use explicit warning color instead of theme danger if it's missing
  const activeColor = colors.danger || '#F44336';

  return (
    <View style={{
      width: BUTTON_WIDTH,
      height: KNOB_SIZE + 8,
      backgroundColor: activeColor + '25',
      borderRadius: (KNOB_SIZE + 8) / 2,
      justifyContent: 'center',
      padding: 4,
      overflow: 'hidden',
    }}>
      <Animated.View style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0, right: 0,
          backgroundColor: activeColor,
          opacity: bgOpacity,
          borderRadius: (KNOB_SIZE + 8) / 2,
      }} />

      <Animated.Text style={{
        position: 'absolute',
        alignSelf: 'center',
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
        letterSpacing: 1.5,
        opacity: textOpacity,
        paddingLeft: 20,
      }}>
        {sosSent ? 'SOS SENT' : 'SWIPE TO SOS'}
      </Animated.Text>

      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}
      >
        <Animated.View style={{
          width: KNOB_SIZE,
          height: KNOB_SIZE,
          backgroundColor: '#fff',
          borderRadius: KNOB_SIZE / 2,
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ translateX: interpolatedX }],
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
        }}>
          <Ionicons name={sosSent ? 'checkmark' : 'warning'} size={32} color={activeColor} />
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
}