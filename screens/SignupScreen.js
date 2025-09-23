import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext'; // Import theme hook

export default function SignupScreen({ navigation }) {
  const { colors } = useTheme(); // Access theme colors
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [smoking, setSmoking] = useState('no');
  const [drinking, setDrinking] = useState('no');
  const [smokingFreq, setSmokingFreq] = useState('');
  const [drinkingFreq, setDrinkingFreq] = useState('');

  const handleSignUp = () => {
    if (email === '' || password === '') {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        // Persist basic profile fields including smoking/drinking to Firestore
        const userRef = doc(db, 'users', user.uid);
        setDoc(userRef, {
          email: user.email,
          smoking: smoking,
          smokingFreq: smokingFreq || null,
          drinking: drinking,
          drinkingFreq: drinkingFreq || null,
          createdAt: new Date()
        }).then(() => {
          console.log('User profile created in Firestore');
          navigation.navigate('Dashboard');
        }).catch(err => {
          console.warn('Failed to write user profile', err);
          navigation.navigate('Dashboard');
        });
      })
      .catch((error) => {
        const errorMessage = error.message;
        Alert.alert('Signup Error', errorMessage);
      });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      color: colors.text,
    },
    input: {
      width: '100%',
      height: 40,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 5,
      marginBottom: 12,
      paddingLeft: 8,
      color: colors.text,
      backgroundColor: colors.card,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        placeholderTextColor={colors.subtext}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        placeholderTextColor={colors.subtext}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <View style={{ width: '100%', marginTop: 8 }}>
        <Text style={{ color: colors.text, marginBottom: 6 }}>Do you smoke?</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Button title="No" onPress={() => setSmoking('no')} color={smoking === 'no' ? colors.primary : undefined} />
          <Button title="Occasionally" onPress={() => setSmoking('occasionally')} color={smoking === 'occasionally' ? colors.primary : undefined} />
          <Button title="Daily" onPress={() => setSmoking('daily')} color={smoking === 'daily' ? colors.primary : undefined} />
        </View>
        {smoking !== 'no' && (
          <TextInput
            style={styles.input}
            placeholder="How many per day / week? (optional)"
            placeholderTextColor={colors.subtext}
            value={smokingFreq}
            onChangeText={setSmokingFreq}
          />
        )}

        <Text style={{ color: colors.text, marginBottom: 6, marginTop: 8 }}>Do you drink alcohol?</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Button title="No" onPress={() => setDrinking('no')} color={drinking === 'no' ? colors.primary : undefined} />
          <Button title="Occasionally" onPress={() => setDrinking('occasionally')} color={drinking === 'occasionally' ? colors.primary : undefined} />
          <Button title="Daily" onPress={() => setDrinking('daily')} color={drinking === 'daily' ? colors.primary : undefined} />
        </View>
        {drinking !== 'no' && (
          <TextInput
            style={styles.input}
            placeholder="How many units per week? (optional)"
            placeholderTextColor={colors.subtext}
            value={drinkingFreq}
            onChangeText={setDrinkingFreq}
          />
        )}
      </View>
      <Button title="Sign Up" onPress={handleSignUp} />
      <Button title="Back to Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}
