// src/pages/CMSEdit.tsx
//
// Editor for one legal/content document. Loads the REAL text from
// GET /admin/content/:type and publishes with PUT (version bump + audit
// stamp). The old page rendered hardcoded lorem text with Save buttons that
// had no onClick at all.
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, AlertTriangle, CheckCircle, Eye } from "lucide-react";
import {
  fetchContentByType,
  updateContentByType,
} from "../services/api";
import type { ContentItem } from "../services/api";

const SLUG_TO_TYPE: Record<string, { type: string; label: string }> = {
  terms: { type: "TERMS", label: "Terms & Conditions" },
  privacy: { type: "PRIVACY", label: "Privacy Policy" },
  refund: { type: "REFUND", label: "Refund Policy" },
  cancellation: { type: "CANCELLATION", label: "Cancellation Policy" },
  about: { type: "ABOUT", label: "About Movezy" },
};

const CMSEdit: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const mapping = slug ? SLUG_TO_TYPE[slug] : undefined;

  const [doc, setDoc] = useState<ContentItem | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!mapping) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchContentByType(mapping.type);
        const c: ContentItem | null = res?.data?.content || null;
        setDoc(c);
        setTitle(c?.title || mapping.label);
        setBody(c?.content || "");
      } catch (e: any) {
        setError(e?.message || "Could not load content");
      } finally {
        setLoading(false);
      }
    })();
  }, [mapping?.type]);

  if (!mapping) {
    return (
      <div className="p-6">
        <p className="text-gray-500">
          Unknown content page “{slug}”.{" "}
          <button
            className="text-blue-600 underline"
            onClick={() => navigate("/admin/cms")}
          >
            Back to Content & Policies
          </button>
        </p>
      </div>
    );
  }

  const save = async () => {
    if (!title.trim() || !body.trim()) {
      setError("Title and content are both required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await updateContentByType(mapping.type, {
        title: title.trim(),
        content: body,
      });
      const c: ContentItem | null = res?.data?.content || null;
      if (c) setDoc(c);
      setSavedAt(new Date());
    } catch (e: any) {
      setError(e?.message || "Publish failed");
    } finally {
      setSaving(false);
    }
  };

  const dirty =
    !loading && (title !== (doc?.title || mapping.label) || body !== (doc?.content || ""));

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/cms")}
            className="p-2 border rounded-lg text-gray-500 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{mapping.label}</h1>
            <p className="text-xs text-gray-500">
              {doc
                ? `v${doc.version} · last published ${
                    doc.publishedAt
                      ? new Date(doc.publishedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"
                  }`
                : "Not created yet — publishing will create it"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && !dirty && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Published{" "}
              {savedAt.toLocaleTimeString("en-IN")}
            </span>
          )}
          <button
            onClick={() => setPreview((p) => !p)}
            className={`px-3 py-2 text-sm border rounded-lg flex items-center gap-1.5 ${
              preview ? "bg-gray-800 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button
            onClick={save}
            disabled={saving || loading || !dirty}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        Publishing bumps the version and immediately serves the new text to the
        apps via <code className="bg-amber-100 px-1 rounded">/content/{mapping.type.toLowerCase()}</code>.
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 py-10 text-center">Loading…</p>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-gray-600">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </label>

          {preview ? (
            <div className="bg-white border rounded-xl p-6 prose prose-sm max-w-none whitespace-pre-wrap min-h-[380px]">
              <h2 className="text-lg font-bold mb-3">{title}</h2>
              {body || (
                <span className="text-gray-400">Nothing to preview yet.</span>
              )}
            </div>
          ) : (
            <label className="block">
              <span className="text-sm text-gray-600">
                Content (plain text / markdown — rendered as-is in the apps)
              </span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={22}
                className="mt-1 w-full border rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Write the policy text here…"
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
};

export default CMSEdit;
