import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext'; // Import the hook
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword } from "firebase/auth";

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme(); // Get colors from theme
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (email === '' || password === '') {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        console.log('User logged in!', user.email);
        // Navigation handled by auth listener in App.js
      })
      .catch((error) => {
        const errorMessage = error.message;
        Alert.alert('Login Error', errorMessage);
      });
  };

  const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      padding: 20, 
      backgroundColor: colors.background 
    },
    title: { 
      fontSize: 32, 
      fontWeight: 'bold', 
      marginBottom: 10, 
      color: colors.text 
    },
    subtitle: { 
      fontSize: 16, 
      color: colors.subtext, 
      marginBottom: 40 
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
      backgroundColor: colors.input 
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Asizto</Text>
      <Text style={styles.subtitle}>Your Smart Health Companion</Text>
      
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

      <Button title="Login" color={colors.primary} onPress={handleLogin} />
      <Button
        title="Don't have an account? Sign Up"
        color={colors.accent}
        onPress={() => navigation.navigate('Signup')}
      />
    </View>
  );
}
