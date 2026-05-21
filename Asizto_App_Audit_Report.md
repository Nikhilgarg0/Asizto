# Asizto App — Expert-Level Code & Design Review

**Reviewed by:** Claude Sonnet 4.6  
**Date:** May 21, 2026  
**Stack:** React Native (Expo ~54), Firebase v12, React 19, Gemini API  
**Overall Score: 74 / 100 — Good foundation, several issues need attention before production**

---

## Executive Summary

Asizto is a health management app for the Indian market covering medicine tracking, appointments, emergency contacts, and an AI chatbot. The codebase shows clear evidence of a thoughtful developer: proper DataContext architecture, deep-link support, dark/light theming, skeleton loading screens, accessibility labels, and well-structured notification handling. However, several issues — a non-cryptographic OTP generator, exposed Gemini model identifiers, a 1,330-line God-component, duplicate Firestore listeners, and missing Firestore security rules — need to be resolved before a production launch.

---

## 1. UI Design

**Rating: Good**

### What's working
- Consistent green primary palette (`#83b271`) with a clear semantic color set (danger, warning, success) in `ThemeContext.js`.
- Dual-logo brandkit (`headerlogo_dark.png` / `headerlogo_light.png`) with proper `resizeMode="contain"` — no platform-specific hacks.
- Token system in `theme/tokens.js` covers spacing, radius, fontSize, and iconSize uniformly.
- Dark/light mode is fully implemented and persisted via AsyncStorage.

### Issues Found

**UI-1 — System font only (`tokens.js` line 6–10):**  
`fontFamily` is hardcoded to `'System'` for regular, semiBold, and bold. The comment says "swap to Nunito if loaded," but no custom font is loaded anywhere in `App.js`. This means the app uses San Francisco on iOS and Roboto on Android with no brand consistency. For a health app, typography is a major trust signal.

*Fix:* Load `@expo-google-fonts/nunito` or similar in `App.js` using `expo-font`, then update `tokens.js`:
```js
fontFamily: { regular: 'Nunito_400Regular', semiBold: 'Nunito_600SemiBold', bold: 'Nunito_700Bold' }
```



**UI-2 — Hard-coded BMI category colors in `ProfileScreen.js` (line ~96):**  
BMI colors (`#3b82f6`, `#22c55e`, etc.) are hardcoded hex values instead of using `colors.primary`, `colors.warning`, etc. These do not adapt to theme changes and clash with the green primary palette in dark mode.

*Fix:* Use theme tokens: `color: colors.primary` (normal), `colors.warning` (borderline), `colors.danger` (obese).

**UI-3 — `SafeAreaView` import inconsistency:**  
`EmergencyScreen.js` imports `SafeAreaView` from `react-native` (line 12) while `DashboardScreen.js` and `ProfileScreen.js` import it from `react-native-safe-area-context`. The `react-native` version does not respect bottom insets on notch-less Android devices.

*Fix:* Use `react-native-safe-area-context` `SafeAreaView` uniformly across all screens.

---

## 2. UX Design

**Rating: Good**

### What's working
- `OnboardingModal` component exists for first-run guidance.
- Toast messages with `react-native-toast-message` for feedback instead of raw `Alert`.
- Haptics integrated via `expo-haptics` with graceful try/catch fallback.
- Skeleton loading screen (`DashboardSkeleton`) avoids blank flash during data load.
- Step-based auth (`AuthSteps.js`) with stagger animations and directional slide transitions.
- Notification action buttons ("Mark Taken" / "Ignore") that work from the notification tray.

### Issues Found

**UX-1 — 5-step signup with no progress save:**  
`AuthScreen.js` has a 5-step onboarding flow (Account → Verify → Details → Health → Avatar). If the app crashes or the user exits after Step 3, they must start over from Step 1. There is no partial-save mechanism.

*Fix:* Persist completed steps to AsyncStorage and resume from the last completed step on re-open.

**UX-2 — No empty state UI in MedicinesTab or AppointmentsTab:**  
When a user has no medicines or appointments, the `FlatList` renders an empty screen with no visual prompt. This is the most common state for new users.

*Fix:* Add `ListEmptyComponent` to each `FlatList` with an illustration, headline, and a CTA button to add the first item.

