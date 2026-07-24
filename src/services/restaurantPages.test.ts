/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Restaurant } from '../types/restaurant';
import {
  canLoadRestaurantPage,
  mergeRestaurantPages,
} from './restaurantPages';

const restaurant = (id: string, distanceMeters: number): Restaurant => ({
  id,
  name: `Restaurant ${id}`,
  distanceMeters,
  isOpenNow: true,
  location: {
    lat: 25.033 + distanceMeters / 1_000_000,
    lng: 121.565,
  },
  googleMapsUrl: `https://maps.google.com/?q=${id}`,
});

describe('restaurant pagination', () => {
  it('appends new restaurants without duplicating existing place IDs', () => {
    const current = [restaurant('a', 100), restaurant('b', 200)];
    const incoming = [restaurant('b', 210), restaurant('c', 300)];

    assert.deepEqual(
      mergeRestaurantPages(current, incoming).map(({ id, distanceMeters }) => ({
        id,
        distanceMeters,
      })),
      [
        { id: 'a', distanceMeters: 100 },
        { id: 'b', distanceMeters: 200 },
        { id: 'c', distanceMeters: 300 },
      ],
    );
  });

  it('loads only when a token exists and fewer than three pages were loaded', () => {
    assert.equal(canLoadRestaurantPage(1, 'next-token'), true);
    assert.equal(canLoadRestaurantPage(2, 'next-token'), true);
    assert.equal(canLoadRestaurantPage(3, 'next-token'), false);
    assert.equal(canLoadRestaurantPage(1, undefined), false);
    assert.equal(canLoadRestaurantPage(1, '   '), false);
  });
});
