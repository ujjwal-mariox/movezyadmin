# Movezy — marketing website

Static React + Tailwind site for movezy.in: Home, About Us, Services, Download App, Contact Us and the three policy pages. Same brand palette, Poppins type and card language as the admin panel and the apps.

## Run locally

```bash
npm install
cp .env.example .env      # fill in store links, contact details, site URL
npm run dev
```

## Build

```bash
npm run build        # this site only → site/dist
```

This folder lives inside the admin repository. The **repository root's** `npm run build` produces the single deployable bundle: the admin panel at `dist/admin` and this site at `dist/` — one domain serves the site at `/` and the panel at `/admin/`. Deploy from the repository root (Render static site or `deploy/aws-deploy.sh`); nothing from the admin is ever served at `/`.

`npm run build` type-checks, bundles to `dist/`, then `scripts/postbuild.mjs`:

- writes `sitemap.xml` and `robots.txt` for `VITE_SITE_URL`;
- prerenders an `index.html` per route (`about/index.html`, …) with that page's title, description and canonical, so every URL works on plain S3 and search engines see page-specific meta before JavaScript runs;
- writes `404.html` as the SPA fallback.

## SEO

- Per-page `<title>`, description, canonical, Open Graph and Twitter tags (`src/components/Seo.tsx`).
- JSON-LD: Organization, WebSite, MobileApplication, Service (per service), FAQPage (home), ContactPage, AboutPage.
- Replace `public/og-image.png` with a 1200×630 image; `public/logo.png` doubles as the favicon.

## Content that comes from the platform

- **Policies** (`/privacy-policy`, `/refund-policy`, `/terms-of-use`) load from the backend CMS (`GET /content/PRIVACY|REFUND|TERMS`), the same text the apps show. Edit them in the admin panel under Content & Policies. The bundled copy in `src/content/policies.tsx` is only a fallback when the API is unreachable.
- **Contact form** posts to `POST /contact` on the backend, which stores the message and emails the address configured in the admin Settings (needs `SMTP_*` on the server; until then messages are stored and logged).

## Hosting on AWS (S3 + CloudFront)

1. Create an S3 bucket named after the domain (e.g. `www.movezy.in`), enable static website hosting with index document `index.html` and error document `404.html`, and allow public read (or use an Origin Access Control from CloudFront instead of public access).
2. Request an ACM certificate for `movezy.in` and `www.movezy.in` in **us-east-1**.
3. Create a CloudFront distribution: origin = the bucket, default root object `index.html`, redirect HTTP→HTTPS, the ACM certificate, and a custom error response mapping 403 and 404 → `/404.html` with response code 200.
4. Add the repository root's `deploy/cloudfront-rewrite.js` as a **CloudFront Function** on the default behaviour's *viewer request*. It sends `/about` to `/about/index.html` and every `/admin/...` deep link to `/admin/index.html`, so reloading an admin page (for example `/admin/orders`) works. Without it, only `/admin/` itself would load.
5. In Route 53, point `movezy.in` and `www.movezy.in` (A and AAAA alias records) at the distribution; redirect the apex to `www` (or the reverse) with a second bucket.
6. On the backend (Render), set `CORS_ORIGIN=https://www.movezy.in` and `ADMIN_BASE_URL=https://www.movezy.in/admin`. The admin panel is served only from this domain; delete the old standalone admin service on Render once the site is live.
7. Deploy:

```bash
S3_BUCKET=www.movezy.in CLOUDFRONT_DISTRIBUTION_ID=E123456789 ./deploy/aws-deploy.sh
```

The script (repository root `deploy/aws-deploy.sh`) runs the root build, uploads hashed assets with a one-year cache and HTML/metadata with no cache, then invalidates CloudFront.

## Local preview of the combined bundle

```bash
cd .. && npm run build                       # repository root → dist/ (site + admin)
python -m http.server 5180 --directory dist  # http://localhost:5180/  and  /admin/
```

During development, `npm run dev` proxies `/admin` to the admin's dev server (`npm run dev` in `admin/movezy-admin`, port 5173), which already serves itself under `/admin/`.

## Backend CORS

The public endpoints the site uses (policies, contact form, support contact) accept any origin. Everything the admin panel calls requires the site's origin in `CORS_ORIGIN` on the backend (`https://www.movezy.in`).
