# Asizto India — Expert App Audit Report

**Project:** Asizto India (React Native / Expo)
**Stack:** React Native 0.81.5 · Expo ~54 · Firebase 12 · React Navigation 7
**Screens reviewed:** 16 screens, ~8,000+ lines of source code
**Overall Score: 67 / 100**

> **Verdict:** Genuine, feature-rich health app with good bones — a proper theme system, thoughtful animations, real Firestore integration, error boundaries, and a performance monitor. However, three critical security issues must be fixed before real users interact with it. After that, state management consolidation is the highest-leverage improvement.

---

## Score Summary

| # | Dimension | Rating | Score |
|---|-----------|--------|-------|
| 1 | UI Design | Good | 72 / 100 |
| 2 | UX Design | Needs Improvement | 58 / 100 |
| 3 | App Performance | Needs Improvement | 55 / 100 |
| 4 | Code Quality | Good | 68 / 100 |
| 5 | Navigation & User Flow | Good | 74 / 100 |
| 6 | State Management | Needs Improvement | 52 / 100 |
| 7 | Error Handling & Edge Cases | Good | 70 / 100 |
| 8 | Security | **Critical Issue** | 34 / 100 |
| 9 | Scalability | Needs Improvement | 56 / 100 |
| 10 | Platform Best Practices | Needs Improvement | 60 / 100 |



---

## Detailed Findings



### 1. UI Design — Good (72 / 100)

**What's working well**

- Green palette (`#83b271`) is cohesive and appropriate for a health app.
- `ThemeContext` properly manages dark/light tokens, and separate logo assets exist for each mode.
- `theme/tokens.js` centralises spacing, radius, font sizes, and icon sizes — a mature pattern.
- Card shadows are tastefully subtle (`shadowOpacity: 0.08`).
- Entrance animations use `Animated.parallel` with spring physics, which feels polished.

**Problems found**

**Hardcoded hex throughout screens — 25+ instances**
`DashboardScreen.js` lines ~310–350, `MedicinesTab.js`, `EmergencyScreen.js`

Despite having `colors.success`, `colors.warning`, and `colors.danger` in the theme, the codebase uses raw hex (`'#4CAF50'`, `'#F44336'`, `'#FFC107'`) as literals throughout. These do not respond to dark mode and can clash visually on dark backgrounds.

*Fix:* Replace every hardcoded status color with `colors.success`, `colors.warning`, or `colors.danger` from `useTheme()`.

**No font family defined**
`theme/tokens.js`

`tokens.js` defines size scales but no typeface. The app uses the system default (San Francisco on iOS, Roboto on Android), giving it an inconsistent personality across platforms.

*Fix:* Load a custom font via `expo-font` (e.g. `DM Sans` or `Nunito` suit the friendly health aesthetic) and reference it via a `fontFamily` token.

**Inconsistent card padding**
`DashboardScreen.js` lines ~430, ~550

Inside-card padding alternates between `spacing.md` (16), `spacing.lg` (24), and the raw literal `18`. Choose one token and apply it uniformly.

**`CardGap` is a needlessly reified spacer**
`components/CardGap.js`

The entire component is `<View style={{ marginBottom: 16 }} />`. This creates an import + component overhead for something that should be a token used inline. Delete it and use `marginBottom: spacing.md` on the adjacent card.

---

### 2. UX Design — Needs Improvement (58 / 100)

**What's working well**

- Multi-step auth flow with directional slide animation is excellent UX.
- OTP cooldown timers prevent spam.
- Pull-to-refresh is present on Dashboard.
- `accessibilityLabel` and `accessibilityRole` are applied to interactive elements in DashboardScreen.

**Problems found**

**No post-onboarding guidance**

After completing 5-step registration the user lands cold on Dashboard with empty states and no guidance. There is no tooltip, spotlight, or "add your first medicine" prompt to orient them.

*Fix:* Add a first-run walkthrough. A simple 3-step modal ("Add your medicines → Set reminders → Track health score") shown once after registration is sufficient.

