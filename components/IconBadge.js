// components/IconBadge.js
import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const SIZES = {
  sm: { container: 32, icon: 'sm' },
  md: { container: 40, icon: 'md' },
  lg: { container: 48, icon: 'lg' },
};

export default function IconBadge({ icon, size = 'md', color }) {
  const { iconSize, radius } = useTheme();
  const { container, icon: iconKey } = SIZES[size] ?? SIZES.md;

  return (
    <View
      style={{
        width: container,
        height: container,
        borderRadius: radius.pill,
        backgroundColor: color + '20',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons name={icon} size={iconSize[iconKey]} color={color} />
    </View>
  );
}