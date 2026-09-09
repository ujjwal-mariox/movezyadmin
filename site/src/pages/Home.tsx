import { Link } from "react-router-dom";
import {
  Bike,
  Truck,
  Package,
  Building2,
  MapPinned,
  ShieldCheck,
  Receipt,
  PhoneOff,
  CalendarClock,
  Boxes,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Seo from "../components/Seo";
import StoreBadges from "../components/StoreBadges";
import { SITE } from "../config/site";

const SERVICES = [
  {
    icon: Package,
    title: "Courier & parcels",
    text: "Documents, parcels and small boxes on two-wheelers — picked up in minutes, delivered across the city.",
    to: "/services#courier",
  },
  {
    icon: Truck,
    title: "Cargo & house shifting",
    text: "Three-wheelers to 14-ft trucks with loading help for furniture, appliances and bulk goods.",
    to: "/services#cargo",
  },
  {
    icon: Boxes,
    title: "E-commerce deliveries",
    text: "Same-day last-mile for sellers: scheduled pickups, receiver OTP at the door and delivery proof.",
    to: "/services#ecommerce",
  },
  {
    icon: Building2,
    title: "Business logistics",
    text: "Credit accounts, GST invoices, multi-drop routes and reporting for distributors and offices.",
    to: "/services#logistics",
  },
];

const STEPS = [
  { n: "1", title: "Set pickup and drop", text: "Pin both points on the map, add stops if you need them, and tell us who receives the goods." },
  { n: "2", title: "Pick a vehicle", text: "See every option with its size, capacity and an upfront fare. Book now or schedule a slot." },
  { n: "3", title: "Track to the door", text: "The nearest verified partner accepts, you follow the trip live, and an OTP confirms delivery." },
];

const WHY = [
  { icon: MapPinned, title: "Live tracking", text: "Watch your goods move, share the trip, and get status updates at every step." },
  { icon: ShieldCheck, title: "Verified partners", text: "Every driver and vehicle is document-checked, with expiry monitoring that keeps them compliant." },
  { icon: Receipt, title: "Transparent pricing", text: "Fares shown before you book; GST invoices with CGST/SGST or IGST detail on every trip." },
  { icon: PhoneOff, title: "Privacy-first calling", text: "Customers and drivers reach each other through the Movezy number — personal numbers stay private." },
  { icon: CalendarClock, title: "Schedule or go now", text: "Book instantly or pick a time slot; we assign a driver close to the pickup time." },
  { icon: Bike, title: "Every vehicle size", text: "Scooters and bikes for parcels, autos and pickups for loads, trucks for the big moves." },
];

const FAQ = [
  { q: "Which cities does Movezy operate in?", a: `Movezy is live in ${SITE.cities.join(", ")}, with more cities being added. City-specific pricing is shown in the app before you book.` },
  { q: "How is the fare calculated?", a: "By the vehicle you choose, the road distance and time, any add-on services, and the applicable GST. The estimate you see in the app is what you pay, unless you add stops or waiting time during the trip." },
  { q: "Can I schedule a pickup for later?", a: "Yes. Tick “Schedule pickup for later” on the review screen and choose a date and time slot; a driver is assigned close to that time." },
  { q: "Are my goods safe?", a: "Partners are verified with licence, RC, insurance and PUC checks, pickups and deliveries are confirmed with OTPs, and every trip is tracked live." },
];

export default function Home() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: `${SITE.name} — Goods Transport`,
    operatingSystem: "Android, iOS",
    applicationCategory: "BusinessApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
    ...(SITE.playStoreUrl ? { downloadUrl: SITE.playStoreUrl } : {}),
  };

  return (
    <>
      <Seo title="Home" description={SITE.description} path="/" schema={[faqSchema, appSchema]} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-movezy-50 via-white to-white">
        <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-movezy-100 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-orange-100 blur-3xl" />
        <div className="container-x relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="eyebrow">On-demand goods transport</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
              Move anything across the city, <span className="text-brand">in minutes.</span>
            </h1>
            <p className="lead mt-5 max-w-xl">
              Book a scooter, auto, pickup or truck from your phone. Upfront fares, verified partners,
              live tracking and GST invoices — for parcels, house shifting and business deliveries.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/download" className="btn-primary">
                Download the app <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/services" className="btn-secondary">
                Explore services
              </Link>
            </div>
            <ul className="mt-8 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
              {["Upfront, all-inclusive fares", "Verified drivers & vehicles", "Live tracking & OTP delivery", "Scheduled pickups & multi-stop"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-leaf" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* App-style booking card mock */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute inset-0 -rotate-3 rounded-3xl bg-gradient-to-br from-movezy-200 to-movezy-100" />
            <div className="relative rounded-3xl border border-gray-100 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Book a vehicle</span>
                <span className="rounded-full bg-movezy-50 px-2.5 py-1 text-xs font-semibold text-movezy-700">Pune</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-leaf" />
                  <span className="text-sm text-gray-700">Kothrud, Pune</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-sm text-gray-700">Hinjewadi Phase 2</span>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { name: "Bike", cap: "20 kg", eta: "12 mins", fare: "₹ 89", icon: Bike },
                  { name: "Pickup 8ft", cap: "1250 kg", eta: "25 mins", fare: "₹ 640", icon: Truck, hot: true },
                  { name: "Tata 407", cap: "2500 kg", eta: "32 mins", fare: "₹ 1,150", icon: Truck },
                ].map((v) => (
                  <div
                    key={v.name}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      v.hot ? "border-movezy-400 bg-movezy-50/60" : "border-gray-100"
                    }`}
                  >
                    <v.icon className="h-6 w-6 text-movezy-600" />
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-ink">{v.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {v.cap} · <span className="font-semibold text-brand">{v.eta}</span>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-ink">{v.fare}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-gradient-to-r from-movezy-500 to-movezy-600 py-3 text-center text-sm font-semibold text-white">
                Confirm booking
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key services */}
      <section className="container-x py-16 sm:py-20">
        <p className="eyebrow">Key services</p>
        <h2 className="h2 mt-2">One app, every kind of delivery</h2>
        <p className="lead mt-3 max-w-2xl">From a single envelope to a full house move, choose the vehicle that fits and pay a fare you saw first.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <Link key={s.title} to={s.to} className="card group transition hover:-translate-y-0.5 hover:shadow-glow">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-movezy-50 text-movezy-600">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                Learn more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="container-x">
          <p className="eyebrow">How it works</p>
          <h2 className="h2 mt-2">Three taps from pickup to delivered</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-movezy-500 to-movezy-600 text-sm font-bold text-white">
                  {s.n}
                </div>
                <h3 className="mt-4 text-base font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Movezy */}
      <section className="container-x py-16 sm:py-20">
        <p className="eyebrow">Why Movezy</p>
        <h2 className="h2 mt-2">Built for trust on both sides of the trip</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map((w) => (
            <div key={w.title} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-movezy-50 text-movezy-600">
                <w.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">{w.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{w.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Partner CTA */}
      <section className="container-x">
        <div className="grid items-center gap-8 rounded-3xl bg-ink px-8 py-12 text-white sm:px-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-movezy-300">For driver partners</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Own a vehicle? Earn with Movezy.</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              Register your scooter, auto, pickup or truck, get verified, and receive nearby jobs one at a time — nearest driver first, with the ring you can't miss. Weekly earnings, in-app support and document reminders included.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link to="/download#driver" className="btn-primary">
              Become a partner <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className="btn-secondary !border-gray-600 !bg-transparent !text-white hover:!bg-gray-800">
              Talk to us
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-x py-16 sm:py-20">
        <p className="eyebrow">Questions</p>
        <h2 className="h2 mt-2">Frequently asked</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {FAQ.map((f) => (
            <details key={f.q} className="card group">
              <summary className="cursor-pointer list-none text-base font-semibold text-ink">
                <span className="flex items-center justify-between gap-4">
                  {f.q}
                  <span className="text-movezy-500 transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Download CTA */}
      <section className="container-x">
        <div className="rounded-3xl bg-gradient-to-r from-movezy-50 to-orange-50 px-8 py-12 text-center sm:px-12">
          <h2 className="h2">Get Movezy on your phone</h2>
          <p className="lead mx-auto mt-3 max-w-xl">Book your first delivery in under a minute.</p>
          <div className="mt-8 flex justify-center">
            <StoreBadges />
          </div>
        </div>
      </section>
    </>
  );
}
