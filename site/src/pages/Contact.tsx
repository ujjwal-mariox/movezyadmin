import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import SupportChannels from "../components/SupportChannels";
import { SITE } from "../config/site";
import { Link, useSearchParams } from "react-router-dom";
import { CONTACT_CATEGORIES } from "../../../shared/contact-categories";
import type { ContactCategory } from "../../../shared/contact-categories";

type Status = "idle" | "sending" | "sent" | "error";

export default function Contact() {
  const [query] = useSearchParams();
  const pending = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", category: "NEW_BOOKING" as ContactCategory, message: "", website: "" });
  useEffect(() => {
    const category = query.get("category");
    if (category && Object.hasOwn(CONTACT_CATEGORIES, category) && !pending.current) {
      setForm(previous => ({ ...previous, category: category as ContactCategory }));
      setStatus("idle");
    }
  }, [query]);

  const update = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pending.current) return;
    setError("");
    if (form.name.trim().length < 2 || form.message.trim().length < 10) {
      setError("Enter your name (at least 2 characters) and a message of at least 10 characters.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError("That email address doesn't look right.");
      return;
    }
    if (SITE.demo) {
      setAcknowledged(false);
      setReference('DEMO-PREVIEW');
      setStatus('sent');
      return;
    }
    pending.current = true;
    setStatus("sending");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(`${SITE.apiUrl}/contact`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, subject: CONTACT_CATEGORIES[form.category], source: "website" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false || body?.code === 0 || body?.data?.received !== true) {
        throw new Error(!res.ok && body?.message ? body.message : "We couldn't confirm receipt of your enquiry. Please try again or use in-app support.");
      }
      setAcknowledged(body?.data?.acknowledged === true);
      setReference(body?.data?.reference || "");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof TypeError ? "We couldn't reach Movezy. Check your connection and try again, or use in-app support." : err instanceof Error && err.name !== "AbortError" ? err.message : "We couldn't confirm receipt in time. Please try again or use in-app support.");
    } finally {
      clearTimeout(timeout);
      pending.current = false;
    }
  };

  return (
    <>
      <Seo
        title="Contact Us"
        description="Contact Movezy about bookings, business, driver or fleet partnership, billing or technical issues. Choose an enquiry category."
        path="/contact"
        schema={[{ "@context": "https://schema.org", "@type": "ContactPage", name: "Contact Movezy", url: `${SITE.url}/contact` }]}
      />
      <PageHero eyebrow="Contact us" title="Tell us how we can help." lead="Choose the category that fits your enquiry so the Movezy team can review it." />

      <section className="container-x grid gap-10 py-16 lg:grid-cols-5">
        <div className="lg:col-span-3">
          {status === "sent" ? (
            <div className="card border-emerald-100 bg-emerald-50/60">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              <h2 className="mt-4 text-xl font-bold text-ink" role="status">{SITE.demo ? 'Demo enquiry preview' : 'Enquiry received'}</h2>
              <p className="mt-2 text-sm text-gray-700">
                Thanks, {form.name.split(" ")[0]}.{" "}
                {SITE.demo ? 'This is a local preview. Your enquiry has not been sent or saved, and no email has been issued.' : acknowledged
                  ? `We've emailed an acknowledgement to ${form.email}. Your enquiry has been saved for review.`
                  : "Your enquiry has been saved for our team to review."}
              </p>
              {reference && <p className="mt-3 break-all text-sm text-gray-500">Reference: {reference}</p>}
              <button type="button" onClick={() => { setStatus("idle"); setForm({ ...form, message: "" }); }} className="btn-secondary mt-6">
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="card space-y-4" noValidate aria-busy={status === "sending"}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                  Your name *
                  <input className="field mt-1.5" value={form.name} onChange={update("name")} autoComplete="name" maxLength={120} required disabled={status === "sending"} />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                  <input className="field mt-1.5" type="email" inputMode="email" value={form.email} onChange={update("email")} autoComplete="email" maxLength={200} required disabled={status === "sending"} />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile (optional)
                  <input className="field mt-1.5" type="tel" value={form.phone} onChange={update("phone")} autoComplete="tel" inputMode="tel" maxLength={20} disabled={status === "sending"} />
                </label>
                <label className="block text-sm font-medium text-gray-700">
                  I am contacting Movezy regarding *
                  <select className="field mt-1.5" value={form.category} onChange={update("category")} required disabled={status === "sending"}>
                    {Object.entries(CONTACT_CATEGORIES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block text-sm font-medium text-gray-700">
                Message *
                <textarea className="field mt-1.5 min-h-[140px]" value={form.message} onChange={update("message")} minLength={10} maxLength={4000} aria-describedby="message-help" required disabled={status === "sending"} />
              </label>
              <p id="message-help" className="text-sm text-gray-500">10–4,000 characters. Include the Booking ID for booking help. Please do not send passwords or card details.</p>
              {/* Honeypot: bots fill it, people never see it. */}
              <label className="hidden" aria-hidden="true">
                Website
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={update("website")} />
              </label>
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500"><Link to="/privacy-policy" className="text-brand underline">Read the Privacy Policy</Link> for information about your data.</p>
                <button type="submit" className="btn-primary" disabled={status === "sending"}>
                  <Send className="h-4 w-4" /> {status === "sending" ? "Sending…" : "Send message"}
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-4 lg:col-span-2">
          <SupportChannels />
          <div className="card bg-movezy-50/60">
            <h2 className="text-base font-semibold text-ink">Already booked?</h2>
            <p className="mt-2 text-sm text-gray-700">
              Open Help &amp; Support inside the app. Start with the help flow and raise a ticket when needed.
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
