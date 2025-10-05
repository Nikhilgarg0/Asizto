import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Dimensions, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { cancelMedicineNotifications } from '../utils/NotificationManager';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

const MedicineDoseStatus = ({ medicine, handleDelete, index }) => {
  const { colors, theme } = useTheme();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 300000);
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

  const medicineRemainingInfo = useMemo(() => {
    let text = '';
    let color = colors.subtext;
    let icon = 'medical-outline';
    
    if (!medicine.quantity || medicine.quantity <= 0) {
      return { text: 'Quantity not specified', color: colors.subtext, icon: 'help-circle-outline' };
    }

    const totalDosesTaken = medicine.takenTimestamps?.length || 0;
    const totalDosesPrescribed = medicine.quantity;
    const remainingDoses = totalDosesPrescribed - totalDosesTaken;
    
    if (remainingDoses <= 0) {
      text = 'Medicine finished';
      color = '#95a5a6';
      icon = 'close-circle';
    } else if (remainingDoses <= 3) {
      text = `${remainingDoses} dose${remainingDoses > 1 ? 's' : ''} left`;
      color = '#e74c3c';
      icon = 'alert-circle';
    } else if (remainingDoses <= 7) {
      text = `${remainingDoses} dose${remainingDoses > 1 ? 's' : ''} left`;
      color = '#f39c12';
      icon = 'warning';
    } else {
      text = `${remainingDoses} dose${remainingDoses > 1 ? 's' : ''} left`;
      color = '#27ae60';
      icon = 'checkmark-circle';
    }
    
    return { text, color, icon };
  }, [medicine.quantity, medicine.takenTimestamps, colors]);

  const doseStatus = useMemo(() => {
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
        message: `Due at ${doseToTake.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };
    } else if (isDoseAvailable) {
      return { 
        type: 'available', 
        doseTime: doseToTake,
        timeUntil: timeUntilDose,
        message: `Available in ${timeUntilDose} min`
      };
    } else if (allDosesDone) {
      return { type: 'completed', message: 'All doses taken today' };
    } else if (nextDoseTime) {
      return { 
        type: 'next', 
        doseTime: nextDoseTime,
        message: `Next: ${nextDoseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      };
    } else {
      return { type: 'unknown', message: 'Check schedule' };
    }
  }, [medicine.times, medicine.takenTimestamps, now]);

  const getStatusColor = () => {
    switch (doseStatus.type) {
      case 'due': return '#e74c3c';
      case 'available': return colors.primary;
      case 'completed': return '#27ae60';
      case 'next': return colors.subtext;
      default: return colors.subtext;
    }
  };

  const styles = createStyles(colors, theme);

  return (
    <Animatable.View animation="fadeInUp" duration={500} delay={index * 50}>
      <View style={styles.medicineCard}>
        {/* Status Bar Indicator */}
        <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]} />
        
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.medicineHeaderLeft}>
            <View style={[styles.medicineIcon, { backgroundColor: `${getStatusColor()}15` }]}>
              <Ionicons name="medical" size={22} color={getStatusColor()} />
            </View>
            <View style={styles.medicineInfo}>
              <Text style={styles.medicineName} numberOfLines={1}>{medicine.name}</Text>
              {medicine.dosage && (
                <Text style={styles.dosageText} numberOfLines={1}>{medicine.dosage}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDelete(medicine)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>

        {/* Status Section */}
        <View style={styles.statusSection}>
          {doseStatus.type === 'due' ? (
            <>
              <View style={styles.statusBadge}>
                <Ionicons name="alarm" size={18} color="#e74c3c" />
                <Text style={[styles.statusText, { color: '#e74c3c' }]}>
                  {doseStatus.message}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonDue]} 
                onPress={() => handleMarkAsTaken(medicine.id)}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Take Now</Text>
              </TouchableOpacity>
            </>
          ) : doseStatus.type === 'available' ? (
            <>
              <View style={styles.statusBadge}>
                <Ionicons name="time" size={18} color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.primary }]}>
                  {doseStatus.message}
                </Text>
              </View>
              <TouchableOpacity 
                style={[styles.actionButton, styles.actionButtonAvailable]} 
                onPress={() => handleMarkAsTaken(medicine.id)}
              >
                <Ionicons name="medical" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Take Early</Text>
              </TouchableOpacity>
            </>
          ) : doseStatus.type === 'completed' ? (
            <View style={styles.statusBadgeFullWidth}>
              <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
              <Text style={[styles.statusText, { color: '#27ae60' }]}>
                {doseStatus.message}
              </Text>
            </View>
          ) : (
            <View style={styles.statusBadgeFullWidth}>
              <Ionicons name="time-outline" size={18} color={colors.subtext} />
              <Text style={[styles.statusText, { color: colors.subtext }]}>
                {doseStatus.message}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <View style={[styles.footerIconCircle, { backgroundColor: `${medicineRemainingInfo.color}15` }]}>
              <Ionicons name={medicineRemainingInfo.icon} size={16} color={medicineRemainingInfo.color} />
            </View>
            <Text style={[styles.footerText, { color: medicineRemainingInfo.color }]}>
              {medicineRemainingInfo.text}
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerItem}>
            <View style={[styles.footerIconCircle, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name="repeat" size={16} color={colors.primary} />
            </View>
            <Text style={styles.footerText}>
              {medicine.times?.length || 0}x daily
            </Text>
          </View>
        </View>
      </View>
    </Animatable.View>
  );
};

