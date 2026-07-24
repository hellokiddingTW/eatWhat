# EatWhat Google Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native mock map with a Google Maps view that displays only the user and active restaurant while keeping the current web fallback.

**Architecture:** `MapPreview.native.tsx` owns the native `react-native-maps` rendering, while the existing `MapPreview.tsx` remains the web/default fallback. A pure geometry helper converts app coordinates into a stable map region and is covered by Node tests. Expo dynamic config reads platform-specific keys from local environment variables.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript, `react-native-maps`, Node test runner, `tsx`

## Global Constraints

- Native iOS and Android builds must use `PROVIDER_GOOGLE`.
- The map displays only the user marker and active restaurant marker.
- Markers and the map are not interactive in the MVP.
- Web keeps the current fallback map.
- Google Maps API keys must not be committed.
- Android and iOS use separate environment variables and application identifiers.

---

### Task 1: Tested map geometry

**Files:**
- Create: `src/components/mapGeometry.ts`
- Create: `src/components/mapGeometry.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `MapCoordinate`, `MapRegion`, `toMapCoordinate(location)`, and `buildMapRegion(userLocation, restaurantLocation?)`
- Consumes: `{ lat: number; lng: number }` locations from the app restaurant model

- [x] **Step 1: Add a failing Node test**

Test that `buildMapRegion` centers between two coordinates, includes minimum deltas, and centers on the user when no restaurant is active.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- src/components/mapGeometry.test.ts`

Expected: FAIL because `mapGeometry.ts` does not exist.

- [x] **Step 3: Implement the geometry helper**

Use the midpoint for latitude/longitude, apply `1.8` padding to coordinate differences, and enforce minimum deltas of `0.008`.

- [x] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- src/components/mapGeometry.test.ts`

Expected: all map geometry tests pass.

### Task 2: Native Google map

**Files:**
- Create: `src/components/MapPreview.native.tsx`
- Modify: `src/components/MapPreview.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `activeRestaurant?: Restaurant` and `userLocation: { lat: number; lng: number }`
- Produces: a platform-specific `MapPreview` component with the existing action-bar behavior

- [x] **Step 1: Install the Expo-compatible map package**

Run: `npx expo install react-native-maps`

Expected: Expo installs the SDK-compatible version.

- [x] **Step 2: Add the native component**

Render `MapView` with `provider={PROVIDER_GOOGLE}`, a controlled region from `buildMapRegion`, disabled gestures, and two non-tappable markers.

- [x] **Step 3: Keep the fallback interface aligned**

Add the `userLocation` prop to the existing fallback and pass a temporary Taipei user coordinate from `HomeScreen`.

- [x] **Step 4: Run TypeScript**

Run: `npx tsc --noEmit`

Expected: exit code 0.

### Task 3: Secure Expo map configuration

**Files:**
- Create: `app.config.js`
- Create: `.env.example`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `GOOGLE_MAPS_ANDROID_API_KEY` and `GOOGLE_MAPS_IOS_API_KEY`
- Produces: Android package `com.nateyeh.eatwhat`, iOS bundle ID `com.nateyeh.eatwhat`, and `react-native-maps` plugin configuration

- [x] **Step 1: Add environment placeholders and ignore rules**

Track only `.env.example`; ignore real `.env` and `.env.*` files.

- [x] **Step 2: Add dynamic Expo config**

Merge `app.json`, set both application identifiers, and pass each key to the `react-native-maps` config plugin without logging key values.

- [x] **Step 3: Validate public Expo config**

Run: `npx expo config --type public`

Expected: config resolves with the package and bundle identifiers and does not print API key values.

- [x] **Step 4: Run full verification**

Run: `npm test && npx tsc --noEmit && npm --prefix api test && npm --prefix api run typecheck`

Expected: all tests and type checks pass.
