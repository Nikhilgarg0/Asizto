// components/customHeader.js
import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

export default function Header() {
  const { colors, theme } = useTheme(); // theme expected to be 'dark' or 'light'
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  // Choose logo based on theme
  const logo = theme === 'dark'
    ? require('../assets/Brandkit/headerlogo_dark.png')
    : require('../assets/Brandkit/headerlogo_light.png');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.card }]} edges={['top']}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>
        {/* Left: back button (fixed width so center stays centered) */}
        <View style={styles.side}>
          {canGoBack ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconButton}
              accessibilityLabel="Go back"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>

        {/* Center: logo */}
        <View style={styles.center}>
          <Image
            source={logo}
            style={styles.logo}
            resizeMode="contain"
            accessible
            accessibilityLabel="Asizto"
          />
        </View>

        {/* Right: notifications (fixed width) */}
        <View style={[styles.side, { justifyContent: 'flex-end' }]}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.iconButton}
            accessibilityLabel="Notifications"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {},
  container: {
    height: 60,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    padding: 6,
  },
  iconPlaceholder: {
    width: 26,
    height: 26,
  },
  logo: {
    width: Platform.OS === 'ios' ? 150 : 140,
    height: 1000,
    top: 230,
  },
});
