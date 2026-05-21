/**
 * hooks/useAuthFlow.js
 *
 * CODE-2: Custom hook to own all authentication flow logic.
 * CODE-3: Removed deprecated fetchSignInMethodsForEmail (and SEC-5 email enumeration vulnerability).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { sendOTP, verifyOTP } from '../services/emailService';

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

export default function useAuthFlow() {
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // ── OTP ─────────────────────────────────────────────────────────────────────
  const [signupOtp, setSignupOtp] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [sendingSignupOtp, setSendingSignupOtp] = useState(false);
  const [sendingLoginOtp, setSendingLoginOtp] = useState(false);
  
  const signupTimer = useRef(null);
  const loginTimer = useRef(null);
  const signupOtpRef = useRef('');

  // ── Status ──────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const isRestored = useRef(false);

  // ── Cooldown helper ─────────────────────────────────────────────────────────
  const startCooldown = (setFn, ref) => {
    setFn(30);
    clearInterval(ref.current);
    ref.current = setInterval(() => setFn(p => {
      if (p <= 1) { clearInterval(ref.current); return 0; }
      return p - 1;
    }), 1000);
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      clearInterval(signupTimer.current);
      clearInterval(loginTimer.current);
    };
  }, []);

  // ── Restore signup draft on mount ───────────────────────────────────────────
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem('asizto_signup_draft');
        if (stored) {
          const data = JSON.parse(stored);
          if (data && data.signupStep > 1) {
            if (data.email) setEmail(data.email);
            if (data.password) setPassword(data.password);
            if (data.firstName) setFirstName(data.firstName);
            if (data.lastName) setLastName(data.lastName);
            if (data.phoneDigits) setPhoneDigits(data.phoneDigits);
            if (data.dob) setDob(new Date(data.dob));
            if (data.gender) setGender(data.gender);
            if (data.heightVal) setHeight(data.heightVal);
            if (data.weightVal) setWeight(data.weightVal);
            if (data.bloodGroup) setBloodGroup(data.bloodGroup);
            if (data.conditions) setConditions(data.conditions);
            if (data.smoking) setSmoking(data.smoking);
            if (data.drinking) setDrinking(data.drinking);
            if (data.selectedAvatarKey) setSelectedAvatarKey(data.selectedAvatarKey);
            if (data.acceptedTerms !== undefined) setAcceptedTerms(data.acceptedTerms);

            setIsLogin(false);
            setSignupStep(data.signupStep);

            Toast.show({
              type: 'info',
              text1: 'Draft restored',
              text2: `Resumed signup from Step ${data.signupStep}`,
              position: 'top',
              visibilityTime: 3000,
              topOffset: 55
            });
          }
        }
      } catch (e) {
        console.warn('Failed to restore signup draft:', e);
      } finally {
        isRestored.current = true;
      }
    };
    restoreDraft();
  }, []);

  // ── Save signup draft when any field changes ────────────────────────────────
  useEffect(() => {
    if (!isRestored.current) return;
    if (isLogin) return;

    const saveDraft = async () => {
      try {
        const draft = {
          email,
          password,
          firstName,
          lastName,
          phoneDigits,
          dob: dob ? dob.toISOString() : null,
          gender,
          heightVal,
          weightVal,
          bloodGroup,
          conditions,
          smoking,
          drinking,
          selectedAvatarKey,
          acceptedTerms,
          signupStep,
        };
        await AsyncStorage.setItem('asizto_signup_draft', JSON.stringify(draft));
      } catch (e) {
        console.warn('Failed to save signup draft:', e);
      }
    };
    saveDraft();
  }, [
    isLogin, email, password, firstName, lastName, phoneDigits, dob, gender,
    heightVal, weightVal, bloodGroup, conditions, smoking, drinking,
    selectedAvatarKey, acceptedTerms, signupStep
  ]);

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
    if (!password) e.password = 'Password is required.';
    else if (password.length < 6) e.password = 'Min. 6 characters.';
    if (!acceptedTerms) e.terms = 'You must accept the terms and conditions.';
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

    // CODE-3: Removed all pre-registration fetchSignInMethodsForEmail API checks.
    setIsLoading(true);
    await sendSignupOtp();
    setIsLoading(false);
    goTo(2, 'forward');
  };

  const fromStep2 = async () => {
    const currentOtp = signupOtpRef.current;
    if (currentOtp.length < 6) { setErrors(p => ({ ...p, otp: 'Enter the 6-digit code.' })); return; }
    setIsLoading(true);
    try {
      const res = await verifyOTP(email.trim().toLowerCase(), currentOtp);
      if (res.success) {
        Toast.show({ type: 'success', text1: 'Email verified ✓', position: 'top', visibilityTime: 1800, topOffset: 55 });
        signupOtpRef.current = '';
        setSignupOtp('');
        goTo(3, 'forward');
      } else {
        setErrors(p => ({ ...p, otp: res.error || 'Invalid code. Try again.' }));
      }
    } catch (_) { setErrors(p => ({ ...p, otp: 'Verification failed.' })); }
    finally { setIsLoading(false); }
  };

  // Auto-submit as soon as all 6 digits are entered — no button tap needed
  useEffect(() => {
    if (!isLogin && signupStep === 2 && signupOtp.length === 6 && !isLoading) {
      fromStep2();
    }
  }, [signupOtp, signupStep, isLogin, isLoading]);

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
      await AsyncStorage.removeItem('asizto_signup_draft');
      Toast.show({ type: 'success', text1: 'Welcome to ASIZTO! 🎉', position: 'top', visibilityTime: 3000, topOffset: 55 });
      setTimeout(() => {
        setIsLogin(true);
        setSignupStep(1);
        [setFirstName, setLastName, setEmail, setPassword, setPhoneDigits,
          setHeight, setWeight].forEach(fn => fn(''));
        [setDob, setGender, setBloodGroup, setSelectedAvatarKey].forEach(fn => fn(null));
        setConditions([]); setSmoking('no'); setDrinking('no');
        setAcceptedTerms(false);
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

  const handleSignupOtpChange = (val) => {
    signupOtpRef.current = val;
    setSignupOtp(val);
  };

  return {
    isLogin, setIsLogin,
    signupStep, setSignupStep,
    loginStep, setLoginStep,
    direction, setDirection,
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
    signupOtp, setSignupOtp: handleSignupOtpChange,
    loginOtp, setLoginOtp,
    signupCooldown, loginCooldown,
    sendingSignupOtp, sendingLoginOtp,
    isLoading, errors, setErrors,
    banner, setBanner,
    goTo, fromStep1, fromStep2, fromStep3, fromStep4,
    handleSignup, handleLogin, sendSignupOtp
  };
}
