import { Link } from "react-router-dom";
import { Smartphone, Undo2, Trash2, FileText, Mail } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import { SITE } from "../config/site";

const STEPS = [
  {
    app: "Movezy (customer app)",
    path: "Profile → Delete account",
  },
  {
    app: "Movezy Partner (driver app)",
    path: "Profile → Delete account",
  },
];

const WHAT_HAPPENS = [
  {
    icon: Smartphone,
    title: "Signed out straight away",
    text: "You can't book (or receive bookings, as a partner) while the deletion is pending.",
  },
  {
    icon: Undo2,
    title: "30 days to change your mind",
    text: "Sign in again within 30 days and your account is kept exactly as it was.",
  },
  {
    icon: Trash2,
    title: "Then deleted for good",
    text: "Your name, phone number, email, photo, saved addresses and emergency contacts are deleted. For partners, documents and bank details too.",
  },
  {
    icon: FileText,
    title: "What we keep",
    text: "Trip, invoice and payout records, without your personal details, for as long as tax and accounting law requires.",
  },
];

/**
 * Account deletion instructions. Google Play requires a public web page where
 * people can learn how to delete their account and data, including without
 * the app installed.
 */
export default function DeleteAccount() {
  return (
    <>
      <Seo
        title="Delete your account"
        description="How to delete your Movezy or Movezy Partner account and what happens to your data."
        path="/delete-account"
      />
      <PageHero
        eyebrow="Your data"
        title="Delete your Movezy account"
        lead="You can delete your account yourself from either app. Here's how, and exactly what happens to your data."
      />

      <section className="container-x grid gap-6 py-12 md:grid-cols-2">
        {STEPS.map((s) => (
          <div key={s.app} className="card">
            <h2 className="text-base font-semibold text-ink">{s.app}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Open the app, go to <span className="font-semibold text-ink">{s.path}</span>, read what happens and
              confirm. You'll be signed out immediately.
            </p>
          </div>
        ))}
      </section>

      <section className="container-x pb-12">
        <h2 className="h2">What happens next</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {WHAT_HAPPENS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon className="h-6 w-6 text-movezy-600" />
              <h3 className="mt-3 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-muted">
          You can't delete your account during an active or upcoming booking, and partners must first withdraw any
          earnings and wait for payouts in progress to complete. Any wallet balance is lost once the account is deleted.
        </p>
      </section>

      <section className="container-x pb-16">
        <div className="card flex flex-col gap-4 sm:flex-row sm:items-center">
          <Mail className="h-6 w-6 shrink-0 text-movezy-600" />
          <div className="flex-1">
            <h2 className="text-base font-semibold text-ink">No longer have the app?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Write to us from any email address with your registered mobile number and whether it's a customer or
              partner account. We'll confirm the number with you before deleting anything.
            </p>
          </div>
          {SITE.email ? (
            <a
              href={`mailto:${SITE.email}?subject=${encodeURIComponent("Delete my Movezy account")}`}
              className="btn-primary whitespace-nowrap"
            >
              Email {SITE.email}
            </a>
          ) : (
            <Link to="/contact" className="btn-primary whitespace-nowrap">
              Contact us
            </Link>
          )}
        </div>
      </section>
    </>
  );
}
