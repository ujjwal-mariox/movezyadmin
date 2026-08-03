// src/pages/CommissionManagement.tsx
//
// Commission & Charges — edits the LIVE FareConfig document that pricing and
// driver settlement actually read (fare.service.ts / completeTrip). The old
// page was a hardcoded mock: dummy rules, a submit handler that closed the
// modal without saving, and no route pointing at it.
import React, { useEffect, useState } from "react";
import {
  Percent,
  Clock,
  Moon,
  CloudRain,
  TrendingUp,
  Save,
  RefreshCw,
  AlertTriangle,
  IndianRupee,
  Undo2,
} from "lucide-react";
import { fetchFareConfig, updateFareConfig } from "../services/api";
import type { FareConfigItem } from "../services/api";

type Draft = Partial<FareConfigItem>;

type Rail = {
  key: keyof FareConfigItem;
  label: string;
  min: number;
  max?: number;
};

// Every numeric field this page writes, with the rails that must hold.
// The FareConfig schema declares its own min/max, but the update runs through
// findOneAndUpdate, and Mongoose skips update validators unless runValidators
// is passed — so until that lands server-side these are the ONLY rails on
// numbers that drive live settlements and fare quotes.
const RAILS: Rail[] = [
  { key: "driverCommissionPercent", label: "Driver commission", min: 0, max: 50 },
  { key: "gstPercentage", label: "GST", min: 0, max: 28 },
  { key: "insuranceFee", label: "Insurance fee", min: 0 },
  { key: "minimumFare", label: "Minimum fare", min: 0 },
  { key: "waitingChargePerMin", label: "Waiting charge", min: 0 },
  { key: "freeWaitingMinutes", label: "Free waiting", min: 0 },
  { key: "nightSurgeMultiplier", label: "Night surge multiplier", min: 1 },
  { key: "nightSurgeStartHour", label: "Night surge start hour", min: 0, max: 23 },
  { key: "nightSurgeEndHour", label: "Night surge end hour", min: 0, max: 23 },
  { key: "rainSurgeMultiplier", label: "Rain surge multiplier", min: 1 },
  { key: "peakHourSurgeMultiplier", label: "Peak hour multiplier", min: 1 },
  { key: "peakHourStart", label: "Peak hour start", min: 0, max: 23 },
  { key: "peakHourEnd", label: "Peak hour end", min: 0, max: 23 },
  { key: "refundBeforeAssignPercent", label: "Refund before assignment", min: 0, max: 100 },
  { key: "refundAfterAssignPercent", label: "Refund after assignment", min: 0, max: 100 },
  { key: "refundAfterPickupPercent", label: "Refund after pickup", min: 0, max: 100 },
];

const railFor = (key: keyof FareConfigItem) => RAILS.find((r) => r.key === key);

