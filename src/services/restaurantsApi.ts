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
