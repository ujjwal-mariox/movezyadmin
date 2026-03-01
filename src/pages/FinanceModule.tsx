import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Download,
  CreditCard,
  BarChart3,
  PieChart,
  Banknote,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
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
} from "recharts";

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

const FinanceModule: React.FC = () => {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [codData, setCodData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "payouts" | "cod">("overview");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [finance, cod] = await Promise.all([
        fetchApi(`/admin/finance/overview?period=${period}`),
        fetchApi("/admin/finance/cod-summary"),
      ]);
      setData(finance.data);
      setCodData(cod.data);
    } catch (err) {
      console.error("Finance load error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async (type: string) => {
    try {
      const result = await fetchApi(`/admin/finance/export?type=${type}&format=csv`);
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

  const s = data?.summary || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Finance & Insights</h1>
          <p className="text-sm text-gray-500 mt-1">Revenue, payouts, and financial analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(["week", "month", "year"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => handleExport("revenue")}
            className="flex items-center gap-2 px-4 py-2 bg-movezy-600 text-white rounded-lg hover:bg-movezy-700 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: "overview", label: "Revenue Overview", icon: BarChart3 },
          { key: "payouts", label: "Payouts", icon: Banknote },
          { key: "cod", label: "COD Management", icon: CreditCard },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
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
                  value={`₹${(s.grossRevenue || 0).toLocaleString()}`}
                  icon={DollarSign}
                  color="blue"
                  trend={<span className="flex items-center text-green-600 text-xs font-medium"><ArrowUpRight className="w-3 h-3" /> this {period}</span>}
                />
                <FinanceCard
                  label="Net Revenue"
                  value={`₹${(s.netRevenue || 0).toLocaleString()}`}
                  icon={TrendingUp}
                  color="green"
                  trend={<span className="text-xs text-gray-500">After refunds</span>}
                />
                <FinanceCard
                  label="Total Commission"
                  value={`₹${(s.totalCommission || 0).toLocaleString()}`}
                  icon={PieChart}
                  color="orange"
                  trend={<span className="text-xs text-gray-500">{s.totalOrders || 0} orders</span>}
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

              {/* Avg Order Value + Order Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Average Order Value</h4>
                  <p className="text-3xl font-bold text-gray-800">₹{(s.avgOrderValue || 0).toFixed(0)}</p>
                  <p className="text-sm text-gray-500 mt-1">This {period}</p>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Total Orders</h4>
                  <p className="text-3xl font-bold text-gray-800">{(s.totalOrders || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-1">This {period}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "payouts" && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Driver Payouts</h3>
                  <button
                    onClick={() => handleExport("payouts")}
                    className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
                <div className="text-center py-12 text-gray-400">
                  <Banknote className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Payout data will appear here once payments are processed</p>
                  <p className="text-xs mt-1">Connect your payment gateway to enable automated payouts</p>
                </div>
              </div>
            </div>
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

export default FinanceModule;
