import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGooglePlacesRestaurantSearch } from './googlePlaces.js';

const requestQuery = {
  lat: 25.033,
  lng: 121.565,
  radius: 3000 as const,
};

describe('Google Places restaurant search', () => {
  it('requests open restaurants with Enterprise hours fields and an enclosing rectangle', async () => {
    let requestUrl = '';
    let requestInit: RequestInit | undefined;
    const fetchImpl: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestInit = init;
      return Response.json({
        places: [],
        nextPageToken: 'next-page',
      });
    };
    const search = createGooglePlacesRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl,
    });

    const page = await search({
      ...requestQuery,
      pageToken: 'google-page-token',
    });

    assert.equal(
      requestUrl,
      'https://places.googleapis.com/v1/places:searchText',
    );
    assert.equal(requestInit?.method, 'POST');
    const headers = new Headers(requestInit?.headers);
    assert.equal(headers.get('X-Goog-Api-Key'), 'server-key');
    assert.equal(
      headers.get('X-Goog-FieldMask'),
      [
        'places.id',
        'places.displayName',
        'places.location',
        'places.formattedAddress',
        'places.primaryType',
        'places.primaryTypeDisplayName',
        'places.types',
        'places.googleMapsUri',
        'places.currentOpeningHours',
        'places.timeZone',
        'nextPageToken',
      ].join(','),
    );

    const body = JSON.parse(String(requestInit?.body));
    assert.deepEqual(
      {
        textQuery: body.textQuery,
        includedType: body.includedType,
        strictTypeFiltering: body.strictTypeFiltering,
        openNow: body.openNow,
        pageSize: body.pageSize,
        rankPreference: body.rankPreference,
        languageCode: body.languageCode,
        regionCode: body.regionCode,
        pageToken: body.pageToken,
      },
      {
        textQuery: 'restaurants',
        includedType: 'restaurant',
        strictTypeFiltering: true,
        openNow: true,
        pageSize: 20,
        rankPreference: 'DISTANCE',
        languageCode: 'zh-TW',
        regionCode: 'TW',
        pageToken: 'google-page-token',
      },
    );

    const rectangle = body.locationRestriction.rectangle;
    assert.ok(rectangle.low.latitude < requestQuery.lat);
    assert.ok(rectangle.low.longitude < requestQuery.lng);
    assert.ok(rectangle.high.latitude > requestQuery.lat);
    assert.ok(rectangle.high.longitude > requestQuery.lng);
    assert.ok(Math.abs(rectangle.low.latitude - 25.00602) < 0.0001);
    assert.ok(Math.abs(rectangle.high.latitude - 25.05998) < 0.0001);
    assert.deepEqual(page, {
      restaurants: [],
      nextPageToken: 'next-page',
    });
  });

  it('normalizes valid places, removes results outside the circle, and sorts by distance', async () => {
    const fetchImpl: typeof fetch = async () =>
      Response.json({
        places: [
          {
            id: 'farther',
            displayName: { text: '較遠餐廳' },
            location: { latitude: 25.05, longitude: 121.565 },
            primaryTypeDisplayName: { text: '台灣餐廳' },
            formattedAddress: '台北市較遠路 2 號',
            googleMapsUri: 'https://maps.google.com/farther',
            currentOpeningHours: {
              openNow: true,
              periods: [
                {
                  open: { day: 0, hour: 0, minute: 0 },
                },
              ],
            },
          },
          {
            id: 'outside',
            displayName: { text: '超出範圍' },
            location: { latitude: 25.08, longitude: 121.565 },
            googleMapsUri: 'https://maps.google.com/outside',
          },
          {
            id: 'nearer',
            displayName: { text: '最近餐廳' },
            location: { latitude: 25.034, longitude: 121.565 },
            primaryType: 'restaurant',
            currentOpeningHours: {
              openNow: true,
              nextCloseTime: '2026-07-27T15:00:00Z',
            },
            timeZone: {
              id: 'Asia/Taipei',
            },
          },
          {
            id: 'malformed',
            displayName: { text: '' },
            location: { latitude: 25.033, longitude: 121.565 },
          },
        ],
      });
    const search = createGooglePlacesRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl,
    });

    const page = await search(requestQuery);

    assert.deepEqual(
      page.restaurants.map(({ id }) => id),
      ['nearer', 'farther'],
    );
    assert.ok(
      Math.abs(page.restaurants[0].distanceMeters - 111) <= 1,
    );
    assert.ok(
      Math.abs(page.restaurants[1].distanceMeters - 1890) <= 2,
    );
    assert.deepEqual(page.restaurants[0], {
      id: 'nearer',
      name: '最近餐廳',
      distanceMeters: page.restaurants[0].distanceMeters,
      isOpenNow: true,
      closingTimeText: '營業到 23:00',
      location: {
        lat: 25.034,
        lng: 121.565,
      },
      googleMapsUrl:
        'https://www.google.com/maps/search/?api=1&query=%E6%9C%80%E8%BF%91%E9%A4%90%E5%BB%B3&query_place_id=nearer',
    });
    assert.deepEqual(page.restaurants[1], {
      id: 'farther',
      name: '較遠餐廳',
      distanceMeters: page.restaurants[1].distanceMeters,
      isOpenNow: true,
      address: '台北市較遠路 2 號',
      cuisineTypes: ['台灣餐廳'],
      closingTimeText: '24 小時營業',
      location: {
        lat: 25.05,
        lng: 121.565,
      },
      googleMapsUrl: 'https://maps.google.com/farther',
    });
  });

  it('omits a page token from the first request body', async () => {
    let body: Record<string, unknown> | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      body = JSON.parse(String(init?.body));
      return Response.json({ places: [] });
    };
    const search = createGooglePlacesRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl,
    });

    await search(requestQuery);

    assert.equal(Object.hasOwn(body ?? {}, 'pageToken'), false);
  });

  it('forwards an abort signal to Google', async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      receivedSignal = init?.signal;
      return Response.json({ places: [] });
    };
    const search = createGooglePlacesRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl,
    });
    const controller = new AbortController();

    await search(requestQuery, { signal: controller.signal });

    assert.equal(receivedSignal, controller.signal);
  });

  it('rejects a missing server API key without making a request', async () => {
    let requested = false;
    const search = createGooglePlacesRestaurantSearch({
      apiKey: '   ',
      fetchImpl: async () => {
        requested = true;
        return Response.json({});
      },
    });

    await assert.rejects(search(requestQuery), /GOOGLE_PLACES_API_KEY/);
    assert.equal(requested, false);
  });

  it('includes the upstream status when Google rejects the request', async () => {
    const search = createGooglePlacesRestaurantSearch({
      apiKey: 'server-key',
      fetchImpl: async () =>
        Response.json(
          {
            error: {
              message: 'Quota exceeded',
            },
          },
          { status: 429 },
        ),
    });

    await assert.rejects(search(requestQuery), /Google Places request failed \(429\)/);
  });
});
