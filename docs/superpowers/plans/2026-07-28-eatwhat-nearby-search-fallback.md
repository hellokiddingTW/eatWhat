# EatWhat Nearby Search With Text Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Text Search pagination with a Nearby Search primary request and one conditional Text Search fallback so the closest open restaurants are covered with at most two Google requests.

**Architecture:** Extract Google Place normalization into one shared module, add a dedicated Nearby Search adapter, and compose it with the existing Text Search adapter through a small fallback coordinator. Keep the public Hono route stable while simplifying its response and the Expo client to one complete, distance-sorted result set with no pagination.

**Tech Stack:** TypeScript 6.0, Hono, Node test runner, Google Places API (New), Expo 57, React Native 0.86.

## Global Constraints

- Keep `GET /restaurants/nearby?lat=<number>&lng=<number>&radius=<3000|5000|10000>`.
- Use `includedTypes: ["restaurant"]` for Nearby Search.
- Exclude pure beverage shops, convenience stores, supermarkets, and bars.
- Request at most 20 Nearby Search candidates ranked by `DISTANCE`.
- Retain only places with `currentOpeningHours.openNow === true`.
- Enforce the selected radius with a local Haversine distance calculation.
- Run one Text Search fallback only when Nearby Search yields fewer than 10 valid restaurants.
- Never initiate more than two Google Places requests for one app search.
- Merge by Place ID with Nearby Search taking precedence, then sort by `distanceMeters` ascending.
- Request Enterprise opening-hours fields and keep `GOOGLE_PLACES_API_KEY` server-side.
- Remove Google page-token handling from the Hono contract and Expo client.
- Add no new dependencies.

---

### Task 1: Shared Google Place Normalization

**Files:**
- Create: `api/src/services/googlePlaceData.ts`
- Create: `api/src/services/googlePlaceData.test.ts`
- Modify: `api/src/services/googlePlaces.ts`
- Modify: `api/src/services/googlePlaces.test.ts`

**Interfaces:**
- Consumes: `NearbyRestaurantQuery` and `Restaurant` from `api/src/types/restaurant.ts`.
- Produces:
  - `GOOGLE_PLACE_FIELD_MASK: string`
  - `GooglePlace` response type
  - `normalizeGooglePlaces(places: GooglePlace[], query: NearbyRestaurantQuery): Restaurant[]`
  - `mergeRestaurantResults(primary: Restaurant[], fallback: Restaurant[]): Restaurant[]`

- [ ] **Step 1: Write failing normalization tests**

Create `api/src/services/googlePlaceData.test.ts` with focused fixtures:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeRestaurantResults,
  normalizeGooglePlaces,
} from './googlePlaceData.js';

const query = {
  lat: 25.0136677,
  lng: 121.4735569,
  radius: 3000 as const,
};