**UX-3 — OTP resend cooldown only shown as a number:**  
The resend countdown is rendered as a plain number with no unit ("Resend in 45"). This is confusing without context.

*Fix:* Render "Resend in 45s" with the unit clearly visible.

**UX-4 — Emergency SOS flow has no confirmation dialog:**  
`EmergencyScreen.js` allows SMS dispatch to emergency contacts. A misfire (pocket dial) during a real emergency UX scenario is dangerous. There is a `deleteConfirmId` pattern for deletes but not for the SOS send.

*Fix:* Add a 2-second press-and-hold gesture or a single confirmation modal before dispatching SOS messages.

**UX-5 — Health score algorithm is opaque to the user:**  
`DashboardScreen.js` (line ~214) calculates a health score internally but never explains to the user how it is computed. This is especially important for a health app where users may make decisions based on it.

*Fix:* Add a "How is this calculated?" info icon that expands a brief explainer.

---

## 3. App Performance

**Rating: Good**

### What's working
- `DataContext.js` uses a single `onSnapshot` per collection — no duplicate reads across screens.
- `useNow` hook (`utils/useNow.js`) provides a single shared clock to avoid multiple `setInterval` instances.
- `useMemo` and `useCallback` are used correctly in `DashboardScreen.js` and `MedicinesTab.js`.
- `DashboardSkeleton` prevents layout shift during loading.
- Client-side appointment sorting avoids needing a Firestore composite index.

### Issues Found

**PERF-1 — DashboardScreen.js is 1,330 lines (God component):**  
This single file handles: health fact display, AI search, health score calculation, BMI display, next dose tracking, medicine mark-as-taken, keyboard animation, result panel animation, onboarding modal, and skeleton loading. This causes unnecessary re-renders: any state change (e.g., `isSearchFocused`) triggers the entire tree to re-evaluate.

*Fix:* Extract into sub-components: `HealthScoreCard`, `NextDoseWidget`, `AISearchPanel`, `HealthFactCard`. Each isolated component will only re-render when its own props change.

**PERF-2 — Gemini fallback iterates 10 model+version combinations sequentially:**  
`utils/gemini.js` iterates across 5 models × 2 API versions sequentially with `await fetch(...)` inside nested loops. On a bad network, this could run for 24+ seconds (3 retries × 8 seconds backoff) before surfacing an error, with no user-visible cancellation.

*Fix:* Add an `AbortController` that the component can trigger on unmount or user cancel. Surface a timeout error after a configurable deadline (e.g., 12 seconds).

**PERF-3 — `ProfileScreen.js` creates its own `onSnapshot` listener (line ~170):**  
ProfileScreen sets up `onSnapshot(doc(db, 'users', uid), ...)` independently, duplicating the profile listener already owned by `DataContext`. This means two live listeners to the same document simultaneously.

*Fix:* Remove ProfileScreen's own listener and consume `userProfile` from `useData()`.

**PERF-4 — Animated values created inside render cycle:**  
In `AuthUI.js` the `useStagger` hook creates `new Animated.Value(0)` inside `useRef(Array.from(...))`. While `useRef` prevents re-creation, the count argument is not stable between renders if passed as an expression. Verify that all `useRef(new Animated.Value(...))` calls are at the top level of the component, not inside conditionals.

---

## 4. Code Quality

**Rating: Good**

### What's working
- Consistent folder structure: `screens/`, `components/`, `context/`, `utils/`, `services/`, `theme/`.
- Custom `Logger` utility with log-level filtering, buffering, and per-domain methods.
- `PerformanceMonitor` utility for screen load timing.
- `ErrorBoundary` component with error ID generation and retry.
- Comments use consistent `// ─── section ───` delimiters for visual scanning.
- `RootNavigation.js` provides imperative navigation without prop-drilling.

### Issues Found

**CODE-1 — Avatar switch-case duplicated in two files:**  
`ProfileScreen.js` (line ~30) and `AuthUI.js` both define `getAvatarSource(key)` with an identical 12-case switch statement. This is the most obvious duplication in the codebase.

*Fix:* Move `getAvatarSource` to a shared `utils/avatars.js` and import it in both files.

