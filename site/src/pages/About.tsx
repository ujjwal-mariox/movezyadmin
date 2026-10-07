import { Link } from "react-router-dom";
import { Target, Compass, HeartHandshake, Leaf, ShieldCheck, Users, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import { SITE } from "../config/site";
import BookingJourney from "../components/BookingJourney";

const GOALS = [
  { icon: Users, title: "A fair deal for partners", text: "Approved partners can choose when to go online and view their trips and earnings in the partner app." },
  { icon: ShieldCheck, title: "Trust you can see", text: "Document review, OTP confirmation, in-app booking status and support help both sides of the trip." },
  { icon: Target, title: "Transparent pricing", text: "Review the estimated fare and its breakdown before confirming. Vehicle, route, demand, add-ons and applicable tax can affect pricing." },
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
            We began in Pune with a practical goal: connect people who need goods moved with suitable driver partners, make the
            estimated fare visible and help customers follow their booking. {SITE.cities.join(", ")} is our current launch market;
            we aim to expand to more cities as services become available.
          </p>
          <p className="lead mt-4">
            Movezy is built by people who have loaded the truck themselves. That shows in the details: dimension callouts so you know
            what fits, receiver details captured with the address, and booking updates in the app.
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

      <section className="container-x py-12">
        <p className="eyebrow">How Movezy works</p><h2 className="h2 mt-2">A marketplace connecting customers and driver partners</h2>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {["Customer requests goods transport", "Movezy platform checks the booking", "An eligible, approved driver accepts", "Goods are picked up", "Customer follows the live trip", "Delivery is confirmed in the app"].map((step, index) => <li key={step} className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700"><strong className="mr-2 text-brand">{index + 1}.</strong>{step}</li>)}
        </ol>
        <div className="mt-10"><BookingJourney /></div>
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
