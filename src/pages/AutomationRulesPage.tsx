import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { PAGE_SIZE_OPTIONS, type PageSize } from "../hooks/usePagination";
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

  // Server-side: rules IS the current page
  const paginatedRules = rules;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Automation Rules Engine</h1>
          <p className="text-sm text-gray-500 mt-1">Configure automated triggers, alerts, and actions</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openCreateForm} className="flex items-center gap-2 px-4 py-2 bg-movezy-600 text-white rounded-lg hover:bg-movezy-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            Create Rule
          </button>
          <button onClick={() => loadData(page, limit)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
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
                    <button onClick={() => handleToggle(rule._id)} className="p-1.5 rounded-lg hover:bg-gray-100">
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
    </div>
  );
};

export default AutomationRulesPage;
