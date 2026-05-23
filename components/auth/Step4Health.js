import React, { useState, useRef } from 'react';
import { View, Text, Pressable, Animated, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import {
    BLOOD_GROUPS, CONDITIONS, HABITS, HABIT_LABELS,
    Field, Btn, GhostBtn, Pills, Label, useStagger
} from '../../screens/AuthUI';
import { getStyles } from './AuthStyles';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (_) { }

const haptic = (style = 'Light') => {
    try { Haptics?.impactAsync(Haptics.ImpactFeedbackStyle[style]); } catch (_) { }
};

// ─── MEDICAL CHIP FOR PREMIUM SELECTOR (Declared at module level to avoid unmounting bugs) ───
function MedicalChip({ label, selected, isCustom, onPress, isDark }) {
    const { colors } = useTheme();
    const scale = useRef(new Animated.Value(1)).current;
    
    const onIn = () => Animated.spring(scale, { toValue: 0.93, friction: 3, useNativeDriver: true }).start();
    const onOut = () => Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
    
    return (
        <Pressable onPressIn={onIn} onPressOut={onOut} onPress={onPress}>
            <Animated.View style={{ transform: [{ scale }] }}>
                {selected ? (
                    <View style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 20,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: isCustom ? `${colors.primary}18` : colors.primary,
                        borderWidth: 1.5,
                        borderColor: colors.primary,
                    }}>
                        <Ionicons 
                            name={isCustom ? "close" : "checkmark"} 
                            size={13} 
                            color={isCustom ? colors.primary : colors.background} 
                        />
                        <Text style={{ 
                            color: isCustom ? colors.text : colors.background, 
                            fontSize: 13, 
                            fontWeight: '700' 
                        }}>{label}</Text>
                    </View>
                ) : (
                    <View style={{
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <Ionicons name="add" size={13} color={colors.subtext} />
                        <Text style={{ 
                            color: colors.subtext, 
                            fontSize: 13, 
                            fontWeight: '600' 
                        }}>{label}</Text>
                    </View>
                )}
            </Animated.View>
        </Pressable>
    );
}

export default function Step4Health({
    heightVal, setHeight, weightVal, setWeight,
    bloodGroup, setBloodGroup, conditions, toggleCondition,
    smoking, setSmoking, drinking, setDrinking,
    errors, isDark, onNext, onBack,
}) {
    const [showBlood, setShowBlood] = useState(false);
    const [customCond, setCustomCond] = useState('');
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    const pillOpts = HABITS.map(v => ({ value: v, label: HABIT_LABELS[v] }));
    const { anims } = useStagger(8, { delay: 40, duration: 260 });

    // Live BMI calculations
    const height = parseFloat(heightVal);
    const weight = parseFloat(weightVal);
    const bmiValue = (height && weight && height > 0 && weight > 0)
        ? (weight / Math.pow(height / 100, 2)).toFixed(1)
        : null;

    let bmiCategory = '';
    let bmiColor = '';
    let bmiBgColor = '';

    if (bmiValue) {
        const bmi = parseFloat(bmiValue);
        if (bmi < 18.5) {
            bmiCategory = 'Underweight';
            bmiColor = '#F0A030';
            bmiBgColor = 'rgba(240, 160, 48, 0.12)';
        } else if (bmi >= 18.5 && bmi <= 24.9) {
            bmiCategory = 'Normal Weight';
            bmiColor = colors.success || '#4CAF50';
            bmiBgColor = theme === 'dark' ? 'rgba(76, 175, 80, 0.16)' : 'rgba(76, 175, 80, 0.08)';
        } else if (bmi >= 25 && bmi <= 29.9) {
            bmiCategory = 'Overweight';
            bmiColor = '#F0A030';
            bmiBgColor = 'rgba(240, 160, 48, 0.12)';
        } else {
            bmiCategory = 'Obese';
            bmiColor = '#E05555';
            bmiBgColor = 'rgba(224, 85, 85, 0.12)';
        }
    }

    const handleAddCustomCondition = () => {
        const trimmed = customCond.trim();
        if (!trimmed) return;
        
        // Match casing of predefined conditions if there is a case-insensitive match
        const predefinedMatch = CONDITIONS.find(c => c.toLowerCase() === trimmed.toLowerCase());
        const condToAdd = predefinedMatch || trimmed;
        
        // Add if not already selected (case insensitive)
        const exists = conditions.some(c => c.toLowerCase() === condToAdd.toLowerCase());
        if (!exists) {
            toggleCondition(condToAdd);
        }
        setCustomCond('');
        try {
            haptic('Success');
        } catch (_) {}
    };

    const uniqueConditions = [...new Set([...CONDITIONS, ...conditions])];

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            <Animated.View style={{ opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <View style={styles.gridRow}>
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

            {/* Dynamic BMI calculator card */}
            {bmiValue && (
                <Animated.View style={{
                    opacity: anims[1], transform: [{ translateY: anims[1].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                    padding: 15, borderRadius: 16, backgroundColor: bmiBgColor,
                    borderWidth: 1.5, borderColor: bmiColor + '30',
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: -2, marginBottom: 14,
                }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: bmiColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                            <Ionicons name="speedometer-outline" size={20} color={bmiColor} />
                        </View>
                        <View>
                            <Text style={{ fontSize: 10, color: colors.subtext, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Calculated BMI</Text>
                            <Text style={{ fontSize: 19, fontWeight: '900', color: colors.text, marginTop: 1 }}>{bmiValue}</Text>
                        </View>
                    </View>
                    <View style={{ backgroundColor: bmiColor, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{bmiCategory}</Text>
                    </View>
                </Animated.View>
            )}

            <Animated.View style={{ opacity: anims[2], transform: [{ translateY: anims[2].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
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

            <Animated.View style={{ opacity: anims[3], transform: [{ translateY: anims[3].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Label isDark={isDark}>Medical Conditions (Optional)</Label>
                
                {/* Search & Custom Add Input */}
                <View style={styles.customConditionWrapper}>
                    <Field
                        placeholder="Search or add custom condition (e.g. Migraine)"
                        value={customCond}
                        onChangeText={setCustomCond}
                        isDark={isDark}
                        onSubmitEditing={handleAddCustomCondition}
                        right={
                            customCond.trim().length > 0 ? (
                                <Pressable
                                    onPress={handleAddCustomCondition}
                                    style={{
                                        paddingHorizontal: 15,
                                        height: '100%',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: 'transparent',
                                    }}
                                    accessibilityLabel="Add custom condition"
                                    accessibilityRole="button"
                                >
                                    <Ionicons name="add-circle" size={24} color={colors.primary} />
                                </Pressable>
                            ) : null
                        }
                    />
                </View>

                {/* Chips Grid */}
                <View style={styles.chipsGrid}>
                    {uniqueConditions.map(cond => {
                        const isCustom = !CONDITIONS.includes(cond);
                        return (
                            <MedicalChip 
                                key={cond} 
                                label={cond} 
                                selected={conditions.includes(cond)} 
                                isCustom={isCustom}
                                onPress={() => toggleCondition(cond)} 
                                isDark={isDark} 
                            />
                        );
                    })}
                </View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[4], transform: [{ translateY: anims[4].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Label isDark={isDark}>Smoking Habits</Label>
                <View style={{ marginBottom: 14 }}><Pills options={pillOpts} selected={smoking} onSelect={setSmoking} isDark={isDark} /></View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[5], transform: [{ translateY: anims[5].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
                <Label isDark={isDark}>Drinking Habits</Label>
                <View style={{ marginBottom: 18 }}><Pills options={pillOpts} selected={drinking} onSelect={setDrinking} isDark={isDark} /></View>
            </Animated.View>

            <Animated.View style={{ opacity: anims[6], transform: [{ translateY: anims[6].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <View style={{ flex: 1 }}><GhostBtn title="Back" icon="arrow-back-outline" onPress={onBack} isDark={isDark} /></View>
                    <View style={{ flex: 1.6 }}><Btn title="Continue" icon="arrow-forward" onPress={onNext} /></View>
                </View>
            </Animated.View>
        </ScrollView>
    );
}
