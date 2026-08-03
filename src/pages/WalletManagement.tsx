import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Wallet,
  Search,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  Plus,
  Minus,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  CircleDollarSign,
  Users as UsersIcon,
} from "lucide-react";
import {
  fetchAllWallets,
  fetchUserWallet,
  fetchAllTransactions,
  creditUserWallet,
  debitUserWallet,
  type WalletUser,
  type WalletTransactionItem,
  type PaginationMeta,
} from "../services/api";
import { PAGE_SIZE_OPTIONS, type PageSize } from "../hooks/usePagination";
import { useDialog } from "../components/Layout/Dialog";

type TabType = "wallets" | "transactions";

export default function WalletManagement() {
  const dialog = useDialog();
  const [activeTab, setActiveTab] = useState<TabType>("wallets");
  const [search, setSearch] = useState("");
  const [wallets, setWallets] = useState<WalletUser[]>([]);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [walletPagination, setWalletPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [txnPagination, setTxnPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [walletLimit, setWalletLimit] = useState<PageSize>(10);
  const [txnLimit, setTxnLimit] = useState<PageSize>(10);
  const [loading, setLoading] = useState(true);
  const [txnTypeFilter, setTxnTypeFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    name: string;
    balance: number;
    transactions: WalletTransactionItem[];
  } | null>(null);
  const [adjustModal, setAdjustModal] = useState<{
    userId: string;
    name: string;
    type: "credit" | "debit";
  } | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDesc, setAdjustDesc] = useState("");
  const [adjusting, setAdjusting] = useState(false);

  const loadWallets = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchAllWallets(page, walletLimit, search || undefined);
        if (res.success) {
          setWallets(res.data.wallets);
          setWalletPagination(res.data.pagination);
        }
      } catch (e) {
        console.error("Failed to load wallets:", e);
      }
      setLoading(false);
    },
    [search, walletLimit]
  );

  const loadTransactions = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchAllTransactions(
          page,
          txnLimit,
          txnTypeFilter || undefined
        );
        if (res.success) {
          setTransactions(res.data.transactions);
          setTxnPagination(res.data.pagination);
        }
      } catch (e) {
        console.error("Failed to load transactions:", e);
      }
      setLoading(false);
    },
    [txnTypeFilter, txnLimit]
  );

  useEffect(() => {
    if (activeTab === "wallets") loadWallets();
    else loadTransactions();
  }, [activeTab, loadWallets, loadTransactions]);

  const handleViewUser = async (userId: string, name: string) => {
    try {
      const res = await fetchUserWallet(userId);
      if (res.success) {
        setSelectedUser({
          userId,
          name,
          balance: res.data.balance,
          transactions: res.data.transactions,
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdjust = async () => {
    if (!adjustModal || !adjustAmount) return;
    setAdjusting(true);
    try {
      const fn =
        adjustModal.type === "credit" ? creditUserWallet : debitUserWallet;
      const res = await fn(
        adjustModal.userId,
        Number(adjustAmount),
        adjustDesc
      );
      if (res.success) {
        setAdjustModal(null);
        setAdjustAmount("");
        setAdjustDesc("");
        loadWallets(walletPagination.page);
        if (selectedUser?.userId === adjustModal.userId) {
          handleViewUser(adjustModal.userId, adjustModal.name);
        }
      } else {
        await dialog.alert({ title: "Operation failed", message: res.message || "Operation failed", tone: "danger" });
      }
    } catch (e: any) {
      await dialog.alert({ title: "Operation failed", message: e?.message || "Operation failed", tone: "danger" });
    }
    setAdjusting(false);
  };

  // Wallet aggregates computed from loaded data (swap to backend aggregate when available)
  const walletStats = useMemo(() => {
    const totalBalance = wallets.reduce((sum, w) => sum + (w.balance || 0), 0);
    const pending = transactions
      .filter((t) => t.status === "PENDING")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const available = totalBalance - pending;
    return {
      totalBalance,
      pending,
      available,
      activeWallets: walletPagination.total || wallets.length,
    };
  }, [wallets, transactions, walletPagination.total]);

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-7 h-7 text-green-600" />
            Wallet Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            View customer wallets, transactions and manage balances
          </p>
        </div>
      </div>

      {/* Top Strip — Wallet aggregates */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Balance</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                ₹{walletStats.totalBalance.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-green-600">Across loaded wallets (this page)</p>
            </div>
            <div className="flex items-center justify-center bg-green-50 w-11 h-11 rounded-xl">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Pending</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                ₹{walletStats.pending.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-amber-600">Awaiting settlement (this page)</p>
            </div>
            <div className="flex items-center justify-center bg-amber-50 w-11 h-11 rounded-xl">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Available</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                ₹{walletStats.available.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-blue-600">Ready to use (this page)</p>
            </div>
            <div className="flex items-center justify-center bg-blue-50 w-11 h-11 rounded-xl">
              <CircleDollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-purple-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Active Wallets</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {walletStats.activeWallets.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-purple-600">Total customers</p>
            </div>
            <div className="flex items-center justify-center bg-purple-50 w-11 h-11 rounded-xl">
              <UsersIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(["wallets", "transactions"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "wallets" ? "Customer Wallets" : "All Transactions"}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        {activeTab === "wallets" && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadWallets()}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}
        {activeTab === "transactions" && (
          <select
            value={txnTypeFilter}
            onChange={(e) => setTxnTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="CREDIT">Credit</option>
            <option value="DEBIT">Debit</option>
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : activeTab === "wallets" ? (
        <WalletsTable
          wallets={wallets}
          pagination={walletPagination}
          onPageChange={loadWallets}
          pageSize={walletLimit}
          onPageSizeChange={(size) => { setWalletLimit(size); loadWallets(1); }}
          onView={handleViewUser}
          onCredit={(userId, name) =>
            setAdjustModal({ userId, name, type: "credit" })
          }
          onDebit={(userId, name) =>
            setAdjustModal({ userId, name, type: "debit" })
          }
          formatDate={formatDate}
        />
      ) : (
        <TransactionsTable
          transactions={transactions}
          pagination={txnPagination}
          onPageChange={loadTransactions}
          pageSize={txnLimit}
          onPageSizeChange={(size) => { setTxnLimit(size); loadTransactions(1); }}
          formatDate={formatDate}
        />
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <Modal title={`${selectedUser.name}'s Wallet`} onClose={() => setSelectedUser(null)}>
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Current Balance</p>
              <p className="text-3xl font-bold text-green-700">
                ₹{selectedUser.balance.toLocaleString("en-IN")}
              </p>
            </div>
            <h3 className="font-semibold text-gray-700">
              Recent Transactions ({selectedUser.transactions.length})
            </h3>
            <div className="max-h-80 overflow-y-auto space-y-2">
              {selectedUser.transactions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No transactions yet
                </p>
              ) : (
                selectedUser.transactions.map((txn) => (
                  <div
                    key={txn._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {txn.type === "CREDIT" ? (
                        <ArrowDownCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <ArrowUpCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {txn.description || txn.type}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(txn.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-semibold ${
                          txn.type === "CREDIT"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {txn.type === "CREDIT" ? "+" : "-"}₹
                        {txn.amount.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-gray-400">
                        Bal: ₹{txn.balanceAfter}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Adjust Balance Modal */}
      {adjustModal && (
        <Modal
          title={`${adjustModal.type === "credit" ? "Credit" : "Debit"} - ${adjustModal.name}`}
          onClose={() => setAdjustModal(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                placeholder="Enter amount"
                min={1}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={adjustDesc}
                onChange={(e) => setAdjustDesc(e.target.value)}
                placeholder="Reason for adjustment"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleAdjust}
              disabled={adjusting || !adjustAmount}
              className={`w-full py-2 rounded-lg text-white font-medium text-sm ${
                adjustModal.type === "credit"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-50`}
            >
              {adjusting
                ? "Processing..."
                : `${adjustModal.type === "credit" ? "Credit" : "Debit"} ₹${adjustAmount || "0"}`}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Derive source tag from description (swap to real `source` field when backend sends it)
function deriveSource(description?: string): { label: string; tone: string } {
  const d = (description || "").toLowerCase();
  if (d.includes("refund"))
    return { label: "Refund", tone: "bg-purple-50 text-purple-700" };
  if (d.includes("order") || d.includes("trip") || d.includes("delivery"))
    return { label: "Order", tone: "bg-blue-50 text-blue-700" };
  if (d.includes("top") || d.includes("recharge") || d.includes("add"))
    return { label: "Top-up", tone: "bg-green-50 text-green-700" };
  if (d.includes("admin") || d.includes("manual"))
    return { label: "Admin", tone: "bg-amber-50 text-amber-700" };
  if (d.includes("promo") || d.includes("cashback"))
    return { label: "Promo", tone: "bg-pink-50 text-pink-700" };
  return { label: "System", tone: "bg-gray-100 text-gray-600" };
}

// ─── Sub-Components ───

function WalletsTable({
  wallets,
  pagination,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onView,
  onCredit,
  onDebit,
  formatDate,
}: {
  wallets: WalletUser[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  onView: (userId: string, name: string) => void;
  onCredit: (userId: string, name: string) => void;
  onDebit: (userId: string, name: string) => void;
  formatDate: (d: string) => string;
}) {
  if (wallets.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>No wallets found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Phone</th>
              <th className="text-right px-4 py-3 font-medium">Balance</th>
              <th className="text-left px-4 py-3 font-medium">Created</th>
              <th className="text-center px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {wallets.map((w) => {
              const name = w.user?.fullName || "Unknown";
              return (
                <tr key={w._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {name}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {w.user?.mobileNumber || "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">
                    ₹{w.balance.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {formatDate(w.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => onView(w.userId, name)}
                        className="p-1.5 rounded-md hover:bg-gray-100"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => onCredit(w.userId, name)}
                        className="p-1.5 rounded-md hover:bg-green-50"
                        title="Credit"
                      >
                        <Plus className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => onDebit(w.userId, name)}
                        className="p-1.5 rounded-md hover:bg-red-50"
                        title="Debit"
                      >
                        <Minus className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPageChange={onPageChange} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}

function TransactionsTable({
  transactions,
  pagination,
  onPageChange,
  pageSize,
  onPageSizeChange,
  formatDate,
}: {
  transactions: WalletTransactionItem[];
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
  formatDate: (d: string) => string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <ArrowDownCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Customer</th>
              <th className="text-left px-4 py-3 font-medium">Description</th>
              <th className="text-right px-4 py-3 font-medium">Credit</th>
              <th className="text-right px-4 py-3 font-medium">Debit</th>
              <th className="text-left px-4 py-3 font-medium">Source</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((txn) => {
              const source = deriveSource(txn.description);
              return (
              <tr key={txn._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">
                  <div className="font-medium">{txn.user?.fullName || "-"}</div>
                  <div className="text-xs text-gray-400">
                    {txn.user?.mobileNumber || ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-[240px] truncate">
                  {txn.description || "-"}
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Bal: ₹{txn.balanceBefore} → ₹{txn.balanceAfter}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  {txn.type === "CREDIT" ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                      <ArrowDownCircle className="w-3.5 h-3.5" />
                      +₹{txn.amount.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {txn.type === "DEBIT" ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-red-600">
                      <ArrowUpCircle className="w-3.5 h-3.5" />
                      −₹{txn.amount.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${source.tone}`}>
                    {source.label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      txn.status === "COMPLETED"
                        ? "bg-green-50 text-green-600"
                        : txn.status === "PENDING"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    {txn.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {formatDate(txn.createdAt)}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPageChange={onPageChange} pageSize={pageSize} onPageSizeChange={onPageSizeChange} />
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  pageSize: PageSize;
  onPageSizeChange: (size: PageSize) => void;
}) {
  if (pagination.total === 0) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
      <div className="flex items-center gap-4">
        <span>
          Showing {(pagination.page - 1) * pagination.limit + 1}-
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total}
        </span>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Show</label>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
            className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
