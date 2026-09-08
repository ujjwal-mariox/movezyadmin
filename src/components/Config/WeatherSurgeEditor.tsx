import React, { useState } from "react";
import { Plus, Trash2, CloudRain, Power } from "lucide-react";
import CityMultiSelect from "./CityMultiSelect";
import type { WeatherSurge } from "../../services/api";

/**
 * Weather surge — switched ON by an admin when it rains, per region.
 *
 * Each row is a named surge ("Rain — Mumbai") with the cities it applies to
 * (picked from the city master; none = everywhere), a multiplier, an ON/OFF
 * switch and an optional auto-off time so a surge cannot be forgotten. While
 * ON it applies to every new quote whose pickup city matches; where it
 * overlaps a peak or night window the higher multiplier applies — they never
 * compound.
 */
interface Props {
  value: WeatherSurge[];
  onChange: (rows: WeatherSurge[]) => void;
}

const AUTO_OFF_OPTIONS: { label: string; hours: number | null }[] = [
  { label: "Until switched off", hours: null },
  { label: "1 hour", hours: 1 },
  { label: "3 hours", hours: 3 },
  { label: "6 hours", hours: 6 },
  { label: "12 hours", hours: 12 },
  { label: "24 hours", hours: 24 },
];

const fmtUntil = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
};

export const weatherRowIsLive = (w: WeatherSurge, now = Date.now()): boolean =>
  !!w.isActive && (!w.activeUntil || new Date(w.activeUntil).getTime() > now);

const WeatherSurgeEditor: React.FC<Props> = ({ value, onChange }) => {
  const [autoOff, setAutoOff] = useState<Record<number, number | null>>({});

  const update = (i: number, patch: Partial<WeatherSurge>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...value, { label: "", cities: [], multiplier: 1.3, isActive: false, activeUntil: null }]);

  const toggle = (i: number) => {
    const row = value[i];
    if (weatherRowIsLive(row)) {
      update(i, { isActive: false, activeUntil: null });
      return;
    }
    const hours = autoOff[i] ?? null;
    update(i, {
      isActive: true,
      activeUntil: hours ? new Date(Date.now() + hours * 3600 * 1000).toISOString() : null,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-gray-400">
          Switch a surge ON when the weather turns; pick the cities it covers from the city master
          (none = all cities) and how long it stays on. Applies to new quotes only, never to trips
          already booked.
        </p>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add surge
        </button>
      </div>

      {value.length === 0 && <p className="text-xs text-gray-400">No weather surges configured.</p>}

      {value.map((row, i) => {
        const live = weatherRowIsLive(row);
        const until = fmtUntil(row.activeUntil);
        const expired = !!row.isActive && !live;
        return (
          <div
            key={i}
            className={`rounded-lg border p-3 space-y-3 ${live ? "border-cyan-300 bg-cyan-50/40" : "border-gray-200 bg-gray-50"}`}
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-500 flex-1 min-w-[160px]">
                Name
                <input
                  type="text"
                  value={row.label}
                  placeholder="e.g. Rain — Mumbai"
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </label>
              <label className="text-xs text-gray-500 w-28">
                Multiplier
                <input
                  type="number"
                  step="0.05"
                  min={1}
                  max={5}
                  value={row.multiplier}
                  onChange={(e) => update(i, { multiplier: e.target.value === "" ? ("" as unknown as number) : Number(e.target.value) })}
                  className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </label>
              <label className="text-xs text-gray-500 w-44">
                Auto-off
                <select
                  value={autoOff[i] === undefined ? "" : String(autoOff[i] ?? "")}
                  onChange={(e) => setAutoOff({ ...autoOff, [i]: e.target.value === "" ? null : Number(e.target.value) })}
                  disabled={live}
                  className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white disabled:bg-gray-100"
                >
                  {AUTO_OFF_OPTIONS.map((o) => (
                    <option key={o.label} value={o.hours === null ? "" : o.hours}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => toggle(i)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold ${
                  live ? "bg-cyan-600 text-white hover:bg-cyan-700" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
                title={live ? "Switch this surge off" : "Switch this surge on"}
              >
                <Power className="w-4 h-4" /> {live ? "ON" : "OFF"}
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-2 text-red-500 rounded-lg hover:bg-red-50"
                title="Remove"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start gap-2">
              <CloudRain className="w-3.5 h-3.5 text-cyan-600 mt-1.5" />
              <div className="flex-1">
                <CityMultiSelect
                  value={row.cities}
                  onChange={(cities) => update(i, { cities })}
                  emptyLabel="All cities"
                  chipClassName="bg-cyan-100 text-cyan-800"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              {live
                ? until
                  ? `Active — switches off automatically at ${until} (save to apply).`
                  : "Active until switched off (save to apply)."
                : expired
                  ? `Ended at ${until} — switch ON again when needed.`
                  : "Off."}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default WeatherSurgeEditor;
