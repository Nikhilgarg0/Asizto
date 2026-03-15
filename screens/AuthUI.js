// AuthUI.js — ASIZTO · Design System + UI Primitives
// screens/AuthUI.js
import React, { useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, Pressable,
    Animated, Easing, ActivityIndicator, StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (_) { }

const haptic = (style = 'Light') => {
    try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle[style]); } catch (_) { }
};

// ─── Design Tokens ─────────────────────────────────────────────────────────────
export const C = {
    primary: '#4ECC6A',
    p2: '#38B855',
    p3: '#2DA048',
    glow: 'rgba(78,204,106,0.22)',
    mint: '#34D9A0',

    dark: {
        bg: '#060E0A',
        card: '#0D1C13',
        inputBg: 'rgba(255,255,255,0.04)',
        inputBorder: 'rgba(78,204,106,0.16)',
        inputFocused: 'rgba(78,204,106,0.65)',
        text: '#E2F5E8',
        subtext: '#6B9E7A',
        placeholder: '#3D6B4A',
        divider: 'rgba(78,204,106,0.10)',
        chip: 'rgba(78,204,106,0.08)',
        chipBorder: 'rgba(78,204,106,0.20)',
        surface: 'rgba(20,40,28,0.90)',
        cardBorder: 'rgba(78,204,106,0.12)',
    },
    light: {
        bg: '#EDF7F0',
        card: '#FFFFFF',
        inputBg: 'rgba(0,0,0,0.025)',
        inputBorder: 'rgba(78,204,106,0.25)',
        inputFocused: '#4ECC6A',
        text: '#0F2016',
        subtext: '#3E6E4C',
        placeholder: '#7FAD8A',
        divider: 'rgba(78,204,106,0.12)',
        chip: 'rgba(78,204,106,0.08)',
        chipBorder: 'rgba(78,204,106,0.28)',
        surface: 'rgba(255,255,255,0.92)',
        cardBorder: 'rgba(78,204,106,0.18)',
    },
};

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Arthritis'];
export const HABITS = ['no', 'occasionally', 'daily'];
export const HABIT_LABELS = { no: 'No', occasionally: 'Sometimes', daily: 'Daily' };
export const AVATAR_KEYS = [
    'male1', 'male2', 'male3', 'male4', 'male5', 'male6',
    'female1', 'female2', 'female3', 'female4', 'female5', 'female6',
];

export function getAvatarSource(key) {
    const map = {
        male1: require('../assets/avatars/male1.png'),
        male2: require('../assets/avatars/male2.png'),
        male3: require('../assets/avatars/male3.png'),
        male4: require('../assets/avatars/male4.png'),
        male5: require('../assets/avatars/male5.png'),
        male6: require('../assets/avatars/male6.png'),
        female1: require('../assets/avatars/female1.png'),
        female2: require('../assets/avatars/female2.png'),
        female3: require('../assets/avatars/female3.png'),
        female4: require('../assets/avatars/female4.png'),
        female5: require('../assets/avatars/female5.png'),
        female6: require('../assets/avatars/female6.png'),
    };
    return map[key] ?? map.male1;
}

// ─── Stagger animation hook ─────────────────────────────────────────────────
// Returns an array of animated values that stagger in when triggered
export function useStagger(count, { delay = 60, duration = 320, auto = true } = {}) {
    const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;

    const play = useCallback((reverse = false) => {
        const animations = anims.map((a, i) =>
            Animated.timing(a, {
                toValue: reverse ? 0 : 1,
                duration,
                delay: i * delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            })
        );
        Animated.stagger(delay, animations).start();
    }, []);

    useEffect(() => { if (auto) play(); }, []);

    return { anims, play };
}

