const BASE_URL = "https://asizto-api.vercel.app";

export const sendOTP = async (email, userName = "User") => {
  try {
    const res = await fetch(`${BASE_URL}/api/sendOTP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, userName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send code.");
    return { success: true };
  } catch (error) {
    console.error("sendOTP error:", error);
    return { success: false, error: error.message };
  }
};

export const verifyOTP = async (email, enteredOTP) => {
  try {
    const res = await fetch(`${BASE_URL}/api/verifyOTP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp: enteredOTP }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Verification failed.");
    return { success: true };
  } catch (error) {
    console.error("verifyOTP error:", error);
    return { success: false, error: error.message };
  }
};

export const clearOTP = async (email) => {
  try {
    await fetch(`${BASE_URL}/api/clearOTP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    console.warn("clearOTP error:", error);
  }
};

export const generateOTP = () => {};
export const hasValidOTP = () => false;