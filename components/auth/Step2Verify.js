import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { OTPRow, GhostBtn, Btn } from '../../screens/AuthUI';
import { getStyles } from './AuthStyles';

export default function Step2Verify({
    email, otp, setOtp, error, isDark,
    onVerify, onBack, isLoading, resendCooldown, isSendingOtp, onResend,
}) {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    const iconAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(iconAnim, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }).start();
    }, []);

    const iconScale = iconAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

    return (
        <View>
            <View style={styles.centerHeader}>
                <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
                    <Ionicons name="mail-open-outline" size={34} color={colors.primary} />
                </Animated.View>
                <Text style={styles.headerTitle}>Check your inbox</Text>
                <Text style={styles.headerSubtitle}>
                    We sent a 6-digit code to
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primary, marginTop: 2 }}>{email}</Text>
            </View>

            <OTPRow value={otp} onChangeText={setOtp} error={error} isDark={isDark} />

            <View style={styles.buttonRow}>
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
