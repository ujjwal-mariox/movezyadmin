// src/pages/CMSManagement.tsx
//
// Content & Policies index — lists the REAL legal content documents (Content
// collection) with live version/updated info. The old page was unrouted and
// rendered hardcoded "Updated 2 hours ago" cards.
import React, { useEffect, useState } from "react";
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
    </div>
  );
};

export default CMSManagement;
