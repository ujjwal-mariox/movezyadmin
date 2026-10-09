import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';

for (const demo of [true, false]) test(`static metadata agrees with ${demo ? 'demo' : 'configured production'} settings`, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'movezy-metadata-'));
  try {
    await writeFile(join(dir, 'index.html'), '<html><head><title>Old title</title></head><body><div id="root"></div></body></html>');
    const result = spawnSync(process.execPath, ['scripts/postbuild.mjs', 'production', dir], {
      encoding: 'utf8', env: { ...process.env, VITE_DEMO_MODE: String(demo), VITE_SITE_URL: 'https://movezy.example.com', VITE_GOOGLE_SITE_VERIFICATION: 'sample-ownership-value', VITE_CONTACT_EMAIL: 'actual@example.com' },
    });
    assert.equal(result.status, 0, result.stderr);
    const home = await readFile(join(dir, 'index.html'), 'utf8');
    const download = await readFile(join(dir, 'download/index.html'), 'utf8');
    const policy = await readFile(join(dir, 'privacy-policy/index.html'), 'utf8');
    const robots = await readFile(join(dir, 'robots.txt'), 'utf8');
    assert.equal((home.match(/<title/g) || []).length, 1);
    assert.match(download, /Download App/);
    assert.match(policy, /noindex,nofollow/);
    if (demo) {
      assert.match(home, /https:\/\/movezy\.example\//);
      assert.match(home, /noindex,nofollow/);
      assert.doesNotMatch(home, /sample-ownership-value|actual@example.com/);
      assert.equal(robots, 'User-agent: *\nDisallow: /\n');
    } else {
      assert.match(home, /https:\/\/movezy\.example\.com\//);
      assert.match(home, /google-site-verification.*sample-ownership-value/);
      assert.match(home, /content="index,follow"/);
      assert.match(robots, /Sitemap: https:\/\/movezy\.example\.com\/sitemap.xml/);
    }
  } finally {
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
    assert.ok(basename(dir).startsWith('movezy-metadata-'));
    await rm(dir, { recursive: true, force: true });
  }
});
