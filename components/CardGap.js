// components/CardGap.js
import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function CardGap() {
  const { spacing } = useTheme();
  return <View style={{ height: spacing.md }} />;
}