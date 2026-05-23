import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import IconBadge from '../IconBadge';

const HealthFactCard = React.memo(({ randomFact, aiFactLoading, onRefreshTip }) => {
  const { colors, spacing, iconSize } = useTheme();

  return (
    <View style={[styles.card, styles.tipCard, { backgroundColor: colors.card }]}>
      <View style={styles.tipHeader}>
        <IconBadge icon="bulb" size="md" color={colors.primary} />
        <Text style={[styles.tipTitle, { color: colors.text }]}>Health Tip</Text>
        <TouchableOpacity
          onPress={onRefreshTip}
          disabled={aiFactLoading}
          activeOpacity={0.8}
          accessibilityLabel="Refresh health tip"
          accessibilityRole="button"
          style={{ marginLeft: 'auto', padding: spacing.sm }}
        >
          {aiFactLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={iconSize.md} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      <Text style={[styles.tipContent, { color: colors.subtext }]}>{randomFact}</Text>
    </View>
  );
});

export default HealthFactCard;

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
  tipCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tipContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 14,
  },
});
