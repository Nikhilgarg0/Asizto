import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, Pressable, Image, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
    AVATAR_KEYS, AVATAR_KEYS_BY_GENDER, getAvatarSource,
    GhostBtn, Btn, useStagger
} from '../../screens/AuthUI';
import { getStyles } from './AuthStyles';

// ─── AVATAR TILE (Declared at module level to avoid dynamic component issues) ───
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

export default function Step5Avatar({ selectedAvatarKey, setSelectedAvatarKey, gender, errors, isDark, onFinish, onBack, isLoading }) {
    const { width } = useWindowDimensions();
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);

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
            <View style={styles.avatarHeader}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 0.2 }}>Pick your avatar</Text>
                <Text style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>This represents you in the app</Text>
                <View style={styles.avatarBadge}>
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
