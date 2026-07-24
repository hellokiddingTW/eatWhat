# EatWhat Live Location and Marker Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed demo coordinate with a one-shot high-accuracy device location and display always-visible label bubbles for the user and active restaurant.

**Architecture:** A small location service wraps `expo-location`, returns typed results, and deduplicates concurrent requests. `HomeScreen` owns location UI state and passes only real coordinates into the existing platform-specific map previews. Native uses custom marker children; Web adds non-interactive Google Maps overlay labels above the existing two markers.

**Tech Stack:** Expo 57, React Native 0.86, TypeScript 6, `expo-location`, `react-native-maps`, Google Maps JavaScript API, Node test runner.

## Global Constraints

- Request `Location.Accuracy.Highest` once on mount and again only after an explicit refresh or retry.
- Never start continuous or background location tracking.
- Never fall back to the existing Taipei demo coordinate.
- Concurrent refresh calls must share one in-flight location request.
- Keep only two map points: the current user and active restaurant.
- The user bubble must always read `現在位置`.
- The restaurant bubble must always match the active restaurant name.
- Marker points and bubbles remain non-interactive.
- Keep existing mock restaurant distances until Google Places/API integration.
- Preserve the existing ignored Google Maps API key setup.

---

### Task 1: High-Accuracy Location Service

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.config.js`
- Create: `src/location/currentLocation.ts`
- Create: `src/location/currentLocation.test.ts`

**Interfaces:**
- Consumes: Expo `requestForegroundPermissionsAsync()` and `getCurrentPositionAsync()`.
- Produces: `createCurrentLocationRequester(client?): () => Promise<CurrentLocationResult>`.
- Produces: `CurrentLocationResult` with `ready`, `permissionDenied`, and `error` variants.

- [x] **Step 1: Install and configure foreground location**

Run:

```bash
npx expo install expo-location
```

Update `app.config.js` so the plugin list includes:

```js
[
  'expo-location',
  {
    locationWhenInUsePermission:
      '允許 EatWhat 使用你的位置，以尋找附近仍在營業的餐廳。',
  },
]
```

Keep `./plugins/withGoogleMaps` in the same plugin list. Do not configure
background location.

- [x] **Step 2: Write failing location-service tests**

Create `src/location/currentLocation.test.ts`:

```ts
/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createCurrentLocationRequester,
  type LocationClient,
} from './currentLocation';

const grantedClient = (overrides: Partial<LocationClient> = {}): LocationClient => ({
  requestForegroundPermission: async () => ({ granted: true }),
  getHighestAccuracyPosition: async () => ({
    coords: {
      latitude: 25.0478,
      longitude: 121.5319,
      accuracy: 8,
    },
  }),
  ...overrides,
});

describe('createCurrentLocationRequester', () => {
  it('returns the current app coordinate and reported accuracy', async () => {
    const request = createCurrentLocationRequester(grantedClient());

    assert.deepEqual(await request(), {
      status: 'ready',
      coordinate: { lat: 25.0478, lng: 121.5319 },
      accuracyMeters: 8,
    });
  });

  it('returns permissionDenied without requesting a position', async () => {
    let positionCalls = 0;
    const request = createCurrentLocationRequester(
      grantedClient({
        requestForegroundPermission: async () => ({ granted: false }),
        getHighestAccuracyPosition: async () => {
          positionCalls += 1;
          throw new Error('must not run');
        },
      }),
    );

    assert.deepEqual(await request(), { status: 'permissionDenied' });
    assert.equal(positionCalls, 0);
  });

  it('returns error when the current position cannot be obtained', async () => {
    const request = createCurrentLocationRequester(
      grantedClient({
        getHighestAccuracyPosition: async () => {
          throw new Error('location unavailable');
        },
      }),
    );

    assert.deepEqual(await request(), { status: 'error' });
  });

  it('shares one in-flight request and allows a later refresh', async () => {
    let positionCalls = 0;
    let releasePosition: (() => void) | undefined;
    const request = createCurrentLocationRequester(
      grantedClient({
        getHighestAccuracyPosition: async () => {
          positionCalls += 1;
          await new Promise<void>((resolve) => {
            releasePosition = resolve;
          });
          return {
            coords: { latitude: 25, longitude: 121, accuracy: 6 },
          };
        },
      }),
    );

    const first = request();
    const second = request();
    assert.equal(first, second);
    await Promise.resolve();
    await Promise.resolve();
    releasePosition?.();
    await first;
    assert.equal(positionCalls, 1);

    const third = request();
    await Promise.resolve();
    await Promise.resolve();
    releasePosition?.();
    await third;
    assert.equal(positionCalls, 2);
  });
});
```

- [x] **Step 3: Run the tests and verify RED**

Run:

```bash
npm test -- src/location/currentLocation.test.ts
```

Expected: FAIL because `src/location/currentLocation.ts` does not exist.

- [x] **Step 4: Implement the location service**

Create `src/location/currentLocation.ts`:

```ts
import * as Location from 'expo-location';
import type { Restaurant } from '../types/restaurant';

