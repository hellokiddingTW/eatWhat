/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const {
  getGoogleMapsPluginOptions,
  requireGoogleMapsApiKey,
} = require('../../plugins/withGoogleMaps');

describe('Google Maps config', () => {
  it('rejects a native platform when its key is missing', () => {
    assert.throws(
      () => requireGoogleMapsApiKey({}, 'android'),
      /GOOGLE_MAPS_ANDROID_API_KEY/,
    );
    assert.throws(
      () => requireGoogleMapsApiKey({}, 'ios'),
      /GOOGLE_MAPS_IOS_API_KEY/,
    );
  });

  it('maps local environment variables to react-native-maps options', () => {
    assert.deepEqual(
      getGoogleMapsPluginOptions({
        GOOGLE_MAPS_ANDROID_API_KEY: 'android-key',
        GOOGLE_MAPS_IOS_API_KEY: 'ios-key',
      }),
      {
        androidGoogleMapsApiKey: 'android-key',
        iosGoogleMapsApiKey: 'ios-key',
      },
    );
  });

  it('allows each platform to validate its own key independently', () => {
    assert.equal(
      requireGoogleMapsApiKey({ GOOGLE_MAPS_ANDROID_API_KEY: 'android-key' }, 'android'),
      'android-key',
    );
    assert.equal(
      requireGoogleMapsApiKey({ GOOGLE_MAPS_IOS_API_KEY: 'ios-key' }, 'ios'),
      'ios-key',
    );
  });
});
