import React, { useEffect, useState } from "react";
import { MessageSquareText, Save } from "lucide-react";
import { fetchWithAuth } from "../../services/admin-api";

/**
 * The tap-to-send lines in the in-trip chat, one list for drivers and one
 * for customers. One line per row; saving replaces the list in that order.
 */
const QuickRepliesCard: React.FC = () => {
  const [driverText, setDriverText] = useState("");
  const [userText, setUserText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"DRIVER" | "USER" | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth("/admin/chat/quick-replies");
      const d = res?.data || {};
      const lines = (rows: any[]) =>
        (rows || [])
          .filter((r) => r.isActive !== false)
          .map((r) => r.text)
          .join("\n");
      setDriverText(lines(d.DRIVER));
      setUserText(lines(d.USER));
    } catch (e: any) {
      setError(e?.message || "Could not load quick replies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (audience: "DRIVER" | "USER") => {
    setSaving(audience);
    setError("");
    setOk("");
    try {
      const text = audience === "DRIVER" ? driverText : userText;
      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const res = await fetchWithAuth("/admin/chat/quick-replies", {
        method: "PUT",
        body: JSON.stringify({ audience, lines }),
      });
      setOk(res?.message || "Saved.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(null);
    }
  };

  const box = (label: string, hint: string, value: string, set: (v: string) => void, audience: "DRIVER" | "USER") => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <p className="text-xs text-gray-500">{hint}</p>
        </div>
        <button
          onClick={() => save(audience)}
          disabled={loading || saving !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-movezy-600 hover:bg-movezy-700 rounded-lg disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving === audience ? "Saving…" : "Save"}
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => set(e.target.value)}
        disabled={loading}
        rows={8}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-movezy-500 disabled:bg-gray-50"
        placeholder={"One line per reply"}
      />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300 lg:col-span-2">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
          <MessageSquareText className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Chat quick replies</h3>
          <p className="text-sm text-gray-500">
            Predefined lines drivers and customers tap to send in the trip chat. Live in the apps as soon as saved.
          </p>
        </div>
      </div>
      {error && <div className="mb-3 px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}
      {ok && <div className="mb-3 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">{ok}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {box("For drivers", "Sent to the customer, e.g. “I've reached the pickup point.”", driverText, setDriverText, "DRIVER")}
        {box("For customers", "Sent to the driver, e.g. “Are you coming?”", userText, setUserText, "USER")}
      </div>
    </div>
  );
};

export default QuickRepliesCard;
