/**
 * Site-wide constants. Everything an operator may need to change lives here
 * or in `.env` (VITE_*), never scattered through pages.
 */
export const SITE = {
  name: "Movezy",
  tagline: "Book vehicles. Move goods. Track your trip.",
  description:
    "Movezy connects customers and businesses with driver partners for goods transport in Pune. Book a vehicle, review the fare and track your trip in the app.",
  url: (import.meta.env.VITE_SITE_URL as string | undefined)?.trim().replace(/\/+$/, "") || "https://www.movezy.in",
  apiUrl:
    (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/+$/, "") ||
    "https://movezybackend.onrender.com/v1/api",
  email: (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || "",
  phone: (import.meta.env.VITE_CONTACT_PHONE as string | undefined) || "",
  address: (import.meta.env.VITE_CONTACT_ADDRESS as string | undefined) || "Pune, Maharashtra, India",
  playStoreUrl: (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim() || "",
  appStoreUrl: (import.meta.env.VITE_APP_STORE_URL as string | undefined)?.trim() || "",
  driverPlayStoreUrl: (import.meta.env.VITE_DRIVER_PLAY_STORE_URL as string | undefined)?.trim() || "",
  social: {
    instagram: (import.meta.env.VITE_INSTAGRAM_URL as string | undefined) || "",
    linkedin: (import.meta.env.VITE_LINKEDIN_URL as string | undefined) || "",
    facebook: (import.meta.env.VITE_FACEBOOK_URL as string | undefined) || "",
  },
  cities: ["Pune"],
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
