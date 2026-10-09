# Website client inputs — 9 October 2026

The client requested mocks while final inputs are unavailable. `npm run dev:demo`
or `npm run build:demo` explicitly enables them. The latter writes `dist-demo`;
`npm run build` writes the production configuration to `dist`. The combined
admin build continues to use the production configuration.

Demo mode has a visible banner and noindex metadata. Contact form submission
stays in browser memory, policy pages do not query the live CMS, contact values
are non-clickable examples, QR codes encode reserved example addresses, and
analytics and Search Console values remain inactive even if production variables
are present. App illustrations are labelled mocks, not release screenshots.
No mock settings or policy text are written to the backend/admin database.

## Replace mocks

1. Set `VITE_SITE_URL` to the final HTTPS public origin. Until supplied, metadata
   uses `https://movezy.example` and robots disallows crawling. Confirm redirects,
   domain ownership and SSL on the actual deployment before launch.
2. Supply support (`VITE_CONTACT_*`), partner (`VITE_PARTNER_*`) and business
   (`VITE_BUSINESS_*`) email/phone values. Phone numbers require the country code.
   `VITE_WHATSAPP_PHONE` enables the WhatsApp link. Blank or malformed values do
   not produce broken links. This config is for the website; the backend
   support-contact setting used by the apps still needs the real support number.
3. Set `VITE_LEGAL_COMPANY_NAME`. Publish approved Privacy, Refund and Terms text
   through existing admin Content & Policies; production retains the shared CMS.
   The demo's sample text is not legal approval or a policy publication.
4. Set the official customer Play Store, customer App Store and partner Play
   Store listing URLs in `.env.example`'s fields. QR codes and links use the same
   validated URL. Missing listings stay Coming soon; iOS remains unconfirmed.
   Store publication itself is excluded from this change.
5. Put approved, compressed release images under `public/app-screenshots/`.
   Add entries to `src/content/app-screenshots.json` with `app` (`customer` or
   `driver`), `src` (`/app-screenshots/filename.webp`) and a descriptive `alt`.
   Keep each image reasonably small (prefer WebP, approximately 100–200 KB).
   Images load lazily and a failed image has an accessible fallback.
6. Supply `VITE_GOOGLE_SITE_VERIFICATION` for the HTML-tag verification method.
   The token is present in static and runtime head metadata; ownership still
   needs verification in the client's Search Console. DNS verification is a
   separate client-side ownership step, not faked by the demo.
7. If the client creates a GA4 property, set `VITE_GA4_MEASUREMENT_ID`. Disable
   Enhanced Measurement in that web stream to prevent automatic extra events
   and duplicate SPA page views. Confirm the client's privacy requirements
   before activation. Only basic page views of public, known routes are wired;
   query strings, fragments, unknown paths, form values and booking IDs are
   excluded. No conversion/click event implementation is included.

Build again after changing settings. Never upload `.env` files, source secrets,
or `node_modules` as part of a static website release.
The website-only archives contain no admin files. If the existing deployment
also hosts `/admin`, preserve that directory when updating the public site.

## Unchanged / excluded

- Keep **2 Wheeler and 3 Wheeler**; the client's latest instruction supersedes
  the earlier removal/reclassification discussion. No catalogue migration.
- No public Booking-ID tracking, Business page, Driver Partner page, Fleet
  module, Partner Terms page, expanded FAQ, prohibited-goods page or conversion
  analytics work in this delivery. Existing category links remain on Contact.

Implementation references: [Google's page-view documentation](https://developers.google.com/analytics/devguides/collection/ga4/views)
and [qrcode.react documentation](https://github.com/zpao/qrcode.react).
