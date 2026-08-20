import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  CreditCard,
  BarChart3,
  Banknote,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Receipt,
  Clock,
  Building2,
  Plus,
  Check,
  AlertTriangle,
  Coins,
  Percent,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { initialChartSize } from "../utils/chart";
import { enhancedFinanceApi, enterpriseCreditApi, enhancedDriverApi } from "../services/admin-api";
import {
  fetchPayouts,
  createPayout,
  approvePayout,
  markPayoutPaid,
  rejectPayout,
  type PayoutItem,
  fetchCoinPayouts,
  approveCoinPayout,
  markCoinPayoutPaid,
  rejectCoinPayout,
  type CoinPayoutItem,
} from "../services/api";
import { useDialog } from "../components/Layout/Dialog";
import { useAuth } from "../auth/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const getToken = () => localStorage.getItem("adminToken");

const fetchApi = async (endpoint: string) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
};

/**
 * Turn an export payload into a downloaded CSV. Shared with the standalone
 * Payout Approvals page so both routes export identically.
 * Returns false when there was nothing to write.
 */
export const rowsToCsvDownload = (rows: any[], type: string): boolean => {
  if (!rows || rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r: any) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movezy_${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

/** Fetch + download one of the server-side finance exports. */
export const exportFinanceCsv = async (type: string): Promise<boolean> => {
  const result = await fetchApi(`/admin/finance/export?type=${type}&format=csv`);
  return rowsToCsvDownload(result.data?.rows || result.data?.data || [], type);
};

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

const EXPENSE_CATEGORIES = [
  { value: "DRIVER_PAYOUT", label: "Driver Payout" },
  { value: "REFUND", label: "Refund" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "SUPPORT", label: "Support" },
  { value: "TECHNOLOGY", label: "Technology" },
  { value: "OTHER", label: "Other" },
];

// Formatters. A figure the API did not return renders as "—", never as ₹0:
// every card here used to fall back to 0, so a failed request (or a DB outage,
// which this backend reports as HTTP 200 + { error }) was indistinguishable
// from a genuinely zero month. Real zeros still print as ₹0.
const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const money = (v: unknown) => {
  const n = numOrNull(v);
  return n === null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};
const countOf = (v: unknown) => {
  const n = numOrNull(v);
  return n === null ? "—" : n.toLocaleString("en-IN");
};
const percentOf = (v: unknown, digits = 1) => {
  const n = numOrNull(v);
  return n === null ? "—" : `${n.toFixed(digits)}%`;
};
const dayLabel = (isoDay: string) => {
  const d = new Date(`${isoDay}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? isoDay
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const FinanceModule: React.FC = () => {
  const dialog = useDialog();
  const [period, setPeriod] = useState<"week" | "month" | "year" | "custom">("month");
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rangeNotice, setRangeNotice] = useState<string | null>(null);
  const [codData, setCodData] = useState<any>(null);
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dsoMetrics, setDsoMetrics] = useState<any>(null);
  const [creditSummary, setCreditSummary] = useState<any>(null);
  // Driver payouts live at page level: the queue on the Payouts tab and the
  // "Pending Payout" tile in the strip are the same data, and the tile has to
  // show what the platform owes drivers (pendingAmount), not COD float.
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [pendingPayoutAmount, setPendingPayoutAmount] = useState<number | null>(null);
  // Deep-linkable tabs (?tab=payouts). The approval queues used to be
  // reachable ONLY by clicking through to the 4th/5th tab by hand, which is
  // exactly how "payout approval section is not visible" happened.
  const [searchParams, setSearchParams] = useSearchParams();
  const VALID_TABS = ["overview", "payouts", "coin-payouts", "cod", "expenses", "dso"] as const;
  type FinanceTab = (typeof VALID_TABS)[number];
  const urlTab = searchParams.get("tab");
  const [activeTab, setActiveTabState] = useState<FinanceTab>(
    VALID_TABS.includes(urlTab as FinanceTab) ? (urlTab as FinanceTab) : "overview",
  );
  const setActiveTab = useCallback(
    (tab: FinanceTab) => {
      setActiveTabState(tab);
      // Keep the URL in sync so refresh/share lands on the same tab.
      setSearchParams(tab === "overview" ? {} : { tab }, { replace: true });
    },
    [setSearchParams],
  );
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "OTHER", notes: "" });
  const [codBusy, setCodBusy] = useState(false);

  // listPayouts returns pendingAmount = Σ amount of PENDING + APPROVED payouts
  // (payout.controller.ts) — the real amount owed to drivers.
  const loadPayouts = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetchPayouts();
      if (!res?.success) {
        setPendingPayoutAmount(null);
        return false;
      }
      setPayouts(res.data?.payouts || []);
      setPendingPayoutAmount(numOrNull(res.data?.pendingAmount) ?? 0);
      return true;
    } catch {
      setPendingPayoutAmount(null);
      return false;
    }
  }, []);

  const loadData = useCallback(async () => {
    // "custom" with an incomplete range used to send period=custom, which every
    // endpoint's switch falls through to "this month" — month figures under a
    // custom-range header. Refuse to load instead of mislabelling them.
    if (period === "custom" && !(customDateRange.from && customDateRange.to)) {
      setEnhancedData(null);
      setCodData(null);
      setExpenses([]);
      setDsoMetrics(null);
      setCreditSummary(null);
      setPendingPayoutAmount(null);
      setLoadError(null);
      setRangeNotice("Pick a start and an end date to load a custom range.");
      setLoading(false);
      return;
    }
    setRangeNotice(null);
    setLoadError(null);
    setLoading(true);

    const dateParams =
      period === "custom"
        ? { dateFrom: customDateRange.from, dateTo: customDateRange.to }
        : { period };

    const failed: string[] = [];
    const fail = (label: string) => {
      if (!failed.includes(label)) failed.push(label);
      return null;
    };
    // enhanced-overview is the only range-aware finance endpoint, so every
    // range-scoped figure on this page now comes from it alone. The page used
    // to mix it with /admin/finance/overview, which ignores dateFrom/dateTo and
    // always answers for the current month — so three tiles followed the range
    // selector and a dozen silently did not.
    const OVERVIEW = "revenue & expenses overview";
    const COD = "COD summary";

    try {
      const [enhanced, cod, expenseRes, dso, credit, payoutsOk] = await Promise.all([
        enhancedFinanceApi
          .getEnhancedOverview(dateParams)
          .then((r) => r?.data ?? null)
          .catch(() => fail(OVERVIEW)),
        fetchApi("/admin/finance/cod-summary")
          .then((r) => r?.data ?? null)
          .catch(() => fail(COD)),
        enhancedFinanceApi
          .getExpenses({ limit: 20 })
          .then((r) => r?.data ?? null)
          .catch(() => fail("expense list")),
        enhancedFinanceApi
          .getDSOMetrics()
          .then((r) => r?.data ?? null)
          .catch(() => fail("DSO metrics")),
        enterpriseCreditApi
          .getCreditSummary()
          .then((r) => r?.data ?? null)
          .catch(() => fail("enterprise credit")),
        loadPayouts(),
      ]);

      if (!payoutsOk) fail("driver payouts");
      // These controllers answer HTTP 200 with { error: … } when the
      // aggregation or the DB connection fails, so an error key counts as a
      // failed load — otherwise an outage renders as a legitimate ₹0 month.
      if (!enhanced || enhanced.error) fail(OVERVIEW);
      if (!cod || cod.error) fail(COD);
      if (expenseRes?.error) fail("expense list");
      if (dso?.error) fail("DSO metrics");
      if (credit?.error) fail("enterprise credit");

      setEnhancedData(enhanced && !enhanced.error ? enhanced : null);
      setCodData(cod && !cod.error ? cod : null);
      setExpenses(expenseRes?.expenses || []);
      // Map to the field names the cards read — the raw responses use
      // different keys (dso/totalAccountsReceivable/overdueInvoices and
      // summary.totalUsedCredit etc.), which left every card at 0.
      setDsoMetrics(
        dso && !dso.error
          ? {
              // The endpoint reports null when there is no 90-day revenue to
              // divide by — DSO is genuinely not computable then. Coercing that
              // to 0 printed "0.0 days · Healthy", which reads as "we collect
              // instantly" instead of "we don't know".
              overallDSO: numOrNull(dso.dso),
              totalOutstanding: Number(dso.totalAccountsReceivable ?? 0),
              overdueAmount: Number(dso.overdueAmount ?? 0),
              overdueCount: Number(dso.overdueInvoices ?? 0),
              totalInvoices: Number(dso.totalInvoices ?? 0),
              topEnterpriseAR: dso.topEnterpriseAR ?? [],
            }
          : null,
      );
      setCreditSummary(
        credit && !credit.error
          ? {
              totalUsed: Number(credit.summary?.totalUsedCredit ?? 0),
              totalLimit: Number(credit.summary?.totalCreditLimit ?? 0),
              totalEnterprises: Number(credit.summary?.enterpriseCount ?? 0),
              overLimitCount: Number(credit.summary?.overLimitCount ?? 0),
              topCreditUsers: credit.topCreditUsers ?? [],
            }
          : null,
      );
    } catch (err) {
      console.error("Finance load error:", err);
      fail("finance data");
    } finally {
      if (failed.length) {
        setLoadError(
          `Couldn't load ${failed.join(", ")}. Affected figures show “—” instead of ₹0 — they are unknown, not zero.`,
        );
      }
      setLoading(false);
    }
  }, [period, customDateRange, loadPayouts]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async (type: string) => {
    try {
      // The export endpoint defaults to "last 30 days" when it gets no dates,
      // so a week/month/year selection used to export a range that matched
      // nothing on screen. Send back the exact window the overview reported
      // using (dateRange in its response) so the CSV and the cards agree.
      const range = enhancedData?.dateRange;
      if (type === "enhanced" && !(range?.from && range?.to)) {
        await dialog.alert({
          title: "Nothing loaded",
          message: "Load a period first — the export has to cover the same range as the figures on screen.",
          tone: "info",
        });
        return;
      }
      const params = { dateFrom: range?.from, dateTo: range?.to, format: "csv" as const };

      const result = type === "enhanced"
        ? await enhancedFinanceApi.exportData(params)
        : await fetchApi(`/admin/finance/export?type=${type}&format=csv`);

      const rows = result.data?.rows || result.data?.data || [];
      if (!rowsToCsvDownload(rows, type)) {
        await dialog.alert({ title: "No data", message: "There is no data to export for the selected range.", tone: "info" });
      }
    } catch {
      await dialog.alert({ title: "Export failed", message: "We couldn't generate the export. Please try again.", tone: "danger" });
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) return;
    try {
      await enhancedFinanceApi.createExpense({
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category,
        notes: newExpense.notes || undefined,
        date: new Date().toISOString(),
      });
      setShowAddExpense(false);
      setNewExpense({ description: "", amount: "", category: "OTHER", notes: "" });
      loadData();
    } catch (err) {
      await dialog.alert({ title: "Create failed", message: "Failed to create expense.", tone: "danger" });
    }
  };

  const handleApproveExpense = async (id: string) => {
    try {
      await enhancedFinanceApi.approveExpense(id);
      loadData();
    } catch (err) {
      await dialog.alert({ title: "Approve failed", message: "Failed to approve expense.", tone: "danger" });
    }
  };

  // PUT /admin/drivers/:id/cod/settle exists, is permission-gated (COD_SETTLE)
  // and audited — but nothing in the admin ever called it, so the COD float
  // could only ever grow. This is the caller.
  const handleSettleCOD = async (row: any) => {
    const driverId = String(row?._id || "");
    if (!driverId) return;
    const outstanding = numOrNull(row?.floatingCash) ?? 0;

    const amountInput = await dialog.prompt({
      title: "Settle driver COD",
      message:
        `How much cash has this driver handed over? Outstanding ${money(outstanding)}. ` +
        "Orders are cleared oldest-first up to this amount.",
      defaultValue: String(outstanding),
      inputType: "number",
      confirmLabel: "Continue",
      validate: (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n <= 0) return "Enter a positive amount.";
        if (n > outstanding) return `That is more than the ${money(outstanding)} outstanding.`;
        return null;
      },
    });
    if (amountInput === null) return;
    const amount = Number(amountInput);

    // The route runs the mandatory-comment middleware (minimum 10 characters)
    // and the controller stores the text on every booking it settles.
    const note = await dialog.prompt({
      title: "Settlement note",
      message:
        "Receipt / reference and where the cash was handed over — at least 10 characters. " +
        "It is stored on every order this settles and in the audit log.",
      confirmLabel: "Settle",
      validate: (v) => (v.trim().length < 10 ? "At least 10 characters." : null),
    });
    if (note === null) return;

    setCodBusy(true);
    try {
      const res = await enhancedDriverApi.settleCOD(driverId, {
        amount,
        comment: note.trim(),
        notes: note.trim(),
      });
      const orders: string[] = res?.data?.settledOrders || [];
      await dialog.alert({
        title: "COD settled",
        message:
          `${money(res?.data?.settledAmount)} recorded as settled.` +
          (orders.length ? ` Orders: ${orders.join(", ")}.` : ""),
        tone: "success",
      });
      await loadData();
    } catch (e) {
      await dialog.alert({
        title: "Settle failed",
        message: e instanceof Error ? e.message : "Could not settle COD",
        tone: "danger",
      });
    } finally {
      setCodBusy(false);
    }
  };

  // The enhanced-overview API returns a NESTED shape
  // ({ summary, expenses, cod, enterpriseCredit, dso, dateRange, … }).
  // enhancedData stays null when that request failed, so every figure derived
  // from it is null → "—" rather than a fabricated ₹0.
  const eo = enhancedData;
  const eSummary = eo?.summary;
  const dailySeries: any[] = eo?.dailyRevenue || [];
  const paymentMethodRows: any[] = eo?.paymentMethods || [];

  // Latest day inside the loaded range, from the same series the chart draws.
  // This replaces a "Today's Earnings / Realtime" tile that looked up today's
  // date in a month-scoped series — it printed ₹0 whenever the selected range
  // did not include today, which read as "no business today".
  const latestDay = dailySeries.length ? dailySeries[dailySeries.length - 1] : null;
  const previousDay = dailySeries.length > 1 ? dailySeries[dailySeries.length - 2] : null;
  const dayOverDayGrowth = (() => {
    const prev = numOrNull(previousDay?.revenue);
    const last = numOrNull(latestDay?.revenue);
    if (prev === null || last === null || prev <= 0) return null;
    return ((last - prev) / prev) * 100;
  })();

  // The window the SERVER actually aggregated over, echoed back in the
  // response — not the button the operator pressed.
  const rangeLabel = (() => {
    const from = eo?.dateRange?.from;
    const to = eo?.dateRange?.to;
    if (!from || !to) return period === "custom" ? "selected range" : `this ${period}`;
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    return `${fmt(from)} – ${fmt(to)}`;
  })();

  const totalExpenses = eo ? (eo.expenses?.total ?? eSummary?.totalExpenses) : null;
  const expenseCategoryCount = eo?.expenses?.byCategory?.length;

  // Invoice aging buckets as returned by enhanced-overview (dso.aging).
  const agingBuckets: { bucket: string; amount: number }[] = eo?.dso?.aging
    ? Object.entries(eo.dso.aging).map(([bucket, amount]) => ({
        bucket,
        amount: numOrNull(amount) ?? 0,
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Finance & Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, payouts, expenses, and financial analytics</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(["week", "month", "year", "custom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {p === "custom" ? <Calendar className="w-4 h-4" /> : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          {/* Custom date range inputs */}
          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDateRange.from}
                onChange={(e) => setCustomDateRange((prev) => ({ ...prev, from: e.target.value }))}
                className="px-3 py-1.5 border rounded-lg text-sm"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customDateRange.to}
                onChange={(e) => setCustomDateRange((prev) => ({ ...prev, to: e.target.value }))}
                className="px-3 py-1.5 border rounded-lg text-sm"
              />
            </div>
          )}
          <button
            onClick={() => handleExport("enhanced")}
            className="flex items-center gap-2 px-4 py-2 bg-movezy-600 text-white rounded-lg hover:bg-movezy-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {rangeNotice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
          <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{rangeNotice}</span>
        </div>
      )}

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="flex-1">{loadError}</span>
          <button
            onClick={loadData}
            className="shrink-0 px-3 py-1 rounded-md border border-red-300 text-red-700 text-xs font-semibold hover:bg-red-100"
          >
            Retry
          </button>
          <button
            onClick={() => setLoadError(null)}
            className="shrink-0 text-red-400 hover:text-red-600"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Earnings Control Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Latest Day
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {money(latestDay?.revenue)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {latestDay
                  ? `${dayLabel(latestDay._id)} · gross bookings`
                  : eo
                    ? "no completed trips in range"
                    : "not loaded"}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              {/* Was "Total Earnings" — Σ finalFare is what CUSTOMERS PAID,
                  including their GST and the drivers' share. It is not company
                  income; commission below is. */}
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Gross Bookings
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {money(eSummary?.grossRevenue)}
              </p>
              <p className="text-xs text-gray-400 mt-1">incl. customer GST · {rangeLabel}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              {/* This tile used to print unsettled COD — money drivers owe the
                  PLATFORM (a receivable). Pending payouts are the opposite
                  direction, and listPayouts already returns the figure. */}
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pending Payout
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {money(pendingPayoutAmount)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                driver payouts awaiting approval or payment
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Banknote className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        {(() => {
          const growth = dayOverDayGrowth;
          const positive = (growth ?? 0) >= 0;
          return (
            <div
              className={`bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 ${positive ? "!border-l-emerald-500" : "!border-l-red-500"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Growth %
                  </p>
                  <p
                    className={`text-2xl font-bold mt-1 flex items-center gap-1 ${positive ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {positive ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                    {growth == null ? "—" : `${Math.abs(growth).toFixed(1)}%`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {latestDay && previousDay
                      ? `${dayLabel(latestDay._id)} vs ${dayLabel(previousDay._id)}`
                      : "needs two days of trips in range"}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${positive ? "bg-emerald-100" : "bg-red-100"}`}
                >
                  {positive ? (
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Ops Metrics — same range-aware source as the strip above */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs uppercase text-gray-500 font-semibold">
            Completed Trips
          </p>
          <p className="text-xl font-bold text-gray-800 mt-1">
            {countOf(eSummary?.totalOrders)}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs uppercase text-gray-500 font-semibold">
            Avg Order Value
          </p>
          <p className="text-xl font-bold text-gray-800 mt-1">
            {money(eSummary?.avgOrderValue)}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs uppercase text-gray-500 font-semibold">
            Refund Ratio
          </p>
          <p
            className={`text-xl font-bold mt-1 ${(numOrNull(eSummary?.refundRatio) ?? 0) > 10 ? "text-red-600" : "text-gray-800"}`}
          >
            {percentOf(eSummary?.refundRatio)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
        {([
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "expenses", label: "Expenses", icon: Receipt },
          { key: "dso", label: "DSO & Credit", icon: Clock },
          { key: "payouts", label: "Payouts", icon: Banknote },
          { key: "coin-payouts", label: "Coin Payouts", icon: Coins },
          { key: "cod", label: "COD", icon: CreditCard },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as FinanceTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-movezy-600" />
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinanceCard
                  label="Gross Bookings"
                  value={money(eSummary?.grossRevenue)}
                  icon={DollarSign}
                  color="blue"
                  trend={<span className="text-xs text-gray-500">what customers paid · {rangeLabel}</span>}
                />
                {/* Commission is the only line the platform actually keeps
                    (Σ booking.commissionAmount, frozen at completion). It was
                    returned by the API but shown nowhere, so gross receipts
                    were the closest thing to an income figure on this page. */}
                <FinanceCard
                  label="Commission Earned"
                  value={money(eSummary?.totalCommission)}
                  icon={Percent}
                  color="green"
                  trend={<span className="text-xs text-gray-500">platform's share of the subtotal</span>}
                />
                <FinanceCard
                  label="Total Expenses"
                  value={money(totalExpenses)}
                  icon={Receipt}
                  color="orange"
                  /* Operating expenses, including driver payouts once they are
                     marked paid. Auto-created REFUND rows are excluded here so
                     refunds are not subtracted twice — they already come off
                     Net Revenue — and are reported as summary.refundExpenses. */
                  trend={
                    <span className="text-xs text-gray-500">
                      {expenseCategoryCount == null
                        ? "—"
                        : `${expenseCategoryCount} categories · excl. refunds`}
                    </span>
                  }
                />
                <FinanceCard
                  label="Net Revenue"
                  value={money(eSummary?.netRevenue)}
                  icon={TrendingUp}
                  color="purple"
                  /* Was "After expenses & refunds", which read as profit. The
                     endpoint returns gross − refunds; operating expenses are
                     deducted in Net Profit, not here. Driver payables and GST
                     are not deducted at all. */
                  trend={<span className="text-xs text-gray-500">gross − refunds (not profit)</span>}
                />
              </div>

              {/* GST collected from customers. It sits inside Gross Bookings
                  but is remitted, not kept, so it was previously invisible —
                  leaving gross receipts looking like income. Σ booking.gstAmount
                  over the same window, from the endpoint. */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinanceCard
                  label="GST Collected"
                  value={money(eSummary?.totalGST)}
                  icon={Receipt}
                  color="purple"
                  trend={<span className="text-xs text-gray-500">included in gross · remitted, not income</span>}
                />
              </div>

              <p className="text-xs text-gray-500 -mt-2">
                Gross Bookings is the total customers paid, including their GST and the
                drivers' share. Driver earnings and collected GST are not platform income and
                are not deducted from Net Revenue — Commission Earned is what the platform
                retains.
              </p>

              {/* Second row: Enterprise Credit + COD + receivables */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinanceCard
                  label="Refund Ratio"
                  value={percentOf(eSummary?.refundRatio)}
                  icon={(numOrNull(eSummary?.refundRatio) ?? 0) > 10 ? TrendingDown : TrendingUp}
                  color={(numOrNull(eSummary?.refundRatio) ?? 0) > 10 ? "red" : "purple"}
                  trend={
                    <span className="text-xs text-gray-500">
                      {countOf(eSummary?.refundCount)} refunds
                    </span>
                  }
                />
                <FinanceCard
                  label="Enterprise Credit Outstanding"
                  value={money(eo?.enterpriseCredit?.totalUsed ?? creditSummary?.totalUsed)}
                  icon={Building2}
                  color="purple"
                  trend={
                    <span className="text-xs text-gray-500">
                      {creditSummary ? `${creditSummary.totalEnterprises} enterprises` : "—"}
                    </span>
                  }
                />
                {/* Renamed from "COD Balance": this is cash drivers collected and
                    have NOT handed over — a receivable owed to the platform, and
                    the query behind it has no date filter, so it is all-time and
                    deliberately ignores the range selector. */}
                <FinanceCard
                  label="Unsettled COD (all time)"
                  value={money(codData?.pendingSettlement)}
                  icon={Banknote}
                  color={(numOrNull(codData?.pendingSettlement) ?? 0) > 50000 ? "red" : "blue"}
                  trend={
                    <span className="text-xs text-gray-500">
                      {countOf(codData?.pendingOrders)} orders · owed to platform
                    </span>
                  }
                />
                <FinanceCard
                  label="Days Sales Outstanding"
                  value={dsoMetrics?.overallDSO === null || dsoMetrics?.overallDSO === undefined ? "—" : `${dsoMetrics.overallDSO.toFixed(1)} days`}
                  icon={Clock}
                  color={dsoMetrics?.overallDSO == null ? "blue" : dsoMetrics.overallDSO > 30 ? "red" : "green"}
                  trend={
                    !dsoMetrics
                      ? <span className="text-xs text-gray-500">not loaded</span>
                      : dsoMetrics.overallDSO == null
                        ? <span className="text-xs text-gray-500">no revenue in window</span>
                        : dsoMetrics.overallDSO > 30
                          ? <span className="flex items-center text-xs text-red-600"><AlertTriangle className="w-3 h-3 mr-1" /> High DSO</span>
                          : <span className="text-xs text-green-600">Healthy</span>
                  }
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800">Revenue Trend</h3>
                    <span className="text-xs text-gray-400">{rangeLabel}</span>
                  </div>
                  {dailySeries.length === 0 ? (
                    <p className="h-72 flex items-center justify-center text-sm text-gray-400">
                      {eo ? "No completed trips in this range" : "Not loaded"}
                    </p>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize(288)}>
                        <AreaChart data={dailySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F3F4F6" />
                          <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                          <Tooltip
                            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}
                            formatter={(v: any) => [`₹${(v || 0).toLocaleString()}`]}
                          />
                          {/* Two series with no legend were indistinguishable —
                              the lower one is commission, not a revenue variant. */}
                          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
                          <Area type="monotone" dataKey="revenue" name="Gross bookings" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                          <Area type="monotone" dataKey="commission" name="Commission earned" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCommission)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Payment Methods Pie */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Methods</h3>
                  {paymentMethodRows.length === 0 ? (
                    <p className="h-56 flex items-center justify-center text-sm text-gray-400">
                      {eo ? "No completed trips in this range" : "Not loaded"}
                    </p>
                  ) : (
                    <>
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize(224)}>
                          <RechartsPie>
                            <Pie
                              data={paymentMethodRows.map((pm: any) => ({ name: pm._id || "Other", value: pm.total }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {paymentMethodRows.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: any) => [`₹${(v || 0).toLocaleString()}`]} />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 space-y-2">
                        {paymentMethodRows.map((pm: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-gray-600">{pm._id || "Other"}</span>
                            </div>
                            <span className="font-medium text-gray-800">{money(pm.total)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="space-y-6">
              {/* Add Expense Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-movezy-600 text-white rounded-lg hover:bg-movezy-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Expense
                </button>
              </div>

              {/* Add Expense Modal */}
              {showAddExpense && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-md">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Add New Expense</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={newExpense.description}
                          onChange={(e) => setNewExpense((prev) => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="Enter description"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                        <input
                          type="number"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense((prev) => ({ ...prev, amount: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={newExpense.category}
                          onChange={(e) => setNewExpense((prev) => ({ ...prev, category: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                        <textarea
                          value={newExpense.notes}
                          onChange={(e) => setNewExpense((prev) => ({ ...prev, notes: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-lg"
                          rows={2}
                          placeholder="Additional notes"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => setShowAddExpense(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddExpense}
                        className="px-4 py-2 bg-movezy-600 text-white rounded-lg hover:bg-movezy-700"
                      >
                        Create Expense
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Expenses Table */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Expenses</h3>
                {expenses.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">No expenses recorded</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((exp: any) => (
                          <tr key={exp._id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-800">{exp.description}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                {EXPENSE_CATEGORIES.find((c) => c.value === exp.category)?.label || exp.category}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">₹{(exp.amount || 0).toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                exp.status === "PAID" ? "bg-green-100 text-green-600" :
                                exp.status === "APPROVED" ? "bg-blue-100 text-blue-600" :
                                "bg-yellow-100 text-yellow-600"
                              }`}>
                                {exp.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 text-xs">
                              {new Date(exp.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {exp.status === "PENDING" && (
                                <button
                                  onClick={() => handleApproveExpense(exp._id)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "dso" && (
            <div className="space-y-6">
              {/* DSO Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinanceCard
                  label="Overall DSO"
                  value={dsoMetrics?.overallDSO === null || dsoMetrics?.overallDSO === undefined ? "—" : `${dsoMetrics.overallDSO.toFixed(1)} days`}
                  icon={Clock}
                  color={dsoMetrics?.overallDSO == null ? "blue" : dsoMetrics.overallDSO > 30 ? "red" : "green"}
                  trend={
                    !dsoMetrics
                      ? <span className="text-xs text-gray-500">not loaded</span>
                      : dsoMetrics.overallDSO == null
                        ? <span className="text-xs text-gray-500">no revenue in window</span>
                        : dsoMetrics.overallDSO > 30
                          ? <span className="text-xs text-red-600">Above target</span>
                          : <span className="text-xs text-green-600">On track</span>
                  }
                />
                <FinanceCard
                  label="Total Outstanding"
                  value={money(dsoMetrics?.totalOutstanding)}
                  icon={DollarSign}
                  color="orange"
                  trend={<span className="text-xs text-gray-500">{countOf(dsoMetrics?.totalInvoices)} invoices</span>}
                />
                <FinanceCard
                  label="Overdue Amount"
                  value={money(dsoMetrics?.overdueAmount)}
                  icon={AlertTriangle}
                  color="red"
                  /* Counts only invoices that have a real due date, i.e.
                     enterprise credit invoices past their payment term. It used
                     to count every invoice, so it will now typically read 0
                     against a non-zero Total Outstanding — that is correct, not
                     a load failure. */
                  trend={
                    <span className="text-xs text-red-600">
                      {countOf(dsoMetrics?.overdueCount)} past payment term
                    </span>
                  }
                />
                <FinanceCard
                  label="Enterprise Credit Used"
                  value={money(creditSummary?.totalUsed)}
                  icon={Building2}
                  color="purple"
                  trend={<span className="text-xs text-gray-500">of {money(creditSummary?.totalLimit)} limit</span>}
                />
              </div>

              {/* Receivables aging. Was keyed off dsoMetrics.agingBuckets, which
                  no endpoint returns — the chart could never render. The real
                  buckets come back on enhanced-overview as dso.aging. */}
              {agingBuckets.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800">Receivables Aging</h3>
                  <p className="text-xs text-gray-400 mb-4">
                    Unpaid invoices raised in the last 90 days, by age
                  </p>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%" initialDimension={initialChartSize(256)}>
                      <BarChart data={agingBuckets}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v: any) => [`₹${(v || 0).toLocaleString()}`]} />
                        <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Enterprise receivables. Was keyed off
                  creditSummary.overdueEnterprises (never returned, so dead);
                  the DSO endpoint really does return topEnterpriseAR. It has no
                  days-overdue figure, so that column is gone rather than faked. */}
              {(dsoMetrics?.topEnterpriseAR?.length ?? 0) > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Top Enterprise Receivables</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Enterprise</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Outstanding</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Open invoices</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dsoMetrics.topEnterpriseAR.map((ent: any) => (
                          <tr key={String(ent._id)} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-800">{ent.enterpriseName || "—"}</td>
                            <td className="py-3 px-4 text-right font-medium text-red-600">{money(ent.outstanding)}</td>
                            <td className="py-3 px-4 text-right text-gray-600">{countOf(ent.count)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "coin-payouts" && <CoinPayoutsSection />}

          {activeTab === "payouts" && (
            <SmartPayoutsSection
              onExport={() => handleExport("payouts")}
              payouts={payouts}
              pendingAmount={pendingPayoutAmount}
              reloadPayouts={loadPayouts}
            />
          )}

          {activeTab === "cod" && (
            <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  COD is cash a driver collected on the platform's behalf. Unsettled COD is
                  owed <b>to</b> the platform — it is not a payout. The unsettled figures are
                  all-time and are not affected by the date selector above.
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FinanceCard
                  label="COD Collected (7d)"
                  value={money(codData?.totalCollected)}
                  icon={Banknote}
                  color="green"
                  trend={<span className="text-xs text-gray-500">{countOf(codData?.totalCODOrders)} orders · last 7 days</span>}
                />
                {/* "Pending Settlement" and "Floating Cash" were two tiles
                    printing the identical value (Σ finalFare of unsettled cash
                    bookings). One tile, honestly named. */}
                <FinanceCard
                  label="Unsettled COD (all time)"
                  value={money(codData?.pendingSettlement)}
                  icon={CreditCard}
                  color={(numOrNull(codData?.pendingSettlement) ?? 0) > 50000 ? "red" : "orange"}
                  trend={
                    (numOrNull(codData?.pendingSettlement) ?? 0) > 50000
                      ? <span className="flex items-center text-xs text-red-600"><ArrowDownRight className="w-3 h-3" /> High float</span>
                      : <span className="text-xs text-gray-500">{countOf(codData?.pendingOrders)} orders</span>
                  }
                />
                <FinanceCard
                  label="COD Orders (7d)"
                  value={countOf(codData?.totalCODOrders)}
                  icon={BarChart3}
                  color="purple"
                  trend={<span className="text-xs text-gray-500">Last 7 days</span>}
                />
              </div>

              {/* Driver COD Balances */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800">Driver COD Balances (Top 20)</h3>
                <p className="text-xs text-gray-400 mb-4">
                  Cash each driver still owes the platform. Settling clears the oldest
                  unsettled orders first, up to the amount you enter.
                </p>
                {(codData?.driverCODBalances || []).length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">
                    {codData ? "No outstanding COD balances" : "Not loaded"}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Driver ID</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Unsettled cash</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Orders</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codData.driverCODBalances.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-xs text-gray-600">{d._id}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              {money(d.floatingCash)}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600">{countOf(d.orderCount)}</td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handleSettleCOD(d)}
                                disabled={codBusy || !d._id}
                                className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                              >
                                Settle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Helper card component
const FinanceCard: React.FC<{
  label: string;
  value: string;
  icon: React.ElementType;
  color: "blue" | "green" | "orange" | "purple" | "red";
  trend?: React.ReactNode;
}> = ({ label, value, icon: Icon, color, trend }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${colors[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend}
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
    </div>
  );
};

interface DriverEarningsRow {
  id: string;
  name: string;
  trips: number;
  distance: number;
  // driverEarnings, i.e. net of commission and GST — the payout basis.
  earnings: number;
  cancellation: number;
}

/**
 * Customer coin → bank payout queue.
 *
 * Customers request these from the app; the coins are already debited and held.
 * There is no gateway — an operator pays the account shown here by hand and
 * records the UTR. Rejecting refunds the customer's coins, so it is safe to
 * reject anything that looks wrong.
 */
export const CoinPayoutsSection: React.FC = () => {
  const dialog = useDialog();
  const [payouts, setPayouts] = useState<CoinPayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"" | "PENDING" | "APPROVED" | "PAID" | "REJECTED">("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCoinPayouts(filter || undefined);
      if (res?.success) setPayouts(res.data?.payouts || []);
      else setPayouts([]);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = useCallback(
    async (p: CoinPayoutItem) => {
      const ok = await dialog.confirm({
        title: "Approve payout",
        message: `Approve ₹${p.amount.toLocaleString()} to ${p.bankSnapshot.accountName} (A/c ${p.bankSnapshot.accountNumber}, ${p.bankSnapshot.ifsc})? This clears it for payment — it does not send money.`,
        confirmLabel: "Approve",
      });
      if (!ok) return;
      setBusy(true);
      try {
        const res = await approveCoinPayout(p._id);
        if (!res?.success) {
          await dialog.alert({ title: "Failed", message: res?.message || "Could not approve", tone: "danger" });
        }
        await load();
      } catch (e) {
        await dialog.alert({ title: "Failed", message: e instanceof Error ? e.message : "Could not approve", tone: "danger" });
      } finally {
        setBusy(false);
      }
    },
    [dialog, load],
  );

  // The UTR is mandatory server-side — this is the only record that the money
  // actually left, so an empty one is refused rather than silently sent.
  const handleMarkPaid = useCallback(
    async (p: CoinPayoutItem) => {
      const ref = await dialog.prompt({
        title: "Mark as paid",
        message: `Enter the UTR / transaction reference for the ₹${p.amount.toLocaleString()} transfer to ${p.bankSnapshot.accountName}:`,
        confirmLabel: "Mark paid",
      });
      if (ref === null) return;
      if (!ref.trim()) {
        await dialog.alert({ title: "Reference required", message: "A UTR is required to mark a payout paid.", tone: "danger" });
        return;
      }
      setBusy(true);
      try {
        const res = await markCoinPayoutPaid(p._id, ref.trim());
        if (!res?.success) {
          await dialog.alert({ title: "Failed", message: res?.message || "Could not mark paid", tone: "danger" });
        }
        await load();
      } catch (e) {
        await dialog.alert({ title: "Failed", message: e instanceof Error ? e.message : "Could not mark paid", tone: "danger" });
      } finally {
        setBusy(false);
      }
    },
    [dialog, load],
  );

  const handleReject = useCallback(
    async (p: CoinPayoutItem) => {
      const reason = await dialog.prompt({
        title: "Reject payout",
        message: `Reason for rejecting this request (at least 10 characters)? ${p.coins.toLocaleString()} coins will be refunded to the customer.`,
        confirmLabel: "Reject & refund",
      });
      if (reason === null) return;
      // The API enforces a 10-character minimum (COMMENT_TOO_SHORT); check here
      // so a short reason is not answered with a bare 400.
      if (reason.trim().length < 10) {
        await dialog.alert({
          title: "Reason required",
          message: "A rejection reason of at least 10 characters is required.",
          tone: "danger",
        });
        return;
      }
      setBusy(true);
      try {
        const res = await rejectCoinPayout(p._id, reason.trim());
        if (!res?.success) {
          await dialog.alert({ title: "Failed", message: res?.message || "Could not reject", tone: "danger" });
        }
        await load();
      } catch (e) {
        await dialog.alert({ title: "Failed", message: e instanceof Error ? e.message : "Could not reject", tone: "danger" });
      } finally {
        setBusy(false);
      }
    },
    [dialog, load],
  );

  const pendingValue = payouts
    .filter((p) => p.status === "PENDING" || p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-5 h-5 text-orange-500" />
          <p className="text-sm font-semibold text-gray-800">Coin Payouts</p>
        </div>
        <p className="text-xs text-gray-500">
          Customers cashing coins out to a bank account. Coins are already deducted and held —
          rejecting a request refunds them. Pay the account shown, then record the UTR.
        </p>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <div className="border border-gray-100 rounded-xl px-4 py-2 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700 uppercase">Awaiting payment</p>
            <p className="text-lg font-bold text-gray-900">₹{pendingValue.toLocaleString()}</p>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="PAID">Paid</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Requests</p>
          <span className="text-xs text-gray-500">{payouts.length} record(s)</span>
        </div>
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : payouts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No coin payout requests{filter ? ` with status ${filter}` : ""}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                  <th className="text-left px-4 py-2 font-medium">Customer</th>
                  <th className="text-right px-4 py-2 font-medium">Coins</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-left px-4 py-2 font-medium">Bank account</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((p) => {
                  const cust =
                    p.userId && typeof p.userId === "object"
                      ? p.userId.name || p.userId.phone || p.userId.email || "—"
                      : "—";
                  const statusTone =
                    p.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : p.status === "APPROVED"
                        ? "bg-blue-100 text-blue-700"
                        : p.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700";
                  return (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{cust}</td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {p.coins.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        ₹{p.amount.toLocaleString()}
                        <span className="block text-[10px] font-normal text-gray-400">
                          @ ₹{p.rateApplied}/coin
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        <span className="block text-gray-800">{p.bankSnapshot.accountName}</span>
                        <span className="block text-xs font-mono text-gray-500">
                          {p.bankSnapshot.accountNumber} · {p.bankSnapshot.ifsc}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusTone}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1.5">
                          {p.status === "PENDING" && (
                            <button
                              onClick={() => handleApprove(p)}
                              disabled={busy}
                              className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}
                          {p.status === "APPROVED" && (
                            <button
                              onClick={() => handleMarkPaid(p)}
                              disabled={busy}
                              className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                            >
                              Mark paid
                            </button>
                          )}
                          {(p.status === "PENDING" || p.status === "APPROVED") && (
                            <button
                              onClick={() => handleReject(p)}
                              disabled={busy}
                              className="px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                          {p.status === "PAID" && p.reference && (
                            <span className="text-xs text-gray-400">ref {p.reference}</span>
                          )}
                          {p.status === "REJECTED" && p.rejectionReason && (
                            <span className="text-xs text-gray-400" title={p.rejectionReason}>
                              refunded
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export const SmartPayoutsSection: React.FC<{
  onExport: () => void;
  payouts: PayoutItem[];
  pendingAmount: number | null;
  reloadPayouts: () => Promise<boolean>;
}> = ({ onExport, payouts, pendingAmount, reloadPayouts }) => {
  const dialog = useDialog();
  const { user } = useAuth();
  const [selected, setSelected] = useState<DriverEarningsRow | null>(null);

  // Separation of duties, as enforced by payout.controller.ts. Only an Admin
  // requester counts — a driver-initiated withdrawal is never "your" request.
  const meId = user?._id ? String(user._id) : "";
  const isOwnRequest = (p: PayoutItem) =>
    !!meId &&
    p.requestedByType === "Admin" &&
    String(p.requestedBy ?? "") === meId;
  const isOwnApproval = (p: PayoutItem) =>
    !!meId && String(p.approvedBy ?? "") === meId;

  // Real driver earnings from bookings (was MOCK_DRIVER_EARNINGS).
  const [rows, setRows] = useState<DriverEarningsRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [payoutBusy, setPayoutBusy] = useState(false);

  // The queue and its pendingAmount are owned by the page so the strip's
  // "Pending Payout" tile and this table can never disagree.
  const loadPayouts = reloadPayouts;

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingRows(true);
      try {
        const res = await fetchApi("/admin/finance/driver-earnings?period=month");
        const list: DriverEarningsRow[] = res?.data?.drivers || [];
        if (active) setRows(list);
      } catch {
        if (active) setRows([]);
      } finally {
        if (active) setLoadingRows(false);
      }
    })();
  }, []);

  // Create a payout request for the selected driver (prompts for amount).
  const handleProcessPayout = useCallback(async () => {
    if (!selected) return;
    const input = await dialog.prompt({
      title: `Pay out to ${selected.name}`,
      message: `Amount to pay out (this month's earnings: ₹${selected.earnings.toLocaleString()}). A payout request will be created for approval.`,
      defaultValue: String(selected.earnings),
      confirmLabel: "Create payout",
    });
    if (input === null) return;
    const amount = Number(input);
    if (!amount || amount <= 0) {
      await dialog.alert({ title: "Invalid amount", message: "Enter a positive amount." });
      return;
    }
    setPayoutBusy(true);
    try {
      const res = await createPayout({ driverId: selected.id, amount, method: "BANK" });
      if (res?.success) {
        await loadPayouts();
        await dialog.alert({
          title: "Payout requested",
          message: `₹${amount.toLocaleString()} payout created for ${selected.name} (pending approval).`,
        });
      } else {
        await dialog.alert({ title: "Failed", message: res?.message || "Could not create payout", tone: "danger" });
      }
    } catch (e) {
      await dialog.alert({ title: "Failed", message: e instanceof Error ? e.message : "Could not create payout", tone: "danger" });
    } finally {
      setPayoutBusy(false);
    }
  }, [selected, dialog, loadPayouts]);

  const handleApprove = useCallback(async (id: string) => {
    setPayoutBusy(true);
    try {
      await approvePayout(id);
      await loadPayouts();
    } catch (e) {
      await dialog.alert({ title: "Failed", message: e instanceof Error ? e.message : "Could not approve payout", tone: "danger" });
    } finally {
      setPayoutBusy(false);
    }
  }, [dialog, loadPayouts]);

  const handleMarkPaid = useCallback(async (id: string) => {
    const ref = await dialog.prompt({
      title: "Mark as paid",
      message: "Enter the payment reference (UTR / transaction id), optional:",
      confirmLabel: "Mark paid",
    });
    if (ref === null) return; // cancelled
    setPayoutBusy(true);
    try {
      await markPayoutPaid(id, ref || undefined);
      await loadPayouts();
    } catch (e) {
      await dialog.alert({ title: "Failed", message: e instanceof Error ? e.message : "Could not mark payout paid", tone: "danger" });
    } finally {
      setPayoutBusy(false);
    }
  }, [dialog, loadPayouts]);

  const handleReject = useCallback(async (id: string) => {
    const reason = await dialog.prompt({
      title: "Reject payout",
      message: "Reason for rejection (at least 10 characters):",
      required: true,
      multiline: true,
      confirmLabel: "Reject",
    });
    if (reason === null) return;
    // The API enforces a 10-character minimum (COMMENT_TOO_SHORT), and rejecting
    // used to be allowed to send nothing at all.
    if (reason.trim().length < 10) {
      await dialog.alert({
        title: "Reason required",
        message: "A rejection reason of at least 10 characters is required.",
        tone: "danger",
      });
      return;
    }
    setPayoutBusy(true);
    try {
      await rejectPayout(id, reason.trim());
      await loadPayouts();
    } catch (e) {
      await dialog.alert({ title: "Failed", message: e instanceof Error ? e.message : "Could not reject payout", tone: "danger" });
    } finally {
      setPayoutBusy(false);
    }
  }, [dialog, loadPayouts]);

  return (
    <div className="space-y-6">
      {/* Payout queue header. The "Smart Payouts" panel that used to sit here
          (Auto Payout / Schedule / Min Payout / Hold if Cancel > 5%) was four
          controls bound to local useState and nothing else — no endpoint, no
          stored setting, no automation. It read as live payout policy, so it is
          gone rather than left implying rules that do not exist. */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-gray-800">Driver Payouts</p>
              <p className="text-xs text-gray-500">
                Every payout is created, approved and paid by hand — there is no automation
                and no gateway. Record the UTR when the transfer is done.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="border border-gray-100 rounded-xl px-4 py-2 bg-gray-50">
              <p className="text-xs font-semibold text-gray-700 uppercase">Awaiting payment</p>
              <p className="text-lg font-bold text-gray-900">{money(pendingAmount)}</p>
            </div>
            <button
              onClick={onExport}
              title="Exports payout records from the last 30 days"
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Export (30d)
            </button>
          </div>
        </div>
      </div>

      {/* Driver Earnings Table + Payout Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Driver Earnings</p>
            <span className="text-xs text-gray-500">net of commission · this month · top 50</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Driver</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Trips</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Distance</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Net earnings</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cancel %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingRows && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      Loading driver earnings…
                    </td>
                  </tr>
                )}
                {!loadingRows && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      No completed trips in this period yet
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className={`cursor-pointer hover:bg-orange-50/50 ${selected?.id === r.id ? "bg-orange-50" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{r.name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{r.trips}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">{r.distance} km</td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                      ₹{r.earnings.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium ${r.cancellation > 5 ? "text-red-600" : "text-gray-700"}`}
                    >
                      {r.cancellation.toFixed(1)}%
                    </td>
                    {/* The "Payout" status badge that used to close this row was
                        always "pending": the endpoint hardcodes
                        payoutStatus: "pending" for every driver because per-driver
                        payout state is not tracked. The real lifecycle is in the
                        Payouts Queue below. */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout Summary Panel (right) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-800 mb-3">Payout Summary</p>
          {!selected ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <Banknote className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Select a driver to view breakdown</p>
            </div>
          ) : (
            <div>
              <p className="text-lg font-bold text-gray-900">{selected.name}</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                ₹{selected.earnings.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">Current period</p>

              {/* Real per-driver facts (the old breakdown fabricated base/
                  incentive/surge splits as fixed ratios of the total). */}
              <div className="space-y-2 mt-4">
                <BreakdownRow label="Completed trips" value={`${selected.trips}`} />
                <BreakdownRow label="Distance" value={`${selected.distance} km`} />
                <BreakdownRow
                  label="Cancellation rate"
                  value={`${selected.cancellation.toFixed(1)}%`}
                  tone={selected.cancellation > 5 ? "red" : "default"}
                />
                <BreakdownRow
                  label="Avg per trip"
                  value={`₹${selected.trips > 0 ? Math.round(selected.earnings / selected.trips).toLocaleString() : 0}`}
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleProcessPayout}
                  disabled={payoutBusy}
                  className="w-full py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50"
                >
                  Process Payout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual payouts queue — real create/approve/pay/reject lifecycle */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Payouts Queue</p>
          <span className="text-xs text-gray-500">{payouts.length} record(s)</span>
        </div>
        {payouts.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No payouts yet. Select a driver above and click “Process Payout”.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                  <th className="text-left px-4 py-2 font-medium">Driver</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-left px-4 py-2 font-medium">Method</th>
                  <th className="text-center px-4 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((p) => {
                  const drv =
                    p.driverId && typeof p.driverId === "object"
                      ? p.driverId.fullName || p.driverId.mobileNumber
                      : "—";
                  const statusTone =
                    p.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : p.status === "APPROVED"
                        ? "bg-blue-100 text-blue-700"
                        : p.status === "REJECTED"
                          ? "bg-red-100 text-red-700"
                          : "bg-amber-100 text-amber-700";
                  return (
                    <tr key={p._id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{drv}</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{p.method}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusTone}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1.5">
                          {/* Separation of duties, mirrored from the API: an
                              admin may not approve a payout they requested, nor
                              pay one they approved. Showing the button anyway
                              just turned the rule into a 400 on click. */}
                          {p.status === "PENDING" && !isOwnRequest(p) && (
                            <button
                              onClick={() => handleApprove(p._id)}
                              disabled={payoutBusy}
                              className="px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          )}
                          {p.status === "PENDING" && isOwnRequest(p) && (
                            <span
                              className="px-2 py-1 text-xs text-gray-500"
                              title="You requested this payout, so a different admin must approve it."
                            >
                              Awaiting another admin
                            </span>
                          )}
                          {/* Mark paid only on APPROVED: the endpoint refuses a
                              PENDING payout (a payout must be approved before
                              money leaves), so offering it here was a button
                              that could only ever return an error. */}
                          {p.status === "APPROVED" && !isOwnApproval(p) && (
                            <button
                              onClick={() => handleMarkPaid(p._id)}
                              disabled={payoutBusy}
                              className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 disabled:opacity-50"
                            >
                              Mark paid
                            </button>
                          )}
                          {p.status === "APPROVED" && isOwnApproval(p) && (
                            <span
                              className="px-2 py-1 text-xs text-gray-500"
                              title="You approved this payout, so a different admin must mark it paid."
                            >
                              Awaiting another admin
                            </span>
                          )}
                          {(p.status === "PENDING" || p.status === "APPROVED") && (
                            <button
                              onClick={() => handleReject(p._id)}
                              disabled={payoutBusy}
                              className="px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                          {p.status === "PAID" && p.reference && (
                            <span className="text-xs text-gray-400">ref {p.reference}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const BreakdownRow: React.FC<{ label: string; value: string; tone?: "red" | "default" }> = ({
  label,
  value,
  tone = "default",
}) => (
  <div className="flex items-center justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
    <span className="text-gray-600">{label}</span>
    <span className={`font-semibold ${tone === "red" ? "text-red-600" : "text-gray-800"}`}>
      {value}
    </span>
  </div>
);

export default FinanceModule;
