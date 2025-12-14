// AuthScreen.js - Enhanced with Improved UX, UI, Flow & Animations
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, Image,
  Platform, ActivityIndicator, Animated, Easing, UIManager, LayoutAnimation,
  SafeAreaView, KeyboardAvoidingView, useColorScheme, useWindowDimensions, Linking, ScrollView
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

// Enhanced Floating Particle with more subtle movement
const FloatingParticle = ({ size = 3, color = '#6DBF6A', startX = 0, startY = 0, duration = 12000, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(opacity, { toValue: 0.3, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: 1, duration, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
          ])
        )
      ])
    ]).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY, startY - 180] });
  const translateX = anim.interpolate({ inputRange: [0, 0.3, 0.7, 1], outputRange: [startX, startX + 25, startX - 15, startX] });
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
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}
    />
  );
};

// Enhanced Animated Blob with better subtle movement
const AnimatedBlob = ({ size = 180, color = '#6DBF6A', startX = 0, startY = 0, rangeX = 40, rangeY = 30, duration = 15000, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.bezier(0.45, 0, 0.55, 1), useNativeDriver: true }),
      ])
    );
    
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 4500, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.9, duration: 4500, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
      ])
    );

    const t = setTimeout(() => {
      loop.start();
      pulseAnim.start();
    }, delay);
    return () => { clearTimeout(t); loop.stop(); pulseAnim.stop(); };
  }, []);

  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [startX - rangeX, startX + rangeX, startX - rangeX] });
  const translateY = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [startY - rangeY, startY + rangeY, startY - rangeY] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.08,
        transform: [{ translateX }, { translateY }, { scale: pulse }],
      }}
    />
  );
};