// ─── Ambient floating blob ──────────────────────────────────────────────────
export const Blob = ({ size, color = C.primary, x, y, dx = 50, dy = 40, dur = 14000, delay = 0, opacity = 0.07 }) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(a, { toValue: 1, duration: dur, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
            Animated.timing(a, { toValue: 0, duration: dur, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: true }),
        ]));
        const t = setTimeout(() => loop.start(), delay);
        return () => { clearTimeout(t); loop.stop(); };
    }, []);
    const tx = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [x - dx, x + dx, x - dx] });
    const ty = a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [y - dy, y + dy, y - dy] });
    return (
        <Animated.View pointerEvents="none" style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2,
            backgroundColor: color, opacity,
            transform: [{ translateX: tx }, { translateY: ty }],
        }} />
    );
};

// ─── Glowing progress stepper ─────────────────────────────────────────────────
export const ProgressStepper = ({ step, total = 5, isDark }) => {
    const prog = useRef(new Animated.Value(step / total)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const c = isDark ? C.dark : C.light;
    const LABELS = ['Account', 'Verify', 'Details', 'Health', 'Avatar'];

    useEffect(() => {
        Animated.spring(prog, { toValue: step / total, tension: 60, friction: 10, useNativeDriver: false }).start();
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [step]);

    const barW = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.0] });

    return (
        <View style={{ marginBottom: 22 }}>
            {/* Bar */}
            <View style={{ height: 5, backgroundColor: c.divider, borderRadius: 99, overflow: 'hidden' }}>
                <Animated.View style={{ width: barW, height: '100%', borderRadius: 99, overflow: 'hidden' }}>
                    <LinearGradient colors={[C.mint, C.primary, C.p2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.mint, opacity: glow }]} />
                </Animated.View>
            </View>
            {/* Labels */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
                {LABELS.map((label, i) => {
                    const active = i + 1 === step;
                    const done = i + 1 < step;
                    return (
                        <View key={label} style={{ alignItems: 'center' }}>
                            <Text style={{
                                fontSize: 9, fontWeight: active ? '800' : done ? '600' : '400',
                                color: active ? C.primary : done ? C.p2 : c.placeholder,
                                letterSpacing: 0.5,
                            }}>{label}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

// ─── Animated input field ─────────────────────────────────────────────────────
export const Field = ({
    label, value, onChangeText, placeholder, keyboardType = 'default',
    secureTextEntry, error, right, isDark, autoCapitalize = 'none',
    maxLength, multiline, returnKeyType, onSubmitEditing, fref, prefix,
    autoComplete = 'off', style, animValue,
}) => {
    const focused = useRef(new Animated.Value(0)).current;
    const c = isDark ? C.dark : C.light;

    const onFocus = () => Animated.spring(focused, { toValue: 1, friction: 5, useNativeDriver: false }).start();
    const onBlur = () => Animated.spring(focused, { toValue: 0, friction: 5, useNativeDriver: false }).start();

    const border = focused.interpolate({ inputRange: [0, 1], outputRange: [error ? '#E05555' : c.inputBorder, error ? '#E05555' : c.inputFocused] });
    const bg = focused.interpolate({ inputRange: [0, 1], outputRange: [c.inputBg, isDark ? 'rgba(78,204,106,0.07)' : 'rgba(78,204,106,0.05)'] });
    const shadow = focused.interpolate({ inputRange: [0, 1], outputRange: [0, isDark ? 8 : 4] });

    const wrapper = animValue ? {
        opacity: animValue,
        transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
    } : {};

    return (
        <Animated.View style={[{ marginBottom: error ? 2 : 14 }, wrapper, style]}>
            {label ? (
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.subtext, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }}>
                    {label}
                </Text>
            ) : null}
            <Animated.View style={{
                flexDirection: 'row', alignItems: 'center',
                borderRadius: 13, borderWidth: 1.5, borderColor: border,
                backgroundColor: bg, overflow: 'hidden',
                minHeight: multiline ? 88 : 50,
                shadowColor: C.primary, shadowRadius: shadow,
                shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5,
                elevation: 0,
            }}>
                {prefix ? (
                    <View style={{ paddingLeft: 14, paddingRight: 3 }}>
                        <Text style={{ color: c.text, fontWeight: '800', fontSize: 15 }}>{prefix}</Text>
                    </View>
                ) : null}
                <TextInput
                    ref={fref}
                    style={{
                        flex: 1, paddingHorizontal: prefix ? 6 : 15,
                        paddingVertical: multiline ? 13 : 0,
                        fontSize: 15, color: c.text,
                        height: multiline ? undefined : 50,
                        textAlignVertical: multiline ? 'top' : 'center',
                    }}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={c.placeholder}
                    keyboardType={keyboardType}
                    secureTextEntry={secureTextEntry}
                    autoCapitalize={autoCapitalize}
                    maxLength={maxLength}
                    multiline={multiline}
                    returnKeyType={returnKeyType}
                    onSubmitEditing={onSubmitEditing}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    autoComplete={autoComplete}
                    importantForAutofill="no"
                    textContentType="none"
                />
                {right}
            </Animated.View>
            {error ? <Text style={{ color: '#E05555', fontSize: 11.5, fontWeight: '600', marginTop: 4, marginBottom: 10, marginLeft: 2 }}>{error}</Text> : null}
        </Animated.View>
    );
};

// ─── Primary CTA button ───────────────────────────────────────────────────────
export const Btn = ({ title, onPress, loading, disabled, icon, style, small }) => {
    const scale = useRef(new Animated.Value(1)).current;
    const glow = useRef(new Animated.Value(0)).current;
    const isOff = disabled || loading;

    const onIn = () => {
        haptic('Medium');
        Animated.parallel([
            Animated.spring(scale, { toValue: 0.955, friction: 3, useNativeDriver: true }),
            Animated.timing(glow, { toValue: 1, duration: 150, useNativeDriver: false }),
        ]).start();
    };
    const onOut = () => Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();

    const elevation = glow.interpolate({ inputRange: [0, 1], outputRange: [6, 18] });
    const shadowR = glow.interpolate({ inputRange: [0, 1], outputRange: [10, 22] });

    return (
        <Pressable onPressIn={onIn} onPressOut={onOut} onPress={isOff ? null : onPress} style={[style]}>
            <Animated.View style={{ transform: [{ scale }] }}>
                <Animated.View style={{ borderRadius: 15, shadowColor: C.primary, shadowOpacity: isOff ? 0 : 0.55, shadowRadius: shadowR, shadowOffset: { width: 0, height: 5 }, elevation }}>
                    <LinearGradient
                        colors={isOff ? ['#1E3A24', '#162A1B'] : ['#5EE07A', '#4ECC6A', '#38B855']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={{
                            height: small ? 44 : 54, borderRadius: 15,
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {loading
                            ? <ActivityIndicator color="#fff" size="small" />
                            : <>
                                {icon && <Ionicons name={icon} size={small ? 16 : 18} color="#fff" />}
                                <Text style={{ color: '#fff', fontSize: small ? 14 : 16, fontWeight: '800', letterSpacing: 0.4 }}>{title}</Text>
                            </>
                        }
                    </LinearGradient>
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
};

// ─── Ghost outline button ─────────────────────────────────────────────────────
export const GhostBtn = ({ title, onPress, icon, isDark, style, small }) => {
    const c = isDark ? C.dark : C.light;
    const scale = useRef(new Animated.Value(1)).current;
    const onIn = () => Animated.spring(scale, { toValue: 0.96, friction: 3, useNativeDriver: true }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    return (
        <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress} style={style}>
            <Animated.View style={{
                transform: [{ scale }],
                height: small ? 44 : 54, borderRadius: 15, borderWidth: 1.5,
                borderColor: c.chipBorder, alignItems: 'center',
                justifyContent: 'center', flexDirection: 'row', gap: 6,
            }}>
                {icon && <Ionicons name={icon} size={small ? 14 : 16} color={c.subtext} />}
                <Text style={{ color: c.subtext, fontSize: small ? 13 : 15, fontWeight: '600' }}>{title}</Text>
            </Animated.View>
        </Pressable>
    );
};

// ─── Pill group ───────────────────────────────────────────────────────────────
export const Pills = ({ options, selected, onSelect, isDark }) => {
    const c = isDark ? C.dark : C.light;
    return (
        <View style={{ flexDirection: 'row', gap: 9 }}>
            {options.map(({ value, label }) => {
                const sel = selected === value;
                return (
                    <Pressable key={value} onPress={() => { haptic(); onSelect(value); }} style={{ flex: 1 }}>
                        {sel ? (
                            <LinearGradient colors={['#5EE07A', '#38B855']} style={{ paddingVertical: 11, borderRadius: 12, alignItems: 'center', shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{label}</Text>
                            </LinearGradient>
                        ) : (
                            <View style={{ paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: c.chipBorder, backgroundColor: c.chip }}>
                                <Text style={{ color: c.subtext, fontWeight: '600', fontSize: 13 }}>{label}</Text>
                            </View>
                        )}
                    </Pressable>
                );
            })}
        </View>
    );
};

// ─── Gender selector ──────────────────────────────────────────────────────────
export const GenderPicker = ({ selected, onSelect, isDark }) => {
    const c = isDark ? C.dark : C.light;
    const opts = [
        { value: 'male', label: 'Male', icon: 'male' },
        { value: 'female', label: 'Female', icon: 'female' },
        { value: 'other', label: 'Other', icon: 'transgender' },
    ];
    return (
        <View style={{ flexDirection: 'row', gap: 9 }}>
            {opts.map(({ value, label, icon }) => {
                const sel = selected === value;
                const scale = useRef(new Animated.Value(1)).current;
                const onIn = () => Animated.spring(scale, { toValue: 0.94, friction: 3, useNativeDriver: true }).start();
                const onOut = () => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
                return (
                    <Pressable key={value} onPressIn={onIn} onPressOut={onOut} onPress={() => { haptic(); onSelect(value); }} style={{ flex: 1 }}>
                        <Animated.View style={{ transform: [{ scale }] }}>
                            {sel ? (
                                <LinearGradient colors={['#5EE07A', '#38B855']} style={{ padding: 13, borderRadius: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, shadowColor: C.primary, shadowOpacity: 0.35, shadowRadius: 12, elevation: 7 }}>
                                    <Ionicons name={icon} size={17} color="#fff" />
                                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{label}</Text>
                                </LinearGradient>
                            ) : (
                                <View style={{ padding: 13, borderRadius: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: c.chipBorder, backgroundColor: c.chip }}>
                                    <Ionicons name={icon} size={17} color={c.placeholder} />
                                    <Text style={{ color: c.subtext, fontWeight: '600', fontSize: 13 }}>{label}</Text>
                                </View>
                            )}
                        </Animated.View>
                    </Pressable>
                );
            })}
        </View>
    );
};

// ─── Condition chip ───────────────────────────────────────────────────────────
export const Chip = ({ label, selected, onPress, isDark }) => {
    const c = isDark ? C.dark : C.light;
    const s = useRef(new Animated.Value(1)).current;
    const onIn = () => Animated.spring(s, { toValue: 0.91, friction: 3, useNativeDriver: true }).start();
    const onOut = () => Animated.spring(s, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    return (
        <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress}>
            <Animated.View style={{ transform: [{ scale: s }] }}>
                {selected ? (
                    <LinearGradient colors={['#5EE07A', '#38B855']} style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="checkmark" size={11} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12.5, fontWeight: '800' }}>{label}</Text>
                    </LinearGradient>
                ) : (
                    <View style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: c.chipBorder, backgroundColor: c.chip, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="add" size={11} color={C.primary} />
                        <Text style={{ color: C.primary, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
};

// ─── OTP boxes ────────────────────────────────────────────────────────────────
export const OTPRow = ({ digits, setDigits, refs, error, isDark }) => {
    const c = isDark ? C.dark : C.light;
    const scales = useRef(digits.map(() => new Animated.Value(1))).current;

    const pop = (i) => {
        Animated.sequence([
            Animated.spring(scales[i], { toValue: 1.18, friction: 3, useNativeDriver: true }),
            Animated.spring(scales[i], { toValue: 1, friction: 3, useNativeDriver: true }),
        ]).start();
    };

    return (
        <View>
            <View style={{ flexDirection: 'row', gap: 9, marginBottom: 4 }}>
                {digits.map((d, i) => (
                    <Animated.View key={i} style={{ flex: 1, transform: [{ scale: scales[i] }] }}>
                        <TextInput
                            ref={r => (refs.current[i] = r)}
                            style={{
                                height: 56, borderRadius: 13, textAlign: 'center',
                                fontSize: 24, fontWeight: '800', color: c.text,
                                backgroundColor: d ? (isDark ? 'rgba(78,204,106,0.10)' : 'rgba(78,204,106,0.08)') : c.inputBg,
                                borderWidth: 2,
                                borderColor: d ? C.primary : c.inputBorder,
                            }}
                            keyboardType="number-pad"
                            maxLength={1}
                            value={d}
                            autoComplete="off"
                            importantForAutofill="no"
                            textContentType="none"
                            onChangeText={t => {
                                const v = t.replace(/\D/g, '');
                                const next = [...digits]; next[i] = v; setDigits(next);
                                if (v) { pop(i); haptic(); }
                                if (v && i < 5) setTimeout(() => refs.current[i + 1]?.focus(), 35);
                            }}
                            onKeyPress={({ nativeEvent: { key } }) => {
                                if (key === 'Backspace' && !digits[i] && i > 0)
                                    setTimeout(() => refs.current[i - 1]?.focus(), 35);
                            }}
                        />
                    </Animated.View>
                ))}
            </View>
            {error ? <Text style={{ color: '#E05555', fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 2 }}>{error}</Text> : null}
        </View>
    );
};

// ─── Status banner ────────────────────────────────────────────────────────────
export const Banner = ({ type, message, onClose, isDark }) => {
    const ty = useRef(new Animated.Value(-20)).current;
    const op = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.parallel([
            Animated.spring(ty, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
            Animated.timing(op, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start();
    }, []);
    if (!message) return null;
    const isE = type === 'error';
    const bg = isE ? (isDark ? 'rgba(224,85,85,0.14)' : 'rgba(255,230,230,1)') : (isDark ? 'rgba(78,204,106,0.13)' : 'rgba(230,255,238,1)');
    const bd = isE ? (isDark ? 'rgba(224,85,85,0.28)' : 'rgba(255,180,180,0.7)') : (isDark ? 'rgba(78,204,106,0.28)' : 'rgba(78,204,106,0.3)');
    const tc = isE ? (isDark ? '#FFB0B0' : '#8B1A1A') : (isDark ? '#8AF3C5' : '#1A5C2D');
    return (
        <Animated.View style={{ transform: [{ translateY: ty }], opacity: op, backgroundColor: bg, borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: bd }}>
            <Ionicons name={isE ? 'alert-circle' : 'checkmark-circle'} size={17} color={isE ? '#E05555' : C.primary} style={{ marginRight: 8 }} />
            <Text style={{ color: tc, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 }}>{message}</Text>
            {onClose && <Pressable onPress={onClose} style={{ padding: 4, marginLeft: 4 }}><Ionicons name="close" size={15} color={tc} /></Pressable>}
        </Animated.View>
    );
};

// ─── Label ────────────────────────────────────────────────────────────────────
export const Label = ({ children, isDark, style }) => (
    <Text style={[{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: isDark ? C.dark.subtext : C.light.subtext, marginBottom: 7 }, style]}>
        {children}
    </Text>
);