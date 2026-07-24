# EatWhat API Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Hono + Node.js API that serves mock nearby restaurant results from `/restaurants/nearby`.

**Architecture:** Keep the API as a separate `api/` package inside the repo. Export a Hono `app` for tests and a `server.ts` entry for local development. Use pure service helpers for query validation and restaurant filtering so behavior is testable without starting a server.

**Tech Stack:** Hono, `@hono/node-server`, Node.js, TypeScript, `tsx`, Node's built-in test runner.

## Global Constraints

- API endpoint is `GET /restaurants/nearby?lat=...&lng=...&radius=3000`.
- `radius` accepts only `3000`, `5000`, or `10000`.
- Return only currently open restaurants.
- Sort restaurants by distance ascending.
- Response body shape is `{ restaurants: Restaurant[] }`.
- Invalid query parameters return HTTP 400 with `{ error: { message, details } }`.
- Do not integrate Google Places in this slice.
- Do not make the mobile app fetch the API in this slice.

---

## File Structure

- `api/package.json`: API package scripts and dependencies.
- `api/tsconfig.json`: API TypeScript config.
- `api/src/types/restaurant.ts`: API-side `Restaurant` and query types.
- `api/src/data/mockRestaurants.ts`: API mock data.
- `api/src/services/restaurants.ts`: Query validation and nearby restaurant filtering.
- `api/src/app.ts`: Hono app and routes.
- `api/src/server.ts`: Node server entry.
- `api/src/app.test.ts`: Endpoint behavior tests.

## Task 1: API Package Setup

**Files:**
- Create: `api/package.json`
- Create: `api/tsconfig.json`

**Interfaces:**
- Produces scripts: `npm --prefix api test`, `npm --prefix api run typecheck`, `npm --prefix api run dev`.

- [ ] Create `api/package.json` with scripts for dev, test, typecheck, and build.
- [ ] Create `api/tsconfig.json` with strict ESM TypeScript settings.
- [ ] Install runtime dependencies: `hono`, `@hono/node-server`.
- [ ] Install dev dependencies: `tsx`, `typescript`, `@types/node`.

## Task 2: Tests First

**Files:**
- Create: `api/src/app.test.ts`

**Interfaces:**
- Consumes future export `app` from `./app`.
- Verifies `/health` and `/restaurants/nearby`.

- [ ] Write tests for health check, valid nearby query, radius filtering, invalid radius, and missing coordinates.
- [ ] Run `npm --prefix api test`.
- [ ] Expected before implementation: tests fail because `api/src/app.ts` does not exist.

## Task 3: API Types, Data, And Service

**Files:**
- Create: `api/src/types/restaurant.ts`
- Create: `api/src/data/mockRestaurants.ts`
- Create: `api/src/services/restaurants.ts`

**Interfaces:**
- Produces `Restaurant`, `NearbyRestaurantQuery`, `parseNearbyRestaurantQuery`, `getNearbyRestaurants`.

- [ ] Add the API `Restaurant` type matching the approved MVP spec.
- [ ] Add sorted mock restaurant data.
- [ ] Implement query parsing with numeric coordinate validation and allowed radius validation.
- [ ] Implement distance-based filtering and sorting.

## Task 4: Hono App And Server

**Files:**
- Create: `api/src/app.ts`
- Create: `api/src/server.ts`

**Interfaces:**
- Produces exported `app`.
- Produces runnable local server on `PORT` or `8787`.

- [ ] Create Hono app with `GET /health`.
- [ ] Create `GET /restaurants/nearby`.
- [ ] Return 400 JSON for invalid query parameters.
- [ ] Create Node server entry using `serve({ fetch: app.fetch, port })`.

## Task 5: Verification

- [ ] Run `npm --prefix api test`.
- [ ] Run `npm --prefix api run typecheck`.
- [ ] Start API dev server with `npm --prefix api run dev`.
- [ ] Smoke test `GET /health`.
- [ ] Smoke test `GET /restaurants/nearby?lat=25.033&lng=121.565&radius=3000`.
- [ ] Commit the API skeleton.

## Self-Review

- Spec coverage: This plan covers the mock Hono endpoint, query validation, radius filtering, open restaurant response, and local server entry.
- Known gap: Google Places and mobile app fetching are intentionally deferred.
- Placeholder scan: No TBD/TODO/FIXME placeholders are present.
- Type consistency: `Restaurant`, `NearbyRestaurantQuery`, `parseNearbyRestaurantQuery`, `getNearbyRestaurants`, and `app` are consistently named.
