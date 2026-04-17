import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Bike,
  ClipboardList,
  Trophy,
  Star,
  Package,
  PieChart as PieIcon,
  Activity,
  Filter,
  Download,
  FileText,
  Calendar,
  MapPin,
  Sparkles,
  Settings as SettingsIcon,
  LineChart as LineIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  fetchCitiesReport,
  fetchCategoriesReport,
  fetchEnterprisesReport,
  fetchOpsMetrics,
  fetchSnapshot,
  fetchDriverReports,
  type ReportRange,
  type ReportCityRow,
  type ReportCategoryRow,
  type ReportEnterpriseRow,
  type ReportOpsMetrics,
  type ReportSnapshot,
} from "../services/api";

type MetricKey =
  | "revenue"
  | "orders"
  | "drivers"
  | "customers"
  | "avgRating"
  | "cancelRate";
type Granularity = "DAY" | "WEEK" | "MONTH";
type Range = ReportRange;

const metricMeta: Record<MetricKey, { label: string; unit: string; tone: string; hex: string }> = {
  revenue: { label: "Revenue", unit: "₹", tone: "text-emerald-600", hex: "#10b981" },
  orders: { label: "Orders", unit: "", tone: "text-blue-600", hex: "#3b82f6" },
  drivers: { label: "New Drivers", unit: "", tone: "text-purple-600", hex: "#8b5cf6" },
  customers: { label: "New Customers", unit: "", tone: "text-amber-600", hex: "#f59e0b" },
  avgRating: { label: "Avg Rating", unit: "★", tone: "text-yellow-600", hex: "#eab308" },
  cancelRate: { label: "Cancel Rate", unit: "%", tone: "text-red-600", hex: "#ef4444" },
};

const CITY_TONES = [
  { bar: "bg-blue-500", hex: "#3b82f6" },
  { bar: "bg-emerald-500", hex: "#10b981" },
  { bar: "bg-purple-500", hex: "#8b5cf6" },
  { bar: "bg-amber-500", hex: "#f59e0b" },
  { bar: "bg-red-500", hex: "#ef4444" },
  { bar: "bg-cyan-500", hex: "#06b6d4" },
  { bar: "bg-pink-500", hex: "#ec4899" },
  { bar: "bg-indigo-500", hex: "#6366f1" },
  { bar: "bg-teal-500", hex: "#14b8a6" },
  { bar: "bg-orange-500", hex: "#f97316" },
];

const CATEGORY_TONES = [
  { bar: "bg-blue-500", hex: "#3b82f6" },
  { bar: "bg-emerald-500", hex: "#10b981" },
  { bar: "bg-purple-500", hex: "#8b5cf6" },
  { bar: "bg-amber-500", hex: "#f59e0b" },
  { bar: "bg-gray-400", hex: "#9ca3af" },
  { bar: "bg-pink-500", hex: "#ec4899" },
];

const reportTemplates = [
  { key: "daily_ops", label: "Daily Ops Digest", desc: "Orders, drivers, SLA, cancellations" },
  { key: "weekly_fin", label: "Weekly Finance", desc: "Revenue, payouts, refunds, wallet" },
  { key: "driver_perf", label: "Driver Performance", desc: "Trips, rating, earnings, badges" },
  { key: "enterprise", label: "Enterprise Scorecard", desc: "Per-account volume & revenue" },
  { key: "compliance", label: "Compliance Audit", desc: "Docs, expiries, violations" },
];

const formatNum = (n: number) =>
  n >= 10000000
    ? `${(n / 10000000).toFixed(1)}Cr`
    : n >= 100000
      ? `${(n / 100000).toFixed(1)}L`
      : n >= 1000
        ? `${(n / 1000).toFixed(1)}k`
        : String(Math.round(n));

