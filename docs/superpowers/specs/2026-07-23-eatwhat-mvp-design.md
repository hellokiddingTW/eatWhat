# EatWhat MVP Design

## Product Goal

EatWhat answers one focused question: "Are there any restaurants near me that are open right now?"

The first version should be fast, location-first, and intentionally small. It is not a restaurant recommendation app, review app, or discovery feed. It prioritizes nearby open restaurants and sends users to Google Maps when they want details.

## Platform

The mobile app is built with Expo React Native and TypeScript. The first target is a mobile app experience for iOS and Android. Web support can be added later through Expo Web if useful, but it is not the primary product surface.

The backend lives in the same repository under `api/` and uses Hono with Node.js and TypeScript. The backend protects the Google Places API key and converts Google responses into EatWhat's own data shape.

## MVP Scope

In scope:

- Use the user's current location.
- Default search radius is 3 km.
- Allow radius switching between 3 km, 5 km, and 10 km.
- Show only restaurants that are currently open.
- Sort restaurants by distance ascending.
- Use Google Places as the restaurant data source.
- Open the active restaurant's Google Maps place page from the map action bar.
- Support loading, empty, permission denied, and generic error states.

Out of scope for the first version:

- Manual location search.
- Showing closed restaurants.
- User accounts.
- Favorites.
- Restaurant reviews inside EatWhat.
- Direct navigation mode.
- Cuisine filtering.
- Personalized recommendations.

## Home Screen

The home screen has a map area above a restaurant list.

The map is a directional aid, not an exploration surface. It shows only two points:

- The user's current location.
- The active restaurant's location.

Map markers are not tappable. The map bottom action bar shows the active restaurant name, distance, and `Google Maps ↗`. Tapping the action bar opens the Google Maps place page for the active restaurant. It does not start navigation directly.

The restaurant list is the main decision surface. Tapping a restaurant card changes the active restaurant and updates the map. It does not open Google Maps directly.

### Map Implementation

Native iOS and Android builds use `react-native-maps` with `PROVIDER_GOOGLE`. The native map is non-interactive in the MVP and automatically frames the user marker and active restaurant marker.

Google Maps credentials are provided at build time through separate local environment variables:

- `GOOGLE_MAPS_ANDROID_API_KEY`
- `GOOGLE_MAPS_IOS_API_KEY`

The keys must not be committed. Android and iOS keys use their respective application restrictions. The web preview keeps the existing non-Google map fallback because `react-native-maps` does not render on web.

Restaurant cards display:

- Restaurant name.
- Open badge.
- Distance.
- Closing time when available.
- Rating when available.
- Optional cuisine types later, if available.

Distance, closing time, and rating are shown as separate icon + pill items. If a field is missing, its pill is hidden. The card does not show extra text such as "currently shown on map"; active state is communicated through visual selection and map synchronization.

## UI States

### Loading

The app shows a loading state while requesting location and searching restaurants.

### Success

The app shows the map, active restaurant, radius controls, and sorted open restaurant list.

The first restaurant in the distance-sorted list is active by default.

### Empty

If no open restaurants are found in the selected radius, the app shows:

`目前所選範圍內沒有營業餐廳，試試看擴大搜尋範圍`

The radius controls remain visible so the user can switch to 5 km or 10 km.

### Permission Denied

If location permission is denied, the app shows:

`需要定位才能搜尋附近餐廳`

It also shows a `重新開啟定位` action. The first implementation should retry the permission/location flow. If the system blocks another prompt, the app can show a short settings hint.

### Error

For API or network failures, the app shows:

`暫時無法取得附近餐廳，請稍後再試`

It also shows a retry action.

## Data Model

The app and API use an EatWhat-owned `Restaurant` model rather than Google Places raw responses.

```ts
type Restaurant = {
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

Notes:

- `id` is the Google place id.
- `isOpenNow` is always `true` for returned restaurants because closed restaurants are filtered out.
- Optional fields are omitted when unavailable.
- `cuisineTypes` is included for later optimization and filtering, but the MVP does not depend on it.
- `googleMapsUrl` should prefer a stable Google place URL based on place id when possible.

## API Design

The first backend endpoint is:

```text
GET /restaurants/nearby?lat=25.033&lng=121.565&radius=3000
```

Query parameters:

- `lat`: required latitude.
- `lng`: required longitude.
- `radius`: required radius in meters. Allowed values are `3000`, `5000`, and `10000`.

Responsibilities:

- Validate query parameters.
- Call Google Places with the server-side API key.
- Request nearby restaurants.
- Filter to currently open restaurants.
- Normalize each result into `Restaurant`.
- Sort by distance ascending.
- Return JSON to the app.

The app should not call Google Places directly.

## Initial Repository Shape

The project starts as an Expo React Native app. The API can be added inside the same repository:

```text
eatWhat/
  App.tsx
  src/
    components/
    screens/
    services/
    types/

  api/
    src/
      index.ts
      routes/
        restaurants.ts
      services/
        googlePlaces.ts
      types/
        restaurant.ts
```

This keeps the first version simple while still separating mobile app logic from backend API logic.

## Implementation Order

1. Build the home screen with mock `Restaurant[]` data, including `cuisineTypes`.
2. Implement radius switching and active restaurant selection.
3. Add the visual states: loading, empty, permission denied, and error.
4. Add a Hono API skeleton that returns mock restaurant data.
5. Change the app to fetch from the local API.
6. Integrate Google Places behind the Hono API.
7. Add real location permission and coordinate handling.

Each step should leave the app runnable.

## Open Questions

- Where to deploy the Hono API.
- Exact Google Places API version and fields to request.
- Whether closing time can be reliably derived from Google data for all results.

These questions do not block the first mock-data UI step.
