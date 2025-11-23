1. App performance metrics
	1. React native testing lib
	2. callstack reassure
	3. Meassure - Ex-Groww
2. ML kit for on device text transaltion
3. Expo migration - Expo custom plugin
4. RN app Automation 
	1. Best practices
	2. Use AI
	3. NodeJs script to write id's for the views/components
    4. Test Edit 1_1
5. App Security
	1. Reverse Engineering, smali - done
	2. Penitration Testing
	3. Uninstall modified apk
	4. Frida, Introspy, Exposed
	5. Mobile security framework (MobSf) 
	6. Quick Android Review kit (QARK) 
	7. Drozer 
	8. OWASP Mobile 
	9. How to secure API keys 
	10. Dexguard, enigma 
	11. sqlcipher to decompile encrypted dbs on mac   
	12. javascript obfuscation lib
	13. Wireshark, Charles proxy
6. SDK Implementation - RN app as .aar file in Android Native app
7. Explore UI Library, Integrate StoryBook vs Ladle.dev
8. Unistyles, ReStyle by shopify
	1. Unistyles LLM
9. AppCenter codepush Alternative
	1. There is one open source lib created by the Rajat's team - Check linkedIn and Github
	2. Expo Updates
	3. Research other libs or build own
10. Bundle splitting with Hermes enables
	1. Super app, Git submodules, Re-pack, Rs-pack, Module Federation
11. Spelling correction algorithm for Search results
12. React native skia 
13. React native typegpu
14. React native reanimated - Github private
15. TopHat by Shopify for testing 
16. react-scan lib, perf testing tool 
17. share code between RN and React web 
18. Light weight charts in Ionic 
19. App size optimization
	1. Enable bundle compression
	2. Remove un-used code and assets
20. MMKV secure storage and testing
21. react-native-nitro-sqlite 
22. Javascript signals seems performant than useState and removes useEffect
23. Expo native modules shared object
24. React native background task - How does it work under the hood
25. Automatic mocking API
26. Explore on dbs
	1. Deep dive into perf improvements
	2. indexing, FTS5, Virtual Table etc
	3. DB explorer/viewer
27. Widgets & actions
28. Use react hooks conditionally - use()
29. Static Hermes
30. Error boundary
	1. In this case upload the error logs automatically to server via Headless JS
31. React native sync engine
32. React native set preferred frame rate, seems like there is a library which handles Android, IOS, Gemini
33. Reanimated worklets multithreading
34. Callstack Liquid glass view for IOS
35. Interceptor Native modules
36. Add throttle for every pressable
37. React Native aar file in native Android app
38. React Navigation performance - Read the doc and release notes
	1. Enable screens, freeze on blur etc
		1. Anything off-screen don't render - flashlist, screen etc
	2. Remove un-necessary navigations within screen or tab
	3. Prefetch the API or DB data before screen navigation
		1. NavigationUtil.navigateTo(sreenName, screenParams)
		2. Examples available on Gemini and ChatGpt
			1. Preload with pressIn prop
			2. Suspense delay wrapper
	4. Screen transition library on X, on 4th OCT 2025
	5. React native screens Bottom tabs, IOS 26 support
39. Proto buffer POC
	1. Turbo/Nitro module for GRPC streaming for option chain 
40. Deeplink based navigation
41. TanStack query
42. Android and IOS profiling on Native side
	1. Perfetto on Android
43. ReactLynx
44. N8N and its alternatives. Workflow automation
45. Rules for AI agents
46. React Native Node API support
47. Use Skia for SVG instead of react native svg
48. Crashlytics logs for Javascript, source maps
49. React native Harnes lib for testing, X, noted on 4th OCT, lib releasing on 14th OCT
50. Moti by Fernando Rojo
51. Unstyled components
52. Atomic design
53. React docgen
54. React compiler marker VS Code extension
55. React Native server components
56. try/catch wrapper for promises, sync and async
57. React Native buoy - Dev Tool
58. VAPT
	1. Instead of manual code obfuscation, we can write a script that replaces random string to the class, method, variable name before making the release build
	2. Create a mapper for the random string vs actual string, will be useful while debugging crashes
59. Dynamic app events to broadcast LTP in the FlashList
	1. Tab focus events
60. We should have a reusable component, used when API fails and when the phone is not connected to internet - Check with Mehul, Samadhan once
61. In Explore RN
	1. 16kb support and edge to edge implementation
	2. Immersive view example like Gmail, status bar translucent, color change, predictive back behaviour, predictive back gesture
	3. Foldable phones support and Landscape, Android Portrait lock is deprecated
	4. CodegenConfig - ModuleProvider - JS Name for the module": "ObjC Module provider for the pure C++ TM - RN 0.79
	5. RN automation
	6. New architecture only API's in css introduced in 0.79
	7. IOS pre builds
	8. Element nodes - https://reactnative.dev/docs/element-nodes - 0.82
	9. Appearence.setColorScheme doesn't accept null/undefined instead use unspecified
	10. Measure App start up time
	11. React Native splash screen in wave vs boot splash
	12. Watchlist swipe card with Flashlist custom component
	13. Re-visit on Tab focused for Carousal tabs - For new UI the static naming with hook isn't going to be performant
	14. React native c++ library for file logging
	15. R8 vs Proguard
62. Implement code owners - gemini, 2nd week of OCT 2025
63. Container component to handle rendering null, loading and children
64. Dev tools to consider
	1. Scrcpy plus
	2. Leakenary
	3. Battery historian
	4. ADB enhanced
	5. Dev drawer
	6. Perfetto trace viewer
	7. Device frame generator
65. Revisit MMKV
66. Revisit React compiler 
	1. https://react.dev/learn/react-compiler
	2. Incremental usage, use specific dir, configuration options
