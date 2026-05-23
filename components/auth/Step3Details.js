import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Animated, Pressable, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { Label, Field, GenderPicker, GhostBtn, Btn, useStagger } from '../../screens/AuthUI';
import { getStyles } from './AuthStyles';

const fmt = d => d
    ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

export default function Step3Details({
    dob, setDob, phoneDigits, setPhoneDigits, gender, setGender,
    showDatePicker, setShowDatePicker, errors, isDark, onNext, onBack,
}) {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors, theme);
    const { anims } = useStagger(4, { delay: 55, duration: 280 });

    return (
        <View>
            <Animated.View style={{ opacity: anims[0], transform: [{ translateY: anims[0].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                <Label isDark={isDark}>Date of Birth</Label>
                <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.datePickerBtn, {
                        borderColor: errors.dob ? '#E05555' : theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        marginBottom: errors.dob ? 2 : 14,
                    }]}
                    accessibilityLabel="Select date of birth"
                    accessibilityRole="button"
                >
                    <View style={styles.datePickerContent}>
                        <Ionicons name="calendar-outline" size={17} color={dob ? colors.text : colors.subtext} />
                        <Text style={{ color: dob ? colors.text : colors.subtext, fontSize: 15 }}>{dob ? fmt(dob) : 'Select date of birth'}</Text>
                    </View>
                    <Ionicons name="chevron-down" size={15} color={colors.subtext} />
                </Pressable>
                {errors.dob ? <Text style={{ color: '#E05555', fontSize: 13, fontWeight: '600', marginBottom: 12, marginLeft: 2 }}>{errors.dob}</Text> : null}
                {showDatePicker && (
                    Platform.OS === 'ios' ? (
                        <Modal transparent visible={showDatePicker} animationType="slide">
                            <View style={styles.iosDatePickerModal}>
                                <View style={[styles.iosDatePickerContainer, { backgroundColor: colors.card }]}>
                                    <View style={[styles.iosDatePickerHeader, { borderColor: colors.border }]}>
                                        <Pressable onPress={() => setShowDatePicker(false)}>
                                            <Text style={{ color: colors.subtext, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                                        </Pressable>
                                        <Pressable onPress={() => setShowDatePicker(false)}>
                                            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700' }}>Done</Text>
                                        </Pressable>
                                    </View>
                                    <DateTimePicker
                                        value={dob || new Date(2000, 0, 1)}
                                        mode="date"
                                        display="spinner"
                                        maximumDate={new Date()}
                                        onChange={(_, d) => { if (d) setDob(d); }}
                                    />
                                </View>
                            </View>
                        </Modal>
                    ) : (
                        <DateTimePicker
                             value={dob || new Date(2000, 0, 1)}
                             mode="date"
                             display="default"
                             maximumDate={new Date()}
                             onChange={(event, d) => {
                                 if (event.type === 'set') {
                                     setShowDatePicker(false);
                                     if (d) setDob(d);
                                 } else if (event.type === 'dismissed') {
                                     setShowDatePicker(false);
                                 }
                             }}
                        />
                    )
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
