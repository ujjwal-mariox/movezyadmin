import React, { useEffect, useState } from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { masterDataApi } from "../../services/admin-api";

/**
 * City rate cards for one vehicle type.
 *
 * Each row names one or more cities and the fields it overrides. A blank
 * field falls through to the vehicle type's Default rate, so "Mumbai: per-km
 * 18" only changes the per-km rate there. Cities are matched against the
 * pickup address city, so a row for "Pune" also covers "Pune City" /
 * "Pimpri-Chinchwad, Pune". Bookings from cities with no row use Default.
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
  const [knownCities, setKnownCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState<Record<number, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await masterDataApi.getCities({ limit: 200, activeOnly: "true" });
        const raw = res?.data?.cities || res?.data?.items || res?.data?.data || res?.data || [];
        const names = (Array.isArray(raw) ? raw : [])
          .map((c: any) => (typeof c === "string" ? c : c?.name))
          .filter(Boolean);
        setKnownCities(Array.from(new Set(names)).sort());
      } catch {
        // Datalist is a convenience only; free text still works.
      }
    })();
  }, []);

  const update = (i: number, patch: Partial<CityOverride>) =>
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));
  const add = () => onChange([...value, { cities: [], isActive: true }]);

  const addCity = (i: number) => {
    const name = (cityInput[i] || "").trim();
    if (!name) return;
    const row = value[i];
    if (row.cities.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setCityInput({ ...cityInput, [i]: "" });
      return;
    }
    update(i, { cities: [...row.cities, name] });
    setCityInput({ ...cityInput, [i]: "" });
  };

  const removeCity = (i: number, name: string) =>
    update(i, { cities: value[i].cities.filter((c) => c !== name) });

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> City rate cards
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            The fields above are the <strong>Default</strong> rates. Add a card to charge
            differently in specific cities; blank fields on a card inherit Default.
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

      <datalist id="city-rate-card-cities">
        {knownCities.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {value.map((row, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 flex-1">
              {row.cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full"
                >
                  {c}
                  <button
                    type="button"
                    onClick={() => removeCity(i, c)}
                    className="text-blue-500 hover:text-blue-800"
                    aria-label={`Remove ${c}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                list="city-rate-card-cities"
                value={cityInput[i] || ""}
                onChange={(e) => setCityInput({ ...cityInput, [i]: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addCity(i);
                  }
                }}
                onBlur={() => addCity(i)}
                placeholder={row.cities.length ? "Add another city" : "City name (Enter to add)"}
                className="px-2 py-1 text-sm border border-gray-200 rounded-lg min-w-[180px]"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
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
