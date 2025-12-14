// ProfileScreen.js - Premium Enhanced Version
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity,
  Modal, Image, TextInput, Platform, Keyboard, LayoutAnimation, UIManager, Dimensions, Animated
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

const genderData = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Other', value: 'Other' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
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
  const [activeTab, setActiveTab] = useState('overview'); // overview, health, medical

  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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
    let emoji = '📊';
    if (bmi < 18.5) { category = 'Underweight'; color = '#3498db'; emoji = '📉'; }
    else if (bmi < 25) { category = 'Normal'; color = '#27ae60'; emoji = '✅'; }
    else if (bmi < 30) { category = 'Overweight'; color = '#f39c12'; emoji = '⚠️'; }
    else { category = 'Obese'; color = '#e74c3c'; emoji = '🔴'; }
    return { bmi, category, color, emoji };
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
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();

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

      Toast.show({ 
        type: 'success', 
        text1: '✅ Profile Updated', 
        text2: 'Your changes have been saved successfully',
        visibilityTime: 3000,
      });
      Keyboard.dismiss();
    } catch (error) {
      Toast.show({ 
        type: 'error', 
        text1: '❌ Error', 
        text2: 'Could not save profile. Please try again.' 
      });
    }
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
      Alert.alert("Incorrect Confirmation", "Please type 'DELETE' to confirm.");
      return;
    }
    try {
      await deleteUser(auth.currentUser);
      Toast.show({ type: 'success', text1: '✅ Account Deleted' });
      setIsDeleteModalVisible(false);
    } catch (error) {
      Toast.show({ 
        type: 'error', 
        text1: '❌ Error', 
        text2: 'Could not delete account. Please re-authenticate first.' 
      });
    }
  };

  const styles = createStyles(colors, theme);

  const InfoRow = ({icon, label, value, isLast, highlight}) => (
    <View style={[styles.infoRow, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.infoRowLeft}>
        <View style={[styles.iconCircle, highlight && { backgroundColor: `${highlight}20` }]}>
          <Ionicons name={icon} size={18} color={highlight || colors.primary} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, highlight && { color: highlight }]}>{value}</Text>
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

  const getHealthScore = () => {
    let score = 0;
    if (profileData.height) score += 20;
    if (profileData.weight) score += 20;
    if (profileData.bloodGroup) score += 20;
    if (profileData.dob) score += 20;
    if (savedBMI && savedBMI.category === 'Normal') score += 20;
    return score;
  };

  const healthScore = getHealthScore();

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom','left','right']}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Header with Gradient */}
        <Animatable.View animation="fadeInDown" duration={700} delay={100}>
          <LinearGradient
            colors={theme === 'dark' 
              ? [colors.card, `${colors.card}DD`] 
              : [colors.card, '#ffffff']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.headerCard}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => isEditing && setShowAvatarModal(true)}
                style={styles.avatarContainer}
                activeOpacity={isEditing ? 0.7 : 1}
              >
                <Animated.View style={[styles.avatarGradientWrap, { transform: [{ scale: scaleAnim }] }]}>
                  <LinearGradient
                    colors={[colors.primary, `${colors.primary}AA`]}
                    style={styles.avatarGradient}
                  >
                    <Image source={getImageSourceFromProfile(isEditing ? editableData : profileData)} style={styles.avatar} />
                  </LinearGradient>
                  {isEditing && (
                    <Animatable.View animation="pulse" iterationCount="infinite" duration={2000} style={styles.avatarEditBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </Animatable.View>
                  )}
                </Animated.View>
              </TouchableOpacity>
              
              <View style={styles.headerInfo}>
                <Text style={styles.headerName}>
                  {profileData.firstName || 'User'} {profileData.lastName || ''}
                </Text>
                <View style={styles.headerMetaRow}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="mail-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaText} numberOfLines={1}>{profileData.email || 'N/A'}</Text>
                  </View>
                </View>
                {profileData.dob && (
                  <View style={[styles.metaBadge, { marginTop: 6 }]}>
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaText}>{computeAge(profileData.dob)} years old</Text>
                  </View>
                )}
                {profileData.gender && (
                  <View style={[styles.metaBadge, { marginTop: 6 }]}>
                    <Ionicons name="person-outline" size={14} color={colors.primary} />
                    <Text style={styles.metaText}>{profileData.gender}</Text>
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
              activeOpacity={0.8}
            >
              <Ionicons 
                name={isEditing ? "checkmark-circle" : "create-outline"} 
                size={22} 
                color={isEditing ? '#fff' : colors.primary} 
              />
              <Text style={[styles.editToggleText, isEditing && { color: '#fff' }]}>
                {isEditing ? 'Done Editing' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>

            {/* Health Score Badge */}
            {!isEditing && (
              <Animatable.View animation="fadeIn" delay={400} style={styles.healthScoreBadge}>
                <View style={styles.healthScoreContent}>
                  <Ionicons name="shield-checkmark" size={20} color={healthScore >= 80 ? '#27ae60' : healthScore >= 60 ? '#f39c12' : '#e74c3c'} />
                  <Text style={styles.healthScoreText}>Profile: {healthScore}%</Text>
                </View>
                <View style={styles.healthScoreBar}>
                  <View style={[styles.healthScoreBarFill, { 
                    width: `${healthScore}%`,
                    backgroundColor: healthScore >= 80 ? '#27ae60' : healthScore >= 60 ? '#f39c12' : '#e74c3c'
                  }]} />
                </View>
              </Animatable.View>
            )}
          </LinearGradient>
        </Animatable.View>

        {/* Enhanced Quick Stats */}
        {!isEditing && (
          <Animatable.View animation="fadeIn" duration={700} delay={250} style={styles.quickStatsContainer}>
            <LinearGradient
              colors={theme === 'dark' ? ['#3498db30', '#3498db20'] : ['#3498db15', '#3498db08']}
              style={styles.quickStatCard}
            >
              <View style={styles.quickStatIconBg}>
                <Ionicons name="body-outline" size={24} color="#3498db" />
              </View>
              <Text style={styles.quickStatValue}>
                {profileData.height ? (units === 'metric' ? `${profileData.height}cm` : `${(profileData.height / 2.54).toFixed(1)}"`) : 'N/A'}
              </Text>
              <Text style={styles.quickStatLabel}>Height</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={theme === 'dark' ? ['#9b59b630', '#9b59b620'] : ['#9b59b615', '#9b59b608']}
              style={styles.quickStatCard}
            >
              <View style={styles.quickStatIconBg}>
                <Ionicons name="scale-outline" size={24} color="#9b59b6" />
              </View>
              <Text style={styles.quickStatValue}>
                {profileData.weight ? (units === 'metric' ? `${profileData.weight}kg` : `${(profileData.weight * 2.2046226218).toFixed(1)}lb`) : 'N/A'}
              </Text>
              <Text style={styles.quickStatLabel}>Weight</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={theme === 'dark' ? ['#e74c3c30', '#e74c3c20'] : ['#e74c3c15', '#e74c3c08']}
              style={styles.quickStatCard}
            >
              <View style={styles.quickStatIconBg}>
                <Ionicons name="water-outline" size={24} color="#e74c3c" />
              </View>
              <Text style={styles.quickStatValue}>{profileData.bloodGroup || 'N/A'}</Text>
              <Text style={styles.quickStatLabel}>Blood</Text>
            </LinearGradient>
            
            <LinearGradient
              colors={savedBMI 
                ? theme === 'dark' 
                  ? [`${savedBMI.color}30`, `${savedBMI.color}20`]
                  : [`${savedBMI.color}15`, `${savedBMI.color}08`]
                : [colors.card, colors.card]
              }
              style={styles.quickStatCard}
            >
              <View style={styles.quickStatIconBg}>
                <Ionicons name="fitness-outline" size={24} color={savedBMI?.color || colors.primary} />
              </View>
              <Text style={[styles.quickStatValue, savedBMI && { color: savedBMI.color }]}>
                {savedBMI ? savedBMI.bmi : 'N/A'}
              </Text>
              <Text style={styles.quickStatLabel}>BMI</Text>
            </LinearGradient>
          </Animatable.View>
        )}

        {isEditing ? (
          <Animated.View style={{ opacity: fadeAnim }}>
            <Animatable.View animation="fadeInUp" duration={600}>
              {/* Personal Details Edit */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.sectionIconCircle}>
                      <Ionicons name="person-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="person" size={14} color={colors.primary} /> First Name
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter first name"
                      value={editableData.firstName}
                      onChangeText={(val) => handleInputChange('firstName', val)}
                      placeholderTextColor={colors.subtext}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="person" size={14} color={colors.primary} /> Last Name
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter last name"
                      value={editableData.lastName}
                      onChangeText={(val) => handleInputChange('lastName', val)}
                      placeholderTextColor={colors.subtext}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="calendar" size={14} color={colors.primary} /> Date of Birth
                  </Text>
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
                    maximumDate={new Date()}
                  />
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="male-female" size={14} color={colors.primary} /> Gender
                  </Text>
                  <Dropdown
                    style={styles.dropdown}
                    placeholderStyle={{ color: colors.subtext, fontSize: 16 }}
                    selectedTextStyle={{ color: colors.text, fontSize: 16 }}
                    containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12 }}
                    activeColor={colors.background}
                    itemTextStyle={{ color: colors.text }}
                    data={genderData}
                    labelField="label"
                    valueField="value"
                    placeholder="Select gender"
                    value={editableData.gender}
                    onChange={item => handleInputChange('gender', item.value)}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="call" size={14} color={colors.primary} /> Phone Number
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    value={editableData.phone}
                    onChangeText={(val) => handleInputChange('phone', val)}
                    keyboardType="phone-pad"
                    placeholderTextColor={colors.subtext}
                  />
                </View>
              </View>

              {/* Health Metrics Edit */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.sectionIconCircle}>
                      <Ionicons name="fitness-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>Health Metrics</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setUnits(prev => prev === 'metric' ? 'imperial' : 'metric')}
                    style={styles.unitToggle}
                  >
                    <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                    <Text style={styles.unitToggleText}>{units === 'metric' ? 'Metric' : 'Imperial'}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="body" size={14} color={colors.primary} /> Height
                    </Text>
                    <View style={styles.inputWithUnit}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="0"
                        value={editableData.height}
                        onChangeText={(val) => handleInputChange('height', val.replace(/[^0-9.]/g, ''))}
                        keyboardType="numeric"
                        placeholderTextColor={colors.subtext}
                      />
                      <Text style={styles.unitLabel}>{units === 'metric' ? 'cm' : 'in'}</Text>
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.inputLabel}>
                      <Ionicons name="scale" size={14} color={colors.primary} /> Weight
                    </Text>
                    <View style={styles.inputWithUnit}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="0"
                        value={editableData.weight}
                        onChangeText={(val) => handleInputChange('weight', val.replace(/[^0-9.]/g, ''))}
                        keyboardType="numeric"
                        placeholderTextColor={colors.subtext}
                      />
                      <Text style={styles.unitLabel}>{units === 'metric' ? 'kg' : 'lb'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="water" size={14} color={colors.primary} /> Blood Group
                  </Text>
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
                  <Animatable.View animation="fadeIn" style={styles.bmiPreview}>
                    <View style={styles.bmiHeader}>
                      <Text style={styles.bmiLabel}>Current BMI {editableBMI.emoji}</Text>
                      <Text style={[styles.bmiValue, { color: editableBMI.color }]}>{editableBMI.bmi}</Text>
                    </View>
                    <View style={styles.bmiBarContainer}>
                      <View style={styles.bmiBar}>
                        <Animated.View style={[styles.bmiBarFill, { 
                          width: `${getBMIProgress(editableBMI)}%`,
                          backgroundColor: editableBMI.color 
                        }]} />
                      </View>
                    </View>
                    <Text style={[styles.bmiCategory, { color: editableBMI.color }]}>{editableBMI.category}</Text>
                  </Animatable.View>
                )}
              </View>

              {/* Medical Conditions Edit */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={[styles.sectionIconCircle, { backgroundColor: '#e74c3c20' }]}>
                      <Ionicons name="medical-outline" size={20} color="#e74c3c" />
                    </View>
                    <Text style={styles.sectionTitle}>Medical Information</Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    <Ionicons name="medical" size={14} color="#e74c3c" /> Conditions & Allergies
                  </Text>
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
                  <Text style={styles.inputHint}>
                    💡 Include allergies, chronic conditions, medications, and emergency contacts
                  </Text>
                </View>
              </View>

              {/* Settings */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionHeaderLeft}>
                    <View style={styles.sectionIconCircle}>
                      <Ionicons name="settings-outline" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                  </View>
                </View>
                
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

              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                  <LinearGradient
                    colors={[colors.primary, `${colors.primary}DD`]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.saveButtonGradient}
                  >
                    <Ionicons name="checkmark-circle" size={22} color="#fff" />
                    <Text style={styles.saveButtonText}>Save All Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animatable.View>
          </Animated.View>
        ) : (
          <Animatable.View animation="fadeIn" duration={600}>
            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
                onPress={() => setActiveTab('overview')}
              >
                <Ionicons name="person-outline" size={18} color={activeTab === 'overview' ? colors.primary : colors.subtext} />
                <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>Overview</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'health' && styles.tabActive]}
                onPress={() => setActiveTab('health')}
              >
                <Ionicons name="fitness-outline" size={18} color={activeTab === 'health' ? colors.primary : colors.subtext} />
                <Text style={[styles.tabText, activeTab === 'health' && styles.tabTextActive]}>Health</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'medical' && styles.tabActive]}
                onPress={() => setActiveTab('medical')}
              >
                <Ionicons name="medical-outline" size={18} color={activeTab === 'medical' ? '#e74c3c' : colors.subtext} />
                <Text style={[styles.tabText, activeTab === 'medical' && styles.tabTextActive, activeTab === 'medical' && { color: '#e74c3c' }]}>Medical</Text>
              </TouchableOpacity>
            </View>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <Animatable.View animation="fadeIn" duration={400}>
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={styles.sectionIconCircle}>
                        <Ionicons name="person-outline" size={20} color={colors.primary} />
                      </View>
                      <Text style={styles.sectionTitle}>Personal Information</Text>
                    </View>
                  </View>
                  <InfoRow icon="person" label="Full Name" value={`${profileData.firstName || ''} ${profileData.lastName || ''}`} />
                  <InfoRow icon="mail" label="Email" value={profileData.email || 'N/A'} />
                  <InfoRow icon="calendar" label="Date of Birth" value={profileData.dob ? profileData.dob.toLocaleDateString() : 'N/A'} />
                  <InfoRow icon="call" label="Phone" value={profileData.phone || 'Not provided'} />
                  <InfoRow icon="male-female" label="Gender" value={profileData.gender || 'Not specified'} isLast />
                </View>
              </Animatable.View>
            )}

            {/* Health Tab */}
            {activeTab === 'health' && (
              <Animatable.View animation="fadeIn" duration={400}>
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={styles.sectionIconCircle}>
                        <Ionicons name="fitness-outline" size={20} color={colors.primary} />
                      </View>
                      <Text style={styles.sectionTitle}>Health Metrics</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => setUnits(prev => prev === 'metric' ? 'imperial' : 'metric')}
                      style={styles.unitToggle}
                    >
                      <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                      <Text style={styles.unitToggleText}>{units === 'metric' ? 'Metric' : 'Imperial'}</Text>
                    </TouchableOpacity>
                  </View>

                  {savedBMI && (
                    <Animatable.View animation="pulse" duration={2000} style={styles.bmiCard}>
                      <View style={styles.bmiCardHeader}>
                        <View>
                          <Text style={styles.bmiCardTitle}>Body Mass Index {savedBMI.emoji}</Text>
                          <Text style={styles.bmiCardSubtitle}>Your overall health indicator</Text>
                        </View>
                        <Text style={[styles.bmiCardValue, { color: savedBMI.color }]}>{savedBMI.bmi}</Text>
                      </View>
                      <View style={styles.bmiBarContainer}>
                        <View style={styles.bmiBar}>
                          <Animated.View style={[styles.bmiBarFill, { 
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
                      <View style={[styles.bmiStatusBadge, { backgroundColor: `${savedBMI.color}20` }]}>
                        <Ionicons name="information-circle" size={16} color={savedBMI.color} />
                        <Text style={[styles.bmiStatus, { color: savedBMI.color }]}>{savedBMI.category}</Text>
                      </View>
                    </Animatable.View>
                  )}

                  <InfoRow icon="body" label="Height" value={(() => {
                    if (profileData.height == null) return 'Not provided';
                    return units === 'metric' ? `${profileData.height} cm` : `${(profileData.height / 2.54).toFixed(2)} in`;
                  })()} highlight={profileData.height ? '#3498db' : null} />
                  <InfoRow icon="scale" label="Weight" value={(() => {
                    if (profileData.weight == null) return 'Not provided';
                    return units === 'metric' ? `${profileData.weight} kg` : `${(profileData.weight * 2.2046226218).toFixed(2)} lb`;
                  })()} highlight={profileData.weight ? '#9b59b6' : null} />
                  <InfoRow icon="water" label="Blood Group" value={profileData.bloodGroup || 'Not provided'} highlight={profileData.bloodGroup ? '#e74c3c' : null} isLast />
                </View>
              </Animatable.View>
            )}

            {/* Medical Tab */}
            {activeTab === 'medical' && (
              <Animatable.View animation="fadeIn" duration={400}>
                <View style={[styles.sectionCard, styles.medicalCard]}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={[styles.sectionIconCircle, { backgroundColor: '#e74c3c20' }]}>
                        <Ionicons name="medical-outline" size={20} color="#e74c3c" />
                      </View>
                      <Text style={[styles.sectionTitle, { color: '#e74c3c' }]}>Medical Information</Text>
                    </View>
                  </View>
                  <View style={styles.medicalConditionsContent}>
                    {profileData.conditions ? (
                      <View>
                        <View style={styles.medicalWarningBanner}>
                          <Ionicons name="alert-circle" size={20} color="#e74c3c" />
                          <Text style={styles.medicalWarningText}>Important Medical Information</Text>
                        </View>
                        <Text style={styles.medicalConditionsText}>{profileData.conditions}</Text>
                      </View>
                    ) : (
                      <View style={styles.emptyState}>
                        <Ionicons name="checkmark-circle-outline" size={48} color="#27ae60" />
                        <Text style={styles.emptyStateTitle}>No Medical Conditions</Text>
                        <Text style={styles.emptyStateText}>You haven't reported any medical conditions or allergies</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Emergency Info Card */}
                <View style={[styles.sectionCard, { backgroundColor: '#e74c3c10', borderColor: '#e74c3c', borderWidth: 1 }]}>
                  <View style={styles.emergencyHeader}>
                    <Ionicons name="warning" size={24} color="#e74c3c" />
                    <Text style={styles.emergencyTitle}>Emergency Information</Text>
                  </View>
                  <Text style={styles.emergencyText}>
                    In case of emergency, medical personnel can access this profile to view your blood type, allergies, and medical conditions.
                  </Text>
                </View>
              </Animatable.View>
            )}

            {/* Settings - Always visible */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <View style={styles.sectionIconCircle}>
                    <Ionicons name="settings-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.sectionTitle}>Preferences</Text>
                </View>
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
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color={colors.text} />
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => setIsDeleteModalVisible(true)} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={22} color="#e74c3c" />
          </TouchableOpacity>
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Ionicons name="shield-checkmark" size={16} color={colors.subtext} />
          <Text style={styles.footerText}>Your data is encrypted and secure</Text>
        </View>

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
                    Toast.show({ type: 'success', text1: '✅ Avatar Updated' });
                  }}
                  style={styles.avatarGridItem}
                  activeOpacity={0.7}
                >
                  <Image
                    source={getAvatarSource(key)}
                    style={[
                      styles.avatarGridImage,
                      editableData.avatarKey === key && styles.avatarGridImageSelected
                    ]}
                  />
                  {editableData.avatarKey === key && (
                    <Animatable.View animation="bounceIn" style={styles.avatarCheckmark}>
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    </Animatable.View>
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
            <Animatable.View animation="shake" iterationCount={2} style={styles.deleteModalIcon}>
              <Ionicons name="warning" size={56} color="#e74c3c" />
            </Animatable.View>
            <Text style={[styles.deleteModalTitle, { color: colors.text }]}>Delete Account?</Text>
            <Text style={[styles.deleteModalText, { color: colors.subtext }]}>
              This action is <Text style={{ fontWeight: '700', color: '#e74c3c' }}>permanent</Text> and cannot be undone. All your data will be permanently deleted from our servers.
            </Text>
            <Text style={[styles.deleteModalInstruction, { color: colors.text }]}>
              Type <Text style={{ fontWeight: '700', color: '#e74c3c' }}>DELETE</Text> to confirm
            </Text>
            <TextInput
              style={[styles.deleteModalInput, { borderColor: deleteConfirmText === 'DELETE' ? '#e74c3c' : colors.border, color: colors.text, backgroundColor: colors.background }]}
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
                activeOpacity={0.7}
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
                activeOpacity={0.7}
              >
                <Text style={[styles.deleteModalButtonText, { color: '#fff' }]}>Delete Forever</Text>
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
  
  // Premium Header
  headerCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: theme === 'dark' ? 0.4 : 0.1,
    shadowRadius: 16,
    elevation: 8,
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
    width: 95,
    height: 95,
    borderRadius: 48,
    padding: 3,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.card,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 26,
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
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 6,
    maxWidth: '100%',
  },
  metaText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  editToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    alignSelf: 'flex-start',
  },
  editToggleButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  editToggleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  healthScoreBadge: {
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  healthScoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  healthScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  healthScoreBar: {
    height: 6,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthScoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Enhanced Quick Stats
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  quickStatIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 10,
  },
  quickStatLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 4,
    fontWeight: '600',
  },

  // Tab Container
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 6,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  tabActive: {
    backgroundColor: `${colors.primary}15`,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // Section Cards
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  unitToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoLabel: {
    fontSize: 15,
    color: colors.subtext,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '700',
    textAlign: 'right',
  },

  // Edit Mode
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 16,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  textArea: {
    height: 130,
    paddingTop: 16,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 6,
    fontStyle: 'italic',
  },
  dropdown: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
  },

  // BMI Display
  bmiCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: colors.border,
  },
  bmiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bmiCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  bmiCardSubtitle: {
    fontSize: 12,
    color: colors.subtext,
  },
  bmiCardValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  bmiPreview: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 18,
    marginTop: 18,
    borderWidth: 2,
    borderColor: colors.border,
  },
  bmiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bmiLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  bmiBarContainer: {
    marginBottom: 14,
  },
  bmiBar: {
    height: 10,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 5,
    overflow: 'hidden',
  },
  bmiBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  bmiLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bmiLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bmiLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bmiLegendText: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
  },
  bmiCategory: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 10,
  },
  bmiStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 14,
  },
  bmiStatus: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Medical Card
  medicalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  medicalConditionsContent: {
    paddingTop: 4,
  },
  medicalWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#e74c3c15',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  medicalWarningText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e74c3c',
  },
  medicalConditionsText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.subtext,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Emergency Info
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#e74c3c',
  },
  emergencyText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  logoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  deleteButton: {
    backgroundColor: colors.card,
    paddingHorizontal: 22,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#e74c3c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },

  // Save Button
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 8,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },

  // Footer
  footerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },

  // Avatar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  avatarModalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderText: {
    fontSize: 22,
    fontWeight: '800',
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 24,
    gap: 18,
  },
  avatarGridItem: {
    position: 'relative',
  },
  avatarGridImage: {
    width: 85,
    height: 85,
    borderRadius: 43,
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
    margin: 24,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  deleteModalIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#e74c3c',
  },
  deleteModalTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  deleteModalText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  deleteModalInstruction: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteModalInput: {
    width: '100%',
    height: 56,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  deleteModalConfirmButton: {
    backgroundColor: '#e74c3c',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
