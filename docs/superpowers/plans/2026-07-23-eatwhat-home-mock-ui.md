# EatWhat Home Mock UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable EatWhat home screen using mock restaurant data.

**Architecture:** Keep this slice app-only. Define a shared `Restaurant` type, local mock data, small UI components, and a single `HomeScreen` that owns radius selection, active restaurant state, and demo status switching. The map is a lightweight visual placeholder for now, not a real map integration.

**Tech Stack:** Expo React Native, TypeScript, React state, React Native `StyleSheet`, `ScrollView`, `Pressable`, and `Linking`.

## Global Constraints

- Use Expo React Native and TypeScript.
- Default search radius is 3 km.
- Allow radius switching between 3 km, 5 km, and 10 km.
- Show only restaurants that are currently open.
- Sort restaurants by distance ascending.
- The map shows only the user's location and the active restaurant location.
- Map markers are not tappable.
- Tapping a restaurant card changes the active restaurant and does not open Google Maps.
- Tapping the map action bar opens the active restaurant's Google Maps place page.
- Restaurant metadata uses separate icon + pill items.
- Missing optional restaurant fields are hidden.
- Empty copy is `目前所選範圍內沒有營業餐廳，試試看擴大搜尋範圍`.
- Permission denied copy is `需要定位才能搜尋附近餐廳`.
- Error copy is `暫時無法取得附近餐廳，請稍後再試`.

---

## File Structure

- `App.tsx`: Replace the Expo starter screen with `HomeScreen`.
- `src/types/restaurant.ts`: Own the `Restaurant` and `SearchRadiusMeters` types.
- `src/data/mockRestaurants.ts`: Provide sorted mock restaurant data with optional cuisine types.
- `src/components/RadiusSelector.tsx`: Render the 3 km / 5 km / 10 km segmented control.
- `src/components/MapPreview.tsx`: Render the two-point placeholder map and Google Maps action bar.
- `src/components/RestaurantCard.tsx`: Render one restaurant card with icon + pill metadata.
- `src/components/StateMessage.tsx`: Render empty, permission denied, and error messages with optional actions.
- `src/screens/HomeScreen.tsx`: Compose the home screen, own demo state, radius filtering, and active restaurant selection.

## Task 1: Types And Mock Data

**Files:**
- Create: `src/types/restaurant.ts`
- Create: `src/data/mockRestaurants.ts`

**Interfaces:**
- Produces: `Restaurant`, `SearchRadiusMeters`, `SEARCH_RADII_METERS`, `mockRestaurants`.
- Consumes: No project-local interfaces.

- [ ] **Step 1: Create the shared restaurant types**

Create `src/types/restaurant.ts`:

```ts
export type SearchRadiusMeters = 3000 | 5000 | 10000;

export const SEARCH_RADII_METERS: SearchRadiusMeters[] = [3000, 5000, 10000];

export type Restaurant = {
  id: string;
  name: string;
  distanceMeters: number;
  isOpenNow: true;
  closingTimeText?: string;
  rating?: number;
  ratingCount?: number;
  address?: string;
  cuisineTypes?: string[];
  location: {
    lat: number;
    lng: number;
  };
  googleMapsUrl: string;
};
```

- [ ] **Step 2: Create sorted mock restaurants**

Create `src/data/mockRestaurants.ts`:

