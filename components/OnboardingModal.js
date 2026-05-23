/**
 * components/OnboardingModal.js
 *
 * UX-3: First-run onboarding modal shown once to new users.
 * Stores `hasSeenOnboarding` flag in AsyncStorage so it only shows once.
 *
 * Usage (in DashboardScreen):
 *   import OnboardingModal from '../components/OnboardingModal';
 *   <OnboardingModal />
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const STEPS = [
  {
    icon: 'medical',
    title: 'Add Your Medicines',
    subtitle: 'Track every medicine you take — name, dose, and schedule — all in one place.',
    cta: 'Got it',
  },
  {
    icon: 'alarm',
    title: 'Set Smart Reminders',
    subtitle: 'Never miss a dose. Asizto sends timely notifications based on your schedule.',
    cta: 'Next',
  },
  {
    icon: 'fitness',
    title: 'Track Your Health Score',
    subtitle: 'Your personalised health score improves as you log medicines, appointments, and profile details.',
    cta: 'Add Medicine',
  },
];

const STORAGE_KEY = '@asizto_onboarding_seen';

export default function OnboardingModal() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Show modal only if not seen before
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (!val) setVisible(true);
    });
  }, []);

  // Animate each step transition
  useEffect(() => {
    if (!visible) return;
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [step, visible]);

  const dismiss = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
      navigation.navigate('AddMedicine');
    }
  };

  const current = STEPS[step];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.card },
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Skip button */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={dismiss}
            accessibilityLabel="Skip onboarding"
            accessibilityRole="button"
          >
            <Text style={[styles.skipText, { color: colors.subtext }]}>Skip</Text>
          </TouchableOpacity>

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}18` }]}>
            <Ionicons name={current.icon} size={52} color={colors.primary} />
          </View>

          {/* Text */}
          <Text style={[styles.title, { color: colors.text }]}>{current.title}</Text>
          <Text style={[styles.subtitle, { color: colors.subtext }]}>{current.subtitle}</Text>

          {/* Step dots */}
          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === step ? colors.primary : `${colors.primary}30` },
                  i === step && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={handleNext}
            accessibilityRole="button"
            accessibilityLabel={current.cta}
          >
            <Text style={styles.ctaText}>{current.cta}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: width - 48,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  skipBtn: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    width: 8,
  },
  dotActive: {
    width: 22,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 99,
    width: '100%',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
