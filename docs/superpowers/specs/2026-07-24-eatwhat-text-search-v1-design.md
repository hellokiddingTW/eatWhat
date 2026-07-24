# EatWhat Text Search V1 Design

## Goal

Replace the mock restaurant list with Google Places Text Search (New) data while keeping the existing location-first home screen and map behavior.

## Search Behavior

- Search from the user's current coordinates.
- Support 3 km, 5 km, and 10 km radii.
- Query only places matching the `restaurant` type.
- Set `strictTypeFiltering` to `true`.
- Set `openNow` to `true`, so closed restaurants are not returned.
- Rank results by distance.
- Request 20 results per page.
- Load the next page only when the user scrolls near the end of the list.
- Load at most three pages per search.

Text Search only accepts a rectangular location restriction. The API creates a rectangle that contains the requested circle, then removes results whose calculated straight-line distance exceeds the selected radius.

## Data And Billing Boundary

The Text Search request uses only Pro response fields:

- Place ID
- Display name
- Coordinates
- Formatted address
- Primary type and localized primary type
- Place types
- Google Maps URI
- Next-page token

Rating and opening-hours fields are not requested in V1. The existing card already hides those pills when the values are absent.

The Google Places API key remains server-side in `api/.env.local` as `GOOGLE_PLACES_API_KEY`. The Expo app calls only the Hono API through `EXPO_PUBLIC_API_BASE_URL`.

## Backend Contract

```text
GET /restaurants/nearby?lat=25.033&lng=121.565&radius=3000&pageToken=optional
```

Successful response:

```json
{
  "restaurants": [
    {
      "id": "google-place-id",
      "name": "Restaurant name",
      "distanceMeters": 420,
      "isOpenNow": true,
      "address": "Restaurant address",
      "cuisineTypes": ["Restaurant type"],
      "location": {
        "lat": 25.0337,
        "lng": 121.5651
      },
      "googleMapsUrl": "https://maps.google.com/..."
    }
  ],
  "nextPageToken": "optional-token"
}
```

The backend validates coordinates, radius, and page token, calls Google Places, normalizes the response, filters the exact radius, and sorts by distance.

Latitude and longitude must remain within their geographic bounds. Valid restaurant searches are limited to 60 requests per minute per proxy-provided client IP by default; invalid queries do not consume this application-level limit. A production deployment must additionally configure a trusted proxy, Google API restrictions, and Google Cloud quota limits as the shared billing safeguard.

The app waits 200 ms before sending a first-page search so rapid radius changes collapse into the final selection. Superseded first-page and pagination requests are aborted through the App, Hono, and Google fetch chain.

## App States

- Location loading remains unchanged.
- Restaurant loading shows `正在搜尋附近營業中的餐廳...`.
- Empty results show `目前所選範圍內沒有營業餐廳，試試看擴大搜尋範圍`.
- Initial search failure shows `暫時無法取得附近餐廳，請稍後再試` with a retry action.
- Loading another page keeps existing restaurants visible and shows a compact loading indicator below the list.
- A failed next-page request keeps existing restaurants visible and exposes a retry action.

Changing radius or refreshing location starts a fresh first-page search and resets the active restaurant to the closest returned result.

## Out Of Scope

- Fetching all restaurants in a radius.
- Nearby Search.
- Places Aggregate API.
- Rating and closing-time data.
- Cuisine filters.
- Server deployment.