describe('Google Place normalization', () => {
  it('retains an open brunch restaurant and formats its closing time', () => {
    const restaurants = normalizeGooglePlaces(
      [
        {
          id: 'banxin-77',
          displayName: { text: '板新77早午餐' },
          location: {
            latitude: 25.0136677,
            longitude: 121.4735569,
          },
          primaryTypeDisplayName: { text: '早午餐餐廳' },
          types: ['brunch_restaurant', 'breakfast_restaurant', 'restaurant'],
          currentOpeningHours: {
            openNow: true,
            nextCloseTime: '2026-07-28T05:00:00Z',
          },
          timeZone: { id: 'Asia/Taipei' },
        },
      ],
      query,
    );

    assert.deepEqual(restaurants, [
      {
        id: 'banxin-77',
        name: '板新77早午餐',
        distanceMeters: 0,
        isOpenNow: true,
        closingTimeText: '營業到 13:00',
        cuisineTypes: ['早午餐餐廳'],
        location: {
          lat: 25.0136677,
          lng: 121.4735569,
        },
        googleMapsUrl:
          'https://www.google.com/maps/search/?api=1&query=%E6%9D%BF%E6%96%B077%E6%97%A9%E5%8D%88%E9%A4%90&query_place_id=banxin-77',
      },
    ]);
  });

  it('removes closed, unknown-hours, and out-of-radius places', () => {
    const restaurants = normalizeGooglePlaces(
      [
        {
          id: 'closed',
          displayName: { text: 'Closed' },
          location: { latitude: 25.0137, longitude: 121.4736 },
          types: ['restaurant'],
          currentOpeningHours: { openNow: false },
        },
        {
          id: 'unknown',
          displayName: { text: 'Unknown' },
          location: { latitude: 25.0138, longitude: 121.4736 },
          types: ['restaurant'],
        },
        {
          id: 'outside',
          displayName: { text: 'Outside' },
          location: { latitude: 25.08, longitude: 121.4736 },
          types: ['restaurant'],
          currentOpeningHours: { openNow: true },
        },
      ],
      query,
    );

    assert.deepEqual(restaurants, []);
  });

  it('deduplicates with primary precedence and sorts the merged result', () => {
    const primary = [
      {
        id: 'shared',
        name: 'Nearby name',
        distanceMeters: 500,
        isOpenNow: true as const,
        location: { lat: 25.01, lng: 121.47 },
        googleMapsUrl: 'https://maps.google.com/nearby',
      },
      {
        id: 'far',
        name: 'Far',
        distanceMeters: 900,
        isOpenNow: true as const,
        location: { lat: 25.02, lng: 121.47 },
        googleMapsUrl: 'https://maps.google.com/far',
      },
    ];
    const fallback = [
      {
        ...primary[0],
        name: 'Text name',
      },
      {
        id: 'near',
        name: 'Near',
        distanceMeters: 200,
        isOpenNow: true as const,
        location: { lat: 25.011, lng: 121.47 },
        googleMapsUrl: 'https://maps.google.com/near',
      },
    ];

    assert.deepEqual(
      mergeRestaurantResults(primary, fallback).map(({ id, name }) => ({
        id,
        name,
      })),
      [
        { id: 'near', name: 'Near' },
        { id: 'shared', name: 'Nearby name' },
        { id: 'far', name: 'Far' },
      ],
    );
  });
});
```

- [ ] **Step 2: Run the API suite and verify RED**

Run:

```bash
npm --prefix api test
```

Expected: FAIL because `googlePlaceData.js` does not exist.

- [ ] **Step 3: Implement the shared Google Place module**

Move the current Google response types, Haversine calculation, Google Maps URL
builder, and closing-time formatter from `googlePlaces.ts` into
`googlePlaceData.ts`.

Use this public shape:

```ts
export const GOOGLE_PLACE_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.googleMapsUri',
  'places.currentOpeningHours',
  'places.timeZone',
].join(',');

export const normalizeGooglePlaces = (
  places: GooglePlace[],
  query: NearbyRestaurantQuery,
) =>
  places
    .map((place) => normalizeGooglePlace(place, query))
    .filter((restaurant): restaurant is Restaurant => Boolean(restaurant))
    .sort((a, b) => a.distanceMeters - b.distanceMeters);

