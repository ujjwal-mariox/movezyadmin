// src/pages/SupportTickets.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  MessageSquare,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Car,
  Send,
  X,
  Phone,
  Users as UsersIcon,
  CreditCard,
  Settings as SettingsIcon,
  ShieldAlert,
  Zap,
  Link2,
  Package,
  History,
  ArrowUpCircle,
  Copy,
  XCircle,
  Lock,
  Timer,
  Sparkles,
} from "lucide-react";
import type {
  SupportTicket,
  SupportMessage,
  SupportTicketType,
  SupportResolutionType,
  SupportChannel,
} from "../types/admin";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import {
  fetchSupportTickets,
  fetchSupportTicket,
  fetchSupportStats,
  replySupportTicket,
  updateSupportTicketStatus,
  escalateSupportTicket,
  assignSupportTicket,
  fetchQuickReplies,
  markQuickReplyUsed,
  type QuickReplyItem,
} from "../services/api";
import { useAuth } from "../auth/useAuth";

type TicketType = SupportTicketType;
type ResolutionType = SupportResolutionType;
type ThreadChannel = SupportChannel;

type ExtTicket = SupportTicket;

const getName = (ref: unknown): string | undefined => {
  if (!ref) return undefined;
  if (typeof ref === "string") return undefined;
  const obj = ref as { fullName?: string; name?: string };
  return obj.fullName || obj.name;
};

const getPhone = (ref: unknown): string | undefined => {
  if (!ref || typeof ref === "string") return undefined;
  const obj = ref as { mobileNumber?: string; phone?: string };
  return obj.mobileNumber || obj.phone;
};

const getId = (ref: unknown): string | undefined => {
  if (!ref) return undefined;
  if (typeof ref === "string") return ref;
  return (ref as { _id?: string })._id;
};

