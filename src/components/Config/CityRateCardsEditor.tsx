import React from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import CityMultiSelect from "./CityMultiSelect";

/**
 * City rate cards for one vehicle type.
 *
 * Each row names one or more cities (picked from System Configuration →
 * Cities, never typed) and the fields it overrides. A blank field falls
 * through to the vehicle type's Default rate, so "Mumbai: per-km 18" only
 * changes the per-km rate there. The server maps whatever the phone reports
 * for a pickup onto the same master names, so a card for "Mumbai" also covers
 * a pickup the map calls "Mumbai Suburban" — and any alias the admin adds to
 * the city. Bookings from cities with no card use Default.
 */
export interface CityOverride {
  cities: string[];
  baseFare?: number | null;
  perKmRate?: number | null;
  perMinuteRate?: number | null;
  minimumFare?: number | null;
  freeWaitingMinutes?: number | null;
  commissionPercent?: number | null;
  isActive?: boolean;
}

type NumKey = Exclude<keyof CityOverride, "cities" | "isActive">;

const FIELDS: { key: NumKey; label: string; suffix: string; step?: string }[] = [
  { key: "baseFare", label: "Base fare", suffix: "₹" },
  { key: "perKmRate", label: "Per km", suffix: "₹/km" },
  { key: "perMinuteRate", label: "Per minute", suffix: "₹/min" },
  { key: "minimumFare", label: "Minimum fare", suffix: "₹" },
  { key: "freeWaitingMinutes", label: "Free waiting", suffix: "min" },
  { key: "commissionPercent", label: "Commission", suffix: "%", step: "0.5" },
];

interface Props {
  value: CityOverride[];
  onChange: (rows: CityOverride[]) => void;
}

const CityRateCardsEditor: React.FC<Props> = ({ value, onChange }) => {
  const update = (i: number, patch: Partial<CityOverride>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { cities: [], isActive: true }]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> City rate cards
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            The fields above are the <strong>Default</strong> rates. Add a card to charge
            differently in specific cities; blank fields on a card inherit Default. Cities come
            from System Configuration → Cities.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Add city card
        </button>
      </div>

      {value.map((row, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CityMultiSelect
                value={row.cities}
                onChange={(cities) => update(i, { cities })}
                emptyLabel="Pick at least one city"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
              <input
                type="checkbox"
                checked={row.isActive !== false}
                onChange={(e) => update(i, { isActive: e.target.checked })}
              />
              Active
            </label>
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1.5 text-red-500 rounded-lg hover:bg-red-50"
              title="Remove card"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {row.cities.length === 0 && (
            <p className="text-xs text-amber-600">Add at least one city or this card is ignored.</p>
          )}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="text-[11px] text-gray-500">
                {f.label} <span className="text-gray-400">({f.suffix})</span>
                <input
                  type="number"
                  min="0"
                  step={f.step || "1"}
                  value={row[f.key] ?? ""}
                  placeholder="Default"
                  onChange={(e) =>
                    update(i, { [f.key]: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="block w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CityRateCardsEditor;
