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
        type: 'firstPageLoaded',
        page: {
          restaurants: [restaurant('a')],
          nextPageToken: 'next',
        },
      },
    );

    assert.deepEqual(
      reduceRestaurantSearchState(readyState, { type: 'searchStarted' }),
      {
        status: 'loading',
        restaurants: [],
        pagesLoaded: 0,
        isLoadingMore: false,
        loadMoreFailed: false,
      },
    );
  });

  it('stores the first page and its next-page token', () => {
    assert.deepEqual(
      reduceRestaurantSearchState(
        { ...INITIAL_RESTAURANT_SEARCH_STATE, status: 'loading' },
        {
          type: 'firstPageLoaded',
          page: {
            restaurants: [restaurant('a')],
            nextPageToken: 'next',
          },
        },
      ),
      {
        status: 'ready',
        restaurants: [restaurant('a')],
        nextPageToken: 'next',
        pagesLoaded: 1,
        isLoadingMore: false,
        loadMoreFailed: false,
      },
    );
  });

  it('keeps existing restaurants while another page is loading', () => {
    const state = {
      status: 'ready' as const,
      restaurants: [restaurant('a')],
      nextPageToken: 'next',
      pagesLoaded: 1,
      isLoadingMore: false,
      loadMoreFailed: true,
    };

    assert.deepEqual(
      reduceRestaurantSearchState(state, { type: 'nextPageStarted' }),
      {
        ...state,
        isLoadingMore: true,
        loadMoreFailed: false,
      },
    );
  });

  it('merges and deduplicates another page while counting loaded pages', () => {
    const state = {
      status: 'ready' as const,
      restaurants: [restaurant('a'), restaurant('b')],
      nextPageToken: 'next',
      pagesLoaded: 1,
      isLoadingMore: true,
      loadMoreFailed: false,
    };

    assert.deepEqual(
      reduceRestaurantSearchState(state, {
        type: 'nextPageLoaded',
        page: {
          restaurants: [restaurant('b'), restaurant('c')],
        },
      }),
      {
        status: 'ready',
        restaurants: [restaurant('a'), restaurant('b'), restaurant('c')],
        pagesLoaded: 2,
        isLoadingMore: false,
        loadMoreFailed: false,
      },
    );
  });

  it('distinguishes an initial failure from a next-page failure', () => {
    assert.deepEqual(
      reduceRestaurantSearchState(
        { ...INITIAL_RESTAURANT_SEARCH_STATE, status: 'loading' },
        { type: 'firstPageFailed' },
      ),
      {
        status: 'error',
        restaurants: [],
        pagesLoaded: 0,
        isLoadingMore: false,
        loadMoreFailed: false,
      },
    );

    const readyState = {
      status: 'ready' as const,
      restaurants: [restaurant('a')],
      nextPageToken: 'next',
      pagesLoaded: 1,
      isLoadingMore: true,
      loadMoreFailed: false,
    };

    assert.deepEqual(
      reduceRestaurantSearchState(readyState, { type: 'nextPageFailed' }),
      {
        ...readyState,
        isLoadingMore: false,
        loadMoreFailed: true,
      },
    );
  });
});