**Empty states are incomplete**
`screens/MedicinesTab.js`, `screens/AppointmentsTab.js`

Both screens show `ActivityIndicator` during load, but when lists are genuinely empty the user sees a blank screen with no instruction.

*Fix:* Add a proper empty state: icon + heading + short copy + CTA button (`Add your first medicine →`) for each empty list.

**"Refresh health tip" fires two sequential AI calls**
`DashboardScreen.js` — `fetchAIPersonalTip` → `fetchAIFact`

When the user taps the refresh button, `fetchAIPersonalTip` fires first. If it fails, `fetchAIFact` fires. Both show the same spinner, so from the user's perspective the spinner appears, disappears, and appears again — which reads as a bug.

*Fix:* Run both in `Promise.race` / `Promise.any`, or show a single persistent loading state until either resolves.

**Long-press SOS button has no visible progress indicator**
`screens/EmergencyScreen.js`

`longPressProgress` is tracked as an `Animated.Value` but is never rendered as a visual arc or fill. Users cannot tell how long they need to hold.

*Fix:* Render a `Animated.View` circular progress ring driven by `longPressProgress`.

**No haptic feedback on health-critical actions**

Haptics are imported in `AuthScreen.js` but unused elsewhere. Marking a medicine as taken, triggering an emergency SMS, and deleting a contact all deserve haptic confirmation.

*Fix:* Add `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` on primary confirmation actions.

**Health Score progress bar inaccessible to screen readers**
`DashboardScreen.js` — the animated `<View>` progress bar

The numeric score is visible but the bar has no `accessibilityRole="progressbar"` or `accessibilityValue`.

*Fix:*
```jsx
<View
  accessibilityRole="progressbar"
  accessibilityValue={{ min: 0, max: 100, now: healthScore }}
  accessibilityLabel={`Health score ${healthScore} out of 100`}
/>
```

---

### 3. App Performance — Needs Improvement (55 / 100)

**What's working well**

- `useCallback` and `useMemo` are used correctly for `calculateHealthScore`, `bmiData`, and `nextDoseStatus`.
- Firestore `onSnapshot` listeners are correctly cleaned up on unmount.
- A `PerformanceMonitor` utility exists — rare and commendable in an indie project.

**Problems found**

**Multiple independent Firestore listeners for identical data**
`DashboardScreen.js`, `MedicinesTab.js`, `AppointmentsTab.js`

Dashboard opens listeners for `medicines` AND `appointments`. MedicinesTab opens another for `medicines`. AppointmentsTab opens another for `appointments`. At runtime: 4–6 simultaneous listeners reading the same documents. Every write triggers 2–3 independent snapshot callbacks. This inflates Firestore read billing and risks race conditions between stale states.

*Fix:* Create a `DataContext` that opens exactly one listener per collection and distributes data via context.

**Pulse animation loop runs unconditionally and leaks on early return**
`DashboardScreen.js` — `useEffect` with `[]` dependency

The pulse `Animated.loop` starts immediately on mount regardless of whether there are any due medicines. More critically, when `loading === true` the component returns early, but the cleanup function `() => pulse.stop()` is part of the same effect that started the loop — if the component unmounts during loading, the loop may not be stopped before the early return path is rendered.

*Fix:* Start the pulse animation only after `loading` is false and only when `nextDoseStatus?.isDue` is true.

**`onRefresh` is a fake no-op**
`DashboardScreen.js` — `onRefresh` callback

```js
await new Promise(resolve => setTimeout(resolve, 1000)); // does nothing
```

The real Firestore listeners are already live — pull-to-refresh does not re-fetch anything. Users get a 1-second spinner with no actual data update.

*Fix:* In a `DataContext` model, expose a `refetch()` method that cancels and re-subscribes the listeners. Or at minimum, call `getDoc` imperatively to force a server fetch.

**AI fetch calls are not cancellation-safe**
`DashboardScreen.js` — `fetchAIFact` in `useEffect([], [])`

If the user navigates away before the Gemini response resolves, `setRandomFact` and `setAIFactSource` are still called on an unmounted component.