const formatINR = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)}Cr`
    : n >= 100000
      ? `₹${(n / 100000).toFixed(2)}L`
      : n >= 1000
        ? `₹${(n / 1000).toFixed(1)}k`
        : `₹${Math.round(n)}`;

const Sparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  if (!values.length) return null;
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1 || 1);
  const pts = values
    .map((v, i) => `${(i * step).toFixed(1)},${(h - ((v - min) / range) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" strokeWidth="2" stroke={color} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const TrendChart: React.FC<{
  labels: string[];
  primary: number[];
  primaryHex: string;
  secondary?: number[];
  secondaryHex?: string;
}> = ({ labels, primary, primaryHex, secondary, secondaryHex }) => {
  const w = 720;
  const h = 220;
  const padL = 36;
  const padB = 28;
  const padT = 16;
  const innerW = w - padL - 8;
  const innerH = h - padT - padB;
  if (primary.length === 0) {
    return (
      <div className="flex items-center justify-center h-56 text-sm text-gray-400">
        No data for selected range
      </div>
    );
  }
  const allVals = [...primary, ...(secondary || [])];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const step = innerW / (primary.length - 1 || 1);
  const toPts = (vals: number[]) =>
    vals
      .map((v, i) => `${(padL + i * step).toFixed(1)},${(padT + innerH - ((v - min) / range) * innerH).toFixed(1)}`)
      .join(" ");

  const gridY = [0, 0.25, 0.5, 0.75, 1];
  const maxLabels = 10;
  const labelStep = Math.max(1, Math.ceil(labels.length / maxLabels));

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
      {gridY.map((g) => (
        <line
          key={g}
          x1={padL}
          x2={w - 8}
          y1={padT + innerH * g}
          y2={padT + innerH * g}
          className="stroke-gray-100"
          strokeWidth="1"
        />
      ))}
      {labels.map((l, i) =>
        i % labelStep === 0 ? (
          <text
            key={l + i}
            x={padL + i * step}
            y={h - 8}
            textAnchor="middle"
            className="fill-gray-400 text-[10px]"
          >
            {l}
          </text>
        ) : null,
      )}
      {secondary && secondaryHex && (
        <polyline
          points={toPts(secondary)}
          fill="none"
          strokeWidth="2"
          strokeDasharray="4 4"
          stroke={secondaryHex}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      <polyline
        points={toPts(primary)}
        fill="none"
        strokeWidth="2.5"
        stroke={primaryHex}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface TopDriverRow {
  _id: string;
  driver?: { fullName?: string; name?: string };
  tripCount: number;
  totalEarnings: number;
  avgRating?: number;
}

const ReportsPage: React.FC = () => {
  const [range, setRange] = useState<Range>("7D");
  const [granularity, setGranularity] = useState<Granularity>("DAY");
  const [primaryMetric, setPrimaryMetric] = useState<MetricKey>("revenue");
  const [compareMetric, setCompareMetric] = useState<MetricKey | "">("orders");

  const [builderTemplate, setBuilderTemplate] = useState("daily_ops");
  const [builderRange, setBuilderRange] = useState<Range>("7D");
  const [builderMetrics, setBuilderMetrics] = useState<MetricKey[]>(["revenue", "orders", "drivers"]);

  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<ReportSnapshot | null>(null);
  const [builderSnapshot, setBuilderSnapshot] = useState<ReportSnapshot | null>(null);
  const [cities, setCities] = useState<ReportCityRow[]>([]);
  const [categories, setCategories] = useState<ReportCategoryRow[]>([]);
  const [enterprises, setEnterprises] = useState<ReportEnterpriseRow[]>([]);
  const [ops, setOps] = useState<ReportOpsMetrics | null>(null);
  const [topDrivers, setTopDrivers] = useState<TopDriverRow[]>([]);

  const loadRange = useCallback(async () => {
    setLoading(true);
    try {
      const [snapRes, cityRes, catRes, entRes, opsRes, driverRes] = await Promise.all([
        fetchSnapshot(range),
        fetchCitiesReport(range),
        fetchCategoriesReport(range),
        fetchEnterprisesReport(range),
        fetchOpsMetrics(range),
        fetchDriverReports(range),
      ]);
      if (snapRes?.success) setSnapshot(snapRes.data);
      if (cityRes?.success) setCities(cityRes.data?.cities ?? []);
      if (catRes?.success) setCategories(catRes.data?.categories ?? []);
      if (entRes?.success) setEnterprises(entRes.data?.enterprises ?? []);
      if (opsRes?.success) setOps(opsRes.data);
      if (driverRes?.success) setTopDrivers(driverRes.data?.topDrivers ?? []);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    loadRange();
  }, [loadRange]);

  useEffect(() => {
    if (builderRange === range && snapshot) {
      setBuilderSnapshot(snapshot);
      return;
    }
    fetchSnapshot(builderRange).then((res) => {
      if (res?.success) setBuilderSnapshot(res.data);
    });
  }, [builderRange, range, snapshot]);

  const snapshotKpis = useMemo(() => {
    const labels = snapshot?.labels ?? [];
    const series = snapshot?.series ?? {
      revenue: [],
      orders: [],
      customers: [],
      drivers: [],
      avgRating: [],
      cancelRate: [],
    };
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const last = (arr: number[]) => arr[arr.length - 1] ?? 0;
    const first = (arr: number[]) => arr[0] ?? 0;
    const delta = (arr: number[]) => {
      const f = first(arr);
      return f === 0 ? 0 : ((last(arr) - f) / f) * 100;
    };
    const avg = (arr: number[]) => {
      const valid = arr.filter((v) => v > 0);
      return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    };
    void labels;
    return {
      revenue: { value: sum(series.revenue), delta: delta(series.revenue) },
      orders: { value: sum(series.orders), delta: delta(series.orders) },
      drivers: { value: sum(series.drivers), delta: delta(series.drivers) },
      customers: { value: sum(series.customers), delta: delta(series.customers) },
      avgRating: { value: avg(series.avgRating), delta: delta(series.avgRating) },
      cancelRate: { value: last(series.cancelRate), delta: -delta(series.cancelRate) },
    };
  }, [snapshot]);

  const toggleBuilderMetric = (m: MetricKey) => {
    setBuilderMetrics((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const generateReport = () => {
    const series = builderSnapshot?.series;
    if (!series) return;
    const lines: string[] = [];
    lines.push(`Movezy Report · Template: ${builderTemplate} · Range: ${builderRange}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    builderMetrics.forEach((m) => {
      const meta = metricMeta[m];
      const vals = series[m] ?? [];
      lines.push(`${meta.label}: ${vals.join(", ")}`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movezy-${builderTemplate}-${builderRange}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSnapshotCsv = () => {
    if (!snapshot) return;
    const header = ["label", "revenue", "orders", "customers", "drivers", "avgRating", "cancelRate"];
    const rows = snapshot.labels.map((l, i) => [
      l,
      snapshot.series.revenue[i],
      snapshot.series.orders[i],
      snapshot.series.customers[i],
      snapshot.series.drivers[i],
      snapshot.series.avgRating[i],
      snapshot.series.cancelRate[i],
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movezy-snapshot-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeLabels = snapshot?.labels ?? [];
  const activeSeries = snapshot?.series ?? {
    revenue: [],
    orders: [],
    customers: [],
    drivers: [],
    avgRating: [],
    cancelRate: [],
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="w-7 h-7 text-movezy-500" />
            Reports & Business Intelligence
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Snapshot, trends, distribution and a builder — every view answers one question
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            {(["7D", "30D", "90D", "YTD"] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  range === r ? "bg-white text-movezy-600 shadow-sm" : "text-gray-500"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={exportSnapshotCsv}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {loading && !snapshot && (
        <div className="py-10 text-center text-sm text-gray-400">Loading reports...</div>
      )}

      {/* Business Snapshot Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {(
          [
            { key: "revenue", icon: DollarSign, border: "!border-l-emerald-500", iconBg: "bg-emerald-50", iconText: "text-emerald-600" },
            { key: "orders", icon: ClipboardList, border: "!border-l-blue-500", iconBg: "bg-blue-50", iconText: "text-blue-600" },
            { key: "drivers", icon: Bike, border: "!border-l-purple-500", iconBg: "bg-purple-50", iconText: "text-purple-600" },
            { key: "customers", icon: Users, border: "!border-l-amber-500", iconBg: "bg-amber-50", iconText: "text-amber-600" },
            { key: "avgRating", icon: Star, border: "!border-l-yellow-500", iconBg: "bg-yellow-50", iconText: "text-yellow-600" },
            { key: "cancelRate", icon: TrendingDown, border: "!border-l-red-500", iconBg: "bg-red-50", iconText: "text-red-600" },
          ] as { key: MetricKey; icon: React.ElementType; border: string; iconBg: string; iconText: string }[]
        ).map((m) => {
          const meta = metricMeta[m.key];
          const data = snapshotKpis[m.key];
          const Ico = m.icon;
          const up = data.delta >= 0;
          const isNegGood = m.key === "cancelRate";
          const good = isNegGood ? !up : up;
          return (
            <div
              key={m.key}
              className={`p-4 bg-white border border-gray-100 border-l-4 ${m.border} shadow-sm rounded-xl`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center justify-center w-8 h-8 ${m.iconBg} rounded-lg`}>
                  <Ico className={`w-4 h-4 ${m.iconText}`} />
                </div>
                <span
                  className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                    good ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(data.delta).toFixed(1)}%
                </span>
              </div>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{meta.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {m.key === "avgRating"
                  ? (data.value ? data.value.toFixed(1) : "—")
                  : m.key === "cancelRate"
                    ? `${data.value.toFixed(1)}%`
                    : m.key === "revenue"
                      ? formatINR(data.value)
                      : formatNum(data.value)}
              </p>
              <div className="mt-2">
                <Sparkline values={activeSeries[m.key]} color={meta.hex} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Trends Engine */}
          <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <LineIcon className="w-4 h-4 text-movezy-500" />
                <span className="text-sm font-semibold text-gray-700">Trends Engine</span>
                <span className="text-xs text-gray-400">· Compare two series side by side</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={primaryMetric}
                  onChange={(e) => setPrimaryMetric(e.target.value as MetricKey)}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-lg"
                >
                  {(Object.keys(metricMeta) as MetricKey[]).map((k) => (
                    <option key={k} value={k}>{metricMeta[k].label}</option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">vs</span>
                <select
                  value={compareMetric}
                  onChange={(e) => setCompareMetric(e.target.value as MetricKey | "")}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-lg"
                >
                  <option value="">None</option>
                  {(Object.keys(metricMeta) as MetricKey[])
                    .filter((k) => k !== primaryMetric)
                    .map((k) => (
                      <option key={k} value={k}>{metricMeta[k].label}</option>
                    ))}
                </select>
                <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                  {(["DAY", "WEEK", "MONTH"] as Granularity[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        granularity === g ? "bg-white text-movezy-600 shadow-sm" : "text-gray-500"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <TrendChart
              labels={activeLabels}
              primary={activeSeries[primaryMetric]}
              primaryHex={metricMeta[primaryMetric].hex}
              secondary={compareMetric ? activeSeries[compareMetric] : undefined}
              secondaryHex={compareMetric ? metricMeta[compareMetric].hex : undefined}
            />
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5" style={{ backgroundColor: metricMeta[primaryMetric].hex }} />
                <span className={metricMeta[primaryMetric].tone}>{metricMeta[primaryMetric].label}</span>
              </span>
              {compareMetric && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0 border-t-2 border-dashed" style={{ borderColor: metricMeta[compareMetric].hex }} />
                  <span className={metricMeta[compareMetric].tone}>{metricMeta[compareMetric].label}</span>
                </span>
              )}
            </div>
          </div>

          {/* Ops Intelligence */}
          <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-movezy-500" />
              <span className="text-sm font-semibold text-gray-700">Ops Intelligence</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  label: "Avg Delivery Time",
                  value: ops ? `${ops.avgDeliveryMinutes} min` : "—",
                  hint: ops ? `${ops.completedOrders} completed` : "",
                  tone: "text-gray-600",
                  icon: Package,
                },
                {
                  label: "On-time Rate",
                  value: ops ? `${ops.onTimeRatePct.toFixed(1)}%` : "—",
                  hint: ops && ops.onTimeRatePct >= 90 ? "On target" : "Review SLA",
                  tone:
                    ops && ops.onTimeRatePct >= 90 ? "text-green-600" : "text-amber-600",
                  icon: TrendingUp,
                },
                {
                  label: "Driver Utilization",
                  value: ops ? `${ops.driverUtilizationPct.toFixed(1)}%` : "—",
                  hint: ops ? `${ops.onlineDrivers}/${ops.approvedDrivers} online` : "",
                  tone:
                    ops && ops.driverUtilizationPct >= 70 ? "text-green-600" : "text-amber-600",
                  icon: Bike,
                },
                {
                  label: "Avg Order Value",
                  value: ops ? formatINR(ops.avgOrderValue) : "—",
                  hint: ops
                    ? `Cancel ${ops.cancellationRatePct.toFixed(1)}%`
                    : "",
                  tone:
                    ops && ops.cancellationRatePct < 10 ? "text-green-600" : "text-red-600",
                  icon: DollarSign,
                },
              ].map((c) => (
                <div key={c.label} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <c.icon className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{c.value}</p>
                  <p className={`text-[11px] font-medium ${c.tone}`}>{c.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-movezy-500" />
                <span className="text-sm font-semibold text-gray-700">City Distribution</span>
              </div>
              {cities.length === 0 ? (
                <p className="text-xs text-gray-400">No city data in selected range.</p>
              ) : (
                <div className="space-y-3">
                  {cities.map((c, i) => {
                    const tone = CITY_TONES[i % CITY_TONES.length];
                    return (
                      <div key={c.city}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700">{c.city}</span>
                          <span className="text-gray-500">
                            {formatNum(c.orders)} · {c.sharePct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${tone.bar}`} style={{ width: `${c.sharePct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <PieIcon className="w-4 h-4 text-movezy-500" />
                <span className="text-sm font-semibold text-gray-700">Category Mix</span>
              </div>
              {categories.length === 0 ? (
                <p className="text-xs text-gray-400">No category data in selected range.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      {(() => {
                        let offset = 0;
                        return categories.map((c, i) => {
                          const tone = CATEGORY_TONES[i % CATEGORY_TONES.length];
                          const dash = c.sharePct;
                          const el = (
                            <circle
                              key={c.name}
                              cx="18"
                              cy="18"
                              r="15.915"
                              fill="transparent"
                              strokeWidth="4"
                              stroke={tone.hex}
                              strokeDasharray={`${dash} ${100 - dash}`}
                              strokeDashoffset={-offset}
                            />
                          );
                          offset += dash;
                          return el;
                        });
                      })()}
                    </svg>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {categories.map((c, i) => {
                      const tone = CATEGORY_TONES[i % CATEGORY_TONES.length];
                      return (
                        <div key={c.name} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${tone.bar}`} />
                            <span className="text-gray-700">{c.name}</span>
                          </span>
                          <span className="font-medium text-gray-600">{c.sharePct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700">Top Drivers</span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">This {range}</span>
              </div>
              {topDrivers.length === 0 ? (
                <p className="text-xs text-gray-400">No drivers in selected range.</p>
              ) : (
                <div className="space-y-2">
                  {topDrivers.slice(0, 5).map((d, i) => {
                    const name = d.driver?.fullName || d.driver?.name || "Driver";
                    return (
                      <div key={d._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                              i === 0
                                ? "bg-amber-100 text-amber-700"
                                : i === 1
                                  ? "bg-gray-100 text-gray-700"
                                  : i === 2
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-gray-50 text-gray-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{name}</p>
                            <p className="text-[11px] text-gray-500">
                              {d.tripCount} trips
                              {d.avgRating ? (
                                <>
                                  {" · "}
                                  <span className="inline-flex items-center gap-0.5">
                                    <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                                    {d.avgRating.toFixed(1)}
                                  </span>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600">
                          {formatINR(d.totalEarnings)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-semibold text-gray-700">Top Enterprises</span>
                </div>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">This {range}</span>
              </div>
              {enterprises.length === 0 ? (
                <p className="text-xs text-gray-400">No enterprise orders in selected range.</p>
              ) : (
                <div className="space-y-2">
                  {enterprises.slice(0, 5).map((e, i) => (
                    <div key={e._id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                            i === 0
                              ? "bg-purple-100 text-purple-700"
                              : i === 1
                                ? "bg-gray-100 text-gray-700"
                                : i === 2
                                  ? "bg-indigo-100 text-indigo-700"
                                  : "bg-gray-50 text-gray-500"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {e.name || "Enterprise"}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {e.orders} orders{e.city ? ` · ${e.city}` : ""}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-emerald-600">
                        {formatINR(e.revenue)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Report Builder — Right Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 p-5 bg-white border border-gray-100 shadow-sm rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-movezy-500" />
                <span className="text-sm font-semibold text-gray-700">Report Builder</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-movezy-700 bg-movezy-50 rounded-full">
                <Sparkles className="w-3 h-3" />
                Beta
              </span>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Template</p>
              <div className="space-y-2">
                {reportTemplates.map((t) => (
                  <label
                    key={t.key}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      builderTemplate === t.key
                        ? "border-movezy-300 bg-movezy-50/40"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="builderTemplate"
                      checked={builderTemplate === t.key}
                      onChange={() => setBuilderTemplate(t.key)}
                      className="mt-0.5 text-movezy-600 focus:ring-movezy-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.label}</p>
                      <p className="text-[11px] text-gray-500">{t.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Range
              </p>
              <div className="flex flex-wrap gap-2">
                {(["7D", "30D", "90D", "YTD"] as Range[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setBuilderRange(r)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      builderRange === r
                        ? "bg-movezy-50 border-movezy-300 text-movezy-700"
                        : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Filter className="w-3 h-3" /> Metrics
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(metricMeta) as MetricKey[]).map((k) => {
                  const on = builderMetrics.includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => toggleBuilderMetric(k)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        on
                          ? "bg-movezy-50 border-movezy-300 text-movezy-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {metricMeta[k].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-2">
              <button
                onClick={generateReport}
                disabled={builderMetrics.length === 0 || !builderSnapshot}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-movezy-600 text-white rounded-lg text-sm font-medium hover:bg-movezy-700 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                Generate Report
              </button>
              <button className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50">
                <Calendar className="w-3.5 h-3.5" />
                Schedule weekly
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
