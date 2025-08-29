// AuthScreen.js
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, Image, Platform, ActivityIndicator
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Dropdown } from 'react-native-element-dropdown';
import { Ionicons } from '@expo/vector-icons';

// ---------- LOCAL AVATAR SUPPORT ----------
const AVATAR_KEYS = {
  male:    ['male1','male2','male3','male4','male5','male6'],
  female:  ['female1','female2','female3','female4','female5','female6'],
};
const ALL_AVATAR_KEYS = [...AVATAR_KEYS.male, ...AVATAR_KEYS.female];

function getAvatarSource(key) {
  switch (key) {
    // male
    case 'male1': return require('../assets/avatars/male1.png');
    case 'male2': return require('../assets/avatars/male2.png');
    case 'male3': return require('../assets/avatars/male3.png');
    case 'male4': return require('../assets/avatars/male4.png');
    case 'male5': return require('../assets/avatars/male5.png');
    case 'male6': return require('../assets/avatars/male6.png');
    // female
    case 'female1': return require('../assets/avatars/female1.png');
    case 'female2': return require('../assets/avatars/female2.png');
    case 'female3': return require('../assets/avatars/female3.png');
    case 'female4': return require('../assets/avatars/female4.png');
    case 'female5': return require('../assets/avatars/female5.png');
    case 'female6': return require('../assets/avatars/female6.png');
    default:       return require('../assets/avatars/male1.png');
  }
}
// -----------------------------------------

const bloodGroupData = [
  { label: 'A+', value: 'A+' }, { label: 'A-', value: 'A-' },
  { label: 'B+', value: 'B+' }, { label: 'B-', value: 'B-' },
  { label: 'AB+', value: 'AB+' }, { label: 'AB-', value: 'AB-' },
  { label: 'O+', value: 'O+' }, { label: 'O-', value: 'O-' },
];
const commonConditions = ["Diabetes", "Hypertension", "Asthma", "Thyroid", "Arthritis"];

