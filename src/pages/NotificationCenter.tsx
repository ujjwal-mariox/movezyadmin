// src/pages/NotificationCenter.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Send,
  Users,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  Megaphone,
  BellRing,
  Siren,
  Zap,
  Filter,
  Bike,
  UserCircle,
  Calendar,
  TrendingUp,
  Sparkles,
  X,
  Building2,
} from "lucide-react";
import {
  fetchNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  sendNotificationBroadcast,
  fetchNotificationHistory,
  fetchNotificationAnalytics,
  type NotificationTemplate,
  type NotificationCampaign,
  type NotificationAudience,
  type NotificationType,
} from "../services/api";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

type TemplateFormState = {
  _id?: string;
  name: string;
  code: string;
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  tags: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  isActive: boolean;
};

const EMPTY_TEMPLATE: TemplateFormState = {
  name: "",
  code: "",
  title: "",
  body: "",
  type: "PROMO",
  audience: "ALL",
  tags: "",
  priority: "NORMAL",
  isActive: true,
};

const NotificationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"send" | "templates" | "history">(
    "send",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sendAudience, setSendAudience] = useState<NotificationAudience>("ALL");
  const [sendType, setSendType] = useState<NotificationType>("SYSTEM");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [sending, setSending] = useState(false);

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(EMPTY_TEMPLATE);
  const [templateSaving, setTemplateSaving] = useState(false);

  // Smart filter state (history filters)
  const [filterAudience, setFilterAudience] =
    useState<"ALL" | NotificationAudience>("ALL");
  const [filterType, setFilterType] = useState<"ALL" | NotificationType>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SENT" | "SENDING" | "FAILED">(
    "ALL",
  );

  // Automation toggle state (UI-only for now)
  const [automations, setAutomations] = useState({
    expiryReminder: true,
    delayAlert: true,
    dailySummary: false,
  });

  const toggleAutomation = (key: keyof typeof automations) => {
    setAutomations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Data state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [history, setHistory] = useState<NotificationCampaign[]>([]);
  const [analytics, setAnalytics] = useState<{
    sent24h: number;
    sent7d: number;
    totalSent: number;
    totalRead: number;
    readRate: number;
    byType: Array<{ _id: string; count: number }>;
    recentCampaigns: NotificationCampaign[];
  } | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetchNotificationTemplates();
    if (res?.success) setTemplates(res.data?.templates ?? []);
  }, []);

  const loadHistory = useCallback(async () => {
    const res = await fetchNotificationHistory({
      audience: filterAudience === "ALL" ? undefined : filterAudience,
      type: filterType === "ALL" ? undefined : filterType,
      status: filterStatus === "ALL" ? undefined : filterStatus,
      page: 0,
      limit: 100,
    });
    if (res?.success) setHistory(res.data?.campaigns ?? res.data?.history ?? []);
  }, [filterAudience, filterType, filterStatus]);

  const loadAnalytics = useCallback(async () => {
    const res = await fetchNotificationAnalytics();
    if (res?.success) setAnalytics(res.data);
  }, []);

  useEffect(() => {
    loadTemplates();
    loadAnalytics();
  }, [loadTemplates, loadAnalytics]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const healthMetrics = useMemo(() => {
    const byTypeMap = new Map<string, number>();
    (analytics?.byType ?? []).forEach((b) => byTypeMap.set(b._id, b.count));
    return {
      unread: Math.max((analytics?.totalSent ?? 0) - (analytics?.totalRead ?? 0), 0),
      announcements: byTypeMap.get("SYSTEM") ?? 0,
      reminders: byTypeMap.get("BOOKING") ?? 0,
      alerts:
        (byTypeMap.get("PAYMENT") ?? 0) +
        (byTypeMap.get("CHAT") ?? 0) +
        (byTypeMap.get("REWARD") ?? 0),
    };
  }, [analytics]);

  const topCategories = useMemo(() => {
    const byType = analytics?.byType ?? [];
    return byType
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map((b) => ({ label: b._id, count: b.count }));
  }, [analytics]);

  const handleSend = async () => {
    if (!title || !body) return;
    setSending(true);
    try {
      const res = await sendNotificationBroadcast({
        title,
        body,
        type: sendType,
        audience: sendAudience,
        templateId: selectedTemplateId,
      });
      if (res?.success) {
        setTitle("");
        setBody("");
        setSelectedTemplateId(undefined);
        loadAnalytics();
        loadHistory();
        alert(`Broadcast dispatched to ${res.data?.targetedCount ?? 0} recipients`);
      } else {
        alert(res?.message || "Failed to send notification");
      }
    } catch (err) {
      alert((err as Error).message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const handleUseTemplate = (template: NotificationTemplate) => {
    setTitle(template.title);
    setBody(template.body);
    setSendType(template.type);
    setSendAudience(template.audience);
    setSelectedTemplateId(template._id);
    setActiveTab("send");
  };

  const openTemplateCreate = () => {
    setTemplateForm(EMPTY_TEMPLATE);
    setShowTemplateModal(true);
  };

  const openTemplateEdit = (t: NotificationTemplate) => {
    setTemplateForm({
      _id: t._id,
      name: t.name,
      code: t.code,
      title: t.title,
      body: t.body,
      type: t.type,
      audience: t.audience,
      tags: (t.tags ?? []).join(", "),
      priority: t.priority ?? "NORMAL",
      isActive: t.isActive,
    });
    setShowTemplateModal(true);
  };

  const saveTemplate = async () => {
    if (!templateForm.name || !templateForm.code || !templateForm.title || !templateForm.body) {
      alert("Name, code, title and body are required");
      return;
    }
    setTemplateSaving(true);
    try {
      const payload: Partial<NotificationTemplate> = {
        name: templateForm.name,
        code: templateForm.code.toUpperCase(),
        title: templateForm.title,
        body: templateForm.body,
        type: templateForm.type,
        audience: templateForm.audience,
        priority: templateForm.priority,
        tags: templateForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isActive: templateForm.isActive,
      };
      const res = templateForm._id
        ? await updateNotificationTemplate(templateForm._id, payload)
        : await createNotificationTemplate(payload);
      if (res?.success) {
        setShowTemplateModal(false);
        loadTemplates();
      } else {
        alert(res?.message || "Failed to save template");
      }
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    const res = await deleteNotificationTemplate(id);
    if (res?.success) loadTemplates();
    else alert(res?.message || "Failed to delete template");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const {
    paginatedData: paginatedTemplates,
    currentPage: templatesPage,
    totalPages: templatesTotalPages,
    setCurrentPage: setTemplatesPage,
    totalItems: templatesTotalItems,
    startIndex: templatesStart,
    endIndex: templatesEnd,
    pageSize: templatesPageSize,
    setPageSize: setTemplatesPageSize,
  } = usePagination(templates, 10);

  const {
    paginatedData: paginatedHistory,
    currentPage: historyPage,
    totalPages: historyTotalPages,
    setCurrentPage: setHistoryPage,
    totalItems: historyTotalItems,
    startIndex: historyStart,
    endIndex: historyEnd,
    pageSize: historyPageSize,
    setPageSize: setHistoryPageSize,
  } = usePagination(history, 10);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Bell className="w-7 h-7 text-movezy-500" />
            Notification Center
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Send push notifications, manage templates and automate outbound messaging
          </p>
        </div>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unread</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{healthMetrics.unread}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-purple-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Announcements</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">{healthMetrics.announcements}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg">
              <Megaphone className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reminders</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{healthMetrics.reminders}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-lg">
              <BellRing className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-red-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Alerts</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{healthMetrics.alerts}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg">
              <Siren className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Smart Filters */}
      <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Smart Filters</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Audience</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "ALL", label: "All", icon: Users },
                { value: "DRIVERS", label: "Drivers", icon: Bike },
                { value: "USERS", label: "Users", icon: UserCircle },
                { value: "ENTERPRISES", label: "Enterprises", icon: Building2 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterAudience(opt.value as typeof filterAudience)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filterAudience === opt.value
                      ? "bg-movezy-50 border-movezy-300 text-movezy-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <opt.icon className="w-3.5 h-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "ALL", label: "All" },
                { value: "BOOKING", label: "Booking" },
                { value: "PAYMENT", label: "Payment" },
                { value: "PROMO", label: "Promo" },
                { value: "SYSTEM", label: "System" },
                { value: "REWARD", label: "Reward" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value as typeof filterType)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filterType === opt.value
                      ? "bg-movezy-50 border-movezy-300 text-movezy-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "ALL", label: "All" },
                { value: "SENT", label: "Sent" },
                { value: "SENDING", label: "Sending" },
                { value: "FAILED", label: "Failed" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value as typeof filterStatus)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filterStatus === opt.value
                      ? "bg-movezy-50 border-movezy-300 text-movezy-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {topCategories.length > 0 && (
          <div className="pt-4 mt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top Categories</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((cat) => (
                <span
                  key={cat.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-full"
                >
                  {cat.label}
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 bg-white rounded-full">
                    {cat.count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Automation Layer */}
      <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-700">Automation Layer</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-full uppercase tracking-wide">
              <Sparkles className="w-3 h-3" />
              Auto-send
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            {
              key: "expiryReminder" as const,
              icon: Calendar,
              tone: "blue",
              title: "Document expiry reminder",
              desc: "Send reminder 3 days before a driver document expires",
            },
            {
              key: "delayAlert" as const,
              icon: AlertCircle,
              tone: "red",
              title: "Delay alert",
              desc: "Auto-notify customer & ops when an order is delayed",
            },
            {
              key: "dailySummary" as const,
              icon: TrendingUp,
              tone: "green",
              title: "Daily performance summary",
              desc: "Send enterprise partners a daily KPI rollup",
            },
          ].map((rule) => {
            const active = automations[rule.key];
            const toneMap: Record<string, string> = {
              blue: "bg-blue-50 text-blue-600",
              red: "bg-red-50 text-red-600",
              green: "bg-green-50 text-green-600",
            };
            return (
              <div
                key={rule.key}
                className={`p-4 border rounded-xl transition-all ${
                  active ? "border-movezy-300 bg-movezy-50/30" : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${toneMap[rule.tone]}`}>
                    <rule.icon className="w-4 h-4" />
                  </div>
                  <button
                    onClick={() => toggleAutomation(rule.key)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      active ? "bg-movezy-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        active ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-800">{rule.title}</p>
                <p className="mt-1 text-xs text-gray-500">{rule.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="border-b border-gray-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab("send")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "send"
                  ? "text-movezy-600 border-b-2 border-movezy-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Send className="w-4 h-4" />
                Send Notification
              </div>
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "templates"
                  ? "text-movezy-600 border-b-2 border-movezy-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" />
                Templates
              </div>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === "history"
                  ? "text-movezy-600 border-b-2 border-movezy-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                History
              </div>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Send Tab */}
          {activeTab === "send" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { value: "ALL", label: "All", icon: Users },
                    { value: "USERS", label: "Users", icon: UserCircle },
                    { value: "DRIVERS", label: "Drivers", icon: Bike },
                    { value: "ENTERPRISES", label: "Enterprises", icon: Building2 },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSendAudience(option.value as NotificationAudience)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        sendAudience === option.value
                          ? "border-movezy-500 bg-movezy-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <option.icon
                        className={`w-6 h-6 mx-auto mb-2 ${
                          sendAudience === option.value
                            ? "text-movezy-600"
                            : "text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          sendAudience === option.value
                            ? "text-movezy-600"
                            : "text-gray-600"
                        }`}
                      >
                        {option.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Notification Type
                </label>
                <select
                  value={sendType}
                  onChange={(e) => setSendType(e.target.value as NotificationType)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                >
                  <option value="SYSTEM">System</option>
                  <option value="PROMO">Promo</option>
                  <option value="BOOKING">Booking</option>
                  <option value="PAYMENT">Payment</option>
                  <option value="REWARD">Reward</option>
                  <option value="CHAT">Chat</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Notification Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  maxLength={100}
                />
                <p className="mt-1 text-xs text-gray-400">
                  {title.length}/100 characters
                </p>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Notification Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter notification message..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  maxLength={500}
                />
                <p className="mt-1 text-xs text-gray-400">
                  {body.length}/500 characters
                </p>
              </div>

              {selectedTemplateId && (
                <div className="flex items-center gap-2 p-3 text-xs text-movezy-700 bg-movezy-50 rounded-lg">
                  <FileText className="w-3.5 h-3.5" />
                  Using template —
                  <button
                    onClick={() => setSelectedTemplateId(undefined)}
                    className="underline"
                  >
                    clear
                  </button>
                </div>
              )}

              {/* Preview */}
              {(title || body) && (
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">
                    Preview
                  </label>
                  <div className="p-4 bg-gray-100 rounded-xl">
                    <div className="max-w-xs p-4 bg-white rounded-lg shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-movezy-500">
                          <Bell className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xs text-gray-500">Movezy</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800">
                        {title || "Notification Title"}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {body || "Notification body message..."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={!title || !body || sending}
                className="flex items-center justify-center w-full gap-2 px-6 py-3 text-white bg-movezy-500 rounded-xl hover:bg-movezy-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Notification
                  </>
                )}
              </button>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === "templates" && (
            <div>
              <div className="flex justify-end mb-4">
                <button
                  onClick={openTemplateCreate}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-movezy-500 rounded-xl hover:bg-movezy-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Template
                </button>
              </div>
              {paginatedTemplates.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No templates yet. Create one to speed up recurring sends.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {paginatedTemplates.map((template) => (
                    <div
                      key={template._id}
                      className="p-4 border border-gray-100 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-gray-800">{template.name}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-movezy-100 text-movezy-700">
                              {template.type}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              {template.audience}
                            </span>
                            {!template.isActive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openTemplateEdit(template)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template._id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mb-1 text-sm font-medium text-gray-700">
                        {template.title}
                      </p>
                      <p className="mb-3 text-sm text-gray-500 line-clamp-2">
                        {template.body}
                      </p>
                      <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                        <span className="font-mono">{template.code}</span>
                        <span>{template.useCount ?? 0} uses</span>
                      </div>
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Pagination
                currentPage={templatesPage}
                totalPages={templatesTotalPages}
                onPageChange={setTemplatesPage}
                totalItems={templatesTotalItems}
                startIndex={templatesStart}
                endIndex={templatesEnd}
                itemLabel="templates"
                pageSize={templatesPageSize}
                onPageSizeChange={setTemplatesPageSize}
              />
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className="overflow-x-auto">
              {paginatedHistory.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-500">
                  No broadcasts match the current filters.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Notification
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Audience
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Targeted
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Sent
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Failed
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Read
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedHistory.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-800">{item.title}</p>
                          <p className="max-w-xs text-sm text-gray-500 truncate">
                            {item.body}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-600">{item.audience}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-gray-800">
                            {(item.targetedCount ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-green-600">
                            {(item.sentCount ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-red-600">
                            {(item.failedCount ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-blue-600">
                            {(item.readCount ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              item.status === "SENT"
                                ? "bg-green-50 text-green-700"
                                : item.status === "FAILED"
                                  ? "bg-red-50 text-red-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-gray-500">
                            {formatDate(item.sentAt || item.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <Pagination
                currentPage={historyPage}
                totalPages={historyTotalPages}
                onPageChange={setHistoryPage}
                totalItems={historyTotalItems}
                startIndex={historyStart}
                endIndex={historyEnd}
                itemLabel="notifications"
                pageSize={historyPageSize}
                onPageSizeChange={setHistoryPageSize}
              />
            </div>
          )}
        </div>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {templateForm._id ? "Edit Template" : "New Template"}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Code</label>
                  <input
                    type="text"
                    value={templateForm.code}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 font-mono text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                    placeholder="WELCOME_OFFER"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Title</label>
                <input
                  type="text"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                />
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Body</label>
                <textarea
                  value={templateForm.body}
                  onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Type</label>
                  <select
                    value={templateForm.type}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        type: e.target.value as NotificationType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                  >
                    <option value="SYSTEM">System</option>
                    <option value="PROMO">Promo</option>
                    <option value="BOOKING">Booking</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="REWARD">Reward</option>
                    <option value="CHAT">Chat</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Audience</label>
                  <select
                    value={templateForm.audience}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        audience: e.target.value as NotificationAudience,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                  >
                    <option value="ALL">All</option>
                    <option value="USERS">Users</option>
                    <option value="DRIVERS">Drivers</option>
                    <option value="ENTERPRISES">Enterprises</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Priority</label>
                  <select
                    value={templateForm.priority}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        priority: e.target.value as TemplateFormState["priority"],
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block mb-1.5 text-xs font-medium text-gray-600 uppercase tracking-wide">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={templateForm.tags}
                  onChange={(e) => setTemplateForm({ ...templateForm, tags: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500"
                  placeholder="promo, new-user, seasonal"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={templateForm.isActive}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, isActive: e.target.checked })
                  }
                />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveTemplate}
                disabled={templateSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-movezy-500 rounded-lg hover:bg-movezy-600 disabled:opacity-50"
              >
                {templateSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
