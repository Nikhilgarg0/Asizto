case 3:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            key="step3"
          >
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.4 }}>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="170"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={heightVal}
                    onChangeText={t => setHeight(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="68"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={weightVal}
                    onChangeText={t => setWeight(t.replace(/[^0-9.]/g, ''))}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="water-outline" size={14} /> Blood Group
                </Text>
                <Pressable
                  onPress={() => {
                    setShowBloodList(!showBloodList);
                    if (Haptics) Haptics.selectionAsync();
                  }}
                  style={[styles.input, styles.dropdownButton]}
                >
                  <Text style={bloodGroup ? styles.dropdownValue : styles.dropdownPlaceholder}>
                    {bloodGroup || 'Select Blood Group'}
                  </Text>
                  <Ionicons 
                    name={showBloodList ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#6DBF6A" 
                  />
                </Pressable>
                {showBloodList && (
                  <MotiView
                    from={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ type: 'timing', duration: 200 }}
                    style={styles.dropdownList}
                  >
                    {bloodGroupData.map(item => (
                      <Pressable
                        key={item.value}
                        onPress={() => {
                          setBloodGroup(item.value);
                          setFieldErrors(prev => ({ ...prev, bloodGroup: undefined }));
                          setShowBloodList(false);
                          if (Haptics) Haptics.selectionAsync();
                        }}
                        style={[
                          styles.dropdownItem,
                          bloodGroup === item.value && styles.dropdownItemActive
                        ]}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          bloodGroup === item.value && styles.dropdownItemTextActive
                        ]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </MotiView>
                )}
                {fieldErrors.bloodGroup && (
                  <Animatable.Text animation="fadeIn" style={styles.errorText}>
                    {fieldErrors.bloodGroup}
                  </Animatable.Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  <Ionicons name="medkit-outline" size={14} /> Medical Conditions
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any existing conditions?"
                  placeholderTextColor={styles.placeholderColor.color}
                  value={conditions}
                  onChangeText={setConditions}
                  multiline
                />
                <View style={styles.conditionChips}>
                  {["Diabetes", "Hypertension", "Asthma", "Thyroid", "Arthritis"].map(c => (
                    <Pressable
                      key={c}
                      onPress={() => {
                        setConditions(prev => (prev ? `${prev}, ${c}` : c));
                        if (Haptics) Haptics.selectionAsync();
                      }}
                      style={styles.chip}
                    >
                      <Text style={styles.chipText}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.stepActions}>
              <ActionButton
                title="Back"
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSignupStep(2);
                }}
                variant="ghost"
              />
              <ActionButton title="Continue" onPress={() => setSignupStep(4)} />
            </View>
          </MotiView>
        );

      case 4:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            key="step4"
          >
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="flame-outline" size={14} /> Do you smoke?
              </Text>
              <View style={styles.optionButtons}>
                {['no', 'occasionally', 'daily'].map(opt => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.optionButton,
                      smoking === opt && styles.optionButtonActive
                    ]}
                    onPress={() => {
                      setSmoking(opt);
                      if (Haptics) Haptics.selectionAsync();
                    }}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      smoking === opt && styles.optionButtonTextActive
                    ]}>
                      {opt === 'no' ? 'No' : opt === 'occasionally' ? 'Sometimes' : 'Daily'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {smoking === 'occasionally' && (
                <MotiView
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ type: 'timing', duration: 200 }}
                >
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="How often? (optional)"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={smokingFreq}
                    onChangeText={setSmokingFreq}
                  />
                </MotiView>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                <Ionicons name="wine-outline" size={14} /> Do you drink alcohol?
              </Text>
              <View style={styles.optionButtons}>
                {['no', 'occasionally', 'daily'].map(opt => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.optionButton,
                      drinking === opt && styles.optionButtonActive
                    ]}
                    onPress={() => {
                      setDrinking(opt);
                      if (Haptics) Haptics.selectionAsync();
                    }}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      drinking === opt && styles.optionButtonTextActive
                    ]}>
                      {opt === 'no' ? 'No' : opt === 'occasionally' ? 'Sometimes' : 'Daily'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {drinking === 'occasionally' && (
                <MotiView
                  from={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ type: 'timing', duration: 200 }}
                >
                  <TextInput
                    style={[styles.input, { marginTop: 8 }]}
                    placeholder="How often? (optional)"
                    placeholderTextColor={styles.placeholderColor.color}
                    value={drinkingFreq}
                    onChangeText={setDrinkingFreq}
                  />
                </MotiView>
              )}
            </View>

            <View style={styles.stepActions}>
              <ActionButton
                title="Back"
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSignupStep(3);
                }}
                variant="ghost"
              />
              <ActionButton title="Continue" onPress={() => setSignupStep(5)} />
            </View>
          </MotiView>
        );

      case 5:
        return (
          <MotiView
            from={{ opacity: 0, translateX: 50 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            key="step5"
          >
            <Text style={styles.avatarTitle}>Choose your avatar</Text>
            <View style={styles.avatarGrid}>
              {avatarKeys.map((key, index) => (
                <MotiView
                  key={key}
                  from={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    type: 'spring', 
                    delay: index * 50,
                    damping: 15 
                  }}
                >
                  <Pressable
                    onPress={() => {
                      setSelectedAvatarKey(key);
                      setFieldErrors(prev => ({ ...prev, avatar: undefined }));
                      if (Haptics) Haptics.selectionAsync();
                    }}
                    style={[
                      styles.avatarItem,
                      selectedAvatarKey === key && styles.avatarItemSelected
                    ]}
                  >
                    <Image 
                      source={getAvatarSource(key)} 
                      style={styles.avatarImage}
                    />
                    {selectedAvatarKey === key && (
                      <View style={styles.avatarCheck}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                </MotiView>
              ))}
            </View>
            {fieldErrors.avatar && (
              <Animatable.Text animation="fadeIn" style={styles.errorText}>
                {fieldErrors.avatar}
              </Animatable.Text>
            )}

            <View style={styles.stepActions}>
              <ActionButton
                title="Back"
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setSignupStep(4);
                }}
                variant="ghost"
              />
              <ActionButton
                title="Create Account"
                onPress={handleSignUpFinal}
                loading={isLoading}
              />
            </View>
          </MotiView>
        );

      default:
        return null;
    }
  };

  // Step animation
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

  // Main render
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            {/* Enhanced animated background */}
            <LinearGradient 
              colors={isDark ? ['#0A1628', '#1E3A5F'] : ['#E8F5E9', '#C8E6C9']} 
              style={StyleSheet.absoluteFill} 
            />
            
            <View style={styles.backgroundAnimations} pointerEvents="none">
              <ParticleField count={15} color="#6DBF6A" />
              <FloatingOrb size={300} color="#6DBF6A" initialX={-100} initialY={-50} />
              <FloatingOrb size={250} color="#52A550" initialX={width - 150} initialY={100} duration={18000} />
              <FloatingOrb size={200} color="#8BC34A" initialX={width / 2} initialY={height - 200} duration={20000} />
              
              <GradientWave 
                colors={['transparent', 'rgba(109, 191, 106, 0.3)', 'transparent']} 
                top={height * 0.1} 
                height={150} 
              />
              <GradientWave 
                colors={['transparent', 'rgba(82, 165, 80, 0.3)', 'transparent']} 
                top={height * 0.3} 
                height={180} 
                duration={10000}
                reverse 
              />
              <GradientWave 
                colors={['transparent', 'rgba(139, 195, 74, 0.3)', 'transparent']} 
                top={height * 0.6} 
                height={200} 
                duration={12000}
              />
            </View>

            {/* Logo */}
            <Animatable.View 
              animation="fadeInDown" 
              duration={800} 
              style={styles.logoContainer}
            >
              {logoSource ? (
                <Image source={logoSource} style={styles.logo} resizeMode="contain" />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoText}>LOGO</Text>
                </View>
              )}
            </Animatable.View>

            {/* Main Card */}
            <Animatable.View
              animation="fadeInUp"
              duration={600}
              delay={200}
              style={{ width: cardWidth, marginTop: cardShiftY }}
            >
              <Animated.View style={[styles.cardOuter, { height: contentHeightAnim }]}>
                <View style={styles.card}>
                  {glassEnabled && (
                    <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={styles.blurLayer} />
                  )}
                  
                  <LinearGradient
                    colors={isDark 
                      ? ['rgba(255,255,255,0.05)', 'rgba(255,255// AuthScreen.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView, Image,
  Platform, ActivityIndicator, Animated, Easing, UIManager, LayoutAnimation,
  SafeAreaView, KeyboardAvoidingView, Keyboard, useColorScheme, useWindowDimensions, Dimensions
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MotiView } from 'moti';
import { auth, db } from '../firebaseConfig';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

// Optional haptics
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

/** -------------------- Enhanced Background Animations -------------------- **/
const FloatingOrb = ({ size, color, initialX, initialY, duration = 15000 }) => {
  const animation = useRef(new Animated.Value(0)).current;
  const randomPhase = useRef(Math.random() * Math.PI * 2).current;
  
  useEffect(() => {
    const animate = Animated.loop(
      Animated.timing(animation, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animate.start();
    return () => animate.stop();
  }, []);

  const translateX = animation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, 60, 0, -60, 0],
  });

  const translateY = animation.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, -40, -80, -40, 0],
  });

  const scale = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  const opacity = animation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.15, 0.25, 0.15],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: initialX,
        top: initialY,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
};

