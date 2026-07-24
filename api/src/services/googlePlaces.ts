import type {
  NearbyRestaurantPage,
  NearbyRestaurantQuery,
  Restaurant,
  RestaurantSearch,
} from '../types/restaurant.js';

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchText';
const EARTH_RADIUS_METERS = 6_371_000;
const GOOGLE_PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.formattedAddress',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.types',
  'places.googleMapsUri',
  'nextPageToken',
].join(',');

type GooglePlace = {
  id?: string;
  displayName?: {
    text?: string;
  };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  formattedAddress?: string;
  primaryType?: string;
  primaryTypeDisplayName?: {
    text?: string;
  };
  types?: string[];
  googleMapsUri?: string;
};

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
};

type GooglePlacesSearchOptions = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  endpoint?: string;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

const normalizeLongitude = (longitude: number) => {
  const normalized = ((longitude + 180) % 360 + 360) % 360 - 180;
  return normalized === -180 ? 180 : normalized;
};

const buildLocationRectangle = ({
  lat,
  lng,
  radius,
}: NearbyRestaurantQuery) => {
  const latitudeDelta = toDegrees(radius / EARTH_RADIUS_METERS);
  const longitudeScale = Math.cos(toRadians(lat));
  const longitudeDelta =
    Math.abs(longitudeScale) < Number.EPSILON
      ? 180
      : Math.min(toDegrees(radius / EARTH_RADIUS_METERS / longitudeScale), 180);

  return {
    low: {
      latitude: Math.max(lat - latitudeDelta, -90),
      longitude: normalizeLongitude(lng - longitudeDelta),
    },
    high: {
      latitude: Math.min(lat + latitudeDelta, 90),
      longitude: normalizeLongitude(lng + longitudeDelta),
    },
  };
};

const distanceBetweenMeters = (
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) => {
  const latitudeDelta = toRadians(destination.lat - origin.lat);
  const longitudeDelta = toRadians(destination.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const destinationLatitude = toRadians(destination.lat);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(
    2 *
      EARTH_RADIUS_METERS *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
};

const buildGoogleMapsUrl = (id: string, name: string) => {
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', name);
  url.searchParams.set('query_place_id', id);
  return url.toString();
};

const normalizePlace = (
  place: GooglePlace,
  query: NearbyRestaurantQuery,
): Restaurant | undefined => {
  const id = place.id?.trim();
  const name = place.displayName?.text?.trim();
  const lat = place.location?.latitude;
  const lng = place.location?.longitude;

  if (
    !id ||
    !name ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return undefined;
  }

  const location = {
    lat: lat as number,
    lng: lng as number,
  };
  const distanceMeters = distanceBetweenMeters(
    { lat: query.lat, lng: query.lng },
    location,
  );

  if (distanceMeters > query.radius) {
    return undefined;
  }

  const address = place.formattedAddress?.trim();
  const cuisineType = place.primaryTypeDisplayName?.text?.trim();
  const googleMapsUrl =
    place.googleMapsUri?.trim() || buildGoogleMapsUrl(id, name);

  return {
    id,
    name,
    distanceMeters,
    isOpenNow: true,
    ...(address ? { address } : {}),
    ...(cuisineType ? { cuisineTypes: [cuisineType] } : {}),
    location,
    googleMapsUrl,
  };
};

export const createGooglePlacesRestaurantSearch = ({
  apiKey,
  fetchImpl = fetch,
  endpoint = GOOGLE_PLACES_TEXT_SEARCH_URL,
}: GooglePlacesSearchOptions): RestaurantSearch => {
  return async (query, options): Promise<NearbyRestaurantPage> => {
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
        'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
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
        ...(query.pageToken ? { pageToken: query.pageToken } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Places request failed (${response.status}).`);
    }

    const body = (await response.json()) as GoogleTextSearchResponse;
    const restaurants = (body.places ?? [])
      .map((place) => normalizePlace(place, query))
      .filter((restaurant): restaurant is Restaurant => Boolean(restaurant))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return {
      restaurants,
      ...(body.nextPageToken
        ? { nextPageToken: body.nextPageToken }
        : {}),
    };
  };
};
