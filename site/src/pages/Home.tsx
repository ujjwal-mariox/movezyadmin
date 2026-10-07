import { Link } from "react-router-dom";
import { Package, Truck, Boxes, Building2, MapPinned, ShieldCheck, Receipt, MessagesSquare, CalendarClock, CheckCircle2, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import StoreBadges from "../components/StoreBadges";
import BookingJourney from "../components/BookingJourney";
import PricingGuide from "../components/PricingGuide";
import { SITE } from "../config/site";

const SERVICES = [
  { icon: Package, title: "Courier & parcels", text: "Move documents, parcels and small packages using an eligible vehicle.", to: "/services#courier" },
  { icon: Truck, title: "Cargo & house shifting", text: "Choose a suitable goods vehicle for furniture, appliances and larger loads.", to: "/services#cargo" },
  { icon: Boxes, title: "Seller deliveries", text: "Book goods transport for your store or online orders, with delivery status in the app.", to: "/services#ecommerce" },
  { icon: Building2, title: "Business logistics", text: "Use Movezy for business deliveries. Contact the team about your requirements.", to: "/services#logistics" },
];
const TRUST = [
  { icon: ShieldCheck, title: "Document checks", text: "Partner and vehicle documents are reviewed through Movezy's approval process." },
  { icon: Receipt, title: "Transparent pricing", text: "Review the estimate and applicable charges before confirming. Invoices are available for completed bookings." },
  { icon: MapPinned, title: "In-app tracking", text: "Open an active booking in the customer app to follow its location and status." },
  { icon: CheckCircle2, title: "Delivery confirmation", text: "OTP confirmation is part of the booking handover flow." },
  { icon: CalendarClock, title: "Pickup options", text: "Book for now or choose a scheduled pickup slot in the booking flow, subject to availability." },
  { icon: MessagesSquare, title: "In-app support", text: "Start with Help & Support in the app and raise a ticket when needed." },
];
const FAQ = [
  { q: "Where is Movezy available?", a: "Pune is Movezy's current launch market. Check the app for route eligibility and vehicle availability. More cities are planned." },
  { q: "How is the fare calculated?", a: "The vehicle, base or minimum fare, route distance and duration, pickup area, selected add-ons, demand, tax and discounts can affect the estimate. Review the breakdown before confirming." },
  { q: "Can I schedule a pickup?", a: "Select the scheduling checkbox during booking and choose a date and pickup slot. Availability depends on the route, vehicle and partners." },
  { q: "How do I track my booking?", a: "Sign in to the customer app, open your bookings and select the active trip. Booking-ID tracking on the website is coming soon." },
];
export default function Home() {
  return <>
    <Seo title="Home" description={SITE.description} path="/" schema={[{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }]} />
    <section className="bg-gradient-to-b from-movezy-50 to-white">
      <div className="container-x grid items-center gap-10 py-10 sm:py-20 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="eyebrow">Goods transport marketplace · Pune</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">Book vehicles.<br /><span className="text-brand">Move goods.</span></h1>
          <p className="lead mt-5 max-w-xl">Movezy connects customers and businesses with driver partners for parcels, cargo and business deliveries. Choose a vehicle, review the fare and track your trip in the app.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/download#customer" className="btn-primary">Book a Vehicle <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link to="/download#tracking" className="btn-secondary">Track Booking</Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="More Movezy journeys">
            <Link to="/contact?category=BUSINESS_ENQUIRY" className="journey-link">Movezy for Business</Link>
            <Link to="/download#driver" className="journey-link">Become a Driver Partner</Link>
            <Link to="/download" className="journey-link">Get the App</Link>
          </div>
          <p className="mt-5 text-sm text-muted">Currently available: <strong className="text-ink">{SITE.cities.join(", ")}</strong>. Expanding to more cities.</p>
        </div>
        <div className="card w-full border-movezy-100">
          <p className="eyebrow">Booking in the customer app</p><h2 className="mt-2 text-xl font-bold text-ink">From pickup to confirmation</h2>
          <div className="mt-6"><BookingJourney compact /></div>
          <Link to="/download#customer" className="btn-primary mt-6 w-full">Get started in the app</Link>
        </div>
      </div>
    </section>
    <section className="container-x py-16">
      <p className="eyebrow">Who can use Movezy?</p><h2 className="h2 mt-2">For personal moves and business deliveries</h2>
      <p className="lead mt-3 max-w-3xl">Choose goods transport that fits your booking. The app shows eligible vehicles and configured load limits for your route.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{SERVICES.map(s => <Link key={s.title} to={s.to} className="card min-w-0 hover:border-movezy-200">
        <s.icon className="h-7 w-7 text-brand" aria-hidden="true" /><h3 className="mt-4 font-semibold text-ink">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand">Explore service <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
      </Link>)}</div>
    </section>
    <section className="bg-gray-50 py-16"><div className="container-x"><p className="eyebrow">How to book</p><h2 className="h2 mt-2">A clear journey in the app</h2><div className="mt-8"><BookingJourney /></div></div></section>
    <PricingGuide />
    <section className="container-x py-16"><p className="eyebrow">Trust & safety</p><h2 className="h2 mt-2">Know what to expect</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{TRUST.map(t => <div key={t.title} className="flex min-w-0 gap-3"><t.icon className="mt-1 h-6 w-6 shrink-0 text-brand" aria-hidden="true" /><div><h3 className="font-semibold text-ink">{t.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p></div></div>)}</div>
      <p className="mt-6 text-sm text-muted">Payments use the supported options displayed in the app. Confirm the payment and invoice details for your booking before proceeding.</p>
    </section>
    <section className="container-x"><div className="rounded-3xl bg-ink px-6 py-10 text-white sm:px-10"><h2 className="text-2xl font-bold">Drive with Movezy</h2><p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">Register your vehicle in the partner app and submit the required documents for review. Once approved, choose when to go online and view your jobs, trip history and earnings.</p><Link to="/download#driver" className="btn-primary mt-6">Become a Driver Partner</Link></div></section>
    <section className="container-x py-16"><p className="eyebrow">Questions</p><h2 className="h2 mt-2">Frequently asked</h2><div className="mt-8 grid gap-4 md:grid-cols-2">{FAQ.map(f => <details key={f.q} className="card"><summary className="min-h-11 cursor-pointer font-semibold text-ink">{f.q}</summary><p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p></details>)}</div></section>
    <section className="container-x"><div className="rounded-3xl bg-movezy-50 px-6 py-10 text-center"><h2 className="h2">Get Movezy on your phone</h2><p className="lead mt-3">Find the customer and partner app download options.</p><div className="mt-6 flex justify-center"><StoreBadges /></div><Link to="/download" className="journey-link mt-4">View app availability</Link></div></section>
  </>;
}
