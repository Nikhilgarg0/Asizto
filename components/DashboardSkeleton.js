// components/DashboardSkeleton.js
// Shimmer skeleton for DashboardScreen while data / health score loads
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// ─── Single shimmer box ───────────────────────────────────────────────────────
function SkeletonBox({ style }) {
  const { colors } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View
      style={[
        { backgroundColor: colors.border, borderRadius: 10 },
        style,
        { opacity },
      ]}
    />
  );
}

// ─── Full dashboard skeleton ──────────────────────────────────────────────────
export default function DashboardSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* Welcome row */}
      <View style={styles.welcomeRow}>
        <View>
          <SkeletonBox style={{ width: 120, height: 14, marginBottom: 8 }} />
          <SkeletonBox style={{ width: 200, height: 22 }} />
        </View>
        <SkeletonBox style={{ width: 44, height: 44, borderRadius: 22 }} />
      </View>

      {/* Health score card */}
      <SkeletonBox style={styles.card} />

      {/* Stats row — 3 mini cards */}
      <View style={styles.statsRow}>
        <SkeletonBox style={styles.statCard} />
        <SkeletonBox style={styles.statCard} />
        <SkeletonBox style={styles.statCard} />
      </View>

      {/* AI Fact card */}
      <SkeletonBox style={[styles.card, { height: 90 }]} />

      {/* Next appointment card */}
      <SkeletonBox style={[styles.card, { height: 80 }]} />

      {/* Medicine card */}
      <SkeletonBox style={[styles.card, { height: 70 }]} />

      {/* Search bar */}
      <SkeletonBox style={{ height: 46, borderRadius: 12, marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 12,
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  card: {
    height: 120,
    borderRadius: 16,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    height: 72,
    borderRadius: 14,
  },
});
