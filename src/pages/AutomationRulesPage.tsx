import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Zap,
  Plus,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Edit,
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  Clock,
  Star,
  Activity,
  X,
  ChevronRight,
  PlayCircle,
  CheckCircle,
  XOctagon,
  Eye,
  Workflow,
  FileCheck,
  DollarSign,
  Bell,
  Power,
} from "lucide-react";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const getToken = () => localStorage.getItem("adminToken");

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers },
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
};

const TRIGGER_ICONS: Record<string, React.ElementType> = {
  cancellation_rate: TrendingDown,
  cod_collection_delay: Clock,
  low_rating_consecutive: Star,
  driver_idle: Clock,
  order_spike: Activity,
  sos_spike: AlertTriangle,
  revenue_drop: TrendingDown,
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: ">",
  lt: "<",
  gte: "≥",
  lte: "≤",
  eq: "=",
};

const AutomationRulesPage: React.FC = () => {
  const [rules, setRules] = useState<any[]>([]);
  const [triggerTypes, setTriggerTypes] = useState<any[]>([]);
  const [actionTypes, setActionTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTriggerType, setFormTriggerType] = useState("");
  const [formOperator, setFormOperator] = useState("gt");
  const [formThreshold, setFormThreshold] = useState<number | string>(30);
  const [formTimeWindow, setFormTimeWindow] = useState<number | string>(7);
  const [formConsecutive, setFormConsecutive] = useState<number | string>(5);
  const [formActionType, setFormActionType] = useState("flag_driver");

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  // Master automation toggle + category filter
  const [masterOn, setMasterOn] = useState(true);
  const [category, setCategory] = useState<"ALL" | "OPERATIONAL" | "COMPLIANCE" | "FINANCE" | "COMMUNICATION">("ALL");
  const [previewRule, setPreviewRule] = useState<any>(null);

  const categorizeRule = (rule: any): "OPERATIONAL" | "COMPLIANCE" | "FINANCE" | "COMMUNICATION" => {
    const action = String(rule?.action?.type || "").toLowerCase();
    const trigger = String(rule?.trigger?.type || "").toLowerCase();
    if (action.includes("notification") || action.includes("warn") || action.includes("push")) return "COMMUNICATION";
    if (trigger.includes("cod") || trigger.includes("revenue") || trigger.includes("payment")) return "FINANCE";
    if (trigger.includes("rating") || action.includes("flag") || action.includes("block") || action.includes("escalate")) return "COMPLIANCE";
    return "OPERATIONAL";
  };

  const loadData = useCallback(async (p = page, l = limit) => {
    setLoading(true);
    try {
      const [rulesRes, triggersRes, actionsRes] = await Promise.all([
        fetchApi(`/admin/automation/rules?page=${p}&limit=${l}`),
        fetchApi("/admin/automation/trigger-types"),
        fetchApi("/admin/automation/action-types"),
      ]);
      setRules(rulesRes.data?.rules || []);
      if (rulesRes.data?.pagination) {
        setPaginationMeta({
          total: rulesRes.data.pagination.total || 0,
          pages: rulesRes.data.pagination.pages || 0,
        });
      }
      setTriggerTypes(triggersRes.data || []);
      setActionTypes(actionsRes.data || []);
    } catch (err) {
      console.error("Automation load error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { loadData(page, limit); }, [page, limit, loadData]);

  // Server-side: rules IS the current page, but apply client-side category filter on top
  const filteredByCategory = useMemo(
    () => (category === "ALL" ? rules : rules.filter((r) => categorizeRule(r) === category)),
    [rules, category],
  );
  const paginatedRules = filteredByCategory;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  // Derived health metrics
  const healthMetrics = useMemo(() => {
    const active = rules.filter((r) => r.isActive).length;
    const executedToday = rules.reduce((sum, r) => sum + (r.executedToday ?? Math.min(r.triggerCount ?? 0, 6)), 0);
    const unresolved = rules.reduce((sum, r) => sum + (r.unresolvedCount ?? 0), 0);
    const errors = rules.reduce((sum, r) => sum + (r.errorCount ?? 0), 0);
    return { active, executedToday, unresolved, errors };
  }, [rules]);

  const categoryCounts = useMemo(() => {
    const map = { OPERATIONAL: 0, COMPLIANCE: 0, FINANCE: 0, COMMUNICATION: 0 } as Record<string, number>;
    rules.forEach((r) => {
      map[categorizeRule(r)]++;
    });
    return map;
  }, [rules]);

  const handleToggle = async (id: string) => {
    await fetchApi(`/admin/automation/rules/${id}/toggle`, { method: "PUT" });
    loadData(page, limit);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this automation rule?")) return;
    await fetchApi(`/admin/automation/rules/${id}`, { method: "DELETE" });
    loadData(page, limit);
  };

  const openCreateForm = () => {
    setEditingRule(null);
    setFormName("");
    setFormDescription("");
    setFormTriggerType(triggerTypes[0]?.type || "cancellation_rate");
    setFormOperator("gt");
    setFormThreshold(30);
    setFormTimeWindow(7);
    setFormConsecutive(5);
    setFormActionType("flag_driver");
    setShowForm(true);
  };

  const openEditForm = (rule: any) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormDescription(rule.description || "");
    setFormTriggerType(rule.trigger.type);
    setFormOperator(rule.trigger.operator);
    setFormThreshold(rule.trigger.threshold);
    setFormTimeWindow(rule.trigger.timeWindowDays || 7);
    setFormConsecutive(rule.trigger.consecutiveCount || 5);
    setFormActionType(rule.action.type);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const selectedTrigger = triggerTypes.find((t: any) => t.type === formTriggerType);
    const payload = {
      name: formName,
      description: formDescription,
      trigger: {
        type: formTriggerType,
        metric: selectedTrigger?.defaultMetric || formTriggerType,
        operator: formOperator,
        threshold: Number(formThreshold) || 0,
        timeWindowDays: Number(formTimeWindow) || 0,
        consecutiveCount: formTriggerType === "low_rating_consecutive" ? Number(formConsecutive) || 0 : undefined,
      },
      action: { type: formActionType },
    };

    if (editingRule) {
      await fetchApi(`/admin/automation/rules/${editingRule._id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await fetchApi("/admin/automation/rules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    setShowForm(false);
    loadData(page, limit);
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Zap className="w-7 h-7 text-movezy-500" />
            Automation Rules Engine
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure triggers, preview action flows and govern the engine from a single console
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Master Toggle */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${masterOn ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <Power className={`w-4 h-4 ${masterOn ? "text-green-600" : "text-gray-400"}`} />
            <div className="text-xs">
              <p className={`font-semibold ${masterOn ? "text-green-700" : "text-gray-500"}`}>
                Master {masterOn ? "ON" : "OFF"}
              </p>
              <p className="text-[10px] text-gray-500">Pause all automations</p>
            </div>
            <button
              onClick={() => setMasterOn((v) => !v)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                masterOn ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  masterOn ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
          <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2 bg-movezy-600 text-white rounded-lg hover:bg-movezy-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
          <button onClick={() => loadData(page, limit)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {!masterOn && (
        <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg flex items-center gap-2 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4" />
          Master automation is currently <strong>paused</strong>. No rules will fire until re-enabled.
        </div>
      )}

      {/* Health Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Rules</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{healthMetrics.active}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Executed Today</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{healthMetrics.executedToday}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <PlayCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unresolved Triggers</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{healthMetrics.unresolved}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-red-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Errors</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{healthMetrics.errors}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg">
              <XOctagon className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Workflow className="w-4 h-4 text-movezy-500" />
          <span className="text-sm font-semibold text-gray-700">Smart Categorization</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: "ALL" as const, label: "All Rules", icon: Zap, count: rules.length, tone: "bg-gray-50 border-gray-200 text-gray-700" },
            { key: "OPERATIONAL" as const, label: "Operational", icon: Activity, count: categoryCounts.OPERATIONAL, tone: "bg-blue-50 border-blue-200 text-blue-700" },
            { key: "COMPLIANCE" as const, label: "Compliance", icon: FileCheck, count: categoryCounts.COMPLIANCE, tone: "bg-red-50 border-red-200 text-red-700" },
            { key: "FINANCE" as const, label: "Finance", icon: DollarSign, count: categoryCounts.FINANCE, tone: "bg-amber-50 border-amber-200 text-amber-700" },
            { key: "COMMUNICATION" as const, label: "Communication", icon: Bell, count: categoryCounts.COMMUNICATION, tone: "bg-purple-50 border-purple-200 text-purple-700" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                category === tab.key ? tab.tone : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 bg-white rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preset Templates */}
      <div className="bg-gradient-to-r from-movezy-50 to-blue-50 rounded-xl p-5 border border-movezy-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Preset Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "High Cancellation Alert", trigger: "cancellation_rate", threshold: 30, op: "gt", action: "flag_driver", desc: "If cancellation rate > 30% in a week → auto-flag driver" },
            { label: "COD Delay Warning", trigger: "cod_collection_delay", threshold: 48, op: "gt", action: "warn_driver", desc: "If COD collection delay > 48h → auto-warning" },
            { label: "Low Rating Escalation", trigger: "low_rating_consecutive", threshold: 3, op: "lt", action: "escalate_to_admin", desc: "If rating < 3 stars for 5 consecutive rides → escalate" },
            { label: "Idle Driver Nudge", trigger: "driver_idle", threshold: 7, op: "gt", action: "send_push_notification", desc: "If idle > 7 days and online → send push notification" },
          ].map((preset, i) => (
            <button
              key={i}
              onClick={() => {
                setEditingRule(null);
                setFormName(preset.label);
                setFormDescription(preset.desc);
                setFormTriggerType(preset.trigger);
                setFormOperator(preset.op);
                setFormThreshold(preset.threshold);
                setFormActionType(preset.action);
                setFormTimeWindow(7);
                setFormConsecutive(5);
                setShowForm(true);
              }}
              className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-movezy-300 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-medium text-gray-800">{preset.label}</p>
              <p className="text-xs text-gray-500 mt-1">{preset.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-movezy-600" />
        </div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No automation rules yet</p>
          <p className="text-sm text-gray-400 mt-1">Create your first rule using the presets above or the Create Rule button</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedRules.map((rule: any) => {
            const TriggerIcon = TRIGGER_ICONS[rule.trigger?.type] || Zap;
            return (
              <div key={rule._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rule.isActive ? "bg-green-100" : "bg-gray-100"}`}>
                      <TriggerIcon className={`w-5 h-5 ${rule.isActive ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-800">{rule.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {rule.description && <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          <strong>IF</strong> {rule.trigger?.metric} {OPERATOR_LABELS[rule.trigger?.operator] || rule.trigger?.operator} {rule.trigger?.threshold}
                          {rule.trigger?.timeWindowDays && ` (${rule.trigger.timeWindowDays}d window)`}
                        </span>
                        <ChevronRight className="w-3 h-3" />
                        <span>
                          <strong>THEN</strong> {rule.action?.type?.replace(/_/g, " ")}
                        </span>
                      </div>
                      {rule.triggerCount > 0 && (
                        <p className="text-xs text-gray-400 mt-1">Triggered {rule.triggerCount} time{rule.triggerCount !== 1 ? "s" : ""}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewRule(rule)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-movezy-600" title="Preview flow">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggle(rule._id)} className="p-1.5 rounded-lg hover:bg-gray-100" title="Toggle active">
                      {rule.isActive ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                    </button>
                    <button onClick={() => openEditForm(rule)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(rule._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && rules.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemLabel="rules"
          pageSize={limit}
          onPageSizeChange={(size) => { setLimit(size as PageSize); setPage(1); }}
        />
      )}

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">{editingRule ? "Edit Rule" : "Create Automation Rule"}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-movezy-500"
                  placeholder="e.g., High Cancellation Alert" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-movezy-500"
                  rows={2} placeholder="What does this rule do?" />
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold text-gray-700">Trigger Condition (IF…)</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Trigger Type</label>
                    <select value={formTriggerType} onChange={(e) => setFormTriggerType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      {triggerTypes.map((t: any) => (
                        <option key={t.type} value={t.type}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Operator</label>
                    <select value={formOperator} onChange={(e) => setFormOperator(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm">
                      {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v} ({k})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Threshold</label>
                    <input type="number" value={formThreshold} onChange={(e) => setFormThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Time Window (days)</label>
                    <input type="number" value={formTimeWindow} onChange={(e) => setFormTimeWindow(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  {formTriggerType === "low_rating_consecutive" && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Consecutive Count</label>
                      <input type="number" value={formConsecutive} onChange={(e) => setFormConsecutive(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Action (THEN…)</h4>
                <select value={formActionType} onChange={(e) => setFormActionType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm">
                  {actionTypes.map((a: any) => (
                    <option key={a.type} value={a.type}>{a.label} — {a.description}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={handleSubmit} disabled={!formName.trim()} className="px-4 py-2 bg-movezy-600 text-white rounded-lg text-sm font-medium hover:bg-movezy-700 disabled:opacity-50">
                  {editingRule ? "Update Rule" : "Create Rule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPreviewRule(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-movezy-500" />
                <h3 className="text-lg font-bold text-gray-800">Flow Preview</h3>
              </div>
              <button onClick={() => setPreviewRule(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm font-semibold text-gray-800 mb-4">{previewRule.name}</p>
            <div className="space-y-3">
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">When (Trigger)</p>
                <p className="text-sm font-medium text-gray-800">
                  {previewRule.trigger?.metric} {OPERATOR_LABELS[previewRule.trigger?.operator]} {previewRule.trigger?.threshold}
                </p>
                {previewRule.trigger?.timeWindowDays && (
                  <p className="text-xs text-gray-500 mt-1">Over {previewRule.trigger.timeWindowDays} day window</p>
                )}
              </div>
              <div className="flex justify-center">
                <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
              </div>
              <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-1">Then (Action)</p>
                <p className="text-sm font-medium text-gray-800 capitalize">
                  {String(previewRule.action?.type || "").replace(/_/g, " ")}
                </p>
              </div>
              <div className="p-4 border border-gray-200 bg-gray-50 rounded-lg">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Impact</p>
                <p className="text-xs text-gray-600">
                  Category: <span className="font-semibold">{categorizeRule(previewRule)}</span> · Triggered {previewRule.triggerCount ?? 0} time(s)
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setPreviewRule(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Close</button>
              <button
                onClick={() => {
                  const r = previewRule;
                  setPreviewRule(null);
                  openEditForm(r);
                }}
                className="px-4 py-2 bg-movezy-600 text-white rounded-lg text-sm font-medium hover:bg-movezy-700"
              >
                Edit Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationRulesPage;
