// AuthScreen.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image,
  Platform, ActivityIndicator, Animated, Easing, UIManager, LayoutAnimation,
  SafeAreaView, KeyboardAvoidingView, Keyboard, useColorScheme, useWindowDimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
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

// optional haptics
let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) { Haptics = null; }

// Android layout animation enable
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ---------- Brand logos ----------
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

// Avatar helpers
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

/** -------------------- Background Animations -------------------- **/
const AnimatedBlob = ({ size = 220, color = '#FF7A7A', startX = 0, startY = 0, rangeX = 60, rangeY = 40, duration = 9000, delay = 0 }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [anim, duration, delay]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [startX - rangeX, startX + rangeX] });
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [startY - rangeY, startY + rangeY] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: 0.10,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}
    />
  );
};

const AuroraBand = ({ width, height, colors, top, angle = 20, travel = 120, duration = 12000, delay = 0, opacity = 0.22 }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, [anim, duration, delay]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-travel, travel] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        left: -width * 0.25,
        width: width * 1.5,
        height: height * 0.18,
        transform: [{ translateX }, { rotate: `${angle}deg` }],
        opacity,
      }}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: 160 }}
      />
    </Animated.View>
  );
};
/** --------------------------------------------------------------- **/

/** Friendly auth error mapper */
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
        ? 'Couldn’t create account. Please try again.'
        : 'Failed to sign in. Please try again.';
  }
}

