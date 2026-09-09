import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import logo from "../assets/logo.png";
import { NAV, POLICY_LINKS, SITE } from "../config/site";
import StoreBadges from "./StoreBadges";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-gray-100 bg-gray-50">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Movezy" className="h-9 w-9 rounded-lg object-contain" />
            <span className="text-lg font-bold text-ink">
              Move<span className="text-brand">zy</span>
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">{SITE.description}</p>
          <div className="mt-5">
            <StoreBadges compact />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Company</h3>
          <ul className="mt-4 space-y-2">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm text-gray-700 hover:text-brand">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-gray-500">Policies</h3>
          <ul className="mt-4 space-y-2">
            {POLICY_LINKS.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-sm text-gray-700 hover:text-brand">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Contact</h3>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-brand" />
              <a href={`mailto:${SITE.email}`} className="hover:text-brand">
                {SITE.email}
              </a>
            </li>
            {SITE.phone && (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 text-brand" />
                <a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="hover:text-brand">
                  {SITE.phone}
                </a>
              </li>
            )}
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-brand" />
              <span>{SITE.address}</span>
            </li>
          </ul>
          <p className="mt-6 text-xs text-gray-500">Serving {SITE.cities.join(", ")} and expanding.</p>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-gray-500 sm:flex-row">
          <span>
            © {year} {SITE.legalName}. All rights reserved.
          </span>
          <span className="flex items-center gap-3">
            Made for movers, drivers and businesses across India.
            {/* Plain anchor: the admin panel is a separate app mounted at /admin. */}
            <a href="/admin/" className="rounded-md border border-gray-200 px-2 py-0.5 text-gray-500 hover:border-movezy-300 hover:text-brand">
              Admin login
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
