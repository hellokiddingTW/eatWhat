/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildMapMarkerLabels } from './mapMarkerLabels';

describe('buildMapMarkerLabels', () => {
  it('always labels the user as the current location', () => {
    assert.equal(buildMapMarkerLabels().user, '現在位置');
  });

  it('uses the active restaurant name for its label', () => {
    assert.deepEqual(buildMapMarkerLabels({ name: '阿明牛肉麵' }), {
      user: '現在位置',
      restaurant: '阿明牛肉麵',
    });
  });
});
