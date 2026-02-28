## 2026-02-28 - [Accessible Search Inputs & Header Navigation]
**Learning:** Icon-only buttons in React Native must have explicit `accessibilityRole="button"` and descriptive `accessibilityLabel` to be usable by screen readers. For searchable inputs, providing an inline 'Clear' button significantly improves micro-UX by allowing users to reset search state quickly without manual deletion.
**Action:** Always wrap search `TextInput` in a wrapper to accommodate a 'Clear' icon and ensure all interactive icons have ARIA-equivalent props.
