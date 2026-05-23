import { spacing, radius } from '../theme/tokens';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  RefreshControl,
  Animated,
  Easing,
  Modal,
  Pressable,
} from 'react-native';
import IconBadge from '../components/IconBadge';
import { db } from '../firebaseConfig';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { callGemini } from '../utils/gemini';
import * as Notifications from 'expo-notifications';
import { GEMINI_API_KEY } from '@env';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import logger from '../utils/Logger';
import performanceMonitor from '../utils/PerformanceMonitor';
import OnboardingModal from '../components/OnboardingModal'; // UX-3
import DashboardSkeleton from '../components/DashboardSkeleton'; // POLISH-2
import HealthScoreCard from '../components/dashboard/HealthScoreCard';
import NextDoseWidget from '../components/dashboard/NextDoseWidget';
import HealthFactCard from '../components/dashboard/HealthFactCard';
import AISearchPanel from '../components/dashboard/AISearchPanel';

import { healthFacts } from '../utils/healthFacts';

export default function DashboardScreen({ navigation }) {
  const { colors, spacing, fontSize, iconSize } = useTheme();
  const {
    medicines,
    appointments,
    userProfile,
    loading: dataLoading,
    error: dataError,
    refetch,
  } = useData();

  const userName = userProfile.firstName || userProfile.name || 'User';

  const [healthScore, setHealthScore] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [randomFact, setRandomFact] = useState('');
  const [aiFactLoading, setAIFactLoading] = useState(false);
  const [aiFactSource, setAIFactSource] = useState('preset');
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const screenTimer = useMemo(() => performanceMonitor.startScreenLoad('Dashboard'), []);

  // Entrance animations
  useEffect(() => {
    if (!dataLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [dataLoading]);

  const calculateHealthScore = useCallback((userMedicines = [], profile = {}, appts = []) => {
    try {
      const weights = {
        adherence: 22,
        profileCompleteness: 10,
        appointments: 10,
        bmi: 20,
        ageFactor: 8,
        smoking: 10,
        drinking: 8,
        conditions: 12
      };

      const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);
      let weightedSum = 0;

      const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v)));

      let adherencePct = 100;
      if (userMedicines && userMedicines.length > 0) {
        const totalDoses = userMedicines.reduce((sum, med) => sum + (Number(med.quantity) || 0), 0);
        const takenDoses = userMedicines.reduce((sum, med) => sum + (med.takenTimestamps?.length || 0), 0);
        adherencePct = totalDoses > 0 ? clampPct((takenDoses / totalDoses) * 100) : 100;
      }
      weightedSum += adherencePct * weights.adherence;

      const profileFields = ['age', 'weight', 'height', 'conditions', 'gender', 'bloodGroup'];
      const completed = profileFields.filter(f => profile[f] !== undefined && profile[f] !== null && profile[f] !== '').length;
      const profilePct = clampPct((completed / profileFields.length) * 100);
      weightedSum += profilePct * weights.profileCompleteness;

      let apptPct = 100;
      if (appts && appts.length > 0) {
        const recentAttended = appts.filter(apt => apt.attended && apt.attendedAt).length;
        apptPct = clampPct((recentAttended / appts.length) * 100);
      }
      weightedSum += apptPct * weights.appointments;

      let bmiPct = 75;
      const weightVal = profile.weight ? parseFloat(profile.weight) : null;
      const heightVal = profile.height ? parseFloat(profile.height) : null;

      let age = null;
      if (profile.age) age = Number(profile.age);
      else if (profile.dob) {
        try {
          const dob = profile.dob.toDate ? profile.dob.toDate() : new Date(profile.dob);
          age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        } catch (e) { age = null; }
      }

      if (weightVal && heightVal) {
        const bmi = weightVal / Math.pow(heightVal / 100, 2);
        if (age === null || age >= 18) {
          if (bmi >= 18.5 && bmi <= 24.9) bmiPct = 100;
          else if (bmi >= 25 && bmi <= 29.9) bmiPct = 75;
          else if (bmi >= 17.5 && bmi < 18.5) bmiPct = 70;
          else if (bmi >= 30 && bmi <= 34.9) bmiPct = 50;
          else bmiPct = 40;
        } else {
          bmiPct = 75;
        }
      }
      weightedSum += bmiPct * weights.bmi;

      let agePct = 100;
      if (age !== null) {
        if (age >= 80) agePct = 75;
        else if (age >= 65) agePct = 85;
        else if (age <= 16) agePct = 90;
        else agePct = 100;
      }
      weightedSum += agePct * weights.ageFactor;

      const freqToPct = (val) => {
        if (!val || val === 'No' || val === 'no' || val === 'None') return 100;
        if (typeof val === 'number') return clampPct(100 - val);
        const v = String(val).toLowerCase();
        if (v.includes('daily')) return 30;
        if (v.includes('occasion') || v.includes('occasional') || v.includes('sometimes')) return 70;
        if (v === 'occasionally') return 70;
        if (v === 'yes') return 60;
        return 80;
      };

      const smokingPct = clampPct(freqToPct(profile.smokingFreq || profile.smoking));
      const drinkingPct = clampPct(freqToPct(profile.drinkingFreq || profile.drinking));
      weightedSum += smokingPct * weights.smoking;
      weightedSum += drinkingPct * weights.drinking;

      let conditionsPct = 100;
      if (profile.conditions) {
        const condArr = Array.isArray(profile.conditions)
          ? profile.conditions
          : typeof profile.conditions === 'string'
            ? profile.conditions.split(',').map(c => c.trim()).filter(Boolean)
            : [];
        const condCount = condArr.length;
        if (condCount === 0) conditionsPct = 100;
        else if (condCount <= 2) conditionsPct = 85;
        else if (condCount <= 4) conditionsPct = 70;
        else conditionsPct = 50;
      }
      weightedSum += conditionsPct * weights.conditions;

      const finalScore = Math.round(weightedSum / totalWeight);
      const clamped = Math.max(0, Math.min(100, finalScore));
      setHealthScore(clamped);

      logger.info('Health score calculated', {
        score: clamped,
        components: {
          adherencePct, profilePct, apptPct, bmiPct, agePct, smokingPct, drinkingPct, conditionsPct
        },
        weights
      });
    } catch (err) {
      logger.error('Error calculating health score', err);
      setHealthScore(75);
    }
  }, []);

  const bmiData = useMemo(() => {
    try {
      const weight = userProfile.weight ? parseFloat(userProfile.weight) : null;
      const height = userProfile.height ? parseFloat(userProfile.height) : null;
      let age = null;
      if (userProfile.age) age = Number(userProfile.age);
      else if (userProfile.dob) {
        try {
          const dob = userProfile.dob.toDate ? userProfile.dob.toDate() : new Date(userProfile.dob);
          age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        } catch (e) { age = null; }
      }

      if (!weight || !height) return { value: null, category: 'N/A', status: 'incomplete', age };
      if (height === 0 || weight === 0) return { value: null, category: 'N/A', status: 'invalid', age };

      const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);
      let category = 'Unknown';
      let status = 'normal';

      if (age !== null && age < 18) {
        category = 'Use pediatric chart';
        status = 'warning';
      } else {
        if (bmi < 16) { category = 'Severe Thinness'; status = 'critical'; }
        else if (bmi >= 16 && bmi < 18.5) { category = 'Underweight'; status = 'warning'; }
        else if (bmi >= 18.5 && bmi <= 24.9) { category = 'Normal weight'; status = 'healthy'; }
        else if (bmi >= 25 && bmi <= 29.9) { category = 'Overweight'; status = 'warning'; }
        else if (bmi >= 30 && bmi <= 34.9) { category = 'Obesity I'; status = 'critical'; }
        else if (bmi >= 35 && bmi <= 39.9) { category = 'Obesity II'; status = 'critical'; }
        else { category = 'Obesity III'; status = 'critical'; }
      }

      return { value: bmi, category, status, age };
    } catch (err) {
      logger.error('BMI calculation error', err);
      return { value: null, category: 'Error', status: 'error', age: null };
    }
  }, [userProfile.weight, userProfile.height, userProfile.age, userProfile.dob]);

  const nextDoseStatus = useMemo(() => {
    if (!medicines || medicines.length === 0) return null;

    try {
      const now = new Date();
      let nextDose = null;
      let earliestDue = null;

      for (const med of medicines) {
        if (!med.times || med.times.length === 0) continue;

        const scheduleTimes = med.times.map(ts => {
          try {
            if (ts instanceof Date) return new Date(ts);
            if (ts && typeof ts.toDate === 'function') return ts.toDate();
            return new Date(ts);
          } catch (error) {
            logger.warn('Invalid time format in medicine', { medicineId: med.id, time: ts });
            return null;
          }
        }).filter(time => time && !isNaN(time.getTime()));

        if (scheduleTimes.length === 0) continue;

        const takenTimes = (med.takenTimestamps || []).map(ts => {
          try {
            if (ts instanceof Date) return new Date(ts);
            if (ts && typeof ts.toDate === 'function') return ts.toDate();
            return new Date(ts);
          } catch (error) {
            logger.warn('Invalid timestamp format', { medicineId: med.id, timestamp: ts });
            return null;
          }
        }).filter(time => time && !isNaN(time.getTime()));

        scheduleTimes.sort((a, b) => a.getHours() * 60 + a.getMinutes() - (b.getHours() * 60 + b.getMinutes()));

        for (const time of scheduleTimes) {
          const doseTimeToday = new Date(now);
          doseTimeToday.setHours(time.getHours(), time.getMinutes(), 0, 0);

          const oneHourBefore = new Date(doseTimeToday.getTime() - 60 * 60 * 1000);
          const oneHourAfter = new Date(doseTimeToday.getTime() + 60 * 60 * 1000);

          const alreadyTaken = takenTimes.some(takenTime =>
            takenTime >= oneHourBefore && takenTime <= oneHourAfter
          );

          if (now >= oneHourBefore && now <= oneHourAfter && !alreadyTaken) {
            if (!earliestDue || doseTimeToday < earliestDue.doseTime) {
              earliestDue = { medicine: med, isDue: true, doseTime: doseTimeToday };
            }
          }

          if (doseTimeToday > now) {
            if (!nextDose || doseTimeToday < nextDose.doseTime) {
              nextDose = { medicine: med, isDue: false, doseTime: doseTimeToday };
            }
            break;
          }
        }
      }

      return earliestDue || nextDose;
    } catch (error) {
      logger.error('Error calculating next dose status', error);
      return null;
    }
  }, [medicines]);

  const handleMarkAsTaken = useCallback(async (medicineId) => {
    try {
      const medicineRef = doc(db, "medicines", medicineId);
      await updateDoc(medicineRef, {
        takenTimestamps: arrayUnion(new Date())
      });

      logger.info('Medicine marked as taken', { medicineId });
      Alert.alert('Success', 'Medicine marked as taken!');
    } catch (error) {
      logger.error('Error marking medicine as taken', error);
      Alert.alert('Error', 'Failed to mark medicine as taken. Please try again.');
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetch();
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      logger.error('Refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Sync loading state with DataContext
  useEffect(() => {
    if (!dataLoading) {
      calculateHealthScore(medicines, userProfile, appointments);
    }
  }, [dataLoading, medicines, userProfile, appointments, calculateHealthScore]);

  // Propagate context-level errors to local error state
  useEffect(() => {
    if (dataError) setError(dataError);
  }, [dataError]);

  // cancellation-safe AI fact fetch — guards setState with mounted ref
  useEffect(() => {
    let mounted = true;
    const categories = Object.keys(healthFacts);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const fallback = healthFacts[randomCategory][Math.floor(Math.random() * healthFacts[randomCategory].length)];

    (async () => {
      const ai = await fetchAIFact(randomCategory, 'fact').catch(() => null);
      if (!mounted) return;
      if (ai) {
        setRandomFact(ai);
        setAIFactSource('ai');
      } else {
        setRandomFact(fallback);
        setAIFactSource('preset');
      }
    })();

    return () => { mounted = false; };
  }, []);

  const fetchAIFact = async (category = 'wellness', kind = 'fact') => {
    if (!GEMINI_API_KEY) return null;
    setAIFactLoading(true);
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');
      const prompt = kind === 'quote'
        ? `Provide a short, uplifting one-sentence quote about ${category} and wellbeing suitable for an app banner.`
        : `Give one concise, evidence-backed health tip about ${category}. Keep it under 30 words and friendly.`;

      const text = await callGemini(prompt);
      if (apiTimer) performanceMonitor.endApiCall(apiTimer, 200, true);
      return text || null;
    } catch (err) {
      logger.error('AI fact generation error', err);
      return null;
    } finally {
      setAIFactLoading(false);
    }
  };

  const fetchAIPersonalTip = async () => {
    if (!GEMINI_API_KEY) return null;
    setAIFactLoading(true);
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');

      const age = userProfile.age || (userProfile.dob ? (() => {
        try {
          const d = userProfile.dob.toDate ? userProfile.dob.toDate() : new Date(userProfile.dob);
          return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        } catch (e) { return 'unknown'; }
      })() : 'unknown');
      const conditions = userProfile.conditions
        ? Array.isArray(userProfile.conditions)
          ? userProfile.conditions.join(', ')
          : userProfile.conditions
        : 'none';
      const smoking = userProfile.smoking || userProfile.smokingFreq || 'No';
      const drinking = userProfile.drinking || userProfile.drinkingFreq || 'No';
      const bmiVal = bmiData.value || 'N/A';

      let adherenceSummary = 'No medicines';
      if (medicines && medicines.length > 0) {
        const totalQty = medicines.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
        const taken = medicines.reduce((s, m) => s + (m.takenTimestamps?.length || 0), 0);
        adherenceSummary = `${taken}/${totalQty} doses taken`;
      }

      const prompt = `You are a friendly, evidence-based health assistant. Provide one concise (max 30 words) personalized health tip for a user with the following profile: Age: ${age}; Conditions: ${conditions}; BMI: ${bmiVal}; Smoking: ${smoking}; Drinking: ${drinking}; Medication adherence: ${adherenceSummary}. The tip should be actionable, prioritize safety, and include one specific recommendation.`;

      const tip = await callGemini(prompt);
      if (apiTimer) performanceMonitor.endApiCall(apiTimer, 200, true);
      return tip || null;
    } catch (err) {
      logger.error('AI personal tip error', err);
      return null;
    } finally {
      setAIFactLoading(false);
    }
  };

  useEffect(() => {
    if (!dataLoading && screenTimer) {
      performanceMonitor.endTimer(screenTimer);
    }
  }, [dataLoading, screenTimer]);

  if (dataLoading) {
    return <DashboardSkeleton />;
  }
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
        <Text style={[styles.errorMessage, { color: colors.subtext }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => setError(null)}
          accessibilityLabel="Retry loading dashboard"
          accessibilityRole="button"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getBmiStatusColor = () => {
    switch (bmiData.status) {
      case 'healthy': return colors.success;
      case 'warning': return colors.warning;
      case 'critical': return colors.danger;
      case 'error': return colors.danger;
      default: return colors.subtext;
    }
  };

  const now = new Date();
  const nextAppointment = appointments.find(apt => {
    const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
    return aptDate >= now;
  }) ?? null;

  const handleMarkAttendedDashboard = async (appointment) => {
    try {
      const apptRef = doc(db, 'appointments', appointment.id);

      const ids = appointment?.notificationIds || [];
      for (const nid of ids) {
        try {
          await Notifications.cancelScheduledNotificationAsync(nid);
        } catch (e) {
          console.warn('Failed to cancel notification', nid, e);
        }
      }

      await updateDoc(apptRef, {
        attended: true,
        attendedAt: new Date()
      });

      Alert.alert('Marked attended', 'Appointment marked as attended.');
    } catch (err) {
      console.error('Mark attended error', err);
      Alert.alert('Error', 'Could not mark appointment as attended.');
    }
  };

  return (
    <>
      <OnboardingModal />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={styles.container}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
            >
              {/* ── Greeting ── */}
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                <Text style={[styles.greeting, { color: colors.text }]}>Hello, {userName}</Text>
                <Text style={{ fontSize: fontSize.sm, color: colors.subtext, marginBottom: spacing.md }}>
                  Here's your health summary
                </Text>
              </Animated.View>

              <View style={{ marginBottom: spacing.md }} />

              {/* ── Health Score Hero ── */}
              <Animated.View style={{ opacity: fadeAnim }}>
                <HealthScoreCard
                  healthScore={healthScore}
                  onShowExplainer={() => setShowScoreModal(true)}
                />
              </Animated.View>

              <View style={{ marginBottom: spacing.md }} />

              {/* ── Next Medicine ── */}
              {nextDoseStatus && (
                <View style={{ marginBottom: spacing.md }}>
                  <NextDoseWidget
                    nextDoseStatus={nextDoseStatus}
                    onMarkAsTaken={handleMarkAsTaken}
                  />
                </View>
              )}

              {/* ── Next Appointment ── */}
              {appointments.length > 0 && (
                <Animated.View
                  style={[styles.card, { backgroundColor: colors.card, opacity: fadeAnim }]}
                >
                  <View style={styles.cardHeader}>
                    <IconBadge icon="calendar" size="md" color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>
                        {nextAppointment.doctorName || nextAppointment.with || 'Appointment'}
                      </Text>
                      <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
                        {nextAppointment.date?.toDate
                          ? nextAppointment.date.toDate().toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                          : nextAppointment.date || 'Date not specified'}
                      </Text>
                      {nextAppointment.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location" size={14} color={colors.subtext} />
                          <Text style={[styles.locationText, { color: colors.subtext }]}>
                            {nextAppointment.location}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {(() => {
                    const aptDateObj = nextAppointment?.date?.toDate
                      ? nextAppointment.date.toDate()
                      : nextAppointment?.date
                        ? new Date(nextAppointment.date)
                        : null;
                    const canShow = aptDateObj ? aptDateObj <= new Date() : false;
                    if (nextAppointment.attended) {
                      return (
                        <View style={styles.attendedBadge}>
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                          <Text style={[styles.attendedText, { color: colors.primary }]}>
                            {nextAppointment.attendedAt
                              ? nextAppointment.attendedAt.toDate
                                ? `Attended on ${nextAppointment.attendedAt.toDate().toLocaleDateString()}`
                                : `Attended on ${new Date(nextAppointment.attendedAt).toLocaleDateString()}`
                              : 'Attended'}
                          </Text>
                        </View>
                      );
                    }
                    if (canShow) {
                      return (
                        <TouchableOpacity
                          style={[styles.attendButton, { backgroundColor: colors.primary }]}
                          onPress={() => handleMarkAttendedDashboard(nextAppointment)}
                          activeOpacity={0.8}
                          accessibilityLabel="Mark appointment as attended"
                          accessibilityRole="button"
                        >
                          <Ionicons name="checkmark-done" size={20} color="#fff" />
                          <Text style={styles.attendButtonText}>Mark Attended</Text>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()}
                </Animated.View>
              )}

              <View style={{ marginBottom: spacing.md }} />

              {/* ── BMI Card (compact) ── */}
              <Animated.View
                style={[styles.card, { backgroundColor: colors.card, padding: spacing.md, opacity: fadeAnim }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <IconBadge icon="body" size="sm" color={getBmiStatusColor()} />
                  <View>
                    <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: getBmiStatusColor() }}>
                      {bmiData.value || 'N/A'}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {bmiData.status === 'healthy' && <Ionicons name="checkmark-circle" size={iconSize.sm} color={colors.success} />}
                      {(bmiData.status === 'warning') && <Ionicons name="alert-circle" size={iconSize.sm} color={colors.warning} />}
                      {bmiData.status === 'critical' && <Ionicons name="close-circle" size={iconSize.sm} color={colors.danger} />}
                      <Text style={{ color: colors.subtext, fontSize: fontSize.sm }}>
                        {bmiData.category}
                      </Text>
                    </View>
                  </View>
                </View>
              </Animated.View>

              <View style={{ marginBottom: spacing.md }} />

              {/* ── Health Tip ── */}
              <Animated.View style={{ opacity: fadeAnim }}>
                <HealthFactCard
                  randomFact={randomFact}
                  aiFactLoading={aiFactLoading}
                  onRefreshTip={async () => {
                    const personal = await fetchAIPersonalTip();
                    if (personal) {
                      setRandomFact(personal);
                      setAIFactSource('ai');
                      return;
                    }
                    const ai = await fetchAIFact(
                      Object.keys(healthFacts)[Math.floor(Math.random() * Object.keys(healthFacts).length)],
                      'fact'
                    );
                    if (ai) {
                      setRandomFact(ai);
                      setAIFactSource('ai');
                    } else {
                      setAIFactSource('preset');
                    }
                  }}
                />
              </Animated.View>

            </ScrollView>

            {/* ── AI Search Panel ── */}
            <AISearchPanel fadeAnim={fadeAnim} />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* ── Health Score Explainer Modal (UX-5) ── */}
      <Modal
        visible={showScoreModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowScoreModal(false)}
      >
        <View style={styles.modalBackdropCentered}>
          {/* Backdrop pressable behind the card */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowScoreModal(false)} />
          
          <Animated.View 
            style={[
              styles.explainCard, 
              { 
                backgroundColor: colors.card, 
                borderColor: colors.border,
                borderWidth: 1,
              }
            ]}
          >
            <View style={styles.explainHeader}>
              <Text style={[styles.explainTitle, { color: colors.text }]}>Health Score Breakdown</Text>
              <TouchableOpacity 
                style={styles.closeButton} 
                onPress={() => setShowScoreModal(false)}
                accessibilityLabel="Close modal"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.explainScroll} 
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Modal Hero Section: Score, Status & Tagline */}
              <View style={styles.modalHeroContainer}>
                <View style={[styles.modalScoreBadge, { backgroundColor: `${getScoreColor(healthScore, colors)}14` }]}>
                  <Ionicons name="heart" size={26} color={getScoreColor(healthScore, colors)} />
                  <Text style={[styles.modalScoreText, { color: getScoreColor(healthScore, colors) }]}>
                    {healthScore ?? 'N/A'}{healthScore !== null && '%'}
                  </Text>
                </View>
                <View style={styles.modalStatusRow}>
                  <Ionicons
                    name={healthScore >= 80 ? 'checkmark-circle' : healthScore >= 60 ? 'alert-circle' : 'close-circle'}
                    size={20}
                    color={getScoreColor(healthScore, colors)}
                  />
                  <Text style={[styles.modalStatusText, { color: getScoreColor(healthScore, colors) }]}>
                    {healthScore >= 80 ? 'Excellent!' : healthScore >= 60 ? 'Good' : 'Needs attention'}
                  </Text>
                </View>
                <Text style={[styles.modalTaglineText, { color: colors.subtext }]}>
                  {getTagline(healthScore)}
                </Text>
              </View>

              <Text style={[styles.explainDesc, { color: colors.subtext }]}>
                Your Health Score is a personalized, real-time metric calculated from various aspects of your health profile and daily habits. Here is how it is weighted:
              </Text>

              {/* Medication Adherence (22%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="medical" size={20} color={colors.primary} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>Medication Adherence</Text>
                    <Text style={[styles.explainWeight, { color: colors.primary }]}>22%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Measures how consistently you mark your scheduled medicines as taken.
                  </Text>
                </View>
              </View>

              {/* BMI Range (20%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.success}20` }]}>
                  <Ionicons name="fitness" size={20} color={colors.success} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>BMI Baseline</Text>
                    <Text style={[styles.explainWeight, { color: colors.success }]}>20%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Based on your height and weight, aligning your metrics to a healthy standard.
                  </Text>
                </View>
              </View>

              {/* Chronic Conditions (12%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.warning}20` }]}>
                  <Ionicons name="heart" size={20} color={colors.warning} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>Chronic Conditions</Text>
                    <Text style={[styles.explainWeight, { color: colors.warning }]}>12%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Consideration of documented chronic conditions in your overall health status.
                  </Text>
                </View>
              </View>

              {/* Appointments (10%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>Appointments</Text>
                    <Text style={[styles.explainWeight, { color: colors.primary }]}>10%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Reflects compliance and attendance for your scheduled clinical checkups.
                  </Text>
                </View>
              </View>

              {/* Profile Details (10%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.success}20` }]}>
                  <Ionicons name="person" size={20} color={colors.success} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>Profile Completeness</Text>
                    <Text style={[styles.explainWeight, { color: colors.success }]}>10%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Completing basic vital parameters (blood group, height, age, weight).
                  </Text>
                </View>
              </View>

              {/* Lifestyle: Smoking (10%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.danger}20` }]}>
                  <Ionicons name="leaf" size={20} color={colors.danger} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>Smoking Habits</Text>
                    <Text style={[styles.explainWeight, { color: colors.danger }]}>10%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Risk factor calculation based on your reported smoking frequency.
                  </Text>
                </View>
              </View>

              {/* Lifestyle: Alcohol (8%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.danger}20` }]}>
                  <Ionicons name="wine" size={20} color={colors.danger} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>Drinking Habits</Text>
                    <Text style={[styles.explainWeight, { color: colors.danger }]}>8%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Impact score adjustment based on your reported alcohol consumption frequency.
                  </Text>
                </View>
              </View>

              {/* Age Factor (8%) */}
              <View style={styles.explainRow}>
                <View style={[styles.explainIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="hourglass" size={20} color={colors.primary} />
                </View>
                <View style={styles.explainTextContent}>
                  <View style={styles.explainTitleRow}>
                    <Text style={[styles.explainItemName, { color: colors.text }]}>Age Context</Text>
                    <Text style={[styles.explainWeight, { color: colors.primary }]}>8%</Text>
                  </View>
                  <Text style={[styles.explainItemDesc, { color: colors.subtext }]}>
                    Physiological context adjustments based on your age segment.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

// ── Sub-components for isolates re-renders are now imported from ../components/dashboard/ ──

const getScoreColor = (score, colors) => {
  if (score === null || isNaN(score)) return colors.subtext;
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.danger;
};

const getTagline = (score) => {
  if (score === null || isNaN(score)) return 'Complete details to get index';
  if (score >= 80) return 'Your wellness profile is in great shape. Keep up the high standard!';
  if (score >= 60) return 'Good index. Minor updates to profile or cabinet will increase this further.';
  return 'Action advised. Log scheduled medicines and vital info to boost your index.';
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 120, // Extra padding to scroll past floating search bar
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 120,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 16,
    marginBottom: 20,
    opacity: 0.7,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  searchButton: {
    height: 50,
    width: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Bottom panel that slides up to replace the keyboard
  resultPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  resultPanelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    padding: 18,
  },
  metricIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  metricSubtext: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  medicineCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  dueBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dueText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  takeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  takeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
  },
  attendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    gap: 8,
  },
  attendedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  attendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  attendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tipCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  tipIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tipContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
  modalBackdropCentered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  explainCard: {
    width: '90%',
    height: '70%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  explainHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
    paddingBottom: 12,
    marginBottom: 16,
  },
  explainTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  explainScroll: {
    flex: 1,
  },
  explainDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  explainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
    gap: 12,
  },
  explainIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  explainTextContent: {
    flex: 1,
  },
  explainTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  explainItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  explainWeight: {
    fontSize: 14,
    fontWeight: '700',
  },
  explainItemDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalHeroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  modalScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
  },
  modalScoreText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  modalStatusText: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalTaglineText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});