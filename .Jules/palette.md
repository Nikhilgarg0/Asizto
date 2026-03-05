## 2025-05-15 - [Platform-Specific Styling in React Native]
**Learning:** Adding web-only styles like `outlineStyle` directly to a common style object in React Native will cause errors or warnings on native platforms.
**Action:** Always use `Platform.select` to wrap platform-specific styles.

## 2025-05-15 - [Search Bar "Clear" Button Pattern]
**Learning:** Users expect an inline clear button in search bars. This requires a wrapper `View` with `relative` positioning and an `absolute` positioned button.
**Action:** Use the `searchInputWrapper` pattern with `Ionicons` "close-circle" for search inputs.
