### Learnings: Code Splitting and `React.lazy` in React Native (with Metro Bundler)

**1. What is Code Splitting and `React.lazy`?**
*   **Code Splitting:** A technique used by bundlers to break down a large JavaScript bundle into smaller "chunks" that can be loaded on demand. This improves application performance by reducing the initial load time.
*   **`React.lazy()`:** A React feature that allows you to render a dynamic `import()` as a regular component. It's the primary mechanism for implementing code splitting in React applications. Components wrapped with `React.lazy()` are only loaded when they are actually rendered.

**2. Expected Behavior of `React.lazy()`:**
When `React.lazy()` is used with dynamic `import()`, the expectation is that:
*   The JavaScript module for the lazy-loaded component is not included in the initial application bundle.
*   The module's code (including top-level statements and the component's render logic) is only downloaded and evaluated when the component is first rendered (e.g., when navigating to a screen).

**3. Metro Bundler's Behavior in React Native (Key Learning):**
Through this interaction, it was discovered that **Metro Bundler (version 0.82.5 in this project), by default, does NOT perform code splitting for `React.lazy()` in release (production) builds.**

*   **Development Builds:** Metro *does* support dynamic `import()` and may perform some form of code splitting in development for features like Hot Module Replacement (HMR) and faster rebuilds.
*   **Release Builds:** Despite using `React.lazy()` and dynamic `import()`, Metro bundles the *entire application* into a single JavaScript file (e.g., `index.android.bundle`). This means:
    *   All modules, including those intended for lazy loading, are part of the initial bundle.
    *   All top-level code within these modules is evaluated at application launch.

**4. Implications for `React.lazy()` in React Native Release Builds:**
*   **Module Evaluation:** If a `console.log()` or any other side effect is placed at the top-level of a module intended for lazy loading, it will still execute at app launch in a release build because the module is part of the initial bundle and gets evaluated.
*   **Component Rendering:** `React.lazy()` still functions correctly in terms of *component rendering*. The component's function body (its JSX, state hooks, `useEffect` hooks) will only execute when the component is actually mounted and rendered by React Navigation.
*   **Performance Impact:** The primary performance benefit of `React.lazy()` (reducing initial bundle size and deferring module loading) is largely negated by Metro's default bundling behavior in release builds.

**5. Workarounds and Potential Solutions:**
*   **For Top-Level Side Effects:** To prevent unwanted execution at app launch, move any top-level `console.log()` statements or other side effects inside the component's function body or a `useEffect` hook. This ensures they only run when the component is actually rendered.
*   **For True Code Splitting in Release Builds:**
    *   **Custom Metro Configurations:** Investigate if there are experimental flags or advanced configurations within Metro that can enable true code splitting for release builds. This might involve modifying `metro.config.js` significantly.
    *   **Third-Party Plugins:** Explore if any community-developed Metro plugins exist that specifically add code splitting capabilities for release builds.
    *   **Alternative Bundlers:** For projects with very strict code splitting requirements, some developers opt for more complex setups involving alternative bundlers like Webpack, though this is not a common or straightforward path in React Native.

**6. Verification:**
*   **Bundle Inspection:** The most reliable way to verify code splitting is to manually inspect the contents of the generated release APK/IPA. Look for multiple JavaScript bundle files (chunks) in the `assets` directory. If only a single main bundle is present, code splitting is not occurring.
*   **Bundle Visualizers:** Tools like `react-native-bundle-visualizer` can help, but their compatibility and functionality can vary, as experienced during this interaction.
