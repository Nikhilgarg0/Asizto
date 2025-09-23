// screens/AppointmentsTab.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig'; // <- fixed path
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext'; // <- fixed path
import * as Notifications from 'expo-notifications';

export default function AppointmentsTab() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'doctor'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'upcoming', 'past'

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

  // Sort and filter appointments
  useEffect(() => {
    let filtered = [...appointments];
    
    // Filter by status
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
    
    // Sort appointments
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

      // Cancel any scheduled notifications for this appointment
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 12,
      paddingHorizontal: 12,
    },
    filterContainer: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 12,
      borderRadius: 12,
      elevation: 1,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'column',
      justifyContent: 'center'
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },
    filterLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginRight: 12,
      minWidth: 50,
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
    },
    listContent: {
      padding: 16,
      paddingBottom: 96,
    },
    appointmentItem: {
      backgroundColor: colors.card,
      padding: 18,
      borderRadius: 20,
      marginBottom: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden'
    },
    appointmentAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 6,
      borderTopLeftRadius: 20,
      borderBottomLeftRadius: 20,
    },
    appointmentInfo: {
      flex: 1,
      marginRight: 12,
    },
    appointmentDoctor: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    appointmentDate: {
      fontSize: 14,
      color: colors.subtext,
      marginTop: 6,
    },
    appointmentType: {
      fontSize: 12,
      marginTop: 2,
      fontStyle: 'italic',
    },
    appointmentLocation: {
      fontSize: 13,
      marginTop: 6,
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
      elevation: 5,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      marginTop: 6,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    }
    ,
    markButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      elevation: 2,
    },
    markButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
    },
    attendedBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      elevation: 1,
    },
    attendedText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 12,
    },
    attendedContainer: {
      marginTop: 8,
      paddingVertical: 6,
    },
    attendedRow: {
      flexDirection: 'row',
      alignItems: 'center'
    },
    attendedTextBody: {
      fontSize: 14,
      fontWeight: '600'
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingBottom: 8,
    },
    cardBody: {
      paddingBottom: 12,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    deleteButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: 'transparent',
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    footerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    footerText: {
      fontSize: 13,
      color: colors.subtext,
      fontWeight: '500',
    },
  });

  if (loading) {
    return (
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ flex: 1, backgroundColor: colors.background }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Controls */}
      <View style={[styles.filterContainer, { backgroundColor: colors.card }]}>
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.text }]}>Sort by:</Text>
          <TouchableOpacity 
            style={[styles.filterButton, sortBy === 'date' && { backgroundColor: colors.primary }]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.filterButtonText, sortBy === 'date' && { color: '#fff' }]}>Date</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, sortBy === 'doctor' && { backgroundColor: colors.primary }]}
            onPress={() => setSortBy('doctor')}
          >
            <Text style={[styles.filterButtonText, sortBy === 'doctor' && { color: '#fff' }]}>Doctor</Text>
          </TouchableOpacity>
          {/* 'Type' sort removed per UX decision */}
        </View>
        
        <View style={styles.filterRow}>
          <Text style={[styles.filterLabel, { color: colors.text }]}>Show:</Text>
          <TouchableOpacity 
            style={[styles.filterButton, filterStatus === 'all' && { backgroundColor: colors.primary }]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'all' && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterStatus === 'upcoming' && { backgroundColor: colors.primary }]}
            onPress={() => setFilterStatus('upcoming')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'upcoming' && { color: '#fff' }]}>Upcoming</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, filterStatus === 'past' && { backgroundColor: colors.primary }]}
            onPress={() => setFilterStatus('past')}
          >
            <Text style={[styles.filterButtonText, filterStatus === 'past' && { color: '#fff' }]}>Past</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const displayDate = item.date && item.date.toDate ? item.date.toDate().toLocaleString() : (item.date || '');
          const isPast = item.date && (item.date.toDate ? item.date.toDate() : new Date(item.date)) <= new Date();
          
          // use the actual date object for comparisons (handles Firestore Timestamp)
          const aptDateObj = item.date && item.date.toDate ? item.date.toDate() : (item.date ? new Date(item.date) : null);
          const canShowMark = aptDateObj ? (aptDateObj <= new Date()) : false;

          return (
            <View style={[styles.card, isPast && { opacity: 0.9 }]}> 
              <View style={[styles.cardHeader]}> 
                <View style={{ flex: 1 }}>
                  <Text style={styles.appointmentDoctor}>{item.doctorName || item.with || 'Appointment'}</Text>
                  <Text style={styles.appointmentDate}>{displayDate}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={20} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardBody}>
                {item.location && (
                  <Text style={[styles.appointmentLocation, { color: colors.subtext }]}>📍 {item.location}</Text>
                )}
                {item.attended ? (
                  <View style={styles.attendedContainer}>
                    <View style={styles.attendedRow}>
                      <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      <Text style={[styles.attendedTextBody, { color: '#4CAF50', marginLeft: 8 }]}>
                        {item.attendedAt ? (
                          item.attendedAt.toDate ? `Attended on ${item.attendedAt.toDate().toLocaleString()}` : `Attended on ${new Date(item.attendedAt).toLocaleString()}`
                        ) : 'Attended'}
                      </Text>
                    </View>
                  </View>
                ) : null}
                {/* additional details could go here */}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerLeft}>
                  { !item.attended && canShowMark ? (
                    <TouchableOpacity onPress={() => handleMarkAttended(item)} style={[styles.markButton, { backgroundColor: colors.primary }]}>
                      <Text style={styles.markButtonText}>Mark Attended</Text>
                    </TouchableOpacity>
                  ) : null }
                </View>
                <View style={styles.footerRight}>
                  <Text style={[styles.footerText, { color: colors.subtext }]}>{/* placeholder for status or time */}</Text>
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color={colors.subtext} />
            <Text style={[styles.emptyText, { color: colors.text }]}> 
              {filterStatus === 'all' ? 'No appointments added yet.' : 
               filterStatus === 'upcoming' ? 'No upcoming appointments.' : 'No past appointments.'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.subtext }]}> 
              {filterStatus === 'all' ? 'Add your first appointment to get started' : 
               filterStatus === 'upcoming' ? 'All your appointments are in the past' : 'You have no past appointments'}
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddAppointment')}
              style={{
                marginTop: 16,
                backgroundColor: colors.primary,
                paddingHorizontal: 18,
                paddingVertical: 10,
                borderRadius: 10,
                elevation: 2,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Add Appointment</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddAppointment')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}
