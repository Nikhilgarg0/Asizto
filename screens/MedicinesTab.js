import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Dimensions, Modal, TextInput } from 'react-native';
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requireConfirmTyping, setRequireConfirmTyping] = useState(true);
  const [confirmText, setConfirmText] = useState('');
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

  const handleDelete = useCallback((medicine) => {
    // open confirm modal
    setMedicineToDelete(medicine);
    setDeleteModalVisible(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!medicineToDelete) return;
    setIsDeleting(true);
    try {
      const medicine = medicineToDelete;
      // Cancel notifications first
      if (medicine.notificationIds && medicine.notificationIds.length > 0) {
        for (const id of medicine.notificationIds) {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch (e) {
            console.warn('Failed to cancel scheduled notification', id, e);
          }
        }
      }

      // Also cancel any notifications managed by our NotificationManager
      try {
        await cancelMedicineNotifications(medicine.id);
      } catch (e) {
        console.warn('NotificationManager cancel failed', e);
      }

      // Delete from database
      await deleteDoc(doc(db, "medicines", medicine.id));
      setDeleteModalVisible(false);
      setMedicineToDelete(null);
    } catch (error) {
      console.error('Error deleting medicine:', error);
      Alert.alert('Error', 'Failed to delete medicine. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [medicineToDelete]);

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
            <TouchableOpacity
              onPress={() => navigation.navigate('AddMedicine')}
              style={[styles.emptyActionButton, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
            >
              <Text style={[styles.emptyActionText]}>Add Medicine</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />
      {/* Delete confirmation modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) setDeleteModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="warning-outline" size={48} color={colors.accent} />
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Medicine</Text>
            <Text style={[styles.modalMessage, { color: colors.subtext }]}>This will cancel all future reminders. This action cannot be undone.</Text>

            {/* Optional type-to-confirm flow */}
            {requireConfirmTyping && (
              <View style={{ width: '100%', marginTop: 12 }}>
                <Text style={{ color: colors.subtext, marginBottom: 6, textAlign: 'center' }}>Type <Text style={{ fontWeight: '700' }}>DELETE</Text> to confirm</Text>
                <TextInput
                  placeholder="Type DELETE to confirm"
                  placeholderTextColor={colors.subtext}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  style={[styles.confirmInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  autoCapitalize="characters"
                />
              </View>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.background }]}
                onPress={() => {
                  if (!isDeleting) {
                    setDeleteModalVisible(false);
                    setConfirmText('');
                  }
                }}
                disabled={isDeleting}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.accent, opacity: (isDeleting || (requireConfirmTyping && confirmText !== 'DELETE')) ? 0.6 : 1 }]}
                onPress={confirmDelete}
                disabled={isDeleting || (requireConfirmTyping && confirmText !== 'DELETE')}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  emptyActionButton: {
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 2,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: 18,
    width: '100%',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
    confirmInput: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 6,
  },
});
