import { Hono } from 'hono';
import { getNearbyRestaurants, parseNearbyRestaurantQuery } from './services/restaurants.js';

export const app = new Hono();

app.get('/health', (c) => c.json({ ok: true }));

app.get('/restaurants/nearby', (c) => {
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

  return c.json({
    restaurants: getNearbyRestaurants(parsedQuery.query),
  });
});
