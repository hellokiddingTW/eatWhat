/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Restaurant } from '../types/restaurant';
import {
  INITIAL_RESTAURANT_SEARCH_STATE,
  reduceRestaurantSearchState,
} from './restaurantSearchState';

const restaurant = (id: string): Restaurant => ({
  id,
  name: `Restaurant ${id}`,
  distanceMeters: id.charCodeAt(0),
  isOpenNow: true,
  location: {
    lat: 25.033,
    lng: 121.565,
  },
  googleMapsUrl: `https://maps.google.com/?q=${id}`,
});

describe('restaurant search state', () => {
  it('starts a fresh search without keeping results from another radius', () => {
    const readyState = reduceRestaurantSearchState(
      INITIAL_RESTAURANT_SEARCH_STATE,
      {
        type: 'searchLoaded',
        result: {
          restaurants: [restaurant('a')],
        },
      },
    );

    assert.deepEqual(
      reduceRestaurantSearchState(readyState, { type: 'searchStarted' }),
      {
        status: 'loading',
        restaurants: [],
      },
    );
  });

  it('stores one complete successful restaurant result', () => {
    const loading = reduceRestaurantSearchState(
      INITIAL_RESTAURANT_SEARCH_STATE,
      { type: 'searchStarted' },
    );
    const ready = reduceRestaurantSearchState(loading, {
      type: 'searchLoaded',
      result: {
        restaurants: [restaurant('b'), restaurant('a')],
      },
    });

    assert.equal(ready.status, 'ready');
    assert.deepEqual(
      ready.restaurants.map(({ id }) => id),
      ['b', 'a'],
    );
  });

  it('stores an error without stale restaurants when a search fails', () => {
    assert.deepEqual(
      reduceRestaurantSearchState(
        { ...INITIAL_RESTAURANT_SEARCH_STATE, status: 'loading' },
        { type: 'searchFailed' },
      ),
      {
        status: 'error',
        restaurants: [],
      },
    );
  });
});
