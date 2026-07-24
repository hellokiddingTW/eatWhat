/// <reference types="google.maps" />

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { createRetryableLoader } from './retryableLoader';

export type GoogleMapsWebLibraries = {
  LatLngBounds: google.maps.CoreLibrary['LatLngBounds'];
  Map: google.maps.MapsLibrary['Map'];
  Marker: google.maps.MarkerLibrary['Marker'];
  SymbolPath: google.maps.CoreLibrary['SymbolPath'];
};

let configuredApiKey: string | undefined;

const loadLibraries = createRetryableLoader(async () => {
  const [mapsLibrary, markerLibrary, coreLibrary] = await Promise.all([
    importLibrary('maps'),
    importLibrary('marker'),
    importLibrary('core'),
  ]);

  return {
    Map: mapsLibrary.Map,
    Marker: markerLibrary.Marker,
    LatLngBounds: coreLibrary.LatLngBounds,
    SymbolPath: coreLibrary.SymbolPath,
  };
});

export const loadGoogleMapsWeb = (apiKey: string) => {
  if (configuredApiKey && configuredApiKey !== apiKey) {
    return Promise.reject(new Error('Google Maps was already initialized with a different key.'));
  }

  if (!configuredApiKey) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      language: 'zh-TW',
      region: 'TW',
      authReferrerPolicy: 'origin',
    });
    configuredApiKey = apiKey;
  }

  return loadLibraries();
};
