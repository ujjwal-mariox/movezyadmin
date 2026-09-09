import { Link } from "react-router-dom";
import { Target, Compass, HeartHandshake, Leaf, ShieldCheck, Users, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import { SITE } from "../config/site";

const GOALS = [
  { icon: Users, title: "A fair deal for partners", text: "One active vehicle, nearest-first jobs, weekly settlements and document reminders — drivers should never be surprised by the platform." },
  { icon: ShieldCheck, title: "Trust you can see", text: "Verified documents, OTP-confirmed handovers, masked calling and live tracking on every trip." },
  { icon: Target, title: "Prices that don't move", text: "The fare you see is the fare you pay. City-specific rate cards, clear surge windows, itemised GST invoices." },
  { icon: Leaf, title: "Right-sized vehicles", text: "Matching the load to the smallest vehicle that fits keeps fares down and roads lighter." },
];

export default function About() {
  return (
    <>
      <Seo
        title="About Us"
        description="Movezy is building India's most dependable on-demand goods transport network: verified driver partners, transparent fares and technology that treats both sides of the trip fairly."
        path="/about"
        schema={[{ "@context": "https://schema.org", "@type": "AboutPage", name: "About Movezy", url: `${SITE.url}/about` }]}
      />
      <PageHero
        eyebrow="About Movezy"
        title="Moving goods should be as simple as booking a ride."
        lead="Movezy started with a familiar frustration: finding a tempo for a small move meant phone calls, haggling and no idea when — or whether — it would show up. We built the app we wished existed: pick a vehicle, see the fare, track the trip."
      />

      <section className="container-x grid gap-10 py-16 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Our story</p>
          <h2 className="h2 mt-2">From one city to a network</h2>
          <p className="lead mt-4">
            We began in Pune with a handful of driver partners and a promise: every booking gets a verified vehicle, a fixed fare and a
            live map. Today the same platform runs two-wheeler couriers, cargo tempos and business logistics, with city-specific
            pricing for {SITE.cities.join(", ")}.
          </p>
          <p className="lead mt-4">
            Movezy is built by people who have loaded the truck themselves. That shows in the details: dimension callouts so you know
            what fits, receiver details captured with the address, and an alert a driver can't miss.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card">
            <Compass className="h-6 w-6 text-movezy-600" />
            <h3 className="mt-3 text-base font-semibold text-ink">Vision</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A city where anything can be moved on demand — reliably, affordably, and by partners who are proud to do it.
            </p>
          </div>
          <div className="card">
            <HeartHandshake className="h-6 w-6 text-movezy-600" />
            <h3 className="mt-3 text-base font-semibold text-ink">Mission</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Give customers certainty and drivers dignity, through technology that is honest about prices, time and people.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="container-x">
          <p className="eyebrow">Our goals</p>
          <h2 className="h2 mt-2">What we hold ourselves to</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {GOALS.map((g) => (
              <div key={g.title} className="card flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-movezy-50 text-movezy-600">
                  <g.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink">{g.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{g.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-16 text-center">
        <h2 className="h2">Want to work with us?</h2>
        <p className="lead mx-auto mt-3 max-w-xl">Businesses, fleet owners and city partners — we'd love to hear from you.</p>
        <Link to="/contact" className="btn-primary mt-8">
          Contact us <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </>
  );
}
