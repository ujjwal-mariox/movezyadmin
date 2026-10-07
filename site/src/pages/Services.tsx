import { Link } from "react-router-dom";
import { Package, Truck, Boxes, Building2, CheckCircle2 } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import PricingGuide from "../components/PricingGuide";
import { SITE } from "../config/site";
const SERVICES = [
  { id: "courier", icon: Package, title: "Courier & parcel delivery", lead: "Goods transport for documents, parcels and smaller packages.", points: ["Choose a vehicle that suits the goods and its configured load limit", "Enter receiver details with the delivery address", "Follow the booking and delivery status in the app"], best: "For documents, small parcels, gifts and packaged goods." },
  { id: "cargo", icon: Truck, title: "Cargo & house shifting", lead: "Book a suitable goods vehicle for furniture, appliances and bulk loads.", points: ["Review vehicle dimensions and capacity in the app", "Choose available loading or unloading add-ons where needed", "Add stops while planning your route"], best: "For personal moves, office goods, appliances and larger deliveries." },
  { id: "ecommerce", icon: Boxes, title: "Seller deliveries", lead: "Book transport for goods sold by your shop or online business.", points: ["Select an immediate or scheduled pickup, subject to availability", "Include the receiver and delivery address in the booking", "Use booking status and OTP confirmation to follow the handover"], best: "For stores and sellers arranging their own goods deliveries." },
  { id: "logistics", icon: Building2, title: "Business logistics", lead: "Use Movezy to arrange goods transport for your business.", points: ["Book a vehicle appropriate for the route and load", "Review booking history and completed-trip invoices in the app", "Contact the team about business-account requirements"], best: "For offices, distributors and businesses moving goods." },
];
export default function Services() {
  return <>
    <Seo title="Services" description="Explore parcel delivery, cargo transport, seller deliveries and business logistics in Pune. Review vehicle eligibility and pricing in the Movezy app." path="/services" schema={SERVICES.map(s => ({ "@context": "https://schema.org", "@type": "Service", name: s.title, description: s.lead, provider: { "@type": "Organization", name: SITE.name, url: SITE.url }, areaServed: SITE.cities.map(name => ({ "@type": "City", name })), url: SITE.url + "/services#" + s.id }))} />
    <PageHero eyebrow="Services" title="Choose transport that fits your goods." lead="Pune is our current launch market. Route eligibility, vehicle availability, load limits and the estimated fare are shown in the app before you book.">
      <div className="flex flex-wrap gap-2">{SERVICES.map(s => <a key={s.id} href={"#" + s.id} className="journey-link">{s.title}</a>)}</div>
    </PageHero>
    <div className="container-x space-y-14 py-16">{SERVICES.map(s => <section key={s.id} id={s.id} className="grid scroll-mt-24 items-start gap-6 lg:grid-cols-2">
      <div><s.icon className="h-8 w-8 text-brand" aria-hidden="true" /><h2 className="mt-4 text-2xl font-bold text-ink">{s.title}</h2><p className="lead mt-3">{s.lead}</p><ul className="mt-5 space-y-3">{s.points.map(p => <li key={p} className="flex gap-2 text-sm text-gray-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden="true" />{p}</li>)}</ul><p className="mt-4 text-sm text-muted">{s.best}</p></div>
      <div className="card bg-movezy-50/50"><h3 className="font-semibold text-ink">Check the right vehicle in the app</h3><p className="mt-3 text-sm leading-relaxed text-muted">The booking flow uses the current vehicle catalogue. Check each option's name, dimensions and load limit rather than relying on an example vehicle or capacity.</p><p className="mt-3 text-sm leading-relaxed text-muted">Two-wheelers are for suitable smaller loads and are excluded from Outstation bookings. Vehicle distance limits also apply. Larger loads require a suitable cargo vehicle.</p><Link to="/download#customer" className="btn-primary mt-5">Book a Vehicle</Link></div>
    </section>)}</div>
    <PricingGuide />
    <section className="container-x pb-4"><div className="rounded-3xl bg-ink px-6 py-10 text-white"><h2 className="text-2xl font-bold">Tell us about your business delivery needs</h2><p className="mt-3 max-w-2xl text-sm text-gray-300">Use the Business Enquiry category to contact the Movezy team. Recurring bookings, automated business reports and fleet-owner accounts are coming soon.</p><Link to="/contact?category=BUSINESS_ENQUIRY" className="btn-primary mt-6">Business Enquiry</Link></div></section>
  </>;
}
