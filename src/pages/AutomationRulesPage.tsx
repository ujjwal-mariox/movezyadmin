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
  CheckCircle,
  Eye,
  Workflow,
  FileCheck,
  DollarSign,
  Bell,
} from "lucide-react";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useDialog } from "../components/Layout/Dialog";

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

// GET /admin/automation/trigger-types returns all 7 trigger types with no
// indication of which ones the engine can actually act on. Only these three are
// in IMPLEMENTED_TRIGGERS (backend/src/services/automation-engine.service.ts:31-35);
// runAllRules() pushes every other type onto `skipped` and continues (line 285-288)
// and evaluateTrigger() returns [] for them, so a rule built on COD Collection
// Delay / Order Spike / SOS Spike / Revenue Drop can never fire. They were still
// offered in the dropdown and the saved rule was badged "Active".
// The server's own flag is preferred as soon as the endpoint sends one.
const ENGINE_IMPLEMENTED_TRIGGERS = new Set<string>([
  "cancellation_rate",
  "low_rating_consecutive",
  "driver_idle",
]);

type TriggerTypeOption = {
  type?: string;
  label?: string;
  // getTriggerTypes sends this; the local set below is the fallback for an
  // older backend.
  implemented?: boolean;
};

const isTriggerTypeEvaluated = (t?: TriggerTypeOption | string | null): boolean => {
  if (typeof t === "string") return ENGINE_IMPLEMENTED_TRIGGERS.has(t);
  if (t && typeof t.implemented === "boolean") return t.implemented;
  return ENGINE_IMPLEMENTED_TRIGGERS.has(String(t?.type ?? ""));
};

// getTriggerTypes now names driver_idle's metric "idle_minutes", matching what
// the engine actually compares. Rules saved while the server still advertised
// "idle_days" keep that metric string, so the alias stays: printing the raw name
// made an operator read the threshold 1440x wrong.
const METRIC_LABELS: Record<string, string> = {
  idle_days: "idle_minutes",
};

const metricLabel = (m?: string) => (m ? METRIC_LABELS[m] ?? m : "—");

