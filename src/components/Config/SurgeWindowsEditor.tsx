import React from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import CityMultiSelect from "./CityMultiSelect";
import type { SurgeWindow } from "../../services/api";

/**
 * Multi-row surge editor: each row is a labelled hour window with its own
 * multiplier ("Morning 8–10 AM ×1.5", "Evening 6–8 PM ×1.8") and, optionally,
 * the cities it applies to (none = everywhere) — Mumbai's peak need not be
 * Nagpur's. Windows may cross midnight (22 → 5). When several windows cover
 * the same hour the highest multiplier applies — they never compound.
 */
interface Props {
  value: SurgeWindow[];
  onChange: (rows: SurgeWindow[]) => void;
  placeholderLabel?: string;
  minMultiplier?: number;
  maxMultiplier?: number;
}

const hourLabel = (h: number) => {
  const n = ((h % 24) + 24) % 24;
  const suffix = n < 12 ? "AM" : "PM";
  const display = n % 12 === 0 ? 12 : n % 12;
  return `${display} ${suffix}`;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const SurgeWindowsEditor: React.FC<Props> = ({
  value,
  onChange,
  placeholderLabel = "e.g. Morning",
  minMultiplier = 1,
  maxMultiplier = 5,
}) => {
  const update = (i: number, patch: Partial<SurgeWindow>) =>
    onChange(value.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () =>
    onChange([...value, { label: "", startHour: 8, endHour: 10, multiplier: 1.5, cities: [] }]);

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="text-xs text-gray-400">No windows — normal pricing all day.</p>
      )}
      {value.map((w, i) => {
        const wraps = w.endHour <= w.startHour;
        return (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
            <div className="grid grid-cols-12 gap-2 items-end">
              <label className="col-span-4 text-xs text-gray-500">
                Label
                <input
                  type="text"
                  value={w.label}
                  placeholder={placeholderLabel}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </label>
              <label className="col-span-2 text-xs text-gray-500">
                From
                <select
                  value={w.startHour}
                  onChange={(e) => update(i, { startHour: Number(e.target.value) })}
                  className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-xs text-gray-500">
                To
                <select
                  value={w.endHour}
                  onChange={(e) => update(i, { endHour: Number(e.target.value) })}
                  className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>
                      {hourLabel(h)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-3 text-xs text-gray-500">
                Multiplier
                <input
                  type="number"
                  step="0.05"
                  min={minMultiplier}
                  max={maxMultiplier}
                  value={w.multiplier}
                  onChange={(e) =>
                    update(i, { multiplier: e.target.value === "" ? ("" as unknown as number) : Number(e.target.value) })
                  }
                  className="block w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                />
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                className="col-span-1 p-2 mb-0.5 text-red-500 rounded-lg hover:bg-red-50"
                title="Remove window"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400 mt-1.5" />
              <div className="flex-1">
                <CityMultiSelect
                  value={w.cities || []}
                  onChange={(cities) => update(i, { cities })}
                  emptyLabel="All cities"
                  chipClassName="bg-gray-200 text-gray-700"
                />
              </div>
            </div>
            {wraps && (
              <p className="text-[11px] text-gray-400">
                Runs overnight: {hourLabel(w.startHour)} → {hourLabel(w.endHour)} next day.
              </p>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
      >
        <Plus className="w-4 h-4" /> Add window
      </button>
    </div>
  );
};

export default SurgeWindowsEditor;
