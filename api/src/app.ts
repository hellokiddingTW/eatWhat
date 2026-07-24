import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createGooglePlacesRestaurantSearch } from './services/googlePlaces.js';
import { parseNearbyRestaurantQuery } from './services/restaurants.js';
import type { RestaurantSearch } from './types/restaurant.js';

type CreateAppOptions = {
  searchRestaurants: RestaurantSearch;
  maxSearchRequestsPerMinute?: number;
};

const DEFAULT_MAX_SEARCH_REQUESTS_PER_MINUTE = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_TRACKED_RATE_LIMIT_CLIENTS = 10_000;

type SearchRateWindow = {
  startedAt: number;
  requestCount: number;
};

const parseSearchRateLimit = (value?: string) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : DEFAULT_MAX_SEARCH_REQUESTS_PER_MINUTE;
};

export const createApp = ({
  searchRestaurants,
  maxSearchRequestsPerMinute = DEFAULT_MAX_SEARCH_REQUESTS_PER_MINUTE,
}: CreateAppOptions) => {
  const app = new Hono();
  const searchWindows = new Map<string, SearchRateWindow>();

  app.use('*', cors());
  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/restaurants/nearby', async (c) => {
    const parsedQuery = parseNearbyRestaurantQuery(c.req.query());

    if (!parsedQuery.ok) {
      return c.json(
        {
          error: {
            message: 'Invalid query parameters',
            details: parsedQuery.details,
          },
        },
        400,
      );
    }

    const forwardedClient = c.req
      .header('x-forwarded-for')
      ?.split(',')[0]
      ?.trim();
    const realClient = c.req.header('x-real-ip')?.trim();
    let clientKey = forwardedClient || realClient || 'local-client';
    if (
      !searchWindows.has(clientKey) &&
      searchWindows.size >= MAX_TRACKED_RATE_LIMIT_CLIENTS
    ) {
      clientKey = 'overflow-clients';
    }

    const now = Date.now();
    const currentWindow = searchWindows.get(clientKey);
    if (
      !currentWindow ||
      now - currentWindow.startedAt >= RATE_LIMIT_WINDOW_MS
    ) {
      searchWindows.set(clientKey, {
        startedAt: now,
        requestCount: 1,
      });
    } else if (
      currentWindow.requestCount >= maxSearchRequestsPerMinute
    ) {
      c.header('Retry-After', '60');
      return c.json(
        {
          error: {
            message: 'Too many restaurant searches',
          },
        },
        429,
      );
    } else {
      currentWindow.requestCount += 1;
    }

    try {
      return c.json(
        await searchRestaurants(parsedQuery.query, {
          signal: c.req.raw.signal,
        }),
      );
    } catch {
      return c.json(
        {
          error: {
            message: 'Restaurant search failed',
          },
        },
        502,
      );
    }
  });

  return app;
};

const searchRestaurants = createGooglePlacesRestaurantSearch({
  apiKey: process.env.GOOGLE_PLACES_API_KEY,
});

export const app = createApp({
  searchRestaurants,
  maxSearchRequestsPerMinute: parseSearchRateLimit(
    process.env.MAX_SEARCH_REQUESTS_PER_MINUTE,
  ),
});
