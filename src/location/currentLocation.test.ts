/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createCurrentLocationRequester,
  type LocationClient,
} from './currentLocation';

const grantedClient = (overrides: Partial<LocationClient> = {}): LocationClient => ({
  requestForegroundPermission: async () => ({ granted: true }),
  getHighestAccuracyPosition: async () => ({
    coords: {
      latitude: 25.0478,
      longitude: 121.5319,
      accuracy: 8,
    },
  }),
  ...overrides,
});

describe('createCurrentLocationRequester', () => {
  it('returns the current app coordinate and reported accuracy', async () => {
    const request = createCurrentLocationRequester(grantedClient());

    assert.deepEqual(await request(), {
      status: 'ready',
      coordinate: { lat: 25.0478, lng: 121.5319 },
      accuracyMeters: 8,
    });
  });

  it('returns permissionDenied without requesting a position', async () => {
    let positionCalls = 0;
    const request = createCurrentLocationRequester(
      grantedClient({
        requestForegroundPermission: async () => ({ granted: false }),
        getHighestAccuracyPosition: async () => {
          positionCalls += 1;
          throw new Error('must not run');
        },
      }),
    );

    assert.deepEqual(await request(), { status: 'permissionDenied' });
    assert.equal(positionCalls, 0);
  });

  it('returns error when the current position cannot be obtained', async () => {
    const request = createCurrentLocationRequester(
      grantedClient({
        getHighestAccuracyPosition: async () => {
          throw new Error('location unavailable');
        },
      }),
    );

    assert.deepEqual(await request(), { status: 'error' });
  });

  it('shares one in-flight request and allows a later refresh', async () => {
    let positionCalls = 0;
    let releasePosition: (() => void) | undefined;
    const request = createCurrentLocationRequester(
      grantedClient({
        getHighestAccuracyPosition: async () => {
          positionCalls += 1;
          await new Promise<void>((resolve) => {
            releasePosition = resolve;
          });
          return {
            coords: { latitude: 25, longitude: 121, accuracy: 6 },
          };
        },
      }),
    );

    const first = request();
    const second = request();
    assert.equal(first, second);
    await Promise.resolve();
    await Promise.resolve();
    releasePosition?.();
    await first;
    assert.equal(positionCalls, 1);

    const third = request();
    await Promise.resolve();
    await Promise.resolve();
    releasePosition?.();
    await third;
    assert.equal(positionCalls, 2);
  });
});
