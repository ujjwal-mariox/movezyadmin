import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import Seo from "../components/Seo";
import PageHero from "../components/PageHero";
import { POLICY_LINKS, SITE } from "../config/site";
import { FALLBACK_POLICIES } from "../content/policies";

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
 * the apps. The bundled copy is only used when the API is unreachable.
 */
export default function Policy({ type }: { type: PolicyType }) {
  const meta = META[type];
  const [remote, setRemote] = useState<RemoteContent | null>(null);

  // The bundled text shows at once; the CMS version replaces it when it
  // arrives (the backend may be cold-starting, so the request is capped).
  useEffect(() => {
    let alive = true;
    setRemote(null);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    fetch(`${SITE.apiUrl}/content/${type}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const c = body?.data?.content;
        if (alive && c?.content) setRemote(c);
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      controller.abort();
    };
  }, [type]);

  const fallback = FALLBACK_POLICIES[type];
  const updated = remote?.updatedAt || remote?.publishedAt;
  const looksLikeHtml = !!remote?.content && /<\/?[a-z][\s\S]*>/i.test(remote.content);

  return (
    <>
      <Seo title={meta.title} description={meta.description} path={meta.path} />
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
          {remote?.content ? (
            looksLikeHtml ? (
              <div className="prose-policy" dangerouslySetInnerHTML={{ __html: remote.content }} />
            ) : (
              <div className="prose-policy whitespace-pre-line text-sm leading-relaxed text-gray-700">{remote.content}</div>
            )
          ) : (
            <div className="prose-policy">{fallback}</div>
          )}
          <p className="mt-8 text-xs text-gray-400">
            {updated ? `Last updated ${new Date(updated).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` : ""}{" "}
            Questions about this policy: <a href={`mailto:${SITE.email}`} className="text-brand">{SITE.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
