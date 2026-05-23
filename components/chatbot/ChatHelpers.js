import React from 'react';
import { Text } from 'react-native';

export const formatTimestamp = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now.getTime() - oneDay);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return d.toLocaleDateString() + ' ' + time;
};

export const dayString = (ts) => {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toDateString();
};

// Parse markdown-style bold text (*text* or **text**) and return Text components
export const parseMarkdownBold = (text, baseStyle) => {
  if (!text) return null;

  const parts = [];
  let currentIndex = 0;

  // Match *text* or **text** patterns (non-greedy)
  const boldPattern = /(\*\*?)([^*\n]+?)\1/g;
  let match;
  let hasMatches = false;

  while ((match = boldPattern.exec(text)) !== null) {
    hasMatches = true;

    // Add text before the match
    if (match.index > currentIndex) {
      const beforeText = text.substring(currentIndex, match.index);
      if (beforeText) {
        parts.push(
          <Text key={`text-${currentIndex}`} style={baseStyle}>
            {beforeText}
          </Text>
        );
      }
    }

    // Add the bold text (without the asterisks)
    parts.push(
      <Text key={`bold-${match.index}`} style={[baseStyle, { fontWeight: '700' }]}>
        {match[2]}
      </Text>
    );

    currentIndex = match.index + match[0].length;
  }

  // Add remaining text after the last match
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      parts.push(
        <Text key={`text-${currentIndex}`} style={baseStyle}>
          {remainingText}
        </Text>
      );
    }
  }

  // If no matches found, return the original text
  if (!hasMatches || parts.length === 0) {
    return <Text style={baseStyle}>{text}</Text>;
  }

  // Return nested Text components (React Native supports nested Text)
  return <Text style={baseStyle}>{parts}</Text>;
};