export const mergeRestaurantResults = (
  primary: Restaurant[],
  fallback: Restaurant[],
) => {
  const seenIds = new Set<string>();

  return [...primary, ...fallback]
    .filter(({ id }) => {
      if (seenIds.has(id)) {
        return false;
      }
      seenIds.add(id);
      return true;
    })
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
};
```

Inside `normalizeGooglePlace`, return `undefined` unless all of these hold:

```ts
place.id?.trim()
place.displayName?.text?.trim()
Number.isFinite(place.location?.latitude)
Number.isFinite(place.location?.longitude)
place.types?.includes('restaurant')
place.currentOpeningHours?.openNow === true
distanceMeters <= query.radius
```

Keep the existing `營業到 HH:mm` and `24 小時營業` formatting rules.

- [ ] **Step 4: Update Text Search to use the shared module**

In `api/src/services/googlePlaces.ts`:

- Import `GOOGLE_PLACE_FIELD_MASK`, `GooglePlace`, and
  `normalizeGooglePlaces`.
- Delete the moved duplicate types and helper functions.
- Remove `nextPageToken` from the field mask and normalized response.
- Keep only the first Text Search page.
- Ensure every Text Search fixture has
  `currentOpeningHours: { openNow: true }` when it should survive
  normalization.

The Text request body remains:

```ts
{
  textQuery: 'restaurants',
  includedType: 'restaurant',
  strictTypeFiltering: true,
  openNow: true,
  pageSize: 20,
  rankPreference: 'DISTANCE',
  languageCode: 'zh-TW',
  regionCode: 'TW',
  locationRestriction: {
    rectangle: buildLocationRectangle(query),
  },
}
```

- [ ] **Step 5: Run the API suite and verify GREEN**

Run:

```bash
npm --prefix api test
```

Expected: all existing API tests plus the new normalization tests pass.

- [ ] **Step 6: Commit Task 1**

```bash
git add api/src/services/googlePlaceData.ts api/src/services/googlePlaceData.test.ts api/src/services/googlePlaces.ts api/src/services/googlePlaces.test.ts
git commit -m "Refactor Google place normalization"
```

---

### Task 2: Nearby Search Adapter

**Files:**
- Create: `api/src/services/googleNearbySearch.ts`
- Create: `api/src/services/googleNearbySearch.test.ts`

**Interfaces:**
- Consumes:
  - `GOOGLE_PLACE_FIELD_MASK`
  - `GooglePlace`
  - `normalizeGooglePlaces`
  - `RestaurantSearch`
- Produces:
  - `createGoogleNearbyRestaurantSearch(options): RestaurantSearch`

- [ ] **Step 1: Write the failing Nearby Search request test**

Create `api/src/services/googleNearbySearch.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGoogleNearbyRestaurantSearch } from './googleNearbySearch.js';

const query = {
  lat: 25.0136677,
  lng: 121.4735569,
  radius: 3000 as const,
};

describe('Google Nearby restaurant search', () => {
  it('requests the closest restaurants in the selected circle', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return Response.json({ places: [] });
    };
    const search = createGoogleNearbyRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl,
    });

    await search(query);

    assert.equal(
      requestUrl,
      'https://places.googleapis.com/v1/places:searchNearby',
    );
    assert.equal(requestInit?.method, 'POST');
    const headers = new Headers(requestInit?.headers);
    assert.equal(headers.get('X-Goog-Api-Key'), 'server-key');
    assert.match(
      headers.get('X-Goog-FieldMask') ?? '',
      /places\.currentOpeningHours/,
    );
    assert.deepEqual(JSON.parse(String(requestInit?.body)), {
      includedTypes: ['restaurant'],
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      languageCode: 'zh-TW',
      regionCode: 'TW',
      locationRestriction: {
        circle: {
          center: {
            latitude: query.lat,
            longitude: query.lng,
          },
          radius: query.radius,
        },
      },
    });
  });

  it('returns an open specialized restaurant that also has restaurant type', async () => {
    const search = createGoogleNearbyRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl: async () =>
        Response.json({
          places: [
            {
              id: 'banxin-77',
              displayName: { text: '板新77早午餐' },
              location: {
                latitude: query.lat,
                longitude: query.lng,
              },
              primaryType: 'brunch_restaurant',
              primaryTypeDisplayName: { text: '早午餐餐廳' },
              types: [
                'brunch_restaurant',
                'breakfast_restaurant',
                'restaurant',
              ],
              currentOpeningHours: {
                openNow: true,
                nextCloseTime: '2026-07-28T05:00:00Z',
              },
              timeZone: { id: 'Asia/Taipei' },
            },
          ],
        }),
    });

    const result = await search(query);

    assert.equal(result.restaurants[0]?.id, 'banxin-77');
    assert.equal(result.restaurants[0]?.closingTimeText, '營業到 13:00');
  });
});
```

Add cases for:

- Missing API key rejects before `fetchImpl` runs.
- The caller's abort signal is passed to `fetch`.
- A non-2xx Google response includes its status in the thrown error.

- [ ] **Step 2: Run the API suite and verify RED**

Run:

```bash
npm --prefix api test
```

Expected: FAIL because `googleNearbySearch.js` does not exist.

- [ ] **Step 3: Implement the Nearby Search adapter**

Create `api/src/services/googleNearbySearch.ts`:

```ts
import {
  GOOGLE_PLACE_FIELD_MASK,
  type GooglePlace,
  normalizeGooglePlaces,
} from './googlePlaceData.js';
import type { RestaurantSearch } from '../types/restaurant.js';

