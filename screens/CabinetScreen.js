import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// Import our screens
import MedicinesTab from './MedicinesTab';
import AppointmentsTab from './AppointmentsTab';
import AddMedicineScreen from './AddMedicineScreen';
import AddAppointmentScreen from './AddAppointmentScreen';

const TopTab = createMaterialTopTabNavigator();
const Stack = createStackNavigator();

function CabinetTabs() {
  const { colors, theme } = useTheme();
  
  return (
    <TopTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: { 
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        tabBarIndicatorStyle: { 
          backgroundColor: colors.primary,
          height: 3,
          borderRadius: 3,
        },
        tabBarLabelStyle: { 
          fontWeight: '700',
          fontSize: 14,
          textTransform: 'none',
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarPressColor: `${colors.primary}15`,
        tabBarIcon: ({ focused, color }) => null, // We'll add icons inline
      }}
    >
      <TopTab.Screen 
        name="Medicines" 
        component={MedicinesTab}
        options={{
          tabBarLabel: 'Medicines',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? "medical" : "medical-outline"} 
              size={20} 
              color={color}
              style={{ marginRight: 6 }}
            />
          ),
        }}
      />
      <TopTab.Screen 
        name="Appointments" 
        component={AppointmentsTab}
        options={{
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons 
              name={focused ? "calendar" : "calendar-outline"} 
              size={20} 
              color={color}
              style={{ marginRight: 6 }}
            />
          ),
        }}
      />
    </TopTab.Navigator>
  );
}

export default function CabinetScreen() {
  const { colors, theme } = useTheme();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { 
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: { 
          color: colors.text,
          fontWeight: '700',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
        headerLeftContainerStyle: {
          paddingLeft: 8,
        },
        cardStyle: { 
          backgroundColor: colors.background 
        },
        // Modern card animation
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          };
        },
      }}
    >
      <Stack.Screen
        name="CabinetTabs"
        component={CabinetTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddMedicine"
        component={AddMedicineScreen}
        options={{ 
          title: 'Add Medicine',
          headerStyle: {
            backgroundColor: colors.card,
            elevation: 2,
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
          },
        }}
      />
      <Stack.Screen
        name="AddAppointment"
        component={AddAppointmentScreen}
        options={{ 
          title: 'Add Appointment',
          headerStyle: {
            backgroundColor: colors.card,
            elevation: 2,
            shadowOpacity: 0.1,
            shadowRadius: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
          },
        }}
      />
    </Stack.Navigator>
  );
}