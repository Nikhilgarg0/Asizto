// DashboardScreen.js (updated)
import React, { useState, useEffect } from 'react';
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
  TouchableWithoutFeedback
} from 'react-native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import { GEMINI_API_KEY } from '../apiKeys';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';

const healthFacts = [
  "Drinking enough water can help improve your metabolism.",
  "A good laugh can improve your blood flow and immune system.",
  "Taking a 10-minute walk can boost your energy for up to 2 hours.",
  "Good posture can improve your mood and reduce stress.",
  "Getting 7-9 hours of sleep per night is crucial for your health.",
];

export default function DashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const [userName, setUserName] = useState('');
  const [userProfile, setUserProfile] = useState({});
  const [medicines, setMedicines] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [randomFact, setRandomFact] = useState('');
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');

  const calculateHealthScore = (userMedicines, profile) => {
    // This logic can be expanded as per previous discussions
    setHealthScore(75); // dummy fallback
  };
  const calculateBMI = () => {
    if (!userProfile.weight || !userProfile.height) return { value: null, category: "N/A" };
    const h = parseFloat(userProfile.height) / 100;
    const w = parseFloat(userProfile.weight);
    if (h === 0) return { value: null, category: "N/A"};
    const bmi = (w / (h * h)).toFixed(1);
    let category = "Unknown";
    if (bmi < 18.5) category = "Underweight";
    else if (bmi >= 18.5 && bmi <= 24.9) category = "Normal Weight";
    else if (bmi >= 25 && bmi <= 29.9) category = "Overweight";
    else category = "Obesity";
    return { value: bmi, category };
  };

  // --- REPLACED: Real next-dose logic (from MedicinesTab) ---
  const getNextDoseStatus = () => {
    if (!medicines || medicines.length === 0) return null;

    const now = new Date();
    for (const med of medicines) {
      const scheduleTimes = med.times?.map(ts => ts.toDate()) || [];
      const takenTimes = med.takenTimestamps?.map(ts => ts.toDate()) || [];

      scheduleTimes.sort(
        (a, b) =>
          a.getHours() * 60 +
          a.getMinutes() -
          (b.getHours() * 60 + b.getMinutes())
      );

      for (const time of scheduleTimes) {
        const doseTimeToday = new Date(now);
        doseTimeToday.setHours(time.getHours(), time.getMinutes(), 0, 0);

        const oneHourBefore = new Date(doseTimeToday.getTime() - 60 * 60 * 1000);
        const oneHourAfter = new Date(doseTimeToday.getTime() + 60 * 60 * 1000);

        const alreadyTaken = takenTimes.some(
          (taken) => taken >= oneHourBefore && taken <= oneHourAfter
        );

        if (now >= oneHourBefore && now <= oneHourAfter && !alreadyTaken) {
          return { medicine: med, isDue: true, doseTime: doseTimeToday };
        }

        if (doseTimeToday > now) {
          return { medicine: med, isDue: false, doseTime: doseTimeToday };
        }
      }
    }
    return null;
  };
  // --- end replacement ---

  const getScoreColor = () => {
    if (healthScore === null || isNaN(healthScore)) return colors.subtext;
    if (healthScore >= 80) return '#4CAF50';
    if (healthScore >= 50) return '#FFC107';
    return '#F44336';
  };
  const handleMarkAsTaken = async (medicineId) => {
    const medicineRef = doc(db, "medicines", medicineId);
    await updateDoc(medicineRef, { takenTimestamps: arrayUnion(new Date()) });
  };
  const handleSearch = async () => {
    if (searchText.trim() === '') return;
    setIsSearching(true);
    setSearchResult('');
    try {
      const prompt = `Provide a brief, one-paragraph summary for the medicine: "${searchText}". Include its primary use and one or two common side effects. Format it as a simple paragraph.`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "contents": [{ "parts": [{ "text": prompt }] }] })
        }
      );
      const data = await response.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "No data found.";
      setSearchResult(summary.trim());
    } catch (e) {
      setSearchResult("Error fetching medicine info.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    setRandomFact(healthFacts[Math.floor(Math.random() * healthFacts.length)]);
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const userDocRef = doc(db, "users", userId);

    const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
      const userData = docSnap.exists() ? docSnap.data() : {};
      setUserProfile(userData);
      setUserName(userData.firstName || 'User');
    });

    const medQuery = query(collection(db, 'medicines'), where('userId', '==', userId));
    const unsubscribeMeds = onSnapshot(medQuery, (snapshot) => {
      const medsData = snapshot.docs.map(d => ({ ...d.data(), id: d.id }));
      setMedicines(medsData);
      setLoading(false);
    });

    const apptQuery = query(collection(db, 'appointments'), where('userId', '==', userId));
    const unsubscribeAppts = onSnapshot(apptQuery, (snapshot) => {
        setAppointments(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
    });

    return () => {
      unsubscribeProfile();
      unsubscribeMeds();
      unsubscribeAppts();
    };
  }, []);

  useEffect(() => {
    if (!loading && medicines && userProfile) {
      calculateHealthScore(medicines, userProfile);
    }
  }, [medicines, userProfile, loading]);

  if (loading) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const bmiData = calculateBMI();
  const nextDoseStatus = getNextDoseStatus();
  const nextAppointment = appointments[0];

  return (
    // KeyboardAvoidingView ensures content lifts above keyboard.
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80} // tweak if you have a header height
    >
      {/* TouchableWithoutFeedback dismisses keyboard when tapping outside */}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[styles.container, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.greeting, { color: colors.text }]}>Hello, {userName}</Text>
          <Text style={[styles.subGreeting, { color: colors.subtext }]}>Here's your health summary.</Text>
          
          <View style={styles.searchContainer}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              placeholder="Get quick info on any medicine..."
              placeholderTextColor={colors.subtext}
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity style={[styles.searchButton, { backgroundColor: colors.primary }]} onPress={handleSearch}>
              <Ionicons name="search" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {isSearching && <ActivityIndicator style={{ marginVertical: 20 }} color={colors.primary} />}
          {searchResult && (
            <Animatable.View animation="fadeIn" style={[styles.card, { borderColor: colors.primary, borderWidth: 1 }]}>
              <Text style={[styles.cardTitle, { color: colors.primary }]}>Summary for {searchText}</Text>
              <Text style={[styles.cardSubContent, { color: colors.subtext }]}>{searchResult}</Text>
            </Animatable.View>
          )}

          <View style={styles.metricsContainer}>
            <View style={[styles.card, styles.metricCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.subtext }]}>Health Score</Text>
              <Text style={[styles.metricValue, { color: getScoreColor() }]}>{healthScore ?? 'N/A'}{healthScore && '%'}</Text>
            </View>
            <View style={[styles.card, styles.metricCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.subtext }]}>Your BMI</Text>
              <Text style={[styles.metricValue, { color: colors.text }]}>{bmiData.value || 'N/A'}</Text>
            </View>
          </View>

          {medicines.length > 0 && (
            <Animatable.View animation="fadeInUp" duration={600} style={[styles.card, {backgroundColor: colors.card}]}>
                <Text style={[styles.cardTitle, { color: colors.subtext }]}>Next Medicine</Text>
                {nextDoseStatus ? (
                    <>
                        <Text style={[styles.cardContent, {color: colors.text}]}>{nextDoseStatus.medicine.name}</Text>
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
                                <Text style={styles.buttonText}>{`Take ${nextDoseStatus.doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</Text>
                            </TouchableOpacity>
                        )}
                    </>
                ) : (
                    <Text style={[styles.cardSubContent, { color: colors.subtext }]}>No more doses scheduled for today.</Text>
                )}
            </Animatable.View>
          )}

          {appointments.length > 0 && (
            <Animatable.View animation="fadeInUp" duration={600} delay={100} style={[styles.card, {backgroundColor: colors.card}]}>
                <Text style={[styles.cardTitle, { color: colors.subtext }]}>Upcoming Appointment</Text>
                <Text style={[styles.cardContent, {color: colors.text}]}>{nextAppointment.doctorName}</Text>
                <Text style={[styles.cardSubContent, { color: colors.subtext }]}>{nextAppointment.date}</Text>
            </Animatable.View>
          )}

          <View style={[styles.card, {backgroundColor: colors.card}]}>
            <Text style={[styles.cardTitle, { color: colors.subtext }]}>Health Fact</Text>
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
  button: { // New style for the custom button
    marginTop: 15,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { // New style for the custom button text
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