const GOOGLE_PLACES_NEARBY_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchNearby';

type GoogleNearbySearchResponse = {
  places?: GooglePlace[];
};

type GoogleNearbySearchOptions = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

export const createGoogleNearbyRestaurantSearch = ({
  apiKey,
  fetchImpl = fetch,
  endpoint = GOOGLE_PLACES_NEARBY_SEARCH_URL,
}: GoogleNearbySearchOptions): RestaurantSearch => {
  return async (query, options) => {
    const trimmedApiKey = apiKey?.trim();
    if (!trimmedApiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY is required.');
    }

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      signal: options?.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': trimmedApiKey,
        'X-Goog-FieldMask': GOOGLE_PLACE_FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: ['restaurant'],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        languageCode: 'zh-TW',
        regionCode: 'TW',
        locationRestriction: {
          circle: {
            center: {
              latitude: query.lat,
              longitude: query.lng,
            },
            radius: query.radius,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Google Nearby Search request failed (${response.status}).`,
      );
    }

    const body = (await response.json()) as GoogleNearbySearchResponse;
    return {
      restaurants: normalizeGooglePlaces(body.places ?? [], query),
    };
  };
};
```

- [ ] **Step 4: Run the API suite and verify GREEN**

Run:

```bash
npm --prefix api test
```

Expected: Nearby request, normalization, abort, key, and error tests pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add api/src/services/googleNearbySearch.ts api/src/services/googleNearbySearch.test.ts
git commit -m "Add Google Nearby restaurant search"
```

---

### Task 3: Two-Request Fallback Coordinator

**Files:**
- Create: `api/src/services/restaurantSearchWithFallback.ts`
- Create: `api/src/services/restaurantSearchWithFallback.test.ts`
- Modify: `api/src/services/googlePlaces.ts`
- Modify: `api/src/services/googlePlaces.test.ts`

**Interfaces:**
- Consumes:
  - `nearbySearch: RestaurantSearch`
  - `textSearch: RestaurantSearch`
  - `mergeRestaurantResults(primary, fallback)`
- Produces:
  - `createRestaurantSearchWithFallback(options): RestaurantSearch`
  - `createGooglePlacesRestaurantSearch(options): RestaurantSearch`

- [ ] **Step 1: Write failing coordinator tests**

Create `api/src/services/restaurantSearchWithFallback.test.ts` with a helper:

```ts
const restaurants = (count: number, prefix: string) =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    name: `${prefix} ${index}`,
    distanceMeters: (index + 1) * 100,
    isOpenNow: true as const,
    location: {
      lat: 25.013 + index / 100_000,
      lng: 121.473,
    },
    googleMapsUrl: `https://maps.google.com/${prefix}-${index}`,
  }));
```

Cover these behaviors:

```ts
it('skips Text Search when Nearby returns at least ten restaurants', async () => {
  let textCalls = 0;
  const search = createRestaurantSearchWithFallback({
    nearbySearch: async () => ({ restaurants: restaurants(10, 'nearby') }),
    textSearch: async () => {
      textCalls += 1;
      return { restaurants: restaurants(10, 'text') };
    },
  });

  const result = await search(query);

  assert.equal(result.restaurants.length, 10);
  assert.equal(textCalls, 0);
});

it('merges one Text Search when Nearby returns fewer than ten', async () => {
  const search = createRestaurantSearchWithFallback({
    nearbySearch: async () => ({
      restaurants: restaurants(3, 'nearby'),
    }),
    textSearch: async () => ({
      restaurants: [
        {
          ...restaurants(1, 'nearby')[0],
          name: 'duplicate text record',
        },
        ...restaurants(3, 'text'),
      ],
    }),
  });

  const result = await search(query);

  assert.equal(result.restaurants.length, 6);
  assert.equal(result.restaurants[0]?.name, 'nearby 0');
});
```

Also cover:

- Nearby succeeds with fewer than 10 and Text fails: Nearby results return.
- Nearby fails and Text succeeds: Text results return.
- Nearby and Text both fail: the final promise rejects.
- The same abort signal reaches both searches.
- An aborted signal after Nearby failure rejects without starting Text Search.
- An aborted signal during Text fallback rejects instead of returning stale
  Nearby results.
- Counters prove no test path invokes more than two searches.

- [ ] **Step 2: Run the API suite and verify RED**

Run:

```bash
npm --prefix api test
```

Expected: FAIL because `restaurantSearchWithFallback.js` does not exist.

- [ ] **Step 3: Implement the coordinator**

Create `api/src/services/restaurantSearchWithFallback.ts`:

```ts
import { mergeRestaurantResults } from './googlePlaceData.js';
import type { RestaurantSearch } from '../types/restaurant.js';

const DEFAULT_MINIMUM_RESULTS_BEFORE_FALLBACK = 10;

type CreateFallbackSearchOptions = {
  nearbySearch: RestaurantSearch;
  textSearch: RestaurantSearch;
  minimumResultsBeforeFallback?: number;
};

export const createRestaurantSearchWithFallback = ({
  nearbySearch,
  textSearch,
  minimumResultsBeforeFallback =
    DEFAULT_MINIMUM_RESULTS_BEFORE_FALLBACK,
}: CreateFallbackSearchOptions): RestaurantSearch => {
  return async (query, options) => {
    try {
      const nearbyResult = await nearbySearch(query, options);

      if (
        nearbyResult.restaurants.length >=
        minimumResultsBeforeFallback
      ) {
        return nearbyResult;
      }

      try {
        const textResult = await textSearch(query, options);
        return {
          restaurants: mergeRestaurantResults(
            nearbyResult.restaurants,
            textResult.restaurants,
          ),
        };
      } catch (error) {
        if (options?.signal?.aborted) {
          throw error;
        }

        return nearbyResult;
      }
    } catch (error) {
      if (options?.signal?.aborted) {
        throw error;
      }

      return textSearch(query, options);
    }
  };
};
```

- [ ] **Step 4: Compose both Google adapters**

In `api/src/services/googlePlaces.ts`:

- Export the current Text adapter as
  `createGoogleTextRestaurantSearch`.
- Keep `createGooglePlacesRestaurantSearch` as the app-facing factory.
- Add `nearbyEndpoint` and `textEndpoint` test overrides.
- Construct and compose the adapters:

```ts
export const createGooglePlacesRestaurantSearch = ({
  apiKey,
  fetchImpl = fetch,
  nearbyEndpoint,
  textEndpoint,
}: GooglePlacesSearchOptions): RestaurantSearch =>
  createRestaurantSearchWithFallback({
    nearbySearch: createGoogleNearbyRestaurantSearch({
      apiKey,
      fetchImpl,
      ...(nearbyEndpoint ? { endpoint: nearbyEndpoint } : {}),
    }),
    textSearch: createGoogleTextRestaurantSearch({
      apiKey,
      fetchImpl,
      ...(textEndpoint ? { endpoint: textEndpoint } : {}),
    }),
  });
```

Keep the import and factory call in `api/src/app.ts` unchanged so production
automatically adopts the composed search.

- [ ] **Step 5: Add an adapter-composition regression test**

In `api/src/services/googlePlaces.test.ts`, provide a `fetchImpl` that records
the endpoint pathname:

```ts
const requestedPaths: string[] = [];
const fetchImpl: typeof fetch = async (input) => {
  const path = new URL(String(input)).pathname;
  requestedPaths.push(path);

  if (path.endsWith('searchNearby')) {
    return Response.json({
      places: [openBanxin77Fixture],
    });
  }

  return Response.json({ places: [] });
};
```

Assert:

```ts
assert.deepEqual(requestedPaths, [
  '/v1/places:searchNearby',
  '/v1/places:searchText',
]);
assert.equal(result.restaurants[0]?.id, 'banxin-77');
```

This proves the production-facing factory uses Nearby first and performs only
one fallback when the Nearby result count is below 10.

- [ ] **Step 6: Run API tests and typecheck**

Run:

```bash
npm --prefix api test
npm --prefix api run typecheck
```

Expected: all tests pass and TypeScript exits with code 0.

- [ ] **Step 7: Commit Task 3**

```bash
git add api/src/services/restaurantSearchWithFallback.ts api/src/services/restaurantSearchWithFallback.test.ts api/src/services/googlePlaces.ts api/src/services/googlePlaces.test.ts
git commit -m "Prefer Nearby Search with text fallback"
```

---

### Task 4: Remove Pagination From The Public Contract

**Files:**
- Modify: `api/src/types/restaurant.ts`
- Modify: `api/src/services/restaurants.ts`
- Modify: `api/src/app.test.ts`
- Modify: `src/services/restaurantsApi.ts`
- Modify: `src/services/restaurantsApi.test.ts`
- Modify: `src/services/restaurantSearchState.ts`
- Modify: `src/services/restaurantSearchState.test.ts`
- Modify: `src/screens/HomeScreen.tsx`
- Delete: `src/services/restaurantPages.ts`
- Delete: `src/services/restaurantPages.test.ts`

**Interfaces:**
- Produces:
  - `NearbyRestaurantResult = { restaurants: Restaurant[] }`
  - `fetchNearbyRestaurants(query, options): Promise<NearbyRestaurantResult>`
  - Search reducer actions: `searchStarted`, `searchLoaded`, `searchFailed`

- [ ] **Step 1: Rewrite client tests for a single result**

In `src/services/restaurantsApi.test.ts`:

- Rename the import to `fetchNearbyRestaurants`.
- Replace the page-token test with:

```ts
it('requests one nearby result with coordinates and radius', async () => {
  let requestedUrl = '';
  const fetchImpl: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return Response.json({ restaurants: [sampleRestaurant] });
  };

  const result = await fetchNearbyRestaurants(
    {
      lat: 25.033,
      lng: 121.565,
      radius: 3000,
    },
    {
      baseUrl: 'http://localhost:8787/',
      fetchImpl,
    },
  );

  const url = new URL(requestedUrl);
  assert.equal(url.pathname, '/restaurants/nearby');
  assert.equal(url.searchParams.get('lat'), '25.033');
  assert.equal(url.searchParams.get('lng'), '121.565');
  assert.equal(url.searchParams.get('radius'), '3000');
  assert.equal(url.searchParams.has('pageToken'), false);
  assert.deepEqual(result, {
    restaurants: [sampleRestaurant],
  });
});
```

Keep abort, non-success, and invalid-body tests using the renamed function.

- [ ] **Step 2: Rewrite reducer tests for one complete load**

Replace pagination-specific expectations in
`src/services/restaurantSearchState.test.ts` with:

```ts
it('stores one complete successful restaurant result', () => {
  const loading = reduceRestaurantSearchState(
    INITIAL_RESTAURANT_SEARCH_STATE,
    { type: 'searchStarted' },
  );
  const ready = reduceRestaurantSearchState(loading, {
    type: 'searchLoaded',
    result: {
      restaurants: [restaurant('b'), restaurant('a')],
    },
  });

  assert.equal(ready.status, 'ready');
  assert.deepEqual(
    ready.restaurants.map(({ id }) => id),
    ['b', 'a'],
  );
});
```

Retain focused tests for:

- A new search clears stale restaurants.
- A failed search produces `status: "error"`.

Delete tests for next-page start, merge, and retry states.

- [ ] **Step 3: Update API tests to remove page-token behavior**

In `api/src/app.test.ts`:

- Remove `pageToken` from request URLs and expected search query objects.
- Remove blank and oversized page-token validation cases.
- Assert successful responses contain `restaurants` and no
  `nextPageToken`.

- [ ] **Step 4: Run both suites and verify RED**

Run:

```bash
npm test
npm --prefix api test
```

Expected: FAIL because the old function names, reducer actions, and pagination
types still exist.

- [ ] **Step 5: Simplify API types and query parsing**

In `api/src/types/restaurant.ts`:

```ts
export type NearbyRestaurantQuery = {
  lat: number;
  lng: number;
  radius: SearchRadiusMeters;
};

