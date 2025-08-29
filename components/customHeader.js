import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function Header() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={{ backgroundColor: colors.card }} edges={['top']}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        {/* Left Side: Back Arrow or Empty Space */}
        <View style={styles.sideContainer}>
          {canGoBack && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
              <Ionicons name="arrow-back-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center: Branding */}
        <View style={styles.centerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Asizto</Text>
        </View>

        {/* Right Side: Notifications Icon */}
        <View style={[styles.sideContainer, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconButton}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 60,
    borderBottomWidth: 1,
  },
  sideContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 2,
    alignItems: 'center',
  },
  iconButton: {
    padding: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});