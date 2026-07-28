import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type {
  NearbyRestaurantQuery,
  Restaurant,
} from '../types/restaurant.js';
import { createRestaurantSearchWithFallback } from './restaurantSearchWithFallback.js';

const query: NearbyRestaurantQuery = {
  lat: 25.0136677,
  lng: 121.4735569,
  radius: 3000,
};

const restaurants = (count: number, prefix: string): Restaurant[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`,
    name: `${prefix} ${index}`,
    distanceMeters: (index + 1) * 100,
    isOpenNow: true,
    location: {
      lat: 25.013 + index / 100_000,
      lng: 121.473,
    },
    googleMapsUrl: `https://maps.google.com/${prefix}-${index}`,
  }));

describe('restaurant search fallback', () => {
  it('skips Text Search when Nearby returns at least ten restaurants', async () => {
    let textCalls = 0;
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async () => ({
        restaurants: restaurants(10, 'nearby'),
      }),
      textSearch: async () => {
        textCalls += 1;
        return { restaurants: restaurants(10, 'text') };
      },
    });

    const result = await search(query);

    assert.equal(result.restaurants.length, 10);
    assert.equal(textCalls, 0);
  });

  it('merges one Text Search when Nearby returns fewer than ten', async () => {
    let nearbyCalls = 0;
    let textCalls = 0;
    const nearbyRestaurants = restaurants(3, 'nearby');
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async () => {
        nearbyCalls += 1;
        return { restaurants: nearbyRestaurants };
      },
      textSearch: async () => {
        textCalls += 1;
        return {
          restaurants: [
            {
              ...nearbyRestaurants[0],
              name: 'duplicate text record',
            },
            ...restaurants(3, 'text'),
          ],
        };
      },
    });

    const result = await search(query);

    assert.equal(result.restaurants.length, 6);
    assert.equal(result.restaurants[0]?.name, 'nearby 0');
    assert.equal(nearbyCalls, 1);
    assert.equal(textCalls, 1);
  });

  it('returns Nearby results when the optional Text fallback fails', async () => {
    const nearbyRestaurants = restaurants(2, 'nearby');
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async () => ({ restaurants: nearbyRestaurants }),
      textSearch: async () => {
        throw new Error('Text failed');
      },
    });

    const result = await search(query);

    assert.deepEqual(result.restaurants, nearbyRestaurants);
  });

  it('returns Text results when Nearby fails', async () => {
    const textRestaurants = restaurants(2, 'text');
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async () => {
        throw new Error('Nearby failed');
      },
      textSearch: async () => ({ restaurants: textRestaurants }),
    });

    const result = await search(query);

    assert.deepEqual(result.restaurants, textRestaurants);
  });

  it('rejects when both searches fail', async () => {
    let requests = 0;
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async () => {
        requests += 1;
        throw new Error('Nearby failed');
      },
      textSearch: async () => {
        requests += 1;
        throw new Error('Text failed');
      },
    });

    await assert.rejects(search(query), /Text failed/);
    assert.equal(requests, 2);
  });

  it('passes the same abort signal to both searches', async () => {
    const receivedSignals: (AbortSignal | undefined)[] = [];
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async (_query, options) => {
        receivedSignals.push(options?.signal);
        return { restaurants: [] };
      },
      textSearch: async (_query, options) => {
        receivedSignals.push(options?.signal);
        return { restaurants: [] };
      },
    });
    const controller = new AbortController();

    await search(query, { signal: controller.signal });

    assert.deepEqual(receivedSignals, [
      controller.signal,
      controller.signal,
    ]);
  });

  it('does not start Text Search after Nearby aborts', async () => {
    let textCalls = 0;
    const controller = new AbortController();
    const abortError = new Error('aborted');
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async () => {
        controller.abort();
        throw abortError;
      },
      textSearch: async () => {
        textCalls += 1;
        return { restaurants: [] };
      },
    });

    await assert.rejects(
      search(query, { signal: controller.signal }),
      (error) => error === abortError,
    );
    assert.equal(textCalls, 0);
  });

  it('rejects an aborted Text fallback instead of returning Nearby data', async () => {
    const controller = new AbortController();
    const abortError = new Error('aborted');
    const search = createRestaurantSearchWithFallback({
      nearbySearch: async () => ({
        restaurants: restaurants(1, 'nearby'),
      }),
      textSearch: async () => {
        controller.abort();
        throw abortError;
      },
    });

    await assert.rejects(
      search(query, { signal: controller.signal }),
      (error) => error === abortError,
    );
  });
});
