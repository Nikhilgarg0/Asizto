// AddMedicineScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, Timestamp, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { scheduleMedicineNotifications } from '../utils/NotificationManager';
import Toast from 'react-native-toast-message';

export default function AddMedicineScreen({ navigation }) {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [timesPerDay, setTimesPerDay] = useState('');
  const [duration, setDuration] = useState('');
  const [times, setTimes] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerIndex, setPickerIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleTimesPerDayChange = (text) => {
    setTimesPerDay(text);
    const count = parseInt(text, 10);
    if (!isNaN(count) && count > 0 && count <= 5) {
      // preserve any previously selected times when possible
      const newArr = Array(count).fill(null);
      for (let i = 0; i < Math.min(times.length, count); i++) {
        newArr[i] = times[i];
      }
      setTimes(newArr);
    } else {
      setTimes([]);
    }
  };

  const showTimePickerFor = (index) => {
    setPickerIndex(index);
    setShowPicker(true);
  };

  const onTimeChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newTimes = [...times];
      newTimes[pickerIndex] = selectedDate;
      setTimes(newTimes);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Try to get a friendly user name: prefer displayName, else Firestore users/{uid}.firstName or name
  const getUserName = async () => {
    try {
      const displayName = auth.currentUser?.displayName;
      if (displayName && displayName.trim().length > 0) {
        return displayName;
      }
      const uid = auth.currentUser?.uid;
      if (!uid) return '';
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        return data.firstName || data.name || '';
      }
      return '';
    } catch (e) {
      console.warn('getUserName error', e);
      return '';
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please sign in to save medicines.');
      return;
    }

    const hasAllTimes = times.length > 0 && times.every(time => time instanceof Date && !isNaN(time));
    if (!name || times.length === 0 || !duration || !hasAllTimes) {
      Alert.alert('Error', 'Please fill in all fields and select a time for each dose.');
      return;
    }

    const parsedDuration = parseInt(duration, 10);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      Alert.alert('Error', 'Please enter a valid duration (days).');
      return;
    }

    setSaving(true);

    try {
      const medicineData = {
        name: name.trim(),
        duration: parsedDuration,
        times // Date objects
      };

      // Save to Firestore first
      const docRef = await addDoc(collection(db, 'medicines'), {
        userId: auth.currentUser.uid,
        name: medicineData.name,
        duration: medicineData.duration,
        times: medicineData.times.map(d => Timestamp.fromDate(d)),
        createdAt: Timestamp.now(),
        notificationIds: [],
        takenTimestamps: []
      });

      // get user name to personalize notification
      const userName = await getUserName();

      // Schedule notifications and get back array of scheduled IDs
      let notificationIds = [];
      try {
        notificationIds = await scheduleMedicineNotifications(
          {
            id: docRef.id,
            name: medicineData.name,
            times: medicineData.times,
            duration: medicineData.duration,
          },
          userName // pass user name - your NotificationManager should accept this param
        );
      } catch (schedulingError) {
        console.error('Scheduling error:', schedulingError);
        // clean up the created document if scheduling failed
        try {
          await deleteDoc(doc(db, 'medicines', docRef.id));
        } catch (e) {
          console.warn('Failed to delete medicine doc after scheduling failure', e);
        }
        throw schedulingError;
      }

      // Save notification IDs back to Firestore for later cancellation
      await updateDoc(doc(db, 'medicines', docRef.id), {
        notificationIds: notificationIds,
      });

      Toast.show({ type: 'success', text1: 'Medicine Saved', text2: 'Reminders have been set.' });
      navigation.goBack();
    } catch (error) {
      console.error('Save Error: ', error);
      Alert.alert('Error', error.message || 'Could not save or schedule medicine reminders.');
    } finally {
      setSaving(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Medicine Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Paracetamol"
        placeholderTextColor={colors.subtext}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>How many times a day?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 2"
        placeholderTextColor={colors.subtext}
        value={timesPerDay}
        onChangeText={handleTimesPerDayChange}
        keyboardType="number-pad"
        maxLength={1}
      />

      <Text style={styles.label}>For how many days?</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 7"
        placeholderTextColor={colors.subtext}
        value={duration}
        onChangeText={setDuration}
        keyboardType="number-pad"
      />

      {times.map((time, index) => (
        <TouchableOpacity
          key={index}
          style={styles.timeButton}
          onPress={() => showTimePickerFor(index)}
        >
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.timeButtonText}>
            {time ? `Dose ${index + 1}: ${formatTime(time)}` : `Select Time for Dose ${index + 1}`}
          </Text>
        </TouchableOpacity>
      ))}

      {showPicker && (
        <DateTimePicker
          value={times[pickerIndex] || new Date()}
          mode="time"
          is24Hour={true}
          display="default"
          onChange={onTimeChange}
        />
      )}

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Medicine'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 25, textAlign: 'center', color: colors.text },
  label: { fontSize: 16, fontWeight: '500', color: colors.subtext, marginBottom: 8, marginLeft: 5 },
  input: {
    backgroundColor: colors.card,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  timeButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  timeButtonText: { fontSize: 16, fontWeight: '600', color: colors.text },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
