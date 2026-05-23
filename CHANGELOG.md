# Changelog

All notable changes to **ASIZTO India** will be documented in this file.

---

## [1.0.0] — 2026-05-24

> 🎉 First public release of ASIZTO India

### ✨ Features

#### 🏥 Dashboard
- Personalised health dashboard with greeting and daily wellness summary
- AI-generated health tip of the day (powered by Gemini)
- Quick-access cards for medicines, appointments, and emergency contacts
- Real-time data refresh with pull-to-refresh support

#### 🤖 AI Health Chatbot
- Conversational health assistant powered by Google Gemini
- Context-aware responses with a conversational, non-clinical tone
- Chat history with smooth animated message bubbles
- Intelligent model fallback chain for high availability
- Respects context window limits (last 20 messages retained)

#### 💊 Medicine Cabinet
- Add, view, and manage medications
- Scheduled reminders with exact alarm support
- Medicine list with dosage and timing details

#### 📅 Appointments
- Add and track upcoming medical appointments
- Date & time picker for scheduling
- Appointment overview in a clean tab layout

#### 🚨 Emergency Features
- One-tap emergency screen with quick-call actions
- Emergency contacts management (add/edit/remove)
- Location-aware nearby services (uses device GPS)

#### 👤 Profile & Auth
- Secure sign-up and login flow with OTP email verification
- Profile photo support (camera & gallery)
- Editable personal health details
- Light/Dark mode support (`userInterfaceStyle: automatic`)

#### 🔔 Notifications
- Local push notifications for medicine reminders
- Boot-aware scheduling (reminders survive device restarts)
- Notification management screen

---

### 🛠 Technical Details

- **Platform:** Android (iOS support ready)
- **Version Code:** 1
- **Bundle ID:** `in.nikhilcodes.asizto`
- **Runtime:** Expo SDK with New Architecture enabled
- **Min SDK:** Android 6.0+
- **OTA Updates:** Enabled via Expo Updates

---

### 🐛 Known Issues

- None reported at initial release.

---

*Built with ❤️ by Nikhil — ASIZTO India*
