import { Link } from "react-router-dom";
import { SITE } from '../config/site';
import { FARE_REVIEW } from '../content/review-content';
export default function PricingGuide() {
  return <section id="pricing" className="container-x scroll-mt-24 py-16">
    <p className="eyebrow">Transparent pricing</p><h2 className="h2 mt-2">Review the fare before you confirm</h2>
    <p className="lead mt-4 max-w-3xl">Your estimate depends on the selected vehicle, its base or minimum fare, route distance and duration, pickup area, selected add-ons and applicable tax. Peak or supply-demand pricing may also affect the estimate.</p>
    <ul className="mt-6 grid gap-3 text-sm text-gray-700 sm:grid-cols-2">
      {["Vehicle and route", "Base / minimum fare", "Date, time and demand", "Selected stops and add-ons", "Loading or waiting, where applicable", "Applicable GST and discounts"].map(item => <li key={item} className="rounded-xl bg-gray-50 px-4 py-3">{item}</li>)}
    </ul>
    <p className="mt-5 max-w-3xl text-sm leading-relaxed text-muted">Check the fare breakdown in the app. Do not assume that tolls, parking or special handling are included unless they appear in your estimate. For a question about a charge, contact Movezy with your booking details.</p>
    <Link className="btn-secondary mt-6" to="/contact?category=PAYMENT_BILLING">Ask about a charge</Link>
    {SITE.demo && <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6"><h3 className="text-lg font-semibold">When can the amount change?</h3><p className="mt-2 text-sm text-amber-900">Sample explanation from the system behaviour — awaiting business-policy approval.</p><ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-gray-700">{FARE_REVIEW.map(text => <li key={text}>{text}</li>)}</ul></div>}
  </section>;
}
