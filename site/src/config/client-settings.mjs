// Shared by Vite and the static metadata builder. Demo values never activate
// external services, contact links, or a live store listing.
const text = value => typeof value === 'string' ? value.trim() : '';
export function webUrl(value) {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
export function storeUrl(value, platform) {
  const valid = webUrl(value);
  if (!valid) return '';
  const url = new URL(valid);
  return platform === 'android'
    ? (url.hostname === 'play.google.com' && url.pathname === '/store/apps/details' && /^[\w.]+$/.test(url.searchParams.get('id') || '') ? valid : '')
    : (url.hostname === 'apps.apple.com' && /\/app\/(?:[^/]+\/)?id\d+\/?$/.test(url.pathname) ? valid : '');
}
const email = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(value)) && !/[\r\n]/.test(value) ? text(value) : '';
const phone = value => /^\+[1-9]\d{7,14}$/.test(text(value).replace(/[ ()-]/g, '')) ? text(value).replace(/[ ()-]/g, '') : '';
export function clientSettings(env) {
  const demo = env.VITE_DEMO_MODE === 'true';
  const configuredUrl = webUrl(env.VITE_SITE_URL);
  const parsedUrl = configuredUrl ? new URL(configuredUrl) : null;
  const domainConfirmed = !!parsedUrl && parsedUrl.pathname === '/' && !parsedUrl.search && !parsedUrl.hash && !/\.(?:example|invalid|test)$/.test(parsedUrl.hostname);
  const channel = (label, prefix) => ({ label,
    email: demo ? `${prefix.toLowerCase()}@movezy.example` : email(env[`VITE_${prefix}_EMAIL`]),
    phone: demo ? '+91 XXXXX XXXXX' : phone(env[`VITE_${prefix}_PHONE`]),
  });
  return {
    demo, domainConfirmed: !demo && domainConfirmed,
    url: demo || !domainConfirmed ? 'https://movezy.example' : configuredUrl.replace(/\/+$/, ''),
    legalName: demo ? 'Movezy — sample company name' : text(env.VITE_LEGAL_COMPANY_NAME),
    channels: [channel('Customer support', 'CONTACT'), channel('Partner enquiries', 'PARTNER'), channel('Business enquiries', 'BUSINESS')],
    whatsapp: demo ? '' : phone(env.VITE_WHATSAPP_PHONE),
    playStoreUrl: demo ? '' : storeUrl(env.VITE_PLAY_STORE_URL, 'android'),
    appStoreUrl: demo ? '' : storeUrl(env.VITE_APP_STORE_URL, 'ios'),
    driverPlayStoreUrl: demo ? '' : storeUrl(env.VITE_DRIVER_PLAY_STORE_URL, 'android'),
    searchConsoleVerification: demo ? '' : text(env.VITE_GOOGLE_SITE_VERIFICATION),
    ga4Id: !demo && /^G-[A-Z0-9]{4,}$/.test(text(env.VITE_GA4_MEASUREMENT_ID)) && !/MOCK|EXAMPLE|XXXXX|00000/.test(text(env.VITE_GA4_MEASUREMENT_ID)) ? text(env.VITE_GA4_MEASUREMENT_ID) : '',
  };
}
