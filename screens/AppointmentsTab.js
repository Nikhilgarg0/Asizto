// screens/AppointmentsTab.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig'; // <- fixed path
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext'; // <- fixed path
import * as Notifications from 'expo-notifications';

export default function AppointmentsTab() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date'); // 'date', 'doctor', 'type'
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
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    filterContainer: {
      padding: 16,
      marginBottom: 8,
      borderRadius: 12,
      elevation: 2,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
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
      padding: 15,
    },
    appointmentItem: {
      backgroundColor: colors.card,
      padding: 20,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      elevation: 2,
    },
    appointmentInfo: {
      flex: 1,
      marginRight: 12,
    },
    appointmentDoctor: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    appointmentDate: {
      fontSize: 14,
      color: colors.subtext,
      marginTop: 4,
    },
    appointmentType: {
      fontSize: 12,
      marginTop: 2,
      fontStyle: 'italic',
    },
    appointmentLocation: {
      fontSize: 12,
      marginTop: 2,
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
      paddingVertical: 40,
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
          <TouchableOpacity 
            style={[styles.filterButton, sortBy === 'type' && { backgroundColor: colors.primary }]}
            onPress={() => setSortBy('type')}
          >
            <Text style={[styles.filterButtonText, sortBy === 'type' && { color: '#fff' }]}>Type</Text>
          </TouchableOpacity>
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
          
          return (
            <View style={[styles.appointmentItem, isPast && { opacity: 0.6 }]}>
              <View style={styles.appointmentInfo}>
                <Text style={styles.appointmentDoctor}>{item.doctorName || item.with || 'Appointment'}</Text>
                <Text style={styles.appointmentDate}>{displayDate}</Text>
                {item.type && (
                  <Text style={[styles.appointmentType, { color: colors.subtext }]}>{item.type}</Text>
                )}
                {item.location && (
                  <Text style={[styles.appointmentLocation, { color: colors.subtext }]}>📍 {item.location}</Text>
                )}
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Ionicons name="trash-outline" size={24} color={colors.accent || '#E57373'} />
              </TouchableOpacity>
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
