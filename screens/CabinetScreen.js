import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '../context/ThemeContext';

// Import our screens
import MedicinesTab from './MedicinesTab';
import AppointmentsTab from './AppointmentsTab';
import AddMedicineScreen from './AddMedicineScreen';
import AddAppointmentScreen from './AddAppointmentScreen';

const TopTab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

function CabinetTabs() {
  const { colors } = useTheme();
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: { backgroundColor: colors.card },
        tabBarIndicatorStyle: { backgroundColor: colors.primary },
        tabBarLabelStyle: { fontWeight: 'bold' },
      }}
    >
      <TopTab.Screen name="Medicines" component={MedicinesTab} />
      <TopTab.Screen name="Appointments" component={AppointmentsTab} />
    </TopTab.Navigator>
  );
}

export default function CabinetScreen() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
        screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.text }
        }}
    >
      <Stack.Screen
        name="CabinetTabs"
        component={CabinetTabs}
        // This is the FIX: No separate header here, it uses the one from App.js
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddMedicine"
        component={AddMedicineScreen}
        options={{ title: 'Add Medicine' }}
      />
      <Stack.Screen
        name="AddAppointment"
        component={AddAppointmentScreen}
        options={{ title: 'Add Appointment' }}
      />
    </Stack.Navigator>
  );
}