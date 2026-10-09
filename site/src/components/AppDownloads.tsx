import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SITE } from '../config/site';
import screenshots from '../content/app-screenshots.json';

type Screenshot = { app: 'customer' | 'driver'; src: string; alt: string };
function ReleaseScreenshot({ item }: { item: Screenshot }) {
  const [failed, setFailed] = useState(false);
  return <figure className="mx-auto w-full max-w-[240px]">
    {failed ? <div className="rounded-2xl bg-gray-100 p-8 text-sm text-muted">Image unavailable</div> : <img src={item.src} alt={item.alt} width={360} height={720} loading="lazy" decoding="async" onError={() => setFailed(true)} className="aspect-[1/2] w-full rounded-2xl border border-gray-200 object-contain" />}
    <figcaption className="mt-3 text-center text-sm text-muted">{item.alt}</figcaption>
  </figure>;
}

export default function AppDownloads() {
  const listings = [
    { label: 'Customer app · Android', url: SITE.playStoreUrl, example: 'https://movezy.example/download/customer' },
    { label: 'Customer app · iOS', url: SITE.appStoreUrl, example: 'https://movezy.example/download/ios' },
    { label: 'Partner app · Android', url: SITE.driverPlayStoreUrl, example: 'https://movezy.example/download/partner' },
  ].filter(item => SITE.demo || item.url);
  // Only same-site approved files may be added to the release manifest.
  const images = (screenshots as Screenshot[]).filter(item => ['customer', 'driver'].includes(item.app) && /^\/app-screenshots\/[a-zA-Z0-9_./-]+\.(?:png|webp|jpg|jpeg)$/.test(item.src) && !item.src.includes('..') && item.alt?.trim());
  return <section className="container-x py-10">
    <h2 className="text-2xl font-bold text-ink">Scan to get the app</h2>
    {SITE.demo && <p className="mt-3 text-sm text-amber-900">Demo QR codes encode sample addresses, not store listings. iOS availability is still unconfirmed.</p>}
    {listings.length ? <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{listings.map(item => <div key={item.label} className="card flex flex-col items-center text-center">
      <QRCodeSVG value={item.url || item.example} size={164} level="M" marginSize={4} title={`${SITE.demo ? 'Demo QR code' : 'Store download QR code'}: ${item.label}`} />
      <h3 className="mt-4 font-semibold">{item.label}</h3>
      {SITE.demo ? <p className="mt-2 break-all text-xs text-muted">Sample only: {item.example}</p> : <a className="mt-3 text-sm text-brand underline" href={item.url} target="_blank" rel="noopener noreferrer">Open store listing</a>}
    </div>)}</div> : <p className="mt-3 text-sm text-muted">Download QR codes will appear when the store listings are published.</p>}
    <h2 className="mt-12 text-2xl font-bold text-ink">Inside the apps</h2>
    {SITE.demo ? <><p className="mt-3 text-sm text-amber-900">Illustrative mock screens for layout review. Replace with approved release screenshots.</p><div className="mt-6 grid gap-8 sm:grid-cols-3">{[
      { title: 'Plan your delivery', label: 'Customer app', lines: ['Pickup in Pune', 'Delivery location', 'Choose an eligible vehicle', 'Review estimated fare'] },
      { title: 'Follow your trip', label: 'Customer app', lines: ['Driver going to pickup', 'View trip status', 'Open booking chat', 'Get help in the app'] },
      { title: 'Your workday', label: 'Partner app', lines: ['Select your active vehicle', 'Go online when approved', 'View eligible trip offers', 'Trip history & earnings'] },
    ].map(screen => <figure key={screen.title} className="mx-auto w-full max-w-[240px]"><div className="min-h-[360px] rounded-[2rem] border-4 border-ink bg-gray-50 p-5"><p className="text-xs font-semibold text-brand">Movezy · MOCK</p><p className="mt-2 text-xs text-muted">{screen.label}</p><h3 className="mt-8 text-xl font-bold">{screen.title}</h3><div className="mt-6 space-y-3">{screen.lines.map(line => <div key={line} className="rounded-xl bg-white p-3 text-sm shadow-sm">{line}</div>)}</div></div><figcaption className="mt-3 text-center text-xs text-muted">Mock illustration — {screen.title}</figcaption></figure>)}</div></> : images.length ? <div className="mt-6 grid gap-8 sm:grid-cols-3">{images.map(item => <ReleaseScreenshot key={item.src} item={item} />)}</div> : <p className="mt-3 text-sm text-muted">Release screenshots will be added when available.</p>}
  </section>;
}
