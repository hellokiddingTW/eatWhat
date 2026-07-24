# EatWhat Live Location and Marker Labels Design

## Goal

Replace the prototype's fixed user coordinate with the device's current
location and make both map points immediately understandable without requiring
interaction.

The map continues to show only:

- The user's current location.
- The active restaurant's location.

Both points have an always-visible, non-interactive label bubble.

## Confirmed Behavior

### Location Refresh Strategy

The app requests a location with `Location.Accuracy.Highest` once when the home
screen opens. It does not continuously track the user.

The location button in the header becomes an actionable refresh control.
Pressing it requests a new high-accuracy location fix and updates the map.

This strategy is shared across iOS, Android, and Web through `expo-location`.
The operating system or browser remains responsible for the final accuracy.
Indoor conditions, disabled precise-location settings, and device hardware can
reduce the accuracy of the returned coordinate.

### Location States

The location flow has four states:

- `loading`: permission or a current position is being requested.
- `ready`: a current coordinate is available.
- `permissionDenied`: foreground location permission was rejected.
- `error`: permission was granted, but a current position could not be
  obtained.

The app must not silently fall back to the existing Taipei demo coordinate.
Displaying a false current position would be more harmful than showing a clear
retry state.

While refreshing an already available location, the existing map remains
visible. The refresh button communicates that work is in progress. Requests
made while another request is in flight share that request and cannot start a
second simultaneous position lookup.

### Retry Behavior

The permission-denied state keeps the existing message:

`需要定位才能搜尋附近餐廳`

Its action retries the foreground permission and location flow. If the
operating system no longer permits another prompt, the same state remains
visible rather than inventing a coordinate.

The generic location error state uses:

`暫時無法取得目前位置，請稍後再試`

Its action requests the location again.

### Marker Labels

The user marker is blue and has an always-visible bubble labeled:

`現在位置`

The active restaurant marker is red and has an always-visible bubble containing
the active restaurant's name.

The bubbles:

- Are visually anchored above their corresponding marker points.
- Remain visible without tapping.
- Are not clickable or dismissible.
- Use compact text that does not overlap the point itself.
- Update together with the marker when the active restaurant changes.

Web and native use platform-appropriate rendering while preserving the same
visual hierarchy and wording.

## Architecture

### Location Service

A focused location service wraps `expo-location` and owns:

- Requesting foreground permission.
- Requesting one current position with `Location.Accuracy.Highest`.
- Converting Expo's `{ latitude, longitude }` result into EatWhat's
  `{ lat, lng }` coordinate shape.
- Returning a typed permission-denied result separately from unexpected
  location errors.

It does not cache coordinates or start a location subscription.

### Home Screen State

`HomeScreen` owns the current coordinate and location status. It starts the
one-shot request on mount and exposes the same request through the header
location button and state-message retry actions.

`MapPreview` renders only after a real coordinate is available. Restaurant
selection remains independent: changing the active card updates the restaurant
marker and its label but does not request location again.

The existing mock restaurant list remains in this scope. Distances are not
recalculated yet because the upcoming Places/API integration will return
restaurants and distances for the requested coordinate.

### Map Rendering

Native uses custom `react-native-maps` marker content so both labels are always
visible without relying on tappable system callouts.

Web uses custom Google Maps marker content anchored to each coordinate. The
markers remain non-interactive, and the map continues to disable gestures and
default controls.

The map keeps framing the user and active restaurant together after either the
location or active restaurant changes.

## Configuration

Add `expo-location` to the Expo project and configure the foreground permission
description for iOS. Android uses foreground fine-location permission only.
Background location permissions are out of scope.

Web location continues to work on localhost during development. Production Web
deployment must use a secure context as required by browser geolocation.

## Testing

Automated tests cover:

- Converting an Expo location object to the app coordinate shape.
- A granted permission followed by a high-accuracy current-position request.
- Permission denial returning the dedicated result.
- Unexpected location failures returning the error result.
- Duplicate refresh calls sharing one in-flight location request.

Component behavior is verified across Web and native bundles:

- No fixed demo coordinate remains in the home-screen data flow.
- The map is withheld until a real coordinate exists.
- The user bubble reads `現在位置`.
- The restaurant bubble matches the active card.
- Refresh updates the coordinate without starting continuous tracking.

Browser verification additionally checks permission-denied and successful
geolocation scenarios with controlled coordinates.

## Out of Scope

- Continuous background or foreground tracking.
- Background location permission.
- Address lookup or reverse geocoding.
- Manual location search.
- Recomputing mock restaurant distances on the client.
- Fetching real nearby restaurants from Google Places.
