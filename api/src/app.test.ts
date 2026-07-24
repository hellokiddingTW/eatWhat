import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { app } from './app.js';

describe('EatWhat API', () => {
  it('returns health status', async () => {
    const response = await app.request('/health');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { ok: true });
  });

  it('returns nearby open restaurants sorted by distance', async () => {
    const response = await app.request('/restaurants/nearby?lat=25.033&lng=121.565&radius=3000');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body.restaurants));
    assert.equal(body.restaurants.length, 3);
    assert.deepEqual(
      body.restaurants.map((restaurant: { name: string }) => restaurant.name),
      ['麥當勞 QQ店', '阿明牛肉麵', '小巷咖哩飯'],
    );
    assert.ok(body.restaurants.every((restaurant: { isOpenNow: boolean }) => restaurant.isOpenNow));
  });

  it('filters restaurants by selected radius', async () => {
    const response = await app.request('/restaurants/nearby?lat=25.033&lng=121.565&radius=5000');
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.restaurants.length, 4);
    assert.equal(body.restaurants.at(-1).name, '深夜食堂一號店');
  });

  it('rejects unsupported radius values', async () => {
    const response = await app.request('/restaurants/nearby?lat=25.033&lng=121.565&radius=7000');
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.message, 'Invalid query parameters');
    assert.deepEqual(body.error.details, ['radius must be one of 3000, 5000, 10000']);
  });

  it('rejects missing coordinates', async () => {
    const response = await app.request('/restaurants/nearby?radius=3000');
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.message, 'Invalid query parameters');
    assert.deepEqual(body.error.details, ['lat is required', 'lng is required']);
  });
});
