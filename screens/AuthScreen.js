// AuthScreen.js - Enhanced Complete Version
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image,
  Platform, ActivityIndicator, Animated, Easing, UIManager, LayoutAnimation,
  SafeAreaView, KeyboardAvoidingView, useColorScheme, useWindowDimensions, Linking
} from 'react-native';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { sendOTP, verifyOTP, clearOTP, hasValidOTP } from '../services/emailService';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) { Haptics = null; }

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

let logoLight = null;
let logoDark = null;
let logoFallback = null;

try {
  logoLight = require('../assets/Brandkit/LightLogo.png');
} catch (e) {
  try { logoLight = require('../assets/Brandkit/xyz.png'); } catch (e2) { logoLight = null; }
}
try {
  logoDark = require('../assets/Brandkit/DarkLogo.png');
} catch (e) {
  try { logoDark = require('../assets/Brandkit/xyz.png'); } catch (e2) { logoDark = null; }
}
try { logoFallback = require('../assets/Brandkit/xyz.png'); } catch (e) { logoFallback = null; }

const AVATAR_KEYS = {
  male: ['male1', 'male2', 'male3', 'male4', 'male5', 'male6'],
  female: ['female1', 'female2', 'female3', 'female4', 'female5', 'female6'],
};
const ALL_AVATAR_KEYS = [...AVATAR_KEYS.male, ...AVATAR_KEYS.female];

function getAvatarSource(key) {
  switch (key) {
    case 'male1': return require('../assets/avatars/male1.png');
    case 'male2': return require('../assets/avatars/male2.png');
    case 'male3': return require('../assets/avatars/male3.png');
    case 'male4': return require('../assets/avatars/male4.png');
    case 'male5': return require('../assets/avatars/male5.png');
    case 'male6': return require('../assets/avatars/male6.png');
    case 'female1': return require('../assets/avatars/female1.png');
    case 'female2': return require('../assets/avatars/female2.png');
    case 'female3': return require('../assets/avatars/female3.png');
    case 'female4': return require('../assets/avatars/female4.png');
    case 'female5': return require('../assets/avatars/female5.png');
    case 'female6': return require('../assets/avatars/female6.png');
    default: return require('../assets/avatars/male1.png');
  }
}

const bloodGroupData = [
  { label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' },
];

const FloatingParticle = ({ size = 4, color = '#6DBF6A', startX = 0, startY = 0, duration = 8000, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.6, duration: 1000, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          ])
        )
      ])
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY, startY - 200] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [startX, startX + 30, startX] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
};

const AnimatedBlob = ({ size = 220, color = '#6DBF6A', startX = 0, startY = 0, rangeX = 60, rangeY = 40, duration = 9000, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.15, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );

    const t = setTimeout(() => {
      loop.start();
      pulseAnim.start();
    }, delay);
    return () => { clearTimeout(t); loop.stop(); pulseAnim.stop(); };
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [startX - rangeX, startX + rangeX] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY - rangeY, startY + rangeY] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.12,
        transform: [{ translateX }, { translateY }, { rotate }, { scale: pulse }],
      }}
    />
  );
};