*Fix:*
```js
useEffect(() => {
  let mounted = true;
  fetchAIFact().then(result => {
    if (mounted) setRandomFact(result);
  });
  return () => { mounted = false; };
}, []);
```

**`MedicineDoseStatus` renders every 5 minutes via interval**
`screens/MedicinesTab.js`

Every `MedicineDoseStatus` card runs `setInterval(() => setNow(new Date()), 300000)`. With 10 medicines, that's 10 timers all triggering re-renders simultaneously every 5 minutes. This pattern also stores a `Date` object in state, which always creates a new reference.

*Fix:* Lift the clock tick to a single top-level context or use a shared `useNow()` hook.

**12 large PNG avatar files statically bundled**
`screens/ProfileScreen.js` — `getAvatarSource` switch

All 12 PNGs (60–97 KB each, ~900 KB total) are `require()`d unconditionally. They inflate the initial app bundle for all users regardless of gender selection.

*Fix:* Convert to WebP (saves ~35%), and load only the selected avatar lazily. Host on Firebase Storage CDN for remote delivery.

---

### 4. Code Quality — Good (68 / 100)

**What's working well**

- Folder structure (`screens/`, `components/`, `context/`, `services/`, `utils/`, `theme/`) is well-organised.
- `Logger.js` and `PerformanceMonitor.js` are professional additions rarely seen in solo projects.
- Root-level `ErrorBoundary` is correctly implemented.
- `friendlyErr()` in `AuthScreen.js` maps all Firebase error codes to user-friendly strings.

**Problems found**

**Gemini fetch pattern copy-pasted 4 times** *(see Priority 5 above)*

**`AppTabs` and `MainStack` defined inside `AppContent` render**
`App.js` — lines ~50–100

Defining navigator components inline inside a parent component means they are re-created on every render. React Navigation treats new component references as new screens, which causes unmount/remount — losing scroll positions, local state, and cached data.

*Fix:*
```js
// Move OUTSIDE AppContent and AppTabs
function AppTabs() { ... }
function MainStack() { ... }
function AppContent() { ... }
```

**`ProfileScreen.js` is 69 KB / ~1,800 lines**

Handles: profile display, editing, avatar selection, unit switching, date picker, dropdown menus, delete account modal, and theme toggling — all in one file.

*Fix:* Split into `ProfileHeader`, `HealthInfoSection`, `EditProfileModal`, `DeleteAccountModal`, and `AvatarPickerModal`.

**`getAvatarSource` uses a 12-arm switch instead of a map**
`screens/ProfileScreen.js`

```js
// Current — verbose and error-prone
switch (key) {
  case 'male1': return require('../assets/avatars/male1.png');
  ...
}

// Better — declarative and extensible
const AVATAR_MAP = {
  male1: require('../assets/avatars/male1.png'),
  male2: require('../assets/avatars/male2.png'),
  // ...
};
export const getAvatarSource = (key) => AVATAR_MAP[key] ?? AVATAR_MAP.male1;
```

**Unused dependencies in `package.json`**

`@react-navigation/drawer` and `@react-navigation/material-top-tabs` are installed but no drawer or top-tab navigator appears in the app code. These add to bundle size and upgrade maintenance surface.

*Fix:* Run `npx depcheck` and remove unused packages.

---

### 5. Navigation & User Flow — Good (74 / 100)

**What's working well**

- `RootNavigation.js` with `navigationRef` correctly enables imperative navigation from notification handlers.
- Notification tap routing in `App.js` navigates to the correct medicine/appointment with params.
- Stack + Tab composition is clean and logical.

**Problems found**

**`AppTabs` defined inside render** *(see Code Quality — causes unmount/remount on auth change)*

**Notification deep links use fragile 3-level nested params**
`App.js` — notification response listener

```js
navigationRef.current?.navigate('Main', {
  screen: 'Cabinet',
  params: { screen: 'Medicines', params: { highlightMedicine: data.medicineId } }
});
```

This is tightly coupled to the navigator hierarchy. A future rename or restructure silently breaks notification taps.

