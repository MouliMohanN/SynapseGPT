# 📱 Handling Safe Area Insets on iOS for Full-Screen Modals (React Native)

When building full-screen modals in React Native, it's important to ensure that your content respects the safe areas of the screen—especially on **iOS devices** with notches, home indicators, etc.

For **iOS only**, we use the `useSafeAreaInsets()` hook from the `react-native-safe-area-context` package. This is not needed for Android as of now, so we apply the safe area padding conditionally.

---

## ✅ Step-by-Step Implementation

### 1. Import Required Modules

```tsx
import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FullScreenModal = () => {
  const insets = useSafeAreaInsets();

  const iosSafeAreaPadding = Platform.select({
    ios: {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
    default: {},
  });

  return <View style={[styles.container, iosSafeAreaPadding]}>{/* Other modal content */}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default FullScreenModal;
```