```ts
import type { Restaurant } from '../types/restaurant';

export const mockRestaurants: Restaurant[] = [
  {
    id: 'mock-mcdonalds-qq',
    name: '麥當勞 QQ店',
    distanceMeters: 420,
    isOpenNow: true,
    closingTimeText: '到 23:00',
    rating: 4.1,
    ratingCount: 1280,
    address: '台北市信義區松壽路 12 號',
    cuisineTypes: ['速食', '漢堡'],
    location: { lat: 25.0337, lng: 121.5651 },
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=麥當勞%20QQ店',
  },
  {
    id: 'mock-beef-noodle',
    name: '阿明牛肉麵',
    distanceMeters: 820,
    isOpenNow: true,
    closingTimeText: '到 21:30',
    rating: 4.5,
    ratingCount: 534,
    address: '台北市信義區莊敬路 88 號',
    cuisineTypes: ['牛肉麵', '中式'],
    location: { lat: 25.0319, lng: 121.5672 },
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=阿明牛肉麵',
  },
  {
    id: 'mock-curry',
    name: '小巷咖哩飯',
    distanceMeters: 1240,
    isOpenNow: true,
    closingTimeText: '到 22:00',
    rating: 4.3,
    ratingCount: 289,
    address: '台北市信義區吳興街 20 號',
    cuisineTypes: ['咖哩', '日式'],
    location: { lat: 25.0297, lng: 121.5618 },
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=小巷咖哩飯',
  },
  {
    id: 'mock-late-diner',
    name: '深夜食堂一號店',
    distanceMeters: 3520,
    isOpenNow: true,
    closingTimeText: '到 02:00',
    rating: 4.0,
    ratingCount: 91,
    cuisineTypes: ['宵夜', '台式'],
    location: { lat: 25.0411, lng: 121.5734 },
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=深夜食堂一號店',
  },
  {
    id: 'mock-ramen',
    name: '月見拉麵',
    distanceMeters: 6840,
    isOpenNow: true,
    rating: 4.6,
    ratingCount: 760,
    cuisineTypes: ['拉麵', '日式'],
    location: { lat: 25.0521, lng: 121.5488 },
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=月見拉麵',
  },
].sort((a, b) => a.distanceMeters - b.distanceMeters);
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: PASS with exit code 0.

## Task 2: Reusable UI Components

**Files:**
- Create: `src/components/RadiusSelector.tsx`
- Create: `src/components/RestaurantCard.tsx`
- Create: `src/components/MapPreview.tsx`
- Create: `src/components/StateMessage.tsx`

**Interfaces:**
- Consumes: `Restaurant`, `SearchRadiusMeters`, `SEARCH_RADII_METERS`.
- Produces: `RadiusSelector`, `RestaurantCard`, `MapPreview`, `StateMessage`.

- [ ] **Step 1: Create radius selector**

Create `src/components/RadiusSelector.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SEARCH_RADII_METERS, type SearchRadiusMeters } from '../types/restaurant';

type RadiusSelectorProps = {
  selectedRadius: SearchRadiusMeters;
  onSelectRadius: (radius: SearchRadiusMeters) => void;
};

const formatRadius = (radius: SearchRadiusMeters) => `${radius / 1000} km`;

export function RadiusSelector({ selectedRadius, onSelectRadius }: RadiusSelectorProps) {
  return (
    <View style={styles.container}>
      {SEARCH_RADII_METERS.map((radius) => {
        const isActive = radius === selectedRadius;

        return (
          <Pressable
            key={radius}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelectRadius(radius)}
            style={[styles.option, isActive && styles.optionActive]}
          >
            <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
              {formatRadius(radius)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  option: {
    flex: 1,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
  },
  optionActive: {
    backgroundColor: '#132235',
    borderColor: '#132235',
  },
  optionText: {
    color: '#384656',
    fontSize: 14,
    fontWeight: '700',
  },
  optionTextActive: {
    color: '#ffffff',
  },
});
```

- [ ] **Step 2: Create restaurant card**

Create `src/components/RestaurantCard.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Restaurant } from '../types/restaurant';

type RestaurantCardProps = {
  restaurant: Restaurant;
  isActive: boolean;
  onPress: () => void;
};

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

export function RestaurantCard({ restaurant, isActive, onPress }: RestaurantCardProps) {
  const cuisineText = restaurant.cuisineTypes?.join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[styles.card, isActive && styles.cardActive]}
    >
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.name}>{restaurant.name}</Text>
          {cuisineText ? <Text style={styles.cuisine}>{cuisineText}</Text> : null}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>營業中</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <MetaPill icon="⌖" label={formatDistance(restaurant.distanceMeters)} />
        {restaurant.closingTimeText ? <MetaPill icon="◷" label={restaurant.closingTimeText} /> : null}
        {restaurant.rating ? <MetaPill icon="★" label={restaurant.rating.toFixed(1)} /> : null}
      </View>
    </Pressable>
  );
}

function MetaPill({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
    padding: 14,
  },
  cardActive: {
    borderColor: '#132235',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  titleBlock: {
    flex: 1,
  },
  name: {
    color: '#16202a',
    fontSize: 16,
    fontWeight: '800',
  },
  cuisine: {
    marginTop: 4,
    color: '#7a8794',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 13,
    backgroundColor: '#dff7ea',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#167044',
    fontSize: 11,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  metaPill: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 13,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 9,
  },
  metaIcon: {
    color: '#132235',
    fontSize: 12,
    fontWeight: '900',
  },
  metaText: {
    color: '#465565',
    fontSize: 12,
    fontWeight: '700',
  },
});
```

- [ ] **Step 3: Create map preview**

Create `src/components/MapPreview.tsx`:

```tsx
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Restaurant } from '../types/restaurant';

type MapPreviewProps = {
  activeRestaurant?: Restaurant;
};

