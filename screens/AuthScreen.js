// AuthScreen.js — ASIZTO Smart Health · Enterprise Auth
// screens/AuthScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, Pressable,
  useColorScheme, useWindowDimensions, ActivityIndicator, UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { sendOTP, verifyOTP, clearOTP } from '../services/emailService';

import { C, Blob, ProgressStepper, Banner } from './AuthUI';
import {
  LoginView, Step1Account, Step2Verify,
  Step3Details, Step4Health, Step5Avatar,
} from './AuthSteps';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (_) { }

let LogoLight = null, LogoDark = null;
try { LogoLight = require('../assets/Brandkit/LightLogo.png'); } catch (_) { }
try { LogoDark = require('../assets/Brandkit/DarkLogo.png'); } catch (_) { }

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function friendlyErr(e, ctx = 'login') {
  switch (e?.code) {
    case 'auth/invalid-email': return 'Invalid email address.';
    case 'auth/user-not-found': return 'No account found with that email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/too-many-requests': return 'Too many attempts — try again later.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    case 'auth/email-already-in-use': return 'Email already registered — please log in.';
    case 'auth/weak-password': return 'Password too weak (min 6 characters).';
    default: return ctx === 'signup' ? 'Could not create account. Try again.' : 'Sign in failed. Try again.';
  }
}

