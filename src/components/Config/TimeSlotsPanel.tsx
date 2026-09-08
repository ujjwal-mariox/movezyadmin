import React, { useCallback, useEffect, useState } from "react";
import { Clock, Plus, Pencil, Trash2, Save, X, ToggleLeft, ToggleRight } from "lucide-react";
import { masterDataApi } from "../../services/admin-api";

/**
 * Scheduled-pickup time slots — the chips the customer app shows under
 * "Schedule pickup for later". Until now these were seed data with no admin
 * page. Also holds the scheduling rules (days in advance, minimum lead time).
 */
interface TimeSlotRow {
  _id: string;
  label: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  maxBookings: number;
  surgeMultiplier: number;
  sortOrder: number;
}

interface ScheduleConfig {
  advanceBookingDays: number;
  minAdvanceHours: number;
  maxScheduledPerDay?: number;
  isSchedulingEnabled: boolean;
}

const EMPTY_FORM = { label: "", startTime: "09:00", endTime: "11:00", maxBookings: "100", surgeMultiplier: "1", sortOrder: "0" };

const TimeSlotsPanel: React.FC = () => {
  const [slots, setSlots] = useState<TimeSlotRow[]>([]);
  const [config, setConfig] = useState<ScheduleConfig>({ advanceBookingDays: 7, minAdvanceHours: 2, isSchedulingEnabled: true });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await masterDataApi.getTimeSlots(true);
      setSlots(res?.data?.slots || []);
      if (res?.data?.scheduleConfig) setConfig({ ...config, ...res.data.scheduleConfig });
    } catch (e: any) {
      setError(e?.message || "Could not load time slots");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg: string) => {
    setOk(msg);
    setTimeout(() => setOk(""), 3000);
  };

  const startAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: String((slots.length + 1) * 10) });
    setShowForm(true);
  };
  const startEdit = (s: TimeSlotRow) => {
    setEditingId(s._id);
    setForm({
      label: s.label,
      startTime: s.startTime,
      endTime: s.endTime,
      maxBookings: String(s.maxBookings ?? 100),
      surgeMultiplier: String(s.surgeMultiplier ?? 1),
      sortOrder: String(s.sortOrder ?? 0),
    });
    setShowForm(true);
  };

  const save = async () => {
    setError("");
    if (!form.label.trim()) return setError("Give the slot a label, e.g. \"9 AM – 11 AM\".");
    if (!/^\d{2}:\d{2}$/.test(form.startTime) || !/^\d{2}:\d{2}$/.test(form.endTime)) return setError("Times must be HH:MM.");
    if (form.startTime >= form.endTime) return setError("End time must be after start time.");
    const payload = {
      label: form.label.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      maxBookings: Math.max(1, Number(form.maxBookings) || 100),
      surgeMultiplier: Math.max(1, Number(form.surgeMultiplier) || 1),
      sortOrder: Number(form.sortOrder) || 0,
    };
    setBusy("form");
    try {
      if (editingId) await masterDataApi.updateTimeSlot(editingId, payload);
      else await masterDataApi.createTimeSlot(payload);
      setShowForm(false);
      flash(editingId ? "Slot updated" : "Slot added");
      await load();
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const toggle = async (s: TimeSlotRow) => {
    setBusy(s._id);
    try {
      await masterDataApi.updateTimeSlot(s._id, { isActive: !s.isActive });
      await load();
    } catch (e: any) {
      setError(e?.message || "Update failed");
    } finally {
      setBusy(null);
    }
  };

  const remove = async (s: TimeSlotRow) => {
    if (!window.confirm(`Delete slot "${s.label}"? Existing scheduled bookings keep their time.`)) return;
    setBusy(s._id);
    try {
      await masterDataApi.deleteTimeSlot(s._id);
      flash("Slot deleted");
      await load();
    } catch (e: any) {
      setError(e?.message || "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const saveConfig = async () => {
    setBusy("config");
    setError("");
    try {
      await masterDataApi.updateScheduleConfig({
        advanceBookingDays: Math.min(30, Math.max(1, Number(config.advanceBookingDays) || 7)),
        minAdvanceHours: Math.max(1, Number(config.minAdvanceHours) || 2),
        isSchedulingEnabled: !!config.isSchedulingEnabled,
      });
      flash("Scheduling rules saved");
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setBusy(null);
    }
  };

  const input = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-movezy-500 focus:border-movezy-500 text-sm";

  return (
    <div className="space-y-6">
      {error && <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">{error}</div>}
      {ok && <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700">{ok}</div>}

      {/* Rules */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-movezy-500" /> Scheduling rules
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">How far ahead customers may schedule, and the minimum notice.</p>
          </div>
          <button onClick={saveConfig} disabled={busy !== null || loading} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-movezy-500 hover:bg-movezy-600 rounded-lg disabled:opacity-50">
            <Save className="w-4 h-4" /> {busy === "config" ? "Saving…" : "Save rules"}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm text-gray-700">
            Days in advance
            <input type="number" min={1} max={30} value={config.advanceBookingDays} onChange={(e) => setConfig({ ...config, advanceBookingDays: Number(e.target.value) })} className={`mt-1 ${input}`} />
          </label>
          <label className="text-sm text-gray-700">
            Minimum notice (hours)
            <input type="number" min={1} value={config.minAdvanceHours} onChange={(e) => setConfig({ ...config, minAdvanceHours: Number(e.target.value) })} className={`mt-1 ${input}`} />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
            <input type="checkbox" checked={config.isSchedulingEnabled} onChange={(e) => setConfig({ ...config, isSchedulingEnabled: e.target.checked })} />
            Scheduling enabled
          </label>
        </div>
      </div>

      {/* Slots */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Time slots</h3>
            <p className="text-xs text-gray-500">Shown to customers as chips; inactive slots are hidden but kept.</p>
          </div>
          <button onClick={startAdd} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-movezy-500 hover:bg-movezy-600 rounded-lg">
            <Plus className="w-4 h-4" /> Add slot
          </button>
        </div>

        {showForm && (
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <label className="text-xs text-gray-600 md:col-span-2">
                Label
                <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="9 AM – 11 AM" className={`mt-1 ${input}`} />
              </label>
              <label className="text-xs text-gray-600">
                Start
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className={`mt-1 ${input}`} />
              </label>
              <label className="text-xs text-gray-600">
                End
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className={`mt-1 ${input}`} />
              </label>
              <label className="text-xs text-gray-600">
                Max bookings
                <input type="number" min={1} value={form.maxBookings} onChange={(e) => setForm({ ...form, maxBookings: e.target.value })} className={`mt-1 ${input}`} />
              </label>
              <label className="text-xs text-gray-600">
                Sort order
                <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className={`mt-1 ${input}`} />
              </label>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={save} disabled={busy === "form"} className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-movezy-500 hover:bg-movezy-600 rounded-lg disabled:opacity-50">
                <Save className="w-4 h-4" /> {busy === "form" ? "Saving…" : editingId ? "Update slot" : "Add slot"}
              </button>
              <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-white">
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        )}

        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Label</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Window</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Max bookings</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Sort</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Status</th>
              <th className="px-5 py-3 text-xs font-semibold tracking-wider text-right text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
            ) : slots.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">No time slots yet — customers can only book "pick up now".</td></tr>
            ) : (
              slots.map((s) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-800">{s.label}</td>
                  <td className="px-5 py-3 text-sm text-gray-600 font-mono">{s.startTime} – {s.endTime}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{s.maxBookings}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{s.sortOrder}</td>
                  <td className="px-5 py-3">
                    <button onClick={() => toggle(s)} disabled={busy === s._id}>
                      {s.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full"><ToggleRight className="w-3 h-3" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full"><ToggleLeft className="w-3 h-3" /> Inactive</span>
                      )}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => remove(s)} disabled={busy === s._id} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeSlotsPanel;