*Fix:* Use React Navigation's `Linking` config to declare deep link paths declaratively, then call `navigate` with a path string.

**Modal header uses back arrow instead of close button**
`screens/NotificationScreen.js` — presented as `modal`

`presentation: 'modal'` conventionally uses a `✕` close button on the trailing edge, not a `‹` back arrow. The current implementation shows a back arrow because `canGoBack()` returns true.

*Fix:* In the header options for modal screens, render a close icon button on the right and hide the default back button.

**No deep link URI scheme defined**
`app.json`

Without a `scheme` (e.g. `asizto://`), the app cannot be opened from emails, SMS, or other apps — common for health apps that send appointment reminders.

*Fix:* Add `"scheme": "asizto"` to `app.json` and configure React Navigation's `Linking`.

---

### 6. State Management — Needs Improvement (52 / 100)

**What's working well**

- `ThemeContext` is cleanly implemented with AsyncStorage persistence and system scheme detection.
- `useTheme()` has a graceful fallback that prevents crashes outside the provider.
- Firebase auth state is managed at the top level in `App.js`.

**Problems found**

**No shared data layer — listeners duplicated across screens** *(see Priority 4 above)*

**`AuthScreen.js` has 20+ `useState` declarations**
`screens/AuthScreen.js`

The component tracks: email, password, firstName, lastName, phoneDigits, dob, gender, height, weight, bloodGroup, conditions, smoking, drinking, selectedAvatarKey, showDatePicker, signupOtp, loginOtp, signupCooldown, loginCooldown, sendingSignupOtp, sendingLoginOtp, isLoading, errors, banner, checkingEmail, emailTaken, direction, loginStep, signupStep, isLogin. This is 28 separate state values, making the state machine invisible and hard to test.

*Fix:* Use `useReducer` with typed actions (`SET_FIELD`, `NEXT_STEP`, `SET_ERROR`, `RESET`). The reducer becomes the explicit state machine for the auth flow.

**`sectionLoading` is never reset on refresh**
`DashboardScreen.js` — `onRefresh` callback

`onRefresh` resets `refreshing` to `false` after a fake timeout, but never resets `sectionLoading`. The gate condition `!sectionLoading.profile && !sectionLoading.medicines && !sectionLoading.appointments` is never re-entered, so a refresh never re-triggers `calculateHealthScore` or `setLoading(false)`.

*Fix:* Call `setSectionLoading({ profile: true, medicines: true, appointments: true })` at the start of `onRefresh`, then let the existing `onSnapshot` callbacks drive it back to false naturally.

---

### 7. Error Handling & Edge Cases — Good (70 / 100)

**What's working well**

- Root `ErrorBoundary` generates unique error IDs and provides a retry mechanism.
- Firebase auth errors are mapped to human-readable messages via `friendlyErr()`.
- Firestore listener errors are individually caught per data type with fallback states.
- The Gemini API has a multi-model fallback chain.
- Toast messages provide non-blocking feedback for success/failure states.

**Problems found**

**"Next appointment" shown without sorting**
`DashboardScreen.js` — `const nextAppointment = appointments[0]`

The Firestore query on `appointments` has no `orderBy('date', 'asc')`. The "next" appointment could be one that already passed months ago.

*Fix:*
```js
const apptQuery = query(
  collection(db, 'appointments'),
  where('userId', '==', userId),
  orderBy('date', 'asc'),
  where('date', '>=', new Date())
);
```

**Invalid medicine schedules silently skipped**
`DashboardScreen.js`, `MedicinesTab.js` — time parsing

When a medicine's `times` array contains an invalid date format, the code logs a warning and returns `null`, which is then filtered out. The user sees the medicine in their list but it never appears in the dose schedule or reminders — with no indication that anything is wrong.

*Fix:* Add a visible "schedule error" badge on the medicine card when its times cannot be parsed.

**`auth.currentUser` accessed directly in effects**
Multiple screens

Several `useEffect` hooks access `auth.currentUser` directly. During sign-out, `onAuthStateChanged` fires and the navigator switches to the auth stack — but in-flight effects may still execute against a now-null `currentUser`, causing silent crashes.

