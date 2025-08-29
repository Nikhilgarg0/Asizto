import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '../context/ThemeContext';

export default function AppointmentsTab() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = (appointmentId) => {
    Alert.alert(
      "Delete Appointment",
      "Are you sure you want to delete this appointment?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          onPress: async () => {
            await deleteDoc(doc(db, "appointments", appointmentId));
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
      alignItems: 'center',
      elevation: 2,
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
    fab: {
      position: 'absolute',
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      right: 20,
      bottom: 20,
      backgroundColor: colors.primary, // THEME FIX
      borderRadius: 28,
      elevation: 5,
    },
    emptyText: {
      color: colors.subtext,
      textAlign: 'center',
      marginTop: 30,
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
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.appointmentItem}>
            <View>
              <Text style={styles.appointmentDoctor}>{item.doctorName}</Text>
              <Text style={styles.appointmentDate}>{item.date}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={24} color={colors.accent || '#E57373'} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No appointments added yet.</Text>}
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
