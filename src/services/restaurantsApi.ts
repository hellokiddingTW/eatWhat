import { requireApiBaseUrl } from '../config/apiConfig';
import type {
  Restaurant,
  SearchRadiusMeters,
} from '../types/restaurant';

export type NearbyRestaurantPage = {
  restaurants: Restaurant[];
  nextPageToken?: string;
};

type NearbyRestaurantPageQuery = {
  lat: number;
  lng: number;
  radius: SearchRadiusMeters;
  pageToken?: string;
};

type FetchNearbyRestaurantPageOptions = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
};

type ApiErrorBody = {
  error?: {
    message?: string;
  };
};

export async function fetchNearbyRestaurantPage(
  query: NearbyRestaurantPageQuery,
  options: FetchNearbyRestaurantPageOptions = {},
): Promise<NearbyRestaurantPage> {
  const baseUrl = requireApiBaseUrl(
    options.baseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL,
  );
  const url = new URL('/restaurants/nearby', baseUrl);
  url.searchParams.set('lat', String(query.lat));
  url.searchParams.set('lng', String(query.lng));
  url.searchParams.set('radius', String(query.radius));

  if (query.pageToken) {
    url.searchParams.set('pageToken', query.pageToken);
  }

  const response = await (options.fetchImpl ?? fetch)(url.toString(), {
    signal: options.signal,
  });
  const body = await response.json() as NearbyRestaurantPage & ApiErrorBody;

  if (!response.ok) {
    const message = body.error?.message ?? 'Restaurant search failed';
    throw new Error(`${message} (${response.status})`);
  }

  if (!Array.isArray(body.restaurants)) {
    throw new Error('Invalid restaurant response from API.');
  }

  return {
    restaurants: body.restaurants,
    ...(typeof body.nextPageToken === 'string' && body.nextPageToken
      ? { nextPageToken: body.nextPageToken }
      : {}),
  };
}