const ParticleField = ({ count = 20, color = '#6DBF6A' }) => {
  const particles = useRef([]);
  const { width, height } = useWindowDimensions();
  
  for (let i = 0; i < count; i++) {
    particles.current.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 10000 + 20000,
    });
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.current.map(p => (
        <FloatingParticle key={p.id} {...p} color={color} />
      ))}
    </View>
  );
};

const FloatingParticle = ({ x, y, size, duration, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Dimensions.get('window').height - 100],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0, 1, 1, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: opacity,
        transform: [{ translateY }],
      }}
    />
  );
};

const GradientWave = ({ colors, top, height, duration = 8000, reverse = false }) => {
  const anim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? [0, -width * 0.3] : [0, width * 0.3],
  });

  const scaleY = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top,
        left: -width * 0.2,
        right: -width * 0.2,
        height,
        opacity: 0.08,
        transform: [{ translateX }, { scaleY }],
      }}
      pointerEvents="none"
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: height / 2 }}
      />
    </Animated.View>
  );
};

/** -------------------- Progress Bar Component -------------------- **/
const AnimatedProgressBar = ({ currentStep, totalSteps, stepTitles }) => {
  const progressAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: (currentStep - 1) / (totalSteps - 1),
      useNativeDriver: false,
      tension: 65,
      friction: 11,
    }).start();
  }, [currentStep]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={progressStyles.container}>
      {/* Progress track */}
      <View style={progressStyles.track}>
        <Animated.View style={[progressStyles.fill, { width: progressWidth }]}>
          <LinearGradient
            colors={['#6DBF6A', '#52A550']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        
        {/* Step indicators */}
        {[...Array(totalSteps)].map((_, i) => {
          const stepNum = i + 1;
          const isActive = stepNum <= currentStep;
          const isCurrent = stepNum === currentStep;
          
          return (
            <MotiView
              key={i}
              from={{ scale: 1 }}
              animate={{ 
                scale: isCurrent ? 1.2 : 1,
                backgroundColor: isActive ? '#6DBF6A' : '#E0E0E0',
              }}
              transition={{
                type: 'spring',
                duration: 500,
              }}
              style={[
                progressStyles.stepDot,
                { left: `${(i / (totalSteps - 1)) * 100}%` },
              ]}
            >
              {isCurrent && (
                <MotiView
                  from={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{
                    loop: true,
                    type: 'timing',
                    duration: 1500,
                  }}
                  style={progressStyles.pulse}
                />
              )}
              <Text style={[progressStyles.stepNumber, isActive && progressStyles.stepNumberActive]}>
                {isActive ? '✓' : stepNum}
              </Text>
            </MotiView>
          );
        })}
      </View>
      
      {/* Step title */}
      <MotiView
        from={{ opacity: 0, translateY: -10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        key={currentStep}
      >
        <Text style={progressStyles.stepTitle}>{stepTitles[currentStep - 1]}</Text>
      </MotiView>
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 20,
  },
  track: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 25,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepDot: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    top: -12,
    marginLeft: -14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
  },
  stepNumberActive: {
    color: '#fff',
  },
  pulse: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6DBF6A',
  },
  stepTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});

