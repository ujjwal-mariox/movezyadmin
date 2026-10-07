import { useCallback, useEffect, useRef, useState } from "react";
import { fetchWithAuth } from "../services/admin-api";
import { useAuth } from "../auth/useAuth";
import { CONTACT_CATEGORIES } from "../../shared/contact-categories";
type Enquiry = { _id: string; name: string; email: string; phone?: string; category?: keyof typeof CONTACT_CATEGORIES; subject: string; message: string; status: string; createdAt: string; emailedToTeam?: boolean; acknowledged?: boolean };
export default function WebsiteEnquiries() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Enquiry[]>([]), [category, setCategory] = useState(""), [status, setStatus] = useState(""), [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [loading, setLoading] = useState(false), [error, setError] = useState(""), [expanded, setExpanded] = useState(""), [saving, setSaving] = useState("");
  const generation = useRef(0);
  const pendingUpdate = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canView = hasPermission("support:view"), canUpdate = hasPermission("support:resolve");
  const load = useCallback(async () => {
    if (!canView) return;
    const request = ++generation.current;
    setLoading(true); setError(""); setRows([]); setPagination({ total: 0, pages: 0 });
    try {
      const query = new URLSearchParams({ page: String(page), limit: "20" });
      if (category) query.set("category", category); if (status) query.set("status", status);
      const response = await fetchWithAuth("/admin/contact-messages?" + query);
      if (request !== generation.current) return;
      if (response.success === false || response.code === 0 || !Array.isArray(response.data?.messages)) throw new Error("Could not load enquiries. Please try again.");
      setRows(response.data?.messages || []); setPagination(response.data?.pagination || { total: 0, pages: 0 });
    } catch (failure) { if (request === generation.current) setError(failure instanceof Error ? failure.message : "Could not load enquiries."); }
    finally { if (request === generation.current) setLoading(false); }
  }, [canView, page, category, status]);
  const cancelStaleRequests = useCallback(() => { generation.current++; }, []);
  useEffect(() => { void load(); return cancelStaleRequests; }, [load, refreshKey, cancelStaleRequests]);
  const updateStatus = async (id: string, next: string) => {
    if (!canUpdate || pendingUpdate.current) return;
    pendingUpdate.current = true;
    setSaving(id); setError("");
    try { await fetchWithAuth("/admin/contact-messages/" + id + "/status", { method: "PUT", body: JSON.stringify({ status: next }) }); setRefreshKey(value => value + 1); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Could not update the enquiry."); }
    finally { pendingUpdate.current = false; setSaving(""); }
  };
  if (!canView) return <p role="alert">You do not have permission to view website enquiries.</p>;
  return <section className="space-y-6">
    <div><h1 className="text-2xl font-bold text-gray-900">Website Enquiries</h1><p className="mt-2 text-gray-600">Review contact-form enquiries by category. Status changes do not send an email.</p></div>
    <div className="flex flex-wrap gap-4 rounded-xl bg-white p-4 shadow-sm">
      <label className="flex w-full min-w-0 flex-col gap-2 text-sm font-medium sm:w-auto sm:flex-row sm:items-center">Category<select aria-label="Filter enquiry category" className="min-h-11 w-full min-w-0 rounded-lg border p-2 sm:w-auto" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="">All categories</option>{Object.entries(CONTACT_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="flex w-full min-w-0 flex-col gap-2 text-sm font-medium sm:w-auto sm:flex-row sm:items-center">Status<select aria-label="Filter enquiry status" className="min-h-11 w-full min-w-0 rounded-lg border p-2 sm:w-auto" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{["NEW", "REPLIED", "CLOSED"].map(value => <option key={value}>{value}</option>)}</select></label>
      <button className="rounded-lg border px-4 py-2" onClick={() => void load()} disabled={loading}>Refresh</button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {loading ? <p role="status">Loading enquiries…</p> : <>
      <p className="text-sm text-gray-500">{pagination.total} enquiries</p>
      {!rows.length && !error && <p className="rounded-xl bg-white p-6">No enquiries match these filters.</p>}
      {rows.map(row => <article key={row._id} className="min-w-0 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="break-words font-semibold text-gray-900">{row.name}</h2><p className="mt-1 text-sm text-gray-600">{CONTACT_CATEGORIES[row.category || "OTHER"] || "Other"} · {row.status}</p><p className="mt-1 text-xs text-gray-500">{new Date(row.createdAt).toLocaleString("en-IN")}</p></div><button className="rounded-lg border px-4 py-2 text-sm" onClick={() => setExpanded(previous => previous === row._id ? "" : row._id)} aria-expanded={expanded === row._id}>View enquiry</button></div>
        <p className="mt-3 break-words text-sm text-gray-700">{row.subject}</p>
        {expanded === row._id && <div className="mt-4 space-y-4 border-t pt-4"><p className="break-all text-sm">Reference: {row._id}</p><a className="block break-all text-sm text-orange-600 underline" href={"mailto:" + row.email}>{row.email}</a>{row.phone && <p className="text-sm">{row.phone}</p>}<p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{row.message}</p><p className="text-xs text-gray-500">Team email: {row.emailedToTeam ? "Sent" : "Not sent"} · Acknowledgement: {row.acknowledged ? "Sent" : "Not sent"}</p>{canUpdate && <label className="block text-sm font-medium">Mark status<select className="ml-2 rounded-lg border p-2" value={row.status} disabled={Boolean(saving)} onChange={e => void updateStatus(row._id, e.target.value)}>{["NEW", "REPLIED", "CLOSED"].map(value => <option key={value}>{value}</option>)}</select></label>}</div>}
      </article>)}
      <div className="flex flex-wrap items-center gap-3"><button className="rounded-lg border px-4 py-2 disabled:opacity-40" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><span className="text-sm">Page {page} of {Math.max(1, pagination.pages)}</span><button className="rounded-lg border px-4 py-2 disabled:opacity-40" disabled={page >= pagination.pages || loading} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </>}
  </section>;
}