*Fix:* Derive a `userId` from React state (not from `auth.currentUser` directly) and guard all effects with `if (!userId) return`.

**OTP has no brute-force protection**
`services/emailService.js` — `verifyOTP`

There is no attempt counter on OTP documents. A determined attacker could iterate all 900,000 possible 6-digit codes via the Firestore SDK.

*Fix:* Add an `attempts` counter to the OTP document and block after 5 failed attempts (or handle server-side in a Cloud Function).

---

### 8. Security — Critical Issue (34 / 100)

> This section is the most urgent. The app stores sensitive health data including medications, diagnoses, emergency contacts, and location. All three critical issues below must be addressed before production release.

**Critical: OTP verified client-side**
`services/emailService.js`

The OTP is stored in plain text in a Firestore document readable by the creating user. The client fetches it, compares it locally, and proceeds. An attacker can bypass email verification by reading the document directly.

*Fix:* Move `verifyOTP` entirely to a Firebase Cloud Function. The client sends the entered code; the function reads and compares it server-side and returns only success/failure.

**Critical: Gemini API key exposed in client bundle**
`screens/DashboardScreen.js`, `screens/ChatbotScreen.js`

`react-native-dotenv` inlines environment variables at build time into the JavaScript bundle. The compiled APK/IPA contains the key in plain text, extractable with standard tooling.

*Fix:* Create a `/api/gemini` endpoint (Vercel or Firebase Functions) that holds the key server-side. The app calls your endpoint; your endpoint calls Gemini.

**Critical: No Firestore security rules**

Without rules, any authenticated user can read or write any document in any collection — including other users' medicines, appointments, and emergency contacts.

*Fix:* See the `firestore.rules` example in Priority 3 above.

**Dangerous Android permissions declared unnecessarily**
`android/app/src/main/AndroidManifest.xml`

- `SYSTEM_ALERT_WINDOW` — allows drawing over other apps. Not needed for any feature in this app. Remove immediately.
- `WRITE_EXTERNAL_STORAGE` — deprecated on Android 10+ (API 29+). Use scoped storage APIs via `expo-image-picker` instead.
- `RECORD_AUDIO` — declared but no audio recording feature is visible in the codebase. Remove if unused.

**Emergency contacts stored without encryption**
`Firestore collection: emergencyContacts`

Phone numbers are stored as plain strings in Firestore. For a health app, consider field-level encryption for PII, or at minimum document in your privacy policy what data is stored.

---

### 9. Scalability — Needs Improvement (56 / 100)

**What's working well**

- Firebase + Expo is a horizontally scalable stack for the data layer.
- `@env` environment variable separation is a good pattern.
- `NotificationManager.js` correctly abstracts scheduling logic into a utility.

**Problems found**

**Firestore listeners grow linearly with screens** *(see State Management)*

Every new screen that needs medicine or appointment data adds another listener. This model does not scale past a handful of screens.

**Health score recalculates on every Firestore update**
`DashboardScreen.js` — `useEffect` watching `sectionLoading`

`calculateHealthScore` is a pure function that runs synchronously on the JS thread whenever any of `medicines`, `userProfile`, or `appointments` changes. As the data grows, this becomes heavier.

*Fix:* Move health score calculation to a Firebase Cloud Function triggered on writes, and store the result as a field on the user document.

**Chatbot has no conversation history limit**
`screens/ChatbotScreen.js`

The full message array is passed to Gemini on every turn. At 50+ messages the prompt will exceed the model's context window and begin returning errors.

*Fix:* Keep the last N messages (e.g. 20) and prepend a system summary: `"Previous conversation summary: [...]"`.

**All avatar assets bundled at build time**

Adding more avatar options inflates the initial download for all users.

*Fix:* Host avatars on Firebase Storage and load them as remote URIs. Cache with `expo-image` for offline access.

**Large screen files with no code splitting**

