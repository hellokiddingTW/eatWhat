/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Restaurant } from '../types/restaurant';
import { fetchNearbyRestaurants } from './restaurantsApi';

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
  it('requests one nearby result with coordinates and radius', async () => {
    let requestedUrl = '';
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return Response.json({ restaurants: [sampleRestaurant] });
    };

    const result = await fetchNearbyRestaurants(
      {
        lat: 25.033,
        lng: 121.565,
        radius: 3000,
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
    assert.equal(url.searchParams.has('pageToken'), false);
    assert.deepEqual(result, {
      restaurants: [sampleRestaurant],
    });
  });

  it('forwards an abort signal to the Hono request', async () => {
    let receivedSignal: AbortSignal | null | undefined;
    const fetchImpl: typeof fetch = async (_input, init) => {
      receivedSignal = init?.signal;
      return Response.json({ restaurants: [] });
    };
    const controller = new AbortController();

    await fetchNearbyRestaurants(
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
      fetchNearbyRestaurants(
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
      fetchNearbyRestaurants(
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