export type NearbyRestaurantResult = {
  restaurants: Restaurant[];
};

export type RestaurantSearch = (
  query: NearbyRestaurantQuery,
  options?: RestaurantSearchOptions,
) => Promise<NearbyRestaurantResult>;
```

In `api/src/services/restaurants.ts`:

- Remove `pageToken` from `RawNearbyQuery`.
- Remove page-token validation and response construction.
- Return only `lat`, `lng`, and `radius`.

- [ ] **Step 6: Simplify the Expo API client**

In `src/services/restaurantsApi.ts`:

```ts
import { requireApiBaseUrl } from '../config/apiConfig';
import type {
  Restaurant,
  SearchRadiusMeters,
} from '../types/restaurant';

export type NearbyRestaurantResult = {
  restaurants: Restaurant[];
};

type NearbyRestaurantQuery = {
  lat: number;
  lng: number;
  radius: SearchRadiusMeters;
};

type FetchNearbyRestaurantsOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

export async function fetchNearbyRestaurants(
  query: NearbyRestaurantQuery,
  options: FetchNearbyRestaurantsOptions = {},
): Promise<NearbyRestaurantResult> {
  const baseUrl = requireApiBaseUrl(
    options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL,
  );
  const url = new URL('/restaurants/nearby', baseUrl);
  url.searchParams.set('lat', String(query.lat));
  url.searchParams.set('lng', String(query.lng));
  url.searchParams.set('radius', String(query.radius));

  const response = await (options.fetchImpl ?? fetch)(url.toString(), {
    signal: options.signal,
  });
  const body = await response.json() as NearbyRestaurantResult & ApiErrorBody;

  if (!response.ok) {
    const message = body.error?.message ?? 'Restaurant search failed';
    throw new Error(`${message} (${response.status})`);
  }

  if (!Array.isArray(body.restaurants)) {
    throw new Error('Invalid restaurant response from API.');
  }

  return {
    restaurants: body.restaurants,
  };
}
```

Do not read or return `nextPageToken`.

- [ ] **Step 7: Simplify restaurant search state**

Replace `RestaurantSearchState` with:

```ts
export type RestaurantSearchState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  restaurants: Restaurant[];
};

