import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import { SITE } from "../config/site";

type Status = "idle" | "sending" | "sent" | "error";

const SUBJECTS = ["Booking help", "Business / enterprise enquiry", "Become a driver partner", "Billing & invoices", "Feedback", "Other"];

export default function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: SUBJECTS[0], message: "", website: "" });

  const update = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please fill in your name, email and message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("That email address doesn't look right.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(`${SITE.apiUrl}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, source: "website" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(body?.message || "We couldn't send your message. Please try again or email us directly.");
      }
      setAcknowledged(body?.data?.acknowledged === true);
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "We couldn't send your message. Please email us directly.");
    }
  };

  return (
    <>
      <Seo
        title="Contact Us"
        description="Get in touch with Movezy for booking help, business logistics enquiries, driver partnership or billing questions. We reply within one working day."
        path="/contact"
        schema={[{ "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Movezy", url: `${SITE.url}/contact` }]}
      />
      <PageHero eyebrow="Contact us" title="We're here to help." lead="Questions about a booking, a business account, or becoming a partner — send us a message and we'll reply within one working day." />

      <section className="container-x grid gap-10 py-16 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {status === "sent" ? (
            <div className="card border-emerald-100 bg-emerald-50/60">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h2 className="mt-4 text-xl font-bold text-ink">Message sent</h2>
              <p className="mt-2 text-sm text-gray-700">
                Thanks, {form.name.split(" ")[0]}.{" "}
                {acknowledged
                  ? `We've emailed a copy to ${form.email} and will get back to you within one working day.`
                  : `We'll reply to ${form.email} within one working day.`}
              </p>
              <button type="button" onClick={() => { setStatus("idle"); setForm({ ...form, message: "" }); }} className="btn-secondary mt-6">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="card space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Your name *
                  <input className="field mt-1.5" value={form.name} onChange={update("name")} autoComplete="name" required />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                  <input className="field mt-1.5" type="email" value={form.email} onChange={update("email")} autoComplete="email" required />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile (optional)
                  <input className="field mt-1.5" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" inputMode="tel" />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Subject
                  <select className="field mt-1.5" value={form.subject} onChange={update("subject")}>
                    {SUBJECTS.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Message *
                <textarea className="field mt-1.5 min-h-[140px]" value={form.message} onChange={update("message")} required />
              </label>
              {/* Honeypot: bots fill it, people never see it. */}
              <label className="hidden" aria-hidden="true">
                Website
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} />
              </label>
              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-500">By sending, you agree to our privacy policy.</p>
                <button type="submit" className="btn-primary" disabled={status === "sending"}>
                  <Send className="h-4 w-4" /> {status === "sending" ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <div className="card">
            <h2 className="text-base font-semibold text-ink">Reach us directly</h2>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-brand" />
                <a href={`mailto:${SITE.email}`} className="hover:text-brand">
                  {SITE.email}
                </a>
              </li>
              {SITE.phone && (
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 text-brand" />
                  <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="hover:text-brand">
                    {SITE.phone}
                  </a>
                </li>
              )}
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-brand" />
                <span>{SITE.address}</span>
              </li>
            </ul>
          </div>
          <div className="card bg-movezy-50/60">
            <h2 className="text-base font-semibold text-ink">Already booked?</h2>
            <p className="mt-2 text-sm text-gray-700">
              For help with a live trip, use Help &amp; Support inside the app — it reaches our team with your booking details attached and lets you chat with support directly.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
