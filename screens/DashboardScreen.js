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
  const calculateHealthScore = useCallback((userMedicines, profile) => {
    try {
      let score = 0;
      let factors = 0;

      // Medicine adherence (30% of score)
      if (userMedicines.length > 0) {
        const totalDoses = userMedicines.reduce((sum, med) => sum + (med.quantity || 0), 0);
        const takenDoses = userMedicines.reduce((sum, med) => sum + (med.takenTimestamps?.length || 0), 0);
        const adherence = totalDoses > 0 ? (takenDoses / totalDoses) * 100 : 100;
        score += (adherence * 0.3);
        factors++;
      }

      // Profile completeness (20% of score)
      const profileFields = ['age', 'weight', 'height', 'conditions'];
      const completedFields = profileFields.filter(field => profile[field]).length;
      const profileScore = (completedFields / profileFields.length) * 100;
      score += (profileScore * 0.2);
      factors++;

      // Appointment attendance (25% of score)
      if (appointments.length > 0) {
        const recentAppointments = appointments.filter(apt => {
          const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
          return aptDate > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        });
        const attendanceScore = recentAppointments.length > 0 ? 100 : 80;
        score += (attendanceScore * 0.25);
        factors++;
      }

      // Health metrics (25% of score)
      if (profile.weight && profile.height) {
        const bmi = parseFloat(profile.weight) / Math.pow(parseFloat(profile.height) / 100, 2);
        let bmiScore = 100;
        if (bmi < 18.5 || bmi > 30) bmiScore = 60;
        else if (bmi < 20 || bmi > 28) bmiScore = 80;
        score += (bmiScore * 0.25);
        factors++;
      }

      // Normalize score if we have factors
      const finalScore = factors > 0 ? Math.round(score / factors) : 75;
      setHealthScore(finalScore);
      
      logger.info('Health score calculated', { score: finalScore, factors });
    } catch (error) {
      logger.error('Error calculating health score', error);
      setHealthScore(75); // Fallback
    }
  }, [appointments]);

  // Enhanced BMI calculation with validation
  const bmiData = useMemo(() => {
    if (!userProfile.weight || !userProfile.height) {
      return { value: null, category: "N/A", status: "incomplete" };
    }
    
    try {
      const h = parseFloat(userProfile.height) / 100;
      const w = parseFloat(userProfile.weight);
      
      if (h === 0 || w === 0) return { value: null, category: "N/A", status: "invalid" };
      
      const bmi = (w / (h * h)).toFixed(1);
      let category = "Unknown";
      let status = "normal";
      
      if (bmi < 18.5) {
        category = "Underweight";
        status = "warning";
      } else if (bmi >= 18.5 && bmi <= 24.9) {
        category = "Normal Weight";
        status = "healthy";
      } else if (bmi >= 25 && bmi <= 29.9) {
        category = "Overweight";
        status = "warning";
      } else {
        category = "Obesity";
        status = "critical";
      }
      
      return { value: bmi, category, status };
    } catch (error) {
      logger.error('BMI calculation error', error);
      return { value: null, category: "Error", status: "error" };
    }
  }, [userProfile.weight, userProfile.height]);

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
      calculateHealthScore(medicines, userProfile);
      setLoading(false);
    }
  }, [sectionLoading, medicines, userProfile, calculateHealthScore]);

  // Random fact effect with category rotation
  useEffect(() => {
    const categories = Object.keys(healthFacts);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const categoryFacts = healthFacts[randomCategory];
    setRandomFact(categoryFacts[Math.floor(Math.random() * categoryFacts.length)]);
  }, []);

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

          {/* Enhanced Next Medicine Section */}
          {medicines.length > 0 && (
            <Animatable.View animation="fadeInUp" duration={600} style={[styles.card, {backgroundColor: colors.card}]}>
              <Text style={[styles.cardTitle, { color: colors.subtext }]}>Next Medicine</Text>
              {nextDoseStatus ? (
                <>
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
                      <Text style={styles.buttonText}>
                        Take Now
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
                  No more doses scheduled for today.
                </Text>
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
            </Animatable.View>
          )}

          {/* Enhanced Health Fact Section */}
          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <Text style={[styles.cardTitle, { color: colors.subtext }]}>💡 Health Tip</Text>
            <Text style={[styles.cardSubContent, { color: colors.subtext }]}>{randomFact}</Text>
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
});
