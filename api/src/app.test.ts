import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createApp } from './app.js';
import type {
  NearbyRestaurantQuery,
  RestaurantSearch,
} from './types/restaurant.js';

const sampleRestaurant = {
  id: 'place-1',
  name: '測試餐廳',
  distanceMeters: 420,
  isOpenNow: true as const,
  address: '台北市信義區測試路 1 號',
  cuisineTypes: ['餐廳'],
  location: {
    lat: 25.0337,
    lng: 121.5651,
  },
  googleMapsUrl: 'https://maps.google.com/?q=place-1',
};

const createTestApp = (
  searchRestaurants: RestaurantSearch = async () => ({
    restaurants: [sampleRestaurant],
  }),
) => createApp({ searchRestaurants });

describe('EatWhat API', () => {
  it('returns health status', async () => {
    const response = await createTestApp().request('/health');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
  });

  it('forwards a valid nearby query and returns a restaurant page', async () => {
    let receivedQuery: NearbyRestaurantQuery | undefined;
    let receivedSignal: AbortSignal | undefined;
    const app = createTestApp(async (query, options) => {
      receivedQuery = query;
      receivedSignal = options?.signal;
      return {
        restaurants: [sampleRestaurant],
        nextPageToken: 'next-page',
      };
    });

    const response = await app.request(
      '/restaurants/nearby?lat=25.033&lng=121.565&radius=3000&pageToken=google-token',
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(receivedQuery, {
      lat: 25.033,
      lng: 121.565,
      radius: 3000,
      pageToken: 'google-token',
    });
    assert.deepEqual(body, {
      restaurants: [sampleRestaurant],
      nextPageToken: 'next-page',
    });
    assert.ok(receivedSignal instanceof AbortSignal);
  });

  it('allows a first-page request without a page token', async () => {
    let receivedQuery: NearbyRestaurantQuery | undefined;
    const app = createTestApp(async (query) => {
      receivedQuery = query;
      return { restaurants: [] };
    });

    const response = await app.request(
      '/restaurants/nearby?lat=25.033&lng=121.565&radius=5000',
    );

    assert.equal(response.status, 200);
    assert.deepEqual(receivedQuery, {
      lat: 25.033,
      lng: 121.565,
      radius: 5000,
    });
  });

  it('rejects unsupported radius values', async () => {
    const response = await createTestApp().request(
      '/restaurants/nearby?lat=25.033&lng=121.565&radius=7000',
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.message, 'Invalid query parameters');
    assert.deepEqual(body.error.details, [
      'radius must be one of 3000, 5000, 10000',
    ]);
  });

  it('rejects missing coordinates', async () => {
    const response = await createTestApp().request(
      '/restaurants/nearby?radius=3000',
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.message, 'Invalid query parameters');
    assert.deepEqual(body.error.details, [
      'lat is required',
      'lng is required',
    ]);
  });

  it('rejects coordinates outside latitude and longitude bounds', async () => {
    const response = await createTestApp().request(
      '/restaurants/nearby?lat=91&lng=-181&radius=3000',
    );
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body.error.details, [
      'lat must be between -90 and 90',
      'lng must be between -180 and 180',
    ]);
  });

  it('rejects a blank or oversized page token', async () => {
    const blankResponse = await createTestApp().request(
      '/restaurants/nearby?lat=25.033&lng=121.565&radius=3000&pageToken=%20%20',
    );
    const oversizedResponse = await createTestApp().request(
      `/restaurants/nearby?lat=25.033&lng=121.565&radius=3000&pageToken=${'a'.repeat(2049)}`,
    );

    assert.equal(blankResponse.status, 400);
    assert.deepEqual((await blankResponse.json()).error.details, [
      'pageToken must not be blank',
    ]);
    assert.equal(oversizedResponse.status, 400);
    assert.deepEqual((await oversizedResponse.json()).error.details, [
      'pageToken must be at most 2048 characters',
    ]);
  });

  it('returns a stable error when restaurant search fails', async () => {
    const app = createTestApp(async () => {
      throw new Error('upstream detail that should stay private');
    });

    const response = await app.request(
      '/restaurants/nearby?lat=25.033&lng=121.565&radius=3000',
    );
    const body = await response.json();

    assert.equal(response.status, 502);
    assert.deepEqual(body, {
      error: {
        message: 'Restaurant search failed',
      },
    });
  });

  it('allows Expo Web to call the API', async () => {
    const response = await createTestApp().request('/health', {
      headers: {
        Origin: 'http://localhost:8081',
      },
    });

    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });

  it('rate limits valid searches per client without blocking another client', async () => {
    let searchCount = 0;
    const app = createApp({
      searchRestaurants: async () => {
        searchCount += 1;
        return { restaurants: [] };
      },
      maxSearchRequestsPerMinute: 1,
    });
    const url = '/restaurants/nearby?lat=25.033&lng=121.565&radius=3000';
    const firstClientHeaders = {
      'X-Forwarded-For': '203.0.113.1',
    };

    const invalidResponse = await app.request(
      '/restaurants/nearby?radius=3000',
      { headers: firstClientHeaders },
    );
    const firstResponse = await app.request(url, {
      headers: firstClientHeaders,
    });
    const secondResponse = await app.request(url, {
      headers: firstClientHeaders,
    });
    const otherClientResponse = await app.request(url, {
      headers: {
        'X-Forwarded-For': '203.0.113.2',
      },
    });

    assert.equal(invalidResponse.status, 400);
    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 429);
    assert.deepEqual(await secondResponse.json(), {
      error: {
        message: 'Too many restaurant searches',
      },
    });
    assert.equal(otherClientResponse.status, 200);
    assert.equal(searchCount, 2);
  });
});
