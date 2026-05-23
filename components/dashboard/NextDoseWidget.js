import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import IconBadge from '../IconBadge';

const NextDoseWidget = React.memo(({ nextDoseStatus, onMarkAsTaken }) => {
  const { colors, spacing, radius, fontSize } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!nextDoseStatus?.isDue) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [nextDoseStatus]);

  if (!nextDoseStatus) return null;

  return (
    <Animated.View
      style={[
        styles.card,
        styles.medicineCard,
        {
          backgroundColor: colors.card,
          transform: [{ scale: nextDoseStatus.isDue ? pulseAnim : 1 }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <IconBadge icon="medical" size="md" color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {nextDoseStatus.medicine.name}
          </Text>
          <Text style={[styles.cardSubContent, { color: colors.subtext }]}>
            {nextDoseStatus.isDue
              ? `Due at ${nextDoseStatus.doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : `Next dose at ${nextDoseStatus.doseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </Text>
        </View>
        {nextDoseStatus.isDue && (
          <TouchableOpacity
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radius.pill,
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            onPress={() => onMarkAsTaken(nextDoseStatus.medicine.id)}
            activeOpacity={0.8}
            accessibilityLabel={`Take ${nextDoseStatus?.medicine?.name ?? 'medicine'} now`}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontSize: fontSize.sm, fontWeight: '700' }}>Take Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

export default NextDoseWidget;

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  medicineCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardSubContent: {
    fontSize: 14,
    lineHeight: 20,
  },
});
