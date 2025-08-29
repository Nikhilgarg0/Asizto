import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { auth } from '../firebaseConfig';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useTheme } from '../context/ThemeContext'; // Import theme hook

export default function SignupScreen({ navigation }) {
  const { colors } = useTheme(); // Access theme colors
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = () => {
    if (email === '' || password === '') {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('User account created!', user.email);
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
      backgroundColor: colors.input,
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
      <Button title="Sign Up" onPress={handleSignUp} />
      <Button title="Back to Login" onPress={() => navigation.navigate('Login')} />
    </View>
  );
}
