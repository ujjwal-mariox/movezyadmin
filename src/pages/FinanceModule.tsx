import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { enhancedFinanceApi, enterpriseCreditApi } from "../services/admin-api";

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

const FinanceModule: React.FC = () => {
  const [period, setPeriod] = useState<"week" | "month" | "year" | "custom">("month");
  const [customDateRange, setCustomDateRange] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [codData, setCodData] = useState<any>(null);
  const [enhancedData, setEnhancedData] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dsoMetrics, setDsoMetrics] = useState<any>(null);
  const [creditSummary, setCreditSummary] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "payouts" | "cod" | "expenses" | "dso">("overview");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: "", amount: "", category: "OTHER", notes: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dateParams = period === "custom" && customDateRange.from && customDateRange.to
        ? { dateFrom: customDateRange.from, dateTo: customDateRange.to }
        : { period };

      const [finance, cod, enhanced, expenseRes, dso, credit] = await Promise.all([
        fetchApi(`/admin/finance/overview?period=${period}`),
        fetchApi("/admin/finance/cod-summary"),
        enhancedFinanceApi.getEnhancedOverview(dateParams).catch(() => ({ data: null })),
        enhancedFinanceApi.getExpenses({ limit: 20 }).catch(() => ({ data: { expenses: [] } })),
        enhancedFinanceApi.getDSOMetrics().catch(() => ({ data: null })),
        enterpriseCreditApi.getCreditSummary().catch(() => ({ data: null })),
      ]);
      setData(finance.data);
      setCodData(cod.data);
      setEnhancedData(enhanced.data);
      setExpenses(expenseRes.data?.expenses || []);
      setDsoMetrics(dso.data);
      setCreditSummary(credit.data);
    } catch (err) {
      console.error("Finance load error:", err);
    } finally {
      setLoading(false);
    }
  }, [period, customDateRange]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async (type: string) => {
    try {
      const params = period === "custom" && customDateRange.from && customDateRange.to
        ? { dateFrom: customDateRange.from, dateTo: customDateRange.to, format: "csv" as const }
        : { format: "csv" as const };

      const result = type === "enhanced"
        ? await enhancedFinanceApi.exportData(params)
        : await fetchApi(`/admin/finance/export?type=${type}&format=csv`);

      const rows = result.data?.rows || [];
      if (rows.length === 0) { alert("No data to export"); return; }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(","), ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movezy_${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
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
      });
      setShowAddExpense(false);
      setNewExpense({ description: "", amount: "", category: "OTHER", notes: "" });
      loadData();
    } catch (err) {
      alert("Failed to create expense");
    }
  };

  const handleApproveExpense = async (id: string) => {
    try {
      await enhancedFinanceApi.approveExpense(id);
      loadData();
    } catch (err) {
      alert("Failed to approve expense");
    }
  };

  const s = data?.summary || {};
  const es = enhancedData || {};

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

      {/* Earnings Control Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Today's Earnings
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                ₹{((es.todayEarnings ?? s.todayEarnings ?? 0) as number).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">Realtime</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Earnings
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                ₹{((es.grossRevenue ?? s.grossRevenue ?? 0) as number).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">This {period}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-amber-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Pending Payout
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                ₹{((es.pendingPayouts ?? codData?.pendingSettlement ?? 0) as number).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {(codData?.pendingOrders ?? 0)} pending orders
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Banknote className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
        {(() => {
          const growth = (es.growthPercent ?? s.growthPercent ?? 0) as number;
          const positive = growth >= 0;
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
                    {Math.abs(growth).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400 mt-1">vs prev {period}</p>
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

      {/* Ops Metrics (Hidden Gold) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs uppercase text-gray-500 font-semibold">
            Completed Trips
          </p>
          <p className="text-xl font-bold text-gray-800 mt-1">
            {((es.completedTrips ?? s.completedOrders ?? 0) as number).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs uppercase text-gray-500 font-semibold">
            Distance Covered
          </p>
          <p className="text-xl font-bold text-gray-800 mt-1">
            {((es.distanceKm ?? 0) as number).toLocaleString()} km
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <p className="text-xs uppercase text-gray-500 font-semibold">
            Cancellation Rate
          </p>
          <p
            className={`text-xl font-bold mt-1 ${(es.cancellationRate ?? 0) > 10 ? "text-red-600" : "text-gray-800"}`}
          >
            {((es.cancellationRate ?? s.cancellationRate ?? 0) as number).toFixed(1)}%
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
          { key: "cod", label: "COD", icon: CreditCard },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
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
                  label="Gross Revenue"
                  value={`₹${(es.grossRevenue || s.grossRevenue || 0).toLocaleString()}`}
                  icon={DollarSign}
                  color="blue"
                  trend={<span className="flex items-center text-green-600 text-xs font-medium"><ArrowUpRight className="w-3 h-3" /> this {period}</span>}
                />
                <FinanceCard
                  label="Net Revenue"
                  value={`₹${(es.netRevenue || s.netRevenue || 0).toLocaleString()}`}
                  icon={TrendingUp}
                  color="green"
                  trend={<span className="text-xs text-gray-500">After expenses & refunds</span>}
                />
                <FinanceCard
                  label="Total Expenses"
                  value={`₹${(es.totalExpenses || 0).toLocaleString()}`}
                  icon={Receipt}
                  color="orange"
                  trend={<span className="text-xs text-gray-500">{es.expenseCount || 0} items</span>}
                />
                <FinanceCard
                  label="Refund Ratio"
                  value={`${(s.refundRatio || 0).toFixed(1)}%`}
                  icon={s.refundRatio > 10 ? TrendingDown : TrendingUp}
                  color={s.refundRatio > 10 ? "red" : "purple"}
                  trend={
                    <span className={`flex items-center text-xs font-medium ${s.refundRatio > 10 ? "text-red-600" : "text-green-600"}`}>
                      {s.refundCount || 0} refunds
                    </span>
                  }
                />
              </div>

              {/* Second row: Enterprise Credit + COD */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinanceCard
                  label="Enterprise Credit Outstanding"
                  value={`₹${(es.enterpriseCreditOutstanding || creditSummary?.totalOutstanding || 0).toLocaleString()}`}
                  icon={Building2}
                  color="purple"
                  trend={<span className="text-xs text-gray-500">{creditSummary?.totalEnterprises || 0} enterprises</span>}
                />
                <FinanceCard
                  label="COD Balance"
                  value={`₹${(es.codBalance || codData?.pendingSettlement || 0).toLocaleString()}`}
                  icon={Banknote}
                  color={codData?.pendingSettlement > 50000 ? "red" : "blue"}
                  trend={<span className="text-xs text-gray-500">{codData?.pendingOrders || 0} pending orders</span>}
                />
                <FinanceCard
                  label="Days Sales Outstanding"
                  value={`${(dsoMetrics?.overallDSO || 0).toFixed(1)} days`}
                  icon={Clock}
                  color={dsoMetrics?.overallDSO > 30 ? "red" : "green"}
                  trend={
                    dsoMetrics?.overallDSO > 30
                      ? <span className="flex items-center text-xs text-red-600"><AlertTriangle className="w-3 h-3 mr-1" /> High DSO</span>
                      : <span className="text-xs text-green-600">Healthy</span>
                  }
                />
                <FinanceCard
                  label="Avg Order Value"
                  value={`₹${(s.avgOrderValue || 0).toFixed(0)}`}
                  icon={BarChart3}
                  color="blue"
                  trend={<span className="text-xs text-gray-500">{s.totalOrders || 0} orders</span>}
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Trend</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data?.dailyRevenue || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                        <Area type="monotone" dataKey="commission" name="Commission" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCommission)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Payment Methods Pie */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Methods</h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={(data?.paymentMethods || []).map((pm: any) => ({ name: pm._id || "Other", value: pm.total }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {(data?.paymentMethods || []).map((_: any, i: number) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`₹${(v || 0).toLocaleString()}`]} />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {(data?.paymentMethods || []).map((pm: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600">{pm._id || "Other"}</span>
                        </div>
                        <span className="font-medium text-gray-800">₹{(pm.total || 0).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
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
                  value={`${(dsoMetrics?.overallDSO || 0).toFixed(1)} days`}
                  icon={Clock}
                  color={dsoMetrics?.overallDSO > 30 ? "red" : "green"}
                  trend={dsoMetrics?.overallDSO > 30 ? <span className="text-xs text-red-600">Above target</span> : <span className="text-xs text-green-600">On track</span>}
                />
                <FinanceCard
                  label="Total Outstanding"
                  value={`₹${(dsoMetrics?.totalOutstanding || 0).toLocaleString()}`}
                  icon={DollarSign}
                  color="orange"
                  trend={<span className="text-xs text-gray-500">{dsoMetrics?.totalInvoices || 0} invoices</span>}
                />
                <FinanceCard
                  label="Overdue Amount"
                  value={`₹${(dsoMetrics?.overdueAmount || 0).toLocaleString()}`}
                  icon={AlertTriangle}
                  color="red"
                  trend={<span className="text-xs text-red-600">{dsoMetrics?.overdueCount || 0} overdue</span>}
                />
                <FinanceCard
                  label="Enterprise Credit Used"
                  value={`₹${(creditSummary?.totalUsed || 0).toLocaleString()}`}
                  icon={Building2}
                  color="purple"
                  trend={<span className="text-xs text-gray-500">of ₹{(creditSummary?.totalLimit || 0).toLocaleString()} limit</span>}
                />
              </div>

              {/* Aging Buckets */}
              {dsoMetrics?.agingBuckets && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Receivables Aging</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dsoMetrics.agingBuckets}>
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

              {/* Overdue Enterprises */}
              {creditSummary?.overdueEnterprises && creditSummary.overdueEnterprises.length > 0 && (
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Overdue Enterprise Accounts</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Enterprise</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Outstanding</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creditSummary.overdueEnterprises.map((ent: any) => (
                          <tr key={ent._id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-800">{ent.companyName}</td>
                            <td className="py-3 px-4 text-right font-medium text-red-600">₹{(ent.outstanding || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 text-right text-gray-600">{ent.daysOverdue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "payouts" && (
            <SmartPayoutsSection
              onExport={() => handleExport("payouts")}
            />
          )}

          {activeTab === "cod" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FinanceCard
                  label="COD Collected (7d)"
                  value={`₹${(codData?.totalCollected || 0).toLocaleString()}`}
                  icon={Banknote}
                  color="green"
                  trend={<span className="text-xs text-gray-500">{codData?.totalCODOrders || 0} orders</span>}
                />
                <FinanceCard
                  label="Pending Settlement"
                  value={`₹${(codData?.pendingSettlement || 0).toLocaleString()}`}
                  icon={CreditCard}
                  color="orange"
                  trend={<span className="text-xs text-gray-500">{codData?.pendingOrders || 0} orders</span>}
                />
                <FinanceCard
                  label="Floating Cash"
                  value={`₹${((codData?.pendingSettlement || 0)).toLocaleString()}`}
                  icon={DollarSign}
                  color={codData?.pendingSettlement > 50000 ? "red" : "blue"}
                  trend={
                    codData?.pendingSettlement > 50000
                      ? <span className="flex items-center text-xs text-red-600"><ArrowDownRight className="w-3 h-3" /> High balance</span>
                      : <span className="text-xs text-gray-500">Normal range</span>
                  }
                />
                <FinanceCard
                  label="COD Orders"
                  value={`${codData?.totalCODOrders || 0}`}
                  icon={BarChart3}
                  color="purple"
                  trend={<span className="text-xs text-gray-500">Last 7 days</span>}
                />
              </div>

              {/* Driver COD Balances */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Driver COD Balances (Top 20)</h3>
                {(codData?.driverCODBalances || []).length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-sm">No outstanding COD balances</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-medium text-gray-500">Driver ID</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Floating Cash</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500">Orders</th>
                        </tr>
                      </thead>
                      <tbody>
                        {codData.driverCODBalances.map((d: any, i: number) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-xs text-gray-600">{d._id}</td>
                            <td className="py-3 px-4 text-right font-medium text-gray-800">
                              ₹{(d.floatingCash || 0).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right text-gray-600">{d.orderCount}</td>
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
  earnings: number;
  cancellation: number;
  payoutStatus: "pending" | "processing" | "paid";
}

const MOCK_DRIVER_EARNINGS: DriverEarningsRow[] = [
  { id: "d1", name: "Kamal Joshi", trips: 42, distance: 312, earnings: 8420, cancellation: 2.3, payoutStatus: "pending" },
  { id: "d2", name: "Ravi Kumar", trips: 38, distance: 280, earnings: 7650, cancellation: 5.1, payoutStatus: "processing" },
  { id: "d3", name: "Suresh Patel", trips: 35, distance: 245, earnings: 7010, cancellation: 1.8, payoutStatus: "paid" },
  { id: "d4", name: "Priya Mehta", trips: 30, distance: 218, earnings: 6240, cancellation: 3.5, payoutStatus: "pending" },
  { id: "d5", name: "Amit Singh", trips: 28, distance: 201, earnings: 5780, cancellation: 8.2, payoutStatus: "pending" },
];

const SmartPayoutsSection: React.FC<{ onExport: () => void }> = ({ onExport }) => {
  const [selected, setSelected] = useState<DriverEarningsRow | null>(null);
  const [autoPayout, setAutoPayout] = useState(false);
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "biweekly">("weekly");
  const [minPayout, setMinPayout] = useState(500);
  const [holdOnCancel, setHoldOnCancel] = useState(true);

  const rows = MOCK_DRIVER_EARNINGS;
  const totalPending = rows
    .filter((r) => r.payoutStatus === "pending")
    .reduce((sum, r) => sum + r.earnings, 0);

  return (
    <div className="space-y-6">
      {/* Smart Payouts automation */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-orange-500" />
            <p className="text-sm font-semibold text-gray-800">Smart Payouts</p>
          </div>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPayout}
              onChange={() => setAutoPayout(!autoPayout)}
              className="rounded"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">Auto Payout</p>
              <p className="text-xs text-gray-500">Process payouts automatically</p>
            </div>
          </label>
          <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700 uppercase">Schedule</p>
            <select
              value={schedule}
              onChange={(e) => setSchedule(e.target.value as "daily" | "weekly" | "biweekly")}
              className="w-full mt-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly (Mon)</option>
              <option value="biweekly">Biweekly</option>
            </select>
          </div>
          <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-700 uppercase">Min Payout (₹)</p>
            <input
              type="number"
              value={minPayout}
              onChange={(e) => setMinPayout(Math.max(0, Number(e.target.value) || 0))}
              className="w-full mt-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-3 border border-gray-100 rounded-xl p-3 bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={holdOnCancel}
              onChange={() => setHoldOnCancel(!holdOnCancel)}
              className="rounded"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">Hold if Cancel &gt; 5%</p>
              <p className="text-xs text-gray-500">Prevent payout to risky drivers</p>
            </div>
          </label>
        </div>
      </div>

      {/* Driver Earnings Table + Payout Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Driver Earnings</p>
            <span className="text-xs text-gray-500">
              Pending: <span className="font-bold text-amber-700">₹{totalPending.toLocaleString()}</span>
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Driver</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Trips</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Distance</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Earnings</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cancel %</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          r.payoutStatus === "paid"
                            ? "bg-green-100 text-green-700"
                            : r.payoutStatus === "processing"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.payoutStatus}
                      </span>
                    </td>
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

              <div className="space-y-2 mt-4">
                <BreakdownRow
                  label="Base earnings"
                  value={`₹${Math.round(selected.earnings * 0.75).toLocaleString()}`}
                />
                <BreakdownRow
                  label="Incentives / Bonus"
                  value={`₹${Math.round(selected.earnings * 0.2).toLocaleString()}`}
                />
                <BreakdownRow
                  label="Surge / Peak"
                  value={`₹${Math.round(selected.earnings * 0.08).toLocaleString()}`}
                />
                <BreakdownRow
                  label="Adjustments"
                  value={`- ₹${Math.round(selected.earnings * 0.03).toLocaleString()}`}
                  tone="red"
                />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button className="flex-1 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600">
                  Process Payout
                </button>
                <button className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200">
                  Adjust
                </button>
              </div>
            </div>
          )}
        </div>
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