const formatDistance = (distanceMeters: number) => {
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

export function MapPreview({ activeRestaurant }: MapPreviewProps) {
  const openGoogleMaps = () => {
    if (activeRestaurant) {
      void Linking.openURL(activeRestaurant.googleMapsUrl);
    }
  };

  return (
    <View style={styles.map}>
      <View style={styles.gridLineVertical} />
      <View style={styles.gridLineHorizontal} />
      <View style={styles.route} />

      <View style={[styles.pin, styles.userPin]}>
        <View style={[styles.pinDot, styles.userDot]} />
        <Text style={styles.pinLabel}>你</Text>
      </View>

      {activeRestaurant ? (
        <View style={[styles.pin, styles.restaurantPin]}>
          <View style={[styles.pinDot, styles.restaurantDot]} />
          <Text style={styles.pinLabel} numberOfLines={1}>
            {activeRestaurant.name}
          </Text>
        </View>
      ) : null}

      {activeRestaurant ? (
        <Pressable accessibilityRole="link" onPress={openGoogleMaps} style={styles.actionBar}>
          <Text style={styles.actionTitle} numberOfLines={1}>
            {activeRestaurant.name} · {formatDistance(activeRestaurant.distanceMeters)}
          </Text>
          <Text style={styles.actionLink}>Google Maps ↗</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 218,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#edf5f2',
    marginBottom: 14,
  },
  gridLineVertical: {
    position: 'absolute',
    left: '34%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(42, 111, 151, 0.12)',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '44%',
    height: 1,
    backgroundColor: 'rgba(42, 111, 151, 0.12)',
  },
  route: {
    position: 'absolute',
    left: 92,
    top: 92,
    width: 152,
    borderTopWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(31, 86, 122, 0.4)',
    transform: [{ rotate: '-18deg' }],
  },
  pin: {
    position: 'absolute',
    alignItems: 'center',
    gap: 5,
    maxWidth: 112,
  },
  userPin: {
    left: 68,
    top: 112,
  },
  restaurantPin: {
    right: 54,
    top: 62,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  userDot: {
    backgroundColor: '#2563eb',
  },
  restaurantDot: {
    backgroundColor: '#ef4444',
  },
  pinLabel: {
    color: '#1d2a36',
    fontSize: 11,
    fontWeight: '800',
  },
  actionBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(209, 218, 228, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
  },
  actionTitle: {
    flex: 1,
    color: '#16202a',
    fontSize: 13,
    fontWeight: '800',
  },
  actionLink: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '800',
  },
});
```

- [ ] **Step 4: Create reusable state message**

Create `src/components/StateMessage.tsx`:

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';

type StateMessageProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function StateMessage({ title, actionLabel, onAction }: StateMessageProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 168,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d8e0e8',
    backgroundColor: '#ffffff',
    padding: 18,
  },
  title: {
    color: '#465565',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  button: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#132235',
    paddingHorizontal: 18,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
```

- [ ] **Step 5: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: PASS with exit code 0.

## Task 3: Home Screen Composition

**Files:**
- Create: `src/screens/HomeScreen.tsx`
- Modify: `App.tsx`

**Interfaces:**
- Consumes: `mockRestaurants`, `Restaurant`, `SearchRadiusMeters`, `RadiusSelector`, `MapPreview`, `RestaurantCard`, `StateMessage`.
- Produces: runnable mock home screen.

- [ ] **Step 1: Create home screen**

Create `src/screens/HomeScreen.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MapPreview } from '../components/MapPreview';
import { RadiusSelector } from '../components/RadiusSelector';
import { RestaurantCard } from '../components/RestaurantCard';
import { StateMessage } from '../components/StateMessage';
import { mockRestaurants } from '../data/mockRestaurants';
import type { SearchRadiusMeters } from '../types/restaurant';

type DemoStatus = 'success' | 'loading' | 'empty' | 'permissionDenied' | 'error';

const DEMO_STATUS: DemoStatus = 'success';

export function HomeScreen() {
  const [selectedRadius, setSelectedRadius] = useState<SearchRadiusMeters>(3000);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | undefined>(
    mockRestaurants[0]?.id,
  );

  const visibleRestaurants = useMemo(
    () => mockRestaurants.filter((restaurant) => restaurant.distanceMeters <= selectedRadius),
    [selectedRadius],
  );

  const activeRestaurant =
    visibleRestaurants.find((restaurant) => restaurant.id === activeRestaurantId) ??
    visibleRestaurants[0];

  const updateRadius = (radius: SearchRadiusMeters) => {
    setSelectedRadius(radius);
    const firstRestaurantForRadius = mockRestaurants.find(
      (restaurant) => restaurant.distanceMeters <= radius,
    );
    setActiveRestaurantId(firstRestaurantForRadius?.id);
  };

  const renderContent = () => {
    if (DEMO_STATUS === 'loading') {
      return <StateMessage title="正在搜尋附近營業中的餐廳..." />;
    }

    if (DEMO_STATUS === 'permissionDenied') {
      return <StateMessage title="需要定位才能搜尋附近餐廳" actionLabel="重新開啟定位" onAction={() => undefined} />;
    }

    if (DEMO_STATUS === 'error') {
      return <StateMessage title="暫時無法取得附近餐廳，請稍後再試" actionLabel="重新整理" onAction={() => undefined} />;
    }

    if (DEMO_STATUS === 'empty' || visibleRestaurants.length === 0) {
      return <StateMessage title="目前所選範圍內沒有營業餐廳，試試看擴大搜尋範圍" />;
    }

    return (
      <View style={styles.list}>
        {visibleRestaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            isActive={restaurant.id === activeRestaurant?.id}
            onPress={() => setActiveRestaurantId(restaurant.id)}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>附近還開著</Text>
            <Text style={styles.subtitle}>使用目前位置 · 距離最近優先</Text>
          </View>
          <View style={styles.locationButton}>
            <Text style={styles.locationIcon}>⌖</Text>
          </View>
        </View>

        <RadiusSelector selectedRadius={selectedRadius} onSelectRadius={updateRadius} />
        <MapPreview activeRestaurant={activeRestaurant} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{selectedRadius / 1000}km 內營業中</Text>
          <Text style={styles.sectionCount}>{visibleRestaurants.length} 間</Text>
        </View>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  title: {
    color: '#16202a',
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 5,
    color: '#627181',
    fontSize: 13,
    fontWeight: '600',
  },
  locationButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: '#132235',
  },
  locationIcon: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#16202a',
    fontSize: 18,
    fontWeight: '900',
  },
  sectionCount: {
    color: '#6b7886',
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
});
```

- [ ] **Step 2: Replace starter app**

Replace `App.tsx`:

```tsx
import { HomeScreen } from './src/screens/HomeScreen';

export default function App() {
  return <HomeScreen />;
}
```

- [ ] **Step 3: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: PASS with exit code 0.

## Task 4: Manual State Verification Hooks

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

**Interfaces:**
- Consumes: `DemoStatus`.
- Produces: an easy development-only way to switch UI states before real API wiring.

- [ ] **Step 1: Add a small demo status switcher**

Modify `src/screens/HomeScreen.tsx` by replacing:

```ts
const DEMO_STATUS: DemoStatus = 'success';
```

with:

```ts
const DEMO_STATUSES: DemoStatus[] = ['success', 'loading', 'empty', 'permissionDenied', 'error'];
```

Then inside `HomeScreen`, add:

```ts
const [demoStatus, setDemoStatus] = useState<DemoStatus>('success');
```

Replace all `DEMO_STATUS` checks with `demoStatus`.

Add this block before `renderContent()` output in the scroll view, immediately after `MapPreview`:

```tsx
<View style={styles.demoBar}>
  {DEMO_STATUSES.map((status) => (
    <Text
      key={status}
      onPress={() => setDemoStatus(status)}
      style={[styles.demoText, demoStatus === status && styles.demoTextActive]}
    >
      {status}
    </Text>
  ))}
</View>
```

Add these styles:

```ts
demoBar: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 12,
},
demoText: {
  overflow: 'hidden',
  borderRadius: 12,
  backgroundColor: '#e8eef5',
  color: '#596877',
  paddingHorizontal: 9,
  paddingVertical: 5,
  fontSize: 11,
  fontWeight: '800',
},
demoTextActive: {
  backgroundColor: '#132235',
  color: '#ffffff',
},
```

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`

Expected: PASS with exit code 0.

- [ ] **Step 3: Run web server**

Run: `npm run web`

Expected: Expo starts and prints a localhost URL.

## Self-Review

- Spec coverage: This plan covers mock `Restaurant[]`, radius switching, active restaurant selection, map preview behavior, Google Maps action bar, restaurant card metadata pills, and loading/empty/permission denied/error UI copy.
- Known gap: This plan intentionally does not implement Hono, Google Places, or real location. Those are later implementation plans from the approved MVP spec.
- Placeholder scan: No TBD/TODO/FIXME placeholders are present.
- Type consistency: `Restaurant`, `SearchRadiusMeters`, `selectedRadius`, `activeRestaurant`, and component prop names are consistent across tasks.
