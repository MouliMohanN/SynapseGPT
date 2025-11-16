# LocalStorage Turbo Native Module - Implementation Guide

## Overview

This document explains the implementation of a LocalStorage Turbo Native Module for React Native's New Architecture, demonstrating how JSI (JavaScript Interface) enables direct, synchronous communication between JavaScript and native code.

**Project Version:** React Native 0.82.1 (New Architecture by default)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [How JSI Works](#how-jsi-works)
4. [Implementation Details](#implementation-details)
5. [Key Concepts](#key-concepts)
6. [FAQ](#faq)

---

## Architecture Overview

### The New Architecture Stack

```
┌─────────────────────────────────────┐
│     JavaScript Layer (TypeScript)   │
│   NativeLocalStorage.getItem('key') │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│         TurboModuleRegistry         │
│    (Module Discovery & Binding)     │
└──────────────┬──────────────────────┘
               │
               ↓
┌═════════════════════════════════════┐
║        JSI Layer (C++)              ║
║  NativeLocalStorageSpecJSI          ║
║  - Direct memory access             ║
║  - Zero serialization               ║
║  - Synchronous execution            ║
└═════════════┬═══════════════════════┘
               │
               ↓
┌─────────────────────────────────────┐
│    Platform-Specific Native Code    │
│                                     │
│  iOS: RCTNativeLocalStorage.mm     │
│  - Uses NSUserDefaults              │
│                                     │
│  Android: NativeLocalStorageModule.kt│
│  - Uses SharedPreferences           │
└─────────────────────────────────────┘
```

---

## File Structure

### TypeScript Specification

```
specs/
└── NativeLocalStorage.ts          # Type-safe interface definition
```

### iOS Implementation

```
ios/ExploreRN/NativeLocalStorage/
├── RCTNativeLocalStorage.h        # Objective-C++ header
└── RCTNativeLocalStorage.mm       # Implementation using NSUserDefaults
```

### Android Implementation

```
android/app/src/main/java/com/explorern/nativelocalstorage/
├── NativeLocalStorageModule.kt    # Kotlin implementation using SharedPreferences
└── NativeLocalStoragePackage.kt   # TurboReactPackage registration
```

### Auto-Generated Files (Codegen)

**iOS:**

```
ios/build/generated/ios/
├── NativeLocalStorageSpec/
│   ├── NativeLocalStorageSpec.h                    # Objective-C protocol
│   └── NativeLocalStorageSpec-generated.mm         # Protocol implementation
├── NativeLocalStorageSpecJSI.h                     # C++ JSI interface
└── NativeLocalStorageSpecJSI-generated.cpp         # JSI implementation
```

**Android:**

```
android/app/build/generated/source/codegen/
├── java/com/explorern/nativelocalstorage/
│   └── NativeLocalStorageSpec.java                 # Abstract base class
└── jni/
    ├── NativeLocalStorageSpec.h                    # C++ header
    ├── NativeLocalStorageSpecJSI.h                 # JSI interface
    └── NativeLocalStorageSpecJSI-generated.cpp     # JSI implementation
```

---

## How JSI Works

### 1. The JSI Bridge Creation

**iOS Entry Point:**

```objectivec++
// ios/ExploreRN/NativeLocalStorage/RCTNativeLocalStorage.mm

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {

  // This creates the JSI bridge that connects JS to native code
  return std::make_shared<facebook::react::NativeLocalStorageSpecJSI>(params);
}
```

**What this does:**

- Creates a C++ TurboModule instance
- Registers it with the JSI runtime
- Makes it accessible from JavaScript via `TurboModuleRegistry`

---

### 2. Auto-Generated JSI Layer

Codegen creates the C++ glue code that handles all JS ↔ Native communication.

**Example: `NativeLocalStorageSpecJSI-generated.cpp`**

```cpp
// Auto-generated host function for setItem
static jsi::Value __hostFunction_NativeLocalStorageCxxSpecJSI_setItem(
    jsi::Runtime &rt,              // JavaScript Runtime context
    TurboModule &turboModule,      // Your module instance
    const jsi::Value* args,        // JavaScript arguments
    size_t count) {                // Argument count

  // Call the native implementation
  static_cast<NativeLocalStorageCxxSpecJSI *>(&turboModule)->setItem(
    rt,
    args[0].asString(rt),  // Convert JS string → C++ jsi::String
    args[1].asString(rt)   // Convert JS string → C++ jsi::String
  );

  return jsi::Value::undefined();
}

// Method registration in constructor
NativeLocalStorageCxxSpecJSI::NativeLocalStorageCxxSpecJSI(
    std::shared_ptr<CallInvoker> jsInvoker)
  : TurboModule("NativeLocalStorage", jsInvoker) {

  // Map JavaScript method names to C++ host functions
  methodMap_["setItem"] = MethodMetadata {
    2,  // Number of parameters
    __hostFunction_NativeLocalStorageCxxSpecJSI_setItem
  };
  methodMap_["getItem"] = MethodMetadata {
    1,
    __hostFunction_NativeLocalStorageCxxSpecJSI_getItem
  };
  methodMap_["removeItem"] = MethodMetadata {
    1,
    __hostFunction_NativeLocalStorageCxxSpecJSI_removeItem
  };
  methodMap_["clear"] = MethodMetadata {
    0,
    __hostFunction_NativeLocalStorageCxxSpecJSI_clear
  };
}
```

---

### 3. The Complete Call Path

#### Synchronous Method: `getItem()`

```
┌──────────────────────────────────────────────────────┐
│ JavaScript:                                          │
│   const value = NativeLocalStorage.getItem('myKey') │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────┐
│ TurboModuleRegistry:                                 │
│   - Looks up "NativeLocalStorage" module             │
│   - Finds the JSI bridge                             │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────┐
│ JSI Runtime:                                         │
│   __hostFunction_..._getItem(rt, module, args, 1)   │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────┐
│ Type Conversion (bridging::callFromJs):              │
│   jsi::String → Platform String                      │
│     - iOS: jsi::String → NSString*                   │
│     - Android: jsi::String → java.lang.String        │
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────┐
│ Your Native Implementation:                          │
│   iOS: [RCTNativeLocalStorage getItem:@"myKey"]     │
│   Android: NativeLocalStorageModule.getItem("myKey")│
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────┐
│ Platform Storage API:                                │
│   iOS: [NSUserDefaults stringForKey:@"myKey"]       │
│   Android: SharedPreferences.getString("myKey", null)│
└────────────────────┬─────────────────────────────────┘
                     │
                     ↓
┌──────────────────────────────────────────────────────┐
│ Return Path (SYNCHRONOUS - returns immediately):     │
│   NSString*/String → jsi::String → JavaScript string │
└──────────────────────────────────────────────────────┘
```

---

### 4. Type Conversion via Bridging

The `bridging` namespace handles automatic type conversion:

```cpp
// From NativeLocalStorageSpecJSI.h
void setItem(jsi::Runtime &rt, jsi::String value, jsi::String key) override {
  static_assert(
      bridging::getParameterCount(&T::setItem) == 3,
      "Expected setItem(...) to have 3 parameters");

  return bridging::callFromJs<void>(
      rt,                    // JavaScript Runtime
      &T::setItem,          // Your native method pointer
      jsInvoker_,           // Thread/queue management
      instance_,            // Your module instance
      std::move(value),     // Converted JSI value
      std::move(key)        // Converted JSI value
  );
}
```

**What `bridging::callFromJs` does:**

1. Converts JSI types to native platform types
2. Invokes your native method on the correct thread
3. Converts return values back to JSI types
4. Handles errors and exceptions

---

## Implementation Details

### TypeScript Specification

**File:** `specs/NativeLocalStorage.ts`

```typescript
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setItem(value: string, key: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeLocalStorage');
```

**Key Points:**

- `extends TurboModule` - Marks this as a New Architecture module
- `TurboModuleRegistry.getEnforcing()` - Gets the module or throws if not found
- Return types determine sync vs async behavior
- `string | null` - Properly typed return value (synchronous)

---

### iOS Implementation

**Header:** `ios/ExploreRN/NativeLocalStorage/RCTNativeLocalStorage.h`

```objectivec++
#import <Foundation/Foundation.h>
#import <NativeLocalStorageSpec/NativeLocalStorageSpec.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTNativeLocalStorage : NSObject <NativeLocalStorageSpec>

@end

NS_ASSUME_NONNULL_END
```

**Implementation:** `RCTNativeLocalStorage.mm`

```objectivec++
#import "RCTNativeLocalStorage.h"

static NSString *const RCTNativeLocalStorageKey = @"local-storage";

@interface RCTNativeLocalStorage()
@property (strong, nonatomic) NSUserDefaults *localStorage;
@end

@implementation RCTNativeLocalStorage

- (id) init {
  if (self = [super init]) {
    _localStorage = [[NSUserDefaults alloc]
                      initWithSuiteName:RCTNativeLocalStorageKey];
  }
  return self;
}

// JSI Bridge Creation
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLocalStorageSpecJSI>(params);
}

- (NSString * _Nullable)getItem:(NSString *)key {
  return [self.localStorage stringForKey:key];
}

- (void)setItem:(NSString *)value key:(NSString *)key {
  [self.localStorage setObject:value forKey:key];
}

- (void)removeItem:(NSString *)key {
  [self.localStorage removeObjectForKey:key];
}

- (void)clear {
  NSDictionary *keys = [self.localStorage dictionaryRepresentation];
  for (NSString *key in keys) {
    [self removeItem:key];
  }
}

+ (NSString *)moduleName {
  return @"NativeLocalStorage";
}

@end
```

---

### Android Implementation

**Module:** `NativeLocalStorageModule.kt`

```kotlin
package com.explorern.nativelocalstorage

import android.content.Context
import android.content.SharedPreferences
import com.facebook.react.bridge.ReactApplicationContext

class NativeLocalStorageModule(reactContext: ReactApplicationContext) :
    NativeLocalStorageSpec(reactContext) {

    private val sharedPreferences: SharedPreferences = reactContext.getSharedPreferences(
        SHARED_PREFERENCES_NAME,
        Context.MODE_PRIVATE
    )

    override fun getName(): String = NAME

    override fun setItem(value: String, key: String) {
        sharedPreferences.edit().apply {
            putString(key, value)
            apply()
        }
    }

    override fun getItem(key: String): String? {
        return sharedPreferences.getString(key, null)
    }

    override fun removeItem(key: String) {
        sharedPreferences.edit().apply {
            remove(key)
            apply()
        }
    }

    override fun clear() {
        sharedPreferences.edit().apply {
            clear()
            apply()
        }
    }

    companion object {
        const val NAME = "NativeLocalStorage"
        private const val SHARED_PREFERENCES_NAME = "LocalStorage"
    }
}
```

**Package:** `NativeLocalStoragePackage.kt`

```kotlin
package com.explorern.nativelocalstorage

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class NativeLocalStoragePackage : TurboReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return if (name == NativeLocalStorageModule.NAME) {
            NativeLocalStorageModule(reactContext)
        } else {
            null
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
        return ReactModuleInfoProvider {
            mapOf(
                NativeLocalStorageModule.NAME to ReactModuleInfo(
                    NativeLocalStorageModule.NAME,
                    NativeLocalStorageModule.NAME,
                    false, // canOverrideExistingModule
                    false, // needsEagerInit
                    true,  // hasConstants
                    false, // isCxxModule
                    true   // isTurboModule
                )
            )
        }
    }
}
```

**Registration:** `MainApplication.kt`

```kotlin
import com.explorern.nativelocalstorage.NativeLocalStoragePackage

class MainApplication : Application(), ReactApplication {
    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = PackageList(this).packages.apply {
                add(NativeLocalStoragePackage())
            },
        )
    }
}
```

---

### Auto-Generated Spec

**Android:** `NativeLocalStorageSpec.java`

```java
package com.explorern.nativelocalstorage;

import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import javax.annotation.Nonnull;
import javax.annotation.Nullable;

public abstract class NativeLocalStorageSpec
    extends ReactContextBaseJavaModule implements TurboModule {

  public static final String NAME = "NativeLocalStorage";

  public NativeLocalStorageSpec(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public @Nonnull String getName() {
    return NAME;
  }

  @ReactMethod
  @DoNotStrip
  public abstract void setItem(String value, String key);

  @ReactMethod(isBlockingSynchronousMethod = true)
  @DoNotStrip
  public abstract @Nullable String getItem(String key);

  @ReactMethod
  @DoNotStrip
  public abstract void removeItem(String key);

  @ReactMethod
  @DoNotStrip
  public abstract void clear();
}
```

---

## Key Concepts

### 1. Synchronous vs Asynchronous Methods

#### Asynchronous (Default)

```typescript
// TypeScript spec - returns void
setItem(value: string, key: string): void;
```

```java
// Generated Java - no isBlockingSynchronousMethod
@ReactMethod
public abstract void setItem(String value, String key);
```

**Behavior:**

- Executed on a background thread
- Returns immediately without waiting
- Perfect for operations that don't need a return value

#### Synchronous (Return Value)

```typescript
// TypeScript spec - returns a value
getItem(key: string): string | null;
```

```java
// Generated Java - has isBlockingSynchronousMethod = true
@ReactMethod(isBlockingSynchronousMethod = true)
public abstract @Nullable String getItem(String key);
```

**Behavior:**

- Executed on the calling thread (usually JS thread)
- Blocks until completion
- Returns value immediately to JavaScript

---

### 2. Why `@ReactMethod(isBlockingSynchronousMethod = true)`?

Even though JSI enables synchronous calls, this annotation is still required because:

#### Without the annotation:

```
JavaScript: const value = NativeLocalStorage.getItem('key')
     ↓
JSI: Can execute synchronously (capability exists)
     ↓
TurboModule Runtime: No isBlockingSynchronousMethod flag
     ↓
Decision: Schedule on background thread (safe default)
     ↓
Result: Method runs async, return value is lost
     ↓
JavaScript: value = undefined ❌
```

#### With the annotation:

```
JavaScript: const value = NativeLocalStorage.getItem('key')
     ↓
JSI: Can execute synchronously (capability exists)
     ↓
TurboModule Runtime: isBlockingSynchronousMethod = true
     ↓
Decision: Execute NOW on current thread
     ↓
Result: Method runs synchronously, returns value
     ↓
JavaScript: value = "stored data" ✅
```

**The annotation is metadata that tells the TurboModule runtime:**

- Which thread to execute on
- Whether to wait for completion
- How to handle return values

---

### 3. JSI Benefits

#### No JSON Serialization

**Old Bridge:**

```javascript
// Everything converted to JSON
NativeModules.Storage.get('key', (jsonString) => {
  const data = JSON.parse(jsonString);
});
```

**JSI (Your Implementation):**

```javascript
// Direct type access, no serialization
const data = NativeLocalStorage.getItem('key');
```

#### Direct Memory Access

```cpp
// JSI works directly with runtime values
jsi::String value = args[0].asString(rt);
// No intermediate serialization step
```

#### Type Safety

```cpp
static_assert(
    bridging::getParameterCount(&T::setItem) == 3,
    "Expected setItem(...) to have 3 parameters"
);
```

Compile-time verification ensures type correctness.

#### Performance Comparison

| Operation            | Old Bridge         | JSI (New Architecture) |
| -------------------- | ------------------ | ---------------------- |
| Method Call Overhead | ~100-200μs         | ~1-5μs                 |
| Data Serialization   | JSON encode/decode | Direct memory access   |
| Type Conversion      | String-based       | Native types           |
| Synchronous Calls    | Not supported      | Fully supported        |
| Thread Hops          | Always async       | Can be synchronous     |

---

### 4. Codegen Configuration

**File:** `package.json`

```json
{
  "codegenConfig": {
    "name": "NativeLocalStorageSpec",
    "type": "modules",
    "jsSrcsDir": "specs",
    "android": {
      "javaPackageName": "com.explorern.nativelocalstorage"
    },
    "ios": {
      "modulesProvider": {
        "NativeLocalStorage": "RCTNativeLocalStorage"
      }
    }
  }
}
```

**What Codegen Generates:**

1. **iOS:**
   - `NativeLocalStorageSpec.h` - Objective-C protocol
   - `NativeLocalStorageSpecJSI.h` - C++ JSI interface
   - `NativeLocalStorageSpecJSI-generated.cpp` - JSI implementation
   - Method registration and bridging code

2. **Android:**
   - `NativeLocalStorageSpec.java` - Abstract base class
   - `NativeLocalStorageSpecJSI.h` - C++ JSI interface
   - `NativeLocalStorageSpecJSI-generated.cpp` - JSI implementation
   - JNI bindings

**Triggering Codegen:**

```bash
# iOS
cd ios && bundle exec pod install

# Android
cd android && ./gradlew generateCodegenArtifactsFromSchema
```

---

## FAQ

### Q: Is this only for New Architecture?

**A:** Yes. Turbo Native Modules require the New Architecture. In React Native 0.82+, New Architecture is enabled by default (`newArchEnabled=true`).

### Q: Can I use callbacks or Promises?

**A:** Yes, but it's not recommended when you can use synchronous returns. Example:

```typescript
// Prefer this (synchronous)
getItem(key: string): string | null;

// Over this (async)
getItem(key: string, callback: (value: string | null) => void): void;
```

### Q: What happens if I remove `isBlockingSynchronousMethod`?

**A:** The method will be scheduled on a background thread, and the return value will be lost when called synchronously from JavaScript.

### Q: Can I mix synchronous and asynchronous methods?

**A:** Yes! Your module demonstrates this:

- `getItem()` - Synchronous (returns value)
- `setItem()`, `removeItem()`, `clear()` - Asynchronous (no return value)

### Q: How do I debug JSI calls?

**A:**

1. Use native debuggers (Xcode, Android Studio)
2. Add logging in your native implementation
3. Use React Native's Performance Monitor
4. Check generated C++ code in build directories

### Q: Is JSI faster than the Old Bridge?

**A:** Significantly faster:

- Old Bridge: ~100-200μs per call + serialization overhead
- JSI: ~1-5μs per call with direct memory access

### Q: Can I use this with Expo?

**A:** Yes, but you'll need to use development builds or EAS Build. Managed workflow doesn't support custom native modules.

### Q: What about backwards compatibility?

**A:** React Native 0.82+ has New Architecture enabled by default. The Old Bridge is deprecated. This module only works with New Architecture.

---

## Summary

This LocalStorage Turbo Native Module demonstrates:

✅ **New Architecture (JSI)** - Direct JavaScript ↔ Native communication  
✅ **Zero Serialization** - No JSON encoding/decoding overhead  
✅ **Synchronous Calls** - Immediate return values  
✅ **Type Safety** - Compile-time verification  
✅ **Cross-Platform** - Same API for iOS and Android  
✅ **Auto-Generated Code** - Codegen handles all boilerplate  
✅ **Modern Platform APIs** - NSUserDefaults (iOS), SharedPreferences (Android)

The entire JSI layer is automatically generated by Codegen - you only write:

1. TypeScript specification
2. iOS native implementation
3. Android native implementation

React Native handles all the complex bridging, type conversion, and thread management! 🎉
