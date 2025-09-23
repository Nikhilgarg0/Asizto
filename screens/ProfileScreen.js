// ProfileScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity,
  Modal, Image, TextInput, Platform, Keyboard, LayoutAnimation, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';

// ---------- LOCAL AVATAR SUPPORT ----------
const AVATAR_KEYS = {
  male:    ['male1','male2','male3','male4','male5','male6'],
  female:  ['female1','female2','female3','female4','female5','female6'],
};
const ALL_AVATAR_KEYS = [...AVATAR_KEYS.male, ...AVATAR_KEYS.female];

function getAvatarSource(key) {
  switch (key) {
    // male
    case 'male1': return require('../assets/avatars/male1.png');
    case 'male2': return require('../assets/avatars/male2.png');
    case 'male3': return require('../assets/avatars/male3.png');
    case 'male4': return require('../assets/avatars/male4.png');
    case 'male5': return require('../assets/avatars/male5.png');
    case 'male6': return require('../assets/avatars/male6.png');
    // female
    case 'female1': return require('../assets/avatars/female1.png');
    case 'female2': return require('../assets/avatars/female2.png');
    case 'female3': return require('../assets/avatars/female3.png');
    case 'female4': return require('../assets/avatars/female4.png');
    case 'female5': return require('../assets/avatars/female5.png');
    case 'female6': return require('../assets/avatars/female6.png');
    default:       return require('../assets/avatars/male1.png');
  }
}

function getImageSourceFromProfile(profile) {
  if (profile?.avatarKey) {
    return getAvatarSource(profile.avatarKey);
  }
  if (profile?.profilePictureUrl && typeof profile.profilePictureUrl === 'string') {
    return { uri: profile.profilePictureUrl };
  }
  return getAvatarSource('male1');
}
// -----------------------------------------