**CODE-2 — `AuthScreen.js` (620 lines) manages too much state:**  
The auth screen owns signup step state, OTP state, login flow state, error state, loading state, and animation direction all in one component. The step components (`AuthSteps.js`) receive 15+ props each.

*Fix:* Extract an `useAuthFlow` custom hook to own the state machine logic, leaving `AuthScreen.js` as a pure rendering shell.

**CODE-3 — `fetchSignInMethodsForEmail` is deprecated:**  
`AuthScreen.js` (lines 17, 193, 280) uses `fetchSignInMethodsForEmail` from Firebase Auth. This method was deprecated in Firebase v9 and is slated for removal. It also has privacy implications (allows email enumeration).

*Fix:* Remove the pre-check; attempt `signInWithEmailAndPassword` directly and handle `auth/user-not-found` in the error handler — which is already implemented in `friendlyErr()`.

**CODE-4 — Inline styles throughout `AuthSteps.js`:**  
Auth step components use dense inline style objects (some over 10 properties long) directly in JSX. This makes the code hard to read and prevents style sharing between similar elements.

*Fix:* Move repeated styles into `StyleSheet.create()` blocks.

---

## 5. Navigation & User Flow

**Rating: Excellent**

### What's working
- Deep link config is thorough and maps all major screens (`asizto://dashboard`, `asizto://cabinet/medicines`, etc.).
- Modal screens have an explicit close button (✕) instead of a back arrow — correct UX convention.
- `RootNavigation.js` allows imperative navigation from notification handlers outside the React tree.
- Tab navigator is defined at module scope (`AppTabs`, `MainStack`) preventing re-creation on auth state changes.
- `navigation.canGoBack()` guard prevents orphaned back buttons.

### Issues Found

**NAV-1 — No `initialRouteName` on the Cabinet tab navigator:**  
`CabinetScreen.js` uses a nested tab navigator (Medicines / Appointments). Without an `initialRouteName`, React Navigation defaults to the first tab, but this is implicit. If tab order ever changes, the default silently shifts.

*Fix:* Explicitly set `initialRouteName="Medicines"` on the Cabinet tab navigator.

**NAV-2 — Highlight params not cleared after navigation:**  
Notification taps navigate to `MedicinesTab` with `highlightMedicine: data.medicineId`. If the user navigates away and returns, the highlight param persists in the route. This can cause a previously highlighted item to flash again unexpectedly.

*Fix:* Clear the highlight param after a timeout or on item press: `navigation.setParams({ highlightMedicine: null })`.

---

## 6. State Management

**Rating: Good**

### What's working
- `DataContext` is the single source of truth for all Firestore data — no prop drilling for medicines, appointments, or user profile.
- Per-collection loading and error flags (`loadingMeds`, `errorMeds`, etc.) allow granular UI states.
- `refetch()` correctly tears down and re-attaches listeners rather than duplicating them.
- Auth state drives listener lifecycle — listeners are cleanly torn down on sign-out.

### Issues Found

**STATE-1 — `ThemeContext` does not handle `Appearance` change events:**  
`ThemeContext.js` reads `useColorScheme()` once on mount and then overrides it with the stored preference. If the user has "Follow system" and changes their OS theme while the app is in the background, the app will not update until restart.

*Fix:* Subscribe to `Appearance.addChangeListener` in ThemeContext and update the theme if no user override is stored.

**STATE-2 — `DashboardScreen.js` has a local `loading` state shadowing the DataContext `loading`:**  
The dashboard declares `const [loading, setLoading] = useState(true)` (line 74) alongside `const { loading: dataLoading } = useData()`. The local flag is set to `false` in a `useEffect` that depends on `dataLoading`. This creates a race condition where the skeleton may disappear before data is actually rendered.

*Fix:* Remove the local `loading` state and drive skeleton display directly from `dataLoading`.

---

## 7. Error Handling & Edge Cases

**Rating: Good**

### What's working
- `ErrorBoundary` wraps the entire app with retry and error ID display.
- All Firestore listeners have both `onNext` and `onError` handlers in `DataContext`.
- `friendlyErr()` in `AuthScreen.js` maps all common Firebase Auth error codes to user-readable messages.
- `Gemini.js` implements exponential backoff across multiple model fallbacks.
- Notification response handler has a top-level `try/catch` with fallback navigation.

