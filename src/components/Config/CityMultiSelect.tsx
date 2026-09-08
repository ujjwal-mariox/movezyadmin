import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { masterDataApi } from "../../services/admin-api";

/**
 * Pick cities from the city master (System Configuration → Cities) — no free
 * text. Every place the admin names a city (rate cards, weather surges) uses
 * this, so the names always agree with the master, and the server maps what
 * the phone's geocoder reports onto the same names via the master's aliases.
 *
 * Values saved before this existed that are not in the master are still
 * shown, flagged, so nothing silently disappears.
 */
export interface MasterCity {
  _id: string;
  name: string;
  state: string;
  aliases?: string[];
  isActive?: boolean;
}

let masterCache: { rows: MasterCity[]; at: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export const loadMasterCities = async (force = false): Promise<MasterCity[]> => {
  if (!force && masterCache && Date.now() - masterCache.at < CACHE_MS) return masterCache.rows;
  const res = await masterDataApi.getCities({ limit: 500, activeOnly: "true" });
  const raw = res?.data?.cities || [];
  const rows: MasterCity[] = (Array.isArray(raw) ? raw : []).map((c: any) => ({
    _id: String(c._id),
    name: String(c.name || ""),
    state: String(c.state || ""),
    aliases: Array.isArray(c.aliases) ? c.aliases : [],
    isActive: c.isActive !== false,
  }));
  masterCache = { rows, at: Date.now() };
  return rows;
};

interface Props {
  value: string[];
  onChange: (cities: string[]) => void;
  /** Text shown when nothing is selected (e.g. "All cities"). */
  emptyLabel?: string;
  chipClassName?: string;
}

const CityMultiSelect: React.FC<Props> = ({ value, onChange, emptyLabel = "No city selected", chipClassName }) => {
  const [cities, setCities] = useState<MasterCity[]>(masterCache?.rows || []);
  const [loading, setLoading] = useState(!masterCache);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await loadMasterCities();
        if (alive) setCities(rows);
      } catch (e: any) {
        if (alive) setError(e?.message || "Could not load the city list");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const known = new Set(cities.map((c) => c.name.toLowerCase()));
  const remaining = cities.filter((c) => !value.some((v) => v.toLowerCase() === c.name.toLowerCase()));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.length === 0 && <span className="text-xs text-gray-500">{emptyLabel}</span>}
      {value.map((name) => {
        const inMaster = known.has(name.toLowerCase());
        return (
          <span
            key={name}
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
              inMaster ? chipClassName || "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-800"
            }`}
            title={inMaster ? undefined : "Not in System Configuration → Cities; add it there or remove it here"}
          >
            {!inMaster && <AlertTriangle className="w-3 h-3" />}
            {name}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== name))}
              className="opacity-70 hover:opacity-100"
              aria-label={`Remove ${name}`}
            >
              ×
            </button>
          </span>
        );
      })}
      <select
        value=""
        onChange={(e) => {
          const name = e.target.value;
          if (name) onChange([...value, name]);
        }}
        disabled={loading || remaining.length === 0}
        className="px-2 py-1 text-sm border border-gray-200 rounded-lg bg-white min-w-[170px] disabled:bg-gray-50"
      >
        <option value="">
          {loading ? "Loading cities…" : remaining.length === 0 ? (cities.length === 0 ? "No cities in master" : "All cities added") : "Add city…"}
        </option>
        {remaining.map((c) => (
          <option key={c._id} value={c.name}>
            {c.name}
            {c.state ? ` (${c.state})` : ""}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
};

export default CityMultiSelect;
