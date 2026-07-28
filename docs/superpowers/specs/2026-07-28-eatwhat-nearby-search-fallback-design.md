# EatWhat Nearby Search With Text Fallback Design

## Goal

Improve coverage of the restaurants closest to the user without increasing
each refresh beyond two billable Google Places requests.

This design replaces the search behavior in
`2026-07-24-eatwhat-text-search-v1-design.md`. The existing location, card,
map, radius, and Google Maps interactions remain unchanged.

## Motivation

The current Text Search query can omit a restaurant even when the restaurant:

- Is at the search center.
- Is currently open.
- Has `restaurant` in its Google Place types.

The production investigation for `板新77早午餐` demonstrated this behavior.
An exact Place Details request reported the restaurant as open and correctly
typed, while all three pages of the generic Text Search omitted it. A single
Nearby Search with distance ranking returned it as the first result.

Text Search is therefore not reliable enough to be the primary source for an
app whose main promise is showing the closest open restaurants.

## Search Behavior

The Hono API keeps the existing public endpoint:

```text
GET /restaurants/nearby?lat=25.033&lng=121.565&radius=3000
```

Supported radii remain 3 km, 5 km, and 10 km.

Each fresh search performs these steps:

1. Call Nearby Search once for up to 20 distance-ranked places inside the
   selected radius.
2. Normalize the candidates and retain only places that:
   - Have `restaurant` in their Google Place types.
   - Have `currentOpeningHours.openNow` equal to `true`.
   - Are within the selected circular radius after local distance calculation.
3. If fewer than 10 open restaurants remain, call Text Search once as a
   fallback.
4. Normalize the fallback candidates with the same open-status and exact-radius
   rules.
5. Merge both result sets by Place ID, preferring the Nearby Search record when
   a restaurant appears in both.
6. Sort the complete merged list by `distanceMeters` ascending.

The server returns no Google page token. Frontend pagination and scroll-driven
page loading are removed.

## Nearby Search Request

Nearby Search is the primary source:

```json
{
  "includedTypes": ["restaurant"],
  "maxResultCount": 20,
  "rankPreference": "DISTANCE",
  "languageCode": "zh-TW",
  "regionCode": "TW",
  "locationRestriction": {
    "circle": {
      "center": {
        "latitude": 25.033,
        "longitude": 121.565
      },
      "radius": 3000
    }
  }
}
```

Using the general `restaurant` type includes specialized restaurants whose
types also contain `restaurant`, such as breakfast, brunch, fast-food, hot-pot,
and regional-cuisine restaurants. Pure beverage shops, convenience stores,
supermarkets, and bars are not included.

Nearby Search does not accept an `openNow` request filter. The API requests
`currentOpeningHours` and performs the strict open-status filter after the
response.

## Text Search Fallback

The fallback uses the existing Text Search endpoint with:

- `textQuery: "restaurants"`
- `includedType: "restaurant"`
- `strictTypeFiltering: true`
- `openNow: true`
- `pageSize: 20`
- `rankPreference: "DISTANCE"`
- The existing enclosing rectangle for the selected radius

Only the first Text Search page is requested. Its purpose is to add breadth
when Nearby Search produces fewer than 10 open restaurants, not to provide an
exhaustive list.

## Response Contract

The restaurant shape remains unchanged:

```json
{
  "restaurants": [
    {
      "id": "google-place-id",
      "name": "Restaurant name",
      "distanceMeters": 420,
      "isOpenNow": true,
      "closingTimeText": "營業到 13:00",
      "address": "Restaurant address",
      "cuisineTypes": ["早午餐餐廳"],
      "location": {
        "lat": 25.0337,
        "lng": 121.5651
      },
      "googleMapsUrl": "https://maps.google.com/..."
    }
  ]
}
```

`nextPageToken` is no longer returned. Restaurants without authoritative
Google opening-hours data are omitted because the product requirement remains
"show only restaurants confirmed open."

## Failure Behavior

- If Nearby Search succeeds and at least 10 restaurants remain, return them
  without calling Text Search.
- If Nearby Search succeeds with fewer than 10 restaurants and Text Search
  fails, return the valid Nearby Search results.
- If Nearby Search fails, attempt Text Search once as a degraded fallback.
- If both upstream searches fail, preserve the existing stable API error.
- Abort signals continue through Hono to each Google request.

This keeps useful nearby results visible when only the optional enrichment
request fails.

## Billing Boundary

Both searches request current opening hours and therefore use Enterprise place
fields.

- Normal search: one Nearby Search request.
- Sparse-result search: one Nearby Search plus one Text Search request.
- Degraded search after a Nearby failure: one failed Nearby attempt plus one
  Text Search attempt.
- Maximum Google requests initiated by one app search: two.

The previous three-page Text Search flow is removed, so this design lowers the
worst-case request count from three to two.

## Frontend Changes

- Keep the existing loading, error, empty, list, active-card, and map states.
- Remove `nextPageToken`, `pagesLoaded`, next-page loading, scroll-triggered
  loading, and next-page retry behavior.
- Treat the API response as one complete distance-sorted result set.
- Continue selecting the nearest returned restaurant by default.
- Radius changes and location refreshes continue to start a fresh search.

No new search box, filter control, or visible source label is added.

## Testing

Backend tests cover:

- Nearby Search request type, circle, result limit, distance ranking, and field
  mask.
- A specialized brunch restaurant with `restaurant` in its types is retained.
- Closed places and places without opening-hours data are removed.
- Exact circular radius filtering and distance sorting.
- Text Search is skipped when Nearby Search yields at least 10 open restaurants.
- Text Search runs once when Nearby Search yields fewer than 10.
- Duplicate Place IDs are merged with the Nearby record taking precedence.
- Nearby-only results survive a fallback failure.
- Text Search is used when Nearby Search fails.
- Both failures preserve the stable API error.
- No search path performs more than two Google requests.

Frontend tests cover:

- A successful response replaces the current list.
- Results remain distance sorted.
- Radius and location changes start a fresh request.
- Scrolling no longer triggers another API request.

## Success Criteria

- An open restaurant at or near the user's coordinates that matches the
  `restaurant` type is prioritized by Nearby Search.
- Closed restaurants and restaurants with unknown opening status are never
  shown.
- Results are deduplicated and sorted nearest-first.
- The selected 3 km, 5 km, or 10 km radius is enforced as a circle.
- One app search initiates no more than two Google Places requests.
- The existing card and map behavior continues without a public response-shape
  change other than removal of `nextPageToken`.

## Out Of Scope

- Guaranteeing a complete census of every restaurant in the radius.
- Beverage shops, convenience stores, supermarkets, and pure bars.
- Manual restaurant-name search.
- User-submitted opening-hour corrections.
- Additional place-data providers.
- Caching Google Places content.
