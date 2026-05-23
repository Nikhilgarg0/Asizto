import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Field, Btn, Label, useStagger } from '../../screens/AuthUI';
import { getStyles } from './AuthStyles';

export default function Step1Account({
    firstName, setFirstName, lastName, setLastName,
    email, setEmail, password, setPassword,
    acceptedTerms, setAcceptedTerms,
    errors, isDark, onNext, isCheckingEmail, isEmailTaken,
}) {
    const [showPwd, setShowPwd] = useState(false);
    const lastRef = useRef(null), emailRef = useRef(null), pwdRef = useRef(null);
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
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
                <View style={styles.gridRow}>
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

            <Animated.View style={[styles.termsRow, { marginBottom: errors.terms ? 6 : 16, opacity: anims[4] || 1 }]}>
                <Pressable
                    onPress={() => {
                        setAcceptedTerms(!acceptedTerms);
                    }}
                    style={[styles.checkbox, {
                        borderColor: errors.terms ? '#E05555' : acceptedTerms ? colors.primary : colors.subtext,
                        backgroundColor: acceptedTerms ? `${colors.primary}15` : 'transparent',
                    }]}
                    accessibilityLabel="Accept Terms and Conditions"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: acceptedTerms }}
                >
                    {acceptedTerms && <Ionicons name="checkmark" size={15} color={colors.primary} />}
                </Pressable>
                <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text
                        onPress={() => Linking.openURL('https://asizto.nikhilcodes.in/docs/terms-and-conditions')}
                        style={{ color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                    >
                        Terms & Conditions
                    </Text>
                </Text>
            </Animated.View>
            {errors.terms ? (
                <Text style={{ color: '#E05555', fontSize: 12, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>
                    {errors.terms}
                </Text>
            ) : null}

            <Animated.View style={{ opacity: anims[4], transform: [{ translateY: anims[4].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Btn title="Continue" icon="arrow-forward" onPress={onNext} style={{ marginTop: 4 }} />
            </Animated.View>
        </View>
    );
}