67. Explore Github libraries
	1. https://github.com/shubhamguptadream11 - There are so many useful libs, code push fork too is available
68. React native Js obfuscation - Mostly Hermes is doing it for us
69. Strict mode Android and TypeScript RN
	1. For android specific check Substack app
70. Build a design system
	1. Supernova
71. Adaptive Layouts - Android developer blog
	1. Multiple window support
72. Medium.com
	1. Groww engineering team
	2. swmansaion
		1. New architecture - the tricky parts 1, 2, 3
	3. Blogs
		1. React native skeleton placeholder replacement with in house one. Bookmarked
73. Youtube
	1. Android developers
		1. Adaptive apss
		2. Material 3 customization
74. Play policy insights in Android studio and Android linting
	1. Google Play Integrity API
75. Daily 4 pm obsedian auto backup
76. Devlocity intelij plugin to profile gradle builds
77. On device AI note taking app
78. Zustand vs Redux - I kind of remember doing comparision with AI
79. Detour - deep linking tool - mail
80. Nitro vs c++ vs turbo benchmarking
81. crazy.rs native modules


Low Priority
1. useSyncExternalStore - Low priority


Abhijit
1. for keyvalue pair we can use mmkv and for other data we can use nitro sql library 
	1. By using wrapper and config we need to handle
	2. Drizzle ORM with SQL lite databse
2. Need to implement .env for qa, dev, uat, pre-prod, prod. 
3. Precompiled Ios built config. 
4. Use vision camera library for camera.
5. Permission for read write local stroage permission. 
6. Move properly created components like bottom sheet , tootltip , walkthrought etc to v1 folder and alias them instead of relative import
7. Keyboard controller -- Control each frame of the keyboard movement in react native. reference: [https://kirillzyusko.github.io/react-native-keyboard-controller/?s=08](https://kirillzyusko.github.io/react-native-keyboard-controller/?s=08) 
8. create custom input text that handles regex on native side
9. shimmer loader - Link shared need to check by doing poc js and ui trades and frame drop
10. Flashlist, flatlist ,legend list wrapper like bottom sheet
11. 


Mehul
1. Network layer for api call , for cahed data and with day caching also => Promise , callback, rx 
	1. Instead of working on network layer, Let API calls happen via hook from component
		1. This way, it's easy to replace the hook with other React Libraries like React Query, GraphQL etc.. in the future
		2. Let In-Memory, disk and network layer have the same contract and they should be easily replaceable by any other library
		3. If SQL querying is slow then pre load to temp In-Memory
		4. cache expiry, decide which api calls should be in-memory stored, get data from local storage and skip api call, get data from sql-lite storage and make the api call in background and refresh UI, 
		5. API core should be generic type, should accept predefined request/response types. If types not given show compilation error
		6. Fetch vs axios
		7. Support prefetching using temporary cache, once the api is resolved to the screen then clean the temporary cache immediately
		8. use isInitialRenderRef to control expensive utils computations on component re-renders
2. Re-useable components
3. Modal to screen conversion
4. App launch to home screen perf improvements
5. MMKV Encryption 
6. Check each file on Native android with old dev and add missing code
7. Implement MOM on Jenkins discussion - shared on Teams
	1. Few app defaults should be handled via jenkins. Ex. Splash screen time, few required API's response in json
8. Review and create proper utility for pubsub and touchline response


InProgress
1. Package upgradation
	1. Back button handler fix on Android 16
	2. React Native voice alternative library or custom module integration
2. let’s work on cleaning up the un-used files, assets using the scripts in the project. 
3. ⁠Clean up console log
4. ⁠Run prettier-write
5. ⁠Keep adding new console logs - Progressive

HOLD
1. Brotli compression
2. React native bundle visualizer

Done
1. Rxjs wrapper we need to create as we hanlding is only observable etc. - done by Mouli
2. CarousalTabs need to test in app in market screener section. - done by Abhijit, working fine
3. SafeareaView context poc -  done by Abhijit
4. Nitro Modules poc - done
5.  React 19 features
6. Javascript and typescript new features
7. in react 19 render issue is still present in react native
8. IOS setup for ExploreRN
9. Compound component pattern - Done, Implemented in BottomSheetHeader with Abhijit
10. Network logger needs to implemented either backed with file logging or sql lite. - Discussed with OM and finalized below
	1. Network logger is disabled on prod. 
	2. File logging and sharing is good enough
		1. Just make sure the logs are configured for auto deleted 
		2. Logs are sharable
        3. Test Edit 1_2
11. CarousalTabs in Screeners - Done. 
	1. Tried implementing in ScripViewDetail page, faced few challenges, later decided to implement during the new screens 
12. React Navigation performance - React.Lazy loading screens will have perf benefits on ReactJs web but doesn't have any perf benefits on React Native - POC done
13. Lazy import components within the screen and evaluate if it's worth it. Ex: Button component.
		1. Check if imports are executed multiple times
14. React Native 0.82, 81, ... Blogs and update to React Native 0.82
15. enableBundleCompression = true - bundle size reduced to 1.2mb from 2.7mb but there is slight delay in app launch due to bundle decompression
	1. Has no impact in the app download size from playstore as the compression is done by google while uploading the app to playstore and after download the bundle is decompressed. 
16. Debug optimised build on android - 0.82
17. Interop Layer - let's you run legacy architecture in new architecture - You'll still get warning to migrate to proper new architecture - not needed
18. 16 kb page support we need to do and edge to edge support in android 16. Bundle compression , 
19. LtpText - POC using EventBus
		1. Using compound design pattern
		2. Animated InputText - update the value via ref
		3. How to handle view background and text colour ?
20. Reference to a [FastDevBuild](/?doc=frontEnd%2FFastDevBuild.md) 