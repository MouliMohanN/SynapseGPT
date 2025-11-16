<!--
This file provides repository-specific guidance for AI coding agents (Copilot/GitHub Copilot
Coding Agent). Keep it concise and focused: describe the big-picture architecture,
developer workflows (build/test), project-specific conventions and examples that
help an automated agent make safe, useful edits.
-->

# Repo guide for automated coding agents

Short, actionable notes to get productive in ExploreRN (React Native app).

- Big picture
  - This is a React Native monorepo-style app (RN 0.80, React 19) with most app code under `src/`.
  - Features are grouped under `src/features/<feature-name>/` and each screen file follows a naming convention (see Conventions section).
  - Navigation is automatic: a build-time scanner generates `src/common/navigation/generated/screenRegistry.ts`. The app imports this registry via `src/common/navigation/index.tsx` and mounts all screens into a single `RootStack`.
  - Native projects for Android and iOS live under `android/` and `ios/`. Most CI/dev tasks use npm scripts in `package.json`.

- Key developer workflows (use these npm scripts)
  - Start Metro (dev server): `npm run start` (resets cache via `--reset-cache`).
  - Run on Android emulator/device: `npm run android`.
  - Run on iOS simulator: `npm run ios`.
  - Typecheck: `npm run ts:check` (calls `tsc -p . --noEmit`).
  - Run tests: `npm run test` (jest).
  - Lint: `npm run lint`.
  - Generate screens before start/build: `npm run screens:generate` (this is also run automatically via `prestart`).
  - Fast build and device install helpers exist: `npm run fast-build`, `npm run install-abi-apk`, and `npm run adb-install`.

- Project-specific conventions and patterns (important to follow)
  - Screen discovery: screen files must export a default React component and a named `screenConfig` object following `src/common/navigation/conventions.ts` (interface `ScreenConfig`). Files must be named `*Screen.tsx` or `*Screen.ts` and placed inside `src/features/**`.
    - Example: `src/features/animations/BottomSheetPaddingTopAnimationScreen.tsx` exports default component and `export const screenConfig: ScreenConfig = { name: 'BottomSheetPaddingTopAnimation', ... }`.
    - The scanner produces `src/common/navigation/generated/screenRegistry.ts` (auto-generated, do not edit). When adding a screen, run `npm run screens:generate`.
  - Grouping: the scanner assigns `group` based on folder structure under `src/features/<group>`; use this to keep related screens together.
  - Navigation: `src/common/navigation/index.tsx` builds `RootStackScreens` by combining `MainScreen` and the generated screens. Prefer editing `screenConfig.options` in the screen file when you need per-screen navigation options.
  - Event bus: a local event bus lives in `src/common/utils/eventBus/` and uses `AppEvents` for typed events. Use that pattern for cross-screen sparse events.
  - Logger: there's a logger abstraction in `src/common/utils/logger/` with `consoleLogger`, `fileLogger`, and `networkLogger`. Add loggers via `config/configManager.ts`.

- Integration points & third-party libs to be aware of
  - React Navigation stack: `@react-navigation/native-stack` and other `@react-navigation/*` packages are used. Look at `src/common/navigation` for wiring.
  - Bottom sheet: `@gorhom/bottom-sheet` (screens under `features/animations` use it).
  - Reanimated + worklets: `react-native-reanimated`, `react-native-worklets*` and `reanimated-tab-view` are present and used in tab screens.
  - Native build details: Android Gradle tasks live in `android/`; iOS workspace is under `ios/ExploreRN.xcodeproj` and `ExploreRN.xcworkspace`. Many npm scripts shell out to Gradle/xcodebuild—be careful editing these.

- Files to read first when changing behavior
  - Navigation & screen discovery: `src/common/navigation/conventions.ts`, `src/common/navigation/index.tsx`, `src/common/navigation/generated/screenRegistry.ts`.
  - App entry point: `src/App.tsx`. This file is the real app entry used by the project — it wraps the app in `GestureHandlerRootView`, mounts `NavigationContainer`, and creates a `RootStack.Navigator` using `ScreenNames.Main` as the initial route and the auto-generated `RootStackScreens` array to register screens.
    - Note: there is also a template `App.tsx` at the repo root (the RN template) — prefer `src/App.tsx` when changing navigation or app wiring.
  - Main UI container: `src/MainScreen.tsx` (app's main navigation landing page).
  - Utilities: `src/common/utils/*` (eventBus, logger, config manager).

- Safety rules for automated edits (apply these strictly)
  - Never edit generated files under `src/common/navigation/generated/`—instead change the source screen file and run `npm run screens:generate`.
  - If adding a new native dependency or changing native build scripts, include updated `package.json` and brief manual steps in a PR description (pod install, gradle sync). Do not attempt to run native builds locally unless CI guidance is present.
  - Preserve `screenConfig.name` values (these are developer-controlled route names and are referenced across the app).
  - When touching TypeScript types, run `npm run ts:check` to ensure no regressions.

- Quick examples for common agent tasks
  - Add a new screen: create `src/features/<group>/MyFeatureScreen.tsx` with default export component and `export const screenConfig: ScreenConfig = { name: 'MyFeature', component: MyFeatureScreen }`, then run `npm run screens:generate` and `npm run start`.
  - Change navigator option for a screen: update `screenConfig.options` inside the screen file (do not edit generated registry).
  - Find where a screen is referenced: search `SCREEN_NAMES` or use `getScreenConfig(name)` exported by the generated registry.

If anything here is unclear or you want more examples (tests, PR workflow, CI), tell me which area to expand and I'll iterate.
