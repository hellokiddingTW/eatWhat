/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Restaurant } from '../types/restaurant';
import { fetchNearbyRestaurantPage } from './restaurantsApi';

const sampleRestaurant: Restaurant = {
  id: 'place-1',
  name: '測試餐廳',
  distanceMeters: 420,
  isOpenNow: true,
  location: {
    lat: 25.0337,
    lng: 121.5651,
  },
  googleMapsUrl: 'https://maps.google.com/?q=place-1',
};

describe('restaurants API client', () => {
  it('requests a nearby page with encoded coordinates, radius, and page token', async () => {
    let requestedUrl = '';
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return Response.json({
        restaurants: [sampleRestaurant],
        nextPageToken: 'next-page',
      });
    };

    const page = await fetchNearbyRestaurantPage(
      {
        lat: 25.033,
        lng: 121.565,
        radius: 3000,
        pageToken: 'token with spaces',
      },
      {
        baseUrl: 'http://localhost:8787/',
        fetchImpl,
      },
    );

    const url = new URL(requestedUrl);
    assert.equal(url.origin, 'http://localhost:8787');
    assert.equal(url.pathname, '/restaurants/nearby');
    assert.equal(url.searchParams.get('lat'), '25.033');
    assert.equal(url.searchParams.get('lng'), '121.565');
    assert.equal(url.searchParams.get('radius'), '3000');
    assert.equal(url.searchParams.get('pageToken'), 'token with spaces');
    assert.deepEqual(page, {
      restaurants: [sampleRestaurant],
      nextPageToken: 'next-page',
    });
  });

  it('omits the page token from a first-page request', async () => {
    let requestedUrl = '';
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return Response.json({ restaurants: [] });
    };

    await fetchNearbyRestaurantPage(
      {
        lat: 25.033,
        lng: 121.565,
        radius: 5000,
      },
      {
        baseUrl: 'http://localhost:8787',
        fetchImpl,
      },
    );

    assert.equal(new URL(requestedUrl).searchParams.has('pageToken'), false);
  });

  it('forwards an abort signal to the Hono request', async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      receivedSignal = init?.signal;
      return Response.json({ restaurants: [] });
    };
    const controller = new AbortController();

    await fetchNearbyRestaurantPage(
      {
        lat: 25.033,
        lng: 121.565,
        radius: 3000,
      },
      {
        baseUrl: 'http://localhost:8787',
        fetchImpl,
        signal: controller.signal,
      },
    );

    assert.equal(receivedSignal, controller.signal);
  });

  it('rejects a non-successful API response with its status', async () => {
    const fetchImpl: typeof fetch = async () =>
      Response.json(
        {
          error: {
            message: 'Restaurant search failed',
          },
        },
        { status: 502 },
      );

    await assert.rejects(
      fetchNearbyRestaurantPage(
        {
          lat: 25.033,
          lng: 121.565,
          radius: 3000,
        },
        {
          baseUrl: 'http://localhost:8787',
          fetchImpl,
        },
      ),
      /Restaurant search failed.*502/,
    );
  });

  it('rejects a successful response without a restaurant array', async () => {
    const fetchImpl: typeof fetch = async () => Response.json({ restaurants: null });

    await assert.rejects(
      fetchNearbyRestaurantPage(
        {
          lat: 25.033,
          lng: 121.565,
          radius: 3000,
        },
        {
          baseUrl: 'http://localhost:8787',
          fetchImpl,
        },
      ),
      /invalid restaurant response/i,
    );
  });
});
