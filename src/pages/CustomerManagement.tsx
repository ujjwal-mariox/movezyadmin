// src/pages/CustomerManagement.tsx
import React, { useMemo, useState } from "react";
import {
  UserPlus,
  Download,
  Filter,
  Search,
  Phone,
  Mail,
  Star,
  AlertTriangle,
  Flame,
  DollarSign,
  Package,
  TrendingUp,
  X,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";

type Tag = "high_frequency" | "high_value" | "risky" | "new";

interface CustomerRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  cancelledOrders: number;
  status: "Active" | "Inactive";
  totalSpent: number;
  joinedDate: string;
  tags: Tag[];
  recentOrders: { id: string; at: string; status: string; amount: number }[];
  issues: { id: string; type: string; at: string; description: string }[];
}

const SEED: CustomerRow[] = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "+91 98765 43210",
    orders: 42,
    cancelledOrders: 2,
    status: "Active",
    totalSpent: 16750,
    joinedDate: "2024-01-15",
    tags: ["high_frequency", "high_value"],
    recentOrders: [
      { id: "ORD-9821", at: "2026-04-18 10:12", status: "Delivered", amount: 540 },
      { id: "ORD-9765", at: "2026-04-15 18:40", status: "Delivered", amount: 1200 },
      { id: "ORD-9701", at: "2026-04-12 11:30", status: "Delivered", amount: 980 },
      { id: "ORD-9655", at: "2026-04-10 09:10", status: "Cancelled", amount: 320 },
      { id: "ORD-9620", at: "2026-04-08 14:02", status: "Delivered", amount: 730 },
    ],
    issues: [
      { id: "IS-221", type: "Late delivery", at: "2026-04-15", description: "ETA missed by 18m" },
    ],
  },
  {
    id: 2,
    name: "Priya Patel",
    email: "priya@example.com",
    phone: "+91 98765 43211",
    orders: 8,
    cancelledOrders: 1,
    status: "Active",
    totalSpent: 3200,
    joinedDate: "2024-02-20",
    tags: ["high_frequency"],
    recentOrders: [
      { id: "ORD-9818", at: "2026-04-17 16:20", status: "Delivered", amount: 480 },
      { id: "ORD-9790", at: "2026-04-14 13:15", status: "Delivered", amount: 260 },
      { id: "ORD-9755", at: "2026-04-12 17:55", status: "Cancelled", amount: 500 },
    ],
    issues: [],
  },
  {
    id: 3,
    name: "Arjun Reddy",
    email: "arjun@example.com",
    phone: "+91 98765 43212",
    orders: 23,
    cancelledOrders: 6,
    status: "Active",
    totalSpent: 11500,
    joinedDate: "2023-12-10",
    tags: ["risky"],
    recentOrders: [
      { id: "ORD-9808", at: "2026-04-16 09:40", status: "Cancelled", amount: 900 },
      { id: "ORD-9772", at: "2026-04-13 18:00", status: "Cancelled", amount: 1100 },
      { id: "ORD-9731", at: "2026-04-11 11:20", status: "Delivered", amount: 620 },
    ],
    issues: [
      { id: "IS-310", type: "Repeated cancellations", at: "2026-04-16", description: "6 of last 10 orders cancelled" },
      { id: "IS-305", type: "Payment issue", at: "2026-04-13", description: "Failed UPI, retried twice" },
    ],
  },
  {
    id: 4,
    name: "Sneha Desai",
    email: "sneha@example.com",
    phone: "+91 98765 43213",
    orders: 1,
    cancelledOrders: 0,
    status: "Inactive",
    totalSpent: 540,
    joinedDate: "2026-04-05",
    tags: ["new"],
    recentOrders: [{ id: "ORD-9740", at: "2026-04-05 10:00", status: "Delivered", amount: 540 }],
    issues: [],
  },
  {
    id: 5,
    name: "Vikram Singh",
    email: "vikram@example.com",
    phone: "+91 98765 43214",
    orders: 67,
    cancelledOrders: 3,
    status: "Active",
    totalSpent: 48250,
    joinedDate: "2023-11-22",
    tags: ["high_frequency", "high_value"],
    recentOrders: [
      { id: "ORD-9823", at: "2026-04-18 12:05", status: "Delivered", amount: 2400 },
      { id: "ORD-9801", at: "2026-04-16 15:30", status: "Delivered", amount: 1850 },
      { id: "ORD-9780", at: "2026-04-14 17:40", status: "Delivered", amount: 620 },
      { id: "ORD-9760", at: "2026-04-13 09:10", status: "Delivered", amount: 1320 },
    ],
    issues: [],
  },
  {
    id: 6,
    name: "Anjali Mehta",
    email: "anjali@example.com",
    phone: "+91 98765 43215",
    orders: 7,
    cancelledOrders: 0,
    status: "Active",
    totalSpent: 2800,
    joinedDate: "2024-03-01",
    tags: [],
    recentOrders: [
      { id: "ORD-9782", at: "2026-04-15 14:00", status: "Delivered", amount: 420 },
      { id: "ORD-9750", at: "2026-04-10 18:15", status: "Delivered", amount: 340 },
    ],
    issues: [],
  },
];

