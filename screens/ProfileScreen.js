// ProfileScreen.js — iOS-style redesign
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity,
  Modal, Image, TextInput, Platform, Keyboard, Animated,
  Pressable, KeyboardAvoidingView,
} from 'react-native';
import Reanimated, { LinearTransition, FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { signOut, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { LinearGradient } from 'expo-linear-gradient';
import { ALL_AVATAR_KEYS, getAvatarSource, getImageSourceFromProfile } from '../utils/avatars';

// ─── Dropdown data ─────────────────────────────────────────────────────────
const bloodGroupData = [
  { label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' },
];
const genderData = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer' },
];

const formatGender = g => {
  if (!g) return '—';
  if (g === 'prefer') return 'Prefer not to say';
  return g.charAt(0).toUpperCase() + g.slice(1);
};

// ─── BMI helpers ──────────────────────────────────────────────────────────
function computeBMIFromMetric(heightCm, weightKg, colors) {
  if (!heightCm || !weightKg) return null;
  const hm = Number(heightCm) / 100;
  if (hm <= 0) return null;
  const bmi = parseFloat((Number(weightKg) / (hm * hm)).toFixed(1));
  
  const normalColor = colors?.success || '#22c55e';
  const warningColor = colors?.warning || '#f59e0b';
  const dangerColor = colors?.danger || '#ef4444';
  const underweightColor = colors?.accent || '#3b82f6';

  if (bmi < 18.5) return { bmi, category: 'Underweight', color: underweightColor };
  if (bmi < 25)   return { bmi, category: 'Normal',      color: normalColor };
  if (bmi < 30)   return { bmi, category: 'Overweight',  color: warningColor };
                  return { bmi, category: 'Obese',        color: dangerColor };
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { theme, toggleTheme, colors } = useTheme();
  const { userProfile } = useData();
  const isGoogleUser = auth.currentUser?.providerData?.some(p => p.providerId === 'google.com');

  const [profileData, setProfileData]     = useState({});
  const [editableData, setEditableData]   = useState({});
  const [isEditing, setIsEditing]         = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [units, setUnits]                 = useState('metric');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [deleteModal, setDeleteModal]     = useState(false);
  const [deleteText, setDeleteText]       = useState('');
  const [deletePass, setDeletePass]       = useState('');

  const scrollRef   = useRef(null);
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const S = createStyles(colors, theme);

  // ── Synchronize with global userProfile from useData context ──────────
  useEffect(() => {
    if (!userProfile || Object.keys(userProfile).length === 0) return;
    const raw = userProfile;
    const savedUnits = raw.units || 'metric';
    const mH = raw.height != null && raw.height !== '' ? Number(raw.height) : null;
    const mW = raw.weight != null && raw.weight !== '' ? Number(raw.weight) : null;
    const dobDate = raw.dob ? (raw.dob.toDate ? raw.dob.toDate() : new Date(raw.dob)) : null;
    const data = { ...raw, dob: dobDate, height: mH, weight: mW, units: savedUnits };
    setUnits(savedUnits);
    setProfileData(data);
    setEditableData({
      ...data,
      height: savedUnits === 'metric' ? (mH != null ? String(mH) : '') : (mH != null ? String((mH / 2.54).toFixed(2)) : ''),
      weight: savedUnits === 'metric' ? (mW != null ? String(mW) : '') : (mW != null ? String((mW * 2.2046).toFixed(2)) : ''),
    });
  }, [userProfile]);

  // ── Derived values ─────────────────────────────────────────────────────
  const computeAge = dob => {
    if (!dob) return null;
    const b = dob instanceof Date ? dob : new Date(dob);
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };

  const savedBMI = computeBMIFromMetric(profileData.height, profileData.weight, colors);

  const editBMI = (() => {
    const h = editableData.height, w = editableData.weight;
    if (!h || !w) return null;
    return units === 'metric'
      ? computeBMIFromMetric(Number(h), Number(w), colors)
      : computeBMIFromMetric(Number(h) * 2.54, Number(w) / 2.2046, colors);
  })();

  const bmiProgress = bmi => {
    if (!bmi) return 0;
    const v = bmi.bmi;
    if (v < 18.5) return (v / 18.5) * 25;
    if (v < 25)   return 25 + ((v - 18.5) / 6.5) * 25;
    if (v < 30)   return 50 + ((v - 25) / 5) * 25;
    return Math.min(75 + ((v - 30) / 10) * 25, 100);
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const change = (field, val) => setEditableData(p => ({ ...p, [field]: val }));

  const handleSave = async () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    try {
      const rH = editableData.height !== '' && editableData.height != null ? Number(editableData.height) : null;
      const rW = editableData.weight !== '' && editableData.weight != null ? Number(editableData.weight) : null;
      const mH = units === 'metric' ? rH : (rH != null ? Number((rH * 2.54).toFixed(2)) : null);
      const mW = units === 'metric' ? rW : (rW != null ? Number((rW / 2.2046).toFixed(2)) : null);
      const dob = editableData.dob instanceof Date ? editableData.dob : (editableData.dob ? new Date(editableData.dob) : null);
      const payload = { ...editableData, dob: dob ? Timestamp.fromDate(dob) : null, height: mH, weight: mW, units };
      delete payload.__temp;
      await setDoc(doc(db, 'users', auth.currentUser.uid), payload, { merge: true });
      setIsEditing(false);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      Toast.show({ type: 'success', text1: 'Profile saved', text2: 'Your changes have been saved.' });
      Keyboard.dismiss();
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save profile.' });
    }
  };

  const handleLogout = () =>
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut(auth).catch(e => Alert.alert('Error', e.message)) },
    ]);

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') { Alert.alert('Type DELETE to confirm'); return; }
    if (!isGoogleUser && !deletePass.trim()) { Alert.alert('Password required'); return; }
    try {
      if (!isGoogleUser) {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, deletePass);
        await reauthenticateWithCredential(auth.currentUser, cred);
      }
      await deleteUser(auth.currentUser);
      setDeleteModal(false);
    } catch (e) {
      const msg = e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential'
        ? 'Incorrect password.' : e.message || 'Could not delete account.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    }
  };

  // ── Reusable sub-components ───────────────────────────────────────────

  // iOS grouped-list row
  const ListRow = ({ icon, iconColor, label, value, isLast, accessory }) => (
    <View style={[S.listRow, isLast && S.listRowLast]}>
      <View style={[S.listIcon, { backgroundColor: `${iconColor || colors.primary}18` }]}>
        <Ionicons name={icon} size={17} color={iconColor || colors.primary} />
      </View>
      <View style={S.listRowBody}>
        <Text style={S.listRowLabel}>{label}</Text>
        {accessory || <Text style={S.listRowValue} numberOfLines={1}>{value || '—'}</Text>}
      </View>
    </View>
  );

  // Labeled text input field
  const Field = ({ label, icon, iconColor, children, hint }) => (
    <View style={S.fieldGroup}>
      <View style={S.fieldLabelRow}>
        <Ionicons name={icon} size={14} color={iconColor || colors.primary} />
        <Text style={S.fieldLabel}>{label}</Text>
      </View>
      {children}
      {hint && <Text style={S.fieldHint}>{hint}</Text>}
    </View>
  );

  // Grouped section card (iOS grouped style)
  const Section = ({ title, children, accent }) => (
    <View style={S.section}>
      {title && <Text style={[S.sectionTitle, accent && { color: accent }]}>{title}</Text>}
      <View style={S.sectionCard}>{children}</View>
    </View>
  );

  const displayH = profileData.height == null ? null
    : units === 'metric' ? `${profileData.height} cm` : `${(profileData.height / 2.54).toFixed(1)} in`;
  const displayW = profileData.weight == null ? null
    : units === 'metric' ? `${profileData.weight} kg` : `${(profileData.weight * 2.2046).toFixed(1)} lb`;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={S.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={S.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        {/* ── Hero Header ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={theme === 'dark' ? [colors.card, colors.background] : ['#ffffff', colors.background]}
          style={S.hero}
        >
          {/* Avatar */}
          <TouchableOpacity
            onPress={() => isEditing && setShowAvatarModal(true)}
            activeOpacity={isEditing ? 0.7 : 1}
            style={S.avatarWrap}
            accessibilityLabel={isEditing ? 'Change avatar' : 'Profile avatar'}
          >
            <Image source={getImageSourceFromProfile(isEditing ? editableData : profileData)} style={S.avatar} />
            {isEditing && (
              <View style={[S.avatarBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Name + meta */}
          <Text style={S.heroName}>
            {(profileData.firstName || 'Your') + ' ' + (profileData.lastName || 'Profile')}
          </Text>
          {profileData.email && (
            <Text style={S.heroEmail}>{profileData.email}</Text>
          )}
          <View style={S.heroPills}>
            {profileData.dob && (
              <View style={S.pill}>
                <Ionicons name="calendar-outline" size={12} color={colors.primary} />
                <Text style={[S.pillText, { color: colors.primary }]}>{computeAge(profileData.dob)} yrs</Text>
              </View>
            )}
            {profileData.gender && (
              <View style={S.pill}>
                <Ionicons name="person-outline" size={12} color={colors.primary} />
                <Text style={[S.pillText, { color: colors.primary }]}>{formatGender(profileData.gender)}</Text>
              </View>
            )}
            {profileData.bloodGroup && (
              <View style={[S.pill, { backgroundColor: '#ef444420' }]}>
                <Ionicons name="water" size={12} color="#ef4444" />
                <Text style={[S.pillText, { color: '#ef4444' }]}>{profileData.bloodGroup}</Text>
              </View>
            )}
          </View>

          {/* Edit / Done button */}
          <TouchableOpacity
            style={[S.editBtn, isEditing && { backgroundColor: colors.primary }]}
            onPress={() => {
              if (isEditing) {
                setIsEditing(false);
                setEditableData({ ...profileData });
              } else {
                setEditableData({ ...profileData });
                setIsEditing(true);
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons name={isEditing ? 'close' : 'create-outline'} size={17} color={isEditing ? '#fff' : colors.primary} />
            <Text style={[S.editBtnText, isEditing && { color: '#fff' }]}>
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Quick Stats ─────────────────────────────────────────────── */}
        {!isEditing && (
          <Reanimated.View
            layout={LinearTransition}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(400)}
            style={S.statsRow}
          >
            <StatCard label="Height" value={displayH || '—'} icon="body-outline" color="#3b82f6" colors={colors} theme={theme} S={S} />
            <StatCard label="Weight" value={displayW || '—'} icon="scale-outline" color="#a855f7" colors={colors} theme={theme} S={S} />
            <StatCard label="BMI" value={savedBMI ? String(savedBMI.bmi) : '—'} icon="fitness-outline" color={savedBMI?.color || colors.primary} colors={colors} theme={theme} S={S} />
          </Reanimated.View>
        )}

        {/* ═══════════════════════ VIEW MODE ═══════════════════════════ */}
        {!isEditing && (
          <Reanimated.View
            layout={LinearTransition}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(400)}
          >
            {/* Personal */}
            <Section title="PERSONAL INFORMATION">
              <ListRow icon="person" label="Full Name" value={`${profileData.firstName || ''} ${profileData.lastName || ''}`.trim() || null} />
              <ListRow icon="mail" label="Email" value={profileData.email} />
              <ListRow icon="calendar-outline" label="Date of Birth" value={profileData.dob ? profileData.dob.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null} />
              <ListRow icon="call-outline" label="Phone" value={profileData.phone} />
              <ListRow icon="person-outline" label="Gender" value={formatGender(profileData.gender)} isLast />
            </Section>

            {/* Health */}
            <Section title="HEALTH METRICS">
              {/* BMI Card */}
              {savedBMI && (
                <View style={S.bmiBlock}>
                  <View style={S.bmiTopRow}>
                    <View>
                      <Text style={S.bmiHeading}>Body Mass Index</Text>
                      <Text style={[S.bmiCat, { color: savedBMI.color }]}>{savedBMI.category}</Text>
                    </View>
                    <Text style={[S.bmiBigNum, { color: savedBMI.color }]}>{savedBMI.bmi}</Text>
                  </View>
                  <BMIBar progress={bmiProgress(savedBMI)} color={savedBMI.color} colors={colors} S={S} />
                  <View style={S.bmiLegendRow}>
                    {[['#3b82f6','Under'],['#22c55e','Normal'],['#f59e0b','Over'],['#ef4444','Obese']].map(([c,l]) => (
                      <View key={l} style={S.bmiLegendItem}>
                        <View style={[S.bmiDot, { backgroundColor: c }]} />
                        <Text style={S.bmiLegendLabel}>{l}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              <ListRow icon="body-outline" label="Height" value={displayH} iconColor="#3b82f6"
                accessory={
                  <TouchableOpacity style={S.unitChip} onPress={() => setUnits(u => u === 'metric' ? 'imperial' : 'metric')}>
                    <Text style={[S.unitChipText, { color: colors.primary }]}>{displayH || '—'}   {units === 'metric' ? 'cm' : 'in'} ⇄</Text>
                  </TouchableOpacity>
                }
              />
              <ListRow icon="scale-outline" label="Weight" value={displayW} iconColor="#a855f7"
                accessory={<Text style={S.listRowValue}>{displayW || '—'}</Text>}
              />
              <ListRow icon="water" label="Blood Group" value={profileData.bloodGroup} iconColor="#ef4444" isLast />
            </Section>

            {/* Medical */}
            <Section title="MEDICAL INFORMATION" accent="#ef4444">
              {profileData.conditions ? (
                <View style={S.medicalBlock}>
                  <View style={S.medicalBanner}>
                    <Ionicons name="alert-circle" size={18} color="#ef4444" />
                    <Text style={S.medicalBannerText}>Important Medical Information</Text>
                  </View>
                  <Text style={S.medicalBody}>{profileData.conditions}</Text>
                </View>
              ) : (
                <View style={S.emptyMedical}>
                  <Ionicons name="checkmark-circle-outline" size={40} color="#22c55e" />
                  <Text style={S.emptyMedicalTitle}>No Medical Conditions</Text>
                  <Text style={S.emptyMedicalSub}>No conditions or allergies on record.</Text>
                </View>
              )}
            </Section>

            {/* Preferences */}
            <Section title="PREFERENCES">
              <ListRow
                icon={theme === 'dark' ? 'moon' : 'sunny'}
                label="Dark Mode"
                isLast
                accessory={
                  <Switch
                    value={theme === 'dark'}
                    onValueChange={toggleTheme}
                    trackColor={{ false: '#e5e7eb', true: colors.primary }}
                    thumbColor="#fff"
                    ios_backgroundColor="#e5e7eb"
                  />
                }
              />
            </Section>
          </Reanimated.View>
        )}

        {/* ═══════════════════════ EDIT MODE ═══════════════════════════ */}
        {isEditing && (
          <Reanimated.View
            layout={LinearTransition}
            entering={FadeInDown.duration(400)}
            exiting={FadeOut.duration(400)}
          >
            {/* Personal */}
            <Section title="PERSONAL INFORMATION">
              {/* Name row — inlineRow avoids double padding */}
              <View style={S.inlineRow}>
                <View style={S.inlineField}>
                  <View style={S.inlineLabel}>
                    <Ionicons name="person" size={13} color={colors.primary} />
                    <Text style={S.inlineLabelText}>First Name</Text>
                  </View>
                  <TextInput style={S.input} value={editableData.firstName} onChangeText={v => change('firstName', v)} placeholder="First name" placeholderTextColor={colors.subtext} />
                </View>
                <View style={S.inlineField}>
                  <View style={S.inlineLabel}>
                    <Ionicons name="person" size={13} color={colors.primary} />
                    <Text style={S.inlineLabelText}>Last Name</Text>
                  </View>
                  <TextInput style={S.input} value={editableData.lastName} onChangeText={v => change('lastName', v)} placeholder="Last name" placeholderTextColor={colors.subtext} />
                </View>
              </View>

              <Field label="Date of Birth" icon="calendar-outline">
                <TouchableOpacity style={S.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                  <Text style={{ color: editableData.dob ? colors.text : colors.subtext }}>
                    {editableData.dob
                      ? (editableData.dob instanceof Date ? editableData.dob : new Date(editableData.dob)).toLocaleDateString()
                      : 'Select date'}
                  </Text>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} style={{ position: 'absolute', right: 14, top: 14 }} />
                </TouchableOpacity>
              </Field>
              {showDatePicker && (
                Platform.OS === 'ios' ? (
                  <Modal transparent visible={showDatePicker} animationType="slide">
                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                      <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 30 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1.5, borderColor: colors.border }}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={{ color: colors.subtext, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Done</Text>
                          </TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={editableData.dob || new Date()}
                          mode="date"
                          display="spinner"
                          maximumDate={new Date()}
                          onChange={(_, d) => { if (d) change('dob', d); }}
                        />
                      </View>
                    </View>
                  </Modal>
                ) : (
                  <DateTimePicker
                    value={editableData.dob || new Date()}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(_, d) => { setShowDatePicker(false); if (d) change('dob', d); }}
                  />
                )
              )}

              <Field label="Gender" icon="male-female">
                <Dropdown
                  style={S.dropdown}
                  placeholderStyle={{ color: colors.subtext, fontSize: 16 }}
                  selectedTextStyle={{ color: colors.text, fontSize: 16 }}
                  containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14 }}
                  activeColor={colors.background}
                  itemTextStyle={{ color: colors.text }}
                  data={genderData}
                  labelField="label"
                  valueField="value"
                  placeholder="Select gender"
                  value={editableData.gender}
                  onChange={i => change('gender', i.value)}
                />
              </Field>

              <Field label="Phone" icon="call-outline">
                <TextInput style={S.input} value={editableData.phone} onChangeText={v => change('phone', v)} placeholder="Phone number" placeholderTextColor={colors.subtext} keyboardType="phone-pad" />
              </Field>
            </Section>

            {/* Health Metrics */}
            <Section title="HEALTH METRICS">
              {/* Unit toggle */}
              <View style={{ paddingHorizontal: 16, paddingTop: 14, alignItems: 'flex-end' }}>
                <TouchableOpacity
                  style={S.unitToggle}
                  onPress={() => setUnits(u => u === 'metric' ? 'imperial' : 'metric')}
                >
                  <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
                  <Text style={[S.unitToggleText, { color: colors.primary }]}>
                    Switch to {units === 'metric' ? 'Imperial' : 'Metric'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Height + Weight inline — flat inlineRow to avoid double padding */}
              <View style={S.inlineRow}>
                <View style={S.inlineField}>
                  <View style={S.inlineLabel}>
                    <Ionicons name="body-outline" size={13} color="#3b82f6" />
                    <Text style={S.inlineLabelText}>Height ({units === 'metric' ? 'cm' : 'in'})</Text>
                  </View>
                  <TextInput
                    style={S.input}
                    value={editableData.height}
                    onChangeText={v => change('height', v.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.subtext}
                    keyboardType="numeric"
                  />
                </View>
                <View style={S.inlineField}>
                  <View style={S.inlineLabel}>
                    <Ionicons name="scale-outline" size={13} color="#a855f7" />
                    <Text style={S.inlineLabelText}>Weight ({units === 'metric' ? 'kg' : 'lb'})</Text>
                  </View>
                  <TextInput
                    style={S.input}
                    value={editableData.weight}
                    onChangeText={v => change('weight', v.replace(/[^0-9.]/g, ''))}
                    placeholder="0"
                    placeholderTextColor={colors.subtext}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Field label="Blood Group" icon="water" iconColor="#ef4444">
                <Dropdown
                  style={S.dropdown}
                  placeholderStyle={{ color: colors.subtext, fontSize: 16 }}
                  selectedTextStyle={{ color: colors.text, fontSize: 16 }}
                  containerStyle={{ backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14 }}
                  activeColor={colors.background}
                  itemTextStyle={{ color: colors.text }}
                  data={bloodGroupData}
                  labelField="label"
                  valueField="value"
                  placeholder="Select blood group"
                  value={editableData.bloodGroup}
                  onChange={i => change('bloodGroup', i.value)}
                />
              </Field>

              {/* Live BMI preview */}
              {editBMI && (
                <Animatable.View animation="fadeIn" style={[S.bmiPreview, { borderColor: editBMI.color }]}>
                  <View style={S.bmiTopRow}>
                    <Text style={S.bmiHeading}>BMI Preview</Text>
                    <Text style={[S.bmiBigNum, { color: editBMI.color }]}>{editBMI.bmi}</Text>
                  </View>
                  <BMIBar progress={bmiProgress(editBMI)} color={editBMI.color} colors={colors} S={S} />
                  <Text style={[S.bmiCat, { color: editBMI.color, textAlign: 'center', marginTop: 8 }]}>{editBMI.category}</Text>
                </Animatable.View>
              )}
            </Section>

            {/* Medical */}
            <Section title="MEDICAL INFORMATION" accent="#ef4444">
              <Field label="Conditions & Allergies" icon="medical" iconColor="#ef4444"
                hint="Include allergies, chronic conditions, current medications, emergency contacts">
                <TextInput
                  style={[S.input, S.textArea]}
                  value={editableData.conditions}
                  onChangeText={v => change('conditions', v)}
                  placeholder="Describe any medical conditions, allergies, or medications..."
                  placeholderTextColor={colors.subtext}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </Field>
            </Section>

            {/* Preferences */}
            <Section title="PREFERENCES">
              <View style={S.settingRow}>
                <View style={S.settingLeft}>
                  <View style={[S.settingIcon, { backgroundColor: `${colors.primary}18` }]}>
                    <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={18} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={S.settingTitle}>Dark Mode</Text>
                    <Text style={S.settingSubtitle}>Switch app appearance</Text>
                  </View>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#e5e7eb', true: colors.primary }}
                  thumbColor="#fff"
                  ios_backgroundColor="#e5e7eb"
                />
              </View>
            </Section>

            {/* Save button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity style={S.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.primary, colors.accent || colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={S.saveBtnInner}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={S.saveBtnText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Reanimated.View>
        )}

        {/* ── Account Actions ──────────────────────────────────────────── */}
        <View style={S.accountActions}>
          <TouchableOpacity style={S.signOutBtn} onPress={handleLogout} activeOpacity={0.75}>
            <Ionicons name="log-out-outline" size={20} color={colors.text} />
            <Text style={S.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.deleteAccBtn} onPress={() => setDeleteModal(true)} activeOpacity={0.75}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={S.footer}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.subtext} />
          <Text style={S.footerText}>Your data is encrypted and secure</Text>
        </View>

        <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Avatar Picker Modal ──────────────────────────────────────── */}
      <Modal visible={showAvatarModal} transparent animationType="slide" onRequestClose={() => setShowAvatarModal(false)}>
        <Pressable style={S.modalBackdrop} onPress={() => setShowAvatarModal(false)} />
        <Reanimated.View style={[S.sheet, { backgroundColor: colors.card }]}>
          <View style={S.sheetHandle} />
          <View style={S.sheetHeader}>
            <Text style={[S.sheetTitle, { color: colors.text }]}>Choose Avatar</Text>
            <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
              <Ionicons name="close" size={24} color={colors.subtext} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={S.avatarGrid} showsVerticalScrollIndicator={false}>
            {ALL_AVATAR_KEYS.map(key => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  change('avatarKey', key);
                  setShowAvatarModal(false);
                  Toast.show({ type: 'success', text1: 'Avatar updated' });
                }}
                style={S.avatarCell}
                activeOpacity={0.75}
              >
                <Image
                  source={getAvatarSource(key)}
                  style={[S.avatarThumb, editableData.avatarKey === key && [S.avatarThumbSelected, { borderColor: colors.primary }]]}
                />
                {editableData.avatarKey === key && (
                  <View style={[S.avatarCheck, { backgroundColor: colors.card }]}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Reanimated.View>
      </Modal>

      <Modal visible={deleteModal} transparent animationType="fade" onRequestClose={() => setDeleteModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={S.modalBackdropCentered}>
            <Reanimated.View style={[S.alertCard, { backgroundColor: colors.card }]}>
              <View style={S.alertIconWrap}>
                <Ionicons name="warning" size={44} color="#ef4444" />
              </View>
              <Text style={[S.alertTitle, { color: colors.text }]}>Delete Account?</Text>
              <Text style={[S.alertBody, { color: colors.subtext }]}>
                This is <Text style={{ color: '#ef4444', fontWeight: '700' }}>permanent</Text> and cannot be undone. All data will be deleted.
              </Text>
              <Text style={[S.alertInstruction, { color: colors.text }]}>
                Type <Text style={{ color: '#ef4444', fontWeight: '700' }}>DELETE</Text> to confirm
              </Text>
              <TextInput
                style={[S.alertInput, { borderColor: deleteText === 'DELETE' ? '#ef4444' : colors.border, color: colors.text, backgroundColor: colors.background }]}
                value={deleteText}
                onChangeText={v => setDeleteText(v.toUpperCase())}
                autoCapitalize="characters"
                placeholder="DELETE"
                placeholderTextColor={colors.subtext}
              />
              {!isGoogleUser && (
                <TextInput
                  style={[S.alertInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  value={deletePass}
                  onChangeText={setDeletePass}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.subtext}
                  secureTextEntry
                  autoCapitalize="none"
                />
              )}
              {isGoogleUser && (
                <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 20, textAlign: 'center' }}>
                  Signed in with Google — no password needed.
                </Text>
              )}
              <View style={S.alertButtons}>
                <TouchableOpacity
                  style={[S.alertBtn, { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border }]}
                  onPress={() => { setDeleteModal(false); setDeleteText(''); setDeletePass(''); }}
                >
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.alertBtn, { backgroundColor: '#ef4444', opacity: deleteText === 'DELETE' ? 1 : 0.45 }]}
                  onPress={handleDeleteAccount}
                  disabled={deleteText !== 'DELETE'}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Delete Forever</Text>
                </TouchableOpacity>
              </View>
            </Reanimated.View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, S }) {
  return (
    <View style={[S.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[S.statValue, { color }]}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

// ─── BMI Bar ───────────────────────────────────────────────────────────────
function BMIBar({ progress, color, S }) {
  return (
    <View style={S.bmiTrack}>
      <View style={[S.bmiFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const createStyles = (colors, theme) => {
  const isDark = theme === 'dark';
  const card = isDark ? '#2a2a2a' : '#ffffff';
  const bg   = isDark ? '#1f1f1f' : '#f2f2f7';   // iOS grouped bg
  const sep  = isDark ? '#3a3a3a' : '#e8e8ed';

  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: bg },
    scroll: { paddingBottom: 20 },

    // ── Hero ──────────────────────────────────────────────────────────
    hero: {
      alignItems: 'center',
      paddingTop: 36,
      paddingBottom: 28,
      paddingHorizontal: 24,
    },
    avatarWrap: {
      width: 104,
      height: 104,
      borderRadius: 52,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.5 : 0.15,
      shadowRadius: 14,
      elevation: 10,
    },
    avatar: {
      width: 104,
      height: 104,
      borderRadius: 52,
      borderWidth: 3,
      borderColor: card,
    },
    avatarBadge: {
      position: 'absolute', bottom: 2, right: 2,
      width: 28, height: 28, borderRadius: 14,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2.5, borderColor: card,
    },
    heroName: {
      fontSize: 26, fontWeight: '700',
      color: colors.text, textAlign: 'center',
      letterSpacing: -0.5,
    },
    heroEmail: {
      fontSize: 14, color: colors.subtext,
      marginTop: 4, textAlign: 'center',
    },
    heroPills: {
      flexDirection: 'row', flexWrap: 'wrap',
      justifyContent: 'center', gap: 8, marginTop: 12,
    },
    pill: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      backgroundColor: `${colors.primary}18`,
      paddingHorizontal: 12, paddingVertical: 5,
      borderRadius: 20,
    },
    pillText: { fontSize: 12, fontWeight: '600' },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: `${colors.primary}18`,
      paddingHorizontal: 18, paddingVertical: 10,
      borderRadius: 20, marginTop: 18,
    },
    editBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },

    // ── Stats ─────────────────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row', gap: 10,
      paddingHorizontal: 16, marginTop: 4, marginBottom: 8,
    },
    statCard: {
      flex: 1, backgroundColor: card,
      borderRadius: 14, padding: 14,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 8, elevation: 3,
    },
    statValue: { fontSize: 17, fontWeight: '700', marginTop: 6 },
    statLabel: { fontSize: 12, color: colors.subtext, marginTop: 2, fontWeight: '500' },

    // ── Sections ──────────────────────────────────────────────────────
    section: { marginTop: 28, paddingHorizontal: 16 },
    sectionTitle: {
      fontSize: 12, fontWeight: '700', letterSpacing: 0.5,
      color: colors.subtext, marginBottom: 8, marginLeft: 4,
    },
    sectionCard: {
      backgroundColor: card,
      borderRadius: 14,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 6, elevation: 2,
    },

    // ── List rows ─────────────────────────────────────────────────────
    listRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 13,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: sep,
    },
    listRowLast: { borderBottomWidth: 0 },
    listIcon: {
      width: 34, height: 34, borderRadius: 9,
      justifyContent: 'center', alignItems: 'center',
      marginRight: 14,
    },
    listRowBody: {
      flex: 1, flexDirection: 'row',
      justifyContent: 'space-between', alignItems: 'center',
    },
    listRowLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
    listRowValue: { fontSize: 15, color: colors.subtext, fontWeight: '400', maxWidth: '55%', textAlign: 'right' },

    // ── BMI ───────────────────────────────────────────────────────────
    bmiBlock: {
      padding: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: sep,
    },
    bmiPreview: {
      borderRadius: 12, borderWidth: 1.5,
      padding: 14, marginTop: 10,
      backgroundColor: isDark ? '#ffffff08' : '#f9f9fb',
    },
    bmiTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    bmiHeading: { fontSize: 14, fontWeight: '600', color: colors.text },
    bmiCat:    { fontSize: 13, fontWeight: '600', marginTop: 2 },
    bmiBigNum: { fontSize: 34, fontWeight: '800' },
    bmiTrack:  { height: 8, backgroundColor: sep, borderRadius: 4, overflow: 'hidden' },
    bmiFill:   { height: '100%', borderRadius: 4 },
    bmiLegendRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
    bmiLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    bmiDot:    { width: 8, height: 8, borderRadius: 4 },
    bmiLegendLabel: { fontSize: 11, color: colors.subtext, fontWeight: '600' },

    // ── Medical ───────────────────────────────────────────────────────
    medicalBlock: { padding: 16 },
    medicalBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: '#ef444412', borderRadius: 10,
      padding: 10, marginBottom: 10,
    },
    medicalBannerText: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
    medicalBody: { fontSize: 15, color: colors.text, lineHeight: 22 },
    emptyMedical: { alignItems: 'center', paddingVertical: 28 },
    emptyMedicalTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 10 },
    emptyMedicalSub: { fontSize: 13, color: colors.subtext, marginTop: 4, textAlign: 'center' },

    // ── Preferences row ───────────────────────────────────────────────
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingIcon: { width: 36, height: 36, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    settingTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
    settingSubtitle: { fontSize: 12, color: colors.subtext, marginTop: 1 },

    // ── Unit toggle ───────────────────────────────────────────────────
    unitToggle: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      alignSelf: 'flex-end',
      backgroundColor: `${colors.primary}18`,
      paddingHorizontal: 12, paddingVertical: 6,
      borderRadius: 20, marginBottom: 14,
    },
    unitToggleText: { fontSize: 13, fontWeight: '600' },
    unitChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: `${colors.primary}12` },
    unitChipText: { fontSize: 13, fontWeight: '600' },

    // ── Edit fields ───────────────────────────────────────────────────
    fieldGroup: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.subtext },
    fieldHint: { fontSize: 12, color: colors.subtext, marginTop: 6, marginBottom: 12, fontStyle: 'italic' },
    // inlineRow: side-by-side field pair — no nested Field padding
    inlineRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
    inlineField: { flex: 1 },
    inlineLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    inlineLabelText: { fontSize: 13, fontWeight: '600', color: colors.subtext },
    input: {
      backgroundColor: isDark ? '#ffffff0A' : '#f9f9fb',
      borderColor: sep,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      color: colors.text,
      marginBottom: 12,
    },
    textArea: { height: 120, paddingTop: 12, textAlignVertical: 'top' },
    dropdown: {
      backgroundColor: isDark ? '#ffffff0A' : '#f9f9fb',
      borderColor: sep,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 14,
      height: 52,
      marginBottom: 12,
    },

    // ── Save button ───────────────────────────────────────────────────
    saveBtn: {
      marginHorizontal: 16, marginTop: 8,
      borderRadius: 14, overflow: 'hidden',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    },
    saveBtnInner: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 10,
      paddingVertical: 17,
    },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

    // ── Account actions ───────────────────────────────────────────────
    accountActions: {
      flexDirection: 'row', gap: 10,
      marginHorizontal: 16, marginTop: 28,
    },
    signOutBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      justifyContent: 'center', gap: 8,
      backgroundColor: card,
      paddingVertical: 16, borderRadius: 14,
      borderWidth: 1.5, borderColor: sep,
    },
    signOutText: { fontSize: 15, fontWeight: '600', color: colors.text },
    deleteAccBtn: {
      backgroundColor: '#ef444415',
      paddingHorizontal: 20, paddingVertical: 16,
      borderRadius: 14, borderWidth: 1.5, borderColor: '#ef4444',
      justifyContent: 'center', alignItems: 'center',
    },

    // ── Footer ────────────────────────────────────────────────────────
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
    footerText: { fontSize: 12, color: colors.subtext },

    // ── Avatar sheet ──────────────────────────────────────────────────
    modalBackdrop: {
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalBackdropCentered: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: 36, maxHeight: '72%',
    },
    sheetHandle: {
      width: 40, height: 4, borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center', marginTop: 12, marginBottom: 4,
    },
    sheetHeader: {
      flexDirection: 'row', justifyContent: 'space-between',
      alignItems: 'center', paddingHorizontal: 24,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: sep,
    },
    sheetTitle: { fontSize: 18, fontWeight: '700' },
    avatarGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      justifyContent: 'center', padding: 20, gap: 16,
    },
    avatarCell: { position: 'relative' },
    avatarThumb: { width: 80, height: 80, borderRadius: 40, borderWidth: 2.5, borderColor: 'transparent' },
    avatarThumbSelected: { borderWidth: 3 },
    avatarCheck: { position: 'absolute', bottom: -3, right: -3, borderRadius: 11 },

    // ── Delete alert ──────────────────────────────────────────────────
    alertCard: {
      marginHorizontal: 24, borderRadius: 22, padding: 28,
      alignItems: 'center',
      shadowColor: '#000', shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35, shadowRadius: 24, elevation: 16,
    },
    alertIconWrap: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: '#ef444410', justifyContent: 'center',
      alignItems: 'center', marginBottom: 20,
      borderWidth: 2, borderColor: '#ef4444',
    },
    alertTitle: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
    alertBody: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
    alertInstruction: { fontSize: 14, fontWeight: '600', marginBottom: 14, textAlign: 'center' },
    alertInput: {
      width: '100%', height: 50,
      borderWidth: 1.5, borderRadius: 12,
      paddingHorizontal: 16, fontSize: 16,
      fontWeight: '600', textAlign: 'center', marginBottom: 12,
    },
    alertButtons: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
    alertBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  });
};
