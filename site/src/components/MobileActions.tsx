import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
export default function MobileActions() {
  const [editing, setEditing] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    const update = () => queueMicrotask(() => setEditing(document.activeElement instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)));
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => { document.removeEventListener("focusin", update); document.removeEventListener("focusout", update); };
  }, []);
  if (editing || pathname.startsWith("/admin")) return null;
  return <nav aria-label="Quick booking actions" className="mobile-actions fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-gray-200 bg-white/95 px-4 pt-3 backdrop-blur md:hidden">
    <Link to="/download#customer" className="btn-primary min-w-0 flex-1 !px-2">Book a Vehicle</Link>
    <Link to="/download#tracking" className="btn-secondary min-w-0 flex-1 !px-2">Track Booking</Link>
  </nav>;
}
