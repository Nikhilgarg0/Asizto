// services/emailService.js
const SERVICE_ID = 'service_o7gkvbu';
const TEMPLATE_ID = 'template_t96dpdb';
const PUBLIC_KEY = 'IriL9iG7M4NdMiljz';

// Store OTPs temporarily (in production, use secure backend)
const otpStore = new Map();

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via EmailJS
 * @param {string} email - User's email address
 * @param {string} userName - User's name (optional)
 * @returns {Promise<{success: boolean, otp?: string, error?: string}>}
 */
export const sendOTP = async (email, userName = 'User') => {
  try {
    const otp = generateOTP();
    const expiryTime = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

    // Store OTP with expiry
    otpStore.set(email.toLowerCase(), {
      otp,
      expiryTime,
      attempts: 0
    });

    // Send email via EmailJS REST API to avoid browser-only globals in React Native
    const templateParams = {
      to_email: email,
      to_name: userName,
      otp: otp,
      message: `Your Asizto verification code is ${otp}. It expires in 10 minutes.`
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // EmailJS requires an origin header when called from non-browser environments
        'origin': 'http://localhost'
      },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_ID,
        user_id: PUBLIC_KEY,
        template_params: templateParams
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `EmailJS send failed with status ${response.status}`);
    }

    return { success: true, otp }; // Return OTP for development; remove in production
  } catch (error) {
    console.error('Failed to send OTP:', error);
    return { 
      success: false, 
      error: 'Failed to send OTP. Please check your email and try again.' 
    };
  }
};

/**
 * Verify OTP
 * @param {string} email - User's email address
 * @param {string} enteredOTP - OTP entered by user
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyOTP = async (email, enteredOTP) => {
  const emailKey = email.toLowerCase();
  const stored = otpStore.get(emailKey);

  if (!stored) {
    return { 
      success: false, 
      error: 'OTP not found or expired. Please request a new one.' 
    };
  }

  // Check expiry
  if (Date.now() > stored.expiryTime) {
    otpStore.delete(emailKey);
    return { 
      success: false, 
      error: 'OTP has expired. Please request a new one.' 
    };
  }

  // Check attempts
  if (stored.attempts >= 3) {
    otpStore.delete(emailKey);
    return { 
      success: false, 
      error: 'Too many incorrect attempts. Please request a new OTP.' 
    };
  }

  // Verify OTP
  if (stored.otp === enteredOTP.trim()) {
    otpStore.delete(emailKey); // Clear OTP after successful verification
    return { success: true };
  } else {
    stored.attempts += 1;
    otpStore.set(emailKey, stored);
    return { 
      success: false, 
      error: `Incorrect OTP. ${3 - stored.attempts} attempts remaining.` 
    };
  }
};

/**
 * Clear OTP for an email (useful for resend scenarios)
 * @param {string} email - User's email address
 */
export const clearOTP = (email) => {
  otpStore.delete(email.toLowerCase());
};

/**
 * Check if OTP exists and is valid for an email
 * @param {string} email - User's email address
 * @returns {boolean}
 */
export const hasValidOTP = (email) => {
  const stored = otpStore.get(email.toLowerCase());
  if (!stored) return false;
  return Date.now() <= stored.expiryTime;
};