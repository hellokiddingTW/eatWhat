/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { requireApiBaseUrl } from './apiConfig';

describe('API config', () => {
  it('rejects a missing API base URL with the environment variable name', () => {
    assert.throws(
      () => requireApiBaseUrl(undefined),
      /EXPO_PUBLIC_API_BASE_URL/,
    );
  });

  it('rejects a non-HTTP API base URL', () => {
    assert.throws(
      () => requireApiBaseUrl('ftp://localhost:8787'),
      /HTTP URL/,
    );
  });

  it('trims the value and removes trailing slashes', () => {
    assert.equal(
      requireApiBaseUrl(' http://localhost:8787/// '),
      'http://localhost:8787',
    );
  });
});
