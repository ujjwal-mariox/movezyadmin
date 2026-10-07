import { promises as fs } from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
const dist = path.resolve("dist");
const env = loadEnv("production", process.cwd(), "VITE_");
const siteUrl = (env.VITE_SITE_URL?.trim() || "https://www.movezy.in").replace(/\/+$/, "");
if (!["https:", "http:"].includes(new URL(siteUrl).protocol)) throw new Error("VITE_SITE_URL must be an HTTP(S) URL.");
const routes = JSON.parse(await fs.readFile("src/content/page-meta.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);
const escape = value => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
await fs.writeFile(path.join(dist, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + routes.map(r => "  <url><loc>" + escape(siteUrl + r.path) + "</loc><lastmod>" + today + "</lastmod><priority>" + r.priority + "</priority></url>").join("\n") + "\n</urlset>\n");
await fs.writeFile(path.join(dist, "robots.txt"), "User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /404\n\nSitemap: " + siteUrl + "/sitemap.xml\n");
const source = await fs.readFile(path.join(dist, "index.html"), "utf8");
const base = source.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "").replace(/<meta\b[^>]*(?:name=["'](?:description|robots|twitter:[^"']+)["']|property=["']og:[^"']+["'])[^>]*>/gi, "").replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "");
function render(route, noIndex = false) {
  const url = siteUrl + route.path, image = siteUrl + "/og-image.png";
  const meta = (kind, key, value) => '<meta data-site-static-meta="true" ' + kind + '="' + key + '" content="' + escape(value) + '" />';
  const schema = [{ "@context": "https://schema.org", "@type": "Organization", name: "Movezy", url: siteUrl, logo: siteUrl + "/logo.png", ...(env.VITE_CONTACT_EMAIL ? { email: env.VITE_CONTACT_EMAIL } : {}) }, { "@context": "https://schema.org", "@type": "WebSite", name: "Movezy", url: siteUrl }];
  const tags = ['<title data-site-static-meta="true">' + escape(route.title) + "</title>", meta("name", "description", route.description), meta("name", "robots", noIndex ? "noindex,nofollow" : "index,follow"), '<link data-site-static-meta="true" rel="canonical" href="' + escape(url) + '" />', meta("property", "og:type", "website"), meta("property", "og:site_name", "Movezy"), meta("property", "og:title", route.title), meta("property", "og:description", route.description), meta("property", "og:url", url), meta("property", "og:image", image), meta("property", "og:locale", "en_IN"), meta("name", "twitter:card", "summary_large_image"), meta("name", "twitter:title", route.title), meta("name", "twitter:description", route.description), meta("name", "twitter:image", image), '<script data-site-static-meta="true" type="application/ld+json">' + JSON.stringify(schema).replace(/</g, "\\u003c") + "</script>"].join("\n");
  return base.replace("</head>", tags + "\n</head>");
}
for (const route of routes) {
  const destination = route.path === "/" ? dist : path.join(dist, route.path.slice(1));
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, "index.html"), render(route, route.path.endsWith("policy") || route.path === "/terms-of-use"));
}
await fs.writeFile(path.join(dist, "404.html"), render({ path: "/404", title: "Page not found | Movezy", description: "The requested Movezy page could not be found." }, true));
console.log("postbuild: " + routes.length + " routes, 404, sitemap, robots and social metadata generated for " + siteUrl);