`AuthSteps.js` (31 KB), `AuthUI.js` (26 KB), `ProfileScreen.js` (69 KB), `ChatbotScreen.js` (40 KB), `DashboardScreen.js` (44 KB). None use `React.lazy`. On low-end Android devices, parsing this JS synchronously on cold start adds meaningful startup latency.

*Fix:* Split large screens into sub-components. Use `React.lazy` + `Suspense` for screens not on the critical path (chatbot, debug screens).

---

### 10. Platform Best Practices — Needs Improvement (60 / 100)

**What's working well**

- `SafeAreaView` from `react-native-safe-area-context` is used (not the deprecated RN built-in).
- `KeyboardAvoidingView` with `Platform.OS` conditional behavior is present.
- Portrait orientation is locked — appropriate for a health utility app.
- Android notification channels are set with correct importance levels.

**Problems found**

**Predictive back gesture disabled on Android 13+**
`android/app/src/main/AndroidManifest.xml`

```xml
android:enableOnBackInvokedCallback="false"
```

This disables the predictive back gesture introduced in Android 13, which is a regression from modern Android UX standards. React Navigation 7 supports predictive back.

*Fix:* Set to `true` and test gesture navigation across all screens.

**`windowSoftInputMode="adjustResize"` is deprecated**
`android/app/src/main/AndroidManifest.xml`

This attribute is deprecated from Android API 30+ and conflicts with edge-to-edge rendering. The `KeyboardAvoidingView` already in the codebase handles keyboard avoidance correctly.

*Fix:* Remove `windowSoftInputMode` from the manifest and rely on `KeyboardAvoidingView`.

**Missing iOS permission strings**
`app.json` (not found)

`expo-image-picker` is a dependency, implying profile photo support. On iOS this requires `NSPhotoLibraryUsageDescription` and potentially `NSCameraUsageDescription` in `app.json`. Without them the app crashes on permission request.

*Fix:*
```json
{
  "expo": {
    "plugins": [
      ["expo-image-picker", {
        "photosPermission": "Asizto needs photo access to set your profile picture.",
        "cameraPermission": "Asizto needs camera access to take a profile photo."
      }]
    ]
  }
}
```

**Header logo width is platform-hacked**
`components/customHeader.js`

```js
width: Platform.OS === 'ios' ? 150 : 140,
```

This is a magic number workaround. The logo should be properly sized for its container using `maxWidth` and `resizeMode="contain"` within a `flex: 1` center view.

**No `GestureHandlerRootView` wrapper**
`App.js`

`react-native-gesture-handler` is a declared dependency, but `<GestureHandlerRootView style={{ flex: 1 }}>` does not appear at the app root. Without it, gestures may silently fail on Android.

*Fix:*
```jsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <AppContent />
          <Toast />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
```

---

## Recommended Refactor Roadmap

### Phase 1 — High Impact (Do this sprint)
- [ ] Create `DataContext` with single Firestore listener set
- [ ] Extract `callGemini()` utility
- [ ] Move `AppTabs` and `MainStack` outside render functions
- [ ] Add `orderBy('date', 'asc')` to appointment queries
- [ ] Fix cancellation-unsafe AI fetch calls with mounted refs
- [ ] Add `accessibilityValue` to Health Score progress bar

### Phase 2 — Quality (Next sprint)
- [ ] Split `ProfileScreen.js` into sub-components
- [ ] Replace 12-arm avatar switch with a lookup map
- [ ] Convert avatar PNGs to WebP
- [ ] Add empty-state UI to MedicinesTab and AppointmentsTab
- [ ] Add first-run onboarding flow
- [ ] Remove unused npm packages (`@react-navigation/drawer`, etc.)
- [ ] Replace `CardGap` component with inline spacing tokens

### Phase 3 — Polish & Scale (Ongoing)
- [ ] Add `React.lazy` code splitting for non-critical screens
- [ ] Move health score calculation to a Cloud Function
- [ ] Add chatbot history limit (last 20 messages)
- [ ] Add long-press progress ring to SOS button
- [ ] Add haptic feedback to health-critical actions
- [ ] Define a URI scheme in `app.json` for deep links
- [ ] Load avatars from Firebase Storage CDN

---

