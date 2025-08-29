import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { auth, db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useTheme } from '../context/ThemeContext';
import Toast from 'react-native-toast-message';

export default function EmergencyContactScreen({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");

  const saveContact = async () => {
    if (!name || !phone || !relationship) {
      Toast.show({ type: 'error', text1: 'Missing Information', text2: 'Please fill in all fields.' });
      return;
    }
    try {
      const uid = auth.currentUser?.uid;
      // Save to the top-level 'emergencyContacts' collection
      await addDoc(collection(db, "emergencyContacts"), {
        userId: uid,
        name,
        phone,
        relationship,
        createdAt: Timestamp.now(),
      });
      Toast.show({ type: 'success', text1: 'Contact Saved' });
      navigation.goBack();
    } catch (err) {
      console.error("Error saving contact:", err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save contact.' });
    }
  };
  
  const styles = createStyles(colors);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Contact Name</Text>
      <TextInput
        placeholder="e.g., Jane Doe"
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholderTextColor={colors.subtext}
      />
      
      <Text style={styles.label}>Contact Phone Number</Text>
      <TextInput
        placeholder="e.g., 9876543210"
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholderTextColor={colors.subtext}
      />

      <Text style={styles.label}>Relationship</Text>
      <TextInput
        placeholder="e.g., Mother, Doctor, Friend"
        style={styles.input}
        value={relationship}
        onChangeText={setRelationship}
        placeholderTextColor={colors.subtext}
      />

      <TouchableOpacity style={styles.button} onPress={saveContact}>
        <Text style={styles.buttonText}>Save Contact</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const createStyles = (colors) => StyleSheet.create({
    container: { 
      flexGrow: 1,
      padding: 20, 
      backgroundColor: colors.background 
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
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: { 
      color: "white", 
      fontWeight: "bold", 
      fontSize: 16 
    },
});