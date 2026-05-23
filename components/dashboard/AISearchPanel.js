import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Keyboard,
  Platform,
  Alert,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { callGemini } from '../../utils/gemini';
import logger from '../../utils/Logger';
import performanceMonitor from '../../utils/PerformanceMonitor';

const AISearchPanel = React.memo(({ fadeAnim }) => {
  const { colors, spacing, theme } = useTheme();

  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(300);

  const resultPanelAnim = useRef(new Animated.Value(400)).current;
  const searchBarBottomAnim = useRef(new Animated.Value(10)).current;
  const keepFocusedRef = useRef(false);

  // Track keyboard height so the result panel matches it exactly
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const show = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      resultPanelAnim.setValue(e.endCoordinates.height + 40);
    });
    return () => show.remove();
  }, []);

  // Slide result panel up + move search bar to sit just above it
  const showResultPanel = useCallback((height) => {
    Animated.parallel([
      Animated.spring(resultPanelAnim, {
        toValue: 0,
        tension: 68,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.timing(searchBarBottomAnim, {
        toValue: height + 8,
        duration: 280,
        useNativeDriver: false,
      }),
    ]).start();
  }, [resultPanelAnim, searchBarBottomAnim]);

  // Dismiss: slide panel + search bar back to resting positions, then clear state
  const dismissSearch = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(resultPanelAnim, {
        toValue: keyboardHeight + 40,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(searchBarBottomAnim, {
        toValue: 10,
        duration: 260,
        useNativeDriver: false,
      }),
    ]).start(() => {
      setSearchResult('');
      setIsSearchFocused(false);
    });
  }, [resultPanelAnim, searchBarBottomAnim, keyboardHeight]);

  const handleSearch = useCallback(async () => {
    if (searchText.trim().length < 3) {
      Alert.alert('Search Error', 'Please enter at least 3 characters to search.');
      return;
    }

    if (isSearching) return;

    setIsSearching(true);
    setSearchResult('');

    try {
      const apiTimer = performanceMonitor.startApiCall('gemini', 'POST');
      const prompt = `Provide a brief, one-paragraph summary for the medicine: "${searchText}". Include its primary use and one or two common side effects. Format it as a simple paragraph.`;

      const summary = await callGemini(prompt);

      // Keep the UI in "focused" mode even after the keyboard closes
      keepFocusedRef.current = true;
      setIsSearchFocused(true);
      setSearchResult(summary);

      // Dismiss keyboard → result panel slides up into the vacated space
      Keyboard.dismiss();
      showResultPanel(keyboardHeight);

      logger.info('Medicine search completed', {
        query: searchText,
        resultLength: summary.length,
      });
      if (apiTimer) performanceMonitor.endApiCall(apiTimer, 200, true);
    } catch (error) {
      logger.error('Medicine search failed', error);
      keepFocusedRef.current = true;
      setIsSearchFocused(true);
      setSearchResult("Sorry, we couldn't fetch medicine information at this time. Please try again later.");
      Keyboard.dismiss();
      showResultPanel(keyboardHeight);
    } finally {
      setIsSearching(false);
    }
  }, [searchText, isSearching, keyboardHeight, showResultPanel]);

  return (
    <>
      {isSearchFocused && (
        <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 5 }]}>
          <TouchableWithoutFeedback onPress={dismissSearch}>
            <BlurView
              intensity={60}
              tint={theme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback onPress={dismissSearch}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }]} />
          </TouchableWithoutFeedback>
        </Animated.View>
      )}

      {/* ── Search bar — bottom animates up to sit just above the result panel ── */}
      <Animated.View
        style={{
          position: 'absolute',
          bottom: searchBarBottomAnim,
          left: 0,
          right: 0,
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
          backgroundColor: 'transparent',
          zIndex: 10,
        }}
      >
        <Animated.View style={[styles.searchContainer, { opacity: fadeAnim }]}>
          <TextInput
            style={[
              styles.searchInput,
              { backgroundColor: colors.card, color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Search medicine info..."
            accessibilityLabel="Search medicine info"
            placeholderTextColor={colors.subtext}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => {
              // Only collapse if a result is about to be shown
              setTimeout(() => {
                if (!keepFocusedRef.current) {
                  setIsSearchFocused(false);
                }
                keepFocusedRef.current = false;
              }, 200);
            }}
            maxLength={100}
          />
          <TouchableOpacity
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
            disabled={isSearching || searchText.trim().length < 3}
            activeOpacity={0.7}
            accessibilityLabel="Search medicine"
            accessibilityRole="button"
          >
            {isSearching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={22} color="#fff" />
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* ── Result panel — slides up from bottom to replace the keyboard ── */}
      {searchResult && isSearchFocused && (
        <Animated.View
          style={[
            styles.resultPanel,
            {
              backgroundColor: colors.card,
              minHeight: keyboardHeight,
              transform: [{ translateY: resultPanelAnim }],
              zIndex: 9,
            },
          ]}
        >
          {/* Drag handle */}
          <View style={styles.resultPanelHandle} />

          {/* Header row */}
          <View style={styles.searchResultHeader}>
            <Ionicons name="medical" size={20} color={colors.primary} />
            <Text style={[styles.searchResultTitle, { color: colors.primary, flex: 1 }]}>{searchText}</Text>
            <TouchableOpacity
              onPress={dismissSearch}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close result"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={22} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.cardSubContent, { color: colors.subtext, marginTop: 8 }]}>{searchResult}</Text>
        </Animated.View>
      )}
    </>
  );
});

export default AISearchPanel;

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 16,
    fontSize: 15,
    borderWidth: 1,
  },
  searchButton: {
    height: 50,
    width: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  resultPanelHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.35)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubContent: {
    fontSize: 14,
    lineHeight: 20,
  },
});
