/**
 * components/profile/DeleteAccountModal.js
 *
 * CODE-1: Extracted from ProfileScreen.js to reduce file size.
 * Handles the "Delete Account" confirmation flow including password
 * re-authentication for email users and Google sign-in bypass.
 */
import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../../context/ThemeContext';

/**
 * @param {boolean}  visible
 * @param {Function} onClose
 * @param {boolean}  isGoogleUser
 * @param {string}   confirmText         — controlled value ("DELETE")
 * @param {Function} onConfirmTextChange
 * @param {string}   password            — controlled value
 * @param {Function} onPasswordChange
 * @param {Function} onConfirm           — async delete handler
 */
export default function DeleteAccountModal({
  visible,
  onClose,
  isGoogleUser,
  confirmText,
  onConfirmTextChange,
  password,
  onPasswordChange,
  onConfirm,
}) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animatable.View
          animation="zoomIn"
          duration={300}
          style={[styles.card, { backgroundColor: colors.card }]}
        >
          <Animatable.View animation="shake" iterationCount={2} style={styles.iconWrap}>
            <Ionicons name="warning" size={56} color="#e74c3c" />
          </Animatable.View>

          <Text style={[styles.title, { color: colors.text }]}>Delete Account?</Text>
          <Text style={[styles.body, { color: colors.subtext }]}>
            This action is{' '}
            <Text style={{ fontWeight: '700', color: '#e74c3c' }}>permanent</Text> and cannot be
            undone. All your data will be permanently deleted from our servers.
          </Text>

          <Text style={[styles.instruction, { color: colors.text }]}>
            Type <Text style={{ fontWeight: '700', color: '#e74c3c' }}>DELETE</Text> to confirm
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                borderColor: confirmText === 'DELETE' ? '#e74c3c' : colors.border,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={confirmText}
            onChangeText={(v) => onConfirmTextChange(v.toUpperCase())}
            autoCapitalize="characters"
            placeholder="DELETE"
            placeholderTextColor={colors.subtext}
            accessibilityLabel="Type DELETE to confirm account deletion"
          />

          {!isGoogleUser && (
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.background,
                  marginBottom: 28,
                },
              ]}
              value={password}
              onChangeText={onPasswordChange}
              placeholder="Enter your password"
              placeholderTextColor={colors.subtext}
              secureTextEntry
              autoCapitalize="none"
              accessibilityLabel="Enter password to confirm account deletion"
            />
          )}

          {isGoogleUser && (
            <Text style={{ color: colors.subtext, fontSize: 13, marginBottom: 28, textAlign: 'center' }}>
              You signed in with Google. No password needed.
            </Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityLabel="Cancel account deletion"
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                confirmText !== 'DELETE' && { opacity: 0.5 },
              ]}
              disabled={confirmText !== 'DELETE'}
              onPress={onConfirm}
              activeOpacity={0.7}
              accessibilityLabel="Confirm delete account permanently"
              accessibilityRole="button"
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>Delete Forever</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    margin: 24,
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fee',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#e74c3c',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 14,
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  instruction: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 56,
    borderWidth: 2,
    borderRadius: 14,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    borderWidth: 2,
  },
  confirmBtn: {
    backgroundColor: '#e74c3c',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
