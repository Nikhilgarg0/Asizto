// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebaseConfig';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import Toast from 'react-native-toast-message';
import * as Notifications from 'expo-notifications';
import { Alert, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  registerNotificationCategories,
  NOTIF_ACTION_MARK_TAKEN,
  NOTIF_ACTION_IGNORE,
} from './utils/NotificationManager';
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

// Prevent splash screen auto-hide so we can load fonts
SplashScreen.preventAutoHideAsync().catch(() => {});

// NAV-3: deep link config — scheme defined in app.json as 'asizto'
const linking = {
  prefixes: ['asizto://'],
  config: {
    screens: {
      Main: {
        screens: {
          Dashboard:  'dashboard',
          Cabinet: {
            screens: {
              Medicines:    'cabinet/medicines',
              Appointments: 'cabinet/appointments',
            },
          },
          Emergency: 'emergency',
          Chatbot:   'chatbot',
          Profile:   'profile',
        },
      },
      AddMedicine:    'add-medicine',
      AddAppointment: 'add-appointment',
      EmergencyContact: 'emergency-contact',
      Notifications:  'notifications',
    },
  },
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Register action buttons immediately at module load
registerNotificationCategories();

import DashboardScreen from './screens/DashboardScreen';
import CabinetScreen from './screens/CabinetScreen';
import EmergencyScreen from './screens/EmergencyScreen';
const ChatbotScreen = (props) => {
  const Screen = require('./screens/ChatbotScreen').default;
  return <Screen {...props} />;
};

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

// ─── Auth stack ───────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

// ─── App tabs — defined at module scope so React Navigation never re-creates them ──

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

// ─── Main stack — defined at module scope ─────────────────────────────────────

function MainStack() {
  const { colors } = useTheme();
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
          // NAV-2: modal gets a close button, no back arrow
          headerShown: true,
          header: (props) => <Header {...props} title="Notifications" isModal />,
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

// ─── App content ──────────────────────────────────────────────────────────────

function AppContent() {
  const { theme, colors } = useTheme();
  const [user, setUser] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return () => unsubscribeNet();
  }, []);

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
    const sub = Notifications.addNotificationResponseReceivedListener(async response => {
      try {
        const data = (response?.notification?.request?.content?.data) || {};
        const actionId = response.actionIdentifier;
        const notifId  = response.notification.request.identifier;

        // ── Handle action buttons ───────────────────────────────────────
        if (actionId === NOTIF_ACTION_MARK_TAKEN) {
          // Dismiss the notification from the tray immediately
          await Notifications.dismissNotificationAsync(notifId).catch(() => {});

          // Write timestamp to Firestore directly — no React context needed
          if (data.medicineId) {
            try {
              await updateDoc(doc(db, 'medicines', data.medicineId), {
                takenTimestamps: arrayUnion(Timestamp.now()),
              });
              console.log(`Medicine ${data.medicineId} marked as taken from notification`);
            } catch (err) {
              console.error('Failed to mark medicine taken from notification:', err);
            }
          }
          return; // Don't navigate
        }

        if (actionId === NOTIF_ACTION_IGNORE) {
          // Dismiss the notification from the tray immediately
          await Notifications.dismissNotificationAsync(notifId).catch(() => {});
          return;
        }

        // ── Default tap: navigate to relevant screen ──────────────────────
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="auto" />
      {isOffline && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.danger }}>
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.offlineText}>No Internet Connection. You are offline.</Text>
          </View>
        </SafeAreaView>
      )}
      <NavigationContainer ref={navigationRef} theme={navigationTheme} linking={linking}>
        {user ? <MainStack /> : <AuthStack />}
      </NavigationContainer>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    // PLAT-1: GestureHandlerRootView must be the outermost native view
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <DataProvider>
            <AppContent />
            <Toast />
          </DataProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
