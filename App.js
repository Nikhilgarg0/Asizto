import React, { useState, useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import Toast from 'react-native-toast-message';

// Import all screens
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// This is the simple 5-tab navigator. It does not have its own header.
function AppTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false, // All headers are now managed by the parent StackNavigator
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
        tabBarStyle: { 
          backgroundColor: colors.card, 
          borderTopColor: colors.border,
        },
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

// This is the main navigator for the entire logged-in experience.
function RootStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        // Use our custom header for ALL screens in this stack
        header: (props) => <Header {...props} />,
      }}
    >
      <Stack.Screen name="Main" component={AppTabs} />
      <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
      <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
      <Stack.Screen name="EmergencyContact" component={EmergencyContactScreen} />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationScreen} 
        options={{ 
          presentation: 'modal',
          // Modals can have a simpler, default header
          header: null, 
          headerShown: true,
          title: 'Notifications'
        }} 
      />
    </Stack.Navigator>
  );
}

// Auth Stack for login/signup
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

// Component that handles auth state and theme
function AppContent() {
  const { theme, colors } = useTheme();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
    return unsubscribe;
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
    <NavigationContainer theme={navigationTheme}>
      {user ? <RootStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

// The root of our app
export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
      <Toast />
    </ThemeProvider>
  );
}