const WaveLayer = ({ width, height, color, top, duration = 15000, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true })
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -width] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: 0,
        width: width * 2,
        height: 120,
        transform: [{ translateX }],
        opacity: 0.08,
      }}
    >
      <LinearGradient
        colors={[`${color}00`, `${color}80`, `${color}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

const SignupProgressBar = ({ currentStep, totalSteps = 5, isDark }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: currentStep / totalSteps,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [currentStep]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const progressStyles = StyleSheet.create({
    progressContainer: {
      marginBottom: 20,
      marginTop: 8,
    },
    progressBarBackground: {
      height: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      borderRadius: 10,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 10,
      position: 'relative',
      overflow: 'hidden',
    },
    progressGlow: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#6DBF6A',
      shadowColor: '#6DBF6A',
      shadowOpacity: 0.6,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    progressSteps: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingHorizontal: 4,
    },
    progressDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressDotActive: {
      backgroundColor: '#6DBF6A',
      borderColor: '#6DBF6A',
    },
    progressDotCurrent: {
      backgroundColor: '#6DBF6A',
      borderColor: '#8AF3C5',
      shadowColor: '#6DBF6A',
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    progressText: {
      textAlign: 'center',
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#9FB3C8' : '#6B7280',
    },
  });

  return (
    <View style={progressStyles.progressContainer}>
      <View style={progressStyles.progressBarBackground}>
        <Animated.View style={[progressStyles.progressBarFill, { width: progressWidth }]}>
          <LinearGradient
            colors={['#8AF3C5', '#6DBF6A', '#5DA860']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View 
            style={[
              progressStyles.progressGlow, 
              { opacity: glowOpacity }
            ]} 
          />
        </Animated.View>
      </View>
      {/* Steps removed for cleaner compact UI */}
      <Text style={progressStyles.progressText}>Step {currentStep} of {totalSteps}</Text>
    </View>
  );
};

function getAuthErrorMessage(error, context = 'login') {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/email-already-in-use':
      return 'Email already registered — please log in.';
    case 'auth/weak-password':
      return 'Password is too weak (minimum 6 characters).';
    default:
      return context === 'signup'
        ? 'Couldn\'t create account. Please try again.'
        : 'Failed to sign in. Please try again.';
  }
}

export default function AuthScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { width, height } = useWindowDimensions();

  if (!width || !height || !scheme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const CARD_MAX_WIDTH = 680;
  const cardWidth = Math.min(CARD_MAX_WIDTH, Math.round(width * 0.94));
  const cardMinHeight = Math.max(360, Math.round(height * 0.34));
  const cardMaxHeight = Math.min(820, Math.round(height * 0.86));
  const cardShiftY = Math.round(Math.max(6, Math.min(12, height * 0.045)));

  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState('credentials'); // 'credentials' | 'otp'
  const [otp, setOtp] = useState('');
  const [loginOtpDigits, setLoginOtpDigits] = useState(['', '', '', '', '', '']);
  const loginOtpRefs = useRef([null, null, null, null, null, null]);
  const [otpInfoText, setOtpInfoText] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef(null);
  // Signup OTP state
  const [signupStep, setSignupStep] = useState(1);
  const [signupOtpDigits, setSignupOtpDigits] = useState(['', '', '', '', '', '']);
  const signupOtpRefs = useRef([null, null, null, null, null, null]);
  const [signupOtpInfoText, setSignupOtpInfoText] = useState('');
  const [isSendingSignupOtp, setIsSendingSignupOtp] = useState(false);
  const [signupResendCooldown, setSignupResendCooldown] = useState(0);
  const signupResendTimerRef = useRef(null);
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState(null);
  const [heightVal, setHeight] = useState('');
  const [weightVal, setWeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState(null);
  const [conditions, setConditions] = useState('');
  const [selectedAvatarKey, setSelectedAvatarKey] = useState(null);
  const [smoking, setSmoking] = useState('no');
  const [drinking, setDrinking] = useState('no');
  const [smokingFreq, setSmokingFreq] = useState('');
  const [drinkingFreq, setDrinkingFreq] = useState('');
  const glassEnabled = true;
  const [phoneDigits, setPhoneDigits] = useState('');

  const avatarKeys = useMemo(() => {
    if (gender === 'male') return AVATAR_KEYS.male;
    if (gender === 'female') return AVATAR_KEYS.female;
    return ALL_AVATAR_KEYS;
  }, [gender]);

  const [errorText, setErrorText] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successText, setSuccessText] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailRegistered, setIsEmailRegistered] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [showBloodList, setShowBloodList] = useState(false);
  const emailCheckTimeout = useRef(null);

  useEffect(() => {
    setErrorText(''); setSuccessText(''); setFieldErrors({});
    setLoginStep('credentials'); setOtp(''); setResendCooldown(0);
  }, [isLoginView]);

  useEffect(() => {
    if (isLoginView || signupStep !== 1) return;
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) { setIsEmailRegistered(false); return; }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!valid) {
      setFieldErrors(prev => ({ ...prev, email: 'Invalid email format.' }));
      setIsEmailRegistered(false);
      return;
    }
    setIsCheckingEmail(true);
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);
    emailCheckTimeout.current = setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, trimmed);
        if (methods && methods.length > 0) {
          setIsEmailRegistered(true);
          setFieldErrors(prev => ({ ...prev, email: 'Email already registered — use Login.' }));
        } else {
          setIsEmailRegistered(false);
          setFieldErrors(prev => ({ ...prev, email: undefined }));
        }
      } catch (e) {
        setFieldErrors(prev => ({ ...prev, email: 'Unable to verify email right now.' }));
      } finally {
        setIsCheckingEmail(false);
      }
    }, 700);
    return () => emailCheckTimeout.current && clearTimeout(emailCheckTimeout.current);
  }, [email, isLoginView, signupStep]);

  const validateStep1 = () => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Invalid email format.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (isEmailRegistered) errs.email = 'Email already registered — use Login.';
    setFieldErrors(prev => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!dob) errs.dob = 'Date of birth is required.';
    if (!phoneDigits.trim()) errs.phone = 'Contact number is required.';
    else if (!/^[0-9]{10}$/.test(phoneDigits.trim())) errs.phone = 'Enter a valid 10-digit phone number.';
    if (!gender) errs.gender = 'Gender is required.';
    setFieldErrors(prev => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const getPasswordStrength = () => {
    if (!password) return '';
    if (password.length < 6) return 'Weak';
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (hasUpper && hasDigit && hasSpecial) return 'Strong';
    if ((hasUpper && hasDigit) || (hasDigit && hasSpecial) || (hasUpper && hasSpecial)) return 'Medium';
    return 'Weak';
  };

  const contentHeightAnim = useRef(new Animated.Value(Math.max(cardMinHeight, 420))).current;
  const lastMeasuredHeight = useRef(null);
  const contentMeasureTimeout = useRef(null);

  const handleContentLayout = (event) => {
    const measured = Math.round(event.nativeEvent.layout.height);
    const buffer = 64;
    const desired = Math.max(cardMinHeight, Math.min(cardMaxHeight, measured + buffer));
    if (lastMeasuredHeight.current === desired) return;
    lastMeasuredHeight.current = desired;

    if (contentMeasureTimeout.current) clearTimeout(contentMeasureTimeout.current);
    contentMeasureTimeout.current = setTimeout(() => {
      Animated.timing(contentHeightAnim, {
        toValue: desired,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }, 40);
  };

  useEffect(() => { return () => { if (contentMeasureTimeout.current) clearTimeout(contentMeasureTimeout.current); }; }, []);
  useEffect(() => { return () => { if (signupResendTimerRef.current) clearInterval(signupResendTimerRef.current); }; }, []);
  const lastToastRef = useRef({ msg: '', time: 0 });
  const showToast = (type, message) => {
    if (!message) return;
    const now = Date.now();
    if (message === lastToastRef.current.msg && now - lastToastRef.current.time < 2000) return;
    lastToastRef.current = { msg: message, time: now };
    Toast.show({ type: type, text1: message, position: 'top', visibilityTime: 2000, topOffset: 50 });
  };

  useEffect(() => {
    if (!errorText) return;
    const t = setTimeout(() => setErrorText(''), 3000);
    return () => clearTimeout(t);
  }, [errorText]);

  const handleLogin = async () => {
    setErrorText(''); setSuccessText('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorText('Email and password are required for login.');
      return;
    }
    // Step 1: verify credentials first
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      // If credentials are valid, proceed to OTP step
      setIsLoading(false);
      await handleSendOtp(trimmedEmail);
      setLoginStep('otp');
      try { Toast.show({ type: 'success', text1: 'Verification code sent to your email.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
    } catch (e) {
      const friendly = getAuthErrorMessage(e, 'login') || '';
      const code = e?.code || '';
      if (code === 'auth/wrong-password') setFieldErrors(prev => ({ ...prev, password: 'Incorrect password.' }));
      if (code === 'auth/invalid-email' || code === 'auth/user-not-found') setFieldErrors(prev => ({ ...prev, email: friendly }));
      setErrorText(friendly);
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (emailToSend) => {
    if (resendCooldown > 0) return;
    setIsSendingOtp(true);
    try {
      const displayName = firstName?.trim() || 'User';
      const result = await sendOTP(emailToSend, displayName);
      if (result?.success) {
        setOtpInfoText('Enter the 6-digit code sent to your email.');
        setResendCooldown(30);
        try { Toast.show({ type: 'success', text1: 'OTP sent successfully.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
        if (resendTimerRef.current) clearInterval(resendTimerRef.current);
        resendTimerRef.current = setInterval(() => {
          setResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(resendTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        try { Toast.show({ type: 'error', text1: result?.error || 'Failed to send OTP.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
      }
    } catch (err) {
      try { Toast.show({ type: 'error', text1: 'Failed to send OTP. Please try again.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendSignupOtp = async (emailToSend) => {
    if (signupResendCooldown > 0) return;
    setIsSendingSignupOtp(true);
    try {
      const displayName = firstName?.trim() || 'User';
      const result = await sendOTP(emailToSend, displayName);
      if (result?.success) {
        setSignupOtpInfoText('Enter the 6-digit code sent to your email.');
        try { Toast.show({ type: 'success', text1: 'Verification code sent to your email.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
        setSignupResendCooldown(30);
        if (signupResendTimerRef.current) clearInterval(signupResendTimerRef.current);
        signupResendTimerRef.current = setInterval(() => {
          setSignupResendCooldown(prev => {
            if (prev <= 1) {
              clearInterval(signupResendTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        try { Toast.show({ type: 'error', text1: result?.error || 'Failed to send OTP.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
      }
    } catch (err) {
      try { Toast.show({ type: 'error', text1: 'Failed to send OTP. Please try again.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
    } finally {
      setIsSendingSignupOtp(false);
    }
  };

  const handleVerifyOtpAndFinishLogin = async () => {
    setErrorText('');
    const codeToCheck = (loginOtpDigits.join('') || otp).replace(/\D/g, '');
    if (!codeToCheck || codeToCheck.length < 6) {
      setFieldErrors(prev => ({ ...prev, otp: 'Enter the 6-digit code.' }));
      return;
    }
    setIsLoading(true);
    try {
      const res = await verifyOTP(email.trim().toLowerCase(), codeToCheck.slice(0,6));
      if (res.success) {
        try { Toast.show({ type: 'success', text1: 'Login successful.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
        setLoginStep('credentials');
        setOtp('');
        setLoginOtpDigits(['','','','','','']);
      } else {
        try { Toast.show({ type: 'error', text1: res.error || 'Invalid code.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
      }
    } catch (err) {
      try { Toast.show({ type: 'error', text1: 'Verification failed. Please try again.', position: 'top', visibilityTime: 2000, topOffset: 50 }); } catch(e) {}
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (resendTimerRef.current) clearInterval(resendTimerRef.current);
    };
  }, []);

  const handleSignUpFinal = async () => {
    setErrorText(''); setSuccessText('');
    const ok1 = validateStep1();
    const ok2 = validateStep2();
    if (!ok1) { setSignupStep(1); return; }
    if (!ok2) { setSignupStep(2); return; }
    if (!selectedAvatarKey) { setFieldErrors(prev => ({ ...prev, avatar: 'Please select an avatar.' })); setSignupStep(5); return; }
    if (!bloodGroup) { setFieldErrors(prev => ({ ...prev, bloodGroup: 'Please select blood group.' })); setSignupStep(3); return; }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phoneDigits ? `+91${phoneDigits.trim()}` : null,
        dob: dob ? Timestamp.fromDate(dob) : null,
        gender,
        height: heightVal ? Number(heightVal) : null,
        weight: weightVal ? Number(weightVal) : null,
        bloodGroup,
        conditions: conditions || null,
        smoking: smoking || 'no',
        smokingFreq: smokingFreq || null,
        drinking: drinking || 'no',
        drinkingFreq: drinkingFreq || null,
        avatarKey: selectedAvatarKey,
        createdAt: Timestamp.now()
      });
      setSuccessText('Account created successfully. You can login now.');
      setIsLoginView(true);
      setSignupStep(1);
      setFirstName(''); setLastName(''); setPhone(''); setDob(null);
      setGender(null); setHeight(''); setWeight(''); setBloodGroup(null);
      setConditions(''); setSelectedAvatarKey(null); setPassword('');
      setSmoking('no'); setDrinking('no'); setSmokingFreq(''); setDrinkingFreq('');
    } catch (e) {
      const friendly = getAuthErrorMessage(e, 'signup');
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') setFieldErrors(prev => ({ ...prev, email: friendly }));
      if (code === 'auth/weak-password') setFieldErrors(prev => ({ ...prev, password: friendly }));
      setErrorText(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const goNextFromStep1 = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setErrorText(''); if (!validateStep1()) return;
    setSignupStep(2);
  };

  const goNextFromStep2 = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setErrorText(''); if (!validateStep2()) return;
    setSignupStep(3);
  };

  const logoSource = isDark ? (logoDark || logoLight || logoFallback) : (logoLight || logoDark || logoFallback);
  const styles = createStyles({ isDark, width, height, cardWidth, cardMinHeight, cardMaxHeight, cardShiftY, glassEnabled });

  if (!styles || !styles.safeArea || !styles.container) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f8' }}>
        <ActivityIndicator size="large" color="#6DBF6A" />
      </View>
    );
  }

  const ActionButton = ({ title, onPress, disabled, loading, style }) => (
    <Pressable
      onPress={() => { if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress && onPress(); }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style
      ]}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{title}</Text>}
    </Pressable>
  );

  const ErrorBanner = ({ message, onClose }) => {
    if (!message) return null;
    return (
      <Animatable.View animation="fadeInDown" duration={280} style={styles.errorBanner}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Ionicons name="alert-circle" size={18} color={styles.danger.color} style={{ marginRight: 8 }} />
          <Text style={styles.errorBannerText}>{String(message)}</Text>
        </View>
        <Pressable onPress={onClose} style={{ padding: 6 }}>
          <Ionicons name="close" size={18} color={styles.placeholderColor.color} />
        </Pressable>
      </Animatable.View>
    );
  };

  const renderSignupStep = () => {
    const trimmed = (email || '').trim().toLowerCase();
    const emailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const showAffix = !!trimmed;

    switch (signupStep) {
      case 1:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [8,0] }) }] }}>
            <TextInput
              style={styles.input}
              placeholder="First name"
              placeholderTextColor={styles.placeholderColor.color}
              value={firstName}
              onChangeText={t => { setFirstName(t); setFieldErrors(prev => ({ ...prev, firstName: undefined })); }}
              autoCapitalize="words"
            />
            {fieldErrors.firstName ? <Text style={styles.inlineError}>{String(fieldErrors.firstName)}</Text> : null}
            <TextInput
              style={styles.input}
              placeholder="Last name"
              placeholderTextColor={styles.placeholderColor.color}
              value={lastName}
              onChangeText={t => { setLastName(t); setFieldErrors(prev => ({ ...prev, lastName: undefined })); }}
              autoCapitalize="words"
            />
            {fieldErrors.lastName ? <Text style={styles.inlineError}>{String(fieldErrors.lastName)}</Text> : null}
            <View style={styles.inputAffixContainer}>
              <TextInput
                style={styles.inputAffix}
                placeholder="Email"
                placeholderTextColor={styles.placeholderColor.color}
                value={email}
                onChangeText={t => { setEmail(t); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.affixRight}>
                {showAffix ? (
                  isCheckingEmail ? (
                    <ActivityIndicator size="small" color="#6DBF6A" />
                  ) : fieldErrors.email ? (
                    <Ionicons name="close-circle" size={20} color={styles.danger.color} />
                  ) : emailFormatValid && !isEmailRegistered ? (
                    <Ionicons name="checkmark-circle" size={20} color="#6DBF6A" />
                  ) : null
                ) : null}
              </View>
            </View>
            {fieldErrors.email ? <Text style={styles.inlineError}>{String(fieldErrors.email)}</Text> : null}

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor={styles.placeholderColor.color}
                value={password}
                onChangeText={t => { setPassword(t); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.iconPress}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={styles.placeholderColor.color} />
              </Pressable>
            </View>
            {fieldErrors.password ? <Text style={styles.inlineError}>{String(fieldErrors.password)}</Text> : null}
            {password ? (
              <View style={styles.passwordStrengthContainer}>
                <Text style={styles.subtleText}>Password strength: </Text>
                <Text style={[
                  styles.passwordStrengthText,
                  getPasswordStrength() === 'Strong' && { color: '#6DBF6A' },
                  getPasswordStrength() === 'Medium' && { color: '#FFA500' },
                  getPasswordStrength() === 'Weak' && { color: '#ef4444' },
                ]}>{getPasswordStrength()}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 6 }}>
              <Pressable onPress={() => setAcceptedTerms(v => !v)} style={[styles.smallPill, { flex: undefined, paddingVertical: 6, paddingHorizontal: 10 }]}> 
                <Ionicons name={acceptedTerms ? 'checkbox' : 'square-outline'} size={18} color={acceptedTerms ? '#6DBF6A' : styles.placeholderColor.color} />
              </Pressable>
              <Text style={[styles.subtleText, { marginLeft: 8 }]}>I accept the </Text>
              <Pressable onPress={() => { try { Linking.openURL('https://nikhilcodes.info'); } catch (e) {} }}>
                <Text style={[styles.toggleLink]}>Terms & Conditions</Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setIsLoginView(true); setSignupStep(1); setFieldErrors({});
                }}
                style={styles.ghostButton}
              >
                <Text style={styles.ghostButtonText}>Back to Login</Text>
              </Pressable>
              <ActionButton
                title="Send OTP"
                onPress={async () => {
                  if (!validateStep1()) return;
                  if (!acceptedTerms) { setErrorText('Please accept the Terms & Conditions.'); return; }
                  const trimmedEmail = (email || '').trim().toLowerCase();
                  await handleSendSignupOtp(trimmedEmail);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSignupStep(2);
                }}
                disabled={isCheckingEmail || isEmailRegistered || !acceptedTerms}
              />
            </View>
          </Animated.View>
        );
      case 2:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [8,0] }) }] }}>
            <Text style={{ textAlign: 'center', marginBottom: 10, color: styles.textColor.color, fontSize: 15, fontWeight: '600' }}>Verify your email</Text>
            <Text style={[styles.subtleText, { textAlign: 'center', marginBottom: 12 }]}>We sent a 6-digit code to {email?.trim().toLowerCase()}.</Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              {signupOtpDigits.map((d, idx) => (
                <TextInput
                  key={idx}
                  ref={ref => (signupOtpRefs.current[idx] = ref)}
                  style={[styles.input, { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' }]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={signupOtpDigits[idx]}
                  onChangeText={(t) => {
                    const v = t.replace(/[^0-9]/g, '');
                    const next = [...signupOtpDigits];
                    next[idx] = v;
                    setSignupOtpDigits(next);
                    if (v && idx < 5) {
                      signupOtpRefs.current[idx + 1]?.focus();
                    }
                  }}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === 'Backspace' && !signupOtpDigits[idx] && idx > 0) {
                      signupOtpRefs.current[idx - 1]?.focus();
                    }
                  }}
                />
              ))}
            </View>
            {fieldErrors.otp ? <Text style={styles.inlineError}>{String(fieldErrors.otp)}</Text> : null}
            {signupOtpInfoText ? <Text style={[styles.subtleText, { textAlign: 'center' }]}>{signupOtpInfoText}</Text> : null}

            <View style={styles.actionRow}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => { 
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSignupStep(1); 
                  setSignupOtpDigits(['','','','','','']);
                  clearOTP((email || '').trim().toLowerCase());
                }}
              >
                <Text style={styles.ghostButtonText}>Back</Text>
              </Pressable>
              <ActionButton 
                title="Verify & Continue"
                onPress={async () => {
                  const code = signupOtpDigits.join('');
                  if (code.length !== 6) { setFieldErrors(prev => ({ ...prev, otp: 'Enter the 6-digit code.' })); return; }
                  setIsLoading(true);
                  const res = await verifyOTP((email || '').trim().toLowerCase(), code);
                  if (res.success) {
                    setSuccessText('Email verified. Continue setup.');
                    setSignupOtpDigits(['','','','','','']);
                    setSignupStep(3);
                  } else {
                    setErrorText(res.error || 'Invalid code.');
                  }
                  setIsLoading(false);
                }} 
                loading={isLoading}
              />
            </View>

            <View style={[styles.actionRow, { marginTop: 10 }]}>
              <Pressable
                disabled={isSendingSignupOtp || signupResendCooldown > 0}
                onPress={() => handleSendSignupOtp((email || '').trim().toLowerCase())}
                style={[styles.ghostButton, (isSendingSignupOtp || signupResendCooldown > 0) && styles.buttonDisabled]}
              >
                <Text style={styles.ghostButtonText}>
                  {signupResendCooldown > 0 ? `Resend in ${signupResendCooldown}s` : (isSendingSignupOtp ? 'Sending...' : 'Resend code')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setIsLoginView(true); setSignupStep(1); }}
                style={styles.ghostButton}
              >
                <Text style={styles.ghostButtonText}>Back to Login</Text>
              </Pressable>
            </View>
          </Animated.View>
        );
      case 3:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [8,0] }) }] }}>
            <View style={styles.inputAffixContainer}>
              <Ionicons name="resize-outline" size={18} color={styles.placeholderColor.color} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputAffix}
                placeholder="Height (cm)"
                placeholderTextColor={styles.placeholderColor.color}
                value={heightVal}
                onChangeText={t => setHeight(t.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputAffixContainer}>
              <Ionicons name="fitness-outline" size={18} color={styles.placeholderColor.color} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.inputAffix}
                placeholder="Weight (kg)"
                placeholderTextColor={styles.placeholderColor.color}
                value={weightVal}
                onChangeText={t => setWeight(t.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.smallLabel}>Blood group</Text>
            <Pressable
              onPress={() => setShowBloodList(prev => !prev)}
              style={[styles.dropdown, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="water-outline" size={18} color={styles.placeholderColor.color} style={{ marginRight: 8 }} />
                <Text style={{ color: bloodGroup ? styles.textColor.color : styles.placeholderColor.color, fontSize: 16 }}>
                  {bloodGroup || 'Select Blood Group'}
                </Text>
              </View>
              <Ionicons name={showBloodList ? 'chevron-up' : 'chevron-down'} size={18} color={styles.placeholderColor.color} />
            </Pressable>
            {showBloodList ? (
              <View style={[styles.dropdownListContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.04)' : 'transparent' }]}> 
                {bloodGroupData.map(item => {
                  const selected = item.value === bloodGroup;
                  return (
                    <Pressable
                      key={item.value}
                      onPress={() => { setBloodGroup(item.value); setFieldErrors(prev => ({ ...prev, bloodGroup: undefined })); setShowBloodList(false); }}
                      style={[styles.dropdownItem, selected ? { backgroundColor: '#6DBF6A', borderBottomColor: 'transparent' } : null]}
                    >
                      <Text style={[styles.dropdownItemText, selected ? { color: '#fff', fontWeight: '700' } : null]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {fieldErrors.bloodGroup ? <Text style={styles.inlineError}>{String(fieldErrors.bloodGroup)}</Text> : null}

            <Text style={styles.smallLabel}>Gender</Text>
            <View style={styles.genderSelector}>
              <Pressable style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
                onPress={() => { setGender('male'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}>
                <Ionicons name="male" size={20} color={gender === 'male' ? '#fff' : styles.placeholderColor.color} />
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>Male</Text>
              </Pressable>
              <Pressable style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
                onPress={() => { setGender('female'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}>
                <Ionicons name="female" size={20} color={gender === 'female' ? '#fff' : styles.placeholderColor.color} />
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>Female</Text>
              </Pressable>
              <Pressable style={[styles.genderButton, gender === 'other' && styles.genderButtonSelected]}
                onPress={() => { setGender('other'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}>
                <Ionicons name="transgender" size={20} color={gender === 'other' ? '#fff' : styles.placeholderColor.color} />
                <Text style={[styles.genderText, gender === 'other' && styles.genderTextSelected]}>Other</Text>
              </Pressable>
            </View>
            {fieldErrors.gender ? <Text style={styles.inlineError}>{String(fieldErrors.gender)}</Text> : null}

            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Existing conditions (optional)"
              placeholderTextColor={styles.placeholderColor.color}
              value={conditions}
              onChangeText={setConditions}
              multiline
            />
            <View style={styles.suggestionContainer}>
              {["Diabetes", "Hypertension", "Asthma", "Thyroid", "Arthritis"].map(c => (
                <Pressable key={c} onPress={() => setConditions(prev => (prev ? `${prev}, ${c}` : c))} style={styles.suggestionChip}>
                  <Text style={styles.suggestionText}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(2); }}
              >
                <Text style={styles.ghostButtonText}>Back</Text>
              </Pressable>
              <ActionButton title="Next" onPress={() => setSignupStep(4)} />
            </View>
          </Animated.View>
        );
      case 4:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [8,0] }) }] }}>
            <Text style={styles.smallLabel}>Do you smoke?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Pressable style={[styles.smallPill, smoking === 'no' && styles.smallPillSelected]} onPress={() => setSmoking('no')}>
                <Text style={[styles.smallPillText, smoking === 'no' && styles.smallPillTextSelected]}>No</Text>
              </Pressable>
              <Pressable style={[styles.smallPill, smoking === 'occasionally' && styles.smallPillSelected]} onPress={() => setSmoking('occasionally')}>
                <Text style={[styles.smallPillText, smoking === 'occasionally' && styles.smallPillTextSelected]}>Occasionally</Text>
              </Pressable>
              <Pressable style={[styles.smallPill, smoking === 'daily' && styles.smallPillSelected]} onPress={() => setSmoking('daily')}>
                <Text style={[styles.smallPillText, smoking === 'daily' && styles.smallPillTextSelected]}>Daily</Text>
              </Pressable>
            </View>
            {smoking === 'occasionally' && (
              <TextInput
                style={styles.input}
                placeholder="How many per day / week? (optional)"
                placeholderTextColor={styles.placeholderColor.color}
                value={smokingFreq}
                onChangeText={setSmokingFreq}
              />
            )}

            <Text style={[styles.smallLabel, { marginTop: 8 }]}>Do you drink alcohol?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Pressable style={[styles.smallPill, drinking === 'no' && styles.smallPillSelected]} onPress={() => setDrinking('no')}>
                <Text style={[styles.smallPillText, drinking === 'no' && styles.smallPillTextSelected]}>No</Text>
              </Pressable>
              <Pressable style={[styles.smallPill, drinking === 'occasionally' && styles.smallPillSelected]} onPress={() => setDrinking('occasionally')}>
                <Text style={[styles.smallPillText, drinking === 'occasionally' && styles.smallPillTextSelected]}>Occasionally</Text>
              </Pressable>
              <Pressable style={[styles.smallPill, drinking === 'daily' && styles.smallPillSelected]} onPress={() => setDrinking('daily')}>
                <Text style={[styles.smallPillText, drinking === 'daily' && styles.smallPillTextSelected]}>Daily</Text>
              </Pressable>
            </View>
            {drinking === 'occasionally' && (
              <TextInput
                style={styles.input}
                placeholder="How many units per week? (optional)"
                placeholderTextColor={styles.placeholderColor.color}
                value={drinkingFreq}
                onChangeText={setDrinkingFreq}
              />
            )}

            <View style={styles.actionRow}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(3); }}
              >
                <Text style={styles.ghostButtonText}>Back</Text>
              </Pressable>
              <ActionButton title="Next" onPress={() => setSignupStep(5)} />
            </View>
          </Animated.View>
        );
      case 5:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [8,0] }) }] }}>
            <Text style={{ textAlign: 'center', marginBottom: 12, color: styles.textColor.color, fontSize: 15, fontWeight: '600' }}>Choose your avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarKeys.map(key => (
                <Pressable 
                  key={key} 
                  onPress={() => { 
                    setSelectedAvatarKey(key); 
                    setFieldErrors(prev => ({ ...prev, avatar: undefined })); 
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[styles.avatarWrapper, selectedAvatarKey === key && styles.avatarWrapperSelected]}
                >
                  <Image source={getAvatarSource(key)} style={styles.avatar} />
                  {selectedAvatarKey === key && (
                    <View style={styles.avatarCheckmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#6DBF6A" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
            {fieldErrors.avatar ? <Text style={styles.inlineError}>{String(fieldErrors.avatar)}</Text> : null}

            <View style={styles.actionRow}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(4); }}
              >
                <Text style={styles.ghostButtonText}>Back</Text>
              </Pressable>
              <ActionButton title="Create Account" onPress={handleSignUpFinal} loading={isLoading} />
            </View>
          </Animated.View>
        );
      default:
        return null;
    }
  };

  const stepAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    stepAnim.setValue(0);
    Animated.timing(stepAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [signupStep]);

  return (
    <SafeAreaView style={[styles.safeArea]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <LinearGradient colors={isDark ? ['#07121B', '#06101A'] : ['#F7FBFF', '#F2F6FF']} style={StyleSheet.absoluteFill} />

            <View style={styles.blobContainer} pointerEvents="none">
              <AnimatedBlob size={300} color="#6DBF6A" startX={-90} startY={-50} rangeX={width * 0.32} rangeY={height * 0.05} duration={12000} delay={0} />
              <AnimatedBlob size={240} color="#8AF3C5" startX={width * 0.70} startY={-20} rangeX={width * 0.22} rangeY={height * 0.07} duration={15000} delay={600} />
              <AnimatedBlob size={360} color="#5DA860" startX={width * 0.15} startY={height * 0.06} rangeX={width * 0.35} rangeY={height * 0.09} duration={19000} delay={300} />
              
              {[...Array(12)].map((_, i) => (
                <FloatingParticle
                  key={i}
                  size={Math.random() * 4 + 2}
                  color={['#6DBF6A', '#8AF3C5', '#5DA860'][i % 3]}
                  startX={Math.random() * width}
                  startY={height - 100 + Math.random() * 100}
                  duration={8000 + Math.random() * 4000}
                  delay={i * 400}
                />
              ))}
              
              <WaveLayer width={width} height={height} color="#6DBF6A" top={height * 0.15} duration={18000} delay={0} />
              <WaveLayer width={width} height={height} color="#8AF3C5" top={height * 0.35} duration={22000} delay={800} />
              <WaveLayer width={width} height={height} color="#5DA860" top={height * 0.55} duration={16000} delay={400} />
            </View>

            <Animatable.View animation="fadeInDown" duration={600} delay={100} style={[styles.logoWrapper]}>
              {logoSource ? (
                <Image source={logoSource} style={[styles.logo, isDark ? styles.logoDark : styles.logoLight]} resizeMode="contain" />
              ) : (
                <View style={styles.logoTextFallback}><Text style={styles.logoText}>Brand</Text></View>
              )}
            </Animatable.View>

            <Animatable.View
              animation="fadeInUp"
              duration={500}
              delay={200}
              style={[{ width: cardWidth, marginTop: cardShiftY }]}
            >
              <Animated.View
                style={[styles.cardStroke, { width: cardWidth, height: contentHeightAnim }]}
              >
                <View style={[styles.card, glassEnabled ? styles.cardGlass : null, isLoginView && styles.loginGlassCard, { flex: 1 }]}>
                  {glassEnabled ? (
                    <BlurView intensity={isLoginView ? 120 : 85} tint={isDark ? 'dark' : 'light'} style={styles.cardBlur} />
                  ) : (
                    <View style={styles.cardBlurFallback} />
                  )}

                  <LinearGradient
                    colors={
                      isLoginView
                        ? (isDark ? ['rgba(255,255,255,0.06)', 'rgba(109,191,106,0.06)'] : ['rgba(255,255,255,0.18)', 'rgba(109,191,106,0.10)'])
                        : (isDark ? ['rgba(109,191,106,0.03)', 'rgba(109,191,106,0)'] : ['rgba(109,191,106,0.08)', 'rgba(109,191,106,0.01)'])
                    }
                    style={styles.cardInnerGradient}
                  />

                  <View style={styles.cardContent} onLayout={handleContentLayout}>
                    {!isLoginView && <SignupProgressBar currentStep={signupStep} totalSteps={5} isDark={isDark} />}

                    <View style={styles.headerRow}>
                      {!isLoginView ? (
                        <Pressable onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          if (signupStep > 1) setSignupStep(p => p - 1); else setIsLoginView(true);
                        }}>
                          <Ionicons name="arrow-back" size={22} color={styles.placeholderColor.color} />
                        </Pressable>
                      ) : <View style={{ width: 22 }} />}

                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[styles.headerTitle]}>{isLoginView ? 'Welcome Back' : 'Create an Account'}</Text>
                        <Text style={styles.headerSubtitle}>{isLoginView ? 'Sign in to continue' : 'Let\'s get you set up'}</Text>
                      </View>

                      <View style={{ width: 22 }} />
                    </View>

                    {successText ? (
                      <Animatable.View animation="bounceIn" duration={400}>
                        <Text style={styles.successText}>{String(successText)}</Text>
                      </Animatable.View>
                    ) : null}
                    <ErrorBanner message={errorText} onClose={() => setErrorText('')} />

                    {isLoginView ? (
                      <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [6,0] }) }] }}>
                        {loginStep === 'credentials' ? (
                          <>
                            <TextInput
                              style={[styles.input, focusedField === 'email' ? styles.focusedInput : null]}
                              placeholder="Email"
                              placeholderTextColor={styles.placeholderColor.color}
                              value={email}
                              onChangeText={setEmail}
                              keyboardType="email-address"
                              autoCapitalize="none"
                              onFocus={() => setFocusedField('email')}
                              onBlur={() => setFocusedField(null)}
                            />
                            <View style={styles.passwordContainer}>
                              <TextInput
                                style={styles.passwordInput}
                                placeholder="Password"
                                placeholderTextColor={styles.placeholderColor.color}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                              />
                              <Pressable onPress={() => setShowPassword(s => !s)} style={styles.iconPress}>
                                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={styles.placeholderColor.color} />
                              </Pressable>
                            </View>

                            <ActionButton title="Sign In" onPress={handleLogin} loading={isLoading} style={{ marginTop: 14 }} />
                          </>
                        ) : (
                          <>
                            <Text style={styles.fieldLabel}>Enter verification code</Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                              {loginOtpDigits.map((d, idx) => (
                                <TextInput
                                  key={idx}
                                  ref={ref => (loginOtpRefs.current[idx] = ref)}
                                  style={[styles.input, { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '700' }]}
                                  keyboardType="number-pad"
                                  maxLength={1}
                                  value={loginOtpDigits[idx]}
                                  onChangeText={(t) => {
                                    const v = t.replace(/[^0-9]/g, '');
                                    const next = [...loginOtpDigits];
                                    next[idx] = v;
                                    setLoginOtpDigits(next);
                                    if (v && idx < 5) {
                                      loginOtpRefs.current[idx + 1]?.focus();
                                    }
                                  }}
                                  onKeyPress={({ nativeEvent }) => {
                                    if (nativeEvent.key === 'Backspace' && !loginOtpDigits[idx] && idx > 0) {
                                      loginOtpRefs.current[idx - 1]?.focus();
                                    }
                                  }}
                                />
                              ))}
                            </View>
                            {fieldErrors.otp ? <Text style={styles.inlineError}>{String(fieldErrors.otp)}</Text> : null}
                            {otpInfoText ? <Text style={styles.subtleText}>{otpInfoText}</Text> : null}

                            <View style={styles.actionRow}>
                              <Pressable
                                style={styles.ghostButton}
                                onPress={() => { setLoginStep('credentials'); setOtp(''); clearOTP(email.trim().toLowerCase()); }}
                              >
                                <Text style={styles.ghostButtonText}>Back</Text>
                              </Pressable>
                              <ActionButton title="Verify & Continue" onPress={handleVerifyOtpAndFinishLogin} loading={isLoading} />
                            </View>

                            <View style={[styles.actionRow, { marginTop: 10 }]}>
                              <Pressable
                                disabled={isSendingOtp || resendCooldown > 0}
                                onPress={() => handleSendOtp(email.trim().toLowerCase())}
                                style={[styles.ghostButton, (isSendingOtp || resendCooldown > 0) && styles.buttonDisabled]}
                              >
                                <Text style={styles.ghostButtonText}>
                                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : (isSendingOtp ? 'Sending...' : 'Resend code')}
                                </Text>
                              </Pressable>
                            </View>
                          </>
                        )}

                        <Pressable
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setIsLoginView(false); setSignupStep(1); setFieldErrors({});
                          }}
                          style={styles.linkRow}
                        >
                          <Text style={styles.toggleText}>Don't have an account? <Text style={styles.toggleLink}>Sign Up</Text></Text>
                        </Pressable>
                      </Animated.View>
                    ) : (
                      <>
                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          style={{ marginTop: 6 }}
                          contentContainerStyle={{ paddingBottom: 12 }}
                          nestedScrollEnabled={true}
                          keyboardShouldPersistTaps="handled"
                        >
                          {renderSignupStep()}
                        </ScrollView>
                      </>
                    )}
                  </View>
                </View>
              </Animated.View>
            </Animatable.View>

            {isLoading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color="#6DBF6A" />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = ({ isDark, width, height, cardWidth, cardMinHeight, cardMaxHeight, cardShiftY, glassEnabled }) => {
  if (width === undefined || height === undefined) {
    return StyleSheet.create({
      safeArea: { flex: 1, backgroundColor: '#f4f4f8' },
      container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    });
  }
  
  isDark = isDark ?? false;
  cardWidth = cardWidth || width * 0.9;
  cardMinHeight = cardMinHeight || 360;
  cardMaxHeight = cardMaxHeight || 800;
  cardShiftY = cardShiftY || 10;
  glassEnabled = glassEnabled ?? true;
  
  const colors = {
    text: isDark ? '#E6EEF3' : '#0E1724',
    subtext: isDark ? '#9FB3C8' : '#6B7280',
    primary: '#6DBF6A',
    placeholder: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(16,24,40,0.35)',
    success: '#6DBF6A',
    danger: '#ef4444',
    brand: '#6DBF6A'
  };

  const padding = Math.max(10, Math.round(cardWidth * 0.03));
  const inputHeight = Math.max(44, Math.round(cardMinHeight * 0.07));
  const logoSize = Math.max(120, Math.round(Math.min(width, height) * 0.20));

  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? '#06121A' : '#F7FBFF' },
    scrollContainer: { flexGrow: 1, justifyContent: height > 740 ? 'center' : 'flex-start', paddingVertical: 24 },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    blobContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0, overflow: 'hidden' },

    logoWrapper: {
      zIndex: 4,
      alignSelf: 'center',
      marginTop: Math.max(8, Math.round(height * 0.02)),
      marginBottom: Math.max(6, Math.round(height * 0.01)),
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: { width: logoSize + 100, height: logoSize },
    logoLight: { tintColor: undefined },
    logoDark: { tintColor: undefined },
    logoTextFallback: { width: logoSize, height: logoSize, borderRadius: logoSize / 2, backgroundColor: 'rgba(109,191,106,0.1)', alignItems: 'center', justifyContent: 'center' },
    logoText: { color: colors.brand, fontWeight: '700', fontSize: 24 },

    cardStroke: {
      borderRadius: 28,
      padding: 6,
      shadowColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(109,191,106,0.15)',
      shadowOpacity: isDark ? 0.45 : 0.2,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
      backgroundColor: 'transparent',
      borderWidth: 0.6,
      borderColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)'
    },
    card: {
      width: '100%',
      height: undefined,
      borderRadius: 18,
      overflow: 'visible',
      backgroundColor: glassEnabled ? 'rgba(255,255,255,0.02)' : (isDark ? 'rgba(6,9,12,0.66)' : 'rgba(255,255,255,0.98)'),
      borderWidth: 0.6,
      borderColor: glassEnabled ? (isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.15)') : (isDark ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)'),
    },

    cardBlur: { ...StyleSheet.absoluteFillObject, zIndex: 0, borderRadius: 18 },
    cardBlurFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 0 },
    cardInnerGradient: { ...StyleSheet.absoluteFillObject, zIndex: 1, borderRadius: 18 },
    cardContent: { padding: padding, zIndex: 2 },

    progressContainer: {
      marginBottom: 20,
      marginTop: 8,
    },
    progressBarBackground: {
      height: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      borderRadius: 10,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 10,
      position: 'relative',
      overflow: 'hidden',
    },
    progressGlow: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#6DBF6A',
      shadowColor: '#6DBF6A',
      shadowOpacity: 0.6,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
    },
    progressSteps: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingHorizontal: 4,
    },
    progressDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressDotActive: {
      backgroundColor: '#6DBF6A',
      borderColor: '#6DBF6A',
    },
    progressDotCurrent: {
      backgroundColor: '#6DBF6A',
      borderColor: '#8AF3C5',
      shadowColor: '#6DBF6A',
      shadowOpacity: 0.4,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    progressText: {
      textAlign: 'center',
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: colors.subtext,
    },

    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    headerTitle: { fontSize: Math.max(18, Math.round(cardWidth * 0.048)), fontWeight: '800', color: colors.text, textAlign: 'center' },
    headerSubtitle: { fontSize: 13, color: colors.subtext, marginTop: 4, textAlign: 'center' },

    fieldLabel: { color: colors.subtext, marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '600' },
    smallLabel: { color: colors.subtext, marginTop: 10, marginBottom: 6, fontSize: 13, fontWeight: '600' },

    input: {
      width: '100%',
      height: inputHeight,
      backgroundColor: isDark ? 'rgba(109,191,106,0.03)' : 'rgba(109,191,106,0.04)',
      borderColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)',
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 6,
      paddingHorizontal: 14,
      color: colors.text,
      justifyContent: 'center',
      fontSize: 16,
    },

    focusedInput: {
      borderColor: colors.brand,
      backgroundColor: isDark ? 'rgba(109,191,106,0.06)' : 'rgba(109,191,106,0.08)',
      shadowColor: colors.brand,
      shadowOpacity: 0.2,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 4,
    },

    inputAffixContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: inputHeight,
      backgroundColor: isDark ? 'rgba(109,191,106,0.03)' : 'rgba(109,191,106,0.04)',
      borderColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)',
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 6,
      paddingLeft: 14,
      paddingRight: 8,
    },
    inputAffix: { flex: 1, color: colors.text, fontSize: 16 },
    affixRight: { width: 28, alignItems: 'center', justifyContent: 'center' },

    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: inputHeight,
      backgroundColor: isDark ? 'rgba(109,191,106,0.03)' : 'rgba(109,191,106,0.04)',
      borderColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)',
      borderWidth: 1.5,
      borderRadius: 12,
      marginBottom: 6,
      paddingHorizontal: 12,
    },
    passwordInput: { flex: 1, color: colors.text, fontSize: 16 },
    iconPress: { padding: 6 },

    passwordStrengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    passwordStrengthText: {
      fontSize: 12,
      fontWeight: '700',
    },

    dropdown: {
      width: '100%',
      height: inputHeight,
      borderRadius: 12,
      marginBottom: 12,
      paddingHorizontal: 12,
      borderColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)',
      borderWidth: 1.5,
      backgroundColor: isDark ? 'rgba(109,191,106,0.03)' : 'rgba(109,191,106,0.04)',
    },

    dropdownItem: { 
      padding: 12, 
      borderBottomWidth: 1, 
      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    },
    dropdownItemText: { color: colors.text, fontSize: 16 },
    dropdownListContainer: { 
      borderRadius: 8, 
      marginTop: -8, 
      marginBottom: 12,
      overflow: 'hidden', 
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)',
      backgroundColor: isDark ? 'rgba(6,9,12,0.95)' : 'rgba(255,255,255,0.95)',
    },

    button: { 
      backgroundColor: colors.primary, 
      padding: 14, 
      borderRadius: 14, 
      alignItems: 'center', 
      height: inputHeight, 
      justifyContent: 'center', 
      minWidth: 140,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    buttonPressed: { 
      transform: [{ scale: 0.97 }],
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    ghostButton: { 
      padding: 10, 
      borderRadius: 12, 
      alignItems: 'center', 
      justifyContent: 'center', 
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.15)' : 'rgba(109,191,106,0.25)', 
      backgroundColor: 'transparent', 
      minWidth: 110 
    },
    ghostButtonText: { color: colors.text, fontWeight: '600' },

    actionRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginTop: 14, 
      zIndex: 5,
      gap: 12,
    },

    avatarGrid: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      justifyContent: 'space-around', 
      marginBottom: 16,
      gap: 12,
    },
    avatarWrapper: {
      position: 'relative',
      borderRadius: 16,
      padding: 4,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    avatarWrapperSelected: {
      borderColor: '#6DBF6A',
      backgroundColor: 'rgba(109,191,106,0.08)',
      shadowColor: '#6DBF6A',
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    avatar: (() => {
      const computed = Math.max(64, Math.min(96, Math.floor(cardWidth / 3) - 24));
      return { 
        width: computed, 
        height: computed, 
        borderRadius: Math.round(computed / 6),
        backgroundColor: isDark ? 'rgba(109,191,106,0.05)' : 'rgba(109,191,106,0.08)',
      };
    })(),
    avatarCheckmark: {
      position: 'absolute',
      top: -4,
      right: -4,
      backgroundColor: '#fff',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },

    genderSelector: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginBottom: 12,
      gap: 8,
    },
    genderButton: {
      flex: 1, 
      padding: 12, 
      borderRadius: 12, 
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.12)' : 'rgba(109,191,106,0.2)', 
      backgroundColor: 'transparent',
    },
    genderButtonSelected: { 
      backgroundColor: colors.primary, 
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    genderText: { color: colors.text, fontWeight: '600', fontSize: 14 },
    genderTextSelected: { color: '#fff' },

    suggestionContainer: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      marginBottom: 12,
      gap: 8,
    },
    suggestionChip: {
      paddingHorizontal: 14, 
      paddingVertical: 8, 
      borderRadius: 20,
      backgroundColor: 'transparent', 
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.15)' : 'rgba(109,191,106,0.25)',
    },
    suggestionText: { color: colors.subtext, fontSize: 13, fontWeight: '500' },

    inlineError: { color: '#ff6b6b', fontSize: 13, marginBottom: 8, fontWeight: '500' },
    errorBanner: { 
      backgroundColor: isDark ? 'rgba(255,100,100,0.08)' : 'rgba(255,230,230,0.95)', 
      borderRadius: 12, 
      padding: 12, 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,100,100,0.2)' : 'rgba(255,200,200,0.5)',
    },
    errorBannerText: { color: isDark ? '#ffd6d6' : '#7b1a1a', flex: 1, fontSize: 13 },
    successText: { 
      color: '#6DBF6A', 
      fontSize: 14, 
      marginBottom: 10, 
      textAlign: 'center',
      fontWeight: '600',
    },
    subtleText: { color: colors.subtext, fontSize: 12, marginBottom: 6 },

    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 30,
    },

    linkRow: { marginTop: 12, alignItems: 'center' },
    toggleText: { color: colors.subtext, fontSize: 14, textAlign: 'center' },
    toggleLink: { fontWeight: '700', color: colors.primary },

    placeholderColor: { color: colors.placeholder },
    textColor: { color: colors.text },
    success: { color: colors.success },
    danger: { color: colors.danger },

    smallPill: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(109,191,106,0.12)' : 'rgba(109,191,106,0.2)',
      flex: 1,
      alignItems: 'center',
      marginHorizontal: 4,
    },
    smallPillSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    smallPillText: { color: colors.text, fontSize: 13, fontWeight: '500' },
    smallPillTextSelected: { color: '#fff', fontSize: 13, fontWeight: '700' },

    cardGlass: {
      borderColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.15)',
      backgroundColor: 'transparent',
    },
    loginGlassCard: {
      backgroundColor: 'rgba(255,255,255,0.04)',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      shadowColor: isDark ? '#000' : '#6DBF6A',
      shadowOpacity: isDark ? 0.35 : 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 12,
    },
  });
};