export type LocationClient = {
  requestForegroundPermission: () => Promise<{ granted: boolean }>;
  getHighestAccuracyPosition: () => Promise<{
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
    };
  }>;
};

export type CurrentLocationResult =
  | {
      status: 'ready';
      coordinate: Restaurant['location'];
      accuracyMeters?: number;
    }
  | { status: 'permissionDenied' }
  | { status: 'error' };

const expoLocationClient: LocationClient = {
  requestForegroundPermission: Location.requestForegroundPermissionsAsync,
  getHighestAccuracyPosition: () =>
    Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    }),
};

export const createCurrentLocationRequester = (
  client: LocationClient = expoLocationClient,
) => {
  let inFlight: Promise<CurrentLocationResult> | undefined;

  return () => {
    inFlight ??= (async () => {
      try {
        const permission = await client.requestForegroundPermission();
        if (!permission.granted) {
          return { status: 'permissionDenied' } as const;
        }

        const position = await client.getHighestAccuracyPosition();
        return {
          status: 'ready',
          coordinate: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          ...(position.coords.accuracy === null
            ? {}
            : { accuracyMeters: position.coords.accuracy }),
        } as const;
      } catch {
        return { status: 'error' } as const;
      }
    })().finally(() => {
      inFlight = undefined;
    });

    return inFlight;
  };
};
```

- [x] **Step 5: Verify GREEN and type safety**

Run:

```bash
npm test -- src/location/currentLocation.test.ts
npx tsc --noEmit
```

Expected: all location tests pass and TypeScript exits with code 0.

- [x] **Step 6: Commit**

```bash
git add package.json package-lock.json app.config.js src/location/currentLocation.ts src/location/currentLocation.test.ts
git commit -m "Add one-shot current location service"
```

---

### Task 2: Home-Screen Location State and Refresh

**Files:**
- Create: `src/location/locationViewState.ts`
- Create: `src/location/locationViewState.test.ts`
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `createCurrentLocationRequester()` and `CurrentLocationResult`.
- Produces: `LocationViewState`, `beginLocationRequest()`, and `applyLocationResult()`.
- Produces: a header refresh button and real permission/error retry states.

- [x] **Step 1: Write failing state-transition tests**

Create `src/location/locationViewState.test.ts`:

```ts
/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyLocationResult,
  beginLocationRequest,
  INITIAL_LOCATION_STATE,
} from './locationViewState';

describe('location view state', () => {
  it('uses loading for the first request', () => {
    assert.deepEqual(beginLocationRequest(INITIAL_LOCATION_STATE), {
      status: 'loading',
      isRefreshing: true,
    });
  });

  it('keeps a ready coordinate visible while refreshing', () => {
    assert.deepEqual(
      beginLocationRequest({
        status: 'ready',
        coordinate: { lat: 25, lng: 121 },
        accuracyMeters: 7,
        isRefreshing: false,
      }),
      {
        status: 'ready',
        coordinate: { lat: 25, lng: 121 },
        accuracyMeters: 7,
        isRefreshing: true,
      },
    );
  });

  it('stores a successful coordinate and clears refreshing', () => {
    assert.deepEqual(
      applyLocationResult(INITIAL_LOCATION_STATE, {
        status: 'ready',
        coordinate: { lat: 25.1, lng: 121.5 },
        accuracyMeters: 9,
      }),
      {
        status: 'ready',
        coordinate: { lat: 25.1, lng: 121.5 },
        accuracyMeters: 9,
        isRefreshing: false,
      },
    );
  });

  it('does not retain a fake coordinate after denial or error', () => {
    assert.deepEqual(
      applyLocationResult(INITIAL_LOCATION_STATE, {
        status: 'permissionDenied',
      }),
      { status: 'permissionDenied', isRefreshing: false },
    );
    assert.deepEqual(
      applyLocationResult(INITIAL_LOCATION_STATE, { status: 'error' }),
      { status: 'error', isRefreshing: false },
    );
  });
});
```

- [x] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- src/location/locationViewState.test.ts
```