/** -------------------- Friendly auth error mapper -------------------- **/
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
      return 'Network error. Check your connection.';
    case 'auth/email-already-in-use':
      return 'Email already registered. Please login.';
    case 'auth/weak-password':
      return 'Password is too weak (minimum 6 characters).';
    default:
      return context === 'signup'
        ? 'Couldn't create account. Please try again.'
        : 'Failed to sign in. Please try again.';
  }
}

/** -------------------- Main Component -------------------- **/
export default function AuthScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { width, height } = useWindowDimensions();

  if (!width || !height || !scheme) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6DBF6A" />
      </View>
    );
  }

  // Responsive tokens
  const CARD_MAX_WIDTH = 680;
  const cardWidth = Math.min(CARD_MAX_WIDTH, Math.round(width * 0.94));
  const cardMinHeight = Math.max(360, Math.round(height * 0.34));
  const cardMaxHeight = Math.min(820, Math.round(height * 0.86));
  const cardShiftY = Math.round(Math.max(6, Math.min(12, height * 0.045)));

  // States
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
  const [smoking, setSmoking] = useState('no');
  const [drinking, setDrinking] = useState('no');
  const [smokingFreq, setSmokingFreq] = useState('');
  const [drinkingFreq, setDrinkingFreq] = useState('');

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

  // Step titles for progress bar
  const stepTitles = [
    'Account Details',
    'Personal Info',
    'Health Profile',
    'Lifestyle',
    'Choose Avatar'
  ];

  useEffect(() => {
    setErrorText(''); 
    setSuccessText(''); 
    setFieldErrors({});
  }, [isLoginView]);

  // Email validation for signup
  useEffect(() => {
    if (isLoginView || signupStep !== 1) return;
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) { 
      setIsEmailRegistered(false); 
      return; 
    }
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
          setFieldErrors(prev => ({ ...prev, email: 'Email already registered. Use Login.' }));
        } else {
          setIsEmailRegistered(false);
          setFieldErrors(prev => ({ ...prev, email: undefined }));
        }
      } catch (e) {
        setFieldErrors(prev => ({ ...prev, email: 'Unable to verify email.' }));
      } finally {
        setIsCheckingEmail(false);
      }
    }, 700);
    return () => emailCheckTimeout.current && clearTimeout(emailCheckTimeout.current);
  }, [email, isLoginView, signupStep]);

  // Validation helpers
  const validateStep1 = () => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'First name is required.';
    if (!lastName.trim()) errs.lastName = 'Last name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Invalid email format.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters.';
    if (isEmailRegistered) errs.email = 'Email already registered. Use Login.';
    setFieldErrors(prev => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!dob) errs.dob = 'Date of birth is required.';
    if (!phone.trim()) errs.phone = 'Contact number is required.';
    else if (!/^[0-9]{10,15}$/.test(phone.trim())) errs.phone = 'Enter a valid phone number.';
    if (!gender) errs.gender = 'Gender is required.';
    setFieldErrors(prev => ({ ...prev, ...errs }));
    return Object.keys(errs).length === 0;
  };

  const getPasswordStrength = () => {
    if (!password) return { text: '', color: '#999' };
    if (password.length < 6) return { text: 'Weak', color: '#ef4444' };
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (hasUpper && hasDigit && hasSpecial) return { text: 'Strong', color: '#22c55e' };
    if ((hasUpper && hasDigit) || (hasDigit && hasSpecial) || (hasUpper && hasSpecial)) 
      return { text: 'Medium', color: '#f59e0b' };
    return { text: 'Weak', color: '#ef4444' };
  };

  // Animated height setup
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

  useEffect(() => {
    return () => {
      if (contentMeasureTimeout.current) clearTimeout(contentMeasureTimeout.current);
    };
  }, []);

  // Auth handlers
  const handleLogin = async () => {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setErrorText('');
    setSuccessText('');
    if (!email.trim() || !password) {
      setErrorText('Email and password are required.');
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      setSuccessText('Login successful!');
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      const friendly = getAuthErrorMessage(e, 'login');
      setErrorText(friendly);
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpFinal = async () => {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorText('');
    setSuccessText('');
    const ok1 = validateStep1();
    const ok2 = validateStep2();
    if (!ok1) {
      setSignupStep(1);
      return;
    }
    if (!ok2) {
      setSignupStep(2);
      return;
    }
    if (!selectedAvatarKey) {
      setFieldErrors(prev => ({ ...prev, avatar: 'Please select an avatar.' }));
      setSignupStep(5);
      return;
    }
    if (!bloodGroup) {
      setFieldErrors(prev => ({ ...prev, bloodGroup: 'Please select blood group.' }));
      setSignupStep(3);
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password
      );
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
        smoking: smoking || 'no',
        smokingFreq: smokingFreq || null,
        drinking: drinking || 'no',
        drinkingFreq: drinkingFreq || null,
        avatarKey: selectedAvatarKey,
        createdAt: Timestamp.now()
      });
      setSuccessText('Account created successfully!');
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setIsLoginView(true);
        setSignupStep(1);
        // Reset all fields
        setFirstName('');
        setLastName('');
        setPhone('');
        setDob(null);
        setGender(null);
        setHeight('');
        setWeight('');
        setBloodGroup(null);
        setConditions('');
        setSelectedAvatarKey(null);
        setPassword('');
        setSmoking('no');
        setDrinking('no');
        setSmokingFreq('');
        setDrinkingFreq('');
      }, 1500);
    } catch (e) {
      const friendly = getAuthErrorMessage(e, 'signup');
      setErrorText(friendly);
      if (Haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  // Next step navigation with haptics
  const goNextFromStep1 = () => {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setErrorText('');
    if (!validateStep1()) return;
    setSignupStep(2);
  };

  const goNextFromStep2 = () => {
    if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setErrorText('');
    if (!validateStep2()) return;
    setSignupStep(3);
  };

  const logoSource = isDark
    ? (logoDark || logoLight || logoFallback)
    : (logoLight || logoDark || logoFallback);

  const styles = createStyles({
    isDark,
    width,
    height,
    cardWidth,
    cardMinHeight,
    cardMaxHeight,
    cardShiftY,
    glassEnabled
  });

  if (!styles || !styles.safeArea || !styles.container) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6DBF6A" />
      </View>
    );
  }

  // Enhanced Action Button with animation
  const ActionButton = ({ title, onPress, disabled, loading, style, variant = 'primary' }) => (
    <MotiView
      from={{ scale: 1 }}
      animate={{ scale: disabled ? 1 : 1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'timing', duration: 100 }}
    >
      <Pressable
        onPress={() => {
          if (Haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress && onPress();
        }}
        style={({ pressed }) => [
          variant === 'primary' ? styles.button : styles.ghostButton,
          disabled && styles.buttonDisabled,
          pressed && !disabled && styles.buttonPressed,
          style
        ]}
        disabled={disabled || loading}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#fff' : '#6DBF6A'} />
        ) : (
          <Text style={variant === 'primary' ? styles.buttonText : styles.ghostButtonText}>
            {title}
          </Text>
        )}
      </Pressable>
    </MotiView>