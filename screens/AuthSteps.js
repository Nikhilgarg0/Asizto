// AuthSteps.js — All signup steps + Login view
// screens/AuthSteps.js
import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, Image, Pressable, ScrollView,
    Animated, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

import { makeAuthStyles } from './AuthUI';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
    BLOOD_GROUPS, CONDITIONS, HABITS, HABIT_LABELS,
    AVATAR_KEYS, AVATAR_KEYS_BY_GENDER, getAvatarSource,
    Field, Btn, GhostBtn, Pills, GenderPicker, Chip, OTPRow, Label,
    useStagger,
} from './AuthUI';

const fmt = d => d
    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
export function LoginView({
    email, setEmail, password, setPassword,
    loginStep, loginOtp, setLoginOtp,
    otpError, resendCooldown, isSendingOtp,
    errors, isDark, onLogin, isLoading,
    onVerifyOtp, onBack, onResend, onGoSignup,
}) {
    const [showPwd, setShowPwd] = useState(false);
    const pwdRef = useRef(null);
    const { colors, theme } = useTheme();
    const { anims } = useStagger(3, { delay: 55, duration: 300 });

    if (loginStep === 'otp') {
        return (
            <View>
                <View style={{ alignItems: 'center', marginBottom: 26 }}>
                    <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
                        <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
                    </View>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: colors.text, letterSpacing: 0.2 }}>Verify It's You</Text>
                    <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 5, textAlign: 'center', lineHeight: 20 }}>
                        6-digit code sent to{'\n'}
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>{email?.trim()}</Text>
                    </Text>
                </View>
                <OTPRow value={loginOtp} onChangeText={setLoginOtp} error={otpError} isDark={isDark} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                    <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                    <View style={{ flex: 1.6 }}><Btn title="Verify" icon="checkmark-circle-outline" onPress={onVerifyOtp} loading={isLoading} /></View>
                </View>
                <Pressable onPress={onResend} disabled={isSendingOtp || resendCooldown > 0} style={{ alignItems: 'center', marginTop: 18, opacity: isSendingOtp || resendCooldown > 0 ? 0.4 : 1 }} accessibilityLabel="Resend OTP" accessibilityRole="button">
                    {isSendingOtp ? <ActivityIndicator size="small" color={colors.primary} /> : (
                        <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                        </Text>
                    )}
                </Pressable>
            </View>
        );
    }

    return (
        <View>
            <Animated.View style={{ opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Label isDark={isDark}>Email</Label>
                <Field
                    placeholder="your@email.com"
                    value={email} onChangeText={setEmail}
                    error={errors?.email} isDark={isDark}
                    keyboardType="email-address"
                    returnKeyType="next"
                    onSubmitEditing={() => pwdRef.current?.focus()}
                    autoComplete="email"
                />
            </Animated.View>

            <Animated.View style={{ opacity: anims[1], transform: [{ translateY: anims[1].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Label isDark={isDark}>Password</Label>
                <Field
                    placeholder="Your password"
                    value={password} onChangeText={setPassword}
                    error={errors?.password} isDark={isDark}
                    secureTextEntry={!showPwd} fref={pwdRef}
                    returnKeyType="done" onSubmitEditing={onLogin}
                    right={
                        <Pressable onPress={() => setShowPwd(v => !v)} style={{ paddingRight: 14 }} accessibilityLabel="Toggle password visibility" accessibilityRole="button">
                            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.subtext} />
                        </Pressable>
                    }
                />
            </Animated.View>

            <Animated.View style={{ opacity: anims[2], transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Btn title="Sign In" icon="log-in-outline" onPress={onLogin} loading={isLoading} style={{ marginTop: 6 }} />
                <Pressable onPress={onGoSignup}
                style={{ alignItems: 'center', marginTop: 20, padding: 4 }}
                accessibilityLabel="Go to signup"
                accessibilityRole="link">
                    <Text style={{ color: colors.subtext, fontSize: 14 }}>
                        New here? <Text style={{ color: colors.primary, fontWeight: '800' }}>Create account</Text>
                    </Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

// ─── STEP 1 — Account ─────────────────────────────────────────────────────────
export function Step1Account({
    firstName, setFirstName, lastName, setLastName,
    email, setEmail, password, setPassword,
    errors, isDark, onNext, isCheckingEmail, isEmailTaken,
}) {
    const [showPwd, setShowPwd] = useState(false);
    const lastRef = useRef(null), emailRef = useRef(null), pwdRef = useRef(null);
    const { colors, theme } = useTheme();
    const { anims } = useStagger(5, { delay: 50, duration: 280 });

    const strength = (() => {
        if (!password) return null;
        let s = 0;
        if (password.length >= 6) s++;
        if (password.length >= 10) s++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
        if (/\d/.test(password)) s++;
        if (/[^A-Za-z0-9]/.test(password)) s++;
        if (s <= 1) return { label: 'Weak', color: '#E05555', pct: 0.22 };
        if (s <= 3) return { label: 'Fair', color: '#F0A030', pct: 0.55 };
        return { label: 'Strong', color: colors.primary, pct: 1.0 };
    })();

    return (
        <View>
            <Animated.View style={{ opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <Label isDark={isDark}>Your Name</Label>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 0 }}>
                    <View style={{ flex: 1 }}>
                        <Field placeholder="First" value={firstName} onChangeText={setFirstName} error={errors.firstName} isDark={isDark} autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => lastRef.current?.focus()} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Field placeholder="Last" value={lastName} onChangeText={setLastName} error={errors.lastName} isDark={isDark} autoCapitalize="words" fref={lastRef} returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
                    </View>
                </View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[1], transform: [{ translateY: anims[1].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <Label isDark={isDark}>Email</Label>
                <Field
                    placeholder="your@email.com"
                    value={email} onChangeText={setEmail}
                    error={errors.email} isDark={isDark}
                    keyboardType="email-address" fref={emailRef}
                    returnKeyType="next" onSubmitEditing={() => pwdRef.current?.focus()}
                    right={
                        isCheckingEmail ? (
                            <View style={{ paddingRight: 14 }}><ActivityIndicator size="small" color={colors.subtext} /></View>
                        ) : isEmailTaken ? (
                            <View style={{ paddingRight: 14 }}><Ionicons name="close-circle" size={18} color="#E05555" /></View>
                        ) : email.includes('@') ? (
                            <View style={{ paddingRight: 14 }}><Ionicons name="checkmark-circle" size={18} color={colors.primary} /></View>
                        ) : null
                    }
                />
            </Animated.View>

            <Animated.View style={{ opacity: anims[2], transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
                <Label isDark={isDark}>Password</Label>
                <Field
                    placeholder="Min. 6 characters"
                    value={password} onChangeText={setPassword}
                    error={errors.password} isDark={isDark}
                    secureTextEntry={!showPwd} fref={pwdRef} returnKeyType="done"
                    right={
                        <Pressable
                            onPress={() => setShowPwd(v => !v)}
                            style={{ paddingRight: 14 }}
                            accessibilityLabel="Toggle password visibility"
                            accessibilityRole="button"
                        >
                            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.subtext} />
                        </Pressable>
                    }
                />
            </Animated.View>

            {strength && (
                <Animated.View style={{ marginBottom: 16, marginTop: -6, opacity: anims[3] }}>
                    <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${strength.pct * 100}%`, backgroundColor: strength.color, borderRadius: 99 }} />
                    </View>
                    <Text style={{ color: strength.color, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{strength.label} password</Text>
                </Animated.View>
            )}

            <Animated.View style={{ opacity: anims[4], transform: [{ translateY: anims[4].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Btn title="Continue" icon="arrow-forward" onPress={onNext} style={{ marginTop: 4 }} />
            </Animated.View>
        </View>
    );
}

// ─── STEP 2 — OTP verify ─────────────────────────────────────────────────────
export function Step2Verify({
    email, otp, setOtp, error, isDark,
    onVerify, onBack, isLoading, resendCooldown, isSendingOtp, onResend,
}) {
    const { colors, theme } = useTheme();
    const iconAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(iconAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start();
    }, []);

    const iconScale = iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
        <View>
            <View style={{ alignItems: 'center', marginBottom: 26 }}>
                <Animated.View style={{
                    transform: [{ scale: iconScale }],
                    width: 74, height: 74, borderRadius: 37,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                    borderWidth: 1.5, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                }}>
                    <Ionicons name="mail-open-outline" size={34} color={colors.primary} />
                </Animated.View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 5, letterSpacing: 0.2 }}>Check your inbox</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, textAlign: 'center', lineHeight: 20 }}>
                    We sent a 6-digit code to
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 2 }}>{email}</Text>
            </View>

            <OTPRow value={otp} onChangeText={setOtp} error={error} isDark={isDark} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
                <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                <View style={{ flex: 1.6 }}><Btn title="Verify Email" icon="shield-checkmark-outline" onPress={onVerify} loading={isLoading} /></View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Pressable
                    disabled={isSendingOtp || resendCooldown > 0}
                    onPress={onResend}
                    style={{ opacity: isSendingOtp || resendCooldown > 0 ? 0.4 : 1 }}
                    accessibilityLabel="Resend code"
                    accessibilityRole="button"
                >
                    {isSendingOtp
                        ? <ActivityIndicator size="small" color={colors.primary} />
                        : <Text
                            style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}
                            accessibilityLabel="Resend code"
                            accessibilityRole="button"
                        >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                        </Text>
                    }
                </Pressable>
            </View>
        </View>
    );
}

// ─── STEP 3 — Personal details ────────────────────────────────────────────────
export function Step3Details({
    dob, setDob, phoneDigits, setPhoneDigits, gender, setGender,
    showDatePicker, setShowDatePicker, errors, isDark, onNext, onBack,
}) {
    const { colors, theme } = useTheme();
    const { anims } = useStagger(4, { delay: 55, duration: 280 });

    return (
        <View>
            <Animated.View style={{ opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Label isDark={isDark}>Date of Birth</Label>
                <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={{
                        height: 50, borderRadius: 13, borderWidth: 1.5,
                        borderColor: errors.dob ? '#E05555' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 15, justifyContent: 'space-between',
                        marginBottom: errors.dob ? 2 : 14,
                    }}
                    accessibilityLabel="Select date of birth"
                    accessibilityRole="button"
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="calendar-outline" size={17} color={dob ? colors.text : colors.subtext} />
                        <Text style={{ color: dob ? colors.text : colors.subtext, fontSize: 15 }}>{dob ? fmt(dob) : 'Select date of birth'}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={15} color={colors.subtext} />
                </Pressable>
                {errors.dob ? <Text style={{ color: '#E05555', fontSize: 13, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{errors.dob}</Text> : null}
                {showDatePicker && (
                    <DateTimePicker
                        value={dob || new Date(2000, 0, 1)}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        maximumDate={new Date()}
                        onChange={(_, d) => { setShowDatePicker(false); if (d) setDob(d); }}
                    />
                )}
            </Animated.View>

            <Animated.View style={{ opacity: anims[1], transform: [{ translateY: anims[1].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Label isDark={isDark}>Mobile Number</Label>
                <Field
                    placeholder="10-digit number"
                    value={phoneDigits}
                    onChangeText={t => setPhoneDigits(t.replace(/\D/g, ''))}
                    error={errors.phone} isDark={isDark}
                    keyboardType="phone-pad" maxLength={10} prefix="+91"
                />
            </Animated.View>

            <Animated.View style={{ opacity: anims[2], transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Label isDark={isDark}>Gender</Label>
                <View style={{ marginBottom: errors.gender ? 2 : 14 }}>
                    <GenderPicker selected={gender} onSelect={setGender} isDark={isDark} />
                </View>
                {errors.gender ? <Text style={{ color: '#E05555', fontSize: 13, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{errors.gender}</Text> : null}
            </Animated.View>

            <Animated.View style={{ opacity: anims[3], transform: [{ translateY: anims[3].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                    <View style={{ flex: 1.6 }}><Btn title="Continue" icon="arrow-forward" onPress={onNext} /></View>
                </View>
            </Animated.View>
        </View>
    );
}

// ─── STEP 4 — Health profile ──────────────────────────────────────────────────
export function Step4Health({
    heightVal, setHeight, weightVal, setWeight,
    bloodGroup, setBloodGroup, conditions, toggleCondition,
    smoking, setSmoking, drinking, setDrinking,
    errors, isDark, onNext, onBack,
}) {
    const [showBlood, setShowBlood] = useState(false);
    const { colors, theme } = useTheme();
    const pillOpts = HABITS.map(v => ({ value: v, label: HABIT_LABELS[v] }));
    const { anims } = useStagger(7, { delay: 40, duration: 260 });

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
            <Animated.View style={{ opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                        <Label isDark={isDark}>Height (cm)</Label>
                        <Field placeholder="170" value={heightVal} onChangeText={t => setHeight(t.replace(/[^0-9.]/g, ''))} isDark={isDark} keyboardType="numeric" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Label isDark={isDark}>Weight (kg)</Label>
                        <Field placeholder="70" value={weightVal} onChangeText={t => setWeight(t.replace(/[^0-9.]/g, ''))} isDark={isDark} keyboardType="numeric" />
                    </View>
                </View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[1], transform: [{ translateY: anims[1].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Label isDark={isDark}>Blood Group</Label>
                <Pressable
                    onPress={() => setShowBlood(v => !v)}
                    style={{ height: 50, borderRadius: 13, borderWidth: 1.5, borderColor: errors.bloodGroup ? '#E05555' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between', marginBottom: showBlood ? 8 : (errors.bloodGroup ? 2 : 14) }}
                    accessibilityLabel="Select blood group"
                    accessibilityRole="button"
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="water-outline" size={17} color={bloodGroup ? colors.primary : colors.subtext} />
                        <Text style={{ color: bloodGroup ? colors.text : colors.subtext, fontSize: 15 }}>{bloodGroup || 'Select blood group'}</Text>
                    </View>
                    <Ionicons name={showBlood ? 'chevron-up' : 'chevron-down'} size={15} color={colors.subtext} />
                </Pressable>
                {errors.bloodGroup ? <Text style={{ color: '#E05555', fontSize: 13, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{errors.bloodGroup}</Text> : null}
                {showBlood && (
                    <View style={{ borderRadius: 13, borderWidth: 1.5, borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', backgroundColor: theme === 'dark' ? colors.card : '#F8FDF9', marginBottom: 14, overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 }}>
                            {BLOOD_GROUPS.map(bg => {
                                const sel = bg === bloodGroup;
                                return (
                                    <Pressable key={bg} onPress={() => { setBloodGroup(bg); setShowBlood(false); }}
                                        style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: sel ? colors.primary : colors.card, borderWidth: 1.5, borderColor: sel ? colors.primary : colors.cardBorder }}
                                        accessibilityLabel={`Select ${bg} blood group`}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: bg === bloodGroup }}
                                    >
                                        <Text style={{ color: sel ? colors.background : colors.subtext, fontWeight: '800', fontSize: 14 }}>{bg}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </Animated.View>

            <Animated.View style={{ opacity: anims[2], transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Label isDark={isDark}>Medical Conditions (Optional)</Label>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                    {CONDITIONS.map(cond => (
                        <Chip key={cond} label={cond} selected={conditions.includes(cond)} onPress={() => toggleCondition(cond)} isDark={isDark} />
                    ))}
                </View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[3], transform: [{ translateY: anims[3].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Label isDark={isDark}>Smoking Habits</Label>
                <View style={{ marginBottom: 14 }}><Pills options={pillOpts} selected={smoking} onSelect={setSmoking} isDark={isDark} /></View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[4], transform: [{ translateY: anims[4].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Label isDark={isDark}>Drinking Habits</Label>
                <View style={{ marginBottom: 18 }}><Pills options={pillOpts} selected={drinking} onSelect={setDrinking} isDark={isDark} /></View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[5], transform: [{ translateY: anims[5].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                    <View style={{ flex: 1.6 }}><Btn title="Continue" icon="arrow-forward" onPress={onNext} /></View>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

// ── STEP 5 — Avatar ─────────────────────────────────────────────────────
function AvatarTile({ avatarKey, selected, onPress, isDark, size }) {
    const scale = useRef(new Animated.Value(1)).current;
    const glow  = useRef(new Animated.Value(selected ? 1 : 0)).current;
    const { colors } = useTheme();

    useEffect(() => {
        Animated.spring(glow, { toValue: selected ? 1 : 0, friction: 5, useNativeDriver: false }).start();
    }, [selected]);

    const onIn  = () => Animated.spring(scale, { toValue: 0.88, friction: 3, useNativeDriver: true }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1,    friction: 3, useNativeDriver: true }).start();

    const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: [colors.border, colors.primary] });
    const bgColor     = glow.interpolate({ inputRange: [0, 1], outputRange: [colors.card, colors.primary + '18'] });
    const shadowR     = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 12] });
    const shadowO     = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] });

    return (
        <Pressable
            onPressIn={onIn} onPressOut={onOut} onPress={onPress}
            accessibilityLabel={`Select avatar ${avatarKey}`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
        >
            <Animated.View style={{ transform: [{ scale }], width: size, height: size }}>
                <Animated.View style={{
                    width: size, height: size,
                    shadowColor: colors.primary, shadowRadius: shadowR,
                    shadowOpacity: shadowO, shadowOffset: { width: 0, height: 4 },
                    elevation: selected ? 8 : 0,
                }}>
                    <Animated.View style={{
                        width: size, height: size, borderRadius: 16,
                        borderWidth: selected ? 2.5 : 1.5, borderColor,
                        backgroundColor: bgColor, overflow: 'hidden', padding: 5,
                    }}>
                        <Image
                            source={getAvatarSource(avatarKey)}
                            style={{ flex: 1, width: '100%', height: '100%', borderRadius: 11 }}
                            resizeMode="cover"
                        />
                    </Animated.View>
                </Animated.View>
                {selected && (
                    <View style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 22, height: 22, borderRadius: 11,
                        backgroundColor: colors.primary,
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
                    }}>
                        <Ionicons name="checkmark" size={13} color="#fff" />
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
}

export function Step5Avatar({ selectedAvatarKey, setSelectedAvatarKey, gender, errors, isDark, onFinish, onBack, isLoading }) {
    const { width } = useWindowDimensions();
    const { colors } = useTheme();

    // Filter avatars by gender — 'other' gets all 12
    const keys = AVATAR_KEYS_BY_GENDER[gender] ?? AVATAR_KEYS;

    // Auto-select first matching avatar when gender-filtered list doesn't contain current selection
    useEffect(() => {
        if (selectedAvatarKey && !keys.includes(selectedAvatarKey)) {
            setSelectedAvatarKey(keys[0]);
        }
    }, [gender]);

    const { anims } = useStagger(keys.length, { delay: 35, duration: 220 });

    // 3-column grid: (screenWidth * 0.88) minus card padding (24*2) minus gaps (12*2) / 3
    const COLS    = 3;
    const HPAD    = 48;   // card horizontal padding total
    const GAP     = 12;
    const tileSize = Math.floor((width * 0.88 - HPAD - GAP * (COLS - 1)) / COLS);

    // Build rows of COLS for a clean grid (avoids flexWrap misalignment)
    const rows = [];
    for (let i = 0; i < keys.length; i += COLS) {
        rows.push(keys.slice(i, i + COLS));
    }

    const genderLabel = gender === 'male' ? 'Male avatars'
        : gender === 'female' ? 'Female avatars'
        : 'All avatars';

    return (
        <View>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 0.2 }}>Pick your avatar</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>This represents you in the app</Text>
                <View style={{
                    marginTop: 8, paddingHorizontal: 12, paddingVertical: 4,
                    backgroundColor: colors.primary + '18', borderRadius: 20,
                }}>
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>{genderLabel}</Text>
                </View>
                {errors.avatar
                    ? <Text style={{ color: '#E05555', fontSize: 12, fontWeight: '600', marginTop: 6 }}>{errors.avatar}</Text>
                    : null}
            </View>

            {/* Proper 3-column grid using explicit rows */}
            <ScrollView showsVerticalScrollIndicator={false}
                style={{ maxHeight: tileSize * 3 + GAP * 2 + 20 }}
                contentContainerStyle={{ paddingBottom: 4 }}
            >
                {rows.map((row, rowIdx) => (
                    <View key={rowIdx} style={{
                        flexDirection: 'row',
                        gap: GAP,
                        marginBottom: rowIdx < rows.length - 1 ? GAP : 0,
                    }}>
                        {row.map((key, colIdx) => {
                            const flatIdx = rowIdx * COLS + colIdx;
                            return (
                                <Animated.View
                                    key={key}
                                    style={{
                                        opacity: anims[flatIdx] ?? 1,
                                        transform: [{ scale: (anims[flatIdx] ?? new Animated.Value(1))
                                            .interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }],
                                    }}
                                >
                                    <AvatarTile
                                        avatarKey={key}
                                        selected={selectedAvatarKey === key}
                                        onPress={() => setSelectedAvatarKey(key)}
                                        isDark={isDark}
                                        size={tileSize}
                                    />
                                </Animated.View>
                            );
                        })}
                        {/* Fill empty slots in last row so grid aligns left */}
                        {row.length < COLS && Array.from({ length: COLS - row.length }).map((_, i) => (
                            <View key={`empty-${i}`} style={{ width: tileSize }} />
                        ))}
                    </View>
                ))}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                <View style={{ flex: 1.6 }}><Btn title="Create Account" icon="checkmark-circle-outline" onPress={onFinish} loading={isLoading} /></View>
            </View>
        </View>
    );
}