const TAG_META: Record<Tag, { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  high_frequency: { label: "High frequency", bg: "bg-blue-50", text: "text-blue-700", icon: Flame },
  high_value: { label: "High value", bg: "bg-amber-50", text: "text-amber-700", icon: Star },
  risky: { label: "Risky", bg: "bg-red-50", text: "text-red-700", icon: ShieldAlert },
  new: { label: "New", bg: "bg-green-50", text: "text-green-700", icon: UserPlus },
};

const CustomerManagement: React.FC = () => {
  const customers = SEED;
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<"all" | Tag>("all");
  const [selected, setSelected] = useState<CustomerRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (q && !`${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)) return false;
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [customers, search, tagFilter]);

  const totalRevenue = customers.reduce((a, c) => a + c.totalSpent, 0);
  const riskyCount = customers.filter((c) => c.tags.includes("risky")).length;
  const highValueCount = customers.filter((c) => c.tags.includes("high_value")).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-xs text-gray-500">
            {filtered.length} of {customers.length} customers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4" /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-movezy-500 to-movezy-600 text-white rounded-lg text-sm font-medium hover:shadow-md">
            <UserPlus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile label="Total" value={customers.length} icon={Package} color="movezy" />
        <StatTile label="Active" value={customers.filter((c) => c.status === "Active").length} icon={TrendingUp} color="green" />
        <StatTile label="High value" value={highValueCount} icon={Star} color="amber" />
        <StatTile label="Risky" value={riskyCount} icon={ShieldAlert} color="red" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-movezy-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <TagChip label="All" active={tagFilter === "all"} onClick={() => setTagFilter("all")} />
          {(Object.keys(TAG_META) as Tag[]).map((t) => (
            <TagChip key={t} label={TAG_META[t].label} active={tagFilter === t} onClick={() => setTagFilter(t)} />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tags</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Spent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-gray-400">
                      No customers match your filters.
                    </td>
                  </tr>
                )}
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`cursor-pointer transition ${
                      selected?.id === c.id ? "bg-movezy-50/60" : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-movezy-400 to-movezy-600 text-white flex items-center justify-center font-semibold">
                          {c.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.name}</p>
                          <p className="text-[11px] text-gray-400">Joined {c.joinedDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" /> {c.email}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-gray-400" /> {c.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          c.tags.map((t) => {
                            const meta = TAG_META[t];
                            const Icon = meta.icon;
                            return (
                              <span key={t} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${meta.bg} ${meta.text}`}>
                                <Icon className="w-3 h-3" /> {meta.label}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{c.orders}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">₹{c.totalSpent.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        c.status === "Active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span>Total revenue: ₹{totalRevenue.toLocaleString()}</span>
            <span>Click a row to see the quick panel</span>
          </div>
        </div>

        {/* Quick panel */}
        <aside className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {selected ? <QuickPanel customer={selected} onClose={() => setSelected(null)} /> : (
            <div className="p-8 text-center text-sm text-gray-400 h-full flex flex-col items-center justify-center">
              <UserPlus className="w-10 h-10 text-gray-300 mb-2" />
              Select a customer to see their last 5 orders and issues.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

const StatTile: React.FC<{
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "movezy" | "green" | "amber" | "red";
}> = ({ label, value, icon: Icon, color }) => {
  const colorMap = {
    movezy: { bg: "bg-movezy-50", text: "text-movezy-600" },
    green: { bg: "bg-green-50", text: "text-green-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    red: { bg: "bg-red-50", text: "text-red-600" },
  }[color];
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap.bg}`}>
        <Icon className={`w-4 h-4 ${colorMap.text}`} />
      </div>
    </div>
  );
};

const TagChip: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
      active ? "bg-movezy-50 border-movezy-300 text-movezy-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
    }`}
  >
    {label}
  </button>
);

const QuickPanel: React.FC<{ customer: CustomerRow; onClose: () => void }> = ({ customer, onClose }) => {
  const cancellationRate = customer.orders > 0 ? (customer.cancelledOrders / customer.orders) * 100 : 0;
  return (
    <div className="flex flex-col max-h-[calc(100vh-200px)]">
      <div className="p-4 border-b border-gray-100 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-movezy-400 to-movezy-600 text-white flex items-center justify-center font-semibold">
            {customer.name[0]}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{customer.name}</h3>
            <p className="text-xs text-gray-500">{customer.phone}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 border-b border-gray-100 grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-xs text-gray-400">Orders</p>
          <p className="font-bold text-gray-900">{customer.orders}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Spent</p>
          <p className="font-bold text-gray-900 flex items-center justify-center gap-0.5">
            <DollarSign className="w-3 h-3" />{customer.totalSpent.toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Cancel rate</p>
          <p className={`font-bold ${cancellationRate > 20 ? "text-red-600" : "text-gray-900"}`}>
            {cancellationRate.toFixed(0)}%
          </p>
        </div>
      </div>

      {customer.tags.length > 0 && (
        <div className="p-4 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Tags</p>
          <div className="flex flex-wrap gap-1">
            {customer.tags.map((t) => {
              const meta = TAG_META[t];
              const Icon = meta.icon;
              return (
                <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${meta.bg} ${meta.text}`}>
                  <Icon className="w-3 h-3" /> {meta.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Last 5 orders</p>
        {customer.recentOrders.length === 0 ? (
          <p className="text-xs text-gray-400">No orders yet.</p>
        ) : (
          <div className="space-y-1.5">
            {customer.recentOrders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{o.id}</p>
                  <p className="text-[11px] text-gray-400">{o.at}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-medium ${
                      o.status === "Delivered"
                        ? "text-green-600"
                        : o.status === "Cancelled"
                        ? "text-red-600"
                        : "text-gray-600"
                    }`}
                  >
                    {o.status}
                  </p>
                  <p className="text-xs text-gray-500">₹{o.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issues */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Issues</p>
        {customer.issues.length === 0 ? (
          <p className="text-xs text-gray-400">No issues reported.</p>
        ) : (
          <div className="space-y-2">
            {customer.issues.map((i) => (
              <div key={i.id} className="p-2 bg-red-50 border border-red-100 rounded-md">
                <div className="flex items-center gap-1.5 text-red-700 text-xs font-semibold">
                  <AlertTriangle className="w-3 h-3" /> {i.type}
                </div>
                <p className="text-xs text-gray-700 mt-0.5">{i.description}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{i.at}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 bg-gray-50 flex gap-2">
        <a href={`tel:${customer.phone}`} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-semibold">
          <Phone className="w-4 h-4" /> Call
        </a>
        <a href={`mailto:${customer.email}`} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 bg-white rounded-md text-sm text-gray-700 hover:bg-gray-100">
          <MessageSquare className="w-4 h-4" /> Email
        </a>
      </div>
    </div>
  );
};

export default CustomerManagement;
