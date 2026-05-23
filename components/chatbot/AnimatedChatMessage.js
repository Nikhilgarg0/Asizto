import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { parseMarkdownBold } from './ChatHelpers';

const AnimatedChatMessage = ({ content, onComplete, msgId, colors, textStyle }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(true);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!content) {
      onCompleteRef.current?.(msgId);
      return;
    }

    let index = 0;
    const text = content;
    const speed = 15; // milliseconds per character

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        onCompleteRef.current?.(msgId);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, msgId]);

  const baseStyle = textStyle || { color: colors.text };

  // Parse the displayed text with markdown formatting
  const formattedText = parseMarkdownBold(displayedText, baseStyle);

  return (
    <View>
      {formattedText}
      {isAnimating && (
        <Text style={[baseStyle, { opacity: 0.5 }]}>|</Text>
      )}
    </View>
  );
};

export default AnimatedChatMessage;
