// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';

// Import Screens
import DashboardScreen from './screens/DashboardScreen';
import CabinetScreen from './screens/CabinetScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import ChatbotScreen from './screens/ChatbotScreen';
import ProfileScreen from './screens/ProfileScreen';
import AuthScreen from './screens/AuthScreen';
import NotificationScreen from './screens/NotificationScreen';
import AddMedicineScreen from './screens/AddMedicineScreen';
import AddAppointmentScreen from './screens/AddAppointmentScreen';
import EmergencyContactScreen from './screens/EmergencyContactScreen';
import Header from './components/customHeader';

import { navigationRef } from './RootNavigation';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 5-tab bottom navigator
function AppTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: (props) => <Header {...props} />,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Cabinet') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'Emergency') iconName = focused ? 'warning' : 'warning-outline';
          else if (route.name === 'Chatbot') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Cabinet" component={CabinetScreen} />
      <Tab.Screen name="Emergency" component={EmergencyScreen} />
      <Tab.Screen name="Chatbot" component={ChatbotScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Root stack for logged-in user
function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
      <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} />
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{
          presentation: 'modal',
          title: 'Notifications'
        }}
      />
    </Stack.Navigator>
  );
}

// Auth stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

// Handles theme + auth state and notification tapping
function AppContent() {
  const { theme, colors } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return unsubscribeAuth;
  }, []);

  // Notification tap handler -> deep link to right screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = (response?.notification?.request?.content?.data) || {};
        // data examples: { type: 'medicine', medicineId } or { type: 'appointment', appointmentId }
        const type = data.type;
        if (type === 'medicine' && data.medicineId) {
          navigationRef.current?.navigate('Main', { screen: 'Cabinet', params: { screen: 'Medicines' }});
          // then navigate deeper to MedicineDetails if you have such a screen:
          // navigationRef.current?.navigate('MedicineDetails', { id: data.medicineId });
        } else if (type === 'appointment' && data.appointmentId) {
          navigationRef.current?.navigate('Main', { screen: 'Cabinet', params: { screen: 'Appointments' }});
          // then open detail if available:
          // navigationRef.current?.navigate('AppointmentDetails', { id: data.appointmentId });
        } else {
          navigationRef.current?.navigate('Main');
        }
      } catch (e) {
        console.warn('Notification response handler error', e);
      }
    });

    return () => sub.remove();
  }, []);

  const navigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

// App root
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <Toast />
    </ThemeProvider>
  );
}
