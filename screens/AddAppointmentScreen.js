// screens/AddAppointmentScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, Timestamp, updateDoc, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { scheduleAppointmentNotification } from '../utils/NotificationManager';

export default function AddAppointmentScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

  const [doctorName, setDoctorName] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const onDateTimeChange = (event, selectedValue) => {
    const currentValue = selectedValue || date;
    if (Platform.OS === 'android') {
      setPickerMode(null);
    }
    if (event.type === 'set') {
      setDate(currentValue);
    }
  };

  const showPicker = (mode) => {
    Keyboard.dismiss();
    setPickerMode(mode);
  };

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
    if (!doctorName.trim()) {
      Toast.show({ type: 'error', text1: 'Missing Field', text2: 'Enter doctor name' });
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

      docRef = await addDoc(collection(db, 'appointments'), {
        userId,
        doctorName: doctorName.trim(),
        date: Timestamp.fromDate(date),
        notes: notes.trim(),
        createdAt: Timestamp.now(),
        notificationIds: []
      });

      const userName = await getUserName();
      const appointmentObj = { id: docRef.id, with: doctorName, time: date, location: '' };
      const notificationIds = [];

      try {
        const id24 = await scheduleAppointmentNotification(appointmentObj, userName, 1440);
        if (id24) notificationIds.push(id24);
      } catch (e) {
        console.warn('24h schedule failed', e);
      }

      try {
        const id1 = await scheduleAppointmentNotification(appointmentObj, userName, 60);
        if (id1) notificationIds.push(id1);
      } catch (e) {
        console.warn('1h schedule failed', e);
      }

      await updateDoc(doc(db, 'appointments', docRef.id), { notificationIds });

      Toast.show({ type: 'success', text1: 'Saved!', text2: 'Reminders set' });
      navigation.goBack();
    } catch (error) {
      console.error('Error saving appointment: ', error);
      if (docRef) {
        try {
          await deleteDoc(doc(db, 'appointments', docRef.id));
        } catch (e) {
          console.warn('Failed to delete appointment after error', e);
        }
      }
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save' });
    } finally {
      setSaving(false);
    }
  };

  const isDateInPast = date < new Date();
  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Compact Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="calendar" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>New Appointment</Text>
                <Text style={styles.headerSubtitle}>Schedule doctor visit</Text>
              </View>
            </View>
          </View>

          {/* Doctor Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Doctor Name</Text>
            <View style={[styles.inputWrapper, focusedField === 'doctor' && styles.inputFocused]}>
              <Ionicons name="person-outline" size={18} color={colors.subtext} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Dr. Smith"
                placeholderTextColor={colors.subtext}
                value={doctorName}
                onChangeText={setDoctorName}
                onFocus={() => setFocusedField('doctor')}
                onBlur={() => setFocusedField(null)}
              />
              {doctorName.length > 0 && (
                <TouchableOpacity onPress={() => setDoctorName('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.subtext} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.label}>Date & Time</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={styles.dateTimeButton} 
                onPress={() => showPicker('date')}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={styles.dateTimeTextContainer}>
                  <Text style={styles.dateTimeLabel}>Date</Text>
                  <Text style={styles.dateTimeValue}>
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dateTimeButton} 
                onPress={() => showPicker('time')}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <View style={styles.dateTimeTextContainer}>
                  <Text style={styles.dateTimeLabel}>Time</Text>
                  <Text style={styles.dateTimeValue}>
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {isDateInPast && (
              <View style={styles.warning}>
                <Ionicons name="warning" size={14} color="#f59e0b" />
                <Text style={styles.warningText}>Scheduled in the past</Text>
              </View>
            )}
          </View>

          {pickerMode && (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateTimeChange}
            />
          )}

          {/* Notes */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.optional}>Optional</Text>
            </View>
            <View style={[styles.inputWrapper, styles.notesWrapper, focusedField === 'notes' && styles.inputFocused]}>
              <TextInput
                style={[styles.input, styles.notesInput]}
                placeholder="Bring reports, tests..."
                placeholderTextColor={colors.subtext}
                value={notes}
                onChangeText={(text) => text.length <= 300 && setNotes(text)}
                onFocus={() => setFocusedField('notes')}
                onBlur={() => setFocusedField(null)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
            </View>
            <Text style={styles.charCount}>{notes.length}/300</Text>
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="notifications-outline" size={16} color={colors.primary} />
            <Text style={styles.infoText}>Reminders: 24h & 1h before</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, (saving || !doctorName.trim()) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving || !doctorName.trim()}
            activeOpacity={0.8}
          >
            {saving ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Appointment</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    flexGrow: 1, 
    padding: 16,
    paddingBottom: 30,
  },
  header: {
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    marginTop: 2,
  },
  section: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optional: {
    fontSize: 12,
    color: colors.subtext,
  },
  inputWrapper: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '05',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  notesWrapper: {
    alignItems: 'flex-start',
    minHeight: 90,
  },
  notesInput: {
    paddingTop: 12,
    minHeight: 90,
  },
  charCount: {
    fontSize: 11,
    color: colors.subtext,
    textAlign: 'right',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 11,
    color: colors.subtext,
  },
  dateTimeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
});
