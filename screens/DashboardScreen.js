// DashboardScreen.js (Enhanced)
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
} from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import * as Notifications from 'expo-notifications';
import { GEMINI_API_KEY } from '../apiKeys';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import logger from '../utils/Logger';
import performanceMonitor from '../utils/PerformanceMonitor';

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
  const [aiFactSource, setAIFactSource] = useState('preset');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  const [error, setError] = useState(null);
  const [sectionLoading, setSectionLoading] = useState({
    profile: true,
    medicines: true,
    appointments: true
  });

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const bmiAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const screenTimer = useMemo(() => performanceMonitor.startScreenLoad('Dashboard'), []);

  // Entrance animations
  useEffect(() => {
    if (!loading) {
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
  }, [loading]);

  // Health score animation
  useEffect(() => {
    if (healthScore !== null) {
      Animated.timing(scoreAnim, {
        toValue: healthScore,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [healthScore]);

  // BMI animation
  useEffect(() => {
    const bmiValue = bmiData.value;
    if (bmiValue) {
      Animated.timing(bmiAnim, {
        toValue: bmiValue,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [userProfile.weight, userProfile.height]);

  // Pulse animation for due medicines
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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
      if (profile.conditions && Array.isArray(profile.conditions)) {
        const condCount = profile.conditions.length;
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

  const handleSearch = useCallback(async () => {
    if (searchText.trim().length < 3) {
      Alert.alert('Search Error', 'Please enter at least 3 characters to search.');
      return;
    }

    if (isSearching) return;

    setIsSearching(true);
    setSearchResult('');
    
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');
      
      const prompt = `Provide a brief, one-paragraph summary for the medicine: "${searchText}". Include its primary use and one or two common side effects. Format it as a simple paragraph.`;
      
      // Try current models first, then fallback to older ones
      const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
      const apiVersions = ['v1beta', 'v1'];
      let response = null;
      
      outerLoop: for (const apiVersion of apiVersions) {
        for (const model of models) {
          response = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }] })
            }
          );
          
          if (response.ok) {
            break outerLoop; // Success, exit both loops
          } else if (response.status === 404) {
            continue; // Try next model
          } else if (response.status !== 400) {
            break; // Stop trying other models for this API version
          }
        }
      }
      
      if (!response || !response.ok) {
        throw new Error(`API request failed: All models unavailable`);
      }

      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "No data found.";
      
      setSearchResult(summary.trim());
      
      logger.info('Medicine search completed', { 
        query: searchText, 
        resultLength: summary.length 
      });
      
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
      setSectionLoading({ profile: true, medicines: true, appointments: true });
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logger.error('Refresh failed', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, "users", userId);

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

  useEffect(() => {
    if (!sectionLoading.profile && !sectionLoading.medicines && !sectionLoading.appointments) {
      calculateHealthScore(medicines, userProfile, appointments);
      setLoading(false);
    }
  }, [sectionLoading, medicines, userProfile, calculateHealthScore]);

  useEffect(() => {
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

  const fetchAIFact = async (category = 'wellness', kind = 'fact') => {
    if (!GEMINI_API_KEY) return null;
    setAIFactLoading(true);
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');
      const prompt = kind === 'quote'
        ? `Provide a short, uplifting one-sentence quote about ${category} and wellbeing suitable for an app banner.`
        : `Give one concise, evidence-backed health tip about ${category}. Keep it under 30 words and friendly.`;

      // Try current models first, then fallback to older ones
      const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
      const apiVersions = ['v1beta', 'v1'];
      let res = null;
      
      outerLoop: for (const apiVersion of apiVersions) {
        for (const model of models) {
          res = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
          );
          
          if (res.ok) {
            break outerLoop; // Success, exit both loops
          } else if (res.status === 404) {
            continue; // Try next model
          } else if (res.status !== 400) {
            logger.warn('AI fact request failed', { status: res.status });
            if (apiTimer) performanceMonitor.endApiCall(apiTimer, res.status, false);
            return null;
          }
        }
      }
      
      if (!res || !res.ok) {
        logger.warn('AI fact request failed: All models unavailable', { status: res?.status });
        if (apiTimer) performanceMonitor.endApiCall(apiTimer, res?.status || 404, false);
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

  const fetchAIPersonalTip = async () => {
    if (!GEMINI_API_KEY) return null;
    setAIFactLoading(true);
    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');

      const age = userProfile.age || (userProfile.dob ? (() => { 
        try { 
          const d = userProfile.dob.toDate ? userProfile.dob.toDate() : new Date(userProfile.dob); 
          return Math.floor((Date.now() - d.getTime()) / (365.25*24*60*60*1000)); 
        } catch (e) { return 'unknown'; } 
      })() : 'unknown');
      const conditions = (userProfile.conditions && userProfile.conditions.length > 0) ? userProfile.conditions.join(', ') : 'none';
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

      // Try current models first, then fallback to older ones
      const models = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
      const apiVersions = ['v1beta', 'v1'];
      let res = null;
      
      outerLoop: for (const apiVersion of apiVersions) {
        for (const model of models) {
          res = await fetch(
            `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
          );
          
          if (res.ok) {
            break outerLoop; // Success, exit both loops
          } else if (res.status === 404) {
            continue; // Try next model
          } else if (res.status !== 400) {
            logger.warn('AI personal tip request failed', { status: res.status });
            if (apiTimer) performanceMonitor.endApiCall(apiTimer, res.status, false);
            return null;
          }
        }
      }
      
      if (!res || !res.ok) {
        logger.warn('AI personal tip request failed: All models unavailable', { status: res?.status });
        if (apiTimer) performanceMonitor.endApiCall(apiTimer, res?.status || 404, false);
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

  useEffect(() => {
    if (!loading && screenTimer) {
      performanceMonitor.endTimer(screenTimer);
    }
  }, [loading, screenTimer]);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading your health dashboard...</Text>
      </View>
    );
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
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={[styles.greeting, { color: colors.text }]}>Hello, {userName}</Text>
            <Text style={[styles.subGreeting, { color: colors.subtext }]}>Here's your health summary</Text>
          </Animated.View>
          
          {/* Search Section */}
          <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Search medicine info..."
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
              activeOpacity={0.7}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={22} color="#fff" />
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Search Results */}
          {searchResult && (
            <Animated.View 
              style={[styles.card, styles.searchResultCard, { 
                backgroundColor: colors.card,
                borderColor: colors.primary,
                opacity: fadeAnim 
              }]}
            >
              <View style={styles.searchResultHeader}>
                <Ionicons name="medical" size={20} color={colors.primary} />
                <Text style={[styles.searchResultTitle, { color: colors.primary }]}>
                  {searchText}
                </Text>
              </View>
              <Text style={[styles.cardSubContent, { color: colors.subtext }]}>{searchResult}</Text>
            </Animated.View>
          )}

          {/* Metrics Section */}
          <Animated.View style={[styles.metricsContainer, { opacity: fadeAnim }]}>
            <TouchableOpacity 
              style={[styles.card, styles.metricCard, { backgroundColor: colors.card }]}
              activeOpacity={0.9}
            >
              <View style={[styles.metricIconContainer, { backgroundColor: `${getScoreColor()}20` }]}>
                <Ionicons name="fitness" size={28} color={getScoreColor()} />
              </View>
              <Text style={[styles.metricLabel, { color: colors.subtext }]}>Health Score</Text>
              <Text style={[styles.metricValue, { color: getScoreColor() }]}>
                {healthScore ?? 'N/A'}{healthScore && '%'}
              </Text>
              <View style={[styles.progressBar, { backgroundColor: `${colors.border}40` }]}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: getScoreColor(),
                      width: scoreAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.metricSubtext, { color: colors.subtext }]}>
                {healthScore >= 80 ? 'Excellent!' : healthScore >= 60 ? 'Good' : 'Needs attention'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.metricCard, { backgroundColor: colors.card }]}
              activeOpacity={0.9}
            >
              <View style={[styles.metricIconContainer, { backgroundColor: `${getBmiStatusColor()}20` }]}>
                <Ionicons name="body" size={28} color={getBmiStatusColor()} />
              </View>
              <Text style={[styles.metricLabel, { color: colors.subtext }]}>Your BMI</Text>
              <Text style={[styles.metricValue, { color: getBmiStatusColor() }]}>
                {bmiData.value || 'N/A'}
              </Text>
              <Text style={[styles.metricSubtext, { color: colors.subtext }]}>
                {bmiData.category}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Next Medicine */}
          {nextDoseStatus && (
            <Animated.View 
              style={[
                styles.card, 
                styles.medicineCard,
                { 
                  backgroundColor: colors.card,
                  opacity: fadeAnim,
                  transform: [{ scale: nextDoseStatus.isDue ? pulseAnim : 1 }]
                }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="medical" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {nextDoseStatus.medicine.name}
                  </Text>
                  <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
                    {nextDoseStatus.isDue 
                      ? `Due at ${nextDoseStatus.doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : `Next dose at ${nextDoseStatus.doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    }
                  </Text>
                </View>
                {nextDoseStatus.isDue && (
                  <View style={[styles.dueBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.dueText}>DUE</Text>
                  </View>
                )}
              </View>
              {nextDoseStatus.isDue && (
                <TouchableOpacity 
                  style={[styles.takeButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleMarkAsTaken(nextDoseStatus.medicine.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.takeButtonText}>Take Now</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* Appointments */}
          {appointments.length > 0 && (
            <Animated.View 
              style={[styles.card, { backgroundColor: colors.card, opacity: fadeAnim }]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15` }]}>
                  <Ionicons name="calendar" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    {nextAppointment.doctorName || nextAppointment.with || 'Appointment'}
                  </Text>
                  <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
                    {nextAppointment.date?.toDate ? 
                      nextAppointment.date.toDate().toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : 
                      nextAppointment.date || 'Date not specified'
                    }
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
                const aptDateObj = nextAppointment?.date?.toDate ? nextAppointment.date.toDate() : (nextAppointment?.date ? new Date(nextAppointment.date) : null);
                const canShow = aptDateObj ? (aptDateObj <= new Date()) : false;
                if (nextAppointment.attended) {
                  return (
                    <View style={styles.attendedBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      <Text style={[styles.attendedText, { color: colors.primary }]}>
                        {nextAppointment.attendedAt ? (
                          nextAppointment.attendedAt.toDate ? 
                            `Attended on ${nextAppointment.attendedAt.toDate().toLocaleDateString()}` : 
                            `Attended on ${new Date(nextAppointment.attendedAt).toLocaleDateString()}`
                        ) : 'Attended'}
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

          {/* Health Tip */}
          <Animated.View 
            style={[styles.card, styles.tipCard, { backgroundColor: colors.card, opacity: fadeAnim }]}
          >
            <View style={styles.tipHeader}>
              <View style={[styles.tipIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="bulb" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.tipTitle, { color: colors.text }]}>Health Tip</Text>
            </View>
            <Text style={[styles.tipContent, { color: colors.subtext }]}>{randomFact}</Text>
            <View style={styles.tipFooter}>
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: colors.primary }]}
                onPress={async () => {
                  const personal = await fetchAIPersonalTip();
                  if (personal) {
                    setRandomFact(personal);
                    setAIFactSource('ai');
                    return;
                  }

                  const ai = await fetchAIFact(Object.keys(healthFacts)[Math.floor(Math.random() * Object.keys(healthFacts).length)], 'fact');
                  if (ai) { setRandomFact(ai); setAIFactSource('ai'); }
                  else { setAIFactSource('preset'); }
                }}
                disabled={aiFactLoading}
                activeOpacity={0.8}
              >
                {aiFactLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#fff" />
                    <Text style={styles.generateText}>Generate Tip</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.sourceText, { color: colors.subtext }]}>
                {aiFactSource === 'ai' ? 'AI Generated' : 'Preset'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingTop: 16,
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
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  searchButton: {
    height: 50,
    width: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultCard: {
    borderWidth: 1,
    marginBottom: 16,
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
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    marginBottom: 14,
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
  tipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  generateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sourceText: {
    fontSize: 12,
    opacity: 0.7,
  },
});