type RestaurantSearchAction =
  | { type: 'searchStarted' }
  | { type: 'searchLoaded'; result: NearbyRestaurantResult }
  | { type: 'searchFailed' };
```

The reducer behavior is:

```ts
case 'searchStarted':
  return { status: 'loading', restaurants: [] };
case 'searchLoaded':
  return {
    status: 'ready',
    restaurants: action.result.restaurants,
  };
case 'searchFailed':
  return { status: 'error', restaurants: [] };
```

- [ ] **Step 8: Remove HomeScreen pagination**

In `src/screens/HomeScreen.tsx`:

- Remove `NativeScrollEvent` and `NativeSyntheticEvent` imports.
- Remove the `canLoadRestaurantPage` import.
- Rename `fetchNearbyRestaurantPage` to `fetchNearbyRestaurants`.
- Remove `loadMoreInFlightRef`, `lastRequestedPageTokenRef`, and
  `loadMoreAbortControllerRef`.
- Remove `loadNextPage` and `handleScroll`.
- Remove `onScroll` and `scrollEventThrottle` from `ScrollView`.
- Dispatch `searchLoaded` and `searchFailed`.
- Remove the loading-more indicator and retry button.
- Keep the location refresh `ActivityIndicator`.

Delete:

```text
src/services/restaurantPages.ts
src/services/restaurantPages.test.ts
```

- [ ] **Step 9: Run frontend and API verification**

Run:

```bash
npm test
npx tsc --noEmit
npm --prefix api test
npm --prefix api run typecheck
```

Expected: both test suites pass and both TypeScript checks exit with code 0.

- [ ] **Step 10: Commit Task 4**

```bash
git add api/src/types/restaurant.ts api/src/services/restaurants.ts api/src/app.test.ts src/services/restaurantsApi.ts src/services/restaurantsApi.test.ts src/services/restaurantSearchState.ts src/services/restaurantSearchState.test.ts src/screens/HomeScreen.tsx
git add -u src/services/restaurantPages.ts src/services/restaurantPages.test.ts
git commit -m "Remove restaurant search pagination"
```

---

### Task 5: Full Verification And Production Deployment

**Files:**
- Verify only; modify files only if a failing check reveals a defect covered by this plan.

**Interfaces:**
- Production Web: `https://eatwhat-lac.vercel.app`
- Production API: `https://eatwhat-api.vercel.app`

