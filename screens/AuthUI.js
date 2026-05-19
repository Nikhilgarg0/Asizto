import React, { useRef, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, Pressable,
    Animated, Easing, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (_) { }

const haptic = (style = 'Light') => {
    try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle[style]); } catch (_) { }
};


export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const CONDITIONS = ['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Arthritis'];
export const HABITS = ['no', 'occasionally', 'daily'];
export const HABIT_LABELS = { no: 'No', occasionally: 'Sometimes', daily: 'Daily' };
export const AVATAR_KEYS = [
    'male1', 'male2', 'male3', 'male4', 'male5', 'male6',
    'female1', 'female2', 'female3', 'female4', 'female5', 'female6',
];

export const AVATAR_KEYS_BY_GENDER = {
    male:   ['male1', 'male2', 'male3', 'male4', 'male5', 'male6'],
    female: ['female1', 'female2', 'female3', 'female4', 'female5', 'female6'],
    other:  ['male1', 'male2', 'male3', 'male4', 'male5', 'male6',
             'female1', 'female2', 'female3', 'female4', 'female5', 'female6'],
};

export function getAvatarSource(key) {
    const map = {
        male1:   require('../assets/avatars/male1.webp'),
        male2:   require('../assets/avatars/male2.webp'),
        male3:   require('../assets/avatars/male3.webp'),
        male4:   require('../assets/avatars/male4.webp'),
        male5:   require('../assets/avatars/male5.webp'),
        male6:   require('../assets/avatars/male6.webp'),
        female1: require('../assets/avatars/female1.webp'),
        female2: require('../assets/avatars/female2.webp'),
        female3: require('../assets/avatars/female3.webp'),
        female4: require('../assets/avatars/female4.webp'),
        female5: require('../assets/avatars/female5.webp'),
        female6: require('../assets/avatars/female6.webp'),
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
export const Blob = ({ size, color, x, y, dx = 50, dy = 40, dur = 14000, delay = 0, opacity = 0.05 }) => {
    const { colors } = useTheme();
    const blobColor = color || colors.primary;
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
            backgroundColor: blobColor, opacity,
            transform: [{ translateX: tx }, { translateY: ty }],
        }} />
    );
};

