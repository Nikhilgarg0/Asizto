import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity,
  Image, TextInput, Platform, Keyboard, LayoutAnimation, UIManager
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { signOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';

import AvatarPickerModal, { getAvatarSource } from '../components/profile/AvatarPickerModal';
import DeleteAccountModal from '../components/profile/DeleteAccountModal';
import { useData } from '../context/DataContext';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

function getImageSourceFromProfile(profile) {
  if (profile?.avatarKey) return getAvatarSource(profile.avatarKey);
  if (profile?.profilePictureUrl && typeof profile.profilePictureUrl === 'string') {
    return { uri: profile.profilePictureUrl };
  }
  return getAvatarSource('male1');
}

const bloodGroupData = [
  { label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' },
];

const genderData = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
];

export default function ProfileScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const { userId } = useData();
  const isGoogleUser = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com') ?? false;

  const [profileData, setProfileData] = useState({});
  const [editableData, setEditableData] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [units, setUnits] = useState('metric');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const scrollViewRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    const docRef = doc(db, "users", userId);
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
  }, [userId]);

  const computeBMIFromMetric = (heightCm, weightKg) => {
    if (!heightCm || !weightKg) return null;
    const heightM = Number(heightCm) / 100;
    if (heightM <= 0) return null;
    const bmi = Number((Number(weightKg) / (heightM * heightM)).toFixed(1));
    let category = 'Unknown';
    let color = colors.subtext;
    if (bmi < 18.5) { category = 'Underweight'; color = '#3498db'; }
    else if (bmi < 25) { category = 'Normal'; color = '#27ae60'; }
    else if (bmi < 30) { category = 'Overweight'; color = '#f39c12'; }
    else { category = 'Obese'; color = '#e74c3c'; }
    return { bmi, category, color };
  };

  const handleInputChange = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
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

      delete dataToSave.__temp;

      await setDoc(doc(db, "users", userId), dataToSave, { merge: true });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsEditing(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 220);

      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your changes have been saved.',
        visibilityTime: 3000,
      });
      Keyboard.dismiss();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not save profile. Please try again.'
      });
    }
  };

  const handleCancelEdit = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsEditing(false);

    const savedUnits = profileData.units || 'metric';
    const metricHeight = profileData.height;
    const metricWeight = profileData.weight;

    const editableHeight = savedUnits === 'metric'
      ? (metricHeight != null ? String(metricHeight) : '')
      : (metricHeight != null ? String((metricHeight / 2.54).toFixed(2)) : '');

    const editableWeight = savedUnits === 'metric'
      ? (metricWeight != null ? String(metricWeight) : '')
      : (metricWeight != null ? String((metricWeight * 2.2046226218).toFixed(2)) : '');

    setUnits(savedUnits);
    setEditableData({
      ...profileData,
      height: editableHeight,
      weight: editableWeight,
    });
    Keyboard.dismiss();
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      handleInputChange('dob', selectedDate);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => signOut(auth).catch(err => Alert.alert('Logout Error', err.message))
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      Alert.alert('Incorrect Confirmation', "Please type 'DELETE' to confirm.");
      return;
    }

    if (!isGoogleUser && !deletePassword.trim()) {
      Alert.alert('Password Required', 'Please enter your password to confirm.');
      return;
    }

    try {
      if (!isGoogleUser) {
        const credential = EmailAuthProvider.credential(
          auth.currentUser?.email ?? '',
          deletePassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      }
      await deleteUser(auth.currentUser);

      Toast.show({ type: 'success', text1: 'Account Deleted' });
      setIsDeleteModalVisible(false);
    } catch (error) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Toast.show({ type: 'error', text1: 'Wrong Password', text2: 'The password you entered is incorrect.' });
      } else if (error.code === 'auth/too-many-requests') {
        Toast.show({ type: 'error', text1: 'Too Many Attempts', text2: 'Please wait a moment and try again.' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: error.message || 'Could not delete account.' });
      }
    }
  };

  const styles = createStyles(colors, theme);
  const savedBMI = computeBMIFromMetric(profileData.height, profileData.weight);

  const InfoRow = ({ label, value, isLast }) => (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={isEditing ? 0.7 : 1}
            onPress={() => isEditing && setShowAvatarModal(true)}
            style={styles.avatarContainer}
          >
            <Image source={getImageSourceFromProfile(isEditing ? editableData : profileData)} style={styles.avatar} />
            {isEditing && (
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.headerName}>
            {`${profileData.firstName || 'User'} ${profileData.lastName || ''}`.trim()}
          </Text>
          <Text style={styles.headerEmail}>{profileData.email || 'N/A'}</Text>

          {!isEditing && (
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsEditing(true);
              }}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isEditing ? (
          <>
            <View style={styles.segmentedControl}>
              {['Overview', 'Health', 'Medical'].map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.segmentTab, activeTab === tab.toLowerCase() && styles.segmentTabActive]}
                  onPress={() => setActiveTab(tab.toLowerCase())}
                >
                  <Text style={[styles.segmentText, activeTab === tab.toLowerCase() && styles.segmentTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'overview' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal Information</Text>
                <View style={styles.card}>
                  <InfoRow label="Full Name" value={`${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || 'Not set'} />
                  <InfoRow label="Date of Birth" value={profileData.dob ? profileData.dob.toLocaleDateString() : 'Not set'} />
                  <InfoRow label="Gender" value={profileData.gender || 'Not set'} />
                  <InfoRow label="Phone" value={profileData.phone || 'Not set'} isLast />
                </View>
              </View>
            )}

            {activeTab === 'health' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Health Metrics</Text>
                <View style={styles.card}>
                  <InfoRow label="Height" value={(() => {
                    if (profileData.height == null) return 'Not set';
                    return units === 'metric' ? `${profileData.height} cm` : `${(profileData.height / 2.54).toFixed(1)} in`;
                  })()} />
                  <InfoRow label="Weight" value={(() => {
                    if (profileData.weight == null) return 'Not set';
                    return units === 'metric' ? `${profileData.weight} kg` : `${(profileData.weight * 2.2046226218).toFixed(1)} lb`;
                  })()} />
                  <InfoRow label="Blood Group" value={profileData.bloodGroup || 'Not set'} isLast={!savedBMI} />

                  {savedBMI && (
                    <View style={styles.bmiContainer}>
                      <View style={styles.bmiRow}>
                        <Text style={styles.bmiLabel}>BMI</Text>
                        <Text style={[styles.bmiValue, { color: savedBMI.color }]}>{savedBMI.bmi}</Text>
                      </View>
                      <View style={styles.bmiStatusRow}>
                        <Text style={[styles.bmiStatus, { color: savedBMI.color }]}>{savedBMI.category}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {activeTab === 'medical' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Medical Information</Text>
                <View style={styles.card}>
                  {profileData.conditions ? (
                    <>
                      <View style={styles.medicalWarningBanner}>
                        <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                        <Text style={styles.medicalWarningText}>Important Medical Information</Text>
                      </View>
                      <Text style={styles.medicalConditionsText}>{profileData.conditions}</Text>
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>No medical conditions or allergies reported.</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Preferences</Text>
              <View style={styles.card}>
                <View style={[styles.row, styles.rowLast]}>
                  <Text style={styles.rowLabel}>Dark Mode</Text>
                  <Switch
                    value={theme === 'dark'}
                    onValueChange={toggleTheme}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={Platform.OS === 'ios' ? "#fff" : (theme === 'dark' ? "#fff" : "#f4f3f4")}
                  />
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={colors.text} />
                <Text style={styles.signOutButtonText}>Sign Out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerButton} onPress={() => setIsDeleteModalVisible(true)}>
                <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                <Text style={styles.dangerButtonText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.card}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput style={styles.input} value={editableData.firstName} onChangeText={v => handleInputChange('firstName', v)} placeholder="First Name" placeholderTextColor={colors.subtext} />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput style={styles.input} value={editableData.lastName} onChangeText={v => handleInputChange('lastName', v)} placeholder="Last Name" placeholderTextColor={colors.subtext} />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.inputAction}>
                    <Text style={[styles.inputText, !editableData.dob && { color: colors.subtext }]}>
                      {editableData.dob ? (editableData.dob instanceof Date ? editableData.dob.toLocaleDateString() : new Date(editableData.dob).toLocaleDateString()) : 'Select Date'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={editableData.dob || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Gender</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownText}
                    containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }}
                    activeColor={theme === 'dark' ? '#2C2C2E' : '#F2F2F7'}
                    itemTextStyle={{ color: colors.text }}
                    data={genderData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select"
                    value={editableData.gender}
                    onChange={item => handleInputChange('gender', item.value)}
                  />
                </View>
                <View style={[styles.inputRow, styles.rowLast]}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput style={styles.input} value={editableData.phone} onChangeText={v => handleInputChange('phone', v)} keyboardType="phone-pad" placeholder="Phone Number" placeholderTextColor={colors.subtext} />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { marginLeft: 0, marginBottom: 0 }]}>Health Metrics</Text>
                <TouchableOpacity onPress={() => setUnits(u => u === 'metric' ? 'imperial' : 'metric')}>
                  <Text style={styles.unitToggleText}>{units === 'metric' ? 'Switch to Imperial' : 'Switch to Metric'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.card}>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Height ({units === 'metric' ? 'cm' : 'in'})</Text>
                  <TextInput style={styles.input} value={editableData.height} onChangeText={v => handleInputChange('height', v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.subtext} />
                </View>
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Weight ({units === 'metric' ? 'kg' : 'lb'})</Text>
                  <TextInput style={styles.input} value={editableData.weight} onChangeText={v => handleInputChange('weight', v.replace(/[^0-9.]/g, ''))} keyboardType="numeric" placeholder="0" placeholderTextColor={colors.subtext} />
                </View>
                <View style={[styles.inputRow, styles.rowLast]}>
                  <Text style={styles.inputLabel}>Blood Group</Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={styles.dropdownPlaceholder}
                    selectedTextStyle={styles.dropdownText}
                    containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }}
                    activeColor={theme === 'dark' ? '#2C2C2E' : '#F2F2F7'}
                    itemTextStyle={{ color: colors.text }}
                    data={bloodGroupData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select"
                    value={editableData.bloodGroup}
                    onChange={item => handleInputChange('bloodGroup', item.value)}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medical Information</Text>
              <View style={styles.card}>
                <TextInput
                  style={styles.textArea}
                  value={editableData.conditions}
                  onChangeText={v => handleInputChange('conditions', v)}
                  placeholder="Describe conditions, allergies, medications..."
                  placeholderTextColor={colors.subtext}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <AvatarPickerModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        selectedKey={editableData.avatarKey}
        onSelect={(key) => handleInputChange('avatarKey', key)}
      />

      <DeleteAccountModal
        visible={isDeleteModalVisible}
        onClose={() => {
          setDeleteConfirmText('');
          setDeletePassword('');
          setIsDeleteModalVisible(false);
        }}
        isGoogleUser={isGoogleUser}
        confirmText={deleteConfirmText}
        onConfirmTextChange={setDeleteConfirmText}
        password={deletePassword}
        onPasswordChange={setDeletePassword}
        onConfirm={handleDeleteAccount}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors, theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#000000' : '#F2F2F7',
  },
  container: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme === 'dark' ? '#000000' : '#F2F2F7',
  },
  headerName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  headerEmail: {
    fontSize: 15,
    color: colors.subtext,
    marginBottom: 16,
  },
  editProfileButton: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#E3E3E8',
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 16,
    marginBottom: 24,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
  },
  segmentTextActive: {
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginBottom: 24,
    marginHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 16,
    marginRight: 16,
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    color: colors.subtext,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 16,
  },
  unitToggleText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  card: {
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '400',
  },
  rowValue: {
    fontSize: 16,
    color: colors.subtext,
    flex: 1,
    textAlign: 'right',
    paddingLeft: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 52,
  },
  inputLabel: {
    fontSize: 16,
    color: colors.text,
    width: 120,
    fontWeight: '400',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: 8,
  },
  inputAction: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  inputText: {
    fontSize: 16,
    color: colors.text,
  },
  dropdown: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: colors.subtext,
    textAlign: 'right',
  },
  textArea: {
    height: 120,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    textAlignVertical: 'top',
  },
  medicalWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  medicalWarningText: {
    color: '#e74c3c',
    fontWeight: '600',
    marginLeft: 8,
  },
  medicalConditionsText: {
    padding: 16,
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    color: colors.subtext,
    fontSize: 15,
    textAlign: 'center',
  },
  bmiContainer: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F9F9F9',
  },
  bmiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bmiLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  bmiValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  bmiStatusRow: {
    alignItems: 'flex-end',
  },
  bmiStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E3E3E8',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtons: {
    marginHorizontal: 16,
    marginTop: 24,
    gap: 12,
  },
  dangerButton: {
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dangerButtonText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  signOutButton: {
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signOutButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
