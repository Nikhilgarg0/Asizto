import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';

export default function AddAppointmentScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date()); // State for combined date and time
  const [pickerMode, setPickerMode] = useState(null); // 'date', 'time', or null

  const onDateTimeChange = (event, selectedValue) => {
    const currentValue = selectedValue || date;
    setPickerMode(null); // Hide the picker
    setDate(currentValue);
  };

  const showPicker = (mode) => {
    setPickerMode(mode);
  };

  const handleSave = async () => {
    if (!doctorName) {
      Toast.show({ type: 'error', text1: 'Missing Field', text2: 'Please enter the doctor\'s name.' });
      return;
    }
    try {
      const userId = auth.currentUser.uid;
      await addDoc(collection(db, 'appointments'), {
        userId,
        doctorName,
        date: Timestamp.fromDate(date), // Save the combined date and time
        notes,
        createdAt: Timestamp.now(),
      });

      Toast.show({ type: 'success', text1: 'Appointment Saved' });
      navigation.goBack();
    } catch (error) {
      console.error('Error saving appointment: ', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save appointment.' });
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
        style={[styles.input, { height: 120, textAlignVertical: 'top', paddingTop: 15 }]}
        placeholder="e.g., Follow-up for test results"
        placeholderTextColor={colors.subtext}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Appointment</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 20, 
    backgroundColor: colors.background 
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 25, 
    textAlign: 'center', 
    color: colors.text 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '500', 
    color: colors.subtext, 
    marginBottom: 8, 
    marginLeft: 5 
  },
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
  dateTimePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  pickerButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  }
});