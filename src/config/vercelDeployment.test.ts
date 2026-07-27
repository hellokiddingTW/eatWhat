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
