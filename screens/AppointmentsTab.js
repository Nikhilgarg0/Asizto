// screens/AppointmentsTab.js - Enhanced Version
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';
import * as Notifications from 'expo-notifications';
import * as Animatable from 'react-native-animatable';

const { width } = Dimensions.get('window');

export default function AppointmentsTab() {
  const { colors, theme } = useTheme();
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }
    const userId = auth.currentUser.uid;
    const q = query(collection(db, 'appointments'), where('userId', '==', userId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const appointmentsData = [];
      querySnapshot.forEach((document) => {
        appointmentsData.push({ ...document.data(), id: document.id });
      });
      setAppointments(appointmentsData);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let filtered = [...appointments];
    
    if (filterStatus === 'upcoming') {
      filtered = filtered.filter(apt => {
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        return aptDate > new Date();
      });
    } else if (filterStatus === 'past') {
      filtered = filtered.filter(apt => {
        const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
        return aptDate <= new Date();
      });
    }
    
    filtered.sort((a, b) => {
      const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
      const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
      
      switch (sortBy) {
        case 'date':
          return dateA - dateB;
        case 'doctor':
          return (a.doctorName || a.with || '').localeCompare(b.doctorName || b.with || '');
        default:
          return dateA - dateB;
      }
    });
    
    setFilteredAppointments(filtered);
  }, [appointments, sortBy, filterStatus]);

  const handleDelete = (appointmentId) => {
    Alert.alert(
      "Delete Appointment",
      "Are you sure you want to delete this appointment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              const apptDocRef = doc(db, 'appointments', appointmentId);
              const apptSnap = await getDoc(apptDocRef);
              const data = apptSnap.exists() ? apptSnap.data() : null;
              const ids = data?.notificationIds || [];
              for (const nid of ids) {
                try {
                  await Notifications.cancelScheduledNotificationAsync(nid);
                } catch (e) {
                  console.warn('Failed to cancel notification', nid, e);
                }
              }
              await deleteDoc(apptDocRef);
            } catch (err) {
              console.error('Delete appointment error', err);
              Alert.alert('Error', 'Could not delete appointment.');
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleMarkAttended = async (appointment) => {
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
      Alert.alert('Success', 'Appointment marked as attended.');
    } catch (err) {
      console.error('Mark attended error', err);
      Alert.alert('Error', 'Could not mark appointment as attended.');
    }
  };

  const getTimeUntil = (date) => {
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `in ${days}d ${hours}h`;
    if (hours > 0) return `in ${hours}h`;
    return 'Soon';
  };

  const styles = createStyles(colors, theme);

  const getStatusColor = (item) => {
    if (item.attended) return '#27ae60';
    
    const aptDateObj = item.date && item.date.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : null);
    if (!aptDateObj) return colors.primary;
    
    const now = new Date();
    const diff = aptDateObj - now;
    const hours = diff / (1000 * 60 * 60);
    
    if (diff < 0) return '#95a5a6';
    if (hours <= 24) return '#e74c3c';
    if (hours <= 72) return '#f39c12';
    return colors.primary;
  };

  const getStatusIcon = (item) => {
    if (item.attended) return 'checkmark-circle';
    
    const aptDateObj = item.date && item.date.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : null);
    if (!aptDateObj) return 'calendar';
    
    const now = new Date();
    const diff = aptDateObj - now;
    const hours = diff / (1000 * 60 * 60);
    
    if (diff < 0) return 'time-outline';
    if (hours <= 24) return 'alert-circle';
    return 'calendar';
  };

  const formatAppointmentDate = (date) => {
    if (!date) return '';
    const aptDate = date.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = aptDate.toDateString() === now.toDateString();
    const isTomorrow = aptDate.toDateString() === tomorrow.toDateString();
    
    const timeStr = aptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) return `Today at ${timeStr}`;
    if (isTomorrow) return `Tomorrow at ${timeStr}`;
    
    return aptDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Stats calculation
  const upcomingCount = appointments.filter(apt => {
    const aptDate = apt.date?.toDate ? apt.date.toDate() : new Date(apt.date);
    return aptDate > new Date() && !apt.attended;
  }).length;

  const attendedCount = appointments.filter(apt => apt.attended).length;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.subtext, fontSize: 16 }}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <Animatable.View animation="fadeInDown" duration={600} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: '#fef3e2' }]}>
            <Ionicons name="time" size={24} color="#f39c12" />
          </View>
          <Text style={styles.statValue}>{upcomingCount}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={[styles.statIconCircle, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="checkmark-done" size={24} color="#27ae60" />
          </View>
          <Text style={styles.statValue}>{attendedCount}</Text>
          <Text style={styles.statLabel}>Attended</Text>
        </View>
      </Animatable.View>

      {/* Filter Pills */}
      <Animatable.View animation="fadeIn" duration={600} delay={100}>
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionLabel}>Filter</Text>
          <View style={styles.filterPills}>
            <TouchableOpacity 
              style={[styles.filterPill, filterStatus === 'all' && styles.filterPillActive]}
              onPress={() => setFilterStatus('all')}
            >
              <Ionicons 
                name="apps" 
                size={16} 
                color={filterStatus === 'all' ? '#fff' : colors.text} 
              />
              <Text style={[styles.filterPillText, filterStatus === 'all' && styles.filterPillTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterPill, filterStatus === 'upcoming' && styles.filterPillActive]}
              onPress={() => setFilterStatus('upcoming')}
            >
              <Ionicons 
                name="arrow-forward-circle" 
                size={16} 
                color={filterStatus === 'upcoming' ? '#fff' : colors.text} 
              />
              <Text style={[styles.filterPillText, filterStatus === 'upcoming' && styles.filterPillTextActive]}>
                Upcoming
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterPill, filterStatus === 'past' && styles.filterPillActive]}
              onPress={() => setFilterStatus('past')}
            >
              <Ionicons 
                name="time" 
                size={16} 
                color={filterStatus === 'past' ? '#fff' : colors.text} 
              />
              <Text style={[styles.filterPillText, filterStatus === 'past' && styles.filterPillTextActive]}>
                Past
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterSectionLabel}>Sort by</Text>
          <View style={styles.filterPills}>
            <TouchableOpacity 
              style={[styles.filterPill, sortBy === 'date' && styles.filterPillActive]}
              onPress={() => setSortBy('date')}
            >
              <Ionicons 
                name="calendar-outline" 
                size={16} 
                color={sortBy === 'date' ? '#fff' : colors.text} 
              />
              <Text style={[styles.filterPillText, sortBy === 'date' && styles.filterPillTextActive]}>
                Date
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterPill, sortBy === 'doctor' && styles.filterPillActive]}
              onPress={() => setSortBy('doctor')}
            >
              <Ionicons 
                name="person-outline" 
                size={16} 
                color={sortBy === 'doctor' ? '#fff' : colors.text} 
              />
              <Text style={[styles.filterPillText, sortBy === 'doctor' && styles.filterPillTextActive]}>
                Doctor
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animatable.View>

      {/* Appointments List */}
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const aptDateObj = item.date && item.date.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : null);
          const isPast = aptDateObj ? (aptDateObj <= new Date()) : false;
          const canShowMark = aptDateObj ? (aptDateObj <= new Date()) : false;
          const timeUntil = aptDateObj ? getTimeUntil(aptDateObj) : null;
          const statusColor = getStatusColor(item);
          const statusIcon = getStatusIcon(item);

          return (
            <Animatable.View
              animation="fadeInUp"
              duration={500}
              delay={index * 50}
              style={styles.appointmentCard}
            >
              {/* Status Indicator Bar */}
              <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
              
              {/* Card Header */}
              <View style={styles.appointmentHeader}>
                <View style={styles.appointmentHeaderLeft}>
                  <View style={[styles.doctorIconCircle, { backgroundColor: `${statusColor}15` }]}>
                    <Ionicons name="person" size={20} color={statusColor} />
                  </View>
                  <View style={styles.appointmentHeaderInfo}>
                    <Text style={styles.doctorName} numberOfLines={1}>
                      {item.doctorName || item.with || 'Appointment'}
                    </Text>
                    <Text style={styles.appointmentDateTime}>
                      {formatAppointmentDate(item.date)}
                    </Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  onPress={() => handleDelete(item.id)} 
                  style={styles.deleteIconButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>

              {/* Card Body */}
              {item.location && (
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color={colors.primary} />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              )}

              {/* Time Until Badge */}
              {timeUntil && !item.attended && (
                <View style={styles.timeUntilBadge}>
                  <Ionicons name="timer-outline" size={14} color={statusColor} />
                  <Text style={[styles.timeUntilText, { color: statusColor }]}>
                    {timeUntil}
                  </Text>
                </View>
              )}

              {/* Attended Status */}
              {item.attended && (
                <View style={styles.attendedBanner}>
                  <Ionicons name="checkmark-circle" size={18} color="#27ae60" />
                  <Text style={styles.attendedBannerText}>
                    Attended {item.attendedAt ? (
                      item.attendedAt.toDate 
                        ? `on ${item.attendedAt.toDate().toLocaleDateString()}`
                        : `on ${new Date(item.attendedAt).toLocaleDateString()}`
                    ) : ''}
                  </Text>
                </View>
              )}

              {/* Card Footer */}
              <View style={styles.appointmentFooter}>
                <View style={styles.statusBadge}>
                  <Ionicons name={statusIcon} size={14} color={statusColor} />
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                    {item.attended ? 'Completed' : isPast ? 'Missed' : 'Scheduled'}
                  </Text>
                </View>

                {!item.attended && canShowMark && (
                  <TouchableOpacity 
                    onPress={() => handleMarkAttended(item)} 
                    style={[styles.markAttendedButton, { backgroundColor: statusColor }]}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.markAttendedButtonText}>Mark Attended</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animatable.View>
          );
        }}
        ListEmptyComponent={
          <Animatable.View animation="fadeIn" duration={600} style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="calendar-outline" size={56} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}> 
              {filterStatus === 'all' ? 'No Appointments Yet' : 
               filterStatus === 'upcoming' ? 'No Upcoming Appointments' : 
               'No Past Appointments'}
            </Text>
            <Text style={styles.emptySubtitle}> 
              {filterStatus === 'all' ? 'Start tracking your medical appointments by adding your first one.' : 
               filterStatus === 'upcoming' ? 'All your appointments are in the past or completed.' : 
               'You have no past appointment records.'}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddAppointment')}
              style={styles.emptyButton}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Appointment</Text>
            </TouchableOpacity>
          </Animatable.View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddAppointment')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors, theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Stats Cards
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

  // Filter Section
  filterSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  filterPillTextActive: {
    color: '#fff',
  },

  // List
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },

  // Appointment Card
  appointmentCard: {
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
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 10,
  },
  appointmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  doctorIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  appointmentHeaderInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  appointmentDateTime: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  deleteIconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: `${colors.background}80`,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  timeUntilBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 10,
    gap: 5,
  },
  timeUntilText: {
    fontSize: 12,
    fontWeight: '700',
  },
  attendedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 8,
    gap: 6,
  },
  attendedBannerText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '700',
    flex: 1,
  },
  appointmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markAttendedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
  },
  markAttendedButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
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
  emptyButton: {
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
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '800',
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});