// ─── Directional slide transition engine ──────────────────────────────────────
// Returns a component that slides/fades child content when `stepKey` changes.
// direction: 'forward' slides new content in from right; 'back' from left.
function StepSlide({ children, stepKey, direction }) {
  const { width } = useWindowDimensions();
  const tx = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const prevKey = useRef(stepKey);

  useEffect(() => {
    if (prevKey.current === stepKey) return;
    prevKey.current = stepKey;

    const isForward = direction === 'forward';
    // Instantly place new content off-screen
    tx.setValue(isForward ? width * 0.35 : -width * 0.35);
    op.setValue(0);

    // Slide in + fade in
    Animated.parallel([
      Animated.spring(tx, {
        toValue: 0,
        friction: 14,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(op, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [stepKey]);

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateX: tx }] }}>
      {children}
    </Animated.View>
  );
}

export default function AuthScreen() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const { width, height } = useWindowDimensions();
  const c = isDark ? C.dark : C.light;

  // ── View state ──────────────────────────────────────────────────────────────
  const [isLogin, setIsLogin] = useState(true);
  const [signupStep, setSignupStep] = useState(1);
  const [loginStep, setLoginStep] = useState('credentials');
  const [direction, setDirection] = useState('forward');

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [dob, setDob] = useState(null);
  const [gender, setGender] = useState(null);
  const [heightVal, setHeight] = useState('');
  const [weightVal, setWeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [smoking, setSmoking] = useState('no');
  const [drinking, setDrinking] = useState('no');
  const [selectedAvatarKey, setSelectedAvatarKey] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── OTP ─────────────────────────────────────────────────────────────────────
  const [signupOtpDigits, setSignupOtpDigits] = useState(['', '', '', '', '', '']);
  const [loginOtpDigits, setLoginOtpDigits] = useState(['', '', '', '', '', '']);
  const loginOtpRefs = useRef([null, null, null, null, null, null]);
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [sendingSignupOtp, setSendingSignupOtp] = useState(false);
  const [sendingLoginOtp, setSendingLoginOtp] = useState(false);
  const signupTimer = useRef(null);
  const loginTimer = useRef(null);

  // ── Status ──────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const emailTimer = useRef(null);

  // ── Entrance animations ─────────────────────────────────────────────────────
  const cardScale = useRef(new Animated.Value(0.93)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(30)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    Animated.stagger(80, [
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(logoY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1, friction: 9, tension: 55, useNativeDriver: true }),
        Animated.timing(cardOp, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, friction: 9, tension: 55, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // ── Login <-> Signup transition ─────────────────────────────────────────────
  const [viewKey, setViewKey] = useState('login');
  const viewTx = useRef(new Animated.Value(0)).current;
  const viewOp = useRef(new Animated.Value(1)).current;

  const switchView = useCallback((toLogin) => {
    const dir = toLogin ? -1 : 1;
    Animated.parallel([
      Animated.timing(viewOp, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(viewTx, { toValue: -dir * width * 0.08, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setIsLogin(toLogin);
      setViewKey(toLogin ? 'login' : 'signup');
      viewTx.setValue(dir * width * 0.08);
      Animated.parallel([
        Animated.spring(viewTx, { toValue: 0, friction: 12, tension: 70, useNativeDriver: true }),
        Animated.timing(viewOp, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    });
  }, [width]);

  // ── Email check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isLogin || signupStep !== 1) return;
    clearTimeout(emailTimer.current);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setEmailTaken(false); return; }
    setCheckingEmail(true);
    emailTimer.current = setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, trimmed);
        setEmailTaken(methods.length > 0);
        setErrors(p => ({ ...p, email: methods.length > 0 ? 'Already registered — log in instead.' : undefined }));
      } catch (_) { }
      setCheckingEmail(false);
    }, 650);
    return () => clearTimeout(emailTimer.current);
  }, [email, isLogin, signupStep]);

  // ── Cooldown helper ─────────────────────────────────────────────────────────
  const startCooldown = (setFn, ref) => {
    setFn(30);
    clearInterval(ref.current);
    ref.current = setInterval(() => setFn(p => {
      if (p <= 1) { clearInterval(ref.current); return 0; }
      return p - 1;
    }), 1000);
  };

  const sendSignupOtp = async () => {
    if (signupCooldown > 0) return;
    setSendingSignupOtp(true);
    try {
      const res = await sendOTP(email.trim().toLowerCase(), firstName || 'User');
      if (res?.success) {
        startCooldown(setSignupCooldown, signupTimer);
        Toast.show({ type: 'success', text1: 'Code sent ✓', position: 'top', visibilityTime: 2000, topOffset: 55 });
      } else {
        Toast.show({ type: 'error', text1: res?.error || 'Failed to send code', position: 'top', visibilityTime: 2500, topOffset: 55 });
      }
    } catch (_) {
      Toast.show({ type: 'error', text1: 'Could not send code. Try again.', position: 'top', visibilityTime: 2500, topOffset: 55 });
    } finally { setSendingSignupOtp(false); }
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const v1 = () => {
    const e = {};
    if (!firstName.trim()) e.firstName = 'Required';
    if (!lastName.trim()) e.lastName = 'Required';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Invalid email format.';
    if (emailTaken) e.email = 'Already registered — log in instead.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Min. 6 characters.';
    setErrors(p => ({ ...p, ...e }));
    return !Object.keys(e).length;
  };

  const v3 = () => {
    const e = {};
    if (!dob) e.dob = 'Date of birth is required.';
    if (!phoneDigits.trim()) e.phone = 'Phone number is required.';
    else if (!/^\d{10}$/.test(phoneDigits.trim())) e.phone = 'Must be 10 digits.';
    if (!gender) e.gender = 'Please select your gender.';
    setErrors(p => ({ ...p, ...e }));
    return !Object.keys(e).length;
  };

  // ── Step navigation with direction ──────────────────────────────────────────
  const goTo = useCallback((n, dir = 'forward') => {
    setDirection(dir);
    setSignupStep(n);
  }, []);

  const fromStep1 = async () => {
    if (!v1()) return;
    setIsLoading(true);
    await sendSignupOtp();
    setIsLoading(false);
    goTo(2, 'forward');
  };

  const fromStep2 = async () => {
    const code = signupOtpDigits.join('');
    if (code.length < 6) { setErrors(p => ({ ...p, otp: 'Enter the 6-digit code.' })); return; }
    setIsLoading(true);
    try {
      const res = await verifyOTP(email.trim().toLowerCase(), code);
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Email verified ✓', position: 'top', visibilityTime: 1800, topOffset: 55 });
        setSignupOtpDigits(['', '', '', '', '', '']);
        goTo(3, 'forward');
      } else {
        setErrors(p => ({ ...p, otp: res.error || 'Invalid code. Try again.' }));
      }
    } catch (_) { setErrors(p => ({ ...p, otp: 'Verification failed.' })); }
    finally { setIsLoading(false); }
  };

  const fromStep3 = () => { if (!v3()) return; goTo(4, 'forward'); };
  const fromStep4 = () => goTo(5, 'forward');

  const toggleCondition = (cond) =>
    setConditions(prev => prev.includes(cond) ? prev.filter(x => x !== cond) : [...prev, cond]);

  // ── Final account creation ───────────────────────────────────────────────────
  const handleSignup = async () => {
    if (!selectedAvatarKey) { setErrors(p => ({ ...p, avatar: 'Please pick an avatar.' })); return; }
    setIsLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid, email: cred.user.email,
        firstName: firstName.trim(), lastName: lastName.trim(),
        phone: phoneDigits ? `+91${phoneDigits.trim()}` : null,
        dob: dob ? Timestamp.fromDate(dob) : null,
        gender,
        height: heightVal ? Number(heightVal) : null,
        weight: weightVal ? Number(weightVal) : null,
        bloodGroup,
        conditions: conditions.length ? conditions.join(', ') : null,
        smoking, drinking, avatarKey: selectedAvatarKey,
        createdAt: Timestamp.now(),
      });
      Toast.show({ type: 'success', text1: 'Welcome to ASIZTO! 🎉', position: 'top', visibilityTime: 3000, topOffset: 55 });
      setTimeout(() => {
        switchView(true);
        setSignupStep(1);
        [setFirstName, setLastName, setEmail, setPassword, setPhoneDigits,
          setHeight, setWeight].forEach(fn => fn(''));
        [setDob, setGender, setBloodGroup, setSelectedAvatarKey].forEach(fn => fn(null));
        setConditions([]); setSmoking('no'); setDrinking('no');
      }, 1500);
    } catch (err) {
      setBanner({ type: 'error', message: friendlyErr(err, 'signup') });
    } finally { setIsLoading(false); }
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setBanner(null);
    if (!email.trim() || !password) {
      setBanner({ type: 'error', message: 'Email and password are required.' }); return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    } catch (err) {
      setBanner({ type: 'error', message: friendlyErr(err, 'login') });
    } finally { setIsLoading(false); }
  };

  // ── Render step content ──────────────────────────────────────────────────────
  const base = { errors, isDark };

  const renderStep = () => {
    switch (signupStep) {
      case 1: return (
        <Step1Account
          firstName={firstName} setFirstName={v => { setFirstName(v); setErrors(p => ({ ...p, firstName: undefined })); }}
          lastName={lastName} setLastName={v => { setLastName(v); setErrors(p => ({ ...p, lastName: undefined })); }}
          email={email} setEmail={v => { setEmail(v); setErrors(p => ({ ...p, email: undefined })); }}
          password={password} setPassword={v => { setPassword(v); setErrors(p => ({ ...p, password: undefined })); }}
          isCheckingEmail={checkingEmail} isEmailTaken={emailTaken}
          onNext={fromStep1} {...base}
        />
      );
      case 2: return (
        <Step2Verify
          email={email.trim().toLowerCase()}
          digits={signupOtpDigits} setDigits={setSignupOtpDigits}
          error={errors.otp} onVerify={fromStep2}
          onBack={() => goTo(1, 'back')}
          isLoading={isLoading} resendCooldown={signupCooldown}
          isSendingOtp={sendingSignupOtp} onResend={sendSignupOtp} {...base}
        />
      );
      case 3: return (
        <Step3Details
          dob={dob} setDob={v => { setDob(v); setErrors(p => ({ ...p, dob: undefined })); }}
          phoneDigits={phoneDigits} setPhoneDigits={v => { setPhoneDigits(v); setErrors(p => ({ ...p, phone: undefined })); }}
          gender={gender} setGender={v => { setGender(v); setErrors(p => ({ ...p, gender: undefined })); }}
          showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
          onNext={fromStep3} onBack={() => goTo(2, 'back')} {...base}
        />
      );
      case 4: return (
        <Step4Health
          heightVal={heightVal} setHeight={setHeight}
          weightVal={weightVal} setWeight={setWeight}
          bloodGroup={bloodGroup} setBloodGroup={v => { setBloodGroup(v); setErrors(p => ({ ...p, bloodGroup: undefined })); }}
          conditions={conditions} toggleCondition={toggleCondition}
          smoking={smoking} setSmoking={setSmoking}
          drinking={drinking} setDrinking={setDrinking}
          onNext={fromStep4} onBack={() => goTo(3, 'back')} {...base}
        />
      );
      case 5: return (
        <Step5Avatar
          selectedAvatarKey={selectedAvatarKey}
          setSelectedAvatarKey={v => { setSelectedAvatarKey(v); setErrors(p => ({ ...p, avatar: undefined })); }}
          onFinish={handleSignup} onBack={() => goTo(4, 'back')}
          isLoading={isLoading} {...base}
        />
      );
      default: return null;
    }
  };

  const logo = isDark ? (LogoDark || LogoLight) : (LogoLight || LogoDark);
  const cardMaxW = Math.min(460, width * 0.94);

  return (
    <View style={[s.root, { backgroundColor: c.bg }]}>
      {/* ── Ambient background ── */}
      <Blob size={300} x={-60} y={80} dx={55} dy={45} dur={17000} opacity={0.065} />
      <Blob size={220} x={width - 40} y={height - 220} dx={45} dy={35} dur={13000} delay={4000} opacity={0.055} />
      <Blob size={180} color="#34D9A0" x={width * 0.6} y={height * 0.3} dx={35} dy={55} dur={20000} delay={7000} opacity={0.05} />
      <Blob size={140} x={width * 0.15} y={height * 0.75} dx={30} dy={30} dur={15000} delay={2000} opacity={0.04} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={s.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[s.scroll, { minHeight: height }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Logo ── */}
            <Animated.View style={[s.logoWrap, { opacity: logoOp, transform: [{ translateY: logoY }] }]}>
              {logo ? (
                <Animated.Image source={logo} style={s.logo} resizeMode="contain" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="medkit" size={28} color={C.primary} />
                  <Text style={[s.logoText, { color: c.text }]}>ASIZTO</Text>
                </View>
              )}
            </Animated.View>

            {/* ── Card ── */}
            <Animated.View style={[
              s.card,
              {
                backgroundColor: c.card, maxWidth: cardMaxW, width: '100%',
                opacity: cardOp,
                transform: [{ scale: cardScale }, { translateY: cardY }],
                borderColor: c.cardBorder,
                shadowColor: isDark ? C.primary : '#000',
                shadowOpacity: isDark ? 0.15 : 0.10,
              },
            ]}>
              {/* Top gradient accent */}
              <LinearGradient
                colors={[C.mint, C.primary, 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.accent}
              />

              {/* ── Card header ── */}
              <Animated.View style={[s.header, { opacity: viewOp, transform: [{ translateX: viewTx }] }]}>
                {!isLogin && signupStep > 1 ? (
                  <Pressable
                    onPress={() => goTo(signupStep - 1, 'back')}
                    style={s.backBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="arrow-back" size={19} color={c.subtext} />
                  </Pressable>
                ) : <View style={{ width: 34 }} />}

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[s.title, { color: c.text }]}>
                    {isLogin ? 'Welcome back' : 'Create account'}
                  </Text>
                  <Text style={[s.sub, { color: c.subtext }]}>
                    {isLogin ? 'Sign in to your wellness journey' : 'Start your smart health journey'}
                  </Text>
                </View>

                <View style={{ width: 34 }} />
              </Animated.View>

              {/* ── Progress ── */}
              {!isLogin && <ProgressStepper step={signupStep} total={5} isDark={isDark} />}

              {/* ── Error/success banner ── */}
              {banner && (
                <Banner type={banner.type} message={banner.message} onClose={() => setBanner(null)} isDark={isDark} />
              )}

              {/* ── Step content with directional slide ── */}
              <Animated.View style={{ opacity: viewOp, transform: [{ translateX: viewTx }] }}>
                {isLogin ? (
                  <LoginView
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    loginStep={loginStep}
                    loginOtpDigits={loginOtpDigits} setLoginOtpDigits={setLoginOtpDigits}
                    loginOtpRefs={loginOtpRefs}
                    otpError={errors.otp}
                    resendCooldown={loginCooldown} isSendingOtp={sendingLoginOtp}
                    errors={errors} isDark={isDark}
                    onLogin={handleLogin} isLoading={isLoading}
                    onVerifyOtp={() => { }}
                    onBack={() => setLoginStep('credentials')}
                    onResend={() => { }}
                    onGoSignup={() => {
                      setErrors({}); setBanner(null); setSignupStep(1);
                      switchView(false);
                    }}
                  />
                ) : (
                  <>
                    <StepSlide stepKey={`${signupStep}`} direction={direction}>
                      {renderStep()}
                    </StepSlide>
                    {signupStep === 1 && (
                      <Pressable
                        onPress={() => { setErrors({}); setBanner(null); switchView(true); }}
                        style={{ alignItems: 'center', marginTop: 18, padding: 4 }}
                      >
                        <Text style={{ color: c.subtext, fontSize: 14 }}>
                          Already have an account?{' '}
                          <Text style={{ color: C.primary, fontWeight: '800' }}>Sign in</Text>
                        </Text>
                      </Pressable>
                    )}
                  </>
                )}
              </Animated.View>
            </Animated.View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Full-screen processing overlay ── */}
      {isLoading && signupStep === 5 && (
        <View style={s.overlay} pointerEvents="none">
          <Animated.View style={[s.overlayCard, { backgroundColor: isDark ? 'rgba(10,22,16,0.97)' : 'rgba(255,255,255,0.97)' }]}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={[s.overlayText, { color: c.text }]}>Creating your account…</Text>
          </Animated.View>
        </View>
      )}

      <Toast />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav: { flex: 1 },
  scroll: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 20 },

  logoWrap: { alignItems: 'center', marginBottom: 18 },
  logo: { width: 155, height: 58 },
  logoText: { fontSize: 20, fontWeight: '900', letterSpacing: 3 },

  card: {
    borderRadius: 22, padding: 22, borderWidth: 1.5, overflow: 'hidden',
    shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 18,
  },
  accent: { height: 3, position: 'absolute', top: 0, left: 0, right: 0 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  backBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '800', letterSpacing: 0.15 },
  sub: { fontSize: 12.5, marginTop: 2 },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', zIndex: 99,
  },
  overlayCard: {
    borderRadius: 20, padding: 34, alignItems: 'center', minWidth: 180,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 }, elevation: 20,
  },
  overlayText: { marginTop: 14, fontSize: 15, fontWeight: '600' },
});