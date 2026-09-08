import React, { useCallback, useEffect, useState } from "react";
import { CalendarClock, Play, RefreshCw, ShieldAlert, ShieldCheck, Pencil, Check, X } from "lucide-react";
import { complianceApi, type ExpiryRow } from "../../services/admin-api";

/**
 * Document expiry — driver licences and vehicle RC / insurance / PUC.
 *
 * Reads the server's cached summary (15-minute cache, invalidated by the
 * nightly job and by any date edit here). Dates are editable inline: saving a
 * renewed date lifts the block immediately, which is the admin's way of
 * putting an expired driver/vehicle back on dispatch.
 */
const DocumentExpiryPanel: React.FC = () => {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<ExpiryRow[]>([]);
  const [counts, setCounts] = useState({ expired: 0, expiring: 0 });
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await complianceApi.getExpirySummary(days);
      const d = res?.data || {};
      setRows(d.rows || []);
      setCounts({ expired: d.expired || 0, expiring: d.expiring || 0 });
      setGeneratedAt(d.generatedAt || null);
    } catch (e: any) {
      setError(e?.message || "Could not load document expiry");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    setError(null);
    try {
      await complianceApi.runExpiryNow();
      await load();
    } catch (e: any) {
      setError(e?.message || "Job failed");
    } finally {
      setRunning(false);
    }
  };

  const rowKey = (r: ExpiryRow) => `${r.kind}:${r.vehicleId || r.driverId}:${r.doc}`;

  const startEdit = (r: ExpiryRow) => {
    setEditing(rowKey(r));
    setEditValue(r.expiryDate);
  };

  const saveEdit = async (r: ExpiryRow) => {
    if (!editValue) return;
    setSaving(true);
    setError(null);
    try {
      if (r.kind === "driver") {
        await complianceApi.updateDriverLicenceExpiry(r.driverId, editValue);
      } else if (r.vehicleId) {
        const field =
          r.doc === "rc" ? "rcExpiryDate" : r.doc === "insurance" ? "insuranceExpiryDate" : "pucExpiryDate";
        await complianceApi.updateVehicleDocuments(r.driverId, r.vehicleId, { [field]: editValue });
      }
      setEditing(null);
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not save the date");
    } finally {
      setSaving(false);
    }
  };

  const tone = (r: ExpiryRow) =>
    r.status === "expired"
      ? "bg-red-50 text-red-700 border-red-200"
      : r.daysRemaining <= 7
        ? "bg-orange-50 text-orange-700 border-orange-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
            Document expiry
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Driving licence, RC, insurance and PUC. Reminders go to the driver at 30 / 15 / 7 days;
            on expiry the driver or vehicle is taken off dispatch until a renewed date is recorded.
            {generatedAt && (
              <> Snapshot {new Date(generatedAt).toLocaleString("en-IN")} (cached 15 min).</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value={7}>Next 7 days</option>
            <option value={15}>Next 15 days</option>
            <option value={30}>Next 30 days</option>
            <option value={90}>Next 90 days</option>
          </select>
          <button
            onClick={load}
            className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={runNow}
            disabled={running}
            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5"
            title="Send due reminders and apply expiry blocks now instead of waiting for the nightly run"
          >
            <Play className="w-4 h-4" /> {running ? "Running…" : "Run check now"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="text-2xl font-bold text-red-700">{counts.expired}</div>
          <div className="text-xs text-red-700 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5" /> Expired (blocked)
          </div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-2xl font-bold text-amber-700">{counts.expiring}</div>
          <div className="text-xs text-amber-700 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Expiring within {days} days
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">
          Nothing expiring within {days} days. Vehicles and licences with no date recorded are not
          tracked — add dates from the driver's vehicle panel.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="py-2 px-3">Driver</th>
                <th className="py-2 px-3">Vehicle</th>
                <th className="py-2 px-3">Document</th>
                <th className="py-2 px-3">Expiry</th>
                <th className="py-2 px-3">Days</th>
                <th className="py-2 px-3">Dispatch</th>
                <th className="py-2 px-3 text-right">Edit date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const k = rowKey(r);
                const isEditing = editing === k;
                return (
                  <tr key={k} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="font-medium text-gray-800">{r.driverName || "—"}</div>
                      <div className="text-xs text-gray-400">
                        {r.driverCode && <span className="font-mono mr-2">{r.driverCode}</span>}
                        {r.mobileNumber}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{r.vehicleNumber || "—"}</td>
                    <td className="py-2 px-3">{r.docLabel}</td>
                    <td className="py-2 px-3">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded text-sm"
                          autoFocus
                        />
                      ) : (
                        r.expiryDate
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded border text-xs font-medium ${tone(r)}`}>
                        {r.status === "expired"
                          ? `${Math.abs(r.daysRemaining)}d ago`
                          : `${r.daysRemaining}d left`}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {r.blocked ? (
                        <span className="text-xs font-semibold text-red-600">Blocked</span>
                      ) : (
                        <span className="text-xs text-gray-500">Active</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => saveEdit(r)}
                            disabled={saving}
                            className="p-1.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                            title="Save renewed date"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 rounded bg-gray-50 text-gray-600 hover:bg-gray-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(r)}
                          className="p-1.5 rounded text-gray-500 hover:bg-gray-100"
                          title="Record a renewed date — lifts the block immediately"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentExpiryPanel;
