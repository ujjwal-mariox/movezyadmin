/**
 * Site-wide constants. Everything an operator may need to change lives here
 * or in `.env` (VITE_*), never scattered through pages.
 */
export const SITE = {
  name: "Movezy",
  legalName: "Movezy Logistics",
  tagline: "Move anything across the city, on demand",
  description:
    "Movezy is an on-demand goods transport app: book two-wheelers, three-wheelers, mini trucks and heavy vehicles for courier, cargo, e-commerce and business logistics — live tracking, verified partners and GST invoices.",
  url: (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") || "https://www.movezy.in",
  apiUrl:
    (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://movezybackend.onrender.com/v1/api",
  email: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) || "hello@movezy.in",
  phone: (import.meta.env.VITE_CONTACT_PHONE as string | undefined) || "",
  address: (import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || "Pune, Maharashtra, India",
  playStoreUrl: (import.meta.env.VITE_PLAY_STORE_URL as string | undefined) || "",
  appStoreUrl: (import.meta.env.VITE_APP_STORE_URL as string | undefined) || "",
  driverPlayStoreUrl: (import.meta.env.VITE_DRIVER_PLAY_STORE_URL as string | undefined) || "",
  social: {
    instagram: (import.meta.env.VITE_INSTAGRAM_URL as string | undefined) || "",
    linkedin: (import.meta.env.VITE_LINKEDIN_URL as string | undefined) || "",
    facebook: (import.meta.env.VITE_FACEBOOK_URL as string | undefined) || "",
  },
  cities: ["Pune", "Mumbai", "Nagpur", "Delhi NCR"],
};

export const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/services", label: "Services" },
  { to: "/download", label: "Download App" },
  { to: "/contact", label: "Contact Us" },
];

export const POLICY_LINKS = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/refund-policy", label: "Refund Policy" },
  { to: "/terms-of-use", label: "Terms of Use" },
];

export const absoluteUrl = (path: string) => `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
