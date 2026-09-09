import { useEffect } from "react";

/**
 * The admin panel is a separate app at /admin/index.html. When a host's
 * catch-all rewrite sends "/admin" (no trailing slash) or an admin deep link
 * such as "/admin/orders" to THIS site instead, hand it over: load the panel
 * and pass the intended path along so it can restore it after start-up.
 * Hosts with the proper "/admin/*" rewrite never reach this component.
 */
export default function AdminRedirect() {
  useEffect(() => {
    const { pathname, search } = window.location;
    const rest = pathname.replace(/^\/admin\/?/, "");
    const target = rest
      ? `/admin/?redirect=${encodeURIComponent(`/${rest}${search}`)}`
      : `/admin/${search}`;
    window.location.replace(target);
  }, []);
  return (
    <section className="container-x py-24 text-center">
      <p className="text-sm text-muted">Opening the admin panel…</p>
      <p className="mt-3 text-xs text-gray-400">
        If nothing happens, <a href="/admin/" className="text-brand">open /admin/</a>.
      </p>
    </section>
  );
}
