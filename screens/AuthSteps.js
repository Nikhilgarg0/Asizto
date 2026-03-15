// AuthSteps.js — All signup steps + Login view
// screens/AuthSteps.js
import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, Image, Pressable, ScrollView,
    Animated, ActivityIndicator, Platform, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
    C, BLOOD_GROUPS, CONDITIONS, HABITS, HABIT_LABELS,
    AVATAR_KEYS, getAvatarSource,
    Field, Btn, GhostBtn, Pills, GenderPicker, Chip, OTPRow, Label,
    useStagger,
} from './AuthUI';

const fmt = d => d
    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
export function LoginView({
    email, setEmail, password, setPassword,
    loginStep, loginOtpDigits, setLoginOtpDigits, loginOtpRefs,
    otpError, resendCooldown, isSendingOtp,
    errors, isDark, onLogin, isLoading,
    onVerifyOtp, onBack, onResend, onGoSignup,
}) {
    const [showPwd, setShowPwd] = useState(false);
    const pwdRef = useRef(null);
    const c = isDark ? C.dark : C.light;
    const { anims } = useStagger(3, { delay: 55, duration: 300 });

    if (loginStep === 'otp') {
        return (
            <View>
                <View style={{ alignItems: 'center', marginBottom: 26 }}>
                    <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: isDark ? 'rgba(78,204,106,0.13)' : 'rgba(78,204,106,0.10)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(78,204,106,0.28)' }}>
                        <Ionicons name="shield-checkmark-outline" size={30} color={C.primary} />
                    </View>
                    <Text style={{ fontSize: 19, fontWeight: '800', color: c.text, letterSpacing: 0.2 }}>Verify It's You</Text>
                    <Text style={{ fontSize: 13, color: c.subtext, marginTop: 5, textAlign: 'center', lineHeight: 20 }}>
                        6-digit code sent to{'\n'}
                        <Text style={{ color: C.primary, fontWeight: '700' }}>{email?.trim()}</Text>
                    </Text>
                </View>
                <OTPRow digits={loginOtpDigits} setDigits={setLoginOtpDigits} refs={loginOtpRefs} error={otpError} isDark={isDark} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                    <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                    <View style={{ flex: 1.6 }}><Btn title="Verify" icon="checkmark-circle-outline" onPress={onVerifyOtp} loading={isLoading} /></View>
                </View>
                <Pressable onPress={onResend} disabled={isSendingOtp || resendCooldown > 0} style={{ alignItems: 'center', marginTop: 18, opacity: isSendingOtp || resendCooldown > 0 ? 0.4 : 1 }}>
                    {isSendingOtp ? <ActivityIndicator size="small" color={C.primary} /> : (
                        <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>
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
                        <Pressable onPress={() => setShowPwd(v => !v)} style={{ paddingRight: 14 }}>
                            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={19} color={c.placeholder} />
                        </Pressable>
                    }
                />
            </Animated.View>

            <Animated.View style={{ opacity: anims[2], transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Btn title="Sign In" icon="log-in-outline" onPress={onLogin} loading={isLoading} style={{ marginTop: 6 }} />
                <Pressable onPress={onGoSignup} style={{ alignItems: 'center', marginTop: 20, padding: 4 }}>
                    <Text style={{ color: c.subtext, fontSize: 14 }}>
                        New here? <Text style={{ color: C.primary, fontWeight: '800' }}>Create account</Text>
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
    const c = isDark ? C.dark : C.light;
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
        return { label: 'Strong', color: C.primary, pct: 1.0 };
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
                            <View style={{ paddingRight: 14 }}><ActivityIndicator size="small" color={c.placeholder} /></View>
                        ) : isEmailTaken ? (
                            <View style={{ paddingRight: 14 }}><Ionicons name="close-circle" size={18} color="#E05555" /></View>
                        ) : email.includes('@') ? (
                            <View style={{ paddingRight: 14 }}><Ionicons name="checkmark-circle" size={18} color={C.primary} /></View>
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
                        <Pressable onPress={() => setShowPwd(v => !v)} style={{ paddingRight: 14 }}>
                            <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={19} color={isDark ? C.dark.placeholder : C.light.placeholder} />
                        </Pressable>
                    }
                />
            </Animated.View>

            {strength && (
                <Animated.View style={{ marginBottom: 16, marginTop: -6, opacity: anims[3] }}>
                    <View style={{ height: 3, backgroundColor: isDark ? C.dark.divider : C.light.divider, borderRadius: 99, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${strength.pct * 100}%`, backgroundColor: strength.color, borderRadius: 99 }} />
                    </View>
                    <Text style={{ color: strength.color, fontSize: 11, fontWeight: '700', marginTop: 4 }}>{strength.label} password</Text>
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
    email, digits, setDigits, error, isDark,
    onVerify, onBack, isLoading, resendCooldown, isSendingOtp, onResend,
}) {
    const refs = useRef([null, null, null, null, null, null]);
    const c = isDark ? C.dark : C.light;
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
                    backgroundColor: isDark ? 'rgba(78,204,106,0.12)' : 'rgba(78,204,106,0.10)',
                    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                    borderWidth: 1.5, borderColor: 'rgba(78,204,106,0.28)',
                }}>
                    <Ionicons name="mail-open-outline" size={34} color={C.primary} />
                </Animated.View>
                <Text style={{ fontSize: 20, fontWeight: '800', color: c.text, marginBottom: 5, letterSpacing: 0.2 }}>Check your inbox</Text>
                <Text style={{ fontSize: 13, color: c.subtext, textAlign: 'center', lineHeight: 20 }}>
                    We sent a 6-digit code to
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.primary, marginTop: 2 }}>{email}</Text>
            </View>

            <OTPRow digits={digits} setDigits={setDigits} refs={refs} error={error} isDark={isDark} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 22 }}>
                <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                <View style={{ flex: 1.6 }}><Btn title="Verify Email" icon="shield-checkmark-outline" onPress={onVerify} loading={isLoading} /></View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 20 }}>
                <Pressable disabled={isSendingOtp || resendCooldown > 0} onPress={onResend} style={{ opacity: isSendingOtp || resendCooldown > 0 ? 0.4 : 1 }}>
                    {isSendingOtp
                        ? <ActivityIndicator size="small" color={C.primary} />
                        : <Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>
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
    const c = isDark ? C.dark : C.light;
    const { anims } = useStagger(4, { delay: 55, duration: 280 });

    return (
        <View>
            <Animated.View style={{ opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Label isDark={isDark}>Date of Birth</Label>
                <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={{
                        height: 50, borderRadius: 13, borderWidth: 1.5,
                        borderColor: errors.dob ? '#E05555' : c.inputBorder,
                        backgroundColor: c.inputBg, flexDirection: 'row', alignItems: 'center',
                        paddingHorizontal: 15, justifyContent: 'space-between',
                        marginBottom: errors.dob ? 2 : 14,
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="calendar-outline" size={17} color={dob ? c.text : c.placeholder} />
                        <Text style={{ color: dob ? c.text : c.placeholder, fontSize: 15 }}>{dob ? fmt(dob) : 'Select date of birth'}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={15} color={c.placeholder} />
                </Pressable>
                {errors.dob ? <Text style={{ color: '#E05555', fontSize: 11.5, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{errors.dob}</Text> : null}
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
                {errors.gender ? <Text style={{ color: '#E05555', fontSize: 11.5, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{errors.gender}</Text> : null}
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
    const c = isDark ? C.dark : C.light;
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
                    style={{ height: 50, borderRadius: 13, borderWidth: 1.5, borderColor: errors.bloodGroup ? '#E05555' : c.inputBorder, backgroundColor: c.inputBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, justifyContent: 'space-between', marginBottom: showBlood ? 8 : (errors.bloodGroup ? 2 : 14) }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Ionicons name="water-outline" size={17} color={bloodGroup ? C.primary : c.placeholder} />
                        <Text style={{ color: bloodGroup ? c.text : c.placeholder, fontSize: 15 }}>{bloodGroup || 'Select blood group'}</Text>
                    </View>
                    <Ionicons name={showBlood ? 'chevron-up' : 'chevron-down'} size={15} color={c.placeholder} />
                </Pressable>
                {errors.bloodGroup ? <Text style={{ color: '#E05555', fontSize: 11.5, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{errors.bloodGroup}</Text> : null}
                {showBlood && (
                    <View style={{ borderRadius: 13, borderWidth: 1.5, borderColor: c.inputBorder, backgroundColor: isDark ? C.dark.card : '#F8FDF9', marginBottom: 14, overflow: 'hidden' }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 }}>
                            {BLOOD_GROUPS.map(bg => {
                                const sel = bg === bloodGroup;
                                return (
                                    <Pressable key={bg} onPress={() => { setBloodGroup(bg); setShowBlood(false); }}
                                        style={{ paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, backgroundColor: sel ? C.primary : c.chip, borderWidth: 1.5, borderColor: sel ? C.primary : c.chipBorder }}>
                                        <Text style={{ color: sel ? '#fff' : c.subtext, fontWeight: '800', fontSize: 14 }}>{bg}</Text>
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

// ─── STEP 5 — Avatar ──────────────────────────────────────────────────────────
// Fixed: proper tile sizing using screen width
function AvatarTile({ avatarKey, selected, onPress, isDark, size }) {
    const scale = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(selected ? 1 : 0)).current;
    const c = isDark ? C.dark : C.light;

    useEffect(() => {
        Animated.spring(glow, { toValue: selected ? 1 : 0, friction: 5, useNativeDriver: false }).start();
    }, [selected]);

    const onIn = () => Animated.spring(scale, { toValue: 0.88, friction: 3, useNativeDriver: true }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();

    const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: [c.chipBorder, C.primary] });
    const bgColor = glow.interpolate({ inputRange: [0, 1], outputRange: [c.chip, 'rgba(78,204,106,0.15)'] });
    const shadowR = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 14] });
    const shadowO = glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] });

    return (
        <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress}>
            <Animated.View style={{
                transform: [{ scale }],
                width: size, height: size,
                shadowColor: C.primary, shadowRadius: shadowR,
                shadowOpacity: shadowO, shadowOffset: { width: 0, height: 4 },
                elevation: selected ? 8 : 0,
            }}>
                <Animated.View style={{
                    width: size, height: size, borderRadius: 18,
                    borderWidth: selected ? 2.5 : 1.5, borderColor,
                    backgroundColor: bgColor, overflow: 'hidden', padding: 5,
                }}>
                    <Image
                        source={getAvatarSource(avatarKey)}
                        style={{ flex: 1, width: '100%', height: '100%', borderRadius: 13 }}
                        resizeMode="cover"
                    />
                </Animated.View>
                {selected && (
                    <View style={{
                        position: 'absolute', top: -5, right: -5,
                        width: 20, height: 20, borderRadius: 10,
                        backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center',
                        shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
                    }}>
                        <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
}

export function Step5Avatar({ selectedAvatarKey, setSelectedAvatarKey, errors, isDark, onFinish, onBack, isLoading }) {
    const { width } = useWindowDimensions();
    const c = isDark ? C.dark : C.light;

    // 3 columns, accounting for card padding (24*2) and gaps (10*2)
    const COLS = 3;
    const PADDING = 48; // card padding left+right
    const GAP = 10;
    const tileSize = Math.floor((width * 0.94 - PADDING - GAP * (COLS - 1)) / COLS);

    const { anims } = useStagger(AVATAR_KEYS.length, { delay: 30, duration: 220 });

    return (
        <View>
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: c.text, letterSpacing: 0.2 }}>Pick your avatar</Text>
                <Text style={{ fontSize: 13, color: c.subtext, marginTop: 4 }}>This represents you in the app</Text>
                {errors.avatar ? <Text style={{ color: '#E05555', fontSize: 12, fontWeight: '600', marginTop: 8 }}>{errors.avatar}</Text> : null}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: tileSize * 4 + GAP * 3 + 20 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, justifyContent: 'flex-start', paddingBottom: 4 }}>
                    {AVATAR_KEYS.map((key, i) => (
                        <Animated.View
                            key={key}
                            style={{
                                opacity: anims[i],
                                transform: [{ scale: anims[i].interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
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
                    ))}
                </View>
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                <View style={{ flex: 1.6 }}><Btn title="Create Account" icon="checkmark-circle-outline" onPress={onFinish} loading={isLoading} /></View>
            </View>
        </View>
    );
}