// Enhanced Wave Layer with smoother, subtle transitions
const WaveLayer = ({ width, height, color, top, duration = 20000, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 1500, useNativeDriver: true }).start();
    
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
        height: 100,
        transform: [{ translateX }],
        opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }),
      }}
    >
      <LinearGradient
        colors={[`${color}00`, `${color}60`, `${color}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
};

// Enhanced Progress Bar with milestone celebrations
const SignupProgressBar = ({ currentStep, totalSteps = 5, isDark }) => {
  const progress = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const celebrateAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: currentStep / totalSteps,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();

    // Celebrate milestone completion
    if (currentStep > 0) {
      Animated.sequence([
        Animated.spring(celebrateAnim, { toValue: 1.1, friction: 3, useNativeDriver: true }),
        Animated.spring(celebrateAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
      ]).start();
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
      ])
    ).start();
  }, [currentStep]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

  const progressStyles = StyleSheet.create({
    progressContainer: {
      marginBottom: 20,
      marginTop: 8,
    },
    progressBarBackground: {
      height: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
      borderRadius: 12,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden',
    },
    progressGlow: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#6DBF6A',
      shadowColor: '#6DBF6A',
      shadowOpacity: 0.8,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    },
    progressText: {
      textAlign: 'center',
      marginTop: 10,
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#9FB3C8' : '#6B7280',
    },
    milestoneText: {
      textAlign: 'center',
      marginTop: 4,
      fontSize: 11,
      color: '#6DBF6A',
      fontWeight: '600',
    },
  });

  const getMilestoneText = () => {
    switch(currentStep) {
      case 1: return 'Basic Info';
      case 2: return 'Email Verified';
      case 3: return 'Health Profile';
      case 4: return 'Lifestyle Habits';
      case 5: return 'Choose Avatar';
      default: return '';
    }
  };

  return (
    <Animated.View style={[progressStyles.progressContainer, { transform: [{ scale: celebrateAnim }] }]}>
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
      <Text style={progressStyles.progressText}>Step {currentStep} of {totalSteps}</Text>
      {currentStep > 0 && <Text style={progressStyles.milestoneText}>{getMilestoneText()}</Text>}
    </Animated.View>
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
      return 'Email already registered - please log in.';
    case 'auth/weak-password':
      return 'Password is too weak (minimum 6 characters).';
    default:
      return context === 'signup'
        ? 'Couldn\'t create account. Please try again.'
        : 'Failed to sign in. Please try again.';
  }
}

// FIX 1: Extracted OTPInput component outside to prevent keyboard dismissal
const OTPInput = ({ digits, setDigits, refs, fieldErrors, styles, isDark }) => {
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
        {digits.map((d, idx) => (
          <Animated.View key={idx} style={{ flex: 1 }}>
            <TextInput
              ref={ref => (refs.current[idx] = ref)}
              style={[
                styles.input,
                { 
                  textAlign: 'center', 
                  fontSize: 24, 
                  fontWeight: '700',
                  paddingVertical: 0, // Fix for visibility
                  height: 54, // Fixed height for visibility
                  justifyContent: 'center',
                },
                d && { borderColor: '#6DBF6A', borderWidth: 2, backgroundColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)' }
              ]}
              keyboardType="number-pad"
              maxLength={1}
              value={digits[idx]}
              onChangeText={(t) => {
                const v = t.replace(/[^0-9]/g, '');
                const next = [...digits];
                next[idx] = v;
                setDigits(next);
                if (v && idx < 5) {
                  setTimeout(() => {
                    refs.current[idx + 1]?.focus();
                  }, 50);
                  if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
                  setTimeout(() => {
                    refs.current[idx - 1]?.focus();
                  }, 50);
                }
              }}
              returnKeyType={idx === 5 ? 'done' : 'next'}
              blurOnSubmit={idx === 5}
            />
          </Animated.View>
        ))}
      </View>
      {fieldErrors?.otp && <Text style={styles.inlineError}>{String(fieldErrors.otp)}</Text>}
    </>
  );
};

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

  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState('credentials');
  const [otp, setOtp] = useState('');
  const [loginOtpDigits, setLoginOtpDigits] = useState(['', '', '', '', '', '']);
  const loginOtpRefs = useRef([null, null, null, null, null, null]);
  const [otpInfoText, setOtpInfoText] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendTimerRef = useRef(null);
  
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

  // Enhanced date picker with proper formatting
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

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
          setFieldErrors(prev => ({ ...prev, email: 'Email already registered - use Login.' }));
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
    if (isEmailRegistered) errs.email = 'Email already registered - use Login.';
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
    if (!password) return { text: '', color: '', percentage: 0 };
    const length = password.length;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    
    let strength = 0;
    if (length >= 6) strength += 25;
    if (length >= 10) strength += 25;
    if (hasUpper && hasLower) strength += 15;
    if (hasDigit) strength += 15;
    if (hasSpecial) strength += 20;
    
    if (strength < 40) return { text: 'Weak', color: '#ef4444', percentage: strength };
    if (strength < 70) return { text: 'Medium', color: '#FFA500', percentage: strength };
    return { text: 'Strong', color: '#6DBF6A', percentage: strength };
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
      Animated.spring(contentHeightAnim, {
        toValue: desired,
        friction: 10,
        tension: 40,
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
    Toast.show({ type: type, text1: message, position: 'top', visibilityTime: 2500, topOffset: 50 });
  };

  useEffect(() => {
    if (!errorText) return;
    const t = setTimeout(() => setErrorText(''), 4000);
    return () => clearTimeout(t);
  }, [errorText]);

  const handleLogin = async () => {
    setErrorText(''); setSuccessText('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorText('Email and password are required for login.');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, password);
      setIsLoading(false);
      // OTP should NOT be sent after login. If you want to require OTP for login, implement a separate step and trigger explicitly.
      // setLoginStep('otp'); // Remove this if OTP is not required for login
      // Optionally, navigate to dashboard or home screen here
      // Example: navigation.navigate('Dashboard');
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
        try { Toast.show({ type: 'success', text1: 'OTP sent successfully', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
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
        try { Toast.show({ type: 'error', text1: result?.error || 'Failed to send OTP', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
      }
    } catch (err) {
      try { Toast.show({ type: 'error', text1: 'Failed to send OTP. Please try again.', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
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
        try { Toast.show({ type: 'success', text1: 'Verification code sent to your email', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
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
        try { Toast.show({ type: 'error', text1: result?.error || 'Failed to send OTP', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
      }
    } catch (err) {
      try { Toast.show({ type: 'error', text1: 'Failed to send OTP. Please try again.', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
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
        try { Toast.show({ type: 'success', text1: 'Login successful!', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
        setLoginStep('credentials');
        setOtp('');
        setLoginOtpDigits(['','','','','','']);
      } else {
        try { Toast.show({ type: 'error', text1: res.error || 'Invalid code', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
      }
    } catch (err) {
      try { Toast.show({ type: 'error', text1: 'Verification failed. Please try again.', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
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
    if (!ok2) { setSignupStep(3); return; }
    if (!selectedAvatarKey) { setFieldErrors(prev => ({ ...prev, avatar: 'Please select an avatar.' })); setSignupStep(5); return; }
    if (!bloodGroup) { setFieldErrors(prev => ({ ...prev, bloodGroup: 'Please select blood group.' })); setSignupStep(4); return; }

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
      setSuccessText('Account created successfully! You can login now.');
      try { Toast.show({ type: 'success', text1: 'Account created successfully!', position: 'top', visibilityTime: 3000, topOffset: 50 }); } catch(e) {}
      setTimeout(() => {
        setIsLoginView(true);
        setSignupStep(1);
        setFirstName(''); setLastName(''); setPhone(''); setDob(null);
        setGender(null); setHeight(''); setWeight(''); setBloodGroup(null);
        setConditions(''); setSelectedAvatarKey(null); setPassword('');
        setSmoking('no'); setDrinking('no'); setSmokingFreq(''); setDrinkingFreq('');
      }, 2000);
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
    setSignupStep(4);
  };

  const logoSource = isDark ? (logoDark || logoLight || logoFallback) : (logoLight || logoDark || logoFallback);
  const styles = createStyles({ isDark, width, height, cardWidth, cardMinHeight, cardMaxHeight, glassEnabled });

  if (!styles || !styles.safeArea || !styles.container) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f8' }}>
        <ActivityIndicator size="large" color="#6DBF6A" />
      </View>
    );
  }

  const ActionButton = ({ title, onPress, disabled, loading, style, icon }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    const handlePressIn = () => {
      if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.spring(scaleAnim, { toValue: 0.95, friction: 3, useNativeDriver: true }).start();
    };
    
    const handlePressOut = () => {
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    };

    return (
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.button, disabled && styles.buttonDisabled, style]}
        disabled={disabled || loading}
      >
        <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, { transform: [{ scale: scaleAnim }] }]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              {icon && <Ionicons name={icon} size={18} color="#fff" />}
              <Text style={styles.buttonText}>{title}</Text>
            </>
          )}
        </Animated.View>
      </Pressable>
    );
  };

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
    const passwordStrength = getPasswordStrength();

    switch (signupStep) {
      case 1:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }] }}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, focusedField === 'firstName' && styles.focusedInput]}
                    placeholder="First name"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={firstName}
                    onChangeText={t => { setFirstName(t); setFieldErrors(prev => ({ ...prev, firstName: undefined })); }}
                    onFocus={() => setFocusedField('firstName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                  />
                  {fieldErrors.firstName && <Text style={styles.inlineError}>{String(fieldErrors.firstName)}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[styles.input, focusedField === 'lastName' && styles.focusedInput]}
                    placeholder="Last name"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={lastName}
                    onChangeText={t => { setLastName(t); setFieldErrors(prev => ({ ...prev, lastName: undefined })); }}
                    onFocus={() => setFocusedField('lastName')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="words"
                  />
                  {fieldErrors.lastName && <Text style={styles.inlineError}>{String(fieldErrors.lastName)}</Text>}
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputAffixContainer}>
                <TextInput
                  style={[styles.inputAffix, focusedField === 'email' && { color: '#6DBF6A' }]}
                  placeholder="your.email@example.com"
                  placeholderTextColor={styles.placeholderColor.color}
                  value={email}
                  onChangeText={t => { setEmail(t); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
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
              {fieldErrors.email && <Text style={styles.inlineError}>{String(fieldErrors.email)}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor={styles.placeholderColor.color}
                  value={password}
                  onChangeText={t => { setPassword(t); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.iconPress}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={styles.placeholderColor.color} />
                </Pressable>
              </View>
              {fieldErrors.password && <Text style={styles.inlineError}>{String(fieldErrors.password)}</Text>}
              {password && (
                <View style={styles.passwordStrengthContainer}>
                  <View style={styles.passwordStrengthBar}>
                    <Animated.View 
                      style={[
                        styles.passwordStrengthFill, 
                        { 
                          width: `${passwordStrength.percentage}%`,
                          backgroundColor: passwordStrength.color 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                    {passwordStrength.text}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.termsRow}>
              <Pressable onPress={() => setAcceptedTerms(v => !v)} style={[styles.termsCheckbox]}> 
                <Ionicons name={acceptedTerms ? 'checkbox' : 'square-outline'} size={20} color={acceptedTerms ? '#6DBF6A' : styles.placeholderColor.color} />
              </Pressable>
              <Text style={styles.termsText}>I accept the</Text>
              <Pressable onPress={() => { try { Linking.openURL('https://nikhilcodes.info'); } catch (e) {} }}>
                <Text style={styles.termsLink}>Terms & Conditions</Text>
              </Pressable>
            </View>

            <View style={styles.actionRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsLoginView(true); setSignupStep(1); setFieldErrors({});
                  }}
                  style={[styles.ghostButton, { alignItems: 'center' }]}
                >
                  <Ionicons name="arrow-back" size={16} color={styles.textColor.color} style={{ marginRight: 6 }} />
                  <Text style={styles.ghostButtonText}>Back to Login</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <ActionButton
                  title="Send OTP"
                  icon="mail-outline"
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
            </View>
          </Animated.View>
        );
      
      case 2:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }] }}>
            <View style={styles.otpHeader}>
              <Ionicons name="mail-open" size={48} color="#6DBF6A" />
              <Text style={styles.otpTitle}>Verify your email</Text>
              <Text style={styles.otpSubtitle}>We sent a 6-digit code to</Text>
              <Text style={styles.otpEmail}>{email?.trim().toLowerCase()}</Text>
            </View>

            <OTPInput 
              digits={signupOtpDigits} 
              setDigits={setSignupOtpDigits} 
              refs={signupOtpRefs}
              fieldErrors={fieldErrors}
              styles={styles}
              isDark={isDark}
            />
            
            {signupOtpInfoText && <Text style={[styles.subtleText, { textAlign: 'center', marginTop: 8 }]}>{signupOtpInfoText}</Text>}

            <View style={styles.actionRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Pressable
                  style={[styles.ghostButton, { alignItems: 'center' }]}
                  onPress={() => { 
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setSignupStep(1); 
                    setSignupOtpDigits(['','','','','','']);
                    clearOTP((email || '').trim().toLowerCase());
                  }}
                >
                  <Ionicons name="arrow-back" size={16} color={styles.textColor.color} style={{ marginRight: 6 }} />
                  <Text style={styles.ghostButtonText}>Back</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <ActionButton 
                  title="Verify"
                  icon="checkmark-circle"
                  onPress={async () => {
                    const code = signupOtpDigits.join('');
                    if (code.length !== 6) { setFieldErrors(prev => ({ ...prev, otp: 'Enter the 6-digit code.' })); return; }
                    setIsLoading(true);
                    const res = await verifyOTP((email || '').trim().toLowerCase(), code);
                    if (res.success) {
                      setSuccessText('Email verified successfully!');
                      try { Toast.show({ type: 'success', text1: 'Email verified!', position: 'top', visibilityTime: 2500, topOffset: 50 }); } catch(e) {}
                      setSignupOtpDigits(['','','','','','']);
                      setTimeout(() => {
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                        setSignupStep(3);
                      }, 500);
                    } else {
                      setErrorText(res.error || 'Invalid code.');
                    }
                    setIsLoading(false);
                  }} 
                  loading={isLoading}
                />
              </View>
            </View>

            <View style={{ marginTop: 16, alignItems: 'center' }}>
              <Pressable
                disabled={isSendingSignupOtp || signupResendCooldown > 0}
                onPress={() => handleSendSignupOtp((email || '').trim().toLowerCase())}
                style={[styles.linkButton, (isSendingSignupOtp || signupResendCooldown > 0) && { opacity: 0.5 }]}
              >
                <Text style={styles.linkButtonText}>
                  {signupResendCooldown > 0 ? `Resend code in ${signupResendCooldown}s` : (isSendingSignupOtp ? 'Sending...' : 'Resend code')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        );
      
      case 3:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }] }}>
            <Text style={styles.stepTitle}>Personal Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[styles.dropdown, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="calendar-outline" size={18} color={styles.placeholderColor.color} style={{ marginRight: 8 }} />
                  <Text style={{ color: dob ? styles.textColor.color : styles.placeholderColor.color, fontSize: 16 }}>
                    {dob ? formatDate(dob) : 'Select your date of birth'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={18} color={styles.placeholderColor.color} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={dob || new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDob(selectedDate);
                      setFieldErrors(prev => ({ ...prev, dob: undefined }));
                    }
                  }}
                />
              )}
              {fieldErrors.dob && <Text style={styles.inlineError}>{String(fieldErrors.dob)}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Number</Text>
              <View style={styles.inputAffixContainer}>
                <Text style={{ color: styles.textColor.color, fontWeight: '600', marginRight: 8 }}>+91</Text>
                <TextInput
                  style={styles.inputAffix}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={styles.placeholderColor.color}
                  value={phoneDigits}
                  onChangeText={t => { setPhoneDigits(t.replace(/[^0-9]/g, '')); setFieldErrors(prev => ({ ...prev, phone: undefined })); }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              {fieldErrors.phone && <Text style={styles.inlineError}>{String(fieldErrors.phone)}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <View style={styles.genderSelector}>
                <Pressable style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
                  onPress={() => { setGender('male'); setFieldErrors(prev => ({ ...prev, gender: undefined })); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Ionicons name="male" size={20} color={gender === 'male' ? '#fff' : styles.placeholderColor.color} />
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>Male</Text>
                </Pressable>
                <Pressable style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
                  onPress={() => { setGender('female'); setFieldErrors(prev => ({ ...prev, gender: undefined })); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Ionicons name="female" size={20} color={gender === 'female' ? '#fff' : styles.placeholderColor.color} />
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>Female</Text>
                </Pressable>
                <Pressable style={[styles.genderButton, gender === 'other' && styles.genderButtonSelected]}
                  onPress={() => { setGender('other'); setFieldErrors(prev => ({ ...prev, gender: undefined })); if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                  <Ionicons name="transgender" size={20} color={gender === 'other' ? '#fff' : styles.placeholderColor.color} />
                  <Text style={[styles.genderText, gender === 'other' && styles.genderTextSelected]}>Other</Text>
                </Pressable>
              </View>
              {fieldErrors.gender && <Text style={styles.inlineError}>{String(fieldErrors.gender)}</Text>}
            </View>

            <View style={styles.actionRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Pressable
                  style={[styles.ghostButton, { alignItems: 'center' }]}
                  onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(2); }}
                >
                  <Ionicons name="arrow-back" size={16} color={styles.textColor.color} style={{ marginRight: 6 }} />
                  <Text style={styles.ghostButtonText}>Back</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <ActionButton title="Continue" icon="arrow-forward" onPress={goNextFromStep2} />
              </View>
            </View>
          </Animated.View>
        );
      
      case 4:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }], flex: 1 }}>
            <Text style={styles.stepTitle}>Health Profile</Text>
            
            {/* FIX 2: Added ScrollView with fixed max height to allow scrolling when content overflows */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: height * 0.55 }} 
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <View style={styles.inputAffixContainer}>
                    <Ionicons name="resize-outline" size={18} color={styles.placeholderColor.color} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.inputAffix}
                      placeholder="170"
                      placeholderTextColor={styles.placeholderColor.color}
                      value={heightVal}
                      onChangeText={t => setHeight(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <View style={styles.inputAffixContainer}>
                    <Ionicons name="fitness-outline" size={18} color={styles.placeholderColor.color} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.inputAffix}
                      placeholder="70"
                      placeholderTextColor={styles.placeholderColor.color}
                      value={weightVal}
                      onChangeText={t => setWeight(t.replace(/[^0-9.]/g, ''))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Blood Group</Text>
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
                {showBloodList && (
                  <View style={styles.dropdownListContainer}> 
                    {bloodGroupData.map(item => {
                      const selected = item.value === bloodGroup;
                      return (
                        <Pressable
                          key={item.value}
                          onPress={() => { 
                            setBloodGroup(item.value); 
                            setFieldErrors(prev => ({ ...prev, bloodGroup: undefined })); 
                            setShowBloodList(false);
                            if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          style={[styles.dropdownItem, selected && styles.dropdownItemSelected]}
                        >
                          <Text style={[styles.dropdownItemText, selected && styles.dropdownItemTextSelected]}>{item.label}</Text>
                          {selected && <Ionicons name="checkmark" size={20} color="#fff" />}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {fieldErrors.bloodGroup && <Text style={styles.inlineError}>{String(fieldErrors.bloodGroup)}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Medical Conditions (Optional)</Text>
                <TextInput
                  style={[styles.input, { height: 90, textAlignVertical: 'top', paddingTop: 14 }]}
                  placeholder="E.g., Diabetes, Hypertension, etc."
                  placeholderTextColor={styles.placeholderColor.color}
                  value={conditions}
                  onChangeText={setConditions}
                  multiline
                />
                <View style={styles.suggestionContainer}>
                  {["Diabetes", "Hypertension", "Asthma", "Thyroid", "Arthritis"].map(c => (
                    <Pressable 
                      key={c} 
                      onPress={() => {
                        setConditions(prev => (prev ? `${prev}, ${c}` : c));
                        if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }} 
                      style={styles.suggestionChip}
                    >
                      <Text style={styles.suggestionText}>+ {c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Smoking Habits</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  {['no', 'occasionally', 'daily'].map(option => (
                    <Pressable 
                      key={option}
                      style={[styles.smallPill, smoking === option && styles.smallPillSelected]} 
                      onPress={() => {
                        setSmoking(option);
                        if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[styles.smallPillText, smoking === option && styles.smallPillTextSelected]}>
                        {option === 'no' ? 'No' : option === 'occasionally' ? 'Sometimes' : 'Daily'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {smoking === 'occasionally' && (
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="How many per day/week?"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={smokingFreq}
                    onChangeText={setSmokingFreq}
                  />
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Drinking Habits</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  {['no', 'occasionally', 'daily'].map(option => (
                    <Pressable 
                      key={option}
                      style={[styles.smallPill, drinking === option && styles.smallPillSelected]} 
                      onPress={() => {
                        setDrinking(option);
                        if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[styles.smallPillText, drinking === option && styles.smallPillTextSelected]}>
                        {option === 'no' ? 'No' : option === 'occasionally' ? 'Sometimes' : 'Daily'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {drinking === 'occasionally' && (
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="How many units per week?"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={drinkingFreq}
                    onChangeText={setDrinkingFreq}
                  />
                )}
              </View>

              <View style={styles.actionRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Pressable
                    style={[styles.ghostButton, { alignItems: 'center' }]}
                    onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(3); }}
                  >
                    <Ionicons name="arrow-back" size={16} color={styles.textColor.color} style={{ marginRight: 6 }} />
                    <Text style={styles.ghostButtonText}>Back</Text>
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <ActionButton title="Continue" icon="arrow-forward" onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(5); }} />
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        );
      
      case 5:
        return (
          <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [20,0] }) }] }}>
            <View style={styles.avatarHeader}>
              <Text style={styles.stepTitle}>Choose Your Avatar</Text>
              <Text style={styles.stepSubtitle}>Select an avatar that represents you</Text>
            </View>
            
            <View style={styles.avatarGrid}>
              {avatarKeys.map(key => (
                <Pressable 
                  key={key} 
                  onPress={() => { 
                    setSelectedAvatarKey(key); 
                    setFieldErrors(prev => ({ ...prev, avatar: undefined })); 
                    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  style={[styles.avatarWrapper, selectedAvatarKey === key && styles.avatarWrapperSelected]}
                >
                  <Image source={getAvatarSource(key)} style={styles.avatar} />
                  {selectedAvatarKey === key && (
                    <Animatable.View animation="bounceIn" duration={400} style={styles.avatarCheckmark}>
                      <Ionicons name="checkmark-circle" size={28} color="#6DBF6A" />
                    </Animatable.View>
                  )}
                </Pressable>
              ))}
            </View>
            {fieldErrors.avatar && <Text style={styles.inlineError}>{String(fieldErrors.avatar)}</Text>}

            <View style={styles.actionRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Pressable
                  style={[styles.ghostButton, { alignItems: 'center' }]}
                  onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(4); }}
                >
                  <Ionicons name="arrow-back" size={16} color={styles.textColor.color} style={{ marginRight: 6 }} />
                  <Text style={styles.ghostButtonText}>Back</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <ActionButton title="Create Account" icon="checkmark-done" onPress={handleSignUpFinal} loading={isLoading} />
              </View>
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
    Animated.spring(stepAnim, {
      toValue: 1,
      friction: 9,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, [signupStep, loginStep]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.container}>
          <LinearGradient colors={isDark ? ['#07121B', '#06101A'] : ['#F7FBFF', '#F2F6FF']} style={StyleSheet.absoluteFill} />

          <View style={styles.blobContainer} pointerEvents="none">
            <AnimatedBlob size={250} color="#6DBF6A" startX={-80} startY={-40} rangeX={width * 0.20} rangeY={height * 0.04} duration={18000} delay={0} />
            <AnimatedBlob size={200} color="#8AF3C5" startX={width * 0.70} startY={-20} rangeX={width * 0.18} rangeY={height * 0.05} duration={22000} delay={800} />
            <AnimatedBlob size={280} color="#5DA860" startX={width * 0.15} startY={height * 0.08} rangeX={width * 0.25} rangeY={height * 0.06} duration={25000} delay={500} />
            
            {[...Array(12)].map((_, i) => (
              <FloatingParticle
                key={i}
                size={Math.random() * 3 + 2}
                color={['#6DBF6A', '#8AF3C5', '#5DA860'][i % 3]}
                startX={Math.random() * width}
                startY={height - 100 + Math.random() * 100}
                duration={12000 + Math.random() * 6000}
                delay={i * 400}
              />
            ))}
            
            <WaveLayer width={width} height={height} color="#6DBF6A" top={height * 0.15} duration={25000} delay={0} />
            <WaveLayer width={width} height={height} color="#8AF3C5" top={height * 0.35} duration={30000} delay={1000} />
            <WaveLayer width={width} height={height} color="#5DA860" top={height * 0.55} duration={22000} delay={600} />
          </View>

          <View style={styles.contentWrapper}>
            <Animatable.View animation="fadeInDown" duration={700} delay={150} style={styles.logoWrapper}>
              {logoSource ? (
                <Image source={logoSource} style={[styles.logo, isDark ? styles.logoDark : styles.logoLight]} resizeMode="contain" />
              ) : (
                <View style={styles.logoTextFallback}><Text style={styles.logoText}>Brand</Text></View>
              )}
            </Animatable.View>

            <Animatable.View
              animation="fadeInUp"
              duration={600}
              delay={250}
              style={[{ width: cardWidth }]}
            >
              <Animated.View
                style={[styles.cardStroke, { width: cardWidth, height: contentHeightAnim }]}
              >
                <View style={[styles.card, glassEnabled ? styles.cardGlass : null, isLoginView && styles.loginGlassCard, { flex: 1 }]}>
                  {glassEnabled ? (
                    <BlurView intensity={isLoginView ? 130 : 95} tint={isDark ? 'dark' : 'light'} style={styles.cardBlur} />
                  ) : (
                    <View style={styles.cardBlurFallback} />
                  )}

                  <LinearGradient
                    colors={
                      isLoginView
                        ? (isDark ? ['rgba(255,255,255,0.07)', 'rgba(109,191,106,0.08)'] : ['rgba(255,255,255,0.20)', 'rgba(109,191,106,0.12)'])
                        : (isDark ? ['rgba(109,191,106,0.04)', 'rgba(109,191,106,0)'] : ['rgba(109,191,106,0.10)', 'rgba(109,191,106,0.02)'])
                    }
                    style={styles.cardInnerGradient}
                  />

                  <View style={styles.cardContent} onLayout={handleContentLayout}>
                    {!isLoginView && <SignupProgressBar currentStep={signupStep} totalSteps={5} isDark={isDark} />}

                    <View style={styles.headerRow}>
                      {!isLoginView && signupStep > 1 ? (
                        <Pressable onPress={() => {
                          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                          setSignupStep(p => p - 1);
                        }}>
                          <Ionicons name="arrow-back" size={24} color={styles.placeholderColor.color} />
                        </Pressable>
                      ) : <View style={{ width: 24 }} />}

                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>
                          {isLoginView ? 'Welcome Back' : 'Create Account'}
                        </Text>
                        <Text style={styles.headerSubtitle}>
                          {isLoginView ? 'Sign in to continue your journey' : 'Join us and start your wellness journey'}
                        </Text>
                      </View>

                      <View style={{ width: 24 }} />
                    </View>

                    {successText && (
                      <Animatable.View animation="bounceIn" duration={500}>
                        <View style={styles.successBanner}>
                          <Ionicons name="checkmark-circle" size={20} color="#6DBF6A" style={{ marginRight: 8 }} />
                          <Text style={styles.successText}>{String(successText)}</Text>
                        </View>
                      </Animatable.View>
                    )}
                    
                    <ErrorBanner message={errorText} onClose={() => setErrorText('')} />

                    {isLoginView ? (
                      <Animated.View style={{ opacity: stepAnim, transform: [{ translateY: stepAnim.interpolate({ inputRange: [0,1], outputRange: [12,0] }) }] }}>
                        {loginStep === 'credentials' ? (
                          <>
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Email</Text>
                              <TextInput
                                style={[styles.input, focusedField === 'email' && styles.focusedInput]}
                                placeholder="your.email@example.com"
                                placeholderTextColor={styles.placeholderColor.color}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                              />
                            </View>

                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>Password</Text>
                              <View style={[styles.passwordContainer, focusedField === 'password' && styles.focusedInput]}>
                                <TextInput
                                  style={styles.passwordInput}
                                  placeholder="Enter your password"
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
                            </View>

                            <ActionButton 
                              title="Sign In" 
                              icon="log-in-outline"
                              onPress={handleLogin} 
                              loading={isLoading}
                              style={{ marginTop: 8 }}
                            />
                          </>
                        ) : (
                          <>
                            <View style={styles.otpHeader}>
                              <Ionicons name="shield-checkmark" size={48} color="#6DBF6A" />
                              <Text style={styles.otpTitle}>Verify It's You</Text>
                              <Text style={styles.otpSubtitle}>Enter the verification code sent to</Text>
                              <Text style={styles.otpEmail}>{email?.trim().toLowerCase()}</Text>
                            </View>

                            <OTPInput 
                              digits={loginOtpDigits} 
                              setDigits={setLoginOtpDigits} 
                              refs={loginOtpRefs}
                              fieldErrors={fieldErrors}
                              styles={styles}
                              isDark={isDark}
                            />
                            
                            {otpInfoText && <Text style={[styles.subtleText, { textAlign: 'center', marginTop: 8 }]}>{otpInfoText}</Text>}

                            <View style={styles.actionRow}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <Pressable
                                  style={[styles.ghostButton, { alignItems: 'center' }]}
                                  onPress={() => { setLoginStep('credentials'); setOtp(''); clearOTP(email.trim().toLowerCase()); }}
                                >
                                  <Ionicons name="arrow-back" size={16} color={styles.textColor.color} style={{ marginRight: 6 }} />
                                  <Text style={styles.ghostButtonText}>Back</Text>
                                </Pressable>
                              </View>
                              <View style={{ flex: 1 }}>
                                <ActionButton title="Verify" icon="checkmark-circle" onPress={handleVerifyOtpAndFinishLogin} loading={isLoading} />
                              </View>
                            </View>

                            <View style={{ marginTop: 16, alignItems: 'center' }}>
                              <Pressable
                                disabled={isSendingOtp || resendCooldown > 0}
                                onPress={() => handleSendOtp(email.trim().toLowerCase())}
                                style={[styles.linkButton, (isSendingOtp || resendCooldown > 0) && { opacity: 0.5 }]}
                              >
                                <Text style={styles.linkButtonText}>
                                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : (isSendingOtp ? 'Sending...' : 'Resend code')}
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
                          <Text style={styles.toggleText}>
                            Don't have an account? <Text style={styles.toggleLink}>Sign Up</Text>
                          </Text>
                        </Pressable>
                      </Animated.View>
                    ) : (
                      <View style={{ marginTop: 6 }}>
                        {renderSignupStep()}
                      </View>
                    )}
                  </View>
                </View>
              </Animated.View>
            </Animatable.View>
          </View>

          {isLoading && (
            <View style={styles.loadingOverlay} pointerEvents="none">
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#6DBF6A" />
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
}

const createStyles = ({ isDark, width, height, cardWidth, cardMinHeight, cardMaxHeight, glassEnabled }) => {
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
  glassEnabled = glassEnabled ?? true;
  
  const colors = {
    text: isDark ? '#E6EEF3' : '#0E1724',
    subtext: isDark ? '#9FB3C8' : '#6B7280',
    primary: '#6DBF6A',
    placeholder: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(16,24,40,0.38)',
    success: '#6DBF6A',
    danger: '#ef4444',
    brand: '#6DBF6A'
  };

  const padding = Math.max(12, Math.round(cardWidth * 0.035));
  const inputHeight = Math.max(48, Math.round(cardMinHeight * 0.075));
  const logoSize = Math.max(120, Math.round(Math.min(width, height) * 0.20));

  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? '#06121A' : '#F7FBFF' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    contentWrapper: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      paddingVertical: 20,
    },
    blobContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0, overflow: 'hidden' },

    logoWrapper: {
      zIndex: 4,
      alignSelf: 'center',
      marginBottom: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: { width: logoSize + 100, height: logoSize },
    logoLight: { tintColor: undefined },
    logoDark: { tintColor: undefined },
    logoTextFallback: { width: logoSize, height: logoSize, borderRadius: logoSize / 2, backgroundColor: 'rgba(109,191,106,0.12)', alignItems: 'center', justifyContent: 'center' },
    logoText: { color: colors.brand, fontWeight: '700', fontSize: 26 },

    cardStroke: {
      borderRadius: 32,
      padding: 6,
      shadowColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(109,191,106,0.18)',
      shadowOpacity: isDark ? 0.5 : 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 12,
      backgroundColor: 'transparent',
      borderWidth: 0.8,
      borderColor: isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.15)'
    },
    card: {
      width: '100%',
      height: undefined,
      borderRadius: 22,
      overflow: 'visible',
      backgroundColor: glassEnabled ? 'rgba(255,255,255,0.03)' : (isDark ? 'rgba(6,9,12,0.70)' : 'rgba(255,255,255,0.99)'),
      borderWidth: 0.8,
      borderColor: glassEnabled ? (isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.18)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'),
    },

    cardBlur: { ...StyleSheet.absoluteFillObject, zIndex: 0, borderRadius: 22 },
    cardBlurFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 0 },
    cardInnerGradient: { ...StyleSheet.absoluteFillObject, zIndex: 1, borderRadius: 22 },
    cardContent: { padding: Math.max(padding, 20), paddingTop: Math.max(padding, 22), zIndex: 2 },

    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    headerTitle: { fontSize: Math.max(20, Math.round(cardWidth * 0.052)), fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.5 },
    headerSubtitle: { fontSize: 13, color: colors.subtext, marginTop: 5, textAlign: 'center', fontWeight: '500' },

    inputGroup: { marginBottom: 16 },
    inputLabel: { color: colors.text, marginBottom: 8, fontSize: 14, fontWeight: '600' },
    stepTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 6 },
    stepSubtitle: { fontSize: 13, color: colors.subtext, marginBottom: 12 },

    input: {
      width: '100%',
      height: inputHeight,
      backgroundColor: isDark ? 'rgba(109,191,106,0.04)' : 'rgba(109,191,106,0.06)',
      borderColor: isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.15)',
      borderWidth: 1.5,
      borderRadius: 14,
      marginBottom: 0,
      paddingHorizontal: 16,
      color: colors.text,
      justifyContent: 'center',
      fontSize: 16,
    },

    focusedInput: {
      borderColor: colors.brand,
      borderWidth: 2,
      backgroundColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.10)',
      shadowColor: colors.brand,
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 14,
      elevation: 5,
    },

    inputAffixContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: inputHeight,
      backgroundColor: isDark ? 'rgba(109,191,106,0.04)' : 'rgba(109,191,106,0.06)',
      borderColor: isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.15)',
      borderWidth: 1.5,
      borderRadius: 14,
      marginBottom: 0,
      paddingLeft: 16,
      paddingRight: 10,
    },
    inputAffix: { flex: 1, color: colors.text, fontSize: 16 },
    affixRight: { width: 30, alignItems: 'center', justifyContent: 'center' },

    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: inputHeight,
      backgroundColor: isDark ? 'rgba(109,191,106,0.04)' : 'rgba(109,191,106,0.06)',
      borderColor: isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.15)',
      borderWidth: 1.5,
      borderRadius: 14,
      marginBottom: 0,
      paddingHorizontal: 16,
    },
    passwordInput: { flex: 1, color: colors.text, fontSize: 16 },
    iconPress: { padding: 8 },

    passwordStrengthContainer: {
      marginTop: 10,
      marginBottom: 4,
    },
    passwordStrengthBar: {
      height: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    passwordStrengthFill: {
      height: '100%',
      borderRadius: 4,
      transition: 'width 0.3s ease',
    },
    passwordStrengthText: {
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },

    dropdown: {
      width: '100%',
      height: inputHeight,
      borderRadius: 14,
      marginBottom: 0,
      paddingHorizontal: 16,
      borderColor: isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.15)',
      borderWidth: 1.5,
      backgroundColor: isDark ? 'rgba(109,191,106,0.04)' : 'rgba(109,191,106,0.06)',
    },

    dropdownItem: { 
      padding: 14, 
      borderBottomWidth: 1, 
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dropdownItemSelected: {
      backgroundColor: '#6DBF6A',
      borderBottomColor: 'transparent',
    },
    dropdownItemText: { color: colors.text, fontSize: 16, fontWeight: '500' },
    dropdownItemTextSelected: { color: '#fff', fontWeight: '700' },
    dropdownListContainer: { 
      borderRadius: 12, 
      marginTop: 8, 
      marginBottom: 0,
      overflow: 'hidden', 
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.15)',
      backgroundColor: isDark ? 'rgba(6,9,12,0.98)' : 'rgba(255,255,255,0.98)',
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },

    button: { 
      backgroundColor: colors.primary, 
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderRadius: 16, 
      alignItems: 'center', 
      minHeight: inputHeight, 
      justifyContent: 'center', 
      alignSelf: 'stretch',
      flexShrink: 1,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },

    ghostButton: { 
      padding: 12, 
      borderRadius: 14, 
      alignItems: 'center', 
      justifyContent: 'center', 
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.18)' : 'rgba(109,191,106,0.30)', 
      backgroundColor: 'transparent',
      flexDirection: 'row',
    },
    ghostButtonText: { color: colors.text, fontWeight: '600', fontSize: 15 },

    actionRow: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginTop: 16, 
      zIndex: 5,
      gap: 12,
    },
    
    termsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 14,
      flexWrap: 'wrap',
    },
    termsCheckbox: {
      marginRight: 10,
      padding: 4,
    },
    termsText: { color: colors.subtext, fontSize: 13, marginRight: 4 },
    termsLink: { fontWeight: '700', color: colors.primary, fontSize: 13, textDecorationLine: 'underline' },

    otpHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    otpTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
      marginBottom: 6,
    },
    otpSubtitle: {
      fontSize: 13,
      color: colors.subtext,
      textAlign: 'center',
      marginBottom: 4,
    },
    otpEmail: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
      textAlign: 'center',
      marginBottom: 16,
    },

    avatarHeader: {
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarGrid: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      justifyContent: 'space-around', 
      marginBottom: 16,
      gap: 14,
    },
    avatarWrapper: {
      position: 'relative',
      borderRadius: 18,
      padding: 5,
      borderWidth: 2.5,
      borderColor: 'transparent',
      backgroundColor: isDark ? 'rgba(109,191,106,0.03)' : 'rgba(109,191,106,0.05)',
    },
    avatarWrapperSelected: {
      borderColor: '#6DBF6A',
      backgroundColor: 'rgba(109,191,106,0.12)',
      shadowColor: '#6DBF6A',
      shadowOpacity: 0.4,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
      transform: [{ scale: 1.05 }],
    },
    avatar: (() => {
      const computed = Math.max(68, Math.min(100, Math.floor(cardWidth / 3) - 26));
      return { 
        width: computed, 
        height: computed, 
        borderRadius: Math.round(computed / 5),
        backgroundColor: isDark ? 'rgba(109,191,106,0.06)' : 'rgba(109,191,106,0.10)',
      };
    })(),
    avatarCheckmark: {
      position: 'absolute',
      top: -6,
      right: -6,
      backgroundColor: '#fff',
      borderRadius: 14,
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    },

    genderSelector: { 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      marginBottom: 0,
      gap: 10,
    },
    genderButton: {
      flex: 1, 
      padding: 14, 
      borderRadius: 14, 
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.15)' : 'rgba(109,191,106,0.25)', 
      backgroundColor: 'transparent',
    },
    genderButtonSelected: { 
      backgroundColor: colors.primary, 
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    genderText: { color: colors.text, fontWeight: '600', fontSize: 14 },
    genderTextSelected: { color: '#fff', fontWeight: '700' },

    suggestionContainer: { 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      marginTop: 10,
      marginBottom: 0,
      gap: 8,
    },
    suggestionChip: {
      paddingHorizontal: 14, 
      paddingVertical: 9, 
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(109,191,106,0.08)' : 'rgba(109,191,106,0.12)', 
      borderWidth: 1.5, 
      borderColor: isDark ? 'rgba(109,191,106,0.18)' : 'rgba(109,191,106,0.30)',
    },
    suggestionText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

    inlineError: { color: '#ff6b6b', fontSize: 13, marginTop: 6, marginBottom: 0, fontWeight: '600' },
    errorBanner: { 
      backgroundColor: isDark ? 'rgba(255,100,100,0.10)' : 'rgba(255,230,230,1)', 
      borderRadius: 14, 
      padding: 14, 
      flexDirection: 'row', 
      alignItems: 'center', 
      marginBottom: 14,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(255,100,100,0.25)' : 'rgba(255,200,200,0.6)',
    },
    errorBannerText: { color: isDark ? '#ffd6d6' : '#7b1a1a', flex: 1, fontSize: 13, fontWeight: '500' },
    
    successBanner: {
      backgroundColor: isDark ? 'rgba(109,191,106,0.12)' : 'rgba(230,255,230,1)',
      borderRadius: 14, 
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(109,191,106,0.25)' : 'rgba(109,191,106,0.3)',
    },
    successText: { 
      color: isDark ? '#8AF3C5' : '#2d5a2d', 
      fontSize: 14, 
      flex: 1,
      fontWeight: '600',
    },
    subtleText: { color: colors.subtext, fontSize: 12, marginBottom: 6, fontWeight: '500' },

    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 30,
    },
    loadingCard: {
      backgroundColor: isDark ? 'rgba(20,30,40,0.95)' : 'rgba(255,255,255,0.95)',
      borderRadius: 20,
      padding: 30,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 15,
    },
    loadingText: {
      marginTop: 16,
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },

    linkRow: { marginTop: 16, alignItems: 'center' },
    toggleText: { color: colors.subtext, fontSize: 14, textAlign: 'center' },
    toggleLink: { fontWeight: '700', color: colors.primary },

    linkButton: {
      padding: 10,
      borderRadius: 10,
    },
    linkButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },

    placeholderColor: { color: colors.placeholder },
    textColor: { color: colors.text },
    success: { color: colors.success },
    danger: { color: colors.danger },

    smallPill: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: isDark ? 'rgba(109,191,106,0.15)' : 'rgba(109,191,106,0.25)',
      flex: 1,
      alignItems: 'center',
    },
    smallPillSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    smallPillText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    smallPillTextSelected: { color: '#fff', fontSize: 13, fontWeight: '700' },

    cardGlass: {
      borderColor: isDark ? 'rgba(109,191,106,0.10)' : 'rgba(109,191,106,0.18)',
      backgroundColor: 'transparent',
    },
    loginGlassCard: {
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
      shadowColor: isDark ? '#000' : '#6DBF6A',
      shadowOpacity: isDark ? 0.4 : 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 14,
    },
  });
};