const CommissionManagement: React.FC = () => {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchFareConfig();
      const cfg = res?.data?.config;
      if (!cfg) throw new Error("No fare configuration returned");
      setDraft(cfg);
    } catch (e: any) {
      setError(e?.message || "Could not load fare configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key: keyof FareConfigItem, value: string) =>
    setDraft((d) => ({ ...(d || {}), [key]: value === "" ? "" : Number(value) }));

  const save = async () => {
    if (!draft) return;

    const payload: Record<string, number> = {};
    const blank: string[] = [];
    const invalid: string[] = [];

    for (const rail of RAILS) {
      const raw = draft[rail.key];
      // A cleared input holds "" — and Number("") is 0, which is finite, so the
      // old `num()` fallback never fired and 0 was submitted. Saving 0 driver
      // commission means the driver keeps the whole pre-GST subtotal on every
      // trip completed afterwards, so a blank field must never become a number.
      if (raw === "" || raw === null || raw === undefined) {
        blank.push(rail.label);
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        invalid.push(`${rail.label} is not a number`);
        continue;
      }
      if (n < rail.min || (rail.max !== undefined && n > rail.max)) {
        invalid.push(
          rail.max === undefined
            ? `${rail.label} must be at least ${rail.min}`
            : `${rail.label} must be between ${rail.min} and ${rail.max}`,
        );
        continue;
      }
      payload[rail.key] = n;
    }

    if (blank.length) {
      setError(
        `Nothing was saved. These fields are empty: ${blank.join(", ")}. ` +
          "Enter a value, or press Reload to restore the value currently in use.",
      );
      return;
    }
    if (invalid.length) {
      setError(`Nothing was saved. ${invalid.join(". ")}.`);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await updateFareConfig(payload as Partial<FareConfigItem>);
      const cfg = res?.data?.config;
      if (cfg) setDraft(cfg);
      setSavedAt(new Date());
    } catch (e: any) {
      setError(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const field = (
    label: string,
    key: keyof FareConfigItem,
    opts?: { suffix?: string; hint?: string; step?: string },
  ) => {
    // min/max come from the same table `save()` enforces, so the input's own
    // spinner cannot offer a value the save would reject (a negative waiting
    // charge used to be accepted and made waiting time REDUCE the fare).
    const rail = railFor(key);
    return (
      <label className="block">
        <span className="text-sm text-gray-600">{label}</span>
        <div className="mt-1 relative">
          <input
            type="number"
            step={opts?.step || "any"}
            min={rail?.min}
            max={rail?.max}
            value={(draft?.[key] as number | string) ?? ""}
            onChange={(e) => set(key, e.target.value)}
            className="w-full border rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {opts?.suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              {opts.suffix}
            </span>
          )}
        </div>
        {opts?.hint && <p className="text-xs text-gray-400 mt-1">{opts.hint}</p>}
      </label>
    );
  };

  const card = (
    title: string,
    Icon: React.ElementType,
    tint: string,
    children: React.ReactNode,
  ) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${tint}`} /> {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Commission & Charges
          </h1>
          <p className="text-sm text-gray-500">
            The live fare configuration — pricing, GST, commission, surge and
            cancellation refund ceilings all read from here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-xs text-emerald-600">
              Saved {savedAt.toLocaleTimeString("en-IN")}
            </span>
          )}
          <button
            onClick={load}
            className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Reload
          </button>
          <button
            onClick={save}
            disabled={saving || loading || !draft}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          These values apply platform-wide the moment they are saved. Commission
          affects every settlement from the next completed trip; GST and surge
          affect every new fare quote; the refund ceilings affect every
          cancellation. Per-vehicle base/km/min rates live in <b>Vehicles</b>.
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-400 py-10 text-center">Loading configuration…</p>
      ) : !draft ? null : (
        <div className="space-y-4">
          {card(
            "Commission & Tax",
            Percent,
            "text-blue-500",
            <>
              {field("Driver commission", "driverCommissionPercent", {
                suffix: "%",
                hint: "Charged on the pre-GST subtotal at trip completion; the driver keeps the rest.",
              })}
              {field("GST", "gstPercentage", {
                suffix: "%",
                hint: "Added to every customer fare quote.",
              })}
            </>,
          )}

          {/* Cancellation refund ceilings. These live on the same FareConfig
              document as everything else on this page and decide what every
              cancelled booking refunds (booking.controller.ts
              refundCeilingForStage), but no screen in the admin could see or
              change them — the policy sat frozen at the DB defaults. */}
          {card(
            "Cancellation refund ceilings",
            Undo2,
            "text-amber-500",
            <>
              {field("Before a driver is assigned", "refundBeforeAssignPercent", {
                suffix: "%",
                hint: "Booking still DRAFT or SEARCHING.",
              })}
              {field("After assignment, before pickup", "refundAfterAssignPercent", {
                suffix: "%",
                hint: "Driver committed or already at pickup.",
              })}
              {field("After pickup", "refundAfterPickupPercent", {
                suffix: "%",
                hint: "Goods already aboard (PICKED / IN_PROGRESS).",
              })}
              <div className="text-xs text-gray-400 self-center">
                Percentage of the fare paid. The customer's cancellation reason can only
                reduce the refund below the ceiling, never raise it — and the figure the
                app previews before confirming comes from these same three numbers.
              </div>
            </>,
          )}

          {card(
            "Base Charges",
            IndianRupee,
            "text-emerald-500",
            <>
              {field("Minimum fare", "minimumFare", { suffix: "₹" })}
              {field("Insurance fee (fixed)", "insuranceFee", {
                suffix: "₹",
                hint: "Percentage-priced insurance add-ons are configured in Add-on Services.",
              })}
            </>,
          )}

          {card(
            "Waiting",
            Clock,
            "text-orange-500",
            <>
              {field("Free waiting", "freeWaitingMinutes", {
                suffix: "min",
                hint: "Also shown to customers on the review screen — quoted and billed from the same value.",
              })}
              {field("Waiting charge", "waitingChargePerMin", { suffix: "₹/min" })}
            </>,
          )}

          {card(
            "Night Surge",
            Moon,
            "text-indigo-500",
            <>
              {field("Multiplier", "nightSurgeMultiplier", {
                suffix: "×",
                hint: "1 = off",
              })}
              <div className="grid grid-cols-2 gap-3">
                {field("From hour", "nightSurgeStartHour", { suffix: "0–23" })}
                {field("To hour", "nightSurgeEndHour", { suffix: "0–23" })}
              </div>
            </>,
          )}

          {card(
            "Peak Hours",
            TrendingUp,
            "text-rose-500",
            <>
              {field("Multiplier", "peakHourSurgeMultiplier", {
                suffix: "×",
                hint: "Also defines the window for the driver Peak Performer badge.",
              })}
              <div className="grid grid-cols-2 gap-3">
                {field("From hour", "peakHourStart", { suffix: "0–23" })}
                {field("To hour", "peakHourEnd", { suffix: "0–23" })}
              </div>
            </>,
          )}

          {card(
            "Weather",
            CloudRain,
            "text-cyan-600",
            <>
              {field("Rain surge multiplier", "rainSurgeMultiplier", {
                suffix: "×",
                hint: "Applied manually/by automation when rain mode is on; 1 = off.",
              })}
              <div />
            </>,
          )}
        </div>
      )}
    </div>
  );
};

export default CommissionManagement;
