# EatWhat Text Search V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock restaurant data with paginated Google Places Text Search (New) results served by Hono and consumed by the Expo app.

**Architecture:** Hono owns the Google Places key, builds a rectangular Text Search restriction around the requested circle, and normalizes Pro-tier Place fields into EatWhat's `Restaurant` model. The Expo app requests pages from Hono, keeps at most three pages, and loads another page only near the end of the current list.

**Tech Stack:** Expo React Native, React 19, TypeScript, Hono, Node.js built-in test runner, Google Places Text Search (New).

## Global Constraints

- Preserve the existing home-screen layout, location behavior, active card behavior, and two-marker map.
- Search only `restaurant` places with `strictTypeFiltering: true` and `openNow: true`.
- Use only Text Search Pro response fields.
- Request 20 results per page and load at most three pages per app search.
- Filter results to the exact 3 km, 5 km, or 10 km radius in Hono.
- Keep `GOOGLE_PLACES_API_KEY` server-side.
- Validate geographic coordinate bounds and rate-limit valid search requests per client.
- Debounce first-page searches by 200 ms and abort superseded requests through Google fetch.
- Do not request rating, rating count, or opening-hours fields.
- Do not modify or remove the existing V1 design documents.

---

## File Structure

- `api/src/services/googlePlaces.ts`: Text Search request construction, Google response normalization, exact distance filtering, and upstream errors.
- `api/src/services/googlePlaces.test.ts`: Text Search payload, normalization, filtering, sorting, pagination, and error tests.
- `api/src/services/restaurants.ts`: Nearby query and optional page-token parsing.
- `api/src/app.ts`: Dependency-injected async restaurant route and JSON errors.
- `api/src/app.test.ts`: Route contract tests using a fake search dependency.
- `src/config/apiConfig.ts`: Expo API base URL validation.
- `src/config/apiConfig.test.ts`: API base URL validation tests.
- `src/services/restaurantsApi.ts`: Typed Hono API client.
- `src/services/restaurantsApi.test.ts`: URL construction and HTTP error tests.
- `src/services/restaurantPages.ts`: Pure page merge and pagination-limit helpers.
- `src/services/restaurantPages.test.ts`: Deduplication and three-page cap tests.
- `src/screens/HomeScreen.tsx`: Real restaurant loading, radius refresh, near-end pagination, and UI states.
- `.env.example`: Public app API URL variable.
- `api/.env.example`: Private Google Places key and API port variables.

## Task 1: Backend Google Places Client

**Files:**
- Create: `api/src/services/googlePlaces.test.ts`
- Create: `api/src/services/googlePlaces.ts`
- Modify: `api/src/types/restaurant.ts`

**Interfaces:**
- Produces `createGooglePlacesRestaurantSearch(options)`.
- Produces `search(query): Promise<NearbyRestaurantPage>`.
- `NearbyRestaurantQuery` includes optional `pageToken`.
- `NearbyRestaurantPage` contains `restaurants` and optional `nextPageToken`.

- [ ] Write failing tests that inject a fake `fetch`, verify the Text Search payload and Pro field mask, and assert exact-radius filtering and distance sorting.
- [ ] Run `npm test -- src/services/googlePlaces.test.ts` from `api/` and confirm failure because `googlePlaces.ts` does not exist.
- [ ] Implement bounding-box calculation, Haversine distance calculation, Place normalization, and the injected Text Search client.
- [ ] Add tests for next-page token forwarding, missing Google key, and non-2xx Google responses.
- [ ] Run `npm test -- src/services/googlePlaces.test.ts` and confirm all client tests pass.

## Task 2: Async Hono Route

**Files:**
- Modify: `api/src/services/restaurants.ts`
- Modify: `api/src/app.test.ts`
- Modify: `api/src/app.ts`

**Interfaces:**
- Consumes `RestaurantSearch`.
- Produces `createApp({ searchRestaurants })`.
- Preserves exported default `app`.
- Returns `{ restaurants, nextPageToken? }`.

- [ ] Rewrite route tests to inject a fake async search function and verify coordinates, radius, and page token are forwarded.
- [ ] Run `npm test -- src/app.test.ts` and confirm the new tests fail against the synchronous mock route.
- [ ] Parse optional non-empty `pageToken` values and reject blank or oversized values.
- [ ] Convert the route to async dependency injection, add CORS, and map configuration or upstream failures to a stable JSON error response.
- [ ] Run `npm test -- src/app.test.ts` and confirm all route tests pass.

## Task 3: Expo API Client And Pagination Helpers

**Files:**
- Create: `src/config/apiConfig.test.ts`
- Create: `src/config/apiConfig.ts`
- Create: `src/services/restaurantsApi.test.ts`
- Create: `src/services/restaurantsApi.ts`
- Create: `src/services/restaurantPages.test.ts`
- Create: `src/services/restaurantPages.ts`

**Interfaces:**
- Produces `requireApiBaseUrl(value)`.
- Produces `fetchNearbyRestaurantPage(query, options?)`.
- Produces `mergeRestaurantPages(current, incoming)`.
- Produces `canLoadRestaurantPage(pagesLoaded, nextPageToken)`.

- [ ] Write failing configuration tests for missing, invalid, and trailing-slash API URLs.
- [ ] Implement API base URL validation and normalization.
- [ ] Write failing client tests that verify encoded query parameters, parsed responses, and non-2xx failures.
- [ ] Implement the typed fetch client.
- [ ] Write failing pagination tests for stable deduplication and the three-page limit.
- [ ] Implement pagination helpers and run `npm test`.

## Task 4: Home Screen Data Flow

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `.env.example`
- Create: `api/.env.example`

**Interfaces:**
- Consumes `fetchNearbyRestaurantPage`, `mergeRestaurantPages`, and `canLoadRestaurantPage`.
- Uses `EXPO_PUBLIC_API_BASE_URL`.
- Hono uses `GOOGLE_PLACES_API_KEY`.

- [ ] Replace `mockRestaurants` state with first-page API state triggered by a ready location and selected radius.
- [ ] Reset the active restaurant when the search context changes.
- [ ] Render loading, empty, initial error, loading-more, and next-page retry states.
- [ ] Trigger the next page when the ScrollView approaches the bottom and stop after three pages.
- [ ] Add the API URL and Places key names to the example env files.
- [ ] Run root tests and TypeScript checks.

## Task 5: End-To-End Verification

**Files:**
- Verify all files changed above.

**Interfaces:**
- Confirms the Hono contract and Expo consumption work together.

- [ ] Run `npm test` from the repository root.
- [ ] Run `npx tsc --noEmit` from the repository root.
- [ ] Run `npm test` from `api/`.
- [ ] Run `npm run typecheck` from `api/`.
- [ ] Start Hono and smoke-test `/health`, invalid queries, and the missing-key error.
- [ ] Start Expo Web and verify location, loading, error, radius switching, and the preserved map layout in the in-app browser.

## Self-Review

- Spec coverage: The plan covers server-only credentials, Text Search Pro fields, open-only restaurant filtering, exact distance filtering, pagination, the three-page cap, real app fetching, and required UI states.
- Placeholder scan: The plan contains no deferred implementation placeholders.
- Type consistency: `NearbyRestaurantQuery`, `NearbyRestaurantPage`, `RestaurantSearch`, `fetchNearbyRestaurantPage`, `mergeRestaurantPages`, and `canLoadRestaurantPage` are used consistently.
