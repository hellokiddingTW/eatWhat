/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { requireGoogleMapsWebApiKey } from './googleMapsWebConfig';

describe('Google Maps web config', () => {
  it('rejects a missing web key with a clear variable name', () => {
    assert.throws(
      () => requireGoogleMapsWebApiKey(undefined),
      /EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY/,
    );
  });

  it('trims and returns a configured web key', () => {
    assert.equal(requireGoogleMapsWebApiKey(' web-key '), 'web-key');
  });
});