### Issues Found

**ERR-1 — `AddMedicineScreen.js` has no upper bound on `timesPerDay`:**  
`handleTimesPerDayChange` allows up to 5 times per day (line 35: `count <= 5`), but there is no validation that the user hasn't typed `50` — parseInt("50") passes `> 0` and `<= 5` is false, so `times` is cleared. However, a user typing `5a` gets `NaN` and an empty times array with no error message shown.

*Fix:* Show an inline validation message ("Enter a number between 1 and 5") when the parsed value is invalid, rather than silently clearing the times array.

**ERR-2 — No network connectivity detection:**  
The app makes Firestore and Gemini API calls with no offline state detection. On a flaky Indian mobile connection, failures silently surface as generic error states.

*Fix:* Use `NetInfo` from `@react-native-community/netinfo` to detect offline state and show a banner rather than triggering error states.

**ERR-3 — `callGemini` silently swallows empty responses:**  
In `gemini.js` (line ~57): if the API returns `200 OK` but `candidates[0].content.parts[0].text` is falsy, the code does `continue` and tries the next model. This means a valid but empty response from Gemini is treated as a failure and triggers unnecessary retries.

*Fix:* Log a warning and break the model loop on a successful 200 with an empty body, rather than continuing to retry.

---

## 8. Security

**Rating: Needs Improvement**

### What's working
- Firebase credentials loaded from `@env` (react-native-dotenv) — not hardcoded.
- `.gitignore` correctly excludes `.env`, `*.keystore`, `google-services-account.json`.
- OTP stored in Firestore with expiry timestamp — not in client memory only.
- `reauthenticateWithCredential` used before account deletion in `ProfileScreen.js`.

### Issues Found

