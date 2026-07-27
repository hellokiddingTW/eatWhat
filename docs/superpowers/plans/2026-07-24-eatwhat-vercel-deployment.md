# EatWhat Vercel Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the existing Expo web app and Hono API from one GitHub repository as two Vercel Hobby Projects using Vercel-provided production domains.

**Architecture:** The `api/` directory is deployed as a zero-configuration Hono Node.js Project, while the repository root exports Expo Web into `dist/` as a separate static Project. The API is deployed first so its production URL can be supplied to the web build through `EXPO_PUBLIC_API_BASE_URL`.

**Tech Stack:** Expo 57, React Native Web, Hono 4, Node.js, TypeScript, Vercel Functions, Vercel static hosting, Node test runner

## Global Constraints

- Keep one GitHub repository and create two Vercel Projects.
- Use Vercel-provided `vercel.app` production domains.
- Preserve `@hono/node-server` local API development.
- Store `GOOGLE_PLACES_API_KEY` only in the API Project.
- Store `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY` only as an intentionally public Web Project build variable.
- Do not commit `.env` files, `.vercel/` metadata, or API key values.
- Keep the existing public API paths `GET /health` and `GET /restaurants/nearby`.
- Treat Google Cloud quota limits as the authoritative V1 cost safeguard.

---

### Task 1: Add The Vercel Hono Export

**Files:**
- Modify: `api/src/app.ts`
- Modify: `api/src/app.test.ts`

**Interfaces:**
- Consumes: existing named `app` export used by `api/src/server.ts`
- Produces: a default Hono application export discovered by Vercel's Hono runtime

- [ ] **Step 1: Write the failing default-export test**

Add this test to `api/src/app.test.ts`:

```ts
test('exports the production Hono app as the default export', async () => {
  const appModule = await import('./app.js');

  assert.equal(appModule.default, appModule.app);
  const response = await appModule.default.request('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});
```

- [ ] **Step 2: Run the API test to verify it fails**

Run:

```bash
npm --prefix api test
```

Expected: FAIL because `api/src/app.ts` has no default export.

- [ ] **Step 3: Add the minimal Vercel-compatible export**

Append to `api/src/app.ts`:

```ts
export default app;
```

Do not change `api/src/server.ts`; it continues importing the named `app`.

- [ ] **Step 4: Run the API tests and typecheck**

Run:

```bash
npm --prefix api test
npm --prefix api run typecheck
```

Expected: all API tests pass and TypeScript exits with code `0`.

### Task 2: Add A Tested Expo Web Deployment Contract

**Files:**
- Create: `vercel.json`
- Modify: `package.json`
- Modify: `.gitignore`
- Create: `src/config/vercelDeployment.test.ts`

**Interfaces:**
- Consumes: Expo's `expo export --platform web` command
- Produces: a Vercel static build in `dist/` and ignored local Vercel linkage metadata

- [ ] **Step 1: Write the failing deployment-contract test**

Create `src/config/vercelDeployment.test.ts`:

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('defines the Expo web production build for Vercel', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as {
    scripts?: Record<string, string>;
  };
  const vercelConfig = JSON.parse(
    await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'),
  ) as {
    buildCommand?: string;
    outputDirectory?: string;
  };

  assert.equal(
    packageJson.scripts?.['build:web'],
    'expo export --platform web',
  );
  assert.equal(vercelConfig.buildCommand, 'npm run build:web');
  assert.equal(vercelConfig.outputDirectory, 'dist');
});

test('ignores local Vercel project metadata', async () => {
  const gitignore = await readFile(
    new URL('../../.gitignore', import.meta.url),
    'utf8',
  );

  assert.match(gitignore, /^\.vercel\/$/m);
});
```

- [ ] **Step 2: Run the frontend test to verify it fails**

Run:

```bash
npm test
```

Expected: FAIL because `vercel.json`, the `build:web` script, and the ignore rule do not exist.

- [ ] **Step 3: Add the production build script**

Add to the root `package.json` scripts:

```json
"build:web": "expo export --platform web"
```

- [ ] **Step 4: Add the Vercel static-build configuration**

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build:web",
  "outputDirectory": "dist"
}
```

- [ ] **Step 5: Ignore Vercel local metadata**

Add to `.gitignore`:

```gitignore
# Vercel local project links
.vercel/
```

The root rule also ignores `api/.vercel/`.

- [ ] **Step 6: Run the frontend tests and web export**

Run:

```bash
npm test
npx tsc --noEmit
npm run build:web
```

Expected: all frontend tests pass, TypeScript exits with code `0`, and Expo creates `dist/index.html`.

### Task 3: Verify And Publish Deployment Support

**Files:**
- Modify: `docs/superpowers/plans/2026-07-24-eatwhat-vercel-deployment.md` only to update completed checkboxes

**Interfaces:**
- Consumes: Tasks 1 and 2
- Produces: a tested commit on `main` available to Vercel

- [ ] **Step 1: Run the complete local verification suite**

Run:

```bash
npm test
npx tsc --noEmit
npm run build:web
npm --prefix api test
npm --prefix api run typecheck
npm --prefix api run build
git diff --check
```

Expected: every command exits with code `0`.

- [ ] **Step 2: Scan tracked and pending source for exposed keys**

Run:

```bash
rg -n --hidden \
  -g '!node_modules/**' \
  -g '!dist/**' \
  -g '!.git/**' \
  'AIza[0-9A-Za-z_-]{20,}|GOOGLE_[A-Z_]*API_KEY\s*=\s*\S+' .
```

Expected: no populated Google API key values are found.

- [ ] **Step 3: Commit the deployment support**

Run:

