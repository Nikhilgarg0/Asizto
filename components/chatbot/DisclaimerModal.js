import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const DisclaimerModal = ({ visible, onClose, colors }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
        <View style={[styles.disclaimerCard, { backgroundColor: colors.card }]}>
          <View style={styles.disclaimerHeader}>
            <Text style={[styles.disclaimerTitle, { color: colors.text }]}>⚕️ Health Disclaimer</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close disclaimer"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.disclaimerContent, { color: colors.text }]}>
            Hello! I am Asizto, your AI health assistant. I use your profile information to provide personalized responses.{'\n\n'}
            <Text style={{ fontWeight: '600' }}>Important:</Text> I am not a medical professional. Always consult a qualified healthcare provider for medical advice, diagnosis, or treatment.
          </Text>

          <TouchableOpacity
            style={[styles.disclaimerButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
            accessibilityLabel="Accept Health disclaimer"
            accessibilityRole="button"
          >
            <Text style={styles.disclaimerButtonText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    </Modal>
  );
};

export default DisclaimerModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disclaimerCard: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  disclaimerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  disclaimerContent: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 20,
  },
  disclaimerButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disclaimerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
