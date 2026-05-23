import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Btn, GhostBtn, OTPRow, Field, Label, useStagger } from '../../screens/AuthUI';
import { getStyles } from './AuthStyles';

export default function LoginView({
    email, setEmail, password, setPassword,
    loginStep, loginOtp, setLoginOtp,
    otpError, resendCooldown, isSendingOtp,
    errors, isDark, onLogin, isLoading,
    onVerifyOtp, onBack, onResend, onGoSignup,
}) {
    const [showPwd, setShowPwd] = useState(false);
    const pwdRef = useRef(null);
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    const { anims } = useStagger(3, { delay: 55, duration: 300 });

    if (loginStep === 'otp') {
        return (
            <View>
                <View style={styles.centerHeader}>
                    <View style={styles.iconContainerSmall}>
                        <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
                    </View>
                    <Text style={styles.headerTitleSmall}>Verify It's You</Text>
                    <Text style={[styles.headerSubtitle, { marginTop: 5 }]}>
                        6-digit code sent to{'\n'}
                        <Text style={{ color: colors.primary, fontWeight: '700' }}>{email?.trim()}</Text>
                    </Text>
                </View>
                <OTPRow value={loginOtp} onChangeText={setLoginOtp} error={otpError} isDark={isDark} />
                <View style={styles.buttonRowSmall}>
                    <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                    <View style={{ flex: 1.6 }}><Btn title="Verify" icon="checkmark-circle-outline" onPress={onVerifyOtp} loading={isLoading} /></View>
                </View>
                <Pressable onPress={onResend} disabled={isSendingOtp || resendCooldown > 0} style={[styles.resendBtnWrapperSmall, { opacity: isSendingOtp || resendCooldown > 0 ? 0.4 : 1 }]} accessibilityLabel="Resend OTP" accessibilityRole="button">
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
