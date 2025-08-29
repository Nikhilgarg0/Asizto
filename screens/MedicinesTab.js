import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';

const MedicineDoseStatus = ({ medicine, handleDelete }) => {
  const { colors } = useTheme();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsTaken = async (medicineId) => {
    const medicineRef = doc(db, "medicines", medicineId);
    await updateDoc(medicineRef, {
      takenTimestamps: arrayUnion(new Date())
    });
  };

  // ✅ Days remaining calculation
  let daysRemainingText = '';
  if (medicine.createdAt && medicine.duration) {
    const startDate = medicine.createdAt.toDate();
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + medicine.duration);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = endDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      daysRemainingText = 'Course finished';
    } else if (diffDays === 0) {
      daysRemainingText = 'Last day';
    } else {
      daysRemainingText = `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    }
  }

  // ✅ Dose calculation logic
  const scheduleTimes = medicine.times.map(ts => ts.toDate());
  const takenTimes = medicine.takenTimestamps?.map(ts => ts.toDate()) || [];

  scheduleTimes.sort((a, b) => a.getHours() * 60 + a.getMinutes() - (b.getHours() * 60 + b.getMinutes()));

  let nextDoseTime = null;
  let isDoseDue = false;
  let doseToTake = null;

  for (const time of scheduleTimes) {
    const doseTimeToday = new Date(now);
    doseTimeToday.setHours(time.getHours(), time.getMinutes(), 0, 0);
    if (doseTimeToday > now) {
      nextDoseTime = doseTimeToday;
      break;
    }
  }

  for (const time of scheduleTimes) {
    const doseTimeToday = new Date(now);
    doseTimeToday.setHours(time.getHours(), time.getMinutes(), 0, 0);
    const oneHourBefore = new Date(doseTimeToday.getTime() - 60 * 60 * 1000);
    const oneHourAfter = new Date(doseTimeToday.getTime() + 60 * 60 * 1000);
    const alreadyTaken = takenTimes.some(takenTime => takenTime >= oneHourBefore && takenTime <= oneHourAfter);
    if (now >= oneHourBefore && now <= oneHourAfter && !alreadyTaken) {
      isDoseDue = true;
      doseToTake = doseTimeToday;
      break;
    }
  }

  const allDosesDone = !nextDoseTime && !isDoseDue;

  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={styles.medicineName}>{medicine.name}</Text>
        <TouchableOpacity onPress={() => handleDelete(medicine)}>
          <Ionicons name="trash-outline" size={22} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        {isDoseDue ? (
          <TouchableOpacity style={styles.takeButton} onPress={() => handleMarkAsTaken(medicine.id)}>
            <Text style={styles.takeButtonText}>
              Take {doseToTake.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        ) : allDosesDone ? (
          <Text style={styles.statusText}>All doses taken for today! ✅</Text>
        ) : nextDoseTime ? (
          <Text style={styles.statusText}>
            Next dose at {nextDoseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        ) : (
          <Text style={styles.statusText}>Check schedule</Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
        <Text style={styles.footerText}>{daysRemainingText}</Text>
      </View>
    </View>
  );
};


export default function MedicinesTab({ route }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [allMedicines, setAllMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  const searchQuery = route.params?.searchQuery || '';
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused || !auth.currentUser) {
      setAllMedicines([]);
      return;
    }
    const userId = auth.currentUser.uid;
    const q = query(collection(db, 'medicines'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setAllMedicines(querySnapshot.docs.map(d => ({ ...d.data(), id: d.id })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [isFocused]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredMedicines(allMedicines.filter(med =>
        med.name.toLowerCase().includes(searchQuery.toLowerCase())
      ));
    } else {
      setFilteredMedicines(allMedicines);
    }
  }, [allMedicines, searchQuery]);

  const handleDelete = (medicine) => {
    Alert.alert("Delete Medicine", "Are you sure? This will cancel all future reminders.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        onPress: async () => {
          if (medicine.notificationIds && medicine.notificationIds.length > 0) {
            for (const id of medicine.notificationIds) {
              await Notifications.cancelScheduledNotificationAsync(id);
            }
          }
          await deleteDoc(doc(db, "medicines", medicine.id));
        },
        style: "destructive"
      }
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} color={colors.primary} />;
  }

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMedicines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MedicineDoseStatus medicine={item} handleDelete={handleDelete} />}
        ListEmptyComponent={<Text style={styles.emptyText}>{searchQuery ? 'No results found.' : 'No medicines added yet.'}</Text>}
        contentContainerStyle={{ padding: 15 }}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMedicine')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}


const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 28,
    elevation: 5
  },
  emptyText: { color: colors.subtext, textAlign: 'center', marginTop: 30, fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
  medicineName: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  cardBody: { paddingHorizontal: 15, paddingBottom: 15 },
  takeButton: { backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  takeButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusText: { fontSize: 16, color: colors.subtext, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 15, borderTopWidth: 1, borderTopColor: colors.border },
  footerText: { fontSize: 14, color: colors.subtext },
});
