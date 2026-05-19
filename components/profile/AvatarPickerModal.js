/**
 * components/profile/AvatarPickerModal.js
 *
 * CODE-1: Extracted from ProfileScreen.js to reduce file size.
 * Shows a bottom-sheet style modal with a grid of 12 avatar options.
 */
import React from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import Toast from 'react-native-toast-message';
import { useTheme } from '../../context/ThemeContext';

const AVATAR_KEYS = [
  'male1', 'male2', 'male3', 'male4', 'male5', 'male6',
  'female1', 'female2', 'female3', 'female4', 'female5', 'female6',
];

const AVATAR_MAP = {
  male1:   require('../../assets/avatars/male1.webp'),
  male2:   require('../../assets/avatars/male2.webp'),
  male3:   require('../../assets/avatars/male3.webp'),
  male4:   require('../../assets/avatars/male4.webp'),
  male5:   require('../../assets/avatars/male5.webp'),
  male6:   require('../../assets/avatars/male6.webp'),
  female1: require('../../assets/avatars/female1.webp'),
  female2: require('../../assets/avatars/female2.webp'),
  female3: require('../../assets/avatars/female3.webp'),
  female4: require('../../assets/avatars/female4.webp'),
  female5: require('../../assets/avatars/female5.webp'),
  female6: require('../../assets/avatars/female6.webp'),
};

export function getAvatarSource(key) {
  return AVATAR_MAP[key] ?? AVATAR_MAP.male1;
}

/**
 * @param {boolean}  visible
 * @param {Function} onClose
 * @param {string}   selectedKey — current avatarKey in editableData
 * @param {Function} onSelect(key) — called when user picks an avatar
 */
export default function AvatarPickerModal({ visible, onClose, selectedKey, onSelect }) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animatable.View
          animation="slideInUp"
          duration={400}
          style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.text }]}>Choose Your Avatar</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close avatar selector"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={28} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {AVATAR_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                onPress={() => {
                  onSelect(key);
                  onClose();
                  Toast.show({ type: 'success', text1: '✅ Avatar Updated' });
                }}
                style={styles.gridItem}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Select ${key} avatar`}
                accessibilityState={{ selected: selectedKey === key }}
              >
                <Image
                  source={getAvatarSource(key)}
                  style={[
                    styles.gridImage,
                    { borderColor: colors.primary },
                    selectedKey === key && styles.gridImageSelected,
                  ]}
                />
                {selectedKey === key && (
                  <Animatable.View animation="bounceIn" style={[styles.checkmark, { backgroundColor: colors.card }]}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  </Animatable.View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animatable.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '70%',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 22,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 24,
    gap: 18,
  },
  gridItem: {
    position: 'relative',
  },
  gridImage: {
    width: 85,
    height: 85,
    borderRadius: 43,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  gridImageSelected: {
    borderWidth: 4,
  },
  checkmark: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    borderRadius: 12,
  },
});
