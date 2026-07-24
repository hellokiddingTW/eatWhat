/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyLocationResult,
  beginLocationRequest,
  INITIAL_LOCATION_STATE,
} from './locationViewState';

describe('location view state', () => {
  it('uses loading for the first request', () => {
    assert.deepEqual(beginLocationRequest(INITIAL_LOCATION_STATE), {
      status: 'loading',
      isRefreshing: true,
    });
  });

  it('keeps a ready coordinate visible while refreshing', () => {
    assert.deepEqual(
      beginLocationRequest({
        status: 'ready',
        coordinate: { lat: 25, lng: 121 },
        accuracyMeters: 7,
        isRefreshing: false,
      }),
      {
        status: 'ready',
        coordinate: { lat: 25, lng: 121 },
        accuracyMeters: 7,
        isRefreshing: true,
      },
    );
  });

  it('stores a successful coordinate and clears refreshing', () => {
    assert.deepEqual(
      applyLocationResult(INITIAL_LOCATION_STATE, {
        status: 'ready',
        coordinate: { lat: 25.1, lng: 121.5 },
        accuracyMeters: 9,
      }),
      {
        status: 'ready',
        coordinate: { lat: 25.1, lng: 121.5 },
        accuracyMeters: 9,
        isRefreshing: false,
      },
    );
  });

  it('does not retain a fake coordinate after denial or error', () => {
    assert.deepEqual(
      applyLocationResult(INITIAL_LOCATION_STATE, {
        status: 'permissionDenied',
      }),
      { status: 'permissionDenied', isRefreshing: false },
    );
    assert.deepEqual(
      applyLocationResult(INITIAL_LOCATION_STATE, { status: 'error' }),
      { status: 'error', isRefreshing: false },
    );
  });
});
