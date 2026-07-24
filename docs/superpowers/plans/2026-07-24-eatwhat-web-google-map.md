# EatWhat Web Google Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the localhost simulated map with a real Google Maps JavaScript API map that stays synchronized with the active restaurant.

**Architecture:** `MapPreview.web.tsx` owns browser rendering and uses a focused `googleMapsWeb.ts` service to initialize Google's official loader once. The component keeps one map instance, replaces only the restaurant marker when selection changes, and fits the user and restaurant into view. The existing native implementation is unchanged.

**Tech Stack:** Expo Web, React 19, TypeScript, Maps JavaScript API, `@googlemaps/js-api-loader`, `@types/google.maps`

## Global Constraints

- Web displays real Google map tiles on localhost.
- The map displays only the user marker and active restaurant marker.
- Markers and map gestures are disabled in the MVP.
- The active restaurant action still opens its Google Maps place page.
- `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` is never committed and is restricted by HTTP referrer.
- Missing or rejected credentials show a clear inline error state.

---

### Task 1: Web key validation

**Files:**
- Create: `src/config/googleMapsWebConfig.ts`
- Create: `src/config/googleMapsWebConfig.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `requireGoogleMapsWebApiKey(value?: string): string`
- Consumes: `process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`

- [x] **Step 1: Write the failing test**

```ts
assert.throws(() => requireGoogleMapsWebApiKey(undefined), /EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY/);
assert.equal(requireGoogleMapsWebApiKey(' web-key '), 'web-key');
```

- [x] **Step 2: Verify the test fails**

Run: `npm test -- src/config/googleMapsWebConfig.test.ts`

Expected: FAIL because `googleMapsWebConfig.ts` does not exist.

- [x] **Step 3: Implement the helper**

```ts
export const requireGoogleMapsWebApiKey = (value?: string) => {
  const apiKey = value?.trim();
  if (!apiKey) {
    throw new Error('Web Google Maps requires EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY.');
  }
  return apiKey;
};
```

- [x] **Step 4: Verify the test passes**

Run: `npm test -- src/config/googleMapsWebConfig.test.ts`

Expected: all web key tests pass.

### Task 2: Official loader and web map

**Files:**
- Create: `src/services/googleMapsWeb.ts`
- Create: `src/components/MapPreview.web.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `loadGoogleMapsWeb(apiKey): Promise<typeof google.maps>`
- Consumes: `MapPreviewProps`, `buildMapRegion`, and the validated web key

- [x] **Step 1: Install official packages**

Run: `npm install @googlemaps/js-api-loader && npm install --save-dev @types/google.maps`

Expected: both packages are recorded in the root package files.

- [x] **Step 2: Implement the one-time loader**

Call `setOptions({ key, v: 'weekly', language: 'zh-TW', region: 'TW', authReferrerPolicy: 'origin' })` once, then await `importLibrary('maps')` and `importLibrary('marker')`.

- [x] **Step 3: Implement the platform-specific component**

Create one `google.maps.Map` with all controls and gestures disabled. Draw one blue user circle marker and one red active-restaurant circle marker using non-clickable `google.maps.Marker` instances. Use `fitBounds` with bottom padding for two points and zoom `15` for a user-only map.

- [x] **Step 4: Preserve map action behavior**

Render the existing restaurant name, distance, and `Google Maps ↗` action over the map. Missing key or loader failure renders `無法載入 Google Maps，請檢查 Web API key 設定`.

- [x] **Step 5: Run TypeScript and tests**

Run: `npx tsc --noEmit && npm test`

Expected: exit code 0 and all tests pass.

### Task 3: Localhost verification

**Files:**
- Modify: `.env.local` (ignored)

**Interfaces:**
- Consumes: a user-provided Maps JavaScript API key
- Produces: visible Google map tiles at `http://localhost:8081`

- [x] **Step 1: Add the local variable entry**

```dotenv
EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY=
```

- [x] **Step 2: Verify the Web bundle**

Run: `npx expo export --platform web --output-dir /private/tmp/eatwhat-web-google-map`

Expected: Web bundle succeeds without importing `react-native-maps`.

- [x] **Step 3: Verify localhost behavior**

Open `http://localhost:8081`, confirm real Google tiles are visible, exactly two markers render, and selecting a different restaurant updates the red marker and action bar.

- [x] **Step 4: Run full regression verification**

Run: `npm test && npx tsc --noEmit && npm --prefix api test && npm --prefix api run typecheck`

Expected: all app and API tests and type checks pass.
