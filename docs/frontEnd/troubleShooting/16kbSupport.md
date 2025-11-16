# Upgrade and Update Instructions for Android Project

## 1. Upgrade Android Gradle Plugin (AGP)

- Upgrade AGP to version **8.5.1 or higher** to support latest build features and compatibility.

## 2. Update NDK Version

- Use **NDK r28 or higher** to ensure compatibility with recent Android system updates and native code builds.

## 3. Install Android 16 with Pre-Release Support

- Install **Android 16** with **pre-release 16KB page support** using the **v84 system image** for accurate testing and development.

## 4. Update SDKs and Libraries

- Ensure all Android SDK components and third-party libraries are updated to their latest versions for stability and compatibility.

---

## Native Modules Rebuild Requirements

| Native Module                | Needs Update/Rebuild? | Reason                                         |
| ---------------------------- | --------------------- | ---------------------------------------------- |
| react-native-mmkv            | ✅ Yes                | Prebuilt `.so` targets 4KB pages, needs 16KB   |
| react-native-sqlite-storage  | ✅ Yes                | Assumes 4KB mmap in older builds               |
| react-native-razorpay        | ✅ Yes                | Ships precompiled `.so`                        |
| react-native-fs, file-access | ✅ Yes                | May need rebuild if native I/O involved        |
| react-native-camera-kit      | ✅ Yes                | Large native footprint, native camera module   |
| @react-native-firebase/\*    | ⚠️ Maybe              | SDK updated regularly; check NDK compatibility |
| react-native-reanimated      | ✅ Optional           | Doesn’t break on 16KB but safer to rebuild     |

---

## 5. Pixel 9 with Android 15/16 Pre-release

- Use **Pixel 9 emulator/image with Android 15 or 16 pre-release**, including **16KB page size** support.
- Target **Google Play ARM64 v8a system image** for realistic ARM64 device testing.
