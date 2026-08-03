// src/pages/EnterpriseManagement.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Search,
  Check,
  X,
  ChevronDown,
  Eye,
  Ban,
  IndianRupee,
  MessageSquare,
  FileText,
  Plus,
  Trash2,
  Save,
  GripVertical,
  Edit2,
  AlertTriangle,
  TrendingUp,
  Phone,
  Mail,
  CreditCard,
  Sliders,
  Activity,
} from "lucide-react";
import type { Enterprise } from "../types/admin";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import {
  fetchEnterprises,
  createEnterprise,
  updateEnterprise,
  deleteEnterprise,
  approveEnterprise,
  rejectEnterprise,
  suspendEnterprise,
  fetchEnterpriseInquiries,
  updateEnterpriseInquiry,
  deleteEnterpriseInquiry,
  fetchEnterpriseContent,
  updateEnterpriseContent,
  type EnterpriseInquiryData,
  type EnterpriseContentData,
  type EnterpriseFeatureData,
  type EnterpriseFaqData,
  type EnterpriseClientData,
} from "../services/api";
import { enterpriseCreditApi } from "../services/admin-api";
import { useDialog } from "../components/Layout/Dialog";

// ─── Tab definitions ───
type TabId = "accounts" | "inquiries" | "content";
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "accounts", label: "Enterprise Accounts", icon: <Building2 className="w-4 h-4" /> },
  { id: "inquiries", label: "Inquiries", icon: <MessageSquare className="w-4 h-4" /> },
  { id: "content", label: "Page Content", icon: <FileText className="w-4 h-4" /> },
];

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────
const EnterpriseManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>("accounts");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Enterprise Management</h2>
          <p className="text-sm text-gray-500">Manage corporate accounts, inquiries, and page content</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "accounts" && <AccountsTab />}
      {activeTab === "inquiries" && <InquiriesTab />}
      {activeTab === "content" && <ContentTab />}
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Accounts Tab (full CRUD for enterprise accounts)
// ────────────────────────────────────────────────────────────
const EMPTY_FORM: Partial<Enterprise> = {
  companyName: "", gstin: "", contactPerson: "", email: "", phone: "",
  address: "", city: "", state: "", pincode: "",
  creditLimit: 0, discountPercentage: 0, paymentTerms: 30,
};