const bloodGroupData = [
  { label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ProfileScreen() {
  const { theme, toggleTheme, colors } = useTheme();

  const [profileData, setProfileData] = useState({});
  const [editableData, setEditableData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [units, setUnits] = useState('metric');

  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const raw = docSnap.data();
        const savedUnits = raw.units || 'metric';
        const metricHeight = raw.height != null && raw.height !== '' ? Number(raw.height) : null;
        const metricWeight = raw.weight != null && raw.weight !== '' ? Number(raw.weight) : null;

        const data = {
          ...raw,
          dob: raw.dob ? raw.dob.toDate() : null,
          height: metricHeight,
          weight: metricWeight,
          units: savedUnits,
        };

        const editableHeight = savedUnits === 'metric'
          ? (metricHeight != null ? String(metricHeight) : '')
          : (metricHeight != null ? String((metricHeight / 2.54).toFixed(2)) : '');

        const editableWeight = savedUnits === 'metric'
          ? (metricWeight != null ? String(metricWeight) : '')
          : (metricWeight != null ? String((metricWeight * 2.2046226218).toFixed(2)) : '');

        setUnits(savedUnits);
        setProfileData(data);
        setEditableData({
          ...data,
          height: editableHeight,
          weight: editableWeight,
        });
      }
    });
    return unsubscribe;
  }, []);

  const computeAge = (dob) => {
    if (!dob) return null;
    try {
      const birth = dob instanceof Date ? dob : new Date(dob);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age -= 1;
      }
      return age;
    } catch (e) {
      return null;
    }
  };

  // BMI helpers
  const computeBMIFromMetric = (heightCm, weightKg) => {
    if (!heightCm || !weightKg) return null;
    const heightM = Number(heightCm) / 100;
    if (heightM <= 0) return null;
    const bmi = Number((Number(weightKg) / (heightM * heightM)).toFixed(1));
    let category = 'Unknown';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';
    return { bmi, category };
  };

  const computeBMIEditable = () => {
    const h = editableData.height;
    const w = editableData.weight;
    if (!h || !w) return null;
    if (units === 'metric') {
      return computeBMIFromMetric(Number(h), Number(w));
    } else {
      // editable units are inches and lbs
      const heightCm = Number(h) * 2.54;
      const weightKg = Number(w) / 2.2046226218;
      return computeBMIFromMetric(heightCm, weightKg);
    }
  };

  const handleInputChange = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      // Basic validation (you can expand)
      // Convert editable height/weight back to metric before saving
      const rawHeight = editableData.height !== '' && editableData.height != null ? Number(editableData.height) : null;
      const rawWeight = editableData.weight !== '' && editableData.weight != null ? Number(editableData.weight) : null;

      const metricHeightToSave = units === 'metric'
        ? rawHeight
        : (rawHeight != null ? Number((rawHeight * 2.54).toFixed(2)) : null);

      const metricWeightToSave = units === 'metric'
        ? rawWeight
        : (rawWeight != null ? Number((rawWeight / 2.2046226218).toFixed(2)) : null);

      const dobToSave = editableData.dob instanceof Date ? editableData.dob : (editableData.dob ? new Date(editableData.dob) : null);

      const dataToSave = {
        ...editableData,
        dob: dobToSave ? Timestamp.fromDate(dobToSave) : null,
        height: metricHeightToSave,
        weight: metricWeightToSave,
        units,
      };

      // Remove lightweight UI-only fields (defensive)
      delete dataToSave.__temp;

      await setDoc(doc(db, "users", auth.currentUser.uid), dataToSave, { merge: true });

      // Smoothly collapse edit mode and scroll to top
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsEditing(false);
      // small delay so UI can animate, then scroll
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 220);

      Toast.show({ type: 'success', text1: 'Profile Updated' });
      Keyboard.dismiss();
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save profile.' });
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleInputChange('dob', selectedDate);
    }
  };

  const handleLogout = () => {
    signOut(auth).catch(err => Alert.alert('Logout Error', err.message));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert("Incorrect Confirmation", "Please type 'DELETE' to confirm.");
      return;
    }
    try {
      await deleteUser(auth.currentUser);
      Toast.show({ type: 'success', text1: 'Account Deleted' });
      setIsDeleteModalVisible(false);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not delete account. Please log in again first.' });
    }
  };

  const styles = createStyles(colors);

  const InfoRow = ({label, value}) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const editableBMI = computeBMIEditable();
  const savedBMI = computeBMIFromMetric(profileData.height, profileData.weight);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom','left','right']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header: Cleaner — avatar + name + age */}
        <Animatable.View animation="fadeIn" duration={350} style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <Image source={getImageSourceFromProfile(profileData)} style={styles.avatar} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileData.firstName} {profileData.lastName}</Text>
            {profileData.dob ? (
              <Text style={[styles.profileEmail, { marginTop: 6 }]}>{computeAge(profileData.dob)} yrs</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setIsEditing(prev => !prev);
            // when entering edit mode, scroll slightly so fields are visible
            if (!isEditing) setTimeout(() => scrollViewRef.current?.scrollTo({ y: 160, animated: true }), 180);
          }}>
            <Ionicons name={isEditing ? "close-circle" : "create-outline"} size={26} color={colors.primary} />
          </TouchableOpacity>
        </Animatable.View>

        {isEditing ? (
          <Animatable.View animation="slideInUp" duration={350} style={styles.cardList}>
            {/* Avatar chooser */}
            <View style={[styles.card, styles.accentCard]}>
              <Text style={styles.cardTitle}>Choose Avatar</Text>
              <View style={styles.avatarGrid}>
                {ALL_AVATAR_KEYS.map(key => (
                  <TouchableOpacity key={key} onPress={() => handleInputChange('avatarKey', key)}>
                    <Image
                      source={getAvatarSource(key)}
                      style={[
                        styles.avatarSmall,
                        editableData.avatarKey === key && styles.avatarSelected
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Personal Details (edit) */}
            <View style={[styles.card, styles.accentCard]}>
              <Text style={styles.cardTitle}>Edit Personal Details</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={editableData.email}
                editable={false}
                placeholderTextColor={colors.subtext}
              />

              <TextInput
                style={styles.input}
                placeholder="First Name"
                value={editableData.firstName}
                onChangeText={(val) => handleInputChange('firstName', val)}
                placeholderTextColor={colors.subtext}
              />
              <TextInput
                style={styles.input}
                placeholder="Last Name"
                value={editableData.lastName}
                onChangeText={(val) => handleInputChange('lastName', val)}
                placeholderTextColor={colors.subtext}
              />
              <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                <Text style={{color: colors.text}}>
                  {editableData.dob ? (editableData.dob instanceof Date ? editableData.dob.toLocaleDateString() : new Date(editableData.dob).toLocaleDateString()) : 'Select Date of Birth'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={editableData.dob || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                />
              )}
            </View>

            {/* Health Metrics (edit) */}
            <View style={[styles.card, styles.accentCard]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>Edit Health Metrics</Text>
                <TouchableOpacity onPress={() => setUnits(prev => prev === 'metric' ? 'imperial' : 'metric')}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{units === 'metric' ? 'Metric' : 'Imperial'}</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder={units === 'metric' ? "Height (cm)" : "Height (in)"}
                value={editableData.height}
                onChangeText={(val) => handleInputChange('height', val.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholderTextColor={colors.subtext}
              />
              <TextInput
                style={styles.input}
                placeholder={units === 'metric' ? "Weight (kg)" : "Weight (lb)"}
                value={editableData.weight}
                onChangeText={(val) => handleInputChange('weight', val.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholderTextColor={colors.subtext}
              />

              <View style={{ marginBottom: 12 }}>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={{ color: colors.subtext, fontSize: 16 }}
                  selectedTextStyle={{ color: colors.text, fontSize: 16 }}
                  containerStyle={{ backgroundColor: colors.card, borderColor: colors.border }}
                  activeColor={colors.background}
                  itemTextStyle={{ color: colors.text }}
                  data={bloodGroupData}
                  labelField="label"
                  valueField="value"
                  placeholder="Select Blood Group"
                  value={editableData.bloodGroup}
                  onChange={item => handleInputChange('bloodGroup', item.value)}
                />
              </View>

              <Text style={[styles.smallLabel, { color: colors.subtext }]}>Estimated BMI</Text>
              <Text style={[styles.infoValue, { marginBottom: 12 }]}>
                {editableBMI ? `${editableBMI.bmi} (${editableBMI.category})` : 'Enter height & weight'}
              </Text>

              <Text style={[styles.smallLabel, { color: colors.subtext, marginBottom: 6 }]}>Medical Conditions</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="Describe medical conditions (press Enter for new line)"
                value={editableData.conditions}
                onChangeText={(val) => handleInputChange('conditions', val)}
                placeholderTextColor={colors.subtext}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Dark Mode */}
            <View style={[styles.card, styles.accentCard]}> 
              <View style={styles.settingRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.settingText}>Dark Mode</Text>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#767577", true: colors.primary }}
                  thumbColor={theme === 'dark' ? colors.accent : '#f4f3f4'}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Animatable.Text animation="pulse" easing="ease-out" iterationCount={1} style={styles.saveButtonText}>Save Changes</Animatable.Text>
            </TouchableOpacity>
          </Animatable.View>
        ) : (
          <Animatable.View animation="fadeIn" duration={300} style={styles.cardList}>
            <View style={[styles.card, styles.accentCard]}>
              <Text style={styles.cardTitle}>Personal Details</Text>
              <InfoRow label="Full Name" value={`${profileData.firstName || ''} ${profileData.lastName || ''}`} />
              <InfoRow label="Email" value={profileData.email || 'N/A'} />
              <InfoRow label="Date of Birth" value={profileData.dob ? profileData.dob.toLocaleDateString() : 'N/A'} />
              <InfoRow label="Phone" value={profileData.phone || 'N/A'} />
              <InfoRow label="Gender" value={profileData.gender || 'N/A'} />
            </View>

            <View style={[styles.card, styles.accentCard]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>Health Metrics</Text>
                <TouchableOpacity onPress={() => setUnits(prev => prev === 'metric' ? 'imperial' : 'metric')}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{units === 'metric' ? 'Metric' : 'Imperial'}</Text>
                </TouchableOpacity>
              </View>

              <InfoRow label="Height" value={(() => {
                if (profileData.height == null) return 'N/A';
                return units === 'metric' ? `${profileData.height} cm` : `${(profileData.height / 2.54).toFixed(2)} in`;
              })()} />
              <InfoRow label="Weight" value={(() => {
                if (profileData.weight == null) return 'N/A';
                return units === 'metric' ? `${profileData.weight} kg` : `${(profileData.weight * 2.2046226218).toFixed(2)} lb`;
              })()} />
              <InfoRow label="Blood Group" value={profileData.bloodGroup || 'N/A'} />

              <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 12 }}>
                <Text style={[styles.smallLabel, { color: colors.subtext }]}>BMI</Text>
                <Text style={[styles.infoValue, { marginTop: 4 }]}>
                  {savedBMI ? `${savedBMI.bmi} (${savedBMI.category})` : 'N/A'}
                </Text>
              </View>
            </View>

            <View style={[styles.card, styles.conditionsCard]}>
              <Text style={styles.cardTitle}>Medical Conditions</Text>
              <Text style={[styles.infoValue, { marginTop: 6, color: colors.subtext }]}> 
                {profileData.conditions || 'No medical conditions specified.'}
              </Text>
            </View>

            {/* Dark Mode */}
            <View style={[styles.card, styles.accentCard]}> 
              <View style={styles.settingRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.settingText}>Dark Mode</Text>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#767577", true: colors.primary }}
                  thumbColor={theme === 'dark' ? colors.accent : '#f4f3f4'}
                />
              </View>
            </View>
          </Animatable.View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.subtext} />
            <Text style={[styles.bottomButtonText, {color: colors.subtext}]}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => setIsDeleteModalVisible(true)}>
            <Ionicons name="trash-outline" size={24} color={'#D80032'} />
          </TouchableOpacity>
        </View>

        <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={() => setIsDeleteModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalView, {backgroundColor: colors.card}]}>
              <View style={styles.modalHeaderRow}>
                <Ionicons name="warning" size={32} color="#D80032" />
                <Text style={[styles.modalTitle, {color: colors.text, marginLeft: 12}]}>Delete Account</Text>
              </View>
              <Text style={[styles.modalText, {color: colors.subtext}]}>This action is permanent and will remove all your data. To confirm, type <Text style={{fontWeight: '700'}}>DELETE</Text> below and press Delete.</Text>
              <TextInput
                style={[styles.modalInput, {borderColor: colors.border, color: colors.text}]}
                value={deleteConfirmText}
                onChangeText={(val) => setDeleteConfirmText(val.toUpperCase())}
                autoCapitalize="characters"
                placeholder="Type DELETE to confirm"
                placeholderTextColor={colors.subtext}
                accessibilityLabel="Delete confirmation input"
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalCancelButton]} onPress={() => { setDeleteConfirmText(''); setIsDeleteModalVisible(false); }}>
                  <Text style={{ color: colors.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalDeleteButton, deleteConfirmText === 'DELETE' ? {} : { opacity: 0.5 }]}
                  disabled={deleteConfirmText !== 'DELETE'}
                  onPress={handleDeleteAccount}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { padding: 12, paddingBottom: 24 },
  cardList: { flexDirection: 'column' /* gap fallback via margins in card */ },
  profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 12, marginBottom: 12, elevation: 2 },
  avatarWrap: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: `${colors.primary}10` },
  avatar: { width: 72, height: 72, borderRadius: 35, borderWidth: 2, borderColor: colors.primary },
  avatarSmall: { width: 70, height: 70, borderRadius: 35, margin: 6 },
  avatarSelected: { borderWidth: 3, borderColor: colors.primary },
  profileInfo: { flex: 1, marginLeft: 15 },
  profileName: { fontSize: 22, fontWeight: '700', color: colors.text },
  profileEmail: { fontSize: 14, color: colors.subtext },
  editButton: { padding: 6, position: 'absolute', right: 14, top: 14, zIndex: 2 },
  card: { 
    backgroundColor: colors.card, 
    borderRadius: 12, 
    padding: 16, 
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 2,
  },
  conditionsCard: { 
    borderLeftWidth: 4, 
    borderLeftColor: '#FF6B6B', 
    backgroundColor: colors.card, 
    paddingLeft: 12,
    opacity: 0.98,
  },
  accentCard: { borderLeftWidth: 4, borderLeftColor: colors.primary, paddingLeft: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 16, color: colors.subtext },
  infoValue: { fontSize: 16, color: colors.text, fontWeight: '500' },
  smallLabel: { fontSize: 13, fontWeight: '600' },
  input: { width: '100%', height: 50, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 12, paddingLeft: 15, color: colors.text, fontSize: 16, justifyContent: 'center' },
  multilineInput: { height: 110, paddingTop: 12 },
  dropdown: { width: '100%', height: 50, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 12, paddingHorizontal: 15 },
  saveButton: { 
    backgroundColor: colors.primary, 
    padding: 14, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingText: { fontSize: 16, color: colors.text },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18, gap: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flex: 1 },
  deleteButton: { backgroundColor: colors.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginLeft: 12 },
  bottomButtonText: { fontSize: 16, fontWeight: '600' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalText: { marginBottom: 15, textAlign: 'center' },
  modalInput: { width: '100%', height: 40, borderWidth: 1, borderRadius: 5, marginBottom: 20, paddingHorizontal: 10 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalCancelButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ccc' },
  modalDeleteButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#D80032' },
});
