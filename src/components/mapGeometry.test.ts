/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMapRegion, toMapCoordinate } from './mapGeometry';

describe('mapGeometry', () => {
  it('converts app coordinates to map coordinates', () => {
    assert.deepEqual(toMapCoordinate({ lat: 25.033, lng: 121.565 }), {
      latitude: 25.033,
      longitude: 121.565,
    });
  });

  it('frames the user and restaurant with padded deltas', () => {
    assert.deepEqual(
      buildMapRegion(
        { lat: 25.03, lng: 121.56 },
        { lat: 25.04, lng: 121.58 },
      ),
      {
        latitude: 25.035,
        longitude: 121.57,
        latitudeDelta: 0.018,
        longitudeDelta: 0.036,
      },
    );
  });

  it('uses a stable minimum region when only the user is available', () => {
    assert.deepEqual(buildMapRegion({ lat: 25.033, lng: 121.565 }), {
      latitude: 25.033,
      longitude: 121.565,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    });
  });
});
