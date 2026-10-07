import { ArrowRight } from "lucide-react";
const BOOKING_STEPS = [
  { title: "Pickup", text: "Set the collection location." },
  { title: "Drop", text: "Set the delivery location and any stops." },
  { title: "Vehicle", text: "Choose an eligible vehicle for your load." },
  { title: "Date / time", text: "Book now or select a scheduled pickup slot." },
  { title: "Fare", text: "Review the estimate, add-ons and payment option." },
  { title: "Confirm booking", text: "Confirm in the app and follow booking updates." },
];
export default function BookingJourney({ compact = false }: { compact?: boolean }) {
  return <ol className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
    {BOOKING_STEPS.map((step, index) => <li key={step.title} className="flex min-w-0 items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-movezy-100 text-sm font-semibold text-movezy-700">{index + 1}</span>
      <div className="min-w-0 flex-1"><h3 className="font-semibold text-ink">{step.title}</h3><p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p></div>
      {compact && index < BOOKING_STEPS.length - 1 && <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-movezy-400" aria-hidden="true" />}
    </li>)}
  </ol>;
}
