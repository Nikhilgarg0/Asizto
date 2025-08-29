import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity,
  Modal, Button, Image, TextInput, Platform
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
  // Backward compatibility: fall back to a URL string if present
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

export default function ProfileScreen() {
  const { theme, toggleTheme, colors } = useTheme();

  const [profileData, setProfileData] = useState({});
  const [editableData, setEditableData] = useState({});

  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;
    const docRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = {
          ...docSnap.data(),
          dob: docSnap.data().dob ? docSnap.data().dob.toDate() : new Date()
        };
        setProfileData(data);
        setEditableData(data);
      }
    });
    return unsubscribe;
  }, []);

  const handleInputChange = (field, value) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      const dataToSave = {
        ...editableData,
        dob: Timestamp.fromDate(editableData.dob)
      };
      await setDoc(doc(db, "users", auth.currentUser.uid), dataToSave, { merge: true });
      Toast.show({ type: 'success', text1: 'Profile Updated' });
      setIsEditing(false);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileHeader}>
          <Image source={getImageSourceFromProfile(profileData)} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileData.firstName} {profileData.lastName}</Text>
            <Text style={styles.profileEmail}>{profileData.email}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(!isEditing)}>
            <Ionicons name={isEditing ? "close-circle" : "create-outline"} size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <Animatable.View animation="fadeIn">
            {/* Avatar chooser */}
            <View style={styles.card}>
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

            {/* Personal Details */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit Personal Details</Text>
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
                  {editableData.dob ? editableData.dob.toLocaleDateString() : 'Select Date of Birth'}
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

            {/* Health Metrics */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Edit Health Metrics</Text>
              <TextInput
                style={styles.input}
                placeholder="Height (cm)"
                value={editableData.height}
                onChangeText={(val) => handleInputChange('height', val)}
                keyboardType="numeric"
                placeholderTextColor={colors.subtext}
              />
              <TextInput
                style={styles.input}
                placeholder="Weight (kg)"
                value={editableData.weight}
                onChangeText={(val) => handleInputChange('weight', val)}
                keyboardType="numeric"
                placeholderTextColor={colors.subtext}
              />
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
              <TextInput
                style={styles.input}
                placeholder="Medical Conditions"
                value={editableData.conditions}
                onChangeText={(val) => handleInputChange('conditions', val)}
                placeholderTextColor={colors.subtext}
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </Animatable.View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Personal Details</Text>
              <InfoRow label="Full Name" value={`${profileData.firstName || ''} ${profileData.lastName || ''}`} />
              <InfoRow label="Date of Birth" value={profileData.dob ? profileData.dob.toLocaleDateString() : 'N/A'} />
              <InfoRow label="Phone" value={profileData.phone || 'N/A'} />
              <InfoRow label="Gender" value={profileData.gender || 'N/A'} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Health Metrics</Text>
              <InfoRow label="Height" value={profileData.height ? `${profileData.height} cm` : 'N/A'} />
              <InfoRow label="Weight" value={profileData.weight ? `${profileData.weight} kg` : 'N/A'} />
              <InfoRow label="Blood Group" value={profileData.bloodGroup || 'N/A'} />
              <Text style={[styles.infoValue, { marginTop: 10 }]}>
                {profileData.conditions || 'No medical conditions specified.'}
              </Text>
            </View>
          </>
        )}

        <View style={[styles.card, {marginTop: 20}]}>
          <View style={styles.settingRow}>
            <Text style={styles.settingText}>Dark Mode</Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={theme === 'dark' ? colors.accent : '#f4f3f4'}
            />
          </View>
        </View>

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
              <Text style={[styles.modalTitle, {color: colors.text}]}>Confirm Account Deletion</Text>
              <Text style={[styles.modalText, {color: colors.subtext}]}>This action is permanent. To confirm, type DELETE below.</Text>
              <TextInput
                style={[styles.modalInput, {borderColor: colors.border, color: colors.text}]}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                autoCapitalize="characters"
                placeholder="DELETE"
                placeholderTextColor={colors.subtext}
              />
              <View style={styles.modalButtonRow}>
                <Button title="Cancel" onPress={() => setIsDeleteModalVisible(false)} color={colors.subtext}/>
                <Button title="Delete" color="#D80032" disabled={deleteConfirmText !== 'DELETE'} onPress={handleDeleteAccount} />
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
  container: { padding: 20, paddingBottom: 50 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, backgroundColor: colors.card, padding: 15, borderRadius: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.primary },
  avatarSmall: { width: 70, height: 70, borderRadius: 35, margin: 6 },
  avatarSelected: { borderWidth: 3, borderColor: colors.primary },
  profileInfo: { flex: 1, marginLeft: 15 },
  profileName: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  profileEmail: { fontSize: 14, color: colors.subtext },
  editButton: { padding: 5 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 15 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel: { fontSize: 16, color: colors.subtext },
  infoValue: { fontSize: 16, color: colors.text, fontWeight: '500' },
  input: { width: '100%', height: 50, backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 15, paddingLeft: 15, color: colors.text, fontSize: 16, justifyContent: 'center' },
  dropdown: { width: '100%', height: 50, backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1, borderRadius: 12, marginBottom: 15, paddingHorizontal: 15 },
  saveButton: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginVertical: 20 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  settingText: { fontSize: 16, color: colors.text },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.card, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flex: 1 },
  deleteButton: { backgroundColor: colors.card, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  bottomButtonText: { fontSize: 16, fontWeight: '600' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  modalText: { marginBottom: 15, textAlign: 'center' },
  modalInput: { width: '100%', height: 40, borderWidth: 1, borderRadius: 5, marginBottom: 20, paddingHorizontal: 10 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
});