**SEC-1 (Critical) — OTP generated with `Math.random()`:**  
`services/emailService.js` (line 9):
```js
const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));
```
`Math.random()` is a pseudo-random number generator, not a cryptographically secure one. On V8 (React Native's JS engine), its state can be predicted with sufficient observations. OTPs protecting account access must use a CSPRNG.

*Fix:* Generate the OTP server-side in your Vercel API route using Node.js `crypto.randomInt(100000, 999999)` and never return it to the client. The client should only submit what the user typed.

**SEC-2 (Critical) — No Firestore Security Rules visible:**  
The repository contains no `firestore.rules` file. Firebase projects default to "open" rules if rules were never set. Given that `medicines`, `appointments`, and `otp_verifications` collections store sensitive health data, this is the highest-priority security item.

*Fix:* Add `firestore.rules` with ownership checks:
```
match /medicines/{docId} {
  allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
}
```
Apply the same pattern for `appointments`, `emergencyContacts`, and `users`.

**SEC-3 — `GEMINI_API_KEY` exposed in the client bundle:**  
`DashboardScreen.js` (line 20) and `ChatbotScreen.js` import `GEMINI_API_KEY` from `@env`. This key is bundled into the JavaScript and is trivially extractable from a production APK/IPA using standard reverse-engineering tools. The Gemini API key grants unlimited usage billed to your account.

*Fix:* Proxy all Gemini calls through your existing Vercel backend. The key should only exist in your server environment variables, never in the mobile bundle.

**SEC-4 — OTP Firestore collection keyed by email address:**  
`emailService.js` uses `doc(db, 'otp_verifications', email)` as the document ID. This means any authenticated Firebase user (including attackers who created a valid account) can read or overwrite OTP documents for arbitrary email addresses if Firestore rules are not properly set (see SEC-2).

*Fix:* Key OTPs by a server-generated token, not the raw email, and enforce Firestore rules to block all client-side reads of the `otp_verifications` collection.

**SEC-5 — `fetchSignInMethodsForEmail` enables email enumeration:**  
(Also flagged in CODE-3.) Calling this before sign-in allows an attacker to enumerate which emails are registered in your Firebase project.

*Fix:* Remove the pre-check as described in CODE-3.

---

## 9. Scalability

**Rating: Good**

### What's working
- DataContext's listener pattern scales cleanly — adding new collections requires only adding a new `onSnapshot` block.
- `theme/tokens.js` provides a centralized token system that would support a design system expansion.
- Screen-level code splitting is implicit in React Native's bundler.
- The Vercel backend abstraction for email means the backend can be extended to proxy other API calls.

### Issues Found

**SCALE-1 — All medicines fetched without pagination:**  
`DataContext.js` queries all of a user's medicines with no `limit()`. A user with 100+ medicines (chronic conditions) will receive the entire collection on every app open.

*Fix:* For now, add `limit(50)` to the query and implement pagination in `MedicinesTab` with a "Load more" button. For real-time use cases, onSnapshot + limit requires careful cursor management.

**SCALE-2 — Client-side sorting of all appointments:**  
The appointment query fetches all records then sorts in JavaScript. This is fine for small datasets but will degrade for power users. A Firestore composite index on `(userId, date)` is the correct fix.

*Fix:* Add the composite index via the Firebase console and switch to server-side `orderBy('date', 'asc')`.

**SCALE-3 — No code splitting for the debug screen:**  
`App.js` (line 64) uses `require()` inside a conditional to lazy-load `DebugNotificationsScreen`. This is a good pattern, but the same approach should be applied to other heavy screens (Chatbot, Dashboard) using React.lazy + Suspense when Expo/Metro supports it.

**SCALE-4 — `healthFacts` object is 45 entries hardcoded in `DashboardScreen.js`:**  
As the app grows, content like health facts should live in a remote config (Firebase Remote Config or a CMS), not in source code.

---

## 10. Platform Best Practices

**Rating: Good**

### What's working
- `GestureHandlerRootView` correctly wraps the entire app.
- `KeyboardAvoidingView` with `Platform.OS === 'ios' ? 'padding' : 'height'` used correctly in form screens.
- Android notification channels created with proper importance levels.
- `hitSlop` on all header icon buttons for larger touch targets.
- `accessibilityLabel` and `accessibilityRole` on interactive elements in `customHeader.js`.
- Portrait-only orientation locked in `app.json`.
- `SafeAreaView` with `edges={['top']}` in the custom header.

### Issues Found

**PLAT-1 — No `accessibilityLabel` on most list items:**  
`MedicineDoseStatus` renders complex cards with multiple buttons ("Mark as Taken", delete) but provides no `accessibilityLabel` describing what medicine the button refers to. A screen reader user would hear "button, button, button" with no context.

*Fix:* Add `accessibilityLabel={`Mark ${medicine.name} as taken`}` and `accessibilityLabel={`Delete ${medicine.name}`}` to action buttons.

**PLAT-2 — Android back button not handled in multi-step auth:**  
On Android, pressing the hardware back button during the 5-step signup flow will pop the entire Auth stack rather than going to the previous step. The `BackHandler` is not intercepted in `AuthScreen.js`.

*Fix:* Add a `BackHandler.addEventListener('hardwareBackPress', handleBack)` in `AuthScreen.js` that decrements the step counter rather than navigating away.

**PLAT-3 — `LayoutAnimation` used without `UIManager.setLayoutAnimationEnabledExperimental` on Android:**  
`ProfileScreen.js` (line 12) imports `LayoutAnimation` from React Native. On Android (New Architecture), `LayoutAnimation` requires explicit enablement. With `newArchEnabled: true` in `app.json`, this may cause crashes on some Android versions.

*Fix:* Replace `LayoutAnimation` with `react-native-reanimated` animations (already a dependency) which work correctly with the New Architecture.

**PLAT-4 — `userInterfaceStyle: "light"` forces light status bar:**  
(Linked to UI-2.) The status bar will remain light-on-dark on iOS regardless of the user's chosen theme. Use `expo-status-bar`'s `<StatusBar style="auto" />` and set `userInterfaceStyle: "automatic"`.

---

## Overall Score Breakdown

| Area | Rating | Score |
|---|---|---|
| UI Design | Good | 7/10 |
| UX Design | Good | 7/10 |
| Performance | Good | 7/10 |
| Code Quality | Good | 7/10 |
| Navigation | Excellent | 9/10 |
| State Management | Good | 7/10 |
| Error Handling | Good | 7/10 |
| Security | Needs Improvement | 5/10 |
| Scalability | Good | 7/10 |
| Platform Practices | Good | 7/10 |
| **Total** | | **74 / 100** |

