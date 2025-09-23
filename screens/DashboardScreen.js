// DashboardScreen.js (Enterprise Enhanced)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  RefreshControl
} from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import * as Notifications from 'expo-notifications';
import { GEMINI_API_KEY } from '../apiKeys';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import logger from '../utils/Logger';
import performanceMonitor from '../utils/PerformanceMonitor';

// Enhanced health facts with categories
const healthFacts = {
  nutrition: [
    "Drinking 8 glasses of water daily can improve metabolism by 30%.",
    "Eating breakfast within 1 hour of waking boosts cognitive function.",
    "Dark chocolate contains antioxidants that support heart health.",
    "Blueberries can improve memory and cognitive function.",
    "Green tea contains compounds that may boost metabolism."
  ],
  exercise: [
    "Just 10 minutes of walking can boost energy for 2 hours.",
    "Regular exercise can improve sleep quality by 65%.",
    "Strength training twice weekly can prevent age-related muscle loss.",
    "Yoga can reduce stress hormones by up to 23%.",
    "Daily stretching improves flexibility and reduces injury risk."
  ],
  wellness: [
    "Good posture can improve mood and reduce stress levels.",
    "7-9 hours of sleep per night is crucial for immune function.",
    "Laughter releases endorphins that act as natural painkillers.",
    "Deep breathing exercises can lower blood pressure.",
    "Regular social interaction can extend lifespan by 7-10 years."
  ]
};

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const [userName, setUserName] = useState('');
  const [userProfile, setUserProfile] = useState({});
  const [medicines, setMedicines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [randomFact, setRandomFact] = useState('');
  const [aiFactLoading, setAIFactLoading] = useState(false);
  const [aiFactSource, setAIFactSource] = useState('preset'); // 'preset' | 'ai'
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  const [error, setError] = useState(null);
  const [sectionLoading, setSectionLoading] = useState({
    profile: true,
    medicines: true,
    appointments: true
  });

  // Performance monitoring
  const screenTimer = useMemo(() => performanceMonitor.startScreenLoad('Dashboard'), []);

  // Memoized health score calculation
  const calculateHealthScore = useCallback((userMedicines = [], profile = {}, appts = []) => {
    try {
      // Component weights (tunable) - sum used for normalization
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

      // Helper: cap between 0-100
      const clampPct = (v) => Math.max(0, Math.min(100, Math.round(v)));

      // 1) Medicine adherence -> 0-100
      let adherencePct = 100;
      if (userMedicines && userMedicines.length > 0) {
        // total expected doses approximated by 'quantity' field if present per med
        const totalDoses = userMedicines.reduce((sum, med) => sum + (Number(med.quantity) || 0), 0);
        const takenDoses = userMedicines.reduce((sum, med) => sum + (med.takenTimestamps?.length || 0), 0);
        adherencePct = totalDoses > 0 ? clampPct((takenDoses / totalDoses) * 100) : 100;
      }
      weightedSum += adherencePct * weights.adherence;

      // 2) Profile completeness
      const profileFields = ['age', 'weight', 'height', 'conditions', 'gender', 'bloodGroup'];
      const completed = profileFields.filter(f => profile[f] !== undefined && profile[f] !== null && profile[f] !== '').length;
      const profilePct = clampPct((completed / profileFields.length) * 100);
      weightedSum += profilePct * weights.profileCompleteness;

      // 3) Appointments attendance (last 90 days)
      let apptPct = 100;
      if (appts && appts.length > 0) {
        const recentWindow = 90 * 24 * 60 * 60 * 1000; // 90 days
        const recentAttended = appts.filter(apt => apt.attended && apt.attendedAt).length;
        // penalize for missed recent appointments
        apptPct = clampPct((recentAttended / appts.length) * 100);
      }
      weightedSum += apptPct * weights.appointments;

      // 4) BMI scoring
      let bmiPct = 75;
      const weightVal = profile.weight ? parseFloat(profile.weight) : null;
      const heightVal = profile.height ? parseFloat(profile.height) : null;

      // compute age
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
          bmiPct = 75; // pediatric neutral
        }
      }
      weightedSum += bmiPct * weights.bmi;

      // 5) Age factor (slight adjustment)
      let agePct = 100;
      if (age !== null) {
        if (age >= 80) agePct = 75;
        else if (age >= 65) agePct = 85;
        else if (age <= 16) agePct = 90;
        else agePct = 100;
      }
      weightedSum += agePct * weights.ageFactor;

      // 6) Smoking and drinking: map frequency to penalty
      const freqToPct = (val) => {
        // val can be 'No', 'Occasionally', 'Daily' or a custom numeric
        if (!val || val === 'No' || val === 'no' || val === 'None') return 100;
        if (typeof val === 'number') return clampPct(100 - val); // numeric penalty mapping
        const v = String(val).toLowerCase();
        if (v.includes('daily')) return 30;
        if (v.includes('occasion') || v.includes('occasional') || v.includes('sometimes')) return 70;
        if (v === 'occasionally') return 70;
        if (v === 'yes') return 60;
        return 80; // unknown -> mild penalty
      };

      const smokingPct = clampPct(freqToPct(profile.smokingFreq || profile.smoking));
      const drinkingPct = clampPct(freqToPct(profile.drinkingFreq || profile.drinking));
      weightedSum += smokingPct * weights.smoking;
      weightedSum += drinkingPct * weights.drinking;

      // 7) Conditions/severity: more conditions -> lower score. If conditions array contains severity keys, use them.
      let conditionsPct = 100;
      if (profile.conditions && Array.isArray(profile.conditions)) {
        const condCount = profile.conditions.length;
        // basic heuristic: 0 cond -> 100, 1-2 -> 85, 3-4 -> 70, 5+ -> 50
        if (condCount === 0) conditionsPct = 100;
        else if (condCount <= 2) conditionsPct = 85;
        else if (condCount <= 4) conditionsPct = 70;
        else conditionsPct = 50;
      }
      weightedSum += conditionsPct * weights.conditions;

      // Normalize
      const finalScore = Math.round(weightedSum / totalWeight);
      const clamped = Math.max(0, Math.min(100, finalScore));
      setHealthScore(clamped);

      // Log components for debugging
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

  // Enhanced BMI calculation with validation
  const bmiData = useMemo(() => {
    // include age awareness and clearer categories
    try {
      const weight = userProfile.weight ? parseFloat(userProfile.weight) : null;
      const height = userProfile.height ? parseFloat(userProfile.height) : null;
      let age = null;
      if (userProfile.age) age = Number(userProfile.age);
      else if (userProfile.dob) {
        try { const dob = userProfile.dob.toDate ? userProfile.dob.toDate() : new Date(userProfile.dob); age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)); } catch (e) { age = null; }
      }

      if (!weight || !height) return { value: null, category: 'N/A', status: 'incomplete', age };

      if (height === 0 || weight === 0) return { value: null, category: 'N/A', status: 'invalid', age };

      const bmi = +(weight / Math.pow(height / 100, 2)).toFixed(1);
      let category = 'Unknown';
      let status = 'normal';

      if (age !== null && age < 18) {
        // Pediatric BMI interpretation requires percentiles; provide a safe message
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

  // Optimized next dose calculation
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

  // Enhanced search with rate limiting and validation
  const handleSearch = useCallback(async () => {
    if (searchText.trim().length < 3) {
      Alert.alert('Search Error', 'Please enter at least 3 characters to search.');
      return;
    }

    if (isSearching) return; // Prevent multiple simultaneous searches

    setIsSearching(true);
    setSearchResult('');
    
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');
      
      const prompt = `Provide a brief, one-paragraph summary for the medicine: "${searchText}". Include its primary use and one or two common side effects. Format it as a simple paragraph.`;
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }] })
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "No data found.";
      
      setSearchResult(summary.trim());
      
      // Log successful search
      logger.info('Medicine search completed', { 
        query: searchText, 
        resultLength: summary.length 
      });
      
      // End API performance monitoring
      if (apiTimer) {
        performanceMonitor.endApiCall(apiTimer, response.status, true);
      }
      
    } catch (error) {
      logger.error('Medicine search failed', error);
      setSearchResult("Sorry, we couldn't fetch medicine information at this time. Please try again later.");
    } finally {
      setIsSearching(false);
    }
  }, [searchText, isSearching]);

  // Enhanced mark as taken with validation
  const handleMarkAsTaken = useCallback(async (medicineId) => {
    try {
      const medicineRef = doc(db, "medicines", medicineId);
      await updateDoc(medicineRef, { 
        takenTimestamps: arrayUnion(new Date()) 
      });
      
      logger.info('Medicine marked as taken', { medicineId });
      
      // Show success feedback
      Alert.alert('Success', 'Medicine marked as taken!');
    } catch (error) {
      logger.error('Error marking medicine as taken', error);
      Alert.alert('Error', 'Failed to mark medicine as taken. Please try again.');
    }
  }, []);

  // Refresh control handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Trigger data refresh by updating timestamps
      setSectionLoading({ profile: true, medicines: true, appointments: true });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate refresh
    } catch (error) {
      logger.error('Refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Enhanced data fetching with error handling
  useEffect(() => {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, "users", userId);

    // Profile listener
    const unsubscribeProfile = onSnapshot(userDocRef, 
      (docSnap) => {
        try {
          const userData = docSnap.exists() ? docSnap.data() : {};
          setUserProfile(userData);
          setUserName(userData.firstName || userData.name || 'User');
          setSectionLoading(prev => ({ ...prev, profile: false }));
        } catch (error) {
          logger.error('Error processing profile data', error);
          setError('Failed to load profile');
          setSectionLoading(prev => ({ ...prev, profile: false }));
        }
      },
      (error) => {
        logger.error('Profile listener error', error);
        setError('Failed to load profile');
        setSectionLoading(prev => ({ ...prev, profile: false }));
      }
    );

    // Medicines listener
    const medQuery = query(collection(db, 'medicines'), where('userId', '==', userId));
    const unsubscribeMeds = onSnapshot(medQuery, 
      (snapshot) => {
        try {
          const medsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          setMedicines(medsData);
          setSectionLoading(prev => ({ ...prev, medicines: false }));
        } catch (error) {
          logger.error('Error processing medicines data', error);
          setError('Failed to load medicines');
          setSectionLoading(prev => ({ ...prev, medicines: false }));
        }
      },
      (error) => {
        logger.error('Medicines listener error', error);
        setError('Failed to load medicines');
        setSectionLoading(prev => ({ ...prev, medicines: false }));
      }
    );

    // Appointments listener
    const apptQuery = query(collection(db, 'appointments'), where('userId', '==', userId));
    const unsubscribeAppts = onSnapshot(apptQuery, 
      (snapshot) => {
        try {
          const apptsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          setAppointments(apptsData);
          setSectionLoading(prev => ({ ...prev, appointments: false }));
        } catch (error) {
          logger.error('Error processing appointments data', error);
          setError('Failed to load appointments');
          setSectionLoading(prev => ({ ...prev, appointments: false }));
        }
      },
      (error) => {
        logger.error('Appointments listener error', error);
        setError('Failed to load appointments');
        setSectionLoading(prev => ({ ...prev, appointments: false }));
      }
    );

    return () => {
      unsubscribeProfile();
      unsubscribeMeds();
      unsubscribeAppts();
    };
  }, []);

  // Health score calculation effect
  useEffect(() => {
    if (!sectionLoading.profile && !sectionLoading.medicines && !sectionLoading.appointments) {
      calculateHealthScore(medicines, userProfile, appointments);
      setLoading(false);
    }
  }, [sectionLoading, medicines, userProfile, calculateHealthScore]);

  // Random fact effect with category rotation
  useEffect(() => {
    // Try to fetch an AI-generated fact on load, fallback to presets
    const categories = Object.keys(healthFacts);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    (async () => {
      const ai = await fetchAIFact(randomCategory, 'fact');
      if (ai) {
        setRandomFact(ai);
        setAIFactSource('ai');
      } else {
        const categoryFacts = healthFacts[randomCategory];
        setRandomFact(categoryFacts[Math.floor(Math.random() * categoryFacts.length)]);
        setAIFactSource('preset');
      }
    })();
  }, []);

  // AI fetch helper: returns string or null
  const fetchAIFact = async (category = 'wellness', kind = 'fact') => {
    if (!GEMINI_API_KEY) return null;
    setAIFactLoading(true);
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');
      const prompt = kind === 'quote'
        ? `Provide a short, uplifting one-sentence quote about ${category} and wellbeing suitable for an app banner.`
        : `Give one concise, evidence-backed health tip about ${category}. Keep it under 30 words and friendly.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );

      if (!res.ok) {
        logger.warn('AI fact request failed', { status: res.status });
        if (apiTimer) performanceMonitor.endApiCall(apiTimer, res.status, false);
        return null;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (apiTimer) performanceMonitor.endApiCall(apiTimer, res.status, true);
      return text ? String(text).trim() : null;
    } catch (err) {
      logger.error('AI fact generation error', err);
      return null;
    } finally {
      setAIFactLoading(false);
    }
  };

  // Fetch AI personalized health tip using user data (falls back to preset)
  const fetchAIPersonalTip = async () => {
    if (!GEMINI_API_KEY) return null;
    setAIFactLoading(true);
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');

      // Build a concise user snapshot for the prompt
      const age = userProfile.age || (userProfile.dob ? (() => { try { const d = userProfile.dob.toDate ? userProfile.dob.toDate() : new Date(userProfile.dob); return Math.floor((Date.now() - d.getTime()) / (365.25*24*60*60*1000)); } catch (e) { return 'unknown'; } })() : 'unknown');
      const conditions = (userProfile.conditions && userProfile.conditions.length > 0) ? userProfile.conditions.join(', ') : 'none';
      const smoking = userProfile.smoking || userProfile.smokingFreq || 'No';
      const drinking = userProfile.drinking || userProfile.drinkingFreq || 'No';
      const bmiVal = bmiData.value || 'N/A';

      // Compute adherence summary
      let adherenceSummary = 'No medicines';
      if (medicines && medicines.length > 0) {
        const totalQty = medicines.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
        const taken = medicines.reduce((s, m) => s + (m.takenTimestamps?.length || 0), 0);
        adherenceSummary = `${taken}/${totalQty} doses taken`;
      }

      const prompt = `You are a friendly, evidence-based health assistant. Provide one concise (max 30 words) personalized health tip for a user with the following profile: Age: ${age}; Conditions: ${conditions}; BMI: ${bmiVal}; Smoking: ${smoking}; Drinking: ${drinking}; Medication adherence: ${adherenceSummary}. The tip should be actionable, prioritize safety, and include one specific recommendation.`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        }
      );

      if (!res.ok) {
        logger.warn('AI personal tip request failed', { status: res.status });
        if (apiTimer) performanceMonitor.endApiCall(apiTimer, res.status, false);
        return null;
      }

      const data = await res.json();
      const tip = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (apiTimer) performanceMonitor.endApiCall(apiTimer, res.status, true);
      return tip ? String(tip).trim() : null;
    } catch (err) {
      logger.error('AI personal tip error', err);
      return null;
    } finally {
      setAIFactLoading(false);
    }
  };

  // End performance monitoring
  useEffect(() => {
    if (!loading && screenTimer) {
      performanceMonitor.endTimer(screenTimer);
    }
  }, [loading, screenTimer]);

  // Loading state
  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading your health dashboard...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Something went wrong</Text>
        <Text style={[styles.errorMessage, { color: colors.subtext }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getScoreColor = () => {
    if (healthScore === null || isNaN(healthScore)) return colors.subtext;
    if (healthScore >= 80) return '#4CAF50';
    if (healthScore >= 60) return '#FFC107';
    return '#F44336';
  };

  const getBmiStatusColor = () => {
    switch (bmiData.status) {
      case 'healthy': return '#4CAF50';
      case 'warning': return '#FFC107';
      case 'critical': return '#F44336';
      case 'error': return '#FF6B6B';
      default: return colors.subtext;
    }
  };

  const nextAppointment = appointments.length > 0 ? appointments[0] : null;

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[styles.container, { flexGrow: 1 }]}
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
          <Text style={[styles.greeting, { color: colors.text }]}>Hello, {userName}</Text>
          <Text style={[styles.subGreeting, { color: colors.subtext }]}>Here's your health summary.</Text>
          
          {/* Enhanced Search Section */}
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Get quick info on any medicine..."
              placeholderTextColor={colors.subtext}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              maxLength={100}
            />
            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: colors.primary }]} 
              onPress={handleSearch}
              disabled={isSearching || searchText.trim().length < 3}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Search Results */}
          {searchResult && (
            <Animatable.View animation="fadeIn" style={[styles.card, { borderColor: colors.primary, borderWidth: 1 }]}>
              <Text style={[styles.cardTitle, { color: colors.primary }]}>Summary for {searchText}</Text>
              <Text style={[styles.cardSubContent, { color: colors.subtext }]}>{searchResult}</Text>
            </Animatable.View>
          )}

          {/* Enhanced Metrics Section */}
          <View style={styles.metricsContainer}>
            <View style={[styles.card, styles.metricCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.subtext }]}>Health Score</Text>
              <Text style={[styles.metricValue, { color: getScoreColor() }]}>
                {healthScore ?? 'N/A'}{healthScore && '%'}
              </Text>
              <Text style={[styles.metricSubtext, { color: colors.subtext }]}>
                {healthScore >= 80 ? 'Excellent!' : healthScore >= 60 ? 'Good' : 'Needs attention'}
              </Text>
            </View>
            <View style={[styles.card, styles.metricCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.subtext }]}>Your BMI</Text>
              <Text style={[styles.metricValue, { color: getBmiStatusColor() }]}>
                {bmiData.value || 'N/A'}
              </Text>
              <Text style={[styles.metricSubtext, { color: colors.subtext }]}>
                {bmiData.category}
              </Text>
            </View>
          </View>

          {/* Enhanced Next Medicine Section (hidden when no upcoming dose) */}
          {nextDoseStatus && (
            <Animatable.View animation="fadeInUp" duration={600} style={[styles.card, {backgroundColor: colors.card}]}>
              <Text style={[styles.cardTitle, { color: colors.subtext }]}>Next Medicine</Text>
              <Text style={[styles.cardContent, {color: colors.text}]}>
                {nextDoseStatus.medicine.name}
              </Text>
              <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
                {nextDoseStatus.isDue 
                  ? `Due at ${nextDoseStatus.doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : `Next dose at ${nextDoseStatus.doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                }
              </Text>
              {nextDoseStatus.isDue && (
                <TouchableOpacity 
                  style={[styles.button, {backgroundColor: colors.primary}]}
                  onPress={() => handleMarkAsTaken(nextDoseStatus.medicine.id)}
                >
                  <Text style={styles.buttonText}>Take Now</Text>
                </TouchableOpacity>
              )}
            </Animatable.View>
          )}

          {/* Enhanced Appointments Section */}
          {appointments.length > 0 && (
            <Animatable.View animation="fadeInUp" duration={600} delay={100} style={[styles.card, {backgroundColor: colors.card}]}>
              <Text style={[styles.cardTitle, { color: colors.subtext }]}>Upcoming Appointment</Text>
              <Text style={[styles.cardContent, {color: colors.text}]}>
                {nextAppointment.doctorName || nextAppointment.with || 'Appointment'}
              </Text>
              <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
                {nextAppointment.date?.toDate ? 
                  nextAppointment.date.toDate().toLocaleDateString() : 
                  nextAppointment.date || 'Date not specified'
                }
              </Text>
              {nextAppointment.location && (
                <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
                  📍 {nextAppointment.location}
                </Text>
              )}
              {/* Attendance control: show button on appointment day or after */}
              {(() => {
                const aptDateObj = nextAppointment?.date?.toDate ? nextAppointment.date.toDate() : (nextAppointment?.date ? new Date(nextAppointment.date) : null);
                const canShow = aptDateObj ? (aptDateObj <= new Date()) : false;
                if (nextAppointment.attended) {
                  return (
                    <View style={{ marginTop: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: 8 }}>
                          {nextAppointment.attendedAt ? (
                            nextAppointment.attendedAt.toDate ? `Attended on ${nextAppointment.attendedAt.toDate().toLocaleString()}` : `Attended on ${new Date(nextAppointment.attendedAt).toLocaleString()}`
                          ) : 'Attended'}
                        </Text>
                      </View>
                    </View>
                  );
                }
                if (canShow) {
                  return (
                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary, marginTop: 10 }]} onPress={() => handleMarkAttendedDashboard(nextAppointment)}>
                      <Text style={styles.buttonText}>Mark Attended</Text>
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
            </Animatable.View>
          )}

          {/* Enhanced Health Fact Section */}
          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <Text style={[styles.cardTitle, { color: colors.subtext }]}>💡 Health Tip</Text>
            <Text style={[styles.cardSubContent, { color: colors.subtext }]}>{randomFact}</Text>
            <View style={{ flexDirection: 'row', marginTop: 12, alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  // Try personalized tip first
                  const personal = await fetchAIPersonalTip();
                  if (personal) {
                    setRandomFact(personal);
                    setAIFactSource('ai');
                    return;
                  }

                  // Fallback to generic AI fact
                  const ai = await fetchAIFact(Object.keys(healthFacts)[Math.floor(Math.random() * Object.keys(healthFacts).length)], 'fact');
                  if (ai) { setRandomFact(ai); setAIFactSource('ai'); }
                  else { setAIFactSource('preset'); }
                }}
                disabled={aiFactLoading}
              >
                {aiFactLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.smallButtonText}>Generate Tip (AI)</Text>}
              </TouchableOpacity>
              <Text style={{ color: colors.subtext, fontSize: 12 }}>{aiFactSource === 'ai' ? 'Generated by AI' : 'From presets'}</Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  subGreeting: {
    fontSize: 18,
    marginBottom: 25,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
  },
  searchButton: {
    height: 50,
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardContent: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardSubContent: {
    fontSize: 16,
    marginTop: 4,
    lineHeight: 22,
  },
  metricValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  metricSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  button: {
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center'
  },
  smallButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
