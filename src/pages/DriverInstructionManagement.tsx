import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  RotateCcw,
  Loader2,
  FileText,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
} from "lucide-react";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useDialog } from "../components/Layout/Dialog";
import {
  fetchDriverInstructions,
  createDriverInstruction,
  updateDriverInstruction,
  toggleDriverInstruction,
  deleteDriverInstruction,
  type DriverInstructionItem,
} from "../services/api";

interface FormData {
  text: string;
  icon: string;
  instructionType: "MANDATORY" | "ADVISORY";
  sortOrder: number | string;
}

const initialFormData: FormData = {
  text: "",
  icon: "📋",
  instructionType: "ADVISORY",
  sortOrder: 0,
};

const DriverInstructionManagement: React.FC = () => {
  const dialog = useDialog();
  const [items, setItems] = useState<DriverInstructionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  const paginatedItems = items;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  const overviewStats = useMemo(() => {
    let active = 0;
    items.forEach((it) => {
      if (it.isActive) active++;
    });
    return { total: paginationMeta.total || items.length, active };
  }, [items, paginationMeta.total]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(
    async (p?: number, l?: number) => {
      try {
        setLoading(true);
        const res = await fetchDriverInstructions({
          page: p ?? page,
          limit: l ?? limit,
        });
        setItems(res.data?.instructions || []);
        if (res.data?.pagination) {
          setPaginationMeta({
            total: res.data.pagination.total || 0,
            pages: res.data.pagination.pages || 0,
          });
        }
      } catch (error: unknown) {
        showNotification(
          "error",
          error instanceof Error
            ? error.message
            : "Failed to load instructions",
        );
      } finally {
        setLoading(false);
      }
    },
    [page, limit],
  );

  useEffect(() => {
    loadData(page, limit);
  }, [page, limit, loadData]);

  const handleAdd = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: DriverInstructionItem) => {
    setFormData({
      text: item.text,
      instructionType: (item as any).instructionType ?? "ADVISORY",
      icon: item.icon || "📋",
      sortOrder: item.sortOrder || 0,
    });
    setIsEditing(true);
    setEditingId(item._id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.text.trim()) {
      showNotification("error", "Instruction text is required");
      return;
    }

    try {
      setActionLoading("save");
      const payload = { ...formData, sortOrder: Number(formData.sortOrder) || 0 };
      if (isEditing && editingId) {
        await updateDriverInstruction(editingId, payload);
        showNotification("success", "Instruction updated");
      } else {
        await createDriverInstruction(payload);
        showNotification("success", "Instruction created");
      }
      setIsModalOpen(false);
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setActionLoading(id);
      await toggleDriverInstruction(id);
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to toggle",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({ title: "Delete instruction?", message: "This driver instruction will be permanently removed.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;

    try {
      setActionLoading(id);
      await deleteDriverInstruction(id);
      showNotification("success", "Instruction deleted");
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to delete",
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <span className="text-green-600">&#10003;</span>
          ) : (
            <span className="text-red-600">&#10005;</span>
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Driver Instructions
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage instructions shown to drivers before they start taking rides.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Instruction
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Instructions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.total}</p>
              <p className="text-xs text-gray-400 mt-1">Across all triggers</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-green-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.active}</p>
              <p className="text-xs text-gray-400 mt-1">Delivered to drivers</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No driver instructions configured yet.</p>
          <button
            onClick={handleAdd}
            className="mt-4 text-blue-600 hover:underline"
          >
            Add the first instruction
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Instruction
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {paginatedItems.map((item) => {
                  return (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{item.icon || "📋"}</span>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm">
                            {item.text}
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold align-middle ${
                              (item as any).instructionType === "MANDATORY"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {(item as any).instructionType === "MANDATORY" ? "MANDATORY" : "ADVISORY"}
                            </span>
                            <span className="ml-2 text-[10px] text-gray-400 align-middle" title="Bumped on every edit">
                              v{(item as any).version ?? 1}
                            </span>
                            {((item as any).ackCount ?? 0) > 0 && (
                              <span
                                className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 align-middle"
                                title="Trips where drivers tapped through this instruction at start (mandatory instructions only)"
                              >
                                {(item as any).ackCount} acks
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5">Sort #{item.sortOrder || 0}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggle(item._id)}
                        disabled={actionLoading === item._id}
                        className="flex items-center gap-1"
                        title="Toggle status"
                      >
                        {actionLoading === item._id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : item.isActive ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          disabled={actionLoading === item._id}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                          title="Delete"
                        >
                          {actionLoading === item._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            itemLabel="instructions"
            pageSize={limit}
            onPageSizeChange={(size) => {
              setLimit(size as PageSize);
              setPage(1);
            }}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {isEditing ? "Edit Instruction" : "Add Instruction"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Icon */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. ⏰ 🚗 📦"
                />
              </div>

              {/* Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Instruction Text *
                </label>
                <textarea
                  value={formData.text}
                  onChange={(e) =>
                    setFormData({ ...formData, text: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Be on time for every pickup"
                />
              </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Instruction Type</label>
                  <select
                    value={formData.instructionType}
                    onChange={(e) => setFormData({ ...formData, instructionType: e.target.value as FormData["instructionType"] })}
                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ADVISORY">Advisory — guidance</option>
                    <option value="MANDATORY">Mandatory — must follow</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Display semantics in the driver app. No enforcement pipeline
                    (checklists, proof, penalties) exists yet — building one is a
                    separate project.
                  </p>
                </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="flex items-center gap-3 p-4 border rounded-xl bg-gray-50">
                  <span className="text-2xl">{formData.icon || "📋"}</span>
                  <span className="font-medium text-gray-900">
                    {formData.text || "Instruction text..."}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === "save"}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === "save" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isEditing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverInstructionManagement;