const typeMeta: Record<TicketType, { label: string; icon: React.ElementType; tone: string }> = {
  CUSTOMER: { label: "Customer", icon: UsersIcon, tone: "bg-blue-50 text-blue-700 border-blue-200" },
  DRIVER: { label: "Driver", icon: Car, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PAYMENT: { label: "Payment", icon: CreditCard, tone: "bg-amber-50 text-amber-700 border-amber-200" },
  TECHNICAL: { label: "Technical", icon: SettingsIcon, tone: "bg-purple-50 text-purple-700 border-purple-200" },
};

const subCategoriesByType: Record<TicketType, string[]> = {
  CUSTOMER: ["Booking Issue", "Refund", "Feedback", "Cancellation"],
  DRIVER: ["Payment", "Onboarding", "Document", "Vehicle"],
  PAYMENT: ["Gateway", "Refund", "Wallet", "Invoice"],
  TECHNICAL: ["App Crash", "Login", "GPS", "Notification"],
};

const priorityConfig: Record<string, { dot: string; label: string; slaMin: number; pill: string }> = {
  URGENT: { dot: "bg-red-500", label: "Urgent", slaMin: 30, pill: "bg-red-100 text-red-800" },
  HIGH: { dot: "bg-orange-500", label: "High", slaMin: 120, pill: "bg-orange-100 text-orange-800" },
  MEDIUM: { dot: "bg-yellow-500", label: "Medium", slaMin: 480, pill: "bg-yellow-100 text-yellow-800" },
  LOW: { dot: "bg-green-500", label: "Low", slaMin: 1440, pill: "bg-green-100 text-green-800" },
};

const DEFAULT_QUICK_REPLIES = [
  "Thank you for reaching out. I'm looking into this now.",
  "Could you please share your booking ID?",
  "I've escalated this to the payments team.",
  "Your refund has been processed and should reflect in 5-7 business days.",
  "Apologies for the inconvenience. I'll get this resolved shortly.",
];

const SupportTickets: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ExtTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TicketType>("ALL");
  const [selectedTicket, setSelectedTicket] = useState<ExtTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [channel, setChannel] = useState<ThreadChannel>("CUSTOMER");
  const [now, setNow] = useState(Date.now());
  const [quickReplies, setQuickReplies] = useState<QuickReplyItem[]>([]);
  const [sending, setSending] = useState(false);
  const [backendStats, setBackendStats] = useState<{
    slaBreached?: number;
    escalated?: number;
    new24h?: number;
    avgResolutionMinutes?: number;
  } | null>(null);

  // Live SLA countdown tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSupportTickets({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
        type: typeFilter !== "ALL" ? (typeFilter as TicketType) : undefined,
        search: searchQuery || undefined,
        page: 0,
        limit: 100,
      });
      const data = res?.data ?? res;
      if (data?.tickets) setTickets(data.tickets as ExtTicket[]);
      else setTickets([]);
    } catch (e) {
      console.error("[Support] loadTickets failed", e);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, typeFilter, searchQuery]);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetchSupportStats();
      const s = res?.data?.stats ?? res?.stats;
      if (s) setBackendStats(s);
    } catch (e) {
      console.error("[Support] loadStats failed", e);
    }
  }, []);

  const loadQuickReplies = useCallback(async () => {
    try {
      const res = await fetchQuickReplies({ isActive: true });
      const data = res?.data?.replies ?? res?.replies;
      if (Array.isArray(data)) setQuickReplies(data);
    } catch (e) {
      console.error("[Support] loadQuickReplies failed", e);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    loadStats();
    loadQuickReplies();
  }, [loadStats, loadQuickReplies]);

  const loadMessages = useCallback(async (ticketId: string, ch: ThreadChannel) => {
    try {
      const res = await fetchSupportTicket(ticketId, ch);
      const data = res?.data ?? res;
      if (data?.messages) setMessages(data.messages as SupportMessage[]);
      else setMessages([]);
    } catch (e) {
      console.error("[Support] loadMessages failed", e);
      setMessages([]);
    }
  }, []);

  // Open each ticket on the channel its messages actually live on. A driver's
  // thread is always on DRIVER, so defaulting to CUSTOMER showed staff an empty
  // thread and — worse — posted their reply to a channel the driver never reads.
  // Key off driverId, NOT type: inferTicketType checks category first, so a
  // driver's "payment" ticket is type PAYMENT but still uses the DRIVER channel.
  useEffect(() => {
    if (selectedTicket) {
      setChannel(selectedTicket.driverId ? "DRIVER" : "CUSTOMER");
    }
  }, [selectedTicket]);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.ticketId, channel);
    } else {
      setMessages([]);
    }
  }, [selectedTicket, channel, loadMessages]);

  const filteredTickets = tickets;

  const {
    paginatedData: paginatedTickets,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems,
    startIndex,
    endIndex,
    pageSize,
    setPageSize,
  } = usePagination(filteredTickets, 10);

  const stats = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "OPEN").length,
      inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
      urgent: tickets.filter(
        (t) => t.priority === "URGENT" && t.status !== "RESOLVED" && t.status !== "CLOSED",
      ).length,
      resolved: tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED").length,
      breaching:
        backendStats?.slaBreached ??
        tickets.filter((t) => {
          if (t.status === "RESOLVED" || t.status === "CLOSED") return false;
          const sla = t.slaMinutes ?? priorityConfig[t.priority]?.slaMin ?? 240;
          const elapsed = (now - new Date(t.createdAt).getTime()) / 60000;
          return elapsed > sla * 0.75;
        }).length,
    }),
    [tickets, now, backendStats],
  );

  const getPriorityColor = (priority: string) =>
    priorityConfig[priority]?.pill ?? "bg-gray-100 text-gray-800";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "WAITING_FOR_USER":
        return "bg-purple-100 text-purple-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getSLAInfo = (ticket: ExtTicket) => {
    const sla = ticket.slaMinutes ?? priorityConfig[ticket.priority]?.slaMin ?? 240;
    const elapsedMs = now - new Date(ticket.createdAt).getTime();
    const remainingMs = sla * 60_000 - elapsedMs;
    const remainingMin = Math.floor(remainingMs / 60_000);
    const pct = Math.max(0, Math.min(100, (remainingMs / (sla * 60_000)) * 100));
    let tone = "text-green-600 bg-green-50 border-green-200";
    let bar = "bg-green-500";
    if (remainingMin < 0) {
      tone = "text-red-700 bg-red-50 border-red-200";
      bar = "bg-red-500";
    } else if (remainingMin < sla * 0.25) {
      tone = "text-orange-700 bg-orange-50 border-orange-200";
      bar = "bg-orange-500";
    } else if (remainingMin < sla * 0.5) {
      tone = "text-yellow-700 bg-yellow-50 border-yellow-200";
      bar = "bg-yellow-500";
    }
    const label =
      remainingMin < 0
        ? `Breached ${Math.abs(remainingMin)}m`
        : remainingMin < 60
          ? `${remainingMin}m left`
          : `${Math.floor(remainingMin / 60)}h ${remainingMin % 60}m left`;
    return { remainingMin, pct, tone, bar, label };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket || sending) return;
    const text = newMessage.trim();
    setSending(true);
    try {
      const res = await replySupportTicket(selectedTicket.ticketId, {
        message: text,
        channel,
      });
      if (res?.success !== false) {
        setNewMessage("");
        await loadMessages(selectedTicket.ticketId, channel);
        await loadTickets();
        const fresh = await fetchSupportTicket(selectedTicket.ticketId, channel);
        const t = fresh?.data?.ticket ?? fresh?.ticket;
        if (t) setSelectedTicket(t as ExtTicket);
      }
    } catch (e) {
      console.error("[Support] reply failed", e);
    } finally {
      setSending(false);
    }
  };

  const handleQuickReply = async (reply: QuickReplyItem | string) => {
    if (typeof reply === "string") {
      setNewMessage(reply);
      return;
    }
    setNewMessage(reply.body);
    try {
      await markQuickReplyUsed(reply._id);
    } catch {
      /* ignore — telemetry only */
    }
  };

  const applyResolution = async (resolutionType: ResolutionType) => {
    if (!selectedTicket) return;
    try {
      if (resolutionType === "ESCALATED") {
        await escalateSupportTicket(
          selectedTicket.ticketId,
          "Escalated from support console",
        );
      } else {
        await updateSupportTicketStatus(selectedTicket.ticketId, {
          status: "RESOLVED",
          resolutionType,
        });
      }
      await loadTickets();
      const fresh = await fetchSupportTicket(selectedTicket.ticketId, channel);
      const t = fresh?.data?.ticket ?? fresh?.ticket;
      if (t) setSelectedTicket(t as ExtTicket);
    } catch (e) {
      console.error("[Support] resolve failed", e);
    }
  };

  // Assign the selected ticket to the logged-in admin. Previously tickets were
  // permanently "Unassigned" — the assign API existed but nothing in the UI
  // ever called it. The backend defaults assignee to the token's admin when no
  // adminId is sent, so we just pass our display name/role for the label.
  const handleAssignToMe = async () => {
    if (!selectedTicket) return;
    try {
      await assignSupportTicket(selectedTicket.ticketId, {
        staffName: user?.name,
        staffRole: user?.roleName,
      });
      await loadTickets();
      const fresh = await fetchSupportTicket(selectedTicket.ticketId, channel);
      const t = fresh?.data?.ticket ?? fresh?.ticket;
      if (t) setSelectedTicket(t as ExtTicket);
    } catch (e) {
      console.error("[Support] assign failed", e);
    }
  };

  const typedMessages = messages as (SupportMessage & { channel?: ThreadChannel })[];
  const visibleMessages = typedMessages.filter((m) => (m.channel ?? "CUSTOMER") === channel);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <MessageSquare className="w-7 h-7 text-movezy-500" />
            Support Tickets
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Classify, assign, resolve — track every ticket across SLA, threads and linked entities
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Open</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{stats.open}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-yellow-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">In Progress</p>
              <p className="mt-1 text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-yellow-50 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-red-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Urgent</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{stats.urgent}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg animate-pulse">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-orange-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">SLA Breaching</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">{stats.breaching}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-orange-50 rounded-lg">
              <Timer className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resolved</p>
              <p className="mt-1 text-2xl font-bold text-green-600">{stats.resolved}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Classification tabs */}
      <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-movezy-500" />
          <span className="text-sm font-semibold text-gray-700">Ticket Classification</span>
          <span className="text-xs text-gray-400">· Auto-routed by type · subcategory drives SLA</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === "ALL"
                ? "bg-movezy-50 border-movezy-300 text-movezy-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All Types
          </button>
          {(Object.keys(typeMeta) as TicketType[]).map((t) => {
            const meta = typeMeta[t];
            const count = tickets.filter((x) => x.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  typeFilter === t ? meta.tone : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <meta.icon className="w-3.5 h-3.5" />
                {meta.label}
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 bg-white rounded-full">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        {typeFilter !== "ALL" && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide mr-1">Sub-categories:</span>
            {subCategoriesByType[typeFilter].map((s) => (
              <span key={s} className="px-2 py-0.5 text-[11px] font-medium text-gray-600 bg-gray-100 rounded">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_USER">Waiting</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="ALL">All Priority</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No tickets found</div>
            ) : (
              paginatedTickets.map((ticket) => {
                const sla = getSLAInfo(ticket);
                const Meta = ticket.type ? typeMeta[ticket.type] : null;
                return (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTicket?._id === ticket._id
                        ? "bg-movezy-50 border-l-4 border-movezy-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono text-gray-500">{ticket.ticketId}</span>
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${priorityConfig[ticket.priority]?.dot}`} />
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                    <p className="font-medium text-gray-800 text-sm mb-1 line-clamp-1">
                      {ticket.subject}
                    </p>
                    {(() => {
                      // Show WHO filed the ticket. Customer tickets populate
                      // userId; driver tickets populate driverId. Falling back
                      // across both means driver tickets no longer render blank.
                      const who =
                        getName(ticket.userId) ||
                        getName(ticket.driverId) ||
                        (ticket.type === "DRIVER" ? "Driver" : "Customer");
                      const phone =
                        getPhone(ticket.userId) || getPhone(ticket.driverId);
                      return (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-1.5">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="font-medium truncate">{who}</span>
                          {phone && (
                            <span className="text-gray-400">· {phone}</span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      {Meta && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${Meta.tone}`}>
                          <Meta.icon className="w-3 h-3" />
                          {Meta.label}
                        </span>
                      )}
                      <span>{getTimeAgo(ticket.createdAt)}</span>
                      {ticket.repeatCount && ticket.repeatCount >= 2 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-700 bg-red-50 border border-red-200">
                          <History className="w-3 h-3" />
                          Repeat ×{ticket.repeatCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                      {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${sla.tone}`}>
                          <Timer className="w-3 h-3" />
                          {sla.label}
                        </span>
                      )}
                    </div>
                    {ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                      <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${sla.bar} transition-all`}
                          style={{ width: `${sla.pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {!loading && filteredTickets.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemLabel="tickets"
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {selectedTicket ? (
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-500">
                        {selectedTicket.ticketId}
                      </span>
                      {selectedTicket.type && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${typeMeta[selectedTicket.type].tone}`}>
                          {React.createElement(typeMeta[selectedTicket.type].icon, { className: "w-3 h-3" })}
                          {typeMeta[selectedTicket.type].label}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                        <span className={`inline-block w-2 h-2 rounded-full mr-1 ${priorityConfig[selectedTicket.priority]?.dot}`} />
                        {selectedTicket.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace("_", " ")}
                      </span>
                      {selectedTicket.escalated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                          <ArrowUpCircle className="w-3 h-3" />
                          Escalated
                        </span>
                      )}
                      {(selectedTicket.repeatCount ?? 0) >= 2 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-red-700 bg-red-50 border border-red-200">
                          <History className="w-3 h-3" />
                          Repeat issue ×{selectedTicket.repeatCount}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800">{selectedTicket.subject}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedTicket.category} • {selectedTicket.subcategory}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 lg:hidden"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* SLA Strip */}
                {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (() => {
                  const sla = getSLAInfo(selectedTicket);
                  return (
                    <div className={`p-3 rounded-lg border ${sla.tone}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                          <Timer className="w-3.5 h-3.5" />
                          SLA · {selectedTicket.slaMinutes ?? priorityConfig[selectedTicket.priority]?.slaMin}m target
                        </span>
                        <span className="text-xs font-bold">{sla.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div className={`h-full ${sla.bar} transition-all`} style={{ width: `${sla.pct}%` }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Assigned Staff + Contact */}
                {(() => {
                  const contactName =
                    getName(selectedTicket.userId) ||
                    getName(selectedTicket.driverId) ||
                    selectedTicket.user?.name ||
                    selectedTicket.driver?.name;
                  const contactPhone =
                    getPhone(selectedTicket.userId) ||
                    getPhone(selectedTicket.driverId) ||
                    selectedTicket.user?.phone ||
                    selectedTicket.driver?.phone;
                  const assignedName =
                    selectedTicket.assignedStaffName ||
                    getName(selectedTicket.assignedTo) ||
                    "Unassigned";
                  const isCustomer = !!selectedTicket.userId;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3.5 h-3.5 text-movezy-500" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {selectedTicket.assignedAt ? "Assigned" : "Unassigned"}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800">{assignedName}</p>
                        {selectedTicket.assignedStaffRole && (
                          <p className="text-xs text-gray-500">
                            {selectedTicket.assignedStaffRole}
                          </p>
                        )}
                        {!selectedTicket.assignedAt && (
                          <button
                            onClick={handleAssignToMe}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-movezy-600 text-white text-xs font-semibold hover:bg-movezy-700 transition-colors"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Assign to me
                          </button>
                        )}
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-movezy-100 rounded-full flex items-center justify-center">
                            {isCustomer ? (
                              <User className="w-4 h-4 text-movezy-600" />
                            ) : (
                              <Car className="w-4 h-4 text-movezy-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800">{contactName || "—"}</p>
                            <p className="text-xs text-gray-500">{contactPhone || "No phone"}</p>
                          </div>
                        </div>
                        {contactPhone && (
                          <a
                            href={`tel:${contactPhone}`}
                            className="p-2 bg-movezy-500 text-white rounded-lg hover:bg-movezy-600"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Linked Entities */}
                {(() => {
                  const linked = selectedTicket.linked;
                  const bookingRef = selectedTicket.bookingId;
                  const orderLabel =
                    linked?.orderId ||
                    (typeof bookingRef === "object" ? bookingRef?.bookingNumber : bookingRef) ||
                    undefined;
                  const customerLabel =
                    linked?.customerId || getId(selectedTicket.userId) || undefined;
                  const driverLabel =
                    linked?.driverId || getId(selectedTicket.driverId) || undefined;
                  const paymentLabel = linked?.paymentId;
                  const hasAny = orderLabel || customerLabel || driverLabel || paymentLabel;
                  if (!hasAny) return null;
                  return (
                    <div className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Link2 className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Linked Data
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {orderLabel && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-blue-700 bg-blue-50 border border-blue-200">
                            <Package className="w-3 h-3" /> Order · {String(orderLabel).slice(-10)}
                          </span>
                        )}
                        {driverLabel && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-emerald-700 bg-emerald-50 border border-emerald-200">
                            <Car className="w-3 h-3" /> Driver · {String(driverLabel).slice(-10)}
                          </span>
                        )}
                        {customerLabel && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-purple-700 bg-purple-50 border border-purple-200">
                            <User className="w-3 h-3" /> Customer · {String(customerLabel).slice(-10)}
                          </span>
                        )}
                        {paymentLabel && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-amber-700 bg-amber-50 border border-amber-200">
                            <CreditCard className="w-3 h-3" /> Payment · {String(paymentLabel).slice(-10)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Timeline */}
                <div className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timeline</span>
                  </div>
                  <div className="flex items-center justify-between relative">
                    {[
                      { label: "Created", time: selectedTicket.createdAt, done: true },
                      { label: "Assigned", time: selectedTicket.assignedAt, done: !!selectedTicket.assignedAt },
                      { label: "Responded", time: selectedTicket.respondedAt, done: !!selectedTicket.respondedAt },
                      { label: "Resolved", time: selectedTicket.resolvedAt, done: !!selectedTicket.resolvedAt },
                    ].map((step, idx) => (
                      <div key={step.label} className="flex-1 flex flex-col items-center relative">
                        {idx > 0 && (
                          <div className={`absolute top-2.5 right-1/2 w-full h-0.5 ${step.done ? "bg-green-400" : "bg-gray-200"}`} />
                        )}
                        <div
                          className={`relative z-10 w-5 h-5 rounded-full border-2 ${
                            step.done ? "bg-green-500 border-green-500" : "bg-white border-gray-300"
                          } flex items-center justify-center`}
                        >
                          {step.done && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <p className={`mt-1 text-[10px] font-semibold ${step.done ? "text-gray-700" : "text-gray-400"}`}>
                          {step.label}
                        </p>
                        {step.time && (
                          <p className="text-[10px] text-gray-400">{getTimeAgo(step.time)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Channel Tabs */}
                <div className="flex gap-2 border-b border-gray-100 -mb-1">
                  {([
                    { key: "CUSTOMER" as const, label: "Customer", icon: User },
                    { key: "DRIVER" as const, label: "Driver", icon: Car },
                    { key: "INTERNAL" as const, label: "Internal", icon: Lock },
                  ]).map((ch) => {
                    const count = typedMessages.filter((m) => (m.channel ?? "CUSTOMER") === ch.key).length;
                    return (
                      <button
                        key={ch.key}
                        onClick={() => setChannel(ch.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                          channel === ch.key
                            ? "border-movezy-500 text-movezy-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <ch.icon className="w-3.5 h-3.5" />
                        {ch.label}
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 bg-gray-100 rounded-full">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 min-h-[240px]">
                {visibleMessages.length === 0 ? (
                  <div className="text-center text-xs text-gray-400 py-8">
                    No messages in this channel yet.
                  </div>
                ) : (
                  visibleMessages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`flex ${msg.senderType === "ADMIN" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-xl p-3 ${
                          channel === "INTERNAL"
                            ? "bg-yellow-50 border border-yellow-200 text-gray-800"
                            : msg.senderType === "ADMIN"
                              ? "bg-movezy-500 text-white"
                              : msg.senderType === "SYSTEM"
                                ? "bg-gray-200 text-gray-600"
                                : "bg-white text-gray-800 shadow-sm"
                        }`}
                      >
                        <p className={`text-xs font-medium mb-1 ${msg.senderType === "ADMIN" && channel !== "INTERNAL" ? "text-movezy-100" : "text-gray-500"}`}>
                          {msg.senderName || msg.senderType}
                          {channel === "INTERNAL" && (
                            <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-800 bg-yellow-100 rounded">
                              <Lock className="w-2.5 h-2.5" />
                              Internal note
                            </span>
                          )}
                        </p>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${msg.senderType === "ADMIN" && channel !== "INTERNAL" ? "text-movezy-100" : "text-gray-400"}`}>
                          {getTimeAgo(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== "RESOLVED" && selectedTicket.status !== "CLOSED" && (
                <div className="p-4 border-t border-gray-100 space-y-3">
                  {/* Quick Replies */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      Quick replies:
                    </span>
                    {quickReplies.length > 0
                      ? quickReplies
                          .filter(
                            (r) => !selectedTicket.type || !r.type || r.type === selectedTicket.type,
                          )
                          .slice(0, 6)
                          .map((r) => (
                            <button
                              key={r._id}
                              onClick={() => handleQuickReply(r)}
                              title={r.body}
                              className="flex-shrink-0 px-2.5 py-1 text-xs text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 whitespace-nowrap"
                            >
                              {r.title.length > 32 ? r.title.slice(0, 30) + "…" : r.title}
                            </button>
                          ))
                      : DEFAULT_QUICK_REPLIES.map((qr, i) => (
                          <button
                            key={i}
                            onClick={() => handleQuickReply(qr)}
                            className="flex-shrink-0 px-2.5 py-1 text-xs text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 whitespace-nowrap"
                          >
                            {qr.length > 38 ? qr.slice(0, 36) + "…" : qr}
                          </button>
                        ))}
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={
                        channel === "INTERNAL"
                          ? "Write an internal note (not visible to customer)..."
                          : `Reply to ${channel === "CUSTOMER" ? "customer" : "driver"}...`
                      }
                      className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-movezy-500 ${
                        channel === "INTERNAL" ? "border-yellow-300 bg-yellow-50" : "border-gray-200"
                      }`}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="px-5 py-3 bg-movezy-500 text-white rounded-lg hover:bg-movezy-600 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Resolution actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide self-center mr-1">
                      Resolve as:
                    </span>
                    <button
                      onClick={() => applyResolution("RESOLVED")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolved
                    </button>
                    <button
                      onClick={() => applyResolution("REJECTED")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 text-white rounded-lg text-xs font-medium hover:bg-gray-700"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Rejected
                    </button>
                    <button
                      onClick={() => applyResolution("DUPLICATE")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => applyResolution("ESCALATED")}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700"
                    >
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      Escalate
                    </button>
                    {(selectedTicket.repeatCount ?? 0) >= 2 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Repeat pattern detected
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 min-h-[400px]">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>Select a ticket to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupportTickets;
