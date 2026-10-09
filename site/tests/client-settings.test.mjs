import test from 'node:test';
import assert from 'node:assert/strict';
import { clientSettings, storeUrl } from '../src/config/client-settings.mjs';

test('demo stays isolated even when real deployment variables are also present', () => {
  const settings = clientSettings({ VITE_DEMO_MODE: 'true', VITE_SITE_URL: 'https://movezy.in', VITE_CONTACT_EMAIL: 'real@movezy.in', VITE_CONTACT_PHONE: '+919876543210', VITE_WHATSAPP_PHONE: '+919876543210', VITE_GA4_MEASUREMENT_ID: 'G-ABC12345', VITE_PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=com.movezy.user', VITE_GOOGLE_SITE_VERIFICATION: 'actual-value' });
  assert.equal(settings.url, 'https://movezy.example');
  assert.equal(settings.domainConfirmed, false);
  for (const key of ['ga4Id', 'playStoreUrl', 'appStoreUrl', 'driverPlayStoreUrl', 'whatsapp', 'searchConsoleVerification']) assert.equal(settings[key], '');
  assert.equal(settings.channels[0].email, 'contact@movezy.example');
});
test('unconfigured production has no invented contacts, domain or tracking', () => {
  const settings = clientSettings({});
  assert.equal(settings.domainConfirmed, false);
  assert.equal(settings.ga4Id, '');
  assert.equal(settings.channels.every(c => !c.email && !c.phone), true);
});
test('store links only accept secure listing pages at the official store host', () => {
  for (const value of ['javascript:alert(1)', 'https://play.google.com.evil.test/store/apps/details?id=a.b', 'http://play.google.com/store/apps/details?id=a.b', 'https://play.google.com/store/apps/details', 'https://play.google.com/store/apps/details?id=a.b%0Aevil', 'https://user:pass@play.google.com/store/apps/details?id=a.b']) assert.equal(storeUrl(value, 'android'), '');
  assert.equal(storeUrl('https://play.google.com/store/apps/details?id=com.movezy.user', 'android'), 'https://play.google.com/store/apps/details?id=com.movezy.user');
  assert.equal(storeUrl('https://apps.apple.com/in/app/movezy/id12345678', 'ios'), 'https://apps.apple.com/in/app/movezy/id12345678');
  assert.equal(storeUrl('https://apps.apple.com', 'ios'), '');
});
test('real support channels preserve recipients and normalize international dial links', () => {
  const s = clientSettings({ VITE_SITE_URL: 'https://movezy.in/', VITE_CONTACT_PHONE: '+91 98765-43210', VITE_PARTNER_EMAIL: 'partner@movezy.in', VITE_BUSINESS_EMAIL: 'biz@movezy.in', VITE_WHATSAPP_PHONE: '+919876543210' });
  assert.equal(s.url, 'https://movezy.in');
  assert.equal(s.channels[0].phone, '+919876543210');
  assert.equal(s.channels[1].email, 'partner@movezy.in');
  assert.equal(s.channels[2].email, 'biz@movezy.in');
  assert.equal(s.whatsapp, '+919876543210');
});
test('mock IDs, malformed phones and injected mail recipients remain inactive', () => {
  const s = clientSettings({ VITE_GA4_MEASUREMENT_ID: 'G-MOCK123', VITE_CONTACT_PHONE: '+91 XXXXX XXXXX', VITE_CONTACT_EMAIL: 'x@y.in\r\nBcc:someone@z.in', VITE_SITE_URL: 'javascript:alert(1)' });
  assert.equal(s.ga4Id, ''); assert.equal(s.channels[0].email, ''); assert.equal(s.channels[0].phone, ''); assert.equal(s.domainConfirmed, false);
});
