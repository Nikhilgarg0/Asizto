import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

const TypingDots = ({ colors }) => {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.sequence([
        Animated.timing(a1, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(a1, { toValue: 0.3, duration: 360, useNativeDriver: true }),
      ])
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(120),
        Animated.timing(a2, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(a2, { toValue: 0.3, duration: 360, useNativeDriver: true }),
      ])
    );
    const loop3 = Animated.loop(
      Animated.sequence([
        Animated.delay(240),
        Animated.timing(a3, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(a3, { toValue: 0.3, duration: 360, useNativeDriver: true }),
      ])
    );

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [a1, a2, a3]);

  const dotStyle = (anim) => ({
    width: 6,
    height: 6,
    borderRadius: 6,
    marginHorizontal: 3,
    backgroundColor: colors.subtext || '#888',
    opacity: anim,
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.View style={dotStyle(a1)} />
      <Animated.View style={dotStyle(a2)} />
      <Animated.View style={dotStyle(a3)} />
    </View>
  );
};

export default TypingDots;
