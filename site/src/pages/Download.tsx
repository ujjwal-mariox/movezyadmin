import { Smartphone, Bike, CheckCircle2 } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import StoreBadges from "../components/StoreBadges";
import { SITE } from "../config/site";

export default function Download() {
  const driverLive = Boolean(SITE.driverPlayStoreUrl);
  return (
    <>
      <Seo
        title="Download App"
        description="Download the Movezy customer app on Google Play and the App Store to book two-wheelers, tempos and trucks on demand. Driver partners: get the Movezy Partner app."
        path="/download"
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "MobileApplication",
            name: "Movezy",
            operatingSystem: "Android, iOS",
            applicationCategory: "BusinessApplication",
            offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          },
        ]}
      />
      <PageHero
        eyebrow="Download"
        title="Movezy in your pocket."
        lead="One app to book, track and pay. A second app for driver partners to receive jobs, navigate and manage earnings."
      />

      <section className="container-x grid gap-8 py-16 lg:grid-cols-2">
        <div className="card">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-movezy-50 text-movezy-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-ink">Movezy — Customer app</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Book instantly or schedule, choose from every vehicle size, track live and pay by UPI, card, wallet or cash.</p>
          <ul className="mt-5 space-y-2">
            {["Upfront fares with city pricing", "Dimension and capacity on every vehicle", "Live map, chat and masked calling", "GST invoices and booking history"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-leaf" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <StoreBadges />
          </div>
          {!SITE.playStoreUrl && !SITE.appStoreUrl && (
            <p className="mt-3 text-xs text-gray-500">Store listings go live soon. Until then, ask us for the early-access build via the contact page.</p>
          )}
        </div>

        <div id="driver" className="card scroll-mt-24 bg-gradient-to-br from-ink to-gray-800 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-movezy-300">
            <Bike className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Movezy Partner — Driver app</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">Register your vehicle, get verified and start receiving nearby jobs — nearest driver first, with a ring you won't miss even with the screen locked.</p>
          <ul className="mt-5 space-y-2">
            {["One active vehicle at a time, switch anytime", "Earnings and trip history per vehicle", "Document expiry reminders", "Call customer care or chat during a trip"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-gray-200">
                <CheckCircle2 className="h-4 w-4 text-movezy-300" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {driverLive ? (
              <a href={SITE.driverPlayStoreUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Get the Partner app
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-gray-200">
                Partner app — coming soon to Google Play
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="container-x pb-8">
        <div className="rounded-3xl bg-gray-50 px-8 py-10 text-center">
          <h2 className="text-xl font-bold text-ink">Requirements</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
            Android 8.0 or later, or iOS 15 or later. Location access is needed to place bookings and, for partners, to receive nearby jobs. The partner app keeps a small "online" notification running so you stay reachable while your phone is locked.
          </p>
        </div>
      </section>
    </>
  );
}