Expected: FAIL because `src/location/locationViewState.ts` does not exist.

- [x] **Step 3: Implement the state transitions**

Create `src/location/locationViewState.ts`:

```ts
import type { Restaurant } from '../types/restaurant';
import type { CurrentLocationResult } from './currentLocation';

export type LocationViewState =
  | { status: 'loading'; isRefreshing: boolean }
  | {
      status: 'ready';
      coordinate: Restaurant['location'];
      accuracyMeters?: number;
      isRefreshing: boolean;
    }
  | { status: 'permissionDenied'; isRefreshing: false }
  | { status: 'error'; isRefreshing: false };

export const INITIAL_LOCATION_STATE: LocationViewState = {
  status: 'loading',
  isRefreshing: false,
};

export const beginLocationRequest = (
  state: LocationViewState,
): LocationViewState =>
  state.status === 'ready'
    ? { ...state, isRefreshing: true }
    : { status: 'loading', isRefreshing: true };

export const applyLocationResult = (
  _state: LocationViewState,
  result: CurrentLocationResult,
): LocationViewState => {
  if (result.status === 'ready') {
    return { ...result, isRefreshing: false };
  }

  return { status: result.status, isRefreshing: false };
};
```

- [x] **Step 4: Verify the state tests pass**

Run:

```bash
npm test -- src/location/locationViewState.test.ts
```

Expected: all state-transition tests pass.

- [x] **Step 5: Connect the state to `HomeScreen`**

In `src/screens/HomeScreen.tsx`:

1. Remove `DemoStatus`, `DEMO_STATUSES`, `DEMO_USER_LOCATION`, `demoStatus`,
   and the visible demo-state bar.
2. Create one requester for the component lifetime:

```ts
const requestCurrentLocation = useMemo(
  () => createCurrentLocationRequester(),
  [],
);
const [locationState, setLocationState] = useState<LocationViewState>(
  INITIAL_LOCATION_STATE,
);

const refreshLocation = useCallback(async () => {
  setLocationState(beginLocationRequest);
  const result = await requestCurrentLocation();
  setLocationState((current) => applyLocationResult(current, result));
}, [requestCurrentLocation]);

useEffect(() => {
  void refreshLocation();
}, [refreshLocation]);
```

3. Change the header location control into a `Pressable` with
   `accessibilityLabel="重新取得目前位置"`, disable it while
   `locationState.isRefreshing`, and show `ActivityIndicator` while refreshing.
4. Render `StateMessage` for initial loading, permission denial, and location
   error before rendering the map or restaurant list.
5. Pass `locationState.coordinate` to `MapPreview` only when status is `ready`.
6. Keep the existing radius selection, active restaurant behavior, and mock
   distance values.

Use these exact messages:

```tsx
<StateMessage title="正在取得目前位置..." />
<StateMessage
  title="需要定位才能搜尋附近餐廳"
  actionLabel="重新開啟定位"
  onAction={refreshLocation}
/>
<StateMessage
  title="暫時無法取得目前位置，請稍後再試"
  actionLabel="重新整理"
  onAction={refreshLocation}
/>
```

- [x] **Step 6: Verify the full app tests and typecheck**

Run:

```bash
npm test
npx tsc --noEmit
```

Expected: all tests pass and TypeScript exits with code 0.

- [x] **Step 7: Commit**

```bash
git add src/location/locationViewState.ts src/location/locationViewState.test.ts src/screens/HomeScreen.tsx
git commit -m "Use current location on the home screen"
```

---

### Task 3: Always-Visible Marker Bubbles

**Files:**
- Create: `src/components/MapMarkerBubble.tsx`
- Create: `src/services/googleMapsLabelOverlay.ts`
- Modify: `src/components/MapPreview.native.tsx`
- Modify: `src/components/MapPreview.web.tsx`
- Modify: `src/components/MapPreview.tsx`
- Modify: `src/services/googleMapsWeb.ts`

