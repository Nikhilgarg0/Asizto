// components/customHeader.js
import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

// PLAT-5: removed platform-hacked width magic numbers — logo now uses maxWidth + resizeMode

export default function Header({ title, isModal = false }) {
  const { colors, theme, fontSize } = useTheme();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  const logo = theme === 'dark'
    ? require('../assets/Brandkit/headerlogo_dark.png')
    : require('../assets/Brandkit/headerlogo_light.png');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.card }]} edges={['top']}>
      <View style={[styles.container, { borderBottomColor: colors.border }]}>

        {/* Left: back button or empty placeholder */}
        <View style={styles.side}>
          {canGoBack && !isModal ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconButton}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back-outline" size={26} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconPlaceholder} />
          )}
        </View>

        {/* Center: logo or title */}
        <View style={styles.center}>
          {title ? (
            <Text style={{ fontSize: fontSize.lg, fontWeight: '500', color: colors.text }}>
              {title}
            </Text>
          ) : (
            <Image
              source={logo}
              style={styles.logo}
              resizeMode="contain"
              accessible
              accessibilityLabel="Asizto"
            />
          )}
        </View>

        {/* Right: close button for modals, notification bell otherwise */}
        <View style={[styles.side, { justifyContent: 'flex-end' }]}>
          {isModal ? (
            // NAV-2: modal screens get an ✕ close button on the right
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.iconButton}
              accessibilityLabel="Close"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.iconButton}
              accessibilityLabel="Notifications"
              accessibilityRole="button"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
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
  // PLAT-5: maxWidth + resizeMode="contain" replaces platform-specific magic numbers
  logo: {
    maxWidth: 150,
    width: '100%',
    height: 36,
  },
});
