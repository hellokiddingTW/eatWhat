import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGoogleNearbyRestaurantSearch } from './googleNearbySearch.js';

const query = {
  lat: 25.0136677,
  lng: 121.4735569,
  radius: 3000 as const,
};

describe('Google Nearby restaurant search', () => {
  it('requests the closest restaurants in the selected circle', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return Response.json({ places: [] });
    };
    const search = createGoogleNearbyRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl,
    });

    await search(query);

    assert.equal(
      requestUrl,
      'https://places.googleapis.com/v1/places:searchNearby',
    );
    assert.equal(requestInit?.method, 'POST');
    const headers = new Headers(requestInit?.headers);
    assert.equal(headers.get('X-Goog-Api-Key'), 'server-key');
    assert.match(
      headers.get('X-Goog-FieldMask') ?? '',
      /places\.currentOpeningHours/,
    );
    assert.deepEqual(JSON.parse(String(requestInit?.body)), {
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
    });
  });

  it('returns an open specialized restaurant that also has restaurant type', async () => {
    const search = createGoogleNearbyRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl: async () =>
        Response.json({
          places: [
            {
              id: 'banxin-77',
              displayName: { text: '板新77早午餐' },
              location: {
                latitude: query.lat,
                longitude: query.lng,
              },
              primaryType: 'brunch_restaurant',
              primaryTypeDisplayName: { text: '早午餐餐廳' },
              types: [
                'brunch_restaurant',
                'breakfast_restaurant',
                'restaurant',
              ],
              currentOpeningHours: {
                openNow: true,
                nextCloseTime: '2026-07-28T05:00:00Z',
              },
              timeZone: { id: 'Asia/Taipei' },
            },
          ],
        }),
    });

    const result = await search(query);

    assert.equal(result.restaurants[0]?.id, 'banxin-77');
    assert.equal(result.restaurants[0]?.closingTimeText, '營業到 13:00');
  });

  it('rejects a missing key before making a request', async () => {
    let requested = false;
    const search = createGoogleNearbyRestaurantSearch({
      apiKey: ' ',
      fetchImpl: async () => {
        requested = true;
        return Response.json({});
      },
    });

    await assert.rejects(search(query), /GOOGLE_PLACES_API_KEY/);
    assert.equal(requested, false);
  });

  it('forwards the caller abort signal to Google', async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const search = createGoogleNearbyRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl: async (_input, init) => {
        receivedSignal = init?.signal;
        return Response.json({ places: [] });
      },
    });
    const controller = new AbortController();

    await search(query, { signal: controller.signal });

    assert.equal(receivedSignal, controller.signal);
  });

  it('includes the upstream status when Google rejects the request', async () => {
    const search = createGoogleNearbyRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl: async () => Response.json({}, { status: 429 }),
    });

    await assert.rejects(
      search(query),
      /Google Nearby Search request failed \(429\)/,
    );
  });
});
