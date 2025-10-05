// AddMedicineScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
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
  const [focusedField, setFocusedField] = useState(null);

  const handleTimesPerDayChange = (text) => {
    setTimesPerDay(text);
    const count = parseInt(text, 10);
    if (!isNaN(count) && count > 0 && count <= 5) {
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
    Keyboard.dismiss();
    setPickerIndex(index);
    setShowPicker(true);
  };

  const onTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const newTimes = [...times];
      newTimes[pickerIndex] = selectedDate;
      setTimes(newTimes);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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
    if (!name.trim() || times.length === 0 || !duration || !hasAllTimes) {
      Toast.show({ 
        type: 'error', 
        text1: 'Missing Info', 
        text2: 'Fill all fields & set times' 
      });
      return;
    }

    const parsedDuration = parseInt(duration, 10);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      Toast.show({ 
        type: 'error', 
        text1: 'Invalid Duration', 
        text2: 'Enter valid number of days' 
      });
      return;
    }

    setSaving(true);

    try {
      const dosesPerDay = times.length;
      const totalQuantity = parsedDuration * dosesPerDay;

      const medicineData = {
        name: name.trim(),
        duration: parsedDuration,
        times,
        quantity: totalQuantity,
      };

      const docRef = await addDoc(collection(db, 'medicines'), {
        userId: auth.currentUser.uid,
        name: medicineData.name,
        duration: medicineData.duration,
        quantity: medicineData.quantity,
        times: medicineData.times.map(d => Timestamp.fromDate(d)),
        createdAt: Timestamp.now(),
        notificationIds: [],
        takenTimestamps: []
      });

      const userName = await getUserName();

      let notificationIds = [];
      try {
        notificationIds = await scheduleMedicineNotifications(
          {
            id: docRef.id,
            name: medicineData.name,
            times: medicineData.times,
            duration: medicineData.duration,
            quantity: medicineData.quantity,
          },
          userName
        );
      } catch (schedulingError) {
        console.error('Scheduling error:', schedulingError);
        try {
          await deleteDoc(doc(db, 'medicines', docRef.id));
        } catch (e) {
          console.warn('Failed to delete medicine doc after scheduling failure', e);
        }
        throw schedulingError;
      }

      await updateDoc(doc(db, 'medicines', docRef.id), {
        notificationIds: notificationIds,
      });

      Toast.show({ type: 'success', text1: 'Saved!', text2: 'Reminders set' });
      navigation.goBack();
    } catch (error) {
      console.error('Save Error: ', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Save Failed', 
        text2: error.message || 'Could not save' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getDoseIcon = (index) => {
    const icons = ['sunny', 'partly-sunny', 'moon', 'bed', 'restaurant'];
    return icons[index] || 'medical';
  };

  const allFieldsFilled = name.trim() && timesPerDay && duration && times.every(t => t);
  const parsedDuration = parseInt(duration, 10);
  const totalDoses = !isNaN(parsedDuration) ? parsedDuration * times.length : 0;
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
                <Ionicons name="medical" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Add Medicine</Text>
                <Text style={styles.headerSubtitle}>Set medication schedule</Text>
              </View>
            </View>
          </View>

          {/* Medicine Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Medicine Name</Text>
            <View style={[styles.inputWrapper, focusedField === 'name' && styles.inputFocused]}>
              <Ionicons name="bandage-outline" size={18} color={colors.subtext} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Paracetamol"
                placeholderTextColor={colors.subtext}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
              {name.length > 0 && (
                <TouchableOpacity onPress={() => setName('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.subtext} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.row}>
              <View style={styles.freqCard}>
                <Text style={styles.freqLabel}>Times/Day</Text>
                <View style={[styles.inputWrapper, styles.smallInput, focusedField === 'times' && styles.inputFocused]}>
                  <TextInput
                    style={[styles.input, styles.centerText]}
                    placeholder="1-5"
                    placeholderTextColor={colors.subtext}
                    value={timesPerDay}
                    onChangeText={handleTimesPerDayChange}
                    onFocus={() => setFocusedField('times')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                </View>
              </View>

              <View style={styles.freqCard}>
                <Text style={styles.freqLabel}>Days</Text>
                <View style={[styles.inputWrapper, styles.smallInput, focusedField === 'duration' && styles.inputFocused]}>
                  <TextInput
                    style={[styles.input, styles.centerText]}
                    placeholder="7"
                    placeholderTextColor={colors.subtext}
                    value={duration}
                    onChangeText={setDuration}
                    onFocus={() => setFocusedField('duration')}
                    onBlur={() => setFocusedField(null)}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Dose Times */}
          {times.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.label}>Dose Times</Text>
              {times.map((time, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.timeCard, time && styles.timeCardFilled]}
                  onPress={() => showTimePickerFor(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.timeLeft}>
                    <View style={[styles.timeIcon, time && styles.timeIconFilled]}>
                      <Ionicons 
                        name={getDoseIcon(index)} 
                        size={18} 
                        color={time ? '#fff' : colors.primary} 
                      />
                    </View>
                    <View style={styles.timeInfo}>
                      <Text style={styles.timeLabel}>Dose {index + 1}</Text>
                      <Text style={styles.timeValue}>
                        {time ? formatTime(time) : 'Tap to set'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons 
                    name={time ? "checkmark-circle" : "chevron-forward"} 
                    size={20} 
                    color={time ? colors.primary : colors.subtext} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {showPicker && (
            <DateTimePicker
              value={times[pickerIndex] || new Date()}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
            />
          )}

          {/* Summary */}
          {allFieldsFilled && totalDoses > 0 && (
            <View style={styles.summary}>
              <Ionicons name="stats-chart" size={16} color={colors.primary} />
              <Text style={styles.summaryText}>
                {times.length} doses/day × {duration} days = <Text style={styles.summaryBold}>{totalDoses} total doses</Text>
              </Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="notifications-outline" size={16} color={colors.primary} />
            <Text style={styles.infoText}>Reminders at each dose time</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, (!allFieldsFilled || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!allFieldsFilled || saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Medicine</Text>
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
  centerText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  freqCard: {
    flex: 1,
    alignItems: 'center',
  },
  freqLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: 8,
  },
  smallInput: {
    width: '100%',
    paddingHorizontal: 8,
  },
  timeCard: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeCardFilled: {
    borderColor: colors.primary + '40',
    backgroundColor: colors.primary + '08',
  },
  timeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  timeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timeIconFilled: {
    backgroundColor: colors.primary,
  },
  timeInfo: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: colors.subtext,
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 2,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
  },
  summaryBold: {
    fontWeight: 'bold',
    color: colors.primary,
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
