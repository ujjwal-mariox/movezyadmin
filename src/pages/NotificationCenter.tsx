// src/pages/NotificationCenter.tsx
import React, { useState } from "react";
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
} from "lucide-react";
import type { NotificationTemplate, NotificationHistory } from "../types/admin";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

const NotificationCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"send" | "templates" | "history">(
    "send",
  );
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetAudience, setTargetAudience] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [promoCode, setPromoCode] = useState("");
  const [sending, setSending] = useState(false);
  const [_showTemplateModal, setShowTemplateModal] = useState(false);

  // Mock templates
  const templates: NotificationTemplate[] = [
    {
      _id: "1",
      name: "Welcome Offer",
      title: "Welcome to Movezy! 🎉",
      body: "Get 20% off on your first booking. Use code: WELCOME20",
      type: "PROMO",
      variables: [],
      isActive: true,
    },
    {
      _id: "2",
      name: "Weekend Special",
      title: "Weekend Special Offer! 🚚",
      body: "Book any tempo or truck this weekend and get flat ₹100 off!",
      type: "PROMO",
      variables: [],
      isActive: true,
    },
    {
      _id: "3",
      name: "Inactive User",
      title: "We miss you! 💚",
      body: "It's been a while! Come back and get 15% off on your next booking.",
      type: "CUSTOM",
      variables: [],
      isActive: true,
    },
  ];

  // Mock history
  const history: NotificationHistory[] = [
    {
      _id: "1",
      title: "Flash Sale Today!",
      body: "Get 30% off on all bookings. Valid till midnight!",
      type: "PROMO",
      targetAudience: "All Users",
      sentCount: 15420,
      successCount: 15234,
      failedCount: 186,
      sentBy: "Admin",
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      _id: "2",
      title: "New Feature: Schedule Booking",
      body: "Now you can schedule your bookings in advance!",
      type: "SYSTEM",
      targetAudience: "All Users",
      sentCount: 24500,
      successCount: 24123,
      failedCount: 377,
      sentBy: "System",
      sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      _id: "3",
      title: "Come Back & Save!",
      body: "We miss you! Use code COMEBACK20 for 20% off.",
      type: "PROMO",
      targetAudience: "Inactive Users",
      sentCount: 5230,
      successCount: 4890,
      failedCount: 340,
      sentBy: "Admin",
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  const handleSend = async () => {
    if (!title || !body) return;
    setSending(true);
    // Simulate API call
    setTimeout(() => {
      setSending(false);
      setTitle("");
      setBody("");
      setPromoCode("");
      alert("Notification sent successfully!");
    }, 2000);
  };

  const handleUseTemplate = (template: NotificationTemplate) => {
    setTitle(template.title);
    setBody(template.body);
    setActiveTab("send");
  };

  const formatDate = (dateString: string) => {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Bell className="w-6 h-6 text-movezy-500" />
            Notification Center
          </h2>
          <p className="text-sm text-gray-500">
            Send push notifications to users
          </p>
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
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "all", label: "All Users", icon: Users },
                    {
                      value: "active",
                      label: "Active Users",
                      icon: CheckCircle,
                    },
                    {
                      value: "inactive",
                      label: "Inactive Users",
                      icon: AlertCircle,
                    },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTargetAudience(option.value as any)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        targetAudience === option.value
                          ? "border-movezy-500 bg-movezy-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <option.icon
                        className={`w-6 h-6 mx-auto mb-2 ${
                          targetAudience === option.value
                            ? "text-movezy-600"
                            : "text-gray-400"
                        }`}
                      />
                      <p
                        className={`text-sm font-medium ${
                          targetAudience === option.value
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

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Promo Code (Optional)
                </label>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="PROMO20"
                  className="w-full px-4 py-3 font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                />
              </div>

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
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-white bg-movezy-500 rounded-xl hover:bg-movezy-600"
                >
                  <Plus className="w-4 h-4" />
                  Add Template
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedTemplates.map((template) => (
                  <div
                    key={template._id}
                    className="p-4 border border-gray-100 bg-gray-50 rounded-xl"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-gray-800">
                          {template.name}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-movezy-100 text-movezy-700 mt-1">
                          {template.type}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mb-1 text-sm font-medium text-gray-700">
                      {template.title}
                    </p>
                    <p className="mb-4 text-sm text-gray-500">
                      {template.body}
                    </p>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
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
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                      Notification
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                      Target
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                      Sent
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                      Success
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                      Failed
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
                        <p className="font-medium text-gray-800">
                          {item.title}
                        </p>
                        <p className="max-w-xs text-sm text-gray-500 truncate">
                          {item.body}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-600">
                          {item.targetAudience}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-gray-800">
                          {item.sentCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-green-600">
                          {item.successCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-red-600">
                          {item.failedCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-500">
                          {formatDate(item.sentAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
    </div>
  );
};

export default NotificationCenter;
