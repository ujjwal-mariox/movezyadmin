import { Smartphone, Bike, CheckCircle2 } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import StoreBadges from "../components/StoreBadges";
import { SITE } from "../config/site";
import { Link } from "react-router-dom";

export default function Download() {
  const driverLive = Boolean(SITE.driverPlayStoreUrl);
  return (
    <>
      <Seo
        title="Download App"
        description="Find Movezy customer and driver app availability, supported Android versions and instructions for following your booking in the app."
        path="/download"
        schema={SITE.playStoreUrl ? [
          {
            "@context": "https://schema.org",
            "@type": "MobileApplication",
            name: "Movezy",
            operatingSystem: "Android",
            applicationCategory: "BusinessApplication",
            offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
          },
        ] : []}
      />
      <PageHero
        eyebrow="Download"
        title="Movezy in your pocket."
        lead="One app to book, track and pay. A second app for driver partners to receive jobs, navigate and manage earnings."
      />

      <section className="container-x grid gap-8 py-16 lg:grid-cols-2">
        <div id="customer" className="card scroll-mt-24">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-movezy-50 text-movezy-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-ink">Movezy — Customer app</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">Start a booking, select an eligible vehicle and review the fare and supported payment options. Sign in to view your booking history and active trip.</p>
          <ul className="mt-5 space-y-2">
            {["Estimated fare before confirmation", "Configured vehicle load limits", "In-app tracking and chat", "Completed-trip invoices and booking history"].map((t) => (
              <li key={t} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="h-4 w-4 text-leaf" /> {t}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <StoreBadges />
          </div>
          {!SITE.playStoreUrl && !SITE.appStoreUrl && (
            <p className="mt-3 text-sm text-gray-500">Store listings are coming soon. <Link to="/contact?category=NEW_BOOKING" className="text-brand underline">Ask about app availability</Link>.</p>
          )}
        </div>

        <div id="driver" className="card scroll-mt-24 bg-gradient-to-br from-ink to-gray-800 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-movezy-300">
            <Bike className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold">Movezy Partner — Driver app</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-300">Register your vehicle and submit documents for review. Approved partners can go online, receive eligible jobs and view trip history and earnings.</p>
          <ul className="mt-5 space-y-2">
            {["One active vehicle at a time; switching is restricted during a trip", "Earnings and trip history per vehicle", "Document review and expiry reminders", "Help & Support in the app"].map((t) => (
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
          <h2 className="text-xl font-bold text-ink">App compatibility</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
            Customer Android app: Android 10 or later. Partner Android app: Android 7 or later.
            Location access is used for booking and trip features. Partners need the requested background and notification permissions while online.
            iOS availability and compatibility will be confirmed when an App Store listing is published.
          </p>
        </div>
      </section>
      <section id="tracking" className="container-x scroll-mt-24 py-12">
        <div className="card"><h2 className="text-2xl font-bold text-ink">Track your booking in the app</h2>
          <ol className="mt-5 space-y-3 text-sm text-gray-700"><li>1. Sign in to the Movezy customer app.</li><li>2. Open your bookings and select the active trip.</li><li>3. View its status and the in-app map as location updates arrive.</li></ol>
          <p className="mt-4 text-sm text-muted">Website tracking by Booking ID is coming soon. This website does not currently provide a public tracking portal.</p>
          <Link to="/contact?category=EXISTING_BOOKING" className="btn-secondary mt-5">Get help with an existing booking</Link>
        </div>
      </section>
    </>
  );
}
