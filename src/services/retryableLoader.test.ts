/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRetryableLoader } from './retryableLoader';

describe('createRetryableLoader', () => {
  it('shares an in-flight load and caches its successful result', async () => {
    let attempts = 0;
    const load = createRetryableLoader(async () => {
      attempts += 1;
      return 'ready';
    });

    const [first, second] = await Promise.all([load(), load()]);

    assert.equal(first, 'ready');
    assert.equal(second, 'ready');
    assert.equal(attempts, 1);
    assert.equal(await load(), 'ready');
    assert.equal(attempts, 1);
  });

  it('clears a failed load so the next call can retry', async () => {
    let attempts = 0;
    const load = createRetryableLoader(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('temporary network error');
      }
      return 'ready';
    });

    await assert.rejects(load(), /temporary network error/);
    assert.equal(await load(), 'ready');
    assert.equal(attempts, 2);
  });
});