// ─── Glowing progress stepper ─────────────────────────────────────────────────
export const ProgressStepper = ({ step, total = 5, isDark }) => {
    const prog = useRef(new Animated.Value(step / total)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const { colors } = useTheme();
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
            <View style={{ height: 5, backgroundColor: colors.border, borderRadius: 99, overflow: 'hidden' }}>
                <Animated.View style={{ width: barW, height: '100%', borderRadius: 99, overflow: 'hidden', backgroundColor: colors.primary }} />
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
                                color: active ? colors.primary : done ? colors.primary + '99' : colors.subtext,
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
    const { colors, theme } = useTheme();

    const onFocus = () => Animated.spring(focused, { toValue: 1, friction: 5, useNativeDriver: false }).start();
    const onBlur = () => Animated.spring(focused, { toValue: 0, friction: 5, useNativeDriver: false }).start();

    const border = focused.interpolate({ inputRange: [0, 1], outputRange: [error ? '#E05555' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', error ? '#E05555' : theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#111111'] });
    const bg = focused.interpolate({ inputRange: [0, 1], outputRange: [theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'] });
    const shadow = focused.interpolate({ inputRange: [0, 1], outputRange: [0, isDark ? 8 : 4] });

    const wrapper = animValue ? {
        opacity: animValue,
        transform: [{ translateY: animValue.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
    } : {};

    return (
        <Animated.View style={[{ marginBottom: error ? 2 : 14 }, wrapper, style]}>
            {label ? (
                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.subtext, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 7 }}>
                    {label}
                </Text>
            ) : null}
            <Animated.View style={{
                flexDirection: 'row', alignItems: 'center',
                borderRadius: 13, borderWidth: 1.5, borderColor: border,
                backgroundColor: bg, overflow: 'hidden',
                minHeight: multiline ? 88 : 50,
                shadowColor: colors.primary, shadowRadius: shadow,
                shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5,
                elevation: 0,
            }}>
                {prefix ? (
                    <View style={{ paddingLeft: 14, paddingRight: 3 }}>
                        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 15 }}>{prefix}</Text>
                    </View>
                ) : null}
                <TextInput
                    ref={fref}
                    style={{
                        flex: 1, paddingHorizontal: prefix ? 6 : 15,
                        paddingVertical: multiline ? 13 : 0,
                        fontSize: 15, color: colors.text,
                        height: multiline ? undefined : 50,
                        textAlignVertical: multiline ? 'top' : 'center',
                    }}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.subtext}
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
    const { colors } = useTheme();
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
                <Animated.View style={{ borderRadius: 15, shadowColor: colors.primary, shadowOpacity: isOff ? 0 : 0.4, shadowRadius: shadowR, shadowOffset: { width: 0, height: 5 }, elevation }}>
                    <View
                        style={{
                            height: small ? 44 : 54, borderRadius: 15,
                            backgroundColor: isOff ? colors.card : colors.primary,
                            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {loading
                            ? <ActivityIndicator color={colors.background} size="small" />
                            : <>
                                {icon && <Ionicons name={icon} size={small ? 16 : 18} color={colors.background} />}
                                <Text style={{ color: colors.background, fontSize: small ? 14 : 16, fontWeight: '800', letterSpacing: 0.4 }}>{title}</Text>
                            </>
                        }
                    </View>
                </Animated.View>
            </Animated.View>
        </Pressable>
    );
};

// ─── Ghost outline button ─────────────────────────────────────────────────────
export const GhostBtn = ({ title, onPress, icon, isDark, style, small }) => {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;
    const onIn = () => Animated.spring(scale, { toValue: 0.96, friction: 3, useNativeDriver: true }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    return (
        <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress} style={style}>
            <Animated.View style={{
                transform: [{ scale }],
                height: small ? 44 : 54, borderRadius: 15, borderWidth: 1.5,
                borderColor: colors.border, alignItems: 'center',
                justifyContent: 'center', flexDirection: 'row', gap: 6,
            }}>
                {icon && <Ionicons name={icon} size={small ? 14 : 16} color={colors.subtext} />}
                <Text style={{ color: colors.subtext, fontSize: small ? 13 : 15, fontWeight: '600' }}>{title}</Text>
            </Animated.View>
        </Pressable>
    );
};

// ─── Pill group ───────────────────────────────────────────────────────────────
export const Pills = ({ options, selected, onSelect, isDark }) => {
    const { colors } = useTheme();
    return (
        <View style={{ flexDirection: 'row', gap: 9 }}>
            {options.map(({ value, label }) => {
                const sel = selected === value;
                return (
                    <Pressable key={value} onPress={() => { haptic(); onSelect(value); }} style={{ flex: 1 }}>
                        {sel ? (
                            <View style={{ paddingVertical: 11, borderRadius: 12, alignItems: 'center', backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
                                <Text style={{ color: colors.background, fontWeight: '800', fontSize: 13 }}>{label}</Text>
                            </View>
                        ) : (
                            <View style={{ paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card }}>
                                <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 13 }}>{label}</Text>
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
    const { colors } = useTheme();
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
                                <View style={{ padding: 13, borderRadius: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.2, shadowRadius: 12, elevation: 7 }}>
                                    <Ionicons name={icon} size={17} color={colors.background} />
                                    <Text style={{ color: colors.background, fontWeight: '800', fontSize: 13 }}>{label}</Text>
                                </View>
                            ) : (
                                <View style={{ padding: 13, borderRadius: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card }}>
                                    <Ionicons name={icon} size={17} color={colors.subtext} />
                                    <Text style={{ color: colors.subtext, fontWeight: '600', fontSize: 13 }}>{label}</Text>
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
    const { colors } = useTheme();
    const s = useRef(new Animated.Value(1)).current;
    const onIn = () => Animated.spring(s, { toValue: 0.91, friction: 3, useNativeDriver: true }).start();
    const onOut = () => Animated.spring(s, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    return (
        <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress}>
            <Animated.View style={{ transform: [{ scale: s }] }}>
                {selected ? (
                    <View style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.primary }}>
                        <Ionicons name="checkmark" size={11} color={colors.background} />
                        <Text style={{ color: colors.background, fontSize: 12.5, fontWeight: '800' }}>{label}</Text>
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="add" size={11} color={colors.text} />
                        <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }}>{label}</Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
};

// ─── OTP single input ─────────────────────────────────────────────────────────
export const OTPRow = ({ value, onChangeText, error, isDark, inputRef }) => {
    const { colors, theme } = useTheme();
    const focused = useRef(new Animated.Value(0)).current;

    const onFocus = () => Animated.spring(focused, { toValue: 1, friction: 5, useNativeDriver: false }).start();
    const onBlur  = () => Animated.spring(focused, { toValue: 0, friction: 5, useNativeDriver: false }).start();

    const borderColor = focused.interpolate({
        inputRange: [0, 1],
        outputRange: [error ? '#E05555' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', error ? '#E05555' : theme === 'dark' ? 'rgba(255,255,255,0.4)' : '#111111'],
    });

    return (
        <View>
            <Animated.View style={{
                borderRadius: 13, borderWidth: 1.5, borderColor,
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                height: 56, flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 18,
            }}>
                <TextInput
                    ref={inputRef}
                    style={{
                        flex: 1, fontSize: 22, fontWeight: '700',
                        color: colors.text, letterSpacing: 10, textAlign: 'center',
                    }}
                    value={value}
                    onChangeText={t => {
                        haptic();
                        onChangeText(t.replace(/\D/g, '').slice(0, 6));
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    placeholder="••••••"
                    placeholderTextColor={colors.subtext}
                    onFocus={onFocus}
                    onBlur={onBlur}
                />
            </Animated.View>
            {error ? <Text style={{ color: '#E05555', fontSize: 12, fontWeight: '600', marginTop: 6, marginLeft: 2 }}>{error}</Text> : null}
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
    const { colors } = useTheme();
    const bg = isE ? (isDark ? 'rgba(224,85,85,0.14)' : 'rgba(255,230,230,1)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)');
    const bd = isE ? (isDark ? 'rgba(224,85,85,0.28)' : 'rgba(255,180,180,0.7)') : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)');
    const tc = isE ? (isDark ? '#FFB0B0' : '#8B1A1A') : colors.text;
    return (
        <Animated.View style={{ transform: [{ translateY: ty }], opacity: op, backgroundColor: bg, borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: bd }}>
            <Ionicons name={isE ? 'alert-circle' : 'checkmark-circle'} size={17} color={isE ? '#E05555' : colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ color: tc, flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 }}>{message}</Text>
            {onClose && <Pressable onPress={onClose} style={{ padding: 4, marginLeft: 4 }}><Ionicons name="close" size={15} color={tc} /></Pressable>}
        </Animated.View>
    );
};

// ─── Label ────────────────────────────────────────────────────────────────────
export const Label = ({ children, isDark, style }) => {
    const { colors } = useTheme();
    return (
    <Text style={[{ fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: colors.subtext, marginBottom: 7 }, style]}>
        {children}
    </Text>
);
};

export const makeAuthStyles = (colors, spacing, radius, fontSize) => StyleSheet.create({
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.subtext,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  inputBase: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  inputText: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 0,
  },
  primaryButton: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  secondaryButton: {
    height: 54,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  chipSelected: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  chipUnselected: {
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  chipText: {
    fontWeight: '500',
    fontSize: fontSize.sm,
  },
  errorText: {
    color: '#E05555',
    fontSize: fontSize.xs,
    fontWeight: '500',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    marginLeft: 2,
  },
  bannerContainer: {
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1.5,
  },
  bannerText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
    lineHeight: 18,
  },
});