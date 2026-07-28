import type {
  NearbyRestaurantPage,
  NearbyRestaurantQuery,
  RestaurantSearch,
} from '../types/restaurant.js';
import {
  GOOGLE_PLACE_FIELD_MASK,
  normalizeGooglePlaces,
  type GooglePlace,
} from './googlePlaceData.js';

const GOOGLE_PLACES_TEXT_SEARCH_URL =
  'https://places.googleapis.com/v1/places:searchText';
const EARTH_RADIUS_METERS = 6_371_000;

type GoogleTextSearchResponse = {
  places?: GooglePlace[];
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
        'X-Goog-FieldMask': GOOGLE_PLACE_FIELD_MASK,
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
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Places request failed (${response.status}).`);
    }

    const body = (await response.json()) as GoogleTextSearchResponse;
    return {
      restaurants: normalizeGooglePlaces(body.places ?? [], query),
    };
  };
};
