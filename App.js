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
import { Alert } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
import ErrorBoundary from './components/ErrorBoundary';
import { navigationRef } from './RootNavigation';

const DebugNotificationsScreen = __DEV__
  ? require('./screens/DebugNotificationsScreen').default
  : null;

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { theme, colors } = useTheme();
  const [user, setUser] = useState(null);

  function AppTabs() {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          header: (props) => <Header {...props} />,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
            else if (route.name === 'Cabinet') iconName = focused ? 'medkit' : 'medkit-outline';
            else if (route.name === 'Emergency') iconName = focused ? 'shield' : 'shield-outline';
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

  function MainStack() {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddMedicine"
          component={AddMedicineScreen}
          options={{ header: (props) => <Header {...props} title="Add medicine" /> }}
        />
        <Stack.Screen
          name="AddAppointment"
          component={AddAppointmentScreen}
          options={{ header: (props) => <Header {...props} title="Add appointment" /> }}
        />
        <Stack.Screen
          name="EmergencyContact"
          component={EmergencyContactScreen}
          options={{ header: (props) => <Header {...props} title="Emergency contacts" /> }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationScreen}
          options={{
            presentation: 'modal',
            header: (props) => <Header {...props} title="Notifications" />,
          }}
        />
        {__DEV__ && DebugNotificationsScreen && (
          <Stack.Screen
            name="DebugNotifications"
            component={DebugNotificationsScreen}
            options={{ header: (props) => <Header {...props} title="Debug: notifications" /> }}
          />
        )}
      </Stack.Navigator>
    );
  }

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    }, (error) => {
      console.error('Auth state change error:', error);
      Alert.alert('Authentication Error', 'There was an issue with authentication. Please try again.');
    });
    return unsubscribeAuth;
  }, []);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      try {
        const data = (response?.notification?.request?.content?.data) || {};
        const type = data.type;
        if (type === 'medicine' && data.medicineId) {
          navigationRef.current?.navigate('Main', {
            screen: 'Cabinet',
            params: { screen: 'Medicines', params: { highlightMedicine: data.medicineId, searchQuery: data.medicineName || '' } }
          });
        } else if (type === 'appointment' && data.appointmentId) {
          navigationRef.current?.navigate('Main', {
            screen: 'Cabinet',
            params: { screen: 'Appointments', params: { highlightAppointment: data.appointmentId } }
          });
        } else {
          navigationRef.current?.navigate('Main');
        }
      } catch (e) {
        navigationRef.current?.navigate('Main');
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

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
        <Toast />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