export default function AuthScreen() {
  const { colors } = useTheme();

  const [isLoginView, setIsLoginView] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // signup flow
  const [signupStep, setSignupStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [gender, setGender] = useState(null); // required as requested
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bloodGroup, setBloodGroup] = useState(null);
  const [conditions, setConditions] = useState('');
  const [selectedAvatarKey, setSelectedAvatarKey] = useState(null);

  // avatar list based on gender
  const avatarKeys = useMemo(() => {
    if (gender === 'male') return AVATAR_KEYS.male;
    if (gender === 'female') return AVATAR_KEYS.female;
    return ALL_AVATAR_KEYS; // for 'other' or not selected
  }, [gender]);

  // inline UI messages
  const [errorText, setErrorText] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successText, setSuccessText] = useState('');

  // email availability check
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isEmailRegistered, setIsEmailRegistered] = useState(false);
  const emailCheckTimeout = useRef(null);

  const [animDirection, setAnimDirection] = useState('right');

  useEffect(() => {
    // clear messages on view toggle
    setErrorText('');
    setSuccessText('');
    setFieldErrors({});
  }, [isLoginView]);

  // Debounced email existence check during signup step 1
  useEffect(() => {
    if (isLoginView) return;
    if (signupStep !== 1) return;

    setFieldErrors(prev => ({ ...prev, email: undefined }));
    setIsEmailRegistered(false);

    const emailTrim = (email || '').trim().toLowerCase();
    if (!emailTrim) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setFieldErrors(prev => ({ ...prev, email: 'Invalid email format.' }));
      return;
    }

    setIsCheckingEmail(true);
    if (emailCheckTimeout.current) clearTimeout(emailCheckTimeout.current);

    emailCheckTimeout.current = setTimeout(async () => {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, emailTrim);
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

  // validations
  const validateStep1 = () => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Invalid email format.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (isEmailRegistered) errs.email = 'Email already registered.';

    setFieldErrors(prev => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!dob) errs.dob = 'Date of birth is required.';
    if (!phone.trim()) errs.phone = 'Contact number is required.';
    else if (!/^[0-9]{10,15}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number (10-15 digits).';
    if (!gender) errs.gender = 'Gender is required.'; // required now

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
      setErrorText(e?.message || 'Login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpFinal = async () => {
    setErrorText(''); setSuccessText('');

    const ok1 = validateStep1();
    const ok2 = validateStep2();
    if (!ok1) { setSignupStep(1); setAnimDirection('left'); return; }
    if (!ok2) { setSignupStep(2); setAnimDirection('left'); return; }
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
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
        bloodGroup,
        conditions: conditions || null,
        avatarKey: selectedAvatarKey,
        createdAt: Timestamp.now()
      });

      setSuccessText('Account created successfully. You can login now.');
      setIsLoginView(true);
      setSignupStep(1);
      // reset fields
      setFirstName(''); setLastName(''); setPhone(''); setDob(null);
      setGender(null); setHeight(''); setWeight(''); setBloodGroup(null);
      setConditions(''); setSelectedAvatarKey(null); setPassword('');
    } catch (e) {
      setErrorText(e?.message || 'Signup failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = createStyles(colors);

  const AppButton = ({ title, onPress, disabled, loading, style }) => (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{title}</Text>}
    </TouchableOpacity>
  );

  const goNextFromStep1 = () => { setErrorText(''); if (!validateStep1()) return; setAnimDirection('right'); setSignupStep(2); };
  const goNextFromStep2 = () => { setErrorText(''); if (!validateStep2()) return; setAnimDirection('right'); setSignupStep(3); };

  const renderSignupStep = () => {
    const animation = animDirection === 'right' ? 'fadeInRight' : 'fadeInLeft';

    switch (signupStep) {
      case 1:
        return (
          <Animatable.View animation={animation} duration={400}>
            {/* Step 1: basic info */}
            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={text => { setFirstName(text); setFieldErrors(prev => ({ ...prev, firstName: undefined })); }}
              placeholderTextColor={colors.subtext}
              autoComplete="name"
              textContentType="givenName"
              autoCapitalize="words"
              autoCorrect={false}
            />
            {fieldErrors.firstName ? <Text style={styles.inlineError}>{fieldErrors.firstName}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={text => { setLastName(text); setFieldErrors(prev => ({ ...prev, lastName: undefined })); }}
              placeholderTextColor={colors.subtext}
              autoComplete="name"
              textContentType="familyName"
              autoCapitalize="words"
              autoCorrect={false}
            />
            {fieldErrors.lastName ? <Text style={styles.inlineError}>{fieldErrors.lastName}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Email Address"
              value={email}
              onChangeText={text => { setEmail(text); setFieldErrors(prev => ({ ...prev, email: undefined })); }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={colors.subtext}
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
            />
            {isCheckingEmail ? <Text style={styles.subtleText}>Checking email…</Text> : null}
            {fieldErrors.email ? <Text style={styles.inlineError}>{fieldErrors.email}</Text> : null}

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChangeText={text => { setPassword(text); setFieldErrors(prev => ({ ...prev, password: undefined })); }}
                secureTextEntry={!showPassword}
                placeholderTextColor={colors.subtext}
                autoComplete="password"
                textContentType="newPassword"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color={colors.subtext} />
              </TouchableOpacity>
            </View>
            {fieldErrors.password ? <Text style={styles.inlineError}>{fieldErrors.password}</Text> : null}
            {password ? <Text style={styles.subtleText}>Password strength: {getPasswordStrength()}</Text> : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secondaryButton, { width: '40%' }]} onPress={() => { setIsLoginView(true); setSignupStep(1); setFieldErrors({}); }}>
                <Text style={styles.secondaryButtonText}>Back to Login</Text>
              </TouchableOpacity>

              <AppButton
                title="Next"
                onPress={goNextFromStep1}
                disabled={isCheckingEmail || isEmailRegistered}
                style={{ width: '40%' }}
              />
            </View>
          </Animatable.View>
        );

      case 2:
        return (
          <Animatable.View animation={animation} duration={400}>
            {/* Step 2: gender, DOB, phone */}
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderSelector}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
                onPress={() => { setGender('male'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}
              >
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>Male</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
                onPress={() => { setGender('female'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}
              >
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>Female</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'other' && styles.genderButtonSelected]}
                onPress={() => { setGender('other'); setFieldErrors(prev => ({ ...prev, gender: undefined })); }}
              >
                <Text style={[styles.genderText, gender === 'other' && styles.genderTextSelected]}>Other</Text>
              </TouchableOpacity>
            </View>
            {fieldErrors.gender ? <Text style={styles.inlineError}>{fieldErrors.gender}</Text> : null}

            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.input}>
              <Text style={{ color: colors.text, fontSize: 16 }}>{dob ? dob.toLocaleDateString() : 'Select date of birth'}</Text>
            </TouchableOpacity>
            {fieldErrors.dob ? <Text style={styles.inlineError}>{fieldErrors.dob}</Text> : null}
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

            <TextInput
              style={styles.input}
              placeholder="Contact Number"
              value={phone}
              onChangeText={text => { setPhone(text.replace(/[^0-9]/g, '')); setFieldErrors(prev => ({ ...prev, phone: undefined })); }}
              keyboardType="phone-pad"
              placeholderTextColor={colors.subtext}
              autoComplete="tel"
              textContentType="telephoneNumber"
            />
            {fieldErrors.phone ? <Text style={styles.inlineError}>{fieldErrors.phone}</Text> : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secondaryButton, { width: '40%' }]} onPress={() => { setAnimDirection('left'); setSignupStep(1); }}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <AppButton title="Next" onPress={goNextFromStep2} style={{ width: '40%' }} />
            </View>
          </Animatable.View>
        );

      case 3:
        return (
          <Animatable.View animation={animation} duration={400}>
            {/* Step 3: health metrics */}
            <TextInput
              style={styles.input}
              placeholder="Height (cm)"
              value={height}
              onChangeText={text => setHeight(text.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={colors.subtext}
            />

            <TextInput
              style={styles.input}
              placeholder="Weight (kg)"
              value={weight}
              onChangeText={text => setWeight(text.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholderTextColor={colors.subtext}
            />

            <Dropdown
              style={styles.dropdown}
              placeholderStyle={{ color: colors.subtext, fontSize: 16 }}
              selectedTextStyle={{ color: colors.text, fontSize: 16 }}
              containerStyle={{ backgroundColor: colors.card, borderColor: colors.border }}
              activeColor={colors.background}
              itemTextStyle={{ color: colors.text }}
              data={bloodGroupData}
              labelField="label"
              valueField="value"
              placeholder="Select Blood Group"
              value={bloodGroup}
              onChange={item => { setBloodGroup(item.value); setFieldErrors(prev => ({ ...prev, bloodGroup: undefined })); }}
            />
            {fieldErrors.bloodGroup ? <Text style={styles.inlineError}>{fieldErrors.bloodGroup}</Text> : null}

            <TextInput
              style={styles.input}
              placeholder="Existing Conditions"
              value={conditions}
              onChangeText={setConditions}
              placeholderTextColor={colors.subtext}
            />

            <View style={styles.suggestionContainer}>
              {commonConditions.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setConditions(prev => (prev ? `${prev}, ${c}` : c))}
                  style={styles.suggestionChip}
                >
                  <Text style={styles.suggestionText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secondaryButton, { width: '40%' }]} onPress={() => { setAnimDirection('left'); setSignupStep(2); }}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <AppButton title="Next" onPress={() => { setAnimDirection('right'); setSignupStep(4); }} style={{ width: '40%' }} />
            </View>
          </Animatable.View>
        );

      case 4:
        return (
          <Animatable.View animation={animation} duration={400}>
            {/* Step 4: avatar (gender already chosen earlier affects avatarKeys) */}
            <Text style={{ textAlign: 'center', marginBottom: 12, color: colors.subtext }}>Choose your avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarKeys.map(key => (
                <TouchableOpacity key={key} onPress={() => { setSelectedAvatarKey(key); setFieldErrors(prev => ({ ...prev, avatar: undefined })); }}>
                  <Image
                    source={getAvatarSource(key)}
                    style={[ styles.avatar, selectedAvatarKey === key && styles.avatarSelected ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            {fieldErrors.avatar ? <Text style={styles.inlineError}>{fieldErrors.avatar}</Text> : null}

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.secondaryButton, { width: '40%' }]} onPress={() => { setAnimDirection('left'); setSignupStep(3); }}>
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>

              <AppButton title="Create Account" onPress={handleSignUpFinal} loading={isLoading} style={{ width: '40%' }} />
            </View>
          </Animatable.View>
        );

      default:
        return null;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Animatable.View animation="fadeInUp" duration={400} style={styles.card}>

          {/* single header -- prevents multiple headings */}
          <View style={styles.headerRow}>
            {!isLoginView ? (
              <TouchableOpacity onPress={() => {
                if (signupStep > 1) { setAnimDirection('left'); setSignupStep(prev => prev - 1); }
                else setIsLoginView(true);
              }}>
                <Ionicons name="arrow-back" size={22} color={colors.subtext} />
              </TouchableOpacity>
            ) : <View style={{ width: 22 }} />}

            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isLoginView ? 'Login to Asizto' : 'Register to Asizto'}
            </Text>

            <View style={{ width: 22 }} />
          </View>

          {successText ? <Text style={styles.successText}>{successText}</Text> : null}
          {errorText ? <Text style={styles.inlineError}>{errorText}</Text> : null}

          {isLoginView ? (
            <Animatable.View animation={animDirection === 'right' ? 'fadeInRight' : 'fadeInLeft'} duration={300}>
              {/* login form (no duplicate header) */}
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.subtext}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                autoCorrect={false}
              />
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor={colors.subtext}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color={colors.subtext} />
                </TouchableOpacity>
              </View>

              <AppButton title="Login" onPress={handleLogin} loading={isLoading} style={{ marginTop: 8, width: '100%' }} />
            </Animatable.View>
          ) : (
            renderSignupStep()
          )}

          {/* pinned bottom toggle area (moved toggles to bottom as requested) */}
          <View style={styles.bottomRow}>
            {isLoginView ? (
              <TouchableOpacity onPress={() => { setIsLoginView(false); setSignupStep(1); setFieldErrors({}); }}>
                <Text style={styles.toggleText}>Don't have an account? <Text style={styles.toggleLink}>Sign Up</Text></Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => { setIsLoginView(true); setSignupStep(1); setFieldErrors({}); }}>
                <Text style={styles.toggleText}>Already have an account? <Text style={styles.toggleLink}>Back to Login</Text></Text>
              </TouchableOpacity>
            )}
          </View>

        </Animatable.View>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" />
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center', backgroundColor: colors.background, paddingVertical: 30 },
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: {
    borderRadius: 20, padding: 18, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, backgroundColor: colors.card
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  label: { color: colors.subtext, marginBottom: 8, marginLeft: 5, fontSize: 14, fontWeight: '500' },
  input: {
    width: '100%', height: 50, backgroundColor: colors.input,
    borderColor: colors.border, borderWidth: 1, borderRadius: 12,
    marginBottom: 8, paddingLeft: 15, color: colors.text, justifyContent: 'center', fontSize: 16
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', width: '100%', height: 50,
    backgroundColor: colors.input, borderColor: colors.border, borderWidth: 1,
    borderRadius: 12, marginBottom: 12, paddingHorizontal: 15
  },
  passwordInput: { flex: 1, color: colors.text, fontSize: 16 },
  dropdown: {
    width: '100%', height: 50, backgroundColor: colors.input,
    borderColor: colors.border, borderWidth: 1, borderRadius: 12,
    marginBottom: 12, paddingHorizontal: 15
  },
  button: { backgroundColor: colors.primary, padding: 14, borderRadius: 12, alignItems: 'center', height: 48, justifyContent: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggleContainer: { marginTop: 18, alignItems: 'center' },
  toggleText: { color: colors.subtext, fontSize: 14 },
  toggleLink: { fontWeight: '700', color: colors.primary },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginBottom: 12 },
  avatar: { width: 70, height: 70, borderRadius: 35, margin: 6 },
  avatarSelected: { borderWidth: 4, borderColor: colors.primary },
  genderSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 },
  genderButton: {
    flex: 1, padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input
  },
  genderButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { color: colors.text, fontWeight: '600' },
  genderTextSelected: { color: '#fff' },
  suggestionContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  suggestionChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border
  },
  suggestionText: { color: colors.subtext },
  inlineError: { color: '#b00020', fontSize: 13, marginBottom: 8 },
  successText: { color: '#0a8a0a', fontSize: 14, marginBottom: 8, textAlign: 'center' },
  subtleText: { color: colors.subtext, fontSize: 12, marginBottom: 6 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  secondaryButton: { padding: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, minWidth: 100 },
  secondaryButtonText: { color: colors.text, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  bottomRow: { marginTop: 18, alignItems: 'center' }
});