**Interfaces:**
- Consumes: `MapPreviewProps.userLocation` and `activeRestaurant`.
- Produces: native `MapMarkerBubble` for custom marker children.
- Produces: `createGoogleMapsLabelOverlay()` for Web DOM overlays.

- [x] **Step 1: Add the native bubble component**

Create `src/components/MapMarkerBubble.tsx` with props:

```ts
type MapMarkerBubbleProps = {
  color: string;
  label: string;
};
```

Render a fixed-layout `View` containing, from top to bottom:

```tsx
<View pointerEvents="none" style={styles.container}>
  <View style={styles.label}>
    <Text numberOfLines={1} style={styles.labelText}>
      {label}
    </Text>
  </View>
  <View style={styles.pointer} />
  <View style={[styles.dot, { backgroundColor: color }]} />
</View>
```

Use a white bubble, `#16202a` text, `maxWidth: 132`, `fontSize: 11`,
`borderRadius: 6`, a subtle border/shadow, and an 18-pixel circular point with a
white border.

- [x] **Step 2: Use native marker children**

Replace the two pin-color markers in `MapPreview.native.tsx` with:

```tsx
<Marker
  anchor={{ x: 0.5, y: 1 }}
  coordinate={toMapCoordinate(userLocation)}
  tappable={false}
  tracksViewChanges={false}
>
  <MapMarkerBubble color="#2563eb" label="現在位置" />
</Marker>
```

and:

```tsx
<Marker
  anchor={{ x: 0.5, y: 1 }}
  coordinate={toMapCoordinate(restaurantLocation)}
  key={activeRestaurant.id}
  tappable={false}
  tracksViewChanges={false}
>
  <MapMarkerBubble color="#ef4444" label={activeRestaurant.name} />
</Marker>
```

Keying the restaurant marker by `activeRestaurant.id` ensures each active
selection mounts fresh native marker content while keeping
`tracksViewChanges={false}`.

- [x] **Step 3: Add the Web label overlay**

Create `src/services/googleMapsLabelOverlay.ts`. Export:

```ts
export type GoogleMapsLabelOverlay = {
  setLabel: (label: string) => void;
  setPosition: (position: google.maps.LatLngLiteral) => void;
  setMap: (map: google.maps.Map | null) => void;
};

export const createGoogleMapsLabelOverlay = (
  OverlayView: typeof google.maps.OverlayView,
  LatLng: typeof google.maps.LatLng,
  options: {
    color: string;
    label: string;
    map: google.maps.Map;
    position: google.maps.LatLngLiteral;
  },
): GoogleMapsLabelOverlay => {
  class LabelOverlay extends OverlayView {
    private readonly element = document.createElement('div');
    private position = options.position;

    constructor() {
      super();
      Object.assign(this.element.style, {
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        transform: 'translate(-50%, -100%)',
        whiteSpace: 'nowrap',
      });
      this.setLabel(options.label);
    }

    setLabel(label: string) {
      this.element.replaceChildren();

      const bubble = document.createElement('div');
      bubble.textContent = label;
      Object.assign(bubble.style, {
        maxWidth: '132px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        border: '1px solid #d8e0e8',
        borderRadius: '6px',
        background: '#ffffff',
        color: '#16202a',
        font: '800 11px system-ui, sans-serif',
        padding: '5px 8px',
        boxShadow: '0 4px 10px rgba(15, 23, 42, 0.18)',
      });

      const dot = document.createElement('div');
      Object.assign(dot.style, {
        width: '18px',
        height: '18px',
        boxSizing: 'border-box',
        border: '3px solid #ffffff',
        borderRadius: '50%',
        background: options.color,
        boxShadow: '0 3px 8px rgba(15, 23, 42, 0.28)',
        marginTop: '5px',
      });

      this.element.append(bubble, dot);
    }

    setPosition(position: google.maps.LatLngLiteral) {
      this.position = position;
      this.draw();
    }

    onAdd() {
      OverlayView.preventMapHitsAndGesturesFrom(this.element);
      this.getPanes()?.floatPane.appendChild(this.element);
    }

    draw() {
      const point = this.getProjection().fromLatLngToDivPixel(
        new LatLng(this.position),
      );
      if (point) {
        this.element.style.left = `${point.x}px`;
        this.element.style.top = `${point.y}px`;
      }
    }

    onRemove() {
      this.element.remove();
    }
  }

  const overlay = new LabelOverlay();
  overlay.setMap(options.map);
  return overlay;
};
```

