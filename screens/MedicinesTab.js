import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { cancelMedicineNotifications } from '../utils/NotificationManager';

const { width } = Dimensions.get('window');

const MedicineDoseStatus = ({ medicine, handleDelete }) => {
  const { colors } = useTheme();
  const [now, setNow] = useState(new Date());

  // Reduce interval frequency from 1 minute to 5 minutes for better performance
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsTaken = async (medicineId) => {
    try {
      const medicineRef = doc(db, "medicines", medicineId);
      await updateDoc(medicineRef, {
        takenTimestamps: arrayUnion(new Date())
      });
    } catch (error) {
      console.error('Error marking medicine as taken:', error);
      Alert.alert('Error', 'Failed to mark medicine as taken. Please try again.');
    }
  };

  // ✅ Medicine remaining calculation with proper validation
  const medicineRemainingInfo = useMemo(() => {
    let text = '';
    let color = colors.subtext;
    
    // Validate medicine data
    if (!medicine.quantity || medicine.quantity <= 0) {
      return { text: 'Quantity not specified', color: colors.subtext };
    }

    // Calculate total doses taken
    const totalDosesTaken = medicine.takenTimestamps?.length || 0;
    
    // Calculate total doses prescribed
    const totalDosesPrescribed = medicine.quantity;
    
    // Calculate remaining doses
    const remainingDoses = totalDosesPrescribed - totalDosesTaken;
    
    if (remainingDoses <= 0) {
      text = 'Medicine finished';
      color = colors.accent;
    } else if (remainingDoses <= 3) {
      text = `${remainingDoses} dose${remainingDoses > 1 ? 's' : ''} left`;
      color = '#FF6B6B';
    } else if (remainingDoses <= 7) {
      text = `${remainingDoses} dose${remainingDoses > 1 ? 's' : ''} left`;
      color = '#FFA500';
    } else {
      text = `${remainingDoses} dose${remainingDoses > 1 ? 's' : ''} left`;
      color = colors.subtext;
    }
    
    return { text, color };
  }, [medicine.quantity, medicine.takenTimestamps, colors]);

  // ✅ Enhanced dose calculation logic with 1-hour early availability and validation
  const doseStatus = useMemo(() => {
    // Validate required fields
    if (!medicine.times || !Array.isArray(medicine.times) || medicine.times.length === 0) {
      return { type: 'error', message: 'Invalid schedule' };
    }

    const scheduleTimes = medicine.times.map(ts => {
      try {
        if (ts instanceof Date) return new Date(ts);
        if (ts && typeof ts.toDate === 'function') return ts.toDate();
        return new Date(ts);
      } catch (error) {
        console.warn('Invalid time format:', ts);
        return null;
      }
    }).filter(time => time && !isNaN(time.getTime()));

    if (scheduleTimes.length === 0) {
      return { type: 'error', message: 'No valid schedule times' };
    }

    const takenTimes = (medicine.takenTimestamps || []).map(ts => {
      try {
        if (ts instanceof Date) return new Date(ts);
        if (ts && typeof ts.toDate === 'function') return ts.toDate();
        return new Date(ts);
      } catch (error) {
        console.warn('Invalid timestamp format:', ts);
        return null;
      }
    }).filter(time => time && !isNaN(time.getTime()));

    scheduleTimes.sort((a, b) => a.getHours() * 60 + a.getMinutes() - (b.getHours() * 60 + b.getMinutes()));

    let nextDoseTime = null;
    let isDoseDue = false;
    let isDoseAvailable = false;
    let doseToTake = null;
    let timeUntilDose = null;

    // Check for doses that are available (1 hour before) or due
    for (const time of scheduleTimes) {
      const doseTimeToday = new Date(now);
      doseTimeToday.setHours(time.getHours(), time.getMinutes(), 0, 0);
      
      const oneHourBefore = new Date(doseTimeToday.getTime() - 60 * 60 * 1000);
      const oneHourAfter = new Date(doseTimeToday.getTime() + 60 * 60 * 1000);
      
      const alreadyTaken = takenTimes.some(takenTime => 
        takenTime >= oneHourBefore && takenTime <= oneHourAfter
      );

      if (now >= oneHourBefore && now <= oneHourAfter && !alreadyTaken) {
        if (now >= doseTimeToday) {
          isDoseDue = true;
          doseToTake = doseTimeToday;
        } else {
          isDoseAvailable = true;
          doseToTake = doseTimeToday;
          timeUntilDose = Math.ceil((doseTimeToday - now) / (1000 * 60));
        }
        break;
      }

      if (doseTimeToday > now) {
        nextDoseTime = doseTimeToday;
        break;
      }
    }

    const allDosesDone = !nextDoseTime && !isDoseDue && !isDoseAvailable;

    if (isDoseDue) {
      return { 
        type: 'due', 
        doseTime: doseToTake,
        message: `Dose due at ${doseToTake.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };
    } else if (isDoseAvailable) {
      return { 
        type: 'available', 
        doseTime: doseToTake,
        timeUntil: timeUntilDose,
        message: `Available in ${timeUntilDose} min`
      };
    } else if (allDosesDone) {
      return { type: 'completed', message: 'All doses taken for today!' };
    } else if (nextDoseTime) {
      return { 
        type: 'next', 
        doseTime: nextDoseTime,
        message: `Next dose at ${nextDoseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };
    } else {
      return { type: 'unknown', message: 'Check schedule' };
    }
  }, [medicine.times, medicine.takenTimestamps, now]);

  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      {/* Header with medicine name and delete button */}
      <View style={styles.cardHeader}>
        <View style={styles.medicineInfo}>
          <Text style={styles.medicineName}>{medicine.name}</Text>
          {medicine.dosage && (
            <Text style={styles.dosageText}>{medicine.dosage}</Text>
          )}
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDelete(medicine)}
          accessibilityLabel={`Delete ${medicine.name}`}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={20} color={colors.subtext} />
        </TouchableOpacity>
      </View>

      {/* Body with dose status and action button */}
      <View style={styles.cardBody}>
        {doseStatus.type === 'due' ? (
          <View style={styles.doseStatusContainer}>
            <View style={styles.doseStatusHeader}>
              <Ionicons name="time" size={20} color="#FF6B6B" />
              <Text style={styles.doseStatusText}>
                {doseStatus.message}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.takeButton, styles.takeButtonDue]} 
              onPress={() => handleMarkAsTaken(medicine.id)}
              accessibilityLabel={`Take ${medicine.name} now`}
              accessibilityRole="button"
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.takeButtonText}>Take Now</Text>
            </TouchableOpacity>
          </View>
        ) : doseStatus.type === 'available' ? (
          <View style={styles.doseStatusContainer}>
            <View style={styles.doseStatusHeader}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.doseStatusText}>
                {doseStatus.message}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.takeButton, styles.takeButtonAvailable]} 
              onPress={() => handleMarkAsTaken(medicine.id)}
              accessibilityLabel={`Take ${medicine.name} early`}
              accessibilityRole="button"
            >
              <Ionicons name="medical" size={20} color="#fff" />
              <Text style={styles.takeButtonText}>Take Early</Text>
            </TouchableOpacity>
          </View>
        ) : doseStatus.type === 'completed' ? (
          <View style={styles.doseStatusContainer}>
            <View style={styles.doseStatusHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.doseStatusText}>{doseStatus.message}</Text>
            </View>
          </View>
        ) : doseStatus.type === 'next' ? (
          <View style={styles.doseStatusContainer}>
            <View style={styles.doseStatusHeader}>
              <Ionicons name="time-outline" size={20} color={colors.subtext} />
              <Text style={styles.doseStatusText}>
                {doseStatus.message}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.doseStatusContainer}>
            <View style={styles.doseStatusHeader}>
              <Ionicons name="help-circle-outline" size={20} color={colors.subtext} />
              <Text style={styles.doseStatusText}>{doseStatus.message}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Footer with medicine remaining and schedule info */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Ionicons name="medical-outline" size={16} color={medicineRemainingInfo.color} />
          <Text style={[styles.footerText, { color: medicineRemainingInfo.color }]}>
            {medicineRemainingInfo.text}
          </Text>
        </View>
        <View style={styles.footerRight}>
          <Ionicons name="time-outline" size={16} color={colors.subtext} />
          <Text style={styles.footerText}>
            {medicine.times?.length || 0} dose{(medicine.times?.length || 0) > 1 ? 's' : ''} daily
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function MedicinesTab({ route }) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [allMedicines, setAllMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create styles early so they're available for all return statements
  const styles = createStyles(colors);

  const searchQuery = route.params?.searchQuery || '';
  const isFocused = useIsFocused();

  // Memoized filtered medicines for better performance
  const memoizedFilteredMedicines = useMemo(() => {
    if (searchQuery) {
      return allMedicines.filter(med =>
        med.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return allMedicines;
  }, [allMedicines, searchQuery]);

  useEffect(() => {
    if (!isFocused || !auth.currentUser) {
      setAllMedicines([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const userId = auth.currentUser.uid;
    const q = query(collection(db, 'medicines'), where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        try {
          const medicines = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
          setAllMedicines(medicines);
          setLoading(false);
        } catch (error) {
          console.error('Error processing medicines data:', error);
          setError('Failed to load medicines');
          setLoading(false);
        }
      },
      (error) => {
        console.error('Error fetching medicines:', error);
        setError('Failed to load medicines');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isFocused]);

  // Update filtered medicines when memoized value changes
  useEffect(() => {
    setFilteredMedicines(memoizedFilteredMedicines);
  }, [memoizedFilteredMedicines]);

  const handleDelete = useCallback(async (medicine) => {
    Alert.alert("Delete Medicine", "Are you sure? This will cancel all future reminders.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", 
        onPress: async () => {
          try {
            // Cancel notifications first
            if (medicine.notificationIds && medicine.notificationIds.length > 0) {
              for (const id of medicine.notificationIds) {
                await Notifications.cancelScheduledNotificationAsync(id);
              }
            }
            
            // Also cancel any notifications managed by our NotificationManager
            await cancelMedicineNotifications(medicine.id);
            
            // Delete from database
            await deleteDoc(doc(db, "medicines", medicine.id));
          } catch (error) {
            console.error('Error deleting medicine:', error);
            Alert.alert('Error', 'Failed to delete medicine. Please try again.');
          }
        },
        style: "destructive"
      }
    ]);
  }, []);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading medicines...</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredMedicines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MedicineDoseStatus medicine={item} handleDelete={handleDelete} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={64} color={colors.subtext} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No results found' : 'No medicines added yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search terms' : 'Add your first medicine to get started'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMedicine')}
        activeOpacity={0.8}
        accessibilityLabel="Add new medicine"
        accessibilityRole="button"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  loadingContainer: {
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
  listContainer: { 
    padding: 16,
    paddingBottom: 80, // Extra space for FAB
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 28,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    padding: 16,
    paddingBottom: 12,
  },
  medicineInfo: {
    flex: 1,
    marginRight: 12,
  },
  medicineName: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: colors.text,
    marginBottom: 4,
  },
  dosageText: {
    fontSize: 14,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  cardBody: { 
    paddingHorizontal: 16, 
    paddingBottom: 16 
  },
  doseStatusContainer: {
    alignItems: 'center',
  },
  doseStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  doseStatusText: { 
    fontSize: 16, 
    color: colors.text, 
    fontWeight: '500',
  },
  takeButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: width * 0.6,
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  takeButtonDue: {
    backgroundColor: '#FF6B6B',
  },
  takeButtonAvailable: {
    backgroundColor: colors.primary,
  },
  takeButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    alignItems: 'center', 
    padding: 16, 
    borderTopWidth: 1, 
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: { 
    fontSize: 13, 
    color: colors.subtext,
    fontWeight: '500',
  },
});
