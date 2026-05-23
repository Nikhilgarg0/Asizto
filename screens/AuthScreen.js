import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, SafeAreaView,
  KeyboardAvoidingView, Platform, ScrollView, Pressable,
  useWindowDimensions, ActivityIndicator, BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { Blob, ProgressStepper, Banner } from './AuthUI';
import { useTheme } from '../context/ThemeContext';
import useAuthFlow from '../hooks/useAuthFlow';

import {
  LoginView, Step1Account, Step2Verify,
  Step3Details, Step4Health, Step5Avatar,
} from './AuthSteps';

let LogoLight = null, LogoDark = null;
try { LogoLight = require('../assets/Brandkit/LightLogo.png'); } catch (_) { }
try { LogoDark = require('../assets/Brandkit/DarkLogo.png'); } catch (_) { }

// ─── Directional slide transition engine ──────────────────────────────────────
function StepSlide({ children, stepKey, direction }) {
  const { width } = useWindowDimensions();
  const tx = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(1)).current;
  const prevKey = useRef(stepKey);

  useEffect(() => {
    if (prevKey.current === stepKey) return;
    prevKey.current = stepKey;

    const isForward = direction === 'forward';
    tx.setValue(isForward ? width * 0.35 : -width * 0.35);
    op.setValue(0);

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
  const { colors, theme } = useTheme();
  const isDark = theme === 'dark';
  const { width, height } = useWindowDimensions();

  // Consume hook for form states, status and authentication events
  const {
    isLogin, setIsLogin,
    signupStep, setSignupStep,
    loginStep, setLoginStep,
    direction,
    email, setEmail,
    password, setPassword,
    firstName, setFirstName,
    lastName, setLastName,
    phoneDigits, setPhoneDigits,
    dob, setDob,
    gender, setGender,
    heightVal, setHeight,
    weightVal, setWeight,
    bloodGroup, setBloodGroup,
    conditions, toggleCondition,
    smoking, setSmoking,
    drinking, setDrinking,
    selectedAvatarKey, setSelectedAvatarKey,
    showDatePicker, setShowDatePicker,
    acceptedTerms, setAcceptedTerms,
    signupOtp, setSignupOtp,
    loginOtp, setLoginOtp,
    signupCooldown, loginCooldown,
    sendingSignupOtp, sendingLoginOtp,
    isLoading, errors, setErrors,
    banner, setBanner,
    goTo, fromStep1, fromStep2, fromStep3, fromStep4,
    handleSignup, handleLogin, sendSignupOtp
  } = useAuthFlow();

  // ── Layout & View Animations ───────────────────────────────────────────────
  const [viewKey, setViewKey] = useState(isLogin ? 'login' : 'signup');
  const viewTx = useRef(new Animated.Value(0)).current;
  const viewOp = useRef(new Animated.Value(1)).current;

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

  // Synchronize viewKey with isLogin changes (handles Async draft restoration)
  useEffect(() => {
    setViewKey(isLogin ? 'login' : 'signup');
  }, [isLogin]);

  // Intercept hardware back button on Android during multi-step signup
  useEffect(() => {
    const handleBackPress = () => {
      if (!isLogin && signupStep > 1) {
        goTo(signupStep - 1, 'back');
        return true; // prevent default behavior
      }
      return false; // let the default back button behavior happen
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      subscription.remove();
    };
  }, [isLogin, signupStep, goTo]);

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
  }, [width, setIsLogin]);

  const base = { errors, isDark };

  const renderStep = () => {
    switch (signupStep) {
      case 1:
        return (
          <Step1Account
            firstName={firstName} setFirstName={v => { setFirstName(v); setErrors(p => ({ ...p, firstName: undefined })); }}
            lastName={lastName} setLastName={v => { setLastName(v); setErrors(p => ({ ...p, lastName: undefined })); }}
            email={email} setEmail={v => { setEmail(v); setErrors(p => ({ ...p, email: undefined })); }}
            password={password} setPassword={v => { setPassword(v); setErrors(p => ({ ...p, password: undefined })); }}
            acceptedTerms={acceptedTerms} setAcceptedTerms={v => { setAcceptedTerms(v); setErrors(p => ({ ...p, terms: undefined })); }}
            isCheckingEmail={false} isEmailTaken={false}
            onNext={fromStep1} {...base}
          />
        );
      case 2:
        return (
          <Step2Verify
            email={email.trim().toLowerCase()}
            otp={signupOtp} setOtp={setSignupOtp}
            error={errors.otp} onVerify={fromStep2}
            onBack={() => {
              setSignupOtp('');
              setErrors(p => ({ ...p, otp: undefined }));
              goTo(1, 'back');
            }}
            isLoading={isLoading} resendCooldown={signupCooldown}
            isSendingOtp={sendingSignupOtp} onResend={sendSignupOtp} {...base}
          />
        );
      case 3:
        return (
          <Step3Details
            dob={dob} setDob={v => { setDob(v); setErrors(p => ({ ...p, dob: undefined })); }}
            phoneDigits={phoneDigits} setPhoneDigits={v => { setPhoneDigits(v); setErrors(p => ({ ...p, phone: undefined })); }}
            gender={gender} setGender={v => { setGender(v); setErrors(p => ({ ...p, gender: undefined })); }}
            showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker}
            onNext={fromStep3} onBack={() => goTo(2, 'back')} {...base}
          />
        );
      case 4:
        return (
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
      case 5:
        return (
          <Step5Avatar
            selectedAvatarKey={selectedAvatarKey}
            setSelectedAvatarKey={v => { setSelectedAvatarKey(v); setErrors(p => ({ ...p, avatar: undefined })); }}
            gender={gender}
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
    <View style={[s.root, { backgroundColor: colors.background }]}>
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
                  <Ionicons name="medkit" size={28} color={colors.primary} />
                  <Text style={[s.logoText, { color: colors.text }]}>ASIZTO</Text>
                </View>
              )}
            </Animated.View>

            {/* ── Card ── */}
            <Animated.View style={[
              s.card,
              {
                backgroundColor: colors.card, maxWidth: cardMaxW, width: '100%',
                opacity: cardOp,
                transform: [{ scale: cardScale }, { translateY: cardY }],
                borderColor: colors.border,
                shadowColor: '#111111',
                shadowOpacity: isDark ? 0.15 : 0.10,
              },
            ]}>
              {/* Top gradient accent */}
              <LinearGradient
                colors={[colors.primary, '#34D9A0', colors.primary]}
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
                    <Ionicons name="arrow-back" size={19} color={colors.subtext} />
                  </Pressable>
                ) : <View style={{ width: 34 }} />}

                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={[s.title, { color: colors.text }]}>
                    {isLogin ? 'Welcome back' : 'Create account'}
                  </Text>
                  <Text style={[s.sub, { color: colors.subtext }]}>
                    {isLogin ? 'Sign in to your wellness journey' : 'Start your smart health journey'}
                  </Text>
                </View>

                {!isLogin && signupStep === 4 ? (
                  <Pressable
                    onPress={fromStep4}
                    style={[s.backBtn, { width: 'auto', paddingHorizontal: 8 }]}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Skip health profile step"
                    accessibilityRole="button"
                  >
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13.5 }}>Skip</Text>
                  </Pressable>
                ) : <View style={{ width: 34 }} />}
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
                    loginOtp={loginOtp} setLoginOtp={setLoginOtp}
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
                        <Text style={{ color: colors.subtext, fontSize: 14 }}>
                          Already have an account?{' '}
                          <Text style={{ color: colors.primary, fontWeight: '800' }}>Sign in</Text>
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
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[s.overlayText, { color: colors.text }]}>Creating your account…</Text>
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
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 },

  logoWrap: { alignItems: 'center', marginBottom: 18 },
  logo: { width: 155 * 2, height: 58 * 2 },
  logoText: { fontSize: 20, fontWeight: '900', letterSpacing: 3 },

  card: {
    borderRadius: 30, padding: 30, borderWidth: 0, overflow: 'hidden',
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