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

test('isolates the API project from Expo web build overrides', async () => {
  const apiVercelConfig = JSON.parse(
    await readFile(new URL('../../api/vercel.json', import.meta.url), 'utf8'),
  ) as {
    buildCommand?: string | null;
    outputDirectory?: string | null;
  };

  assert.equal(apiVercelConfig.buildCommand, null);
  assert.equal(apiVercelConfig.outputDirectory, null);
});

test('uses the Vercel-compatible TypeScript version for the API build', async () => {
  const rootPackage = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as {
    devDependencies?: Record<string, string>;
  };
  const apiPackage = JSON.parse(
    await readFile(new URL('../../api/package.json', import.meta.url), 'utf8'),
  ) as {
    devDependencies?: Record<string, string>;
  };

  assert.equal(
    apiPackage.devDependencies?.typescript,
    rootPackage.devDependencies?.typescript,
  );
});
