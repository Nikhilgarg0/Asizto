// ProfileScreen.js - Enhanced Version
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity,
  Modal, Image, TextInput, Platform, Keyboard, LayoutAnimation, UIManager, Dimensions
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
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// ---------- LOCAL AVATAR SUPPORT ----------
const AVATAR_KEYS = {
  male:    ['male1','male2','male3','male4','male5','male6'],
  female:  ['female1','female2','female3','female4','female5','female6'],
};
const ALL_AVATAR_KEYS = [...AVATAR_KEYS.male, ...AVATAR_KEYS.female];

function getAvatarSource(key) {
  switch (key) {
    case 'male1': return require('../assets/avatars/male1.png');
    case 'male2': return require('../assets/avatars/male2.png');
    case 'male3': return require('../assets/avatars/male3.png');
    case 'male4': return require('../assets/avatars/male4.png');
    case 'male5': return require('../assets/avatars/male5.png');
    case 'male6': return require('../assets/avatars/male6.png');
    case 'female1': return require('../assets/avatars/female1.png');
    case 'female2': return require('../assets/avatars/female2.png');
    case 'female3': return require('../assets/avatars/female3.png');
    case 'female4': return require('../assets/avatars/female4.png');
    case 'female5': return require('../assets/avatars/female5.png');
    case 'female6': return require('../assets/avatars/female6.png');
    default: return require('../assets/avatars/male1.png');
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
  const [showAvatarModal, setShowAvatarModal] = useState(false);

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
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
      return age;
    } catch (e) {
      return null;
    }
  };

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

  const computeBMIEditable = () => {
    const h = editableData.height;
    const w = editableData.weight;
    if (!h || !w) return null;
    if (units === 'metric') {
      return computeBMIFromMetric(Number(h), Number(w));
    } else {
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

      await setDoc(doc(db, "users", auth.currentUser.uid), dataToSave, { merge: true });

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsEditing(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 220);

      Toast.show({ type: 'success', text1: '✓ Profile Updated Successfully' });
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

  const styles = createStyles(colors, theme);

  const InfoRow = ({icon, label, value, isLast}) => (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.infoRowLeft}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const editableBMI = computeBMIEditable();
  const savedBMI = computeBMIFromMetric(profileData.height, profileData.weight);

  const getBMIProgress = (bmi) => {
    if (!bmi) return 0;
    const value = bmi.bmi;
    if (value < 18.5) return (value / 18.5) * 25;
    if (value < 25) return 25 + ((value - 18.5) / 6.5) * 25;
    if (value < 30) return 50 + ((value - 25) / 5) * 25;
    return Math.min(75 + ((value - 30) / 10) * 25, 100);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom','left','right']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header with Gradient */}
        <Animatable.View animation="fadeInDown" duration={600} delay={100}>
          <View style={styles.headerCard}>
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => isEditing && setShowAvatarModal(true)}
                style={styles.avatarContainer}
              >
                <View style={styles.avatarGradientWrap}>
                  <Image source={getImageSourceFromProfile(isEditing ? editableData : profileData)} style={styles.avatar} />
                  {isEditing && (
                    <View style={styles.avatarEditBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>
                  {profileData.firstName || 'User'} {profileData.lastName || ''}
                </Text>
                <View style={styles.headerMetaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="mail-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaText}>{profileData.email || 'N/A'}</Text>
                  </View>
                </View>
                {profileData.dob && (
                  <View style={[styles.metaBadge, { marginTop: 6 }]}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaText}>{computeAge(profileData.dob)} years old</Text>
                  </View>
                )}
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.editToggleButton, isEditing && styles.editToggleButtonActive]} 
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setIsEditing(prev => !prev);
                if (!isEditing) setTimeout(() => scrollViewRef.current?.scrollTo({ y: 200, animated: true }), 200);
              }}
            >
              <Ionicons 
                name={isEditing ? "checkmark-circle" : "create-outline"} 
                size={24} 
                color={isEditing ? '#fff' : colors.primary} 
              />
              <Text style={[styles.editToggleText, isEditing && { color: '#fff' }]}>
                {isEditing ? 'Done' : 'Edit'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Quick Stats Bar */}
        {!isEditing && (
          <Animatable.View animation="fadeIn" duration={600} delay={200} style={styles.quickStatsContainer}>
            <View style={styles.quickStatCard}>
              <Ionicons name="body-outline" size={24} color={colors.primary} />
              <Text style={styles.quickStatValue}>
                {profileData.height ? (units === 'metric' ? `${profileData.height}cm` : `${(profileData.height / 2.54).toFixed(1)}"`) : 'N/A'}
              </Text>
              <Text style={styles.quickStatLabel}>Height</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="scale-outline" size={24} color={colors.primary} />
              <Text style={styles.quickStatValue}>
                {profileData.weight ? (units === 'metric' ? `${profileData.weight}kg` : `${(profileData.weight * 2.2046226218).toFixed(1)}lb`) : 'N/A'}
              </Text>
              <Text style={styles.quickStatLabel}>Weight</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="water-outline" size={24} color={colors.primary} />
              <Text style={styles.quickStatValue}>{profileData.bloodGroup || 'N/A'}</Text>
              <Text style={styles.quickStatLabel}>Blood</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="fitness-outline" size={24} color={savedBMI?.color || colors.primary} />
              <Text style={[styles.quickStatValue, savedBMI && { color: savedBMI.color }]}>
                {savedBMI ? savedBMI.bmi : 'N/A'}
              </Text>
              <Text style={styles.quickStatLabel}>BMI</Text>
            </View>
          </Animatable.View>
        )}

        {isEditing ? (
          <Animatable.View animation="fadeInUp" duration={500} style={styles.editContainer}>
            {/* Personal Details Edit */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter first name"
                  value={editableData.firstName}
                  onChangeText={(val) => handleInputChange('firstName', val)}
                  placeholderTextColor={colors.subtext}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter last name"
                  value={editableData.lastName}
                  onChangeText={(val) => handleInputChange('lastName', val)}
                  placeholderTextColor={colors.subtext}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
                  <Text style={{color: colors.text}}>
                    {editableData.dob ? (editableData.dob instanceof Date ? editableData.dob.toLocaleDateString() : new Date(editableData.dob).toLocaleDateString()) : 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ position: 'absolute', right: 15 }} />
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={editableData.dob || new Date()}
                  mode="date"
                  display="spinner"
                  onChange={onDateChange}
                />
              )}
            </View>

            {/* Health Metrics Edit */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="fitness-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Health Metrics</Text>
                <TouchableOpacity 
                  onPress={() => setUnits(prev => prev === 'metric' ? 'imperial' : 'metric')}
                  style={styles.unitToggle}
                >
                  <Text style={styles.unitToggleText}>{units === 'metric' ? 'Metric' : 'Imperial'}</Text>
                  <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Height</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={units === 'metric' ? "cm" : "inches"}
                    value={editableData.height}
                    onChangeText={(val) => handleInputChange('height', val.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                    placeholderTextColor={colors.subtext}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Weight</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={units === 'metric' ? "kg" : "lbs"}
                    value={editableData.weight}
                    onChangeText={(val) => handleInputChange('weight', val.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                    placeholderTextColor={colors.subtext}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Group</Text>
                <Dropdown
                  style={styles.dropdown}
                  placeholderStyle={{ color: colors.subtext, fontSize: 16 }}
                  selectedTextStyle={{ color: colors.text, fontSize: 16 }}
                  containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }}
                  activeColor={colors.background}
                  itemTextStyle={{ color: colors.text }}
                  data={bloodGroupData}
                  labelField="label"
                  valueField="value"
                  placeholder="Select blood group"
                  value={editableData.bloodGroup}
                  onChange={item => handleInputChange('bloodGroup', item.value)}
                />
              </View>

              {editableBMI && (
                <View style={styles.bmiPreview}>
                  <View style={styles.bmiHeader}>
                    <Text style={styles.bmiLabel}>Current BMI</Text>
                    <Text style={[styles.bmiValue, { color: editableBMI.color }]}>{editableBMI.bmi}</Text>
                  </View>
                  <View style={styles.bmiBarContainer}>
                    <View style={styles.bmiBar}>
                      <View style={[styles.bmiBarFill, { 
                        width: `${getBMIProgress(editableBMI)}%`,
                        backgroundColor: editableBMI.color 
                      }]} />
                    </View>
                  </View>
                  <Text style={[styles.bmiCategory, { color: editableBMI.color }]}>{editableBMI.category}</Text>
                </View>
              )}
            </View>

            {/* Medical Conditions Edit */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Medical Conditions</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Conditions & Allergies</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe any medical conditions, allergies, or medications..."
                  value={editableData.conditions}
                  onChangeText={(val) => handleInputChange('conditions', val)}
                  placeholderTextColor={colors.subtext}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Dark Mode Toggle */}
            <View style={styles.sectionCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconCircle}>
                    <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>Dark Mode</Text>
                    <Text style={styles.settingSubtitle}>Switch between light and dark theme</Text>
                  </View>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#d1d5db", true: colors.primary }}
                  thumbColor={theme === 'dark' ? '#fff' : '#f4f3f4'}
                  ios_backgroundColor="#d1d5db"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>Save All Changes</Text>
            </TouchableOpacity>
          </Animatable.View>
        ) : (
          <Animatable.View animation="fadeIn" duration={500}>
            {/* Personal Details View */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>
              <InfoRow icon="person" label="Full Name" value={`${profileData.firstName || ''} ${profileData.lastName || ''}`} />
              <InfoRow icon="mail" label="Email" value={profileData.email || 'N/A'} />
              <InfoRow icon="calendar" label="Date of Birth" value={profileData.dob ? profileData.dob.toLocaleDateString() : 'N/A'} />
              <InfoRow icon="call" label="Phone" value={profileData.phone || 'N/A'} />
              <InfoRow icon="male-female" label="Gender" value={profileData.gender || 'N/A'} isLast />
            </View>

            {/* Health Metrics View */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="fitness-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Health Metrics</Text>
                <TouchableOpacity 
                  onPress={() => setUnits(prev => prev === 'metric' ? 'imperial' : 'metric')}
                  style={styles.unitToggle}
                >
                  <Text style={styles.unitToggleText}>{units === 'metric' ? 'Metric' : 'Imperial'}</Text>
                  <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {savedBMI && (
                <View style={styles.bmiCard}>
                  <View style={styles.bmiCardHeader}>
                    <Text style={styles.bmiCardTitle}>Body Mass Index</Text>
                    <Text style={[styles.bmiCardValue, { color: savedBMI.color }]}>{savedBMI.bmi}</Text>
                  </View>
                  <View style={styles.bmiBarContainer}>
                    <View style={styles.bmiBar}>
                      <View style={[styles.bmiBarFill, { 
                        width: `${getBMIProgress(savedBMI)}%`,
                        backgroundColor: savedBMI.color 
                      }]} />
                    </View>
                  </View>
                  <View style={styles.bmiLegend}>
                    <View style={styles.bmiLegendItem}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#3498db' }]} />
                      <Text style={styles.bmiLegendText}>Under</Text>
                    </View>
                    <View style={styles.bmiLegendItem}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#27ae60' }]} />
                      <Text style={styles.bmiLegendText}>Normal</Text>
                    </View>
                    <View style={styles.bmiLegendItem}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#f39c12' }]} />
                      <Text style={styles.bmiLegendText}>Over</Text>
                    </View>
                    <View style={styles.bmiLegendItem}>
                      <View style={[styles.bmiLegendDot, { backgroundColor: '#e74c3c' }]} />
                      <Text style={styles.bmiLegendText}>Obese</Text>
                    </View>
                  </View>
                  <Text style={[styles.bmiStatus, { color: savedBMI.color }]}>● {savedBMI.category}</Text>
                </View>
              )}

              <InfoRow icon="body" label="Height" value={(() => {
                if (profileData.height == null) return 'N/A';
                return units === 'metric' ? `${profileData.height} cm` : `${(profileData.height / 2.54).toFixed(2)} in`;
              })()} />
              <InfoRow icon="scale" label="Weight" value={(() => {
                if (profileData.weight == null) return 'N/A';
                return units === 'metric' ? `${profileData.weight} kg` : `${(profileData.weight * 2.2046226218).toFixed(2)} lb`;
              })()} />
              <InfoRow icon="water" label="Blood Group" value={profileData.bloodGroup || 'N/A'} isLast />
            </View>

            {/* Medical Conditions View */}
            <View style={[styles.sectionCard, styles.medicalCard]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical-outline" size={22} color="#e74c3c" />
                <Text style={[styles.sectionTitle, { color: '#e74c3c' }]}>Medical Conditions</Text>
              </View>
              <View style={styles.medicalConditionsContent}>
                {profileData.conditions ? (
                  <Text style={styles.medicalConditionsText}>{profileData.conditions}</Text>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="checkmark-circle-outline" size={48} color="#27ae60" />
                    <Text style={styles.emptyStateText}>No medical conditions reported</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Settings */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="settings-outline" size={22} color={colors.primary} />
                <Text style={styles.sectionTitle}>Preferences</Text>
              </View>
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconCircle}>
                    <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.settingTitle}>Dark Mode</Text>
                    <Text style={styles.settingSubtitle}>Automatic theme switching</Text>
                  </View>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: "#d1d5db", true: colors.primary }}
                  thumbColor={theme === 'dark' ? '#fff' : '#f4f3f4'}
                  ios_backgroundColor="#d1d5db"
                />
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={22} color={colors.text} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => setIsDeleteModalVisible(true)}>
            <Ionicons name="trash-outline" size={22} color="#e74c3c" />
          </TouchableOpacity>
        </View>

        {/* Footer Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Avatar Selector Modal */}
      <Modal visible={showAvatarModal} transparent animationType="slide" onRequestClose={() => setShowAvatarModal(false)}>
        <View style={styles.modalOverlay}>
          <Animatable.View animation="slideInUp" duration={400} style={[styles.avatarModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalHeaderText, { color: colors.text }]}>Choose Your Avatar</Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <Ionicons name="close-circle" size={28} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.avatarGrid} showsVerticalScrollIndicator={false}>
              {ALL_AVATAR_KEYS.map(key => (
                <TouchableOpacity 
                  key={key} 
                  onPress={() => {
                    handleInputChange('avatarKey', key);
                    setShowAvatarModal(false);
                  }}
                  style={styles.avatarGridItem}
                >
                  <Image
                    source={getAvatarSource(key)}
                    style={[
                      styles.avatarGridImage,
                      editableData.avatarKey === key && styles.avatarGridImageSelected
                    ]}
                  />
                  {editableData.avatarKey === key && (
                    <View style={styles.avatarCheckmark}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animatable.View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal visible={isDeleteModalVisible} transparent animationType="fade" onRequestClose={() => setIsDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <Animatable.View animation="zoomIn" duration={300} style={[styles.deleteModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.deleteModalIcon}>
              <Ionicons name="warning" size={56} color="#e74c3c" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>Delete Account</Text>
            <Text style={[styles.deleteModalText, { color: colors.subtext }]}>
              This action is <Text style={{ fontWeight: '700', color: '#e74c3c' }}>permanent</Text> and cannot be undone. All your data will be permanently deleted.
            </Text>
            <Text style={[styles.deleteModalInstruction, { color: colors.text }]}>
              Type <Text style={{ fontWeight: '700', color: '#e74c3c' }}>DELETE</Text> to confirm
            </Text>
            <TextInput
              style={[styles.deleteModalInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
              value={deleteConfirmText}
              onChangeText={(val) => setDeleteConfirmText(val.toUpperCase())}
              autoCapitalize="characters"
              placeholder="DELETE"
              placeholderTextColor={colors.subtext}
            />
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity 
                style={[styles.deleteModalButton, styles.deleteModalCancelButton]} 
                onPress={() => { 
                  setDeleteConfirmText(''); 
                  setIsDeleteModalVisible(false); 
                }}
              >
                <Text style={[styles.deleteModalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deleteModalButton, 
                  styles.deleteModalConfirmButton,
                  deleteConfirmText !== 'DELETE' && { opacity: 0.5 }
                ]}
                disabled={deleteConfirmText !== 'DELETE'}
                onPress={handleDeleteAccount}
              >
                <Text style={[styles.deleteModalButtonText, { color: '#fff' }]}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors, theme) => StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  container: { 
    padding: 16,
    paddingTop: 8,
  },
  
  // Enhanced Header
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradientWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  headerMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  editToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    alignSelf: 'flex-start',
  },
  editToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  editToggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },

  // Quick Stats
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 4,
    fontWeight: '500',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 10,
    flex: 1,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.subtext,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
  },

  // Edit Mode
  editContainer: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  dropdown: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },

  // BMI Display
  bmiCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  bmiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bmiCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  bmiCardValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  bmiPreview: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bmiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  bmiValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  bmiBarContainer: {
    marginBottom: 12,
  },
  bmiBar: {
    height: 8,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bmiBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  bmiLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bmiLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bmiLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bmiLegendText: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '500',
  },
  bmiCategory: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  bmiStatus: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Medical Conditions Card
  medicalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  medicalConditionsContent: {
    paddingTop: 4,
  },
  medicalConditionsText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 12,
    fontWeight: '500',
  },

  // Settings
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.subtext,
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  logoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  deleteButton: {
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Save Button
  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },

  // Avatar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  avatarModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderText: {
    fontSize: 20,
    fontWeight: '700',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  avatarGridItem: {
    position: 'relative',
  },
  avatarGridImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  avatarGridImageSelected: {
    borderColor: colors.primary,
    borderWidth: 4,
  },
  avatarCheckmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.card,
    borderRadius: 12,
  },

  // Delete Modal
  deleteModalContent: {
    margin: 20,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  deleteModalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  deleteModalInstruction: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteModalInput: {
    width: '100%',
    height: 50,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  deleteModalConfirmButton: {
    backgroundColor: '#e74c3c',
  },
  deleteModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
