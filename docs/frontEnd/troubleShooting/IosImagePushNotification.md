# 📷 Image Push Notification Integration (iOS)

**Target:** `ImageNotification` (Notification Service Extension)

---

## ✅ Step 1: Create a Notification Service Extension

1. Open your iOS project in **Xcode**.
2. Go to **File > New > Target**.
3. Select **Notification Service Extension** from the list.
4. Name it something like `ImageNotificationService`.
5. Xcode will create a new target with a file like `NotificationService.m` or `NotificationService.swift`, depending on the language.
6. Ensure the new target is added to your project.

---

## 🚫 Step 2: Remove Extension Files from "Copy Bundle Resources"

1. In Xcode, select the **ImageNotificationService** target.
2. Go to the **Build Phases** tab.
3. Expand the **Copy Bundle Resources** section.
4. Look for any **incorrectly included files**, such as:
   - `Info.plist` (from the extension)
5. **Select and remove** these items using the **“–”** button.

> 🔍 _The Notification Service Extension is a separate target and its resources should not be included in the main app or other targets._

---

## ⚙️ Step 3: Ensure `Info.plist` File is Generated

1. In Xcode, select the **ImageNotification** (Notification Service Extension) target.
2. Go to the **Build Settings** tab.
3. Scroll down to the **Packaging** section.
4. Locate the setting:
   - Generate Info.plist File Set it to YES.
