// src/pages/CMSManagement.tsx
//
// Content & Policies index — lists the REAL legal content documents (Content
// collection) with live version/updated info. The old page was unrouted and
// rendered hardcoded "Updated 2 hours ago" cards.
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ChevronRight,
  Shield,
  Receipt,
  Ban,
  Info,
  RefreshCw,
} from "lucide-react";
import { fetchContentList } from "../services/api";
import {
  fetchAdminFaqs,
  createAdminFaq,
  updateAdminFaq,
  deleteAdminFaq,
  type FaqItem,
} from "../services/api";
import type { ContentItem } from "../services/api";

const TYPE_META: Record<
  string,
  { slug: string; label: string; icon: React.ElementType; blurb: string }
> = {
  TERMS: {
    slug: "terms",
    label: "Terms & Conditions",
    icon: FileText,
    blurb: "The agreement users and drivers accept",
  },
  PRIVACY: {
    slug: "privacy",
    label: "Privacy Policy",
    icon: Shield,
    blurb: "How personal data is collected and used",
  },
  REFUND: {
    slug: "refund",
    label: "Refund Policy",
    icon: Receipt,
    blurb: "When and how customers get money back",
  },
  CANCELLATION: {
    slug: "cancellation",
    label: "Cancellation Policy",
    icon: Ban,
    blurb: "Cancellation windows and charges",
  },
  ABOUT: {
    slug: "about",
    label: "About Movezy",
    icon: Info,
    blurb: "Company information shown in the apps",
  },
};

const ORDER = ["TERMS", "PRIVACY", "REFUND", "CANCELLATION", "ABOUT"];

const CMSManagement: React.FC = () => {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchContentList();
      setContents(res?.data?.contents || []);
    } catch (e: any) {
      setError(e?.message || "Could not load content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const byType = (t: string) => contents.find((c) => c.type === t);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Content & Policies</h1>
          <p className="text-sm text-gray-500">
            Legal and informational text served to the apps at{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">/content/:type</code>
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {ORDER.map((type) => {
          const meta = TYPE_META[type];
          const doc = byType(type);
          const Icon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => navigate(`/admin/cms/${meta.slug}`)}
              className="w-full bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-sm transition p-4 flex items-center gap-4 text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800">{meta.label}</p>
                <p className="text-xs text-gray-500 truncate">{meta.blurb}</p>
              </div>
              <div className="text-right shrink-0">
                {loading ? (
                  <span className="text-xs text-gray-300">…</span>
                ) : doc ? (
                  <>
                    <p className="text-xs font-medium text-gray-600">
                      v{doc.version}
                      {doc.isActive ? (
                        <span className="ml-2 text-emerald-600">Published</span>
                      ) : (
                        <span className="ml-2 text-gray-400">Inactive</span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {doc.updatedAt
                        ? new Date(doc.updatedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : ""}
                    </p>
                  </>
                ) : (
                  <span className="text-xs text-amber-600 font-medium">
                    Not created yet
                  </span>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          );
        })}
      </div>

      <FaqManagerSection />
    </div>
  );
};

/**
 * FAQ manager. The apps' Help & Support screens have always read FAQs from the
 * database (cached per category), but the admin had NO way to write them — the
 * only path was a manual DB edit. Grouped with content because FAQs are
 * support copy under the same settings permissions.
 */
const FaqManagerSection: React.FC = () => {
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [cat, setCat] = useState("");
  const [order, setOrder] = useState("0");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminFaqs();
      setFaqs(res?.data?.faqs || []);
      setCategories(res?.data?.categories || []);
    } catch {
      setFaqs([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null); setQ(""); setA(""); setCat(categories[0] || ""); setOrder("0");
    setShowForm(true); setNotice(null);
  };
  const openEdit = (f: FaqItem) => {
    setEditing(f); setQ(f.question); setA(f.answer); setCat(f.category);
    setOrder(String(f.sortOrder)); setShowForm(true); setNotice(null);
  };

  const save = async () => {
    if (!q.trim() || !a.trim() || !cat.trim()) {
      setNotice("Question, answer and category are all required.");
      return;
    }
    setBusy(true);
    try {
      const payload = { question: q.trim(), answer: a.trim(), category: cat.trim(), sortOrder: Number(order) || 0 };
      const res = editing
        ? await updateAdminFaq(editing._id, payload)
        : await createAdminFaq(payload);
      if (res?.success === false) throw new Error(res?.message || "Save failed");
      setShowForm(false);
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (f: FaqItem) => {
    setBusy(true);
    try { await updateAdminFaq(f._id, { isActive: !f.isActive }); load(); }
    finally { setBusy(false); }
  };
  const remove = async (f: FaqItem) => {
    if (!window.confirm(`Delete FAQ "${f.question.slice(0, 50)}"?`)) return;
    setBusy(true);
    try { await deleteAdminFaq(f._id); load(); }
    finally { setBusy(false); }
  };

  const visible = filter ? faqs.filter((f) => f.category === filter) : faqs;

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-800">Help &amp; Support FAQs</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            What the apps' Help sections and the support bot answer from. Changes reach the
            apps immediately (their hour-long cache is cleared on every edit).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={openCreate}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium">
            New FAQ
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-4 grid grid-cols-1 gap-3 border border-gray-100 rounded-xl p-4">
          {notice && <p className="text-xs font-medium text-red-600">{notice}</p>}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Question"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <textarea value={a} onChange={(e) => setA(e.target.value)} placeholder="Answer"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-h-[80px]" />
          <div className="flex gap-3">
            <input value={cat} onChange={(e) => setCat(e.target.value)} placeholder="Category (e.g. booking, payment)"
              list="faq-cats" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <datalist id="faq-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            <input value={order} onChange={(e) => setOrder(e.target.value)} type="number"
              placeholder="Sort" className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <button onClick={save} disabled={busy}
              className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {busy ? "Saving..." : editing ? "Update FAQ" : "Create FAQ"}
            </button>
            <button onClick={() => setShowForm(false)}
              className="ml-2 px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No FAQs{filter ? ` in ${filter}` : ""}.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {visible.map((f) => (
              <div key={f._id} className="py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{f.question}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{f.answer}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{f.category} · sort {f.sortOrder}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                  f.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {f.isActive ? "Live" : "Hidden"}
                </span>
                <div className="shrink-0 whitespace-nowrap">
                  <button onClick={() => openEdit(f)} disabled={busy}
                    className="px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md disabled:opacity-50">Edit</button>
                  <button onClick={() => toggle(f)} disabled={busy}
                    className="px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 rounded-md disabled:opacity-50">
                    {f.isActive ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => remove(f)} disabled={busy}
                    className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CMSManagement;
