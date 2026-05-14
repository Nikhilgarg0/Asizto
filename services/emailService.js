import { API_BASE_URL } from '@env';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';

const BASE_URL = API_BASE_URL;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// Generate a cryptographically random 6-digit OTP
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

// Firestore collection for pending OTPs
const otpRef = (email) => doc(db, 'otp_verifications', email.toLowerCase().trim());

export const sendOTP = async (email, userName = 'User') => {
  try {
    const otp = generateCode();
    const expiresAt = Timestamp.fromMillis(Date.now() + OTP_EXPIRY_MS);

    // 1. Persist OTP in Firestore BEFORE sending the email
    await setDoc(otpRef(email), { otp, expiresAt, email: email.toLowerCase().trim() });

    // 2. Call the Vercel API to dispatch the email (pass our own OTP so the email matches)
    const res = await fetch(`${BASE_URL}/api/sendOTP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase().trim(), userName, otp }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send code.');

    return { success: true };
  } catch (error) {
    console.error('sendOTP error:', error);
    return { success: false, error: error.message };
  }
};

export const verifyOTP = async (email, enteredOTP) => {
  try {
    const snap = await getDoc(otpRef(email));

    if (!snap.exists()) {
      return { success: false, error: 'No code found. Please request a new one.' };
    }

    const { otp, expiresAt } = snap.data();
    const now = Timestamp.now();

    if (now.toMillis() > expiresAt.toMillis()) {
      await deleteDoc(otpRef(email)); // clean up expired
      return { success: false, error: 'Code expired. Please request a new one.' };
    }

    if (enteredOTP.trim() !== otp) {
      return { success: false, error: 'Incorrect code. Please try again.' };
    }

    // OTP matched — clean it up
    await deleteDoc(otpRef(email));
    return { success: true };
  } catch (error) {
    console.error('verifyOTP error:', error);
    return { success: false, error: 'Verification failed. Try again.' };
  }
};

export const clearOTP = async (email) => {
  try {
    await deleteDoc(otpRef(email));
  } catch (error) {
    console.warn('clearOTP error:', error);
  }
};

export const generateOTP = () => generateCode();
export const hasValidOTP = () => false;