- [ ] **Step 1: Run the full local verification gate**

Run:

```bash
npm test
npx tsc --noEmit
npm run build:web
npm --prefix api test
npm --prefix api run typecheck
npm --prefix api run build
git diff --check
git status -sb
```

Expected:

- Frontend tests: zero failures.
- API tests: zero failures.
- Both typechecks: exit code 0.
- Both production builds: exit code 0.
- `git diff --check`: no output.
- Worktree: clean after task commits.

- [ ] **Step 2: Scan tracked changes for populated Google keys**

Run:

```bash
git grep -n -E 'AIza[0-9A-Za-z_-]{30,}|GOOGLE_(PLACES|MAPS).*=[^[:space:]]+' -- ':!*.test.ts'
```

Expected: exit code 1 with no matches.

- [ ] **Step 3: Push the implementation commits**

```bash
git push origin main
```

Expected: `main` advances on GitHub and triggers both Vercel projects.

- [ ] **Step 4: Verify both Vercel deployments**

Inspect:

```text
https://vercel.com/hellokiddingtws-projects/eatwhat-api
https://vercel.com/hellokiddingtws-projects/eatwhat
```

Expected:

- Both projects show `Ready`.
- Both production deployments reference the final implementation commit.

- [ ] **Step 5: Verify the production API with the regression restaurant**

Call:

```text
GET https://eatwhat-api.vercel.app/restaurants/nearby?lat=25.0136677&lng=121.4735569&radius=3000
```

At a time when Google reports `板新77早午餐` as open, assert:

```text
restaurants contains Place ID ChIJ6VOuQAWpQjQR2ABqn9BPakk
distanceMeters is 0
isOpenNow is true
closingTimeText is 營業到 13:00
```

Also assert:

- Distances are ascending.
- No restaurant has `isOpenNow: false`.
- The response has no `nextPageToken`.

- [ ] **Step 6: Verify the production Web app**

Open:

```text
https://eatwhat-lac.vercel.app
```

After granting location permission:

- Confirm the initial list loads.
- Confirm cards are nearest-first.
- Confirm closing-time pills render when supplied.
- Scroll to the end and confirm no pagination indicator or retry button appears.
- Confirm selecting a card still updates the map marker and active card.
- Confirm there are no app-origin console errors.