```bash
git add \
  .gitignore \
  package.json \
  vercel.json \
  src/config/vercelDeployment.test.ts \
  api/src/app.ts \
  api/src/app.test.ts \
  docs/superpowers/plans/2026-07-24-eatwhat-vercel-deployment.md
git commit -m "Add Vercel deployment support"
```

- [ ] **Step 4: Push the tested commit**

Run:

```bash
git push origin main
```

Expected: GitHub `main` advances to the deployment-support commit.

### Task 4: Create And Deploy The API Project

**Files:**
- Local-only: `api/.vercel/`
- Vercel runtime environment: `GOOGLE_PLACES_API_KEY`
- Vercel runtime environment: `MAX_SEARCH_REQUESTS_PER_MINUTE`

**Interfaces:**
- Consumes: `api/src/app.ts` default export and the GitHub repository
- Produces: the authoritative API production URL

- [ ] **Step 1: Authenticate the Vercel CLI**

Run:

```bash
npx vercel login
```

Complete Vercel's browser or device-code login flow. Confirm with:

```bash
npx vercel whoami
```

Expected: the Vercel account name is printed.

- [ ] **Step 2: Link the API directory to a new Vercel Project**

Run:

```bash
cd api
npx vercel link
```

Choose the current personal Hobby scope, create a new Project named
`eatwhat-api`, and keep `api/` as the local Project root.

- [ ] **Step 3: Add the API runtime secrets**

Run:

```bash
npx vercel env add GOOGLE_PLACES_API_KEY production
npx vercel env add GOOGLE_PLACES_API_KEY preview
npx vercel env add MAX_SEARCH_REQUESTS_PER_MINUTE production
npx vercel env add MAX_SEARCH_REQUESTS_PER_MINUTE preview
```

Use the local Places key value for `GOOGLE_PLACES_API_KEY` and `60` for the
rate-limit value. Do not print either value in logs or chat.

- [ ] **Step 4: Build and deploy the API**

Run:

```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

Expected: Vercel returns an HTTPS production URL.

- [ ] **Step 5: Verify the production API**

Run with the returned URL:

```bash
curl --fail --silent --show-error \
  https://ACTUAL_API_URL/health
curl --silent --show-error \
  'https://ACTUAL_API_URL/restaurants/nearby?lat=invalid&lng=121&radius=3000'
```

Expected: health returns `{"ok":true}` and the malformed query returns the
existing structured validation error with HTTP `400`.

- [ ] **Step 6: Connect the API Project to GitHub**

Run from `api/`:

```bash
npx vercel git connect https://github.com/hellokiddingTW/eatWhat.git
```

Confirm that the API Project uses `api/` as Root Directory and `main` as its
production branch in Vercel Project Settings.

### Task 5: Create And Deploy The Web Project

**Files:**
- Local-only: `.vercel/`
- Vercel build environment: `EXPO_PUBLIC_API_BASE_URL`
- Vercel build environment: `EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY`

**Interfaces:**
- Consumes: the API production URL from Task 4
- Produces: the public EatWhat production web URL

- [ ] **Step 1: Link the repository root to a new Vercel Project**

Run:

```bash
cd "/Users/nate.yeh/Desktop/eatWhat"
npx vercel link
```

Choose the same personal Hobby scope and create a new Project named `eatwhat`.

- [ ] **Step 2: Add the Web Project build variables**

Run:

```bash
npx vercel env add EXPO_PUBLIC_API_BASE_URL production
npx vercel env add EXPO_PUBLIC_API_BASE_URL preview
npx vercel env add EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY production
npx vercel env add EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY preview
```

Use the actual API production URL without a trailing slash. Use the existing
Maps JavaScript browser key for the Maps variable.

- [ ] **Step 3: Build and deploy the web project**

Run:

```bash
npx vercel pull --yes --environment=production
npx vercel build --prod
npx vercel deploy --prebuilt --prod
```

Expected: Vercel returns an HTTPS production web URL.

- [ ] **Step 4: Connect the Web Project to GitHub**

Run:

```bash
npx vercel git connect https://github.com/hellokiddingTW/eatWhat.git
```

Confirm that the Web Project uses the repository root and `main` as its
production branch.

- [ ] **Step 5: Restrict the Maps browser key**

In Google Cloud Console, restrict the Maps JavaScript API key to:

```text
https://ACTUAL_WEB_URL/*
http://localhost:8081/*
http://localhost:53454/*
```

Keep its API restriction limited to Maps JavaScript API.

- [ ] **Step 6: Verify the production web experience**

Open the production URL and verify:

- The app loads over HTTPS.
- Browser geolocation can be requested.
- Google Maps renders.
- The selected restaurant marker and current-location marker render.
- The browser requests the production API URL.
- A restaurant card can open its Google Maps destination.
- No browser console errors occur.

### Task 6: Record The Production Result

**Files:**
- No secret-bearing files

**Interfaces:**
- Consumes: verified API and web deployments
- Produces: final deployment report

- [ ] **Step 1: Inspect final Vercel deployment state**

Run in each linked directory:

```bash
npx vercel inspect --logs ACTUAL_DEPLOYMENT_URL
```

Expected: both production deployments report `Ready`.

- [ ] **Step 2: Confirm the repository remains clean**

Run:

```bash
git status -sb
git check-ignore .vercel api/.vercel
```

Expected: no secret or local Vercel metadata is pending, and both metadata
directories are ignored.

- [ ] **Step 3: Report the live endpoints**

Provide:

- Web production URL.
- API production URL.
- API health result.
- Tests, typechecks, builds, and browser checks completed.
- Any remaining Google Cloud referrer or quota action requiring account-owner
  confirmation.
