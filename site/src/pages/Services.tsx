import { Link } from "react-router-dom";
import { Package, Truck, Boxes, Building2, CheckCircle2, ArrowRight } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import { SITE } from "../config/site";

const SERVICES = [
  {
    id: "courier",
    icon: Package,
    title: "Courier & parcel delivery",
    lead: "Documents, food, gifts and parcels up to 20 kg on two-wheelers — the fastest way across town.",
    points: [
      "Scooter and bike partners for the quickest pickups",
      "Receiver name and mobile captured with the drop address",
      "Delivery OTP so the parcel only goes to the right hands",
      "Live tracking link you can share with the receiver",
    ],
    best: "Best for: documents, small parcels, medicines, tiffins, gifts.",
  },
  {
    id: "cargo",
    icon: Truck,
    title: "Cargo & house shifting",
    lead: "Three-wheelers, 8–14 ft pickups and 407s with loading help for furniture, appliances and bulk goods.",
    points: [
      "Vehicle cards show length, height and capacity so you know what fits",
      "Load Assist add-on: helpers priced per floor, lift or stairs",
      "Multi-stop trips for pickups from more than one place",
      "Waiting time and extra stops billed at the rates shown before you book",
    ],
    best: "Best for: home and office moves, appliances, market purchases, construction material.",
  },
  {
    id: "ecommerce",
    icon: Boxes,
    title: "E-commerce & same-day delivery",
    lead: "Last-mile for online sellers and stores: scheduled pickups, proof of delivery and a receiver-verified handover.",
    points: [
      "Schedule pickups in time slots that suit your dispatch cycle",
      "Consignee notified when the parcel is on its way",
      "Delivery OTP and status history as proof of delivery",
      "Cash-on-delivery collection settled with the trip",
    ],
    best: "Best for: D2C brands, marketplaces, pharmacies, bakeries and kirana stores.",
  },
  {
    id: "logistics",
    icon: Building2,
    title: "Business logistics",
    lead: "Credit accounts, GST-compliant invoicing and reporting for distributors, offices and manufacturers.",
    points: [
      "Enterprise credit with negotiated discounts and payment terms",
      "GST invoices with CGST/SGST or IGST detail per trip",
      "Excel and PDF exports of every booking, invoice and settlement",
      "Dedicated support and priority dispatch for recurring routes",
    ],
    best: "Best for: FMCG distribution, office logistics, inter-city cargo, factory-to-warehouse runs.",
  },
];

export default function Services() {
  const schema = SERVICES.map((s) => ({
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.title,
    description: s.lead,
    provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
    areaServed: SITE.cities.map((c) => ({ "@type": "City", name: c })),
    url: `${SITE.url}/services#${s.id}`,
  }));

  return (
    <>
      <Seo
        title="Services"
        description="Courier and parcel delivery, cargo and house shifting, e-commerce last-mile and business logistics — on two-wheelers, tempos, pickups and trucks with upfront fares."
        path="/services"
        schema={schema}
      />
      <PageHero
        eyebrow="Services"
        title="Every delivery, from an envelope to a 14-ft truck."
        lead="Pick the service that fits, see the vehicle's size and capacity, and pay the fare you saw first. All services come with verified partners, live tracking and GST invoices."
      >
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-full border border-movezy-200 bg-white px-4 py-2 text-sm font-medium text-movezy-700 hover:bg-movezy-50">
              {s.title}
            </a>
          ))}
        </div>
      </PageHero>

      <div className="container-x space-y-20 py-16">
        {SERVICES.map((s, i) => (
          <section key={s.id} id={s.id} className={`grid scroll-mt-24 items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-movezy-50 text-movezy-600">
                <s.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{s.title}</h2>
              <p className="lead mt-3">{s.lead}</p>
              <ul className="mt-6 space-y-2.5">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-leaf" /> {p}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm font-medium text-movezy-700">{s.best}</p>
            </div>
            <div className="card bg-gradient-to-br from-movezy-50 to-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Typical vehicles</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(s.id === "courier"
                  ? [
                      ["Scooter", "Up to 20 kg"],
                      ["Bike", "Up to 20 kg"],
                    ]
                  : s.id === "cargo"
                    ? [
                        ["Three-wheeler", "Up to 500 kg"],
                        ["Pickup 8 ft", "Up to 1,250 kg"],
                        ["Pickup 14 ft", "Up to 3,500 kg"],
                        ["Tata 407", "Up to 2,500 kg"],
                      ]
                    : s.id === "ecommerce"
                      ? [
                          ["Scooter / Bike", "Parcels"],
                          ["Three-wheeler", "Bulk orders"],
                        ]
                      : [
                          ["Pickup 9 ft", "Up to 1,700 kg"],
                          ["Heavy vehicles", "3,500 kg+"],
                        ]
                ).map(([name, cap]) => (
                  <div key={name} className="rounded-xl border border-gray-100 bg-white px-4 py-3">
                    <div className="text-sm font-semibold text-ink">{name}</div>
                    <div className="text-xs text-gray-500">{cap}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-500">Exact capacities and dimensions are shown on each vehicle in the app; availability varies by city.</p>
            </div>
          </section>
        ))}
      </div>

      <section className="container-x pb-4 text-center">
        <div className="rounded-3xl bg-ink px-8 py-12 text-white">
          <h2 className="text-3xl font-bold tracking-tight">Need a custom logistics plan?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-gray-300">Recurring routes, fleet requirements or multi-city distribution — tell us what you move and we'll set it up.</p>
          <Link to="/contact" className="btn-primary mt-8">
            Talk to our team <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
