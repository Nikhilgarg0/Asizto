// screens/CabinetScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

import MedicinesTab from './MedicinesTab';
import AppointmentsTab from './AppointmentsTab';
import AddMedicineScreen from './AddMedicineScreen';
import AddAppointmentScreen from './AddAppointmentScreen';

const Stack = createStackNavigator();

const TABS = [
  { key: 'medicines', label: 'Medicines', icon: 'medical' },
  { key: 'appointments', label: 'Appointments', icon: 'calendar' },
];

// ─── Custom pill tab switcher + swipeable pager ───────────────────────────────
function CabinetHome({ route, navigation }) {
  const { colors } = useTheme();
  
  // Safely parse nested screen params
  const getInitialTab = () => {
    const targetScreen = route?.params?.screen;
    if (targetScreen === 'Appointments') return 1;
    return 0; // Default to Medicines (tab 0)
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const pagerRef = useRef(null);

  const switchTab = (index) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  };

  // Dynamically switch tab when navigation params change
  useEffect(() => {
    const targetScreen = route?.params?.screen;
    if (targetScreen === 'Appointments') {
      switchTab(1);
    } else if (targetScreen === 'Medicines') {
      switchTab(0);
    }
  }, [route?.params?.screen]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Segmented pill control ── */}
      <View style={[styles.segContainer, {
        backgroundColor: colors.card,
        borderColor: colors.border,
      }]}>
        {TABS.map((tab, i) => {
          const active = activeTab === i;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.segment,
                active && { backgroundColor: colors.primary },
              ]}
              onPress={() => switchTab(i)}
              activeOpacity={0.85}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              <Ionicons
                name={active ? tab.icon : `${tab.icon}-outline`}
                size={active ? 19 : 16}
                color={active ? '#fff' : colors.subtext}
              />
              <Text style={[
                styles.segLabel,
                {
                  color: active ? '#fff' : colors.subtext,
                  fontWeight: active ? '700' : '500',
                },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Swipeable pager (native, no JS animation = no stuck indicator) ── */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}
      >
        <View key="0" style={{ flex: 1 }}>
          <MedicinesTab route={route} />
        </View>
        <View key="1" style={{ flex: 1 }}>
          <AppointmentsTab route={route} />
        </View>
      </PagerView>
    </View>
  );
}

// ─── Stack navigator (keeps AddMedicine / AddAppointment reachable) ───────────
export default function CabinetScreen() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="CabinetHome"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 0,
        },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700', fontSize: 18 },
        headerBackTitleVisible: false,
        headerLeftContainerStyle: { paddingLeft: 8 },
        cardStyle: { backgroundColor: colors.background },
        cardStyleInterpolator: ({ current, layouts }) => ({
          cardStyle: {
            transform: [{
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
              }),
            }],
          },
        }),
      }}
    >
      <Stack.Screen
        name="CabinetHome"
        component={CabinetHome}
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

const styles = StyleSheet.create({
  segContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 25,
    borderWidth: 1,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 25,
  },
  segLabel: {
    fontSize: 13,
    letterSpacing: 1,
  },
});