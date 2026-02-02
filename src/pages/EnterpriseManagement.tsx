// src/pages/EnterpriseManagement.tsx
import React, { useState, useEffect } from "react";
import {
  Building2,
  Search,
  Check,
  X,
  ChevronDown,
  Eye,
  Ban,
  IndianRupee,
  Clock,
} from "lucide-react";
import type { Enterprise } from "../types/admin";

const EnterpriseManagement: React.FC = () => {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedEnterprise, setSelectedEnterprise] =
    useState<Enterprise | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [billingCycle, setBillingCycle] = useState<string>("MONTHLY");
  const [rejectReason, setRejectReason] = useState("");

  // Mock data for demonstration
  const mockEnterprises: Enterprise[] = [
    {
      _id: "1",
      companyName: "TechCorp Solutions Pvt Ltd",
      gstin: "29AABCT1234F1ZP",
      contactPerson: "Rajesh Kumar",
      contactEmail: "rajesh@techcorp.com",
      contactPhone: "+91 98765 43210",
      address: "123 Business Park, Sector 62",
      city: "Noida",
      state: "Uttar Pradesh",
      status: "PENDING",
      creditLimit: 0,
      creditUsed: 0,
      billingCycle: "MONTHLY",
      totalBookings: 0,
      totalSpent: 0,
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-15T10:30:00Z",
    },
    {
      _id: "2",
      companyName: "Logistics Pro India",
      gstin: "27AADCL5678M1ZK",
      contactPerson: "Priya Sharma",
      contactEmail: "priya@logisticspro.in",
      contactPhone: "+91 98765 43211",
      address: "456 Industrial Area, Phase 2",
      city: "Mumbai",
      state: "Maharashtra",
      status: "APPROVED",
      creditLimit: 100000,
      creditUsed: 45000,
      billingCycle: "BIWEEKLY",
      totalBookings: 156,
      totalSpent: 245000,
      createdAt: "2023-11-20T08:00:00Z",
      updatedAt: "2024-01-10T14:30:00Z",
    },
    {
      _id: "3",
      companyName: "FastMove Enterprises",
      gstin: "06AABCF9012H1ZJ",
      contactPerson: "Amit Verma",
      contactEmail: "amit@fastmove.co",
      contactPhone: "+91 98765 43212",
      address: "789 Commerce Hub",
      city: "Gurugram",
      state: "Haryana",
      status: "APPROVED",
      creditLimit: 75000,
      creditUsed: 72000,
      billingCycle: "WEEKLY",
      totalBookings: 89,
      totalSpent: 178000,
      createdAt: "2023-12-05T11:15:00Z",
      updatedAt: "2024-01-12T09:45:00Z",
    },
    {
      _id: "4",
      companyName: "QuickShip Ltd",
      gstin: "09AABCQ3456K1ZL",
      contactPerson: "Sneha Patel",
      contactEmail: "sneha@quickship.com",
      contactPhone: "+91 98765 43213",
      address: "321 Logistics Center",
      city: "Bangalore",
      state: "Karnataka",
      status: "REJECTED",
      creditLimit: 0,
      creditUsed: 0,
      billingCycle: "MONTHLY",
      totalBookings: 0,
      totalSpent: 0,
      rejectionReason: "Invalid GSTIN provided",
      createdAt: "2024-01-10T15:20:00Z",
      updatedAt: "2024-01-11T10:00:00Z",
    },
    {
      _id: "5",
      companyName: "Metro Movers",
      gstin: "33AABCM7890N1ZM",
      contactPerson: "Vikram Singh",
      contactEmail: "vikram@metromovers.in",
      contactPhone: "+91 98765 43214",
      address: "555 Transport Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      status: "SUSPENDED",
      creditLimit: 50000,
      creditUsed: 48000,
      billingCycle: "MONTHLY",
      totalBookings: 45,
      totalSpent: 92000,
      suspensionReason: "Payment default for 2 consecutive cycles",
      createdAt: "2023-10-15T09:00:00Z",
      updatedAt: "2024-01-08T16:30:00Z",
    },
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setEnterprises(mockEnterprises);
      setLoading(false);
    }, 500);
  }, []);

  const filteredEnterprises = enterprises.filter((enterprise) => {
    const matchesSearch =
      enterprise.companyName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      enterprise.contactPerson
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      enterprise.gstin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || enterprise.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: enterprises.length,
    pending: enterprises.filter((e) => e.status === "PENDING").length,
    approved: enterprises.filter((e) => e.status === "APPROVED").length,
    suspended: enterprises.filter((e) => e.status === "SUSPENDED").length,
  };

  const handleApprove = async () => {
    if (!selectedEnterprise) return;
    try {
      // await enterpriseApi.approve(selectedEnterprise._id, { creditLimit, billingCycle });
      setEnterprises(
        enterprises.map((e) =>
          e._id === selectedEnterprise._id
            ? {
                ...e,
                status: "APPROVED" as const,
                creditLimit,
                billingCycle: billingCycle as Enterprise["billingCycle"],
              }
            : e,
        ),
      );
      setShowApproveModal(false);
      setSelectedEnterprise(null);
    } catch (error) {
      console.error("Failed to approve enterprise:", error);
    }
  };

  const handleReject = async () => {
    if (!selectedEnterprise || !rejectReason) return;
    try {
      // await enterpriseApi.reject(selectedEnterprise._id, rejectReason);
      setEnterprises(
        enterprises.map((e) =>
          e._id === selectedEnterprise._id
            ? {
                ...e,
                status: "REJECTED" as const,
                rejectionReason: rejectReason,
              }
            : e,
        ),
      );
      setShowRejectModal(false);
      setSelectedEnterprise(null);
      setRejectReason("");
    } catch (error) {
      console.error("Failed to reject enterprise:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      SUSPENDED: "bg-gray-100 text-gray-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">
            Enterprise Management
          </h2>
          <p className="text-sm text-gray-500">
            Manage corporate accounts and credit lines
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Enterprises</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.total}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {stats.pending}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Enterprises</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {stats.approved}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Suspended</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {stats.suspended}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Ban className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by company name, contact, or GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none px-4 py-2.5 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500 focus:border-transparent bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Company
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  GSTIN
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Credit
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Bookings
                </th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    Loading...
                  </td>
                </tr>
              ) : filteredEnterprises.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No enterprises found
                  </td>
                </tr>
              ) : (
                filteredEnterprises.map((enterprise) => (
                  <tr
                    key={enterprise._id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {enterprise.companyName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {enterprise.city}, {enterprise.state}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-gray-800">
                          {enterprise.contactPerson}
                        </p>
                        <p className="text-sm text-gray-500">
                          {enterprise.contactPhone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-gray-600">
                        {enterprise.gstin}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                          enterprise.status,
                        )}`}
                      >
                        {enterprise.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {enterprise.status === "APPROVED" ? (
                        <div>
                          <p className="text-gray-800">
                            {formatCurrency(enterprise.creditUsed)} /{" "}
                            {formatCurrency(enterprise.creditLimit)}
                          </p>
                          <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div
                              className={`h-full rounded-full ${
                                enterprise.creditUsed / enterprise.creditLimit >
                                0.9
                                  ? "bg-red-500"
                                  : enterprise.creditUsed /
                                        enterprise.creditLimit >
                                      0.7
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                              style={{
                                width: `${Math.min((enterprise.creditUsed / enterprise.creditLimit) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-800">
                        {enterprise.totalBookings}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedEnterprise(enterprise);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {enterprise.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedEnterprise(enterprise);
                                setShowApproveModal(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEnterprise(enterprise);
                                setShowRejectModal(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
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
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedEnterprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Approve Enterprise
            </h3>
            <p className="text-gray-600 mb-4">
              Approve <strong>{selectedEnterprise.companyName}</strong> with the
              following settings:
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Credit Limit
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Cycle
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedEnterprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Reject Enterprise
            </h3>
            <p className="text-gray-600 mb-4">
              Reject <strong>{selectedEnterprise.companyName}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for Rejection
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                placeholder="Enter reason..."
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedEnterprise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                Enterprise Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Company Name</p>
                <p className="font-medium text-gray-800">
                  {selectedEnterprise.companyName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">GSTIN</p>
                <p className="font-mono text-gray-800">
                  {selectedEnterprise.gstin}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Person</p>
                <p className="font-medium text-gray-800">
                  {selectedEnterprise.contactPerson}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact Phone</p>
                <p className="text-gray-800">
                  {selectedEnterprise.contactPhone}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-800">
                  {selectedEnterprise.contactEmail}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedEnterprise.status)}`}
                >
                  {selectedEnterprise.status}
                </span>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="text-gray-800">
                  {selectedEnterprise.address}, {selectedEnterprise.city},{" "}
                  {selectedEnterprise.state}
                </p>
              </div>
              {selectedEnterprise.status === "APPROVED" && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Credit Limit</p>
                    <p className="font-medium text-gray-800">
                      {formatCurrency(selectedEnterprise.creditLimit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Credit Used</p>
                    <p className="font-medium text-gray-800">
                      {formatCurrency(selectedEnterprise.creditUsed)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Bookings</p>
                    <p className="font-medium text-gray-800">
                      {selectedEnterprise.totalBookings}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Spent</p>
                    <p className="font-medium text-gray-800">
                      {formatCurrency(selectedEnterprise.totalSpent)}
                    </p>
                  </div>
                </>
              )}
              {selectedEnterprise.rejectionReason && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Rejection Reason</p>
                  <p className="text-red-600">
                    {selectedEnterprise.rejectionReason}
                  </p>
                </div>
              )}
              {selectedEnterprise.suspensionReason && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-500">Suspension Reason</p>
                  <p className="text-red-600">
                    {selectedEnterprise.suspensionReason}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterpriseManagement;
