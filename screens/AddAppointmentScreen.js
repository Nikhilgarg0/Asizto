// screens/AddAppointmentScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig'; // <- fixed path
import { collection, addDoc, Timestamp, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext'; // <- fixed path
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { scheduleAppointmentNotification } from '../utils/NotificationManager'; // <- fixed path

export default function AddAppointmentScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date()); // combined date/time
  const [pickerMode, setPickerMode] = useState(null); // 'date' | 'time' | null
  const [saving, setSaving] = useState(false);

  const onDateTimeChange = (event, selectedValue) => {
    const currentValue = selectedValue || date;
    setPickerMode(null);
    setDate(currentValue);
  };

  const showPicker = (mode) => setPickerMode(mode);

  // get friendly user name from auth or users collection
  const getUserName = async () => {
    try {
      const displayName = auth.currentUser?.displayName;
      if (displayName && displayName.trim()) return displayName;
      const uid = auth.currentUser?.uid;
      if (!uid) return '';
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const data = snap.data();
        return data.firstName || data.name || '';
      }
      return '';
    } catch (e) {
      console.warn('getUserName error', e);
      return '';
    }
  };

  const handleSave = async () => {
    if (!doctorName) {
      Toast.show({ type: 'error', text1: 'Missing Field', text2: 'Please enter the doctor\'s name.' });
      return;
    }
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please sign in to save appointments.');
      return;
    }

    setSaving(true);
    let docRef = null;

    try {
      const userId = auth.currentUser.uid;

      // create appointment doc
      docRef = await addDoc(collection(db, 'appointments'), {
        userId,
        doctorName,
        date: Timestamp.fromDate(date),
        notes,
        createdAt: Timestamp.now(),
        notificationIds: []
      });

      // schedule notifications (24h & 1h before) if applicable
      const userName = await getUserName();
      const appointmentObj = { id: docRef.id, with: doctorName, time: date, location: '' };
      const notificationIds = [];

      try {
        const id24 = await scheduleAppointmentNotification(appointmentObj, userName, 1440); // 24 hours
        if (id24) notificationIds.push(id24);
      } catch (e) {
        console.warn('24h schedule failed', e);
      }

      try {
        const id1 = await scheduleAppointmentNotification(appointmentObj, userName, 60); // 1 hour
        if (id1) notificationIds.push(id1);
      } catch (e) {
        console.warn('1h schedule failed', e);
      }

      // save scheduled IDs
      await updateDoc(doc(db, 'appointments', docRef.id), { notificationIds });

      Toast.show({ type: 'success', text1: 'Appointment Saved', text2: 'Reminders scheduled.' });
      navigation.goBack();
    } catch (error) {
      console.error('Error saving appointment: ', error);
      // cleanup doc if created
      if (docRef) {
        try {
          await deleteDoc(doc(db, 'appointments', docRef.id));
        } catch (e) {
          console.warn('Failed to delete appointment after error', e);
        }
      }
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save appointment.' });
    } finally {
      setSaving(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Doctor's Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Dr. Smith"
        placeholderTextColor={colors.subtext}
        value={doctorName}
        onChangeText={setDoctorName}
      />

      <Text style={styles.label}>Date & Time</Text>
      <View style={styles.dateTimePickerContainer}>
        <TouchableOpacity style={styles.pickerButton} onPress={() => showPicker('date')}>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          <Text style={styles.pickerButtonText}>{date.toLocaleDateString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickerButton} onPress={() => showPicker('time')}>
          <Ionicons name="time-outline" size={20} color={colors.primary} />
          <Text style={styles.pickerButtonText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
      </View>

      {pickerMode && (
        <DateTimePicker
          value={date}
          mode={pickerMode}
          is24Hour={true}
          display="spinner"
          onChange={onDateTimeChange}
        />
      )}

      <Text style={styles.label}>Notes (Optional)</Text>
      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: 'top' }]}
        placeholder="e.g., Bring previous reports"
        placeholderTextColor={colors.subtext}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity
        style={[styles.saveButton, saving && { opacity: 0.7 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Appointment'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: colors.background },
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
  dateTimePickerContainer: { flexDirection: 'row', gap: 10 },
  pickerButton: { flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pickerButtonText: { color: colors.text, marginLeft: 6 },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
