import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, radius, fontSize, iconSize } from '../theme/tokens';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme || 'light');

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) { setTheme(savedTheme); }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await AsyncStorage.setItem('theme', newTheme);
  };
  
  const themeColors = {
    light: {
      primary: '#83b271',      // Main green
      accent: '#689c54',       // Darker green for highlights
      background: '#f4f4f8',   // Off-white background
      card: '#ffffff',
      text: '#1f1f1f',
      subtext: '#6e6e6e',
      border: '#e0e0e0',
      success: '#4caf50',      // Green for success messages
      warning: '#ffc107',      // Orange for warning messages
      danger: '#f44336',        // Red for error messages
    },
    dark: {
      primary: '#83b271',      // Main green
      accent: '#a0c492',       // Lighter green for dark mode
      background: '#1f1f1f',   // Dark background
      card: '#2a2a2a',         // Lighter card background
      text: '#ffffff',
      subtext: '#aaaaaa',
      border: '#3a3a3a',
      success: '#4CAF50',   
      warning: '#FFC107',  
      danger: '#F44336',  
    },
  };

  const currentTheme = themeColors[theme] || themeColors.light;

  useEffect(() => {
    // This helps third-party components respect the theme
    Appearance.setColorScheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme: theme || 'light', toggleTheme, colors: currentTheme, spacing, radius, fontSize, iconSize }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback theme if context is not available
    console.warn('useTheme must be used within a ThemeProvider');
    return {
      theme: 'light',
      toggleTheme: () => {},
      colors: {
        primary: '#83b271',
        accent: '#689c54',
        background: '#f4f4f8',
        card: '#ffffff',
        text: '#1f1f1f',
        subtext: '#6e6e6e',
        border: '#e0e0e0',
        success: '#4CAF50',
        warning: '#FFC107',
        danger: '#F44336',
      },
      spacing,
      radius,
      fontSize,
      iconSize,
  };
  }
  return context;
};