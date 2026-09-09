/**
 * Post-build for static hosting:
 *  1. writes sitemap.xml with today's date and the configured site URL, and
 *     robots.txt pointing at it;
 *  2. copies dist/index.html into a folder per route (about/index.html …) so
 *     every URL resolves on plain S3 static hosting even without a CloudFront
 *     rewrite, and each page carries its own <title>/description in the HTML.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
const siteUrl = (process.env.VITE_SITE_URL || "https://www.movezy.in").replace(/\/$/, "");

const ROUTES = [
  { path: "/", priority: "1.0", title: "Movezy — Move anything across the city, on demand", description: "Movezy is an on-demand goods transport app: book two-wheelers, three-wheelers, mini trucks and heavy vehicles for courier, cargo, e-commerce and business logistics — live tracking, verified partners and GST invoices." },
  { path: "/about", priority: "0.8", title: "About Us | Movezy", description: "Movezy is building India's most dependable on-demand goods transport network: verified driver partners, transparent fares and technology that treats both sides of the trip fairly." },
  { path: "/services", priority: "0.9", title: "Services | Movezy", description: "Courier and parcel delivery, cargo and house shifting, e-commerce last-mile and business logistics — on two-wheelers, tempos, pickups and trucks with upfront fares." },
  { path: "/download", priority: "0.9", title: "Download App | Movezy", description: "Download the Movezy customer app on Google Play and the App Store. Driver partners: get the Movezy Partner app." },
  { path: "/contact", priority: "0.7", title: "Contact Us | Movezy", description: "Get in touch with Movezy for booking help, business logistics enquiries, driver partnership or billing questions." },
  { path: "/privacy-policy", priority: "0.4", title: "Privacy Policy | Movezy", description: "How Movezy collects, uses and protects your personal data." },
  { path: "/refund-policy", priority: "0.4", title: "Refund Policy | Movezy", description: "When a Movezy booking is refundable and how refunds are paid." },
  { path: "/terms-of-use", priority: "0.4", title: "Terms of Use | Movezy", description: "The terms that govern use of the Movezy apps, website and services." },
];

const today = new Date().toISOString().slice(0, 10);
const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ROUTES.map((r) => `  <url>\n    <loc>${siteUrl}${r.path === "/" ? "/" : r.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${r.path === "/" ? "weekly" : "monthly"}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`).join("\n") +
  `\n</urlset>\n`;
await fs.writeFile(path.join(dist, "sitemap.xml"), sitemap);
// The admin panel lives under /admin — keep it out of search results.
await fs.writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /404\n\nSitemap: ${siteUrl}/sitemap.xml\n`);

const index = await fs.readFile(path.join(dist, "index.html"), "utf8");
for (const r of ROUTES) {
  const html = index
    .replace(/<title>[^<]*<\/title>/, `<title>${escape(r.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${escape(r.description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escape(r.title)}$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${siteUrl}/og-image.png$2`)
    .replace("</head>", `  <link rel="canonical" href="${siteUrl}${r.path === "/" ? "/" : r.path}" />\n  </head>`);
  if (r.path === "/") {
    await fs.writeFile(path.join(dist, "index.html"), html);
  } else {
    const dir = path.join(dist, r.path.slice(1));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "index.html"), html);
  }
}
// SPA fallback for unknown paths on S3 (error document) / CloudFront.
await fs.writeFile(path.join(dist, "404.html"), index);
console.log(`postbuild: ${ROUTES.length} routes prerendered, sitemap + robots written for ${siteUrl}`);
