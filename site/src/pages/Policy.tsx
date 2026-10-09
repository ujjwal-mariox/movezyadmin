import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import { POLICY_LINKS, SITE } from "../config/site";
import { isPublishedPolicy, safePolicyHtml } from "../content/policy-content";
import { POLICY_PREVIEWS } from "../content/review-content";

type PolicyType = "PRIVACY" | "REFUND" | "TERMS";

const META: Record<PolicyType, { title: string; path: string; description: string; eyebrow: string }> = {
  PRIVACY: {
    title: "Privacy Policy",
    path: "/privacy-policy",
    eyebrow: "Policies",
    description: "How Movezy collects, uses and protects your personal data across the customer app, partner app and website.",
  },
  REFUND: {
    title: "Refund Policy",
    path: "/refund-policy",
    eyebrow: "Policies",
    description: "When a Movezy booking is refundable, how cancellation fees are applied and how refunds are paid.",
  },
  TERMS: {
    title: "Terms of Use",
    path: "/terms-of-use",
    eyebrow: "Policies",
    description: "The terms that govern use of the Movezy apps, website and services for customers and driver partners.",
  },
};

interface RemoteContent {
  title?: string;
  content?: string;
  updatedAt?: string;
  publishedAt?: string;
}

/**
 * Policies are managed in the admin CMS (Content & Policies) and served by
 * the public content endpoint, so the website always shows the same text as
 * the apps. Unpublished drafts and bootstrap stubs are never presented as
 * approved policies; failed requests show a contact and retry action.
 */
export default function Policy({ type }: { type: PolicyType }) {
  const meta = META[type];
  const [remote, setRemote] = useState<RemoteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  // Cap the CMS request and allow visitors to retry without losing the page.
  useEffect(() => {
    if (SITE.demo) return;
    let alive = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch(`${SITE.apiUrl}/content/${type}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const c = body?.data?.content;
        if (alive && isPublishedPolicy(c)) setRemote(c);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); if (alive) setLoading(false); });
    return () => {
      alive = false;
      controller.abort();
    };
  }, [type, attempt]);

  const updated = remote?.updatedAt || remote?.publishedAt;
  const looksLikeHtml = !!remote?.content && /<\/?[a-z][\s\S]*>/i.test(remote.content);

  return (
    <>
      <Seo title={meta.title} description={meta.description} path={meta.path} noIndex={!remote} />
      <PageHero eyebrow={meta.eyebrow} title={meta.title} lead={meta.description}>
        <nav className="flex flex-wrap gap-2" aria-label="Policies">
          {POLICY_LINKS.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              className={({ isActive }) =>
                `rounded-full border px-4 py-2 text-sm font-medium ${
                  isActive ? "border-brand bg-brand text-white" : "border-movezy-200 bg-white text-movezy-700 hover:bg-movezy-50"
                }`
              }
            >
              {p.label}
            </NavLink>
          ))}
        </nav>
      </PageHero>

      <section className="container-x py-12">
        <div className="card max-w-4xl">
          {SITE.demo ? <div className="space-y-6">
            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><strong>Mock policy — for layout and content review only.</strong><p className="mt-2">{SITE.legalName}. Client and legal approval are pending. This sample is not the current policy.</p></div>
            {POLICY_PREVIEWS[type].map(([heading, text]) => <section key={heading}><h2 className="text-lg font-semibold">{heading}</h2><p className="mt-2 text-sm leading-relaxed text-muted">{text}</p></section>)}
          </div> : remote?.content ? (
            looksLikeHtml ? (
              <div className="prose-policy" dangerouslySetInnerHTML={{ __html: safePolicyHtml(remote.content) }} />
            ) : (
              <div className="prose-policy whitespace-pre-line text-sm leading-relaxed text-gray-700">{remote.content}</div>
            )
          ) : (
            <div role="status">
              <h2 className="text-xl font-semibold">{loading ? "Loading policy…" : "Policy text is not available here yet"}</h2>
              {!loading && <><p className="mt-3 text-sm leading-relaxed text-muted">Please contact Movezy for the current policy. For a booking cancellation, review the cancellation information shown in the app before confirming.</p><div className="mt-5 flex flex-wrap gap-3"><Link to="/contact" className="btn-primary">Contact Movezy</Link><button type="button" className="btn-secondary" onClick={() => { setRemote(null); setLoading(true); setAttempt(value => value + 1); }}>Try again</button></div></>}
            </div>
          )}
          <p className="mt-8 text-xs text-gray-400">
            {updated ? `Last updated ${new Date(updated).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` : ""}{" "}
            {SITE.email && <>Questions about this policy: <a href={`mailto:${SITE.email}`} className="break-all text-brand">{SITE.email}</a>.</>}
          </p>
        </div>
      </section>
    </>
  );
}