const AccountsTab: React.FC = () => {
  const dialog = useDialog();
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEnterprise, setSelectedEnterprise] = useState<Enterprise | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Enterprise>>(EMPTY_FORM);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Approve, reject, suspend
  const [creditLimit, setCreditLimit] = useState<number | string>(50000);
  const [discountPct, setDiscountPct] = useState<number | string>(0);
  const [paymentTerms, setPaymentTerms] = useState<number | string>(30);
  const [rejectReason, setRejectReason] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  const loadEnterprises = useCallback(async (p: number, l: number) => {
    try {
      setLoading(true);
      const res = await fetchEnterprises(
        statusFilter !== "ALL" ? statusFilter : undefined,
        searchQuery || undefined,
        p,
        l,
      );
      if (res.success) {
        const list = Array.isArray(res.data) ? res.data : res.data?.enterprises ?? [];
        setEnterprises(list);
        if (res.data?.pagination) {
          setPaginationMeta({
            total: res.data.pagination.total || 0,
            pages: res.data.pagination.pages || 0,
          });
        }
      }
    } catch (err) {
      console.error("Failed to load enterprises", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Single useEffect: reset page on filter change, otherwise fetch
  const prevFiltersRef = React.useRef({ searchQuery, statusFilter });
  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.searchQuery !== searchQuery ||
      prevFiltersRef.current.statusFilter !== statusFilter;
    prevFiltersRef.current = { searchQuery, statusFilter };
    if (filtersChanged && page !== 1) {
      setPage(1);
    } else {
      loadEnterprises(page, limit);
    }
  }, [page, limit, searchQuery, statusFilter, loadEnterprises]);

  // Server-side provides the page directly
  const paginatedEnterprises = enterprises;
  const entTotalItems = paginationMeta.total;
  const entTotalPages = paginationMeta.pages;
  const entStart = entTotalItems === 0 ? 0 : (page - 1) * limit + 1;
  const entEnd = Math.min(page * limit, entTotalItems);

  const stats = {
    total: paginationMeta.total,
    pending: enterprises.filter((e) => e.status === "PENDING").length,
    approved: enterprises.filter((e) => e.status === "APPROVED").length,
    suspended: enterprises.filter((e) => e.status === "SUSPENDED").length,
  };

  // Credit-risk & revenue derived metrics from loaded page
  const creditRiskEnterprises = enterprises.filter((e) => {
    if (e.status !== "APPROVED" || !e.creditLimit || e.creditLimit <= 0) return false;
    const used = e.usedCredit || 0;
    return used / e.creditLimit > 0.85;
  });
  // usedCredit is credit drawn and NOT yet repaid (CREDIT_REPAID reduces it,
  // enterprise-credit.controller.ts adjustCredit), so summing it gives money
  // owed — not revenue earned. The card used to print this same sum as "Revenue
  // Contribution"; there is no revenue figure on this endpoint to print instead.
  const approvedOnPage = enterprises.filter((e) => e.status === "APPROVED");
  const outstandingTotal = approvedOnPage.reduce(
    (sum, e) => sum + (e.usedCredit || 0),
    0,
  );

  // ── Handlers ──
  const openCreate = () => {
    setFormData({ ...EMPTY_FORM });
    setIsEditing(false);
    setShowFormModal(true);
  };

  const openEdit = (ent: Enterprise) => {
    setFormData({ ...ent });
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      const payload = { ...formData, creditLimit: Number(formData.creditLimit) || 0, discountPercentage: Number(formData.discountPercentage) || 0, paymentTerms: Number(formData.paymentTerms) || 0 };
      if (isEditing && formData._id) {
        const res = await updateEnterprise(formData._id, payload);
        if (!res.success) { await dialog.alert({ title: "Update failed", message: res.message || "Update failed", tone: "danger" }); return; }
      } else {
        const res = await createEnterprise(payload);
        if (!res.success) { await dialog.alert({ title: "Create failed", message: res.message || "Create failed", tone: "danger" }); return; }
      }
      setShowFormModal(false);
      await loadEnterprises(page, limit);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleApprove = async () => {
    if (!selectedEnterprise) return;
    try {
      const res = await approveEnterprise(selectedEnterprise._id, { creditLimit: Number(creditLimit) || 0, discountPercentage: Number(discountPct) || 0, paymentTerms: Number(paymentTerms) || 0 });
      if (res.success) await loadEnterprises(page, limit);
    } catch (err) { console.error("Approve failed", err); }
    setShowApproveModal(false);
    setSelectedEnterprise(null);
  };

  const handleReject = async () => {
    if (!selectedEnterprise || !rejectReason) return;
    try {
      const res = await rejectEnterprise(selectedEnterprise._id, { reason: rejectReason });
      if (res.success) await loadEnterprises(page, limit);
    } catch (err) { console.error("Reject failed", err); }
    setShowRejectModal(false);
    setSelectedEnterprise(null);
    setRejectReason("");
  };

  const handleSuspend = async () => {
    if (!selectedEnterprise || !suspendReason) return;
    try {
      const res = await suspendEnterprise(selectedEnterprise._id, { reason: suspendReason });
      if (res.success) await loadEnterprises(page, limit);
    } catch (err) { console.error("Suspend failed", err); }
    setShowSuspendModal(false);
    setSelectedEnterprise(null);
    setSuspendReason("");
  };

  const handleDelete = async () => {
    if (!selectedEnterprise) return;
    try {
      const res = await deleteEnterprise(selectedEnterprise._id);
      if (res.success) await loadEnterprises(page, limit);
    } catch (err) { console.error("Delete failed", err); }
    setShowDeleteModal(false);
    setSelectedEnterprise(null);
  };

  const getStatusBadge = (status: string) => {
    const s: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      SUSPENDED: "bg-gray-100 text-gray-800",
    };
    return s[status] || "bg-gray-100 text-gray-800";
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const updateField = (key: string, value: any) => setFormData((p) => ({ ...p, [key]: value }));

  return (
    <>
      {/* Top Strip — Enterprise KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Enterprises
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {stats.total}
              </p>
              <p className="text-xs text-gray-400 mt-1">All registered accounts</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active (this page)
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {stats.approved}
              </p>
              {/* Both counts come from the loaded page only — the list endpoint
                  sends no status breakdown for the full set. */}
              <p className="text-xs text-gray-500 mt-1">
                {stats.pending} pending approval on this page
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Credit Risk
              </p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {creditRiskEnterprises.length}
              </p>
              <p className="text-xs text-red-500 mt-1">
                Above 85% credit usage, this page
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
                Credit Outstanding
              </p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {fmt(outstandingTotal)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {approvedOnPage.length} approved account
                {approvedOnPage.length === 1 ? "" : "s"} on this page
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <IndianRupee className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Add button */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search company, contact, GSTIN..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 border border-gray-200 rounded-xl bg-white">
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium">
            <Plus className="w-4 h-4" /> Add Enterprise
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Company", "Contact", "GSTIN", "Status", "Credit", "Discount", "Actions"].map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-sm font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : enterprises.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No enterprises found</td></tr>
              ) : (
                paginatedEnterprises.map((ent) => {
                  const usagePct = ent.creditLimit
                    ? ((ent.usedCredit || 0) / ent.creditLimit) * 100
                    : 0;
                  const isAtRisk = usagePct > 85 && ent.status === "APPROVED";
                  return (
                  <tr key={ent._id} className={`hover:bg-gray-50 transition-colors ${isAtRisk ? "bg-red-50/30" : ""}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-800">{ent.companyName}</p>
                        {isAtRisk && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold" title="Credit usage above 85%">
                            <AlertTriangle className="w-3 h-3" />
                            AT RISK
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{ent.city}, {ent.state}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-800">{ent.contactPerson}</p>
                      <p className="text-sm text-gray-500">{ent.phone}</p>
                    </td>
                    <td className="px-6 py-4"><span className="font-mono text-sm text-gray-600">{ent.gstin || "-"}</span></td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(ent.status)}`}>{ent.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      {ent.status === "APPROVED" && ent.creditLimit > 0 ? (
                        <div>
                          <p className="text-gray-800 text-sm">{fmt(ent.usedCredit || 0)} / {fmt(ent.creditLimit)}</p>
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div className={`h-full rounded-full ${(ent.usedCredit || 0) / ent.creditLimit > 0.9 ? "bg-red-500" : (ent.usedCredit || 0) / ent.creditLimit > 0.7 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(((ent.usedCredit || 0) / (ent.creditLimit || 1)) * 100, 100)}%` }} />
                          </div>
                        </div>
                      ) : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-6 py-4"><span className="text-gray-800">{ent.discountPercentage || 0}%</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setSelectedEnterprise(ent); setShowDetailModal(true); }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="View Details"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(ent)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit2 className="w-4 h-4" /></button>
                        {ent.status === "PENDING" && (
                          <>
                            <button onClick={() => { setSelectedEnterprise(ent); setCreditLimit(50000); setDiscountPct(0); setPaymentTerms(30); setShowApproveModal(true); }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><Check className="w-4 h-4" /></button>
                            <button onClick={() => { setSelectedEnterprise(ent); setRejectReason(""); setShowRejectModal(true); }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><X className="w-4 h-4" /></button>
                          </>
                        )}
                        {ent.status === "APPROVED" && (
                          <button onClick={() => { setSelectedEnterprise(ent); setSuspendReason(""); setShowSuspendModal(true); }}
                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Suspend"><Ban className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => { setSelectedEnterprise(ent); setShowDeleteModal(true); }}
                          className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={entTotalPages}
          onPageChange={setPage}
          totalItems={entTotalItems}
          startIndex={entStart}
          endIndex={entEnd}
          itemLabel="enterprises"
          pageSize={limit}
          onPageSizeChange={(size) => { setLimit(size as PageSize); setPage(1); }}
        />
      </div>

      {/* ── Create / Edit Modal ── */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">{isEditing ? "Edit Enterprise" : "Add New Enterprise"}</h3>
              <button onClick={() => setShowFormModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                <input type="text" value={formData.companyName || ""} onChange={(e) => updateField("companyName", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" placeholder="E.g. TechCorp Solutions Pvt Ltd" />
              </div>
              {/* Contact Person */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person *</label>
                <input type="text" value={formData.contactPerson || ""} onChange={(e) => updateField("contactPerson", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="Full name" />
              </div>
              {/* GSTIN */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                <input type="text" value={formData.gstin || ""} onChange={(e) => updateField("gstin", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono" placeholder="22AAAAA0000A1Z5" />
              </div>
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={formData.email || ""} onChange={(e) => updateField("email", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="contact@company.com" />
              </div>
              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                <input type="text" value={formData.phone || ""} onChange={(e) => updateField("phone", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="+91 98765 43210" />
              </div>
              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                <input type="text" value={formData.address || ""} onChange={(e) => updateField("address", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="Street address" />
              </div>
              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                <input type="text" value={formData.city || ""} onChange={(e) => updateField("city", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="City" />
              </div>
              {/* State */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                <input type="text" value={formData.state || ""} onChange={(e) => updateField("state", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="State" />
              </div>
              {/* Pincode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                <input type="text" value={formData.pincode || ""} onChange={(e) => updateField("pincode", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="110001" />
              </div>
              {/* Status (only when editing) */}
              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || "PENDING"} onChange={(e) => updateField("status", e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl">
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              )}
              <div className="md:col-span-2 border-t pt-4 mt-2">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Credit & Payment Terms</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (₹)</label>
                    <input type="number" value={formData.creditLimit ?? ''} onChange={(e) => updateField("creditLimit", e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
                    <input type="number" min={0} max={50} value={formData.discountPercentage ?? ''} onChange={(e) => updateField("discountPercentage", e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
                    <input type="number" value={formData.paymentTerms ?? ''} onChange={(e) => updateField("paymentTerms", e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowFormModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSaveForm} disabled={saving || !formData.companyName || !formData.email || !formData.phone || !formData.contactPerson}
                className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? "Saving..." : (<><Save className="w-4 h-4" />{isEditing ? "Update" : "Create"}</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {showApproveModal && selectedEnterprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Approve Enterprise</h3>
            <p className="text-gray-600 mb-4">Approve <strong>{selectedEnterprise.companyName}</strong></p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit (₹)</label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage</label>
                <input type="number" min={0} max={50} value={discountPct} onChange={(e) => setDiscountPct(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms (days)</label>
                <input type="number" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleApprove}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700">Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
      {showRejectModal && selectedEnterprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Reject Enterprise</h3>
            <p className="text-gray-600 mb-4">Reject <strong>{selectedEnterprise.companyName}</strong></p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="Reason for rejection..." />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Suspend Modal ── */}
      {showSuspendModal && selectedEnterprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Suspend Enterprise</h3>
            <p className="text-gray-600 mb-4">Suspend <strong>{selectedEnterprise.companyName}</strong>? This will revoke their access.</p>
            <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl" placeholder="Reason for suspension..." />
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowSuspendModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSuspend} disabled={!suspendReason}
                className="flex-1 px-4 py-2.5 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 disabled:opacity-50">Suspend</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {showDeleteModal && selectedEnterprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Delete Enterprise</h3>
            <p className="text-gray-600 mb-4">Are you sure you want to permanently delete <strong>{selectedEnterprise.companyName}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Panel (Right-side drawer) ── */}
      {showDetailModal && selectedEnterprise && (
        <EnterpriseProfilePanel
          enterprise={selectedEnterprise}
          onClose={() => setShowDetailModal(false)}
          onEdit={() => { setShowDetailModal(false); openEdit(selectedEnterprise); }}
          onBlock={() => {
            setSuspendReason("");
            setShowDetailModal(false);
            setShowSuspendModal(true);
          }}
          // The drawer holds a snapshot of the row, so a credit-limit change has
          // to refetch the list rather than mutate the copy.
          onUpdated={() => loadEnterprises(page, limit)}
          fmt={fmt}
          getStatusBadge={getStatusBadge}
        />
      )}
    </>
  );
};

// ────────────────────────────────────────────────────────────
// Enterprise Profile Panel (right-side drawer, credit ledger from the server)
// ────────────────────────────────────────────────────────────
interface EnterpriseProfilePanelProps {
  enterprise: Enterprise;
  onClose: () => void;
  onEdit: () => void;
  onBlock: () => void;
  onUpdated: () => void | Promise<void>;
  fmt: (n: number) => string;
  getStatusBadge: (status: string) => string;
}

// Row shape of GET /admin/enterprises/:id/credit-history (CreditHistory model,
// `performedBy` populated with fullName/email and `bookingId` with bookingNumber).
interface CreditHistoryRow {
  _id: string;
  type:
    | "CREDIT_USED"
    | "CREDIT_REPAID"
    | "LIMIT_INCREASED"
    | "LIMIT_DECREASED"
    | "ADJUSTMENT";
  amount: number;
  balanceAfter?: number;
  limitBefore?: number;
  limitAfter?: number;
  reason?: string;
  createdAt: string;
  performedBy?: { fullName?: string; email?: string } | string | null;
  performedByType?: "ADMIN" | "CUSTOMER" | "SYSTEM";
  bookingId?: { bookingNumber?: string } | string | null;
}

const LEDGER_TYPE_LABEL: Record<CreditHistoryRow["type"], string> = {
  CREDIT_USED: "Credit used",
  CREDIT_REPAID: "Repayment",
  LIMIT_INCREASED: "Limit increased",
  LIMIT_DECREASED: "Limit decreased",
  ADJUSTMENT: "Adjustment",
};

const LEDGER_TYPE_TONE: Record<CreditHistoryRow["type"], string> = {
  CREDIT_USED: "bg-orange-100 text-orange-800",
  CREDIT_REPAID: "bg-green-100 text-green-800",
  LIMIT_INCREASED: "bg-blue-100 text-blue-800",
  LIMIT_DECREASED: "bg-amber-100 text-amber-800",
  ADJUSTMENT: "bg-gray-200 text-gray-700",
};

// One read covers both the trend and the list. 6 months of bars are only drawn
// when this fetch demonstrably reached back past the start of that window.
const LEDGER_FETCH_LIMIT = 500;
const TREND_MONTHS = 6;
const LEDGER_ROWS_SHOWN = 10;

const EnterpriseProfilePanel: React.FC<EnterpriseProfilePanelProps> = ({
  enterprise,
  onClose,
  onEdit,
  onBlock,
  onUpdated,
  fmt,
  getStatusBadge,
}) => {
  const dialog = useDialog();
  const creditLimit = enterprise.creditLimit || 0;
  const usedCredit = enterprise.usedCredit || 0;
  const usagePct = creditLimit > 0 ? (usedCredit / creditLimit) * 100 : 0;
  const usageTone =
    usagePct > 90
      ? { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" }
      : usagePct > 70
        ? { bar: "bg-yellow-500", text: "text-yellow-700", bg: "bg-yellow-50" }
        : { bar: "bg-green-500", text: "text-green-700", bg: "bg-green-50" };

  // The drawer used to render a hardcoded "Payment History" (INV-4218 …, dated
  // Feb–Apr 2026, amounts derived as fractions of usedCredit) and a 6-month
  // "Credit Usage Trend" built from fixed weights × usedCredit. None of it
  // existed in the database. Both now come from the real credit ledger:
  // GET /admin/enterprises/:id/credit-history (CreditHistory rows). There is
  // still NO invoice/payments endpoint, so no invoice numbers are shown.
  const [ledger, setLedger] = useState<CreditHistoryRow[] | null>(null);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [savingLimit, setSavingLimit] = useState(false);

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const res = await enterpriseCreditApi.getCreditHistory(enterprise._id, {
        limit: LEDGER_FETCH_LIMIT,
      });
      const rows: CreditHistoryRow[] = res?.data?.history ?? [];
      setLedger(rows);
      setLedgerTotal(Number(res?.data?.total ?? rows.length) || 0);
    } catch (err) {
      setLedger(null);
      setLedgerError(
        (err as Error)?.message || "Could not load the credit ledger.",
      );
    } finally {
      setLedgerLoading(false);
    }
  }, [enterprise._id]);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  // Monthly credit drawn, summed from the CREDIT_USED rows themselves.
  const trend = useMemo(() => {
    if (!ledger) return null;
    const now = new Date();
    const buckets = Array.from({ length: TREND_MONTHS }, (_, idx) => {
      const d = new Date(
        now.getFullYear(),
        now.getMonth() - (TREND_MONTHS - 1 - idx),
        1,
      );
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        value: 0,
      };
    });
    const byKey = new Map(buckets.map((b) => [b.key, b]));
    const windowStart = new Date(
      now.getFullYear(),
      now.getMonth() - (TREND_MONTHS - 1),
      1,
    );
    let rowsInWindow = 0;
    for (const row of ledger) {
      if (row.type !== "CREDIT_USED") continue;
      const d = new Date(row.createdAt);
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) {
        bucket.value += Number(row.amount) || 0;
        rowsInWindow += 1;
      }
    }
    // Rows arrive newest-first. The bars are only exact if this page of the
    // ledger either holds everything or reaches back past the window start —
    // otherwise older months would be silently understated, so say so instead.
    const oldestFetched = ledger.length
      ? new Date(ledger[ledger.length - 1].createdAt)
      : null;
    const windowFullyCovered =
      ledgerTotal <= ledger.length ||
      (oldestFetched !== null && oldestFetched < windowStart);
    return { buckets, rowsInWindow, windowFullyCovered };
  }, [ledger, ledgerTotal]);

  const trendMax = Math.max(1, ...(trend?.buckets ?? []).map((b) => b.value));

  const actorOf = (row: CreditHistoryRow) => {
    if (row.performedBy && typeof row.performedBy === "object") {
      return row.performedBy.fullName || row.performedBy.email || "Admin";
    }
    if (row.performedByType === "CUSTOMER") return "Customer";
    if (row.performedByType === "SYSTEM") return "System";
    return "Admin";
  };

  const handleAdjustCredit = async () => {
    const newLimit = await dialog.prompt({
      title: "Adjust credit limit",
      message: `Enter new credit limit (INR) for ${enterprise.companyName || "this enterprise"}.`,
      tone: "warning",
      inputType: "number",
      defaultValue: String(creditLimit),
      placeholder: "e.g. 500000",
      required: true,
      confirmLabel: "Continue",
      validate: (v) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) return "Enter a non-negative number.";
        // Same rule the server enforces, surfaced before the round-trip.
        if (n < usedCredit)
          return `Cannot go below the credit already used (${fmt(usedCredit)}).`;
        return null;
      },
    });
    // Cancel resolves null. A truthiness check would also swallow "0", which is
    // a legitimate new limit for an account with nothing drawn.
    if (newLimit === null || newLimit.trim() === "") return;
    const parsedLimit = Number(newLimit);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 0) return;

    // The route requires a comment/reason of at least 10 characters
    // (requireCommentAndAudit("credit:update_limit", …)) and the handler stores
    // it as the CreditHistory row's `reason`, which the schema requires.
    const reason = await dialog.prompt({
      title: "Why is the limit changing?",
      message:
        "This is recorded on the credit ledger and the audit log. At least 10 characters.",
      tone: "warning",
      inputType: "text",
      placeholder: "e.g. Quarterly review approved by finance",
      required: true,
      confirmLabel: "Update limit",
      validate: (v) =>
        v.trim().length < 10 ? "Please write at least 10 characters." : null,
    });
    // The dialog's own validator enforces this, but the imperative fallback used
    // when no DialogProvider is mounted is a plain window.prompt with none.
    if (reason === null || reason.trim().length < 10) return;

    try {
      setSavingLimit(true);
      // Keys are what enterprise-credit.controller.ts updateCreditLimit reads.
      const res = await enterpriseCreditApi.updateCreditLimit(enterprise._id, {
        newLimit: parsedLimit,
        reason: reason.trim(),
      });
      if (res?.success === false) {
        throw new Error(res?.message || "Could not update the credit limit.");
      }
      const limitAfter = Number(res?.data?.limitAfter);
      await dialog.alert({
        title: "Credit limit updated",
        message: Number.isFinite(limitAfter)
          ? `New limit: ${fmt(limitAfter)}.`
          : "The credit limit was updated.",
        tone: "success",
      });
      await onUpdated();
      onClose();
    } catch (err) {
      await dialog.alert({
        title: "Update failed",
        message: (err as Error)?.message || "Could not update the credit limit.",
        tone: "danger",
      });
    } finally {
      setSavingLimit(false);
    }
  };

  const handleContact = () => {
    if (enterprise.email) window.location.href = `mailto:${enterprise.email}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {enterprise.companyName}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getStatusBadge(enterprise.status)}`}
                >
                  {enterprise.status}
                </span>
                <span className="text-xs text-gray-500">
                  {enterprise.city}, {enterprise.state}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 p-6 space-y-6">
          {/* Contact strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] uppercase text-gray-500 font-semibold">
                Contact Person
              </p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {enterprise.contactPerson}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] uppercase text-gray-500 font-semibold">
                GSTIN
              </p>
              <p className="text-sm font-mono text-gray-800 mt-0.5">
                {enterprise.gstin || "—"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] uppercase text-gray-500 font-semibold flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone
              </p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">
                {enterprise.phone}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[11px] uppercase text-gray-500 font-semibold flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email
              </p>
              <p className="text-sm font-medium text-gray-800 mt-0.5 truncate">
                {enterprise.email}
              </p>
            </div>
          </div>

          {/* Credit usage */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-500" />
                Credit Usage
              </p>
              {usagePct > 85 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
                  <AlertTriangle className="w-3 h-3" />
                  HIGH RISK
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">
                  Limit
                </p>
                <p className="text-base font-bold text-gray-800 mt-0.5">
                  {fmt(creditLimit)}
                </p>
              </div>
              <div className={`${usageTone.bg} rounded-xl p-3`}>
                <p
                  className={`text-[10px] uppercase ${usageTone.text} font-semibold`}
                >
                  Outstanding
                </p>
                <p className={`text-base font-bold ${usageTone.text} mt-0.5`}>
                  {fmt(usedCredit)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">
                  Available
                </p>
                <p className="text-base font-bold text-gray-800 mt-0.5">
                  {fmt(Math.max(0, creditLimit - usedCredit))}
                </p>
              </div>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-500">Usage</span>
                <span className={`font-semibold ${usageTone.text}`}>
                  {usagePct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full">
                <div
                  className={`h-full rounded-full ${usageTone.bar}`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Payment terms: {enterprise.paymentTerms || 30} days •{" "}
              {enterprise.discountPercentage || 0}% discount
            </p>
          </div>

          {/* Credit drawn per month — summed from the CREDIT_USED ledger rows */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Credit Drawn per Month
              </p>
              <span className="text-xs text-gray-500">Last {TREND_MONTHS} months</span>
            </div>
            {ledgerLoading ? (
              <p className="text-xs text-gray-500">Loading credit ledger…</p>
            ) : ledgerError ? (
              <div className="flex items-start gap-2">
                <p className="text-xs text-red-600">{ledgerError}</p>
                <button
                  onClick={() => void loadLedger()}
                  className="text-xs font-semibold text-orange-600 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : !trend || trend.rowsInWindow === 0 ? (
              <p className="text-xs text-gray-500">
                No credit drawn in the last {TREND_MONTHS} months.
              </p>
            ) : !trend.windowFullyCovered ? (
              <p className="text-xs text-gray-500">
                This account has {ledgerTotal.toLocaleString()} ledger entries — more
                than this view loads, so a monthly total here would be incomplete.
              </p>
            ) : (
              <div className="flex items-end gap-2 h-28">
                {trend.buckets.map((b) => (
                  <div
                    key={b.key}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div className="w-full bg-gray-100 rounded-md relative h-full flex items-end">
                      <div
                        className="w-full rounded-md bg-gradient-to-t from-orange-500 to-orange-300"
                        style={{ height: `${(b.value / trendMax) * 100}%` }}
                        title={fmt(b.value)}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">{b.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Credit ledger. Replaces the invented invoice list: these are the
              actual CreditHistory rows. No invoice numbers — the platform has no
              enterprise invoice/payments endpoint. */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-green-600" />
                Credit Ledger
              </p>
              {!ledgerLoading && !ledgerError && ledgerTotal > 0 && (
                <span className="text-xs text-gray-500">
                  {Math.min(LEDGER_ROWS_SHOWN, ledger?.length ?? 0)} of{" "}
                  {ledgerTotal.toLocaleString()} entries
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Credit used, repayments and limit changes recorded for this account.
            </p>
            <div className="space-y-2">
              {ledgerLoading && (
                <p className="text-xs text-gray-500">Loading credit ledger…</p>
              )}
              {!ledgerLoading && ledgerError && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-red-600">{ledgerError}</p>
                  <button
                    onClick={() => void loadLedger()}
                    className="text-xs font-semibold text-orange-600 hover:underline"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!ledgerLoading && !ledgerError && (ledger?.length ?? 0) === 0 && (
                <p className="text-xs text-gray-500">
                  No credit activity recorded yet.
                </p>
              )}
              {!ledgerLoading &&
                !ledgerError &&
                (ledger ?? []).slice(0, LEDGER_ROWS_SHOWN).map((row) => (
                  <div
                    key={row._id}
                    className="flex items-start justify-between gap-3 px-3 py-2 bg-gray-50 rounded-xl"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${LEDGER_TYPE_TONE[row.type]}`}
                        >
                          {LEDGER_TYPE_LABEL[row.type] || row.type}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(row.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {row.reason && (
                        <p className="mt-1 text-xs text-gray-600 truncate">
                          {row.reason}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-gray-500">
                        {actorOf(row)}
                        {row.bookingId &&
                          typeof row.bookingId === "object" &&
                          row.bookingId.bookingNumber &&
                          ` · ${row.bookingId.bookingNumber}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-800">
                        {fmt(Number(row.amount) || 0)}
                      </p>
                      {(row.type === "LIMIT_INCREASED" ||
                        row.type === "LIMIT_DECREASED") &&
                      row.limitAfter !== undefined ? (
                        <p className="text-[11px] text-gray-500">
                          Limit → {fmt(Number(row.limitAfter) || 0)}
                        </p>
                      ) : row.balanceAfter !== undefined ? (
                        <p className="text-[11px] text-gray-500">
                          Outstanding {fmt(Number(row.balanceAfter) || 0)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-500">Created</p>
              <p className="text-gray-800 font-medium">
                {new Date(enterprise.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Last updated</p>
              <p className="text-gray-800 font-medium">
                {new Date(enterprise.updatedAt).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center gap-2">
          <button
            onClick={handleAdjustCredit}
            disabled={savingLimit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            <Sliders className="w-4 h-4" />
            {savingLimit ? "Saving…" : "Adjust Credit Limit"}
          </button>
          <button
            onClick={handleContact}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Contact
          </button>
          <button
            onClick={onEdit}
            className="p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          {enterprise.status === "APPROVED" && (
            <button
              onClick={onBlock}
              className="p-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100"
              title="Block / Suspend"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────
// Inquiries Tab
// ────────────────────────────────────────────────────────────
const InquiriesTab: React.FC = () => {
  const dialog = useDialog();
  const [inquiries, setInquiries] = useState<EnterpriseInquiryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Server-side pagination state
  const [inqPage, setInqPage] = useState(1);
  const [inqLimit, setInqLimit] = useState<PageSize>(10);
  const [inqPaginationMeta, setInqPaginationMeta] = useState({ total: 0, pages: 0 });

  const loadInquiries = useCallback(async (p: number, l: number) => {
    setLoading(true);
    try {
      const res = await fetchEnterpriseInquiries(
        statusFilter !== "ALL" ? statusFilter : undefined,
        searchQuery || undefined,
        p,
        l,
      );
      if (res.success) {
        setInquiries(res.data?.inquiries || []);
        if (res.data?.pagination) {
          setInqPaginationMeta({
            total: res.data.pagination.total || 0,
            pages: res.data.pagination.pages || 0,
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch inquiries:", e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const prevInqFiltersRef = React.useRef({ searchQuery, statusFilter });
  useEffect(() => {
    const filtersChanged =
      prevInqFiltersRef.current.searchQuery !== searchQuery ||
      prevInqFiltersRef.current.statusFilter !== statusFilter;
    prevInqFiltersRef.current = { searchQuery, statusFilter };
    if (filtersChanged && inqPage !== 1) {
      setInqPage(1);
    } else {
      loadInquiries(inqPage, inqLimit);
    }
  }, [inqPage, inqLimit, searchQuery, statusFilter, loadInquiries]);

  const paginatedInquiries = inquiries;
  const inqTotalItems = inqPaginationMeta.total;
  const inqTotalPages = inqPaginationMeta.pages;
  const inqStart = inqTotalItems === 0 ? 0 : (inqPage - 1) * inqLimit + 1;
  const inqEnd = Math.min(inqPage * inqLimit, inqTotalItems);

  const handleUpdate = async (id: string) => {
    try {
      const res = await updateEnterpriseInquiry(id, { status: editStatus, adminNotes: editNotes });
      if (res.success) {
        setEditingId(null);
        loadInquiries(inqPage, inqLimit);
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({
      title: "Delete inquiry?",
      message: "This will permanently remove the inquiry record.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      const res = await deleteEnterpriseInquiry(id);
      if (res.success) loadInquiries(inqPage, inqLimit);
    } catch (e) { console.error(e); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      NEW: "bg-blue-100 text-blue-800",
      CONTACTED: "bg-yellow-100 text-yellow-800",
      CONVERTED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
    };
    return map[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by name, phone, company..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 border border-gray-200 rounded-xl bg-white">
              <option value="ALL">All Status</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="CONVERTED">Converted</option>
              <option value="CLOSED">Closed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {["Name", "Phone", "Company", "Source", "Status", "Date", "Notes", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-sm font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : inquiries.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-gray-500">No inquiries found</td></tr>
              ) : (
                paginatedInquiries.map((inq) => (
                  <tr key={inq._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{inq.name}</p>
                      {inq.email && <p className="text-xs text-gray-500">{inq.email}</p>}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{inq.phone}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{inq.companyName || "-"}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        inq.source === "GET_IN_TOUCH" ? "bg-orange-100 text-orange-700" : "bg-purple-100 text-purple-700"
                      }`}>{inq.source === "GET_IN_TOUCH" ? "Get in Touch" : "Page Visit"}</span>
                    </td>
                    <td className="px-5 py-3">
                      {editingId === inq._id ? (
                        <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                          className="px-2 py-1 border border-gray-200 rounded text-sm">
                          <option value="NEW">New</option>
                          <option value="CONTACTED">Contacted</option>
                          <option value="CONVERTED">Converted</option>
                          <option value="CLOSED">Closed</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(inq.status)}`}>{inq.status}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">{new Date(inq.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      {editingId === inq._id ? (
                        <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-sm" placeholder="Admin notes..." />
                      ) : (
                        <span className="text-sm text-gray-500">{inq.adminNotes || "-"}</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        {editingId === inq._id ? (
                          <>
                            <button onClick={() => handleUpdate(inq._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Save">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Cancel">
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingId(inq._id); setEditStatus(inq.status); setEditNotes(inq.adminNotes || ""); }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(inq._id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={inqPage}
          totalPages={inqTotalPages}
          onPageChange={setInqPage}
          totalItems={inqTotalItems}
          startIndex={inqStart}
          endIndex={inqEnd}
          itemLabel="inquiries"
          pageSize={inqLimit}
          onPageSizeChange={(size) => { setInqLimit(size as PageSize); setInqPage(1); }}
        />
      </div>
    </>
  );
};

// ────────────────────────────────────────────────────────────
// Content Tab – manage enterprise page content
// ────────────────────────────────────────────────────────────
const ContentTab: React.FC = () => {
  const dialog = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<EnterpriseContentData>({
    heroTitle: "",
    heroSubtitle: "",
    features: [],
    faqs: [],
    clients: [],
    ctaText: "",
    ctaSubtext: "",
    isActive: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchEnterpriseContent();
        if (res.success && res.data) setContent(res.data);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateEnterpriseContent(content);
      if (res.success) await dialog.alert({ title: "Saved", message: "Enterprise page content saved successfully.", tone: "success" });
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  // ── Feature helpers ──
  const addFeature = () => setContent({
    ...content,
    features: [...content.features, { icon: "", title: "", description: "", sortOrder: content.features.length, isActive: true }],
  });
  const updateFeature = (i: number, field: keyof EnterpriseFeatureData, val: string | number | boolean) => {
    const f = [...content.features];
    (f[i] as any)[field] = val;
    setContent({ ...content, features: f });
  };
  const removeFeature = (i: number) => setContent({ ...content, features: content.features.filter((_, idx) => idx !== i) });

  // ── FAQ helpers ──
  const addFaq = () => setContent({
    ...content,
    faqs: [...content.faqs, { question: "", answer: "", sortOrder: content.faqs.length, isActive: true }],
  });
  const updateFaq = (i: number, field: keyof EnterpriseFaqData, val: string | number | boolean) => {
    const f = [...content.faqs];
    (f[i] as any)[field] = val;
    setContent({ ...content, faqs: f });
  };
  const removeFaq = (i: number) => setContent({ ...content, faqs: content.faqs.filter((_, idx) => idx !== i) });

  // ── Client helpers ──
  const addClient = () => setContent({
    ...content,
    clients: [...content.clients, { name: "", logoUrl: "", sortOrder: content.clients.length, isActive: true }],
  });
  const updateClient = (i: number, field: keyof EnterpriseClientData, val: string | number | boolean) => {
    const c = [...content.clients];
    (c[i] as any)[field] = val;
    setContent({ ...content, clients: c });
  };
  const removeClient = (i: number) => setContent({ ...content, clients: content.clients.filter((_, idx) => idx !== i) });

  if (loading) return <div className="text-center py-12 text-gray-500">Loading content...</div>;

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Hero Section</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
            <textarea value={content.heroTitle} onChange={(e) => setContent({ ...content, heroTitle: e.target.value })}
              rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hero Subtitle</label>
            <input value={content.heroSubtitle} onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Key Features</h3>
          <button onClick={addFeature} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
            <Plus className="w-4 h-4" /> Add Feature
          </button>
        </div>
        <div className="space-y-3">
          {content.features.map((feat, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <GripVertical className="w-5 h-5 text-gray-400 mt-2 flex-shrink-0" />
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input value={feat.icon} onChange={(e) => updateFeature(i, "icon", e.target.value)}
                  placeholder="Icon key (e.g. gst_invoice)" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={feat.title} onChange={(e) => updateFeature(i, "title", e.target.value)}
                  placeholder="Feature title" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={feat.description} onChange={(e) => updateFeature(i, "description", e.target.value)}
                  placeholder="Description" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <button onClick={() => removeFeature(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {content.features.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No features yet. Click "Add Feature" to get started.</p>}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">FAQs</h3>
          <button onClick={addFaq} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
            <Plus className="w-4 h-4" /> Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {content.faqs.map((faq, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <GripVertical className="w-5 h-5 text-gray-400 mt-2 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <input value={faq.question} onChange={(e) => updateFaq(i, "question", e.target.value)}
                  placeholder="Question" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <textarea value={faq.answer} onChange={(e) => updateFaq(i, "answer", e.target.value)}
                  placeholder="Answer" rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <button onClick={() => removeFaq(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {content.faqs.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No FAQs yet.</p>}
        </div>
      </div>

      {/* Clients */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Client Logos</h3>
          <button onClick={addClient} className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
        <div className="space-y-3">
          {content.clients.map((cl, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <GripVertical className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input value={cl.name} onChange={(e) => updateClient(i, "name", e.target.value)}
                placeholder="Client name" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input value={cl.logoUrl} onChange={(e) => updateClient(i, "logoUrl", e.target.value)}
                placeholder="Logo key or URL" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <button onClick={() => removeClient(i)} className="p-1.5 text-red-500 hover:bg-red-50 rounded flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {content.clients.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No clients yet.</p>}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Call to Action</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
            <input value={content.ctaText} onChange={(e) => setContent({ ...content, ctaText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CTA Subtext</label>
            <input value={content.ctaSubtext} onChange={(e) => setContent({ ...content, ctaSubtext: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm" />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50">
          <Save className="w-5 h-5" />
          {saving ? "Saving..." : "Save Content"}
        </button>
      </div>
    </div>
  );
};

export default EnterpriseManagement;