const AutomationRulesPage: React.FC = () => {
  const dialog = useDialog();
  const [rules, setRules] = useState<any[]>([]);
  const [ruleTotals, setRuleTotals] = useState<{
    totalRules: number;
    activeRules: number;
    activeEvaluated: number;
    totalTriggerCount: number;
  } | null>(null);
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

  // Category filter
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
      // Cross-page health figures. Null on an older backend, in which case the
      // tiles fall back to summing the current page and say so.
      setRuleTotals(rulesRes.data?.totals ?? null);
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

  // Which trigger types the engine actually evaluates. Prefer the server's flag if
  // it starts sending one; fall back to the engine list while triggerTypes is still
  // loading so a rule is never optimistically labelled as evaluated.
  const evaluatedTriggerTypes = useMemo(() => {
    const set = new Set<string>();
    triggerTypes.forEach((t: TriggerTypeOption) => {
      if (isTriggerTypeEvaluated(t)) set.add(String(t.type));
    });
    return set.size ? set : new Set<string>(ENGINE_IMPLEMENTED_TRIGGERS);
  }, [triggerTypes]);

  const isRuleEvaluated = useCallback(
    (rule: { trigger?: { type?: string } } | null | undefined) =>
      evaluatedTriggerTypes.has(String(rule?.trigger?.type)),
    [evaluatedTriggerTypes],
  );

  // Whether the trigger currently chosen in the form can actually fire. While
  // triggerTypes is still loading there is nothing to classify against, so fall
  // back to the engine list instead of warning about an unknown trigger.
  const selectedTriggerEvaluated = useMemo(() => {
    const t = triggerTypes.find((x: TriggerTypeOption) => x.type === formTriggerType);
    return t ? isTriggerTypeEvaluated(t) : ENGINE_IMPLEMENTED_TRIGGERS.has(formTriggerType);
  }, [triggerTypes, formTriggerType]);

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
  // "Active" alone overstated the engine's reach: an isActive rule on an
  // unimplemented trigger is skipped on every sweep. Count only rules that are both
  // enabled and evaluated, and report the enabled-but-never-evaluated ones separately.
  //
  // getAllRules now sends `totals` computed over every rule matching the filter,
  // so these are platform-wide. The per-page sums remain as the fallback for an
  // older backend, and `isPlatformWide` decides which label the tiles carry —
  // a page total under a platform-wide caption is the failure to avoid.
  const healthMetrics = useMemo(() => {
    const enabled = rules.filter((r) => r.isActive);
    const live = enabled.filter((r) => isRuleEvaluated(r)).length;
    const enabledNotEvaluated = enabled.length - live;
    const totalTriggers = rules.reduce((sum, r) => sum + (r.triggerCount ?? 0), 0);

    if (ruleTotals) {
      return {
        live: ruleTotals.activeEvaluated,
        enabledNotEvaluated: Math.max(
          0,
          ruleTotals.activeRules - ruleTotals.activeEvaluated,
        ),
        totalTriggers: ruleTotals.totalTriggerCount,
        isPlatformWide: true,
      };
    }
    return { live, enabledNotEvaluated, totalTriggers, isPlatformWide: false };
  }, [rules, isRuleEvaluated, ruleTotals]);

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
    const ok = await dialog.confirm({ title: "Delete rule?", message: "This automation rule will be permanently removed.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    await fetchApi(`/admin/automation/rules/${id}`, { method: "DELETE" });
    loadData(page, limit);
  };

  const openCreateForm = () => {
    setEditingRule(null);
    setFormName("");
    setFormDescription("");
    // Never default to a trigger the engine ignores.
    setFormTriggerType(
      triggerTypes.find((t: TriggerTypeOption) => isTriggerTypeEvaluated(t))?.type ||
        "cancellation_rate",
    );
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
            Configure triggers and preview action flows from a single console
          </p>
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

      {/* Health Strip */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Live Rules{healthMetrics.isPlatformWide ? "" : " (this page)"}
              </p>
              <p className="mt-1 text-2xl font-bold text-green-600">{healthMetrics.live}</p>
              {healthMetrics.enabledNotEvaluated > 0 && (
                <p className="mt-1 text-[11px] text-amber-700">
                  +{healthMetrics.enabledNotEvaluated} enabled but not evaluated by the
                  engine
                </p>
              )}
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Total Triggers{healthMetrics.isPlatformWide ? "" : " (this page)"}
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{healthMetrics.totalTriggers}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600" />
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
        {/* Presets only cover triggers the engine evaluates. "COD Delay Warning" was
            removed: cod_collection_delay is not in IMPLEMENTED_TRIGGERS, so that
            one-click rule could never fire.
            "Idle Driver Nudge" now says MINUTES with a threshold of 60, because the
            engine compares `now - threshold * 60 * 1000` against the driver's last GPS
            update (automation-engine.service.ts:136-148). The old preset said
            "> 7 days" and saved threshold 7, i.e. 7 minutes — a 1440x error that
            nudged every online driver whose app had been backgrounded for 8 minutes. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            // Each preset carries its own window/count. They used to share a
            // hardcoded 7-day / 5-ride pair, so the form a preset opened did
            // not match the sentence on the card that opened it.
            { label: "High Cancellation Alert", trigger: "cancellation_rate", threshold: 30, op: "gt", action: "flag_driver", windowDays: 7, consecutive: 5, desc: "If cancellation rate > 30% in a week → auto-flag driver" },
            { label: "Low Rating Escalation", trigger: "low_rating_consecutive", threshold: 3, op: "lt", action: "escalate_to_admin", windowDays: 30, consecutive: 5, desc: "If rating < 3 stars for 5 consecutive rides in 30 days → escalate" },
            { label: "Idle Driver Nudge", trigger: "driver_idle", threshold: 60, op: "gt", action: "send_push_notification", windowDays: 1, consecutive: 5, desc: "If no GPS update for > 60 minutes while online → send push notification" },
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
                setFormTimeWindow(preset.windowDays);
                setFormConsecutive(preset.consecutive);
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
            // Enabled is not the same as running: the engine skips rules whose trigger
            // type it does not implement, so those must not read as "Active".
            const evaluated = isRuleEvaluated(rule);
            const live = !!rule.isActive && evaluated;
            return (
              <div key={rule._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${live ? "bg-green-100" : "bg-gray-100"}`}>
                      <TriggerIcon className={`w-5 h-5 ${live ? "text-green-600" : "text-gray-400"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-800">{rule.name}</h4>
                        {!evaluated ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800"
                            title="The automation engine does not evaluate this trigger type, so this rule never fires"
                          >
                            Not evaluated
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${rule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </span>
                        )}
                      </div>
                      {rule.description && <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          <strong>IF</strong> {metricLabel(rule.trigger?.metric)} {OPERATOR_LABELS[rule.trigger?.operator] || rule.trigger?.operator} {rule.trigger?.threshold}
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
                      {triggerTypes.map((t: TriggerTypeOption) => {
                        const evaluated = isTriggerTypeEvaluated(t);
                        return (
                          <option key={t.type} value={t.type} disabled={!evaluated}>
                            {t.label}
                            {evaluated ? "" : " — not evaluated yet"}
                          </option>
                        );
                      })}
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
                    <label className="block text-xs text-gray-500 mb-1">
                      Threshold{formTriggerType === "driver_idle" ? " (minutes)" : ""}
                    </label>
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

                {/* Editing an existing rule can still land on an unimplemented trigger
                    (the option stays selectable as the current value), so warn here too. */}
                {!!formTriggerType && !selectedTriggerEvaluated && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-xs font-semibold text-red-800">
                      This trigger is not evaluated by the automation engine
                    </p>
                    <p className="mt-1 text-[11px] text-red-700">
                      The rule will be saved and listed, but it can never fire. Pick a
                      trigger without the "not evaluated yet" marker.
                    </p>
                  </div>
                )}

                {formTriggerType === "driver_idle" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-semibold text-amber-800">
                      Threshold is in MINUTES for this trigger
                    </p>
                    <p className="mt-1 text-[11px] text-amber-700">
                      The engine matches drivers who are marked online and whose last GPS
                      update is older than <strong>threshold minutes</strong> — not days,
                      despite the trigger description. Enter 60 for one hour of GPS
                      silence. The operator is also ignored for this trigger: it always
                      matches drivers idle for longer than the threshold.
                    </p>
                  </div>
                )}
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
            {!isRuleEvaluated(previewRule) && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">This flow never runs</p>
                <p className="mt-1 text-[11px] text-amber-700">
                  The automation engine does not evaluate the{" "}
                  <strong>{previewRule.trigger?.type}</strong> trigger, so the action below
                  is never taken.
                </p>
              </div>
            )}
            <div className="space-y-3">
              <div className="p-4 border border-blue-200 bg-blue-50 rounded-lg">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">When (Trigger)</p>
                <p className="text-sm font-medium text-gray-800">
                  {metricLabel(previewRule.trigger?.metric)} {OPERATOR_LABELS[previewRule.trigger?.operator]} {previewRule.trigger?.threshold}
                </p>
                {previewRule.trigger?.type === "driver_idle" && (
                  <p className="mt-1 text-xs text-blue-800">
                    Minutes since the driver's last GPS update, while marked online.
                  </p>
                )}
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
