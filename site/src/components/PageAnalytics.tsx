import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE } from '../config/site';
import PAGES from '../content/page-meta.json';

declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void } }
let initialized = false;
let previousPath = '';

/** Scope 25: basic page views only. No contact, download, call or conversion events. */
export default function PageAnalytics() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!SITE.ga4Id || SITE.demo || !SITE.domainConfirmed || pathname.startsWith('/admin')) return;
    const page = PAGES.find(item => item.path === pathname);
    // Unknown paths, query strings and fragments can contain personal data.
    const safePath = page?.path || '/404';
    const pageFields = {
      page_location: SITE.url + safePath,
      page_title: page?.title || 'Page not found | Movezy',
      page_referrer: '',
    };
    if (!initialized) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer!.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', SITE.ga4Id, { ...pageFields, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(SITE.ga4Id)}`;
      document.head.appendChild(script);
      initialized = true;
    }
    if (previousPath === safePath) return;
    previousPath = safePath;
    window.gtag?.('set', pageFields);
    window.gtag?.('event', 'page_view', pageFields);
  }, [pathname]);
  return null;
}
