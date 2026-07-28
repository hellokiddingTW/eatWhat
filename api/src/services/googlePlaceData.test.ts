import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeRestaurantResults,
  normalizeGooglePlaces,
} from './googlePlaceData.js';

const query = {
  lat: 25.0136677,
  lng: 121.4735569,
  radius: 3000 as const,
};

describe('Google Place normalization', () => {
  it('retains an open brunch restaurant and formats its closing time', () => {
    const restaurants = normalizeGooglePlaces(
      [
        {
          id: 'banxin-77',
          displayName: { text: '板新77早午餐' },
          location: {
            latitude: 25.0136677,
            longitude: 121.4735569,
          },
          primaryTypeDisplayName: { text: '早午餐餐廳' },
          types: [
            'brunch_restaurant',
            'breakfast_restaurant',
            'restaurant',
          ],
          currentOpeningHours: {
            openNow: true,
            nextCloseTime: '2026-07-28T05:00:00Z',
          },
          timeZone: { id: 'Asia/Taipei' },
        },
      ],
      query,
    );

    assert.deepEqual(restaurants, [
      {
        id: 'banxin-77',
        name: '板新77早午餐',
        distanceMeters: 0,
        isOpenNow: true,
        closingTimeText: '營業到 13:00',
        cuisineTypes: ['早午餐餐廳'],
        location: {
          lat: 25.0136677,
          lng: 121.4735569,
        },
        googleMapsUrl:
          'https://www.google.com/maps/search/?api=1&query=%E6%9D%BF%E6%96%B077%E6%97%A9%E5%8D%88%E9%A4%90&query_place_id=banxin-77',
      },
    ]);
  });

  it('removes closed, unknown-hours, non-restaurants, and out-of-radius places', () => {
    const restaurants = normalizeGooglePlaces(
      [
        {
          id: 'closed',
          displayName: { text: 'Closed' },
          location: { latitude: 25.0137, longitude: 121.4736 },
          types: ['restaurant'],
          currentOpeningHours: { openNow: false },
        },
        {
          id: 'unknown',
          displayName: { text: 'Unknown' },
          location: { latitude: 25.0138, longitude: 121.4736 },
          types: ['restaurant'],
        },
        {
          id: 'beverage',
          displayName: { text: 'Beverage' },
          location: { latitude: 25.0138, longitude: 121.4736 },
          types: ['beverage_store'],
          currentOpeningHours: { openNow: true },
        },
        {
          id: 'outside',
          displayName: { text: 'Outside' },
          location: { latitude: 25.08, longitude: 121.4736 },
          types: ['restaurant'],
          currentOpeningHours: { openNow: true },
        },
      ],
      query,
    );

    assert.deepEqual(restaurants, []);
  });

  it('deduplicates one Google response by Place ID', () => {
    const duplicate = {
      id: 'same-place',
      displayName: { text: 'Same Place' },
      location: {
        latitude: query.lat,
        longitude: query.lng,
      },
      types: ['restaurant'],
      currentOpeningHours: { openNow: true },
    };

    const restaurants = normalizeGooglePlaces(
      [
        duplicate,
        {
          ...duplicate,
          displayName: { text: 'Duplicate Name' },
        },
      ],
      query,
    );

    assert.equal(restaurants.length, 1);
    assert.equal(restaurants[0]?.name, 'Same Place');
  });

  it('deduplicates with primary precedence and sorts the merged result', () => {
    const primary = [
      {
        id: 'shared',
        name: 'Nearby name',
        distanceMeters: 500,
        isOpenNow: true as const,
        location: { lat: 25.01, lng: 121.47 },
        googleMapsUrl: 'https://maps.google.com/nearby',
      },
      {
        id: 'far',
        name: 'Far',
        distanceMeters: 900,
        isOpenNow: true as const,
        location: { lat: 25.02, lng: 121.47 },
        googleMapsUrl: 'https://maps.google.com/far',
      },
    ];
    const fallback = [
      {
        ...primary[0],
        name: 'Text name',
      },
      {
        id: 'near',
        name: 'Near',
        distanceMeters: 200,
        isOpenNow: true as const,
        location: { lat: 25.011, lng: 121.47 },
        googleMapsUrl: 'https://maps.google.com/near',
      },
    ];

    assert.deepEqual(
      mergeRestaurantResults(primary, fallback).map(({ id, name }) => ({
        id,
        name,
      })),
      [
        { id: 'near', name: 'Near' },
        { id: 'shared', name: 'Nearby name' },
        { id: 'far', name: 'Far' },
      ],
    );
  });
});
