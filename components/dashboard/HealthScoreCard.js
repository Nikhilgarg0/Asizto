import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const getScoreColor = (score, colors) => {
  if (score === null || isNaN(score)) return colors.subtext;
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.warning;
  return colors.danger;
};

const getTagline = (score) => {
  if (score === null || isNaN(score)) return 'Complete details to get index';
  if (score >= 80) return 'Your wellness profile is in great shape. Keep up the high standard!';
  if (score >= 60) return 'Good index. Minor updates to profile or cabinet will increase this further.';
  return 'Action advised. Log scheduled medicines and vital info to boost your index.';
};

const HealthScoreCard = React.memo(({ healthScore, onShowExplainer }) => {
  const { colors, spacing, fontSize, iconSize } = useTheme();
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (healthScore !== null) {
      Animated.timing(scoreAnim, {
        toValue: healthScore,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [healthScore]);

  const scoreColor = getScoreColor(healthScore, colors);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onShowExplainer}
      accessibilityLabel="Health Score. Tap to view detailed breakdown."
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: colors.card, padding: spacing.lg, borderColor: colors.border }]}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 0 }]}>Health Score</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.subtext} />
      </View>

      <View style={styles.scoreRow}>
        {/* Left Side: Score Pill with heart icon */}
        <View style={[styles.scoreBadgeContainer, { backgroundColor: `${scoreColor}14` }]}>
          <Ionicons name="heart" size={24} color={scoreColor} />
          <Text style={[styles.scoreText, { color: scoreColor }]}>
            {healthScore ?? 'N/A'}{healthScore !== null && '%'}
          </Text>
        </View>

        {/* Right Side: Status Title & Tagline */}
        <View style={styles.statusContainer}>
          <View style={styles.statusHeaderRow}>
            <Ionicons
              name={healthScore >= 80 ? 'checkmark-circle' : healthScore >= 60 ? 'alert-circle' : 'close-circle'}
              size={18}
              color={scoreColor}
            />
            <Text style={[styles.statusText, { color: scoreColor }]}>
              {healthScore >= 80 ? 'Excellent!' : healthScore >= 60 ? 'Good' : 'Needs attention'}
            </Text>
          </View>
          <Text style={[styles.taglineText, { color: colors.subtext }]} numberOfLines={2}>
            {getTagline(healthScore)}
          </Text>
        </View>
      </View>

      <View
        style={[styles.progressBar, { backgroundColor: `${colors.border}50` }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: healthScore ?? 0 }}
        accessibilityLabel={`Health score ${healthScore ?? 0} out of 100`}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: scoreColor,
              width: scoreAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
});

export default HealthScoreCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  scoreBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    gap: 8,
    minWidth: 110,
    justifyContent: 'center',
  },
  scoreText: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  statusContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  taglineText: {
    fontSize: 12,
    lineHeight: 16,
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 18,
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