export default function AuthScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { width, height } = useWindowDimensions();

  // Safety check to prevent rendering before dimensions are available
  if (!width || !height || !scheme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Responsive tokens
  const CARD_MAX_WIDTH = 680;
  const cardWidth = Math.min(CARD_MAX_WIDTH, Math.round(width * 0.94));

  // Instead of a fixed single "height", we use minHeight + maxHeight:
  const cardMinHeight = Math.max(360, Math.round(height * 0.34));
  const cardMaxHeight = Math.min(820, Math.round(height * 0.86));

  // shift card down slightly; smaller shift for very short screens
  const cardShiftY = Math.round(Math.max(6, Math.min(12, height * 0.045)));

  // states (signup/login)
  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [signupStep, setSignupStep] = useState(1);
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

  // Glass stays enabled (toggle removed)
  const glassEnabled = true;

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
  const [focusedField, setFocusedField] = useState(null);
  const [showBloodList, setShowBloodList] = useState(false);
  const emailCheckTimeout = useRef(null);

  useEffect(() => {
    setErrorText(''); setSuccessText(''); setFieldErrors({});
  }, [isLoginView]);

  // email check (signup)
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

  // validation helpers
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
    if (!phone.trim()) errs.phone = 'Contact number is required.';
    else if (!/^[0-9]{10,15}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number (10–15 digits).';
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

  // ---------- ANIMATED HEIGHT SETUP ---------- //
  // contentHeightAnim drives the card height smoothly.
  const contentHeightAnim = useRef(new Animated.Value(Math.max(cardMinHeight, 420))).current; // <-- ANIM
  const lastMeasuredHeight = useRef(null);
  const contentMeasureTimeout = useRef(null);

  // handle layout measurement of inner content; animate to new height
  const handleContentLayout = (event) => { // <-- ANIM
    const measured = Math.round(event.nativeEvent.layout.height);
    // Add small buffer to avoid clipping; this buffer compensates for paddings/margins
    const buffer = 26;
    const desired = Math.max(cardMinHeight, Math.min(cardMaxHeight, measured + buffer));
    // avoid redundant animations when difference tiny
    if (lastMeasuredHeight.current === desired) return;
    lastMeasuredHeight.current = desired;

    // Cancel any pending timeout
    if (contentMeasureTimeout.current) clearTimeout(contentMeasureTimeout.current);
    // Minor debounce to ensure stable layout (helps when many layout passes happen quickly)
    contentMeasureTimeout.current = setTimeout(() => {
      Animated.timing(contentHeightAnim, {
        toValue: desired,
        duration: 360,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // height can't use native driver
      }).start();
    }, 40);
  };
  // cleanup timeout
  useEffect(() => { return () => { if (contentMeasureTimeout.current) clearTimeout(contentMeasureTimeout.current); }; }, []);

  // auth handlers with friendly messages
  const handleLogin = async () => {
    setErrorText(''); setSuccessText('');
    if (!email.trim() || !password) {
      setErrorText('Email and password are required for login.');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      setSuccessText('Login successful.');
    } catch (e) {
  const friendly = getAuthErrorMessage(e, 'login') || '';
  // set field-level errors for common cases
  const code = e?.code || '';
  if (code === 'auth/wrong-password') setFieldErrors(prev => ({ ...prev, password: 'Incorrect password.' }));
  if (code === 'auth/invalid-email' || code === 'auth/user-not-found') setFieldErrors(prev => ({ ...prev, email: friendly }));
  setErrorText(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpFinal = async () => {
    setErrorText(''); setSuccessText('');
    const ok1 = validateStep1();
    const ok2 = validateStep2();
    if (!ok1) { setSignupStep(1); return; }
    if (!ok2) { setSignupStep(2); return; }
    if (!selectedAvatarKey) { setFieldErrors(prev => ({ ...prev, avatar: 'Please select an avatar.' })); setSignupStep(4); return; }
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
        phone: phone.trim(),
        dob: dob ? Timestamp.fromDate(dob) : null,
        gender,
        height: heightVal ? Number(heightVal) : null,
        weight: weightVal ? Number(weightVal) : null,
        bloodGroup,
        conditions: conditions || null,
        avatarKey: selectedAvatarKey,
        createdAt: Timestamp.now()
      });
      setSuccessText('Account created successfully. You can login now.');
      setIsLoginView(true);
      setSignupStep(1);
      setFirstName(''); setLastName(''); setPhone(''); setDob(null);
      setGender(null); setHeight(''); setWeight(''); setBloodGroup(null);
      setConditions(''); setSelectedAvatarKey(null); setPassword('');
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

  // next step nav
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

  // pick logo source based on theme (with fallbacks)
  const logoSource = isDark ? (logoDark || logoLight || logoFallback) : (logoLight || logoDark || logoFallback);

  const styles = createStyles({ isDark, width, height, cardWidth, cardMinHeight, cardMaxHeight, cardShiftY, glassEnabled });
  
  // Safety check to prevent rendering with undefined styles
  if (!styles || !styles.safeArea || !styles.container) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f8' }}>
        <ActivityIndicator size="large" color="#83b271" />
      </View>
    );
  }

  // small pressable with haptic
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

  // dismissible error banner (friendly UI for auth/firebase errors)
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
          <Animatable.View animation="fadeInRight" duration={320}>
            <Text style={styles.smallLabel}>First name</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane"
              placeholderTextColor={styles.placeholderColor.color}
              value={firstName}
              onChangeText={t => { setFirstName(t); setFieldErrors(prev => ({ ...prev, firstName: undefined })); }}
              autoCapitalize="words"
            />
            {fieldErrors.firstName ? <Text style={styles.inlineError}>{String(fieldErrors.firstName)}</Text> : null}

            <Text style={styles.smallLabel}>Last name</Text>
            <TextInput
              style={styles.input}
              placeholder="Doe"
              placeholderTextColor={styles.placeholderColor.color}
              value={lastName}
              onChangeText={t => { setLastName(t); setFieldErrors(prev => ({ ...prev, lastName: undefined })); }}
              autoCapitalize="words"
            />
            {fieldErrors.lastName ? <Text style={styles.inlineError}>{String(fieldErrors.lastName)}</Text> : null}

            <Text style={styles.smallLabel}>Email</Text>
            {/* Email with right-side status indicator */}
            <View style={styles.inputAffixContainer}>
              <TextInput
                style={styles.inputAffix}
                placeholder="you@company.com"
                placeholderTextColor={styles.placeholderColor.color}
                value={email}
                onChangeText={t => { setEmail(t); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.affixRight}>
                {showAffix ? (
                  isCheckingEmail ? (
                    <ActivityIndicator size="small" />
                  ) : fieldErrors.email ? (
                    <Ionicons name="close-circle" size={20} color={styles.danger.color} />
                  ) : emailFormatValid && !isEmailRegistered ? (
                    <Ionicons name="checkmark-circle" size={20} color={styles.success.color} />
                  ) : null
                ) : null}
              </View>
            </View>
            {fieldErrors.email ? <Text style={styles.inlineError}>{String(fieldErrors.email)}</Text> : null}

            <Text style={styles.smallLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a strong password"
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
            {password ? <Text style={styles.subtleText}>Password strength: {getPasswordStrength()}</Text> : null}

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
                title="Next"
                onPress={goNextFromStep1}
                disabled={isCheckingEmail || isEmailRegistered}
              />
            </View>
          </Animatable.View>
        );
      case 2:
        return (
          <Animatable.View animation="fadeInRight" duration={320}>
            <Text style={styles.smallLabel}>Gender</Text>
            <View style={styles.genderSelector}>
              <Pressable style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
                onPress={() => { setGender('male'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}>
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>Male</Text>
              </Pressable>
              <Pressable style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
                onPress={() => { setGender('female'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}>
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>Female</Text>
              </Pressable>
              <Pressable style={[styles.genderButton, gender === 'other' && styles.genderButtonSelected]}
                onPress={() => { setGender('other'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}>
                <Text style={[styles.genderText, gender === 'other' && styles.genderTextSelected]}>Other</Text>
              </Pressable>
            </View>
            {fieldErrors.gender ? <Text style={styles.inlineError}>{String(fieldErrors.gender)}</Text> : null}

            <Text style={styles.smallLabel}>Date of Birth</Text>
            <Pressable onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text style={{ color: styles.textColor.color, fontSize: 16 }}>
                {dob ? dob.toLocaleDateString() : 'Select date of birth'}
              </Text>
            </Pressable>
            {fieldErrors.dob ? <Text style={styles.inlineError}>{String(fieldErrors.dob)}</Text> : null}
            {showDatePicker && (
              <DateTimePicker
                value={dob || new Date(2000, 0, 1)}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(e, date) => {
                  setShowDatePicker(Platform.OS === 'android' ? false : true);
                  if (date) { setDob(date); setFieldErrors(prev => ({ ...prev, dob: undefined })); }
                }}
              />
            )}

            <Text style={styles.smallLabel}>Contact number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91xxxxxxxxxx"
              placeholderTextColor={styles.placeholderColor.color}
              value={phone}
              onChangeText={t => { setPhone(t.replace(/[^0-9]/g, '')); setFieldErrors(prev => ({ ...prev, phone: undefined })); }}
              keyboardType="phone-pad"
            />
            {fieldErrors.phone ? <Text style={styles.inlineError}>{String(fieldErrors.phone)}</Text> : null}

            <View style={styles.actionRow}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(1); }}
              >
                <Text style={styles.ghostButtonText}>Back</Text>
              </Pressable>
              <ActionButton title="Next" onPress={goNextFromStep2} />
            </View>
          </Animatable.View>
        );
      case 3:
        return (
          <Animatable.View animation="fadeInRight" duration={320}>
            <Text style={styles.smallLabel}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 170"
              placeholderTextColor={styles.placeholderColor.color}
              value={heightVal}
              onChangeText={t => setHeight(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />
            <Text style={styles.smallLabel}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 68"
              placeholderTextColor={styles.placeholderColor.color}
              value={weightVal}
              onChangeText={t => setWeight(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
            />

            <Text style={styles.smallLabel}>Blood group</Text>
            {/* Custom inline expandable list to avoid clipping/overlay issues */}
            <Pressable
              onPress={() => setShowBloodList(prev => !prev)}
              style={[styles.dropdown, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
            >
              <Text style={{ color: bloodGroup ? styles.textColor.color : styles.placeholderColor.color, fontSize: 16 }}>{bloodGroup || 'Select Blood Group'}</Text>
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
                      style={[styles.dropdownItem, selected ? { backgroundColor: styles.toggleLink.color, borderBottomColor: 'transparent' } : null]}
                    >
                      <Text style={[styles.dropdownItemText, selected ? { color: '#fff', fontWeight: '700' } : null]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {fieldErrors.bloodGroup ? <Text style={styles.inlineError}>{String(fieldErrors.bloodGroup)}</Text> : null}

            <Text style={styles.smallLabel}>Existing conditions</Text>
            <TextInput
              style={styles.input}
              placeholder="Type or pick from suggestions"
              placeholderTextColor={styles.placeholderColor.color}
              value={conditions}
              onChangeText={setConditions}
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
          </Animatable.View>
        );
      case 4:
        return (
          <Animatable.View animation="fadeInRight" duration={320}>
            <Text style={{ textAlign: 'center', marginBottom: 12, color: styles.placeholderColor.color }}>Choose your avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarKeys.map(key => (
                <Pressable key={key} onPress={() => { setSelectedAvatarKey(key); setFieldErrors(prev => ({ ...prev, avatar: undefined })); }}>
                  <Image source={getAvatarSource(key)} style={[styles.avatar, selectedAvatarKey === key && styles.avatarSelected]} />
                </Pressable>
              ))}
            </View>
            {fieldErrors.avatar ? <Text style={styles.inlineError}>{String(fieldErrors.avatar)}</Text> : null}

            <View style={styles.actionRow}>
              <Pressable
                style={styles.ghostButton}
                onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setSignupStep(3); }}
              >
                <Text style={styles.ghostButtonText}>Back</Text>
              </Pressable>
              <ActionButton title="Create Account" onPress={handleSignUpFinal} loading={isLoading} />
            </View>
          </Animatable.View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea]}>
      {/* Outer ScrollView helps the screen be scrollable on small phones when keyboard opens */}
      {/* KeyboardAvoidingView wraps ScrollView so content lifts above keyboard */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80} // tweak 80 if your header height differs
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >

          <View style={styles.container}>
            <LinearGradient colors={isDark ? ['#07121B', '#06101A'] : ['#F7FBFF', '#F2F6FF']} style={StyleSheet.absoluteFill} />

            {/* Upgraded animated background */}
            <View style={styles.blobContainer} pointerEvents="none">
              <AnimatedBlob size={280} color="#FF7A7A" startX={-80} startY={-40} rangeX={width * 0.28} rangeY={height * 0.04} duration={11000} delay={0} />
              <AnimatedBlob size={220} color="#7A9BFF" startX={width * 0.65} startY={-30} rangeX={width * 0.18} rangeY={height * 0.06} duration={14000} delay={800} />
              <AnimatedBlob size={340} color="#8AF3C5" startX={width * 0.18} startY={height * 0.05} rangeX={width * 0.3} rangeY={height * 0.08} duration={18000} delay={400} />
              {/* Aurora ribbons */}
              <AuroraBand width={width} height={height} colors={['rgba(125,211,252,0.0)', 'rgba(125,211,252,0.45)', 'rgba(125,211,252,0.0)']} top={height * 0.08} angle={18} travel={120} duration={13000} delay={300} opacity={isDark ? 0.25 : 0.18} />
              <AuroraBand width={width} height={height} colors={['rgba(186,230,253,0.0)', 'rgba(186,230,253,0.35)', 'rgba(186,230,253,0.0)']} top={height * 0.24} angle={-16} travel={150} duration={15000} delay={1200} opacity={isDark ? 0.22 : 0.16} />
              <AuroraBand width={width} height={height} colors={['rgba(167,243,208,0.0)', 'rgba(167,243,208,0.45)', 'rgba(167,243,208,0.0)']} top={height * 0.40} angle={22} travel={110} duration={12000} delay={600} opacity={isDark ? 0.22 : 0.14} />
            </View>

            {/* Logo above the card */}
            <View style={[styles.logoWrapper]}>
              {logoSource ? (
                <Image source={logoSource} style={[styles.logo, isDark ? styles.logoDark : styles.logoLight]} resizeMode="contain" />
              ) : (
                <View style={styles.logoTextFallback}><Text style={styles.logoText}>Brand</Text></View>
              )}
            </View>

            {/* Card */}
            <Animatable.View
              animation="fadeInUp"
              duration={420}
              style={[ /* keep width but remove minHeight*/ { width: cardWidth, marginTop: cardShiftY }]}
            >
              {/* Animated wrapper that controls the card's visible height */}
              <Animated.View // <-- ANIM
                style={[styles.cardStroke, { width: cardWidth, height: contentHeightAnim }]} // animated height
              >
                <View style={[styles.card, glassEnabled ? styles.cardGlass : null, { flex: 1 }]}>
                  {/* Glass blur layer */}
                  {glassEnabled ? (
                    <BlurView intensity={85} tint={isDark ? 'dark' : 'light'} style={styles.cardBlur} />
                  ) : (
                    <View style={styles.cardBlurFallback} />
                  )}

                  {/* subtle inner gradient for highlight */}
                  <LinearGradient
                    colors={isDark ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0)'] : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']}
                    style={styles.cardInnerGradient}
                  />

                  {/* Card content - measure height here */}
                  <View style={styles.cardContent} onLayout={handleContentLayout}> {/* <-- ANIM onLayout */}
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
                        <Text style={styles.headerSubtitle}>{isLoginView ? 'Sign in to continue' : 'Let’s get you set up'}</Text>
                      </View>

                      {/* Toggle removed; keep layout balanced */}
                      <View style={{ width: 22 }} />
                    </View>

                    {successText ? <Text style={styles.successText}>{String(successText)}</Text> : null}
                    <ErrorBanner message={errorText} onClose={() => setErrorText('')} />

                    {isLoginView ? (
                      <Animatable.View animation="fadeInRight" duration={300}>
                        <Text style={styles.fieldLabel}>Email</Text>
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

                        <Text style={styles.fieldLabel}>Password</Text>
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

                        <Pressable
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setIsLoginView(false); setSignupStep(1); setFieldErrors({});
                          }}
                          style={styles.linkRow}
                        >
                          <Text style={styles.toggleText}>Don't have an account? <Text style={styles.toggleLink}>Sign Up</Text></Text>
                        </Pressable>
                      </Animatable.View>
                    ) : (
                      <>
                        {/* Signup steps */}
                        <ScrollView
                          showsVerticalScrollIndicator={false}
                          style={{ marginTop: 6 }}
                          contentContainerStyle={{ paddingBottom: 12 }}
                          nestedScrollEnabled={true}
                          keyboardShouldPersistTaps="handled"
                        >
                          {renderSignupStep()}
                        </ScrollView>

                        <Pressable
                          onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setIsLoginView(true); setSignupStep(1); setFieldErrors({});
                          }}
                          style={styles.linkRow}
                        >
                          <Text style={styles.toggleText}>Already have an account? <Text style={styles.toggleLink}>Back to Login</Text></Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              </Animated.View>
            </Animatable.View>

            {isLoading && (
              <View style={styles.loadingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" />
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// styles factory
const createStyles = ({ isDark, width, height, cardWidth, cardMinHeight, cardMaxHeight, cardShiftY, glassEnabled }) => {
  // Safety check for required parameters
  if (width === undefined || height === undefined) {
    // Return minimal styles for initial render
    return StyleSheet.create({
      safeArea: { flex: 1, backgroundColor: '#f4f4f8' },
      container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    });
  }
  
  // Set defaults for missing parameters
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
    success: '#22c55e',
    danger: '#ef4444',
  brand: '#6DBF6A'
  };

  const padding = Math.max(12, Math.round(cardWidth * 0.036));
  const inputHeight = Math.max(48, Math.round(cardMinHeight * 0.08));

  // make logo noticeably larger on phones; cap for tablets
  const logoSize = Math.max(120, Math.round(Math.min(width, height) * 0.20));

  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: isDark ? '#06121A' : '#F7FBFF' },
    // center vertically on taller screens, but allow scroll on small ones
    scrollContainer: { flexGrow: 1, justifyContent: height > 740 ? 'center' : 'flex-start', paddingVertical: 24 },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    blobContainer: { ...StyleSheet.absoluteFillObject, zIndex: 0, overflow: 'hidden' },

    // logo above card
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
    logoTextFallback: { width: logoSize, height: logoSize, borderRadius: logoSize / 2, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    logoText: { color: colors.subtext, fontWeight: '700' },

    cardWrapper: {
      zIndex: 3,
      alignSelf: 'center',
      justifyContent: 'center',
      marginVertical: 8,
    },
    cardStroke: {
      borderRadius: 20,
      padding: 2,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.25 : 0.12,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 16 },
      elevation: 14,
      backgroundColor: 'transparent'
    },
    card: {
      width: '100%',
      height: undefined,
      borderRadius: 18,
      // Allow dropdown lists to render outside the card bounds
  overflow: 'visible', // <<< changed from 'hidden' to 'visible' so dropdown isn't clipped
      backgroundColor: glassEnabled ? 'transparent' : (isDark ? 'rgba(6,9,12,0.62)' : 'rgba(255,255,255,0.9)'),
      borderWidth: 1,
      borderColor: glassEnabled ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)'),
    },

    // glass blur covers card
    cardBlur: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
    cardBlurFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent', zIndex: 0 },
    cardInnerGradient: { ...StyleSheet.absoluteFillObject, zIndex: 1 },

    // allow cardContent to size naturally
    cardContent: { padding: padding, zIndex: 2 },

    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    headerTitle: { fontSize: Math.max(18, Math.round(cardWidth * 0.048)), fontWeight: '800', color: colors.text, textAlign: 'center' },
    headerSubtitle: { fontSize: 13, color: colors.subtext, marginTop: 4, textAlign: 'center' },

    fieldLabel: { color: colors.subtext, marginTop: 12, marginBottom: 6, fontSize: 13, fontWeight: '600' },
    smallLabel: { color: colors.subtext, marginTop: 10, marginBottom: 6, fontSize: 13, fontWeight: '600' },

    input: {
      width: '100%',
      height: inputHeight,
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 8,
      paddingHorizontal: 14,
      color: colors.text,
      justifyContent: 'center',
      fontSize: 16,
    },

    focusedInput: {
      borderColor: colors.brand,
      shadowColor: colors.brand,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 8,
    },

    // input with right-side affix (spinner/tick/cross)
    inputAffixContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: inputHeight,
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 8,
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
      backgroundColor: 'rgba(255,255,255,0.02)',
      borderColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 6,
      paddingHorizontal: 12,
    },
    passwordInput: { flex: 1, color: colors.text, fontSize: 16 },
    iconPress: { padding: 6 },

    dropdown: {
      width: '100%',
      height: inputHeight,
      borderRadius: 12,
      marginBottom: 12,
      paddingHorizontal: 12,
      borderColor: 'rgba(255,255,255,0.03)',
      borderWidth: 1,
      backgroundColor: 'rgba(255,255,255,0.01)'
    },

    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
    dropdownItemText: { color: colors.text, fontSize: 16 },
  dropdownListContainer: { borderRadius: 8, marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },

    button: { backgroundColor: colors.primary, padding: 12, borderRadius: 12, alignItems: 'center', height: inputHeight, justifyContent: 'center', minWidth: 140 },
    buttonPressed: { transform: [{ scale: 0.985 }] },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    ghostButton: { padding: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', backgroundColor: 'transparent', minWidth: 110 },
    ghostButtonText: { color: colors.text, fontWeight: '600' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, zIndex: 5 },

    avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 },
    avatar: { width: 64, height: 64, borderRadius: 32, margin: 6 },
    avatarSelected: { borderWidth: 3, borderColor: colors.primary },

    genderSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    genderButton: {
      flex: 1, padding: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 4,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', backgroundColor: 'transparent'
    },
    genderButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    genderText: { color: colors.text, fontWeight: '600' },
    genderTextSelected: { color: '#fff' },

    suggestionContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
    suggestionChip: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)',
      marginRight: 8, marginBottom: 8
    },
    suggestionText: { color: colors.subtext },

    inlineError: { color: '#ff6b6b', fontSize: 13, marginBottom: 8 },
  errorBanner: { backgroundColor: isDark ? 'rgba(255,100,100,0.06)' : 'rgba(255,230,230,0.9)', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  errorBannerText: { color: isDark ? '#ffd6d6' : '#7b1a1a', flex: 1 },
    successText: { color: '#6ddf7a', fontSize: 14, marginBottom: 8, textAlign: 'center' },
    subtleText: { color: colors.subtext, fontSize: 12, marginBottom: 6 },

    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 30
    },

    linkRow: { marginTop: 10, alignItems: 'center' },
    toggleText: { color: colors.subtext, fontSize: 14, textAlign: 'center' },
    toggleLink: { fontWeight: '700', color: colors.primary },

    placeholderColor: { color: colors.placeholder },
    textColor: { color: colors.text },
    success: { color: colors.success },
    danger: { color: colors.danger },

    // additional glass style marker
    cardGlass: {
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.14)',
      backgroundColor: 'transparent'
    }
  });
};
