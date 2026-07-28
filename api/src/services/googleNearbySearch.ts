import type { RestaurantSearch } from '../types/restaurant.js';
import {
  GOOGLE_PLACE_FIELD_MASK,
  normalizeGooglePlaces,
  type GooglePlace,
} from './googlePlaceData.js';

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