export default function MedicinesTab({ route }) {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [allMedicines, setAllMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const styles = createStyles(colors, theme);
  const searchQuery = route.params?.searchQuery || '';
  const isFocused = useIsFocused();

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

  useEffect(() => {
    setFilteredMedicines(memoizedFilteredMedicines);
  }, [memoizedFilteredMedicines]);

  const handleDelete = useCallback((medicine) => {
    setMedicineToDelete(medicine);
    setDeleteModalVisible(true);
    setConfirmText('');
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!medicineToDelete) return;
    setIsDeleting(true);
    try {
      const medicine = medicineToDelete;
      if (medicine.notificationIds && medicine.notificationIds.length > 0) {
        for (const id of medicine.notificationIds) {
          try {
            await Notifications.cancelScheduledNotificationAsync(id);
          } catch (e) {
            console.warn('Failed to cancel scheduled notification', id, e);
          }
        }
      }

      try {
        await cancelMedicineNotifications(medicine.id);
      } catch (e) {
        console.warn('NotificationManager cancel failed', e);
      }

      await deleteDoc(doc(db, "medicines", medicine.id));
      setDeleteModalVisible(false);
      setMedicineToDelete(null);
      setConfirmText('');
    } catch (error) {
      console.error('Error deleting medicine:', error);
      Alert.alert('Error', 'Failed to delete medicine. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [medicineToDelete]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = allMedicines.length;
    const dueNow = allMedicines.filter(med => {
      // Simple check - you can enhance this
      return med.times && med.times.length > 0;
    }).length;
    const completed = allMedicines.filter(med => {
      const taken = med.takenTimestamps?.length || 0;
      const prescribed = med.quantity || 0;
      return prescribed > 0 && taken >= prescribed;
    }).length;

    return { total, dueNow, completed };
  }, [allMedicines]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading medicines...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => setError(null)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      {!searchQuery && allMedicines.length > 0 && (
        <Animatable.View animation="fadeInDown" duration={600} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: `${colors.primary}20` }]}>
              <Ionicons name="medical" size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#fef3e2' }]}>
              <Ionicons name="alarm" size={20} color="#f39c12" />
            </View>
            <Text style={styles.statValue}>{stats.dueNow}</Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#e8f5e9' }]}>
              <Ionicons name="checkmark-done" size={20} color="#27ae60" />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Finished</Text>
          </View>
        </Animatable.View>
      )}

      <FlatList
        data={filteredMedicines}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <MedicineDoseStatus medicine={item} handleDelete={handleDelete} index={index} />
        )}
        ListEmptyComponent={
          <Animatable.View animation="fadeIn" duration={600} style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="medical-outline" size={50} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No results found' : 'No medicines added yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try adjusting your search terms' : 'Track your medications and never miss a dose'}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddMedicine')}
              style={styles.emptyActionButton}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyActionText}>Add Medicine</Text>
            </TouchableOpacity>
          </Animatable.View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      {/* Delete Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
            setConfirmText('');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="zoomIn" duration={300} style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={48} color="#e74c3c" />
            </View>
            <Text style={styles.modalTitle}>Delete Medicine</Text>
            <Text style={styles.modalMessage}>
              This will cancel all future reminders for <Text style={styles.modalMedicineName}>{medicineToDelete?.name}</Text>. This action cannot be undone.
            </Text>

            <View style={styles.confirmInputContainer}>
              <Text style={styles.confirmLabel}>
                Type <Text style={styles.confirmHighlight}>DELETE</Text> to confirm
              </Text>
              <TextInput
                placeholder="DELETE"
                placeholderTextColor={colors.subtext}
                value={confirmText}
                onChangeText={setConfirmText}
                style={styles.confirmInput}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  if (!isDeleting) {
                    setDeleteModalVisible(false);
                    setConfirmText('');
                  }
                }}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.modalDeleteButton,
                  (isDeleting || confirmText !== 'DELETE') && styles.modalButtonDisabled
                ]}
                onPress={confirmDelete}
                disabled={isDeleting || confirmText !== 'DELETE'}
              >
                <Text style={styles.modalDeleteText}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animatable.View>
        </View>
      </Modal>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddMedicine')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors, theme) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.subtext,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    color: colors.text,
  },
  errorMessage: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    color: colors.subtext,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
  },

  // List
  listContainer: { 
    padding: 16,
    paddingBottom: 100,
  },

  // Medicine Card
  medicineCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme === 'dark' ? 0.3 : 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBar: {
    height: 3,
    width: '100%',
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 14,
    paddingBottom: 10,
  },
  medicineHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  medicineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: { 
    fontSize: 17, 
    fontWeight: '800', 
    color: colors.text,
    marginBottom: 3,
  },
  dosageText: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${colors.background}80`,
  },

  // Status Section
  statusSection: { 
    paddingHorizontal: 14, 
    paddingBottom: 14,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  statusBadgeFullWidth: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  statusText: { 
    fontSize: 15, 
    fontWeight: '600',
  },
  actionButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    minWidth: width * 0.5,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonDue: {
    backgroundColor: '#e74c3c',
  },
  actionButtonAvailable: {
    backgroundColor: colors.primary,
  },
  actionButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700' 
  },

  // Footer
  cardFooter: { 
    flexDirection: 'row', 
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  footerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  footerText: { 
    fontSize: 12, 
    color: colors.text,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyActionText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    color: colors.subtext,
    marginBottom: 8,
  },
  modalMedicineName: {
    fontWeight: '700',
    color: colors.text,
  },
  confirmInputContainer: {
    width: '100%',
    marginTop: 16,
    marginBottom: 20,
  },
  confirmLabel: {
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmHighlight: {
    fontWeight: '800',
    color: '#e74c3c',
  },
  confirmInput: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  modalDeleteButton: {
    backgroundColor: '#e74c3c',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalDeleteText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // FAB
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 30,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
});