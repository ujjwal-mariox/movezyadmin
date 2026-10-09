import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = fs.readFileSync(new URL('../src/components/PageAnalytics.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
function harness(settings = {}) {
  const scripts = [], window = {}, exports = {};
  let location = { pathname: '/contact', search: '?email=private@example.test', hash: '#secret' };
  const modules = {
    react: { useEffect: fn => fn() },
    'react-router-dom': { useLocation: () => location },
    '../config/site': { SITE: { ga4Id: 'G-ABC12345', demo: false, domainConfirmed: true, url: 'https://movezy.example.com', ...settings } },
    '../content/page-meta.json': [{ path: '/contact', title: 'Contact Us | Movezy' }, { path: '/download', title: 'Download | Movezy' }],
  };
  vm.runInNewContext(compiled, { exports, require: name => modules[name], window, document: { createElement: () => ({}), head: { appendChild: script => scripts.push(script) } } });
  return { scripts, render(path) { if (path) location = { ...location, pathname: path }; exports.default(); }, calls() { return JSON.parse(JSON.stringify((window.dataLayer || []).map(args => Array.from(args)))); } };
}
test('demo, absent ID, unconfirmed domain and admin routes cannot activate analytics', () => {
  for (const config of [{ demo: true }, { ga4Id: '' }, { domainConfirmed: false }]) {
    const h = harness(config); h.render(); assert.equal(h.scripts.length, 0); assert.deepEqual(h.calls(), []);
  }
  const h = harness(); h.render('/admin/orders'); assert.equal(h.scripts.length, 0);
});
test('basic page tag initializes once, avoids duplicate renders and omits sensitive URL parts', () => {
  const h = harness(); h.render(); h.render(); h.render('/download');
  assert.equal(h.scripts.length, 1);
  const calls = h.calls();
  const pages = calls.filter(row => row[0] === 'event');
  assert.equal(pages.length, 2);
  assert.ok(pages.every(row => row[1] === 'page_view'));
  assert.deepEqual(pages.map(row => row[2].page_location), ['https://movezy.example.com/contact', 'https://movezy.example.com/download']);
  assert.doesNotMatch(JSON.stringify(calls), /private|secret|email=/);
  const config = calls.find(row => row[0] === 'config')[2];
  assert.equal(config.send_page_view, false);
  assert.equal(config.page_referrer, '');
  assert.equal(config.page_location, 'https://movezy.example.com/contact');
});
test('unknown routes cannot leak identifiers through page-view paths or titles', () => {
  const h = harness(); h.render('/private-booking-123');
  const page = h.calls().find(row => row[0] === 'event')[2];
  assert.equal(page.page_location, 'https://movezy.example.com/404');
  assert.doesNotMatch(JSON.stringify(h.calls()), /private-booking/);
});
