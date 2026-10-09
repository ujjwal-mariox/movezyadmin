import { Helmet } from "react-helmet-async";
import { SITE, absoluteUrl } from "../config/site";
import PAGES from "../content/page-meta.json";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  /** Extra JSON-LD objects for this page (Organization + WebSite are global). */
  schema?: Record<string, unknown>[];
  noIndex?: boolean;
}

const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  ...(!SITE.demo && SITE.legalName ? { legalName: SITE.legalName } : {}),
  url: SITE.url,
  logo: absoluteUrl("/logo.png"),
  ...(SITE.email ? { email: SITE.email } : {}),
  ...(SITE.phone ? { telephone: SITE.phone } : {}),
  address: { "@type": "PostalAddress", addressLocality: "Pune", addressRegion: "Maharashtra", addressCountry: "IN" },
  sameAs: Object.values(SITE.social).filter(Boolean),
};

const WEBSITE = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE.name,
  url: SITE.url,
};

/** Page-level meta tags, canonical, Open Graph, Twitter and JSON-LD. */
export default function Seo({ title, description, path, schema = [], noIndex }: SeoProps) {
  const fullTitle = path === "/" ? `${SITE.name} — ${SITE.tagline}` : `${title} | ${SITE.name}`;
  const canonical = absoluteUrl(path);
  const page = PAGES.find(p => p.path === path);
  const pageTitle = page?.title || fullTitle;
  const pageDescription = page?.description || description;
  const image = absoluteUrl("/og-image.png");
  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noIndex || SITE.demo || !SITE.domainConfirmed ? "noindex,nofollow" : "index,follow"} />
      {SITE.searchConsoleVerification && <meta name="google-site-verification" content={SITE.searchConsoleVerification} />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="en_IN" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />
      <script type="application/ld+json">{JSON.stringify([ORGANIZATION, WEBSITE, ...schema])}</script>
    </Helmet>
  );
}
