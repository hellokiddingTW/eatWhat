# EatWhat Vercel Deployment Design

## Goal

Deploy the existing EatWhat Expo web app and Hono API from the same GitHub
repository to Vercel's free Hobby plan. The first production release will use
Vercel-provided `vercel.app` domains rather than a custom domain.

## Repository Model

EatWhat remains one GitHub repository:

```text
eatWhat/
├── App.tsx
├── src/
├── package.json
└── api/
    ├── package.json
    └── src/
```

Vercel will create two Projects connected to that repository:

1. `eatwhat-api` deploys the `api/` package as a Hono Node.js service.
2. `eatwhat` deploys the repository root as an Expo web static site.

This preserves the current source layout and avoids duplicating code or
creating a second GitHub repository.

## Deployment Architecture

```text
Browser
  |
  v
eatwhat.vercel.app
  |
  | HTTPS restaurant search
  v
eatwhat-api.vercel.app
  |
  | Server-side authenticated request
  v
Google Places API (New)
```

The web deployment contains only the Expo-generated static assets. The API
deployment runs Hono through Vercel's Node.js runtime. React Native builds can
later call the same API deployment.

## API Project

The API Vercel Project uses `api/` as its Root Directory. The existing Hono app
will gain a Vercel-compatible default export while preserving the current
`@hono/node-server` entry point for local development.

The public API paths remain:

- `GET /health`
- `GET /restaurants/nearby`

The API Project receives these runtime environment variables:

- `GOOGLE_PLACES_API_KEY`: secret server-only Google Places key.
- `MAX_SEARCH_REQUESTS_PER_MINUTE`: optional positive integer, default `60`.

`GOOGLE_PLACES_API_KEY` must never be included in an Expo public variable,
generated web bundle, Git commit, or deployment log.

## Web Project

The web Vercel Project uses the repository root as its Root Directory.

Its production build:

```text
npx expo export --platform web
```

The output directory is:

```text
dist
```

The Web Project receives these build-time environment variables:

- `EXPO_PUBLIC_API_BASE_URL`: the production `eatwhat-api` Vercel URL.
- `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`: the browser-restricted Maps
  JavaScript API key.

The Maps JavaScript key is expected to appear in the browser bundle. Its Google
Cloud restriction must allow only the production Vercel origin and approved
local development origins.

## Deployment Order

1. Validate and deploy the API Project.
2. Configure the API Project's server-side environment variables.
3. Verify the production `/health` endpoint.
4. Configure the Web Project with the resulting API production URL.
5. Export and deploy the Expo web app.
6. Verify the production page and a live restaurant search.
7. Connect both Projects to the `main` branch for future automatic production
   deployments.

Vercel may append a suffix if either preferred project name is unavailable.
The actual generated production URLs are authoritative and must be used in
environment configuration and Google API restrictions.

## Error Handling

- A missing Places key must produce the API's existing controlled `502`
  restaurant-search response rather than exposing configuration details.
- Invalid restaurant query parameters continue to return `400`.
- Application-level request limiting continues to return `429`.
- The web app continues to use its existing loading, retry, empty, and error
  states.
- A failed Vercel build or smoke test blocks promotion of that deployment.

The current in-memory request limiter is only a per-instance guard on
serverless infrastructure. Google Cloud quota limits remain the authoritative
cost safeguard for V1.

## Validation

Before production deployment:

- Run all frontend tests.
- Run all API tests.
- Run frontend TypeScript checking through the current Expo/TypeScript setup.
- Run API type checking and build.
- Export the Expo web bundle.
- Run a Vercel production build for each Project when supported by the CLI.
- Scan tracked files for Google API key patterns.

After deployment:

- Confirm the API `/health` endpoint returns `{"ok":true}`.
- Confirm malformed nearby-search queries return `400`.
- Confirm the production web page loads over HTTPS.
- Confirm the browser requests the production API URL.
- Confirm Google Maps renders with the production referrer restriction.
- Confirm one real nearby restaurant search returns only open restaurants.

## Security And Cost Controls

- Store `GOOGLE_PLACES_API_KEY` only in the API Project.
- Restrict the Places key to the required Places API and apply Google Cloud
  quotas.
- Restrict the browser Maps key by HTTPS referrer and API.
- Keep all local `.env` files ignored by Git.
- Keep Vercel Project metadata ignored when it contains local linkage state.
- Do not expose raw upstream Google error bodies to clients.

## Out Of Scope

- Custom domains.
- App Store or Google Play deployment.
- A shared distributed rate-limit store.
- Databases, user accounts, analytics, and payments.
- Migrating the API to another serverless runtime.
