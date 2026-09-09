import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Smartphone } from "lucide-react";
import logo from "../assets/logo.png";
import { NAV } from "../config/site";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full border-b transition-colors ${
        scrolled ? "border-gray-100 bg-white/90 backdrop-blur" : "border-transparent bg-white"
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2" aria-label="Movezy home">
          <img src={logo} alt="Movezy" className="h-9 w-9 rounded-lg object-contain" />
          <span className="text-lg font-bold tracking-tight text-ink">
            Move<span className="text-brand">zy</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "text-brand" : "text-gray-600 hover:bg-movezy-50 hover:text-ink"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block">
          <Link to="/download" className="btn-primary !py-2.5">
            <Smartphone className="h-4 w-4" /> Get the app
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-gray-700 hover:bg-movezy-50 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-gray-100 bg-white md:hidden" aria-label="Mobile">
          <div className="container-x flex flex-col py-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-3 text-sm font-medium ${isActive ? "bg-movezy-50 text-brand" : "text-gray-700"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <Link to="/download" className="btn-primary mt-2">
              <Smartphone className="h-4 w-4" /> Get the app
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
