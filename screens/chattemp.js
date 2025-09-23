import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, Pressable, FlatList, 
  ActivityIndicator, Linking, Animated, Alert, TouchableOpacity, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import * as SMS from 'expo-sms';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';

// FIX: Removed Police and Fire services
const emergencyServices = [
  { name: 'Ambulance', number: '108', icon: 'medical' },
  { name: 'Women Helpline', number: '1091', icon: 'woman' },
];

export default function EmergencyScreen({ navigation }) {
  const { colors } = useTheme();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const sosScaleAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    // Correctly points to the 'contacts' subcollection
    const q = query(collection(db, 'users', userId, 'contacts'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContacts(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleQuickDial = (number) => {
    Linking.openURL(`tel:${number}`).catch(() => 
      Alert.alert('Error', 'Could not open the dialer.')
    );
  };

  const handleDeleteContact = (contactId) => {
    const userId = auth.currentUser.uid;
    Alert.alert("Delete Contact", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", onPress: () => deleteDoc(doc(db, "users", userId, "contacts", contactId)), style: "destructive" }
    ]);
  };

  const handleSOS = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "Location access is required to send SOS.");
          return;
        }
  
        const location = await Location.getCurrentPositionAsync({});
        const batteryLevel = await Battery.getBatteryLevelAsync();
  
        const userId = auth.currentUser.uid;
        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        const userName = userData.firstName || "User";
  
        const message = `🚨 EMERGENCY SOS from ${userName}:
        📍 Location: https://www.google.com/maps?q=${location.coords.latitude},${location.coords.longitude}
        🔋 Battery: ${(batteryLevel * 100).toFixed(0)}%`;
  
        for (const contact of contacts) {
          if (contact.phone) {
            await SMS.sendSMSAsync([contact.phone], message);
          }
        }
  
        Alert.alert("SOS Sent", "Your emergency message has been sent to all contacts.");
      } catch (error) {
        console.error("Error sending SOS:", error);
        Alert.alert("Error", "Failed to send SOS. Please try again.");
      }
    };

  const handleSOSPressIn = () => {
    Animated.spring(sosScaleAnimation, { toValue: 1.1, useNativeDriver: true }).start();
  };
  const handleSOSPressOut = () => {
    Animated.spring(sosScaleAnimation, { toValue: 1, useNativeDriver: true }).start();
  };
  const animatedStyle = {
    transform: [{ scale: sosScaleAnimation }]
  };

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, {justifyContent: 'center'}]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Quick Dial Services</Text>
        <View style={styles.grid}>
          {emergencyServices.map((service) => (
            <TouchableOpacity key={service.name} style={styles.quickDialCard} onPress={() => handleQuickDial(service.number)}>
              <Ionicons name={service.icon} size={32} color={colors.primary} />
              <Text style={styles.cardText}>{service.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
            <View style={styles.listHeader}>
                <Text style={styles.cardTitle}>Personal Contacts</Text>
                <TouchableOpacity onPress={() => navigation.navigate('EmergencyContact')}>
                    <Ionicons name="add-circle" size={32} color={colors.primary} />
                </TouchableOpacity>
            </View>
            {contacts.length > 0 ? (
                <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                    <View style={styles.contactItem}>
                        <View>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <Text style={styles.contactPhone}>{item.relationship || 'Contact'}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeleteContact(item.id)}>
                        <Ionicons name="trash-outline" size={24} color="#E57373" />
                        </TouchableOpacity>
                    </View>
                    )}
                />
            ) : (
                <Text style={styles.emptyText}>No contacts added. Tap the '+' to add one.</Text>
            )}
        </View>
      </ScrollView>

      <View style={styles.sosContainer}>
        <Pressable
          onPressIn={handleSOSPressIn}
          onPressOut={handleSOSPressOut}
          onLongPress={handleSOS}
          delayLongPress={2000}
          disabled={contacts.length === 0}
        >
          <Animated.View style={[styles.sosButton, animatedStyle]}>
            <Ionicons name="warning" size={50} color={contacts.length > 0 ? '#D80032' : colors.subtext} />
          </Animated.View>
        </Pressable>
        <Text style={styles.sosText}>HOLD FOR 2 SECONDS</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 20, paddingBottom: 200 },
    title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: colors.text },
    grid: { flexDirection: 'row', justifyContent: 'space-around', gap: 15 },
    quickDialCard: { 
        flex: 1, 
        borderRadius: 16, 
        padding: 20, 
        alignItems: 'center', 
        backgroundColor: colors.card,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    cardText: { fontSize: 16, fontWeight: '500', marginTop: 10, color: colors.text },
    card: { 
        backgroundColor: colors.card, 
        borderRadius: 16, 
        padding: 20, 
        marginTop: 30,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    listHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 10, 
        paddingBottom: 10, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border 
    },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    contactItem: { 
        paddingVertical: 15, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border 
    },
    contactName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
    contactPhone: { fontSize: 16, color: colors.subtext },
    emptyText: { 
        textAlign: 'center', 
        paddingVertical: 20, 
        fontSize: 14, 
        color: colors.subtext 
    },
    sosContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, alignItems: 'center' },
    sosButton: { 
        width: 140, 
        height: 140, 
        borderRadius: 70, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.card, 
        elevation: 8, 
        shadowColor: '#000', 
        shadowOpacity: 0.2, 
        shadowRadius: 8 
    },
    sosText: { 
        fontSize: 12, 
        fontWeight: '600', 
        marginTop: 10, 
        letterSpacing: 1, 
        color: colors.subtext 
    },
});