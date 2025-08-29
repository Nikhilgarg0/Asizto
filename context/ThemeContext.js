import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState(systemScheme);

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
    },
    dark: {
      primary: '#83b271',      // Main green
      accent: '#a0c492',       // Lighter green for dark mode
      background: '#1f1f1f',   // Dark background
      card: '#2a2a2a',         // Lighter card background
      text: '#ffffff',
      subtext: '#aaaaaa',
      border: '#3a3a3a',
    },
  };

  const currentTheme = themeColors[theme];

  useEffect(() => {
    // This helps third-party components respect the theme
    Appearance.setColorScheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors: currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);