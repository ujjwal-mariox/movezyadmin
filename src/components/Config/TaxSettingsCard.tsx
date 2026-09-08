import React, { useEffect, useState } from "react";
import { Landmark, Save } from "lucide-react";
import { fetchTaxSettings, updateTaxSettings, type TaxJurisdiction } from "../../services/api";

/**
 * Company tax identity — what the automated CGST/SGST vs IGST split is
 * measured against. The supplier state comes from the GSTIN's first two
 * digits (or the state picked here when there is no GSTIN); the place of
 * supply comes from the customer's GSTIN when they are registered, otherwise
 * from the pickup address. Everything on this card is stored in settings —
 * no state or rate is hardcoded in the tax logic.
 */
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const TaxSettingsCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [jurisdictions, setJurisdictions] = useState<TaxJurisdiction[]>([]);
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("");
  const [legalName, setLegalName] = useState("");
  const [address, setAddress] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchTaxSettings();
      const d = res?.data || {};
      setGstin(d.companyGstin || "");
      setState(d.companyState || "");
      setLegalName(d.companyLegalName || "");
      setAddress(d.companyAddress || "");
      setJurisdictions(d.jurisdictions || []);
    } catch (e: any) {
      setError(e?.message || "Could not load tax settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const gstinState = jurisdictions.find((j) => gstin.length >= 2 && j.code === gstin.slice(0, 2));

  const save = async () => {
    const g = gstin.trim().toUpperCase();
    if (g && !GSTIN_RE.test(g)) {
      setError("That does not look like a GSTIN (15 characters, e.g. 27ABCDE1234F1Z5).");
      return;
    }
    if (g && !jurisdictions.some((j) => j.code === g.slice(0, 2))) {
      setError(`GSTIN state code ${g.slice(0, 2)} is not a known jurisdiction.`);
      return;
    }
    if (!g && !state) {
      setError("Enter the company GSTIN or pick the company's state — the split needs one of them.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateTaxSettings({
        companyGstin: g,
        companyState: gstinState ? gstinState.name : state,
        companyLegalName: legalName.trim(),
        companyAddress: address.trim(),
      });
      setSavedAt(new Date());
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600" /> Tax identity (GST split)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Intra-state trips split GST as CGST + SGST; other states charge IGST. The state comes from
            the customer's GSTIN when they are registered, otherwise from the pickup address. The
            company side is taken from the GSTIN below.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-xs text-emerald-600">Saved {savedAt.toLocaleTimeString("en-IN")}</span>
          )}
          <button
            onClick={save}
            disabled={saving || loading}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 mb-3">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Company GSTIN</span>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              maxLength={15}
              placeholder="27ABCDE1234F1Z5"
              className="mt-1 w-full border rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              {gstinState ? `State code ${gstinState.code} → ${gstinState.name}` : "Printed on every invoice."}
            </p>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Company state</span>
            <select
              value={gstinState ? gstinState.name : state}
              onChange={(e) => setState(e.target.value)}
              disabled={!!gstinState}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
            >
              <option value="">— select —</option>
              {jurisdictions.map((j) => (
                <option key={j.code} value={j.name}>
                  {j.code} · {j.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {gstinState ? "Derived from the GSTIN." : "Used only when no GSTIN is set."}
            </p>
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Legal name</span>
            <input
              type="text"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Registered address</span>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
        </div>
      )}
    </div>
  );
};

export default TaxSettingsCard;