- [x] **Step 4: Expose `OverlayView` from the Google loader**

Extend `GoogleMapsWebLibraries` in `src/services/googleMapsWeb.ts`:

```ts
OverlayView: google.maps.MapsLibrary['OverlayView'];
LatLng: google.maps.CoreLibrary['LatLng'];
```

Return it from the existing maps library:

```ts
OverlayView: mapsLibrary.OverlayView,
LatLng: coreLibrary.LatLng,
```

Do not add another Google library request.

- [x] **Step 5: Synchronize Web markers and bubbles**

In `MapPreview.web.tsx`, keep the two existing circle markers. Add refs for two
`GoogleMapsLabelOverlay` instances.

After creating or moving the user marker:

```ts
userLabelRef.current ??= createGoogleMapsLabelOverlay(
  libraries.OverlayView,
  libraries.LatLng,
  {
    color: '#2563eb',
    label: '現在位置',
    map,
    position: userCoordinate,
  },
);
userLabelRef.current.setPosition(userCoordinate);
```

When the active restaurant changes, remove the previous restaurant overlay and
create a new one with `label: activeRestaurant.name`. Remove both overlays in
the component cleanup using `setMap(null)`.

The DOM snapshot must expose the exact text `現在位置` and the active restaurant
name within the map container.

- [x] **Step 6: Update the generic fallback preview**

In `MapPreview.tsx`, change the fixed user label from `你` to `現在位置` and
style both fallback labels as white compact bubbles above their colored dots.
This keeps unsupported platform resolution consistent with Web and native.

- [x] **Step 7: Verify types and all unit tests**

Run:

```bash
npm test
npx tsc --noEmit
```

Expected: all tests pass and TypeScript exits with code 0.

- [x] **Step 8: Commit**

```bash
git add src/components/MapMarkerBubble.tsx src/components/MapPreview.native.tsx src/components/MapPreview.web.tsx src/components/MapPreview.tsx src/services/googleMapsLabelOverlay.ts src/services/googleMapsWeb.ts
git commit -m "Label current and active map locations"
```

---

### Task 4: Browser and Three-Platform Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-24-eatwhat-live-location-marker-labels.md`

**Interfaces:**
- Consumes: the complete current-location and marker-label implementation.
- Produces: verified Web, iOS, and Android bundles with no credential changes.

- [ ] **Step 1: Verify successful browser geolocation**

Run the Web app:

```bash
npm run web -- --clear
```

In the in-app browser, grant location permission and verify:

- The initial fixed `25.033, 121.565` coordinate is not used.
- The map appears only after location resolves.
- `現在位置` is visible above the blue point.
- The active restaurant name is visible above the red point.
- Clicking a different restaurant card updates the red point and bubble.
- Clicking the header location button performs one new location request.
- No continuous geolocation watch is started.

- [ ] **Step 2: Verify denied browser geolocation**

Override browser geolocation permission to denied, reload, and verify:

- The map and restaurant list are withheld.
- `需要定位才能搜尋附近餐廳` is visible.
- `重新開啟定位` retries the permission/location flow.
- No demo coordinate appears.

- [ ] **Step 3: Run final automated verification**

Run:

```bash
npm test
npx tsc --noEmit
npm --prefix api test
npm --prefix api run typecheck
npx expo export --platform all --output-dir /private/tmp/eatwhat-live-location-final
git diff --check
```

Expected:

- App and API tests all pass.
- App and API typechecks exit with code 0.
- Web, Android, and iOS bundles export successfully.
- `git diff --check` produces no output.

- [ ] **Step 4: Scan for credential changes**

Run:

```bash
rg -n "AIza[0-9A-Za-z_-]{20,}" --hidden \
  --glob '!.env.local' \
  --glob '!node_modules/**' \
  --glob '!api/node_modules/**' .
```

Expected: no output. Keep `.env.local` ignored and unstaged.

- [ ] **Step 5: Mark this plan complete and commit**

Change every completed checkbox in this file to `[x]`, then run:

```bash
git add docs/superpowers/plans/2026-07-24-eatwhat-live-location-marker-labels.md
git commit -m "Complete live location marker labels"
```
