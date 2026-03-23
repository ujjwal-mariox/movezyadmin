import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Youtube,
  Video,
  Image,
  FileText,
  ExternalLink,
} from "lucide-react";
import Pagination from "../components/Pagination";
import {
  trainingApi,
  type TrainingMaterialItem,
} from "../services/admin-api";

const TYPE_OPTIONS = [
  { value: "youtube", label: "YouTube Link", icon: Youtube },
  { value: "video", label: "Video Upload", icon: Video },
  { value: "image", label: "Image", icon: Image },
  { value: "document", label: "Document", icon: FileText },
] as const;

const TYPE_LABELS: Record<string, string> = {
  youtube: "YouTube",
  video: "Video",
  image: "Image",
  document: "Document",
};

const TYPE_COLORS: Record<string, string> = {
  youtube: "bg-red-100 text-red-700",
  video: "bg-purple-100 text-purple-700",
  image: "bg-blue-100 text-blue-700",
  document: "bg-amber-100 text-amber-700",
};

interface FormState {
  title: string;
  description: string;
  type: string;
  url: string;
  sortOrder: string;
}

const initialForm: FormState = {
  title: "",
  description: "",
  type: "youtube",
  url: "",
  sortOrder: "0",
};

export default function TrainingManagement() {
  const [items, setItems] = useState<TrainingMaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trainingApi.getAll({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
      const data = res.data || res;
      setItems(data.materials || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalItems(data.pagination?.total || 0);
    } catch {
      showNotification("error", "Failed to load training materials");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openAdd = () => {
    setForm(initialForm);
    setFile(null);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (item: TrainingMaterialItem) => {
    setForm({
      title: item.title,
      description: item.description,
      type: item.type,
      url: item.type === "youtube" ? item.url : "",
      sortOrder: String(item.sortOrder),
    });
    setFile(null);
    setIsEditing(true);
    setEditingId(item._id);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        title: form.title,
        description: form.description,
        type: form.type,
        sortOrder: form.sortOrder,
      };
      if (form.type === "youtube") {
        payload.url = form.url;
      }

      if (isEditing && editingId) {
        await trainingApi.update(editingId, payload, file || undefined);
        showNotification("success", "Training material updated");
      } else {
        await trainingApi.create(payload, file || undefined);
        showNotification("success", "Training material created");
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await trainingApi.toggle(id);
      fetchItems();
    } catch {
      showNotification("error", "Toggle failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this training material?")) return;
    try {
      await trainingApi.delete(id);
      showNotification("success", "Deleted");
      fetchItems();
    } catch {
      showNotification("error", "Delete failed");
    }
  };

  const needsFile = form.type !== "youtube";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Training & Learning
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage training materials for drivers — YouTube links, videos,
            images, and documents.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} /> Add Material
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${notification.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {notification.message}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">All Types</option>
          <option value="youtube">YouTube</option>
          <option value="video">Video</option>
          <option value="image">Image</option>
          <option value="document">Document</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Preview</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-center">Order</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    No training materials found
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    {/* Preview */}
                    <td className="px-4 py-3">
                      <Thumbnail item={item} />
                    </td>
                    {/* Title */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {item.title}
                      </div>
                      {item.description && (
                        <div className="text-gray-400 text-xs mt-0.5 max-w-xs truncate">
                          {item.description}
                        </div>
                      )}
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${TYPE_COLORS[item.type] || "bg-gray-100 text-gray-700"}`}
                      >
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                    </td>
                    {/* Sort */}
                    <td className="px-4 py-3 text-center text-gray-500">
                      {item.sortOrder}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(item._id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.type === "youtube" && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                            title="Open link"
                          >
                            <ExternalLink size={15} />
                          </a>
                        )}
                        <button
                          onClick={() => openEdit(item)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          startIndex={(page - 1) * 10}
          endIndex={Math.min(page * 10, totalItems) - 1}
          itemLabel="materials"
        />
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {isEditing ? "Edit Material" : "Add Training Material"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. How to Accept Bookings"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description..."
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = form.type === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, type: opt.value, url: "" });
                          setFile(null);
                        }}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition ${active ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                      >
                        <Icon size={16} /> {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content — YouTube URL or File */}
              {form.type === "youtube" ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    YouTube URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={form.url}
                    onChange={(e) =>
                      setForm({ ...form, url: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                  {/* YouTube preview */}
                  {form.url && (() => {
                    const match = form.url.match(
                      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
                    );
                    if (!match) return null;
                    return (
                      <img
                        src={`https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`}
                        alt="YouTube preview"
                        className="mt-2 rounded-lg w-full max-w-[320px] border"
                      />
                    );
                  })()}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload File{" "}
                    {!isEditing && "*"}
                  </label>
                  <input
                    type="file"
                    required={!isEditing && needsFile}
                    accept={
                      form.type === "video"
                        ? "video/*"
                        : form.type === "image"
                          ? "image/*"
                          : ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    }
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm file:mr-3 file:px-3 file:py-1 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-600 file:font-medium file:text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {form.type === "video"
                      ? "MP4, MOV, AVI, WebM — max 50 MB"
                      : form.type === "image"
                        ? "JPEG, PNG, WebP, GIF — max 10 MB"
                        : "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX — max 10 MB"}
                  </p>
                </div>
              )}

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: e.target.value })
                  }
                  className="w-24 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : isEditing
                      ? "Update"
                      : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* Small thumbnail helper */
function Thumbnail({ item }: { item: TrainingMaterialItem }) {
  if (item.thumbnailUrl) {
    return (
      <img
        src={item.thumbnailUrl}
        alt={item.title}
        className="w-20 h-14 object-cover rounded-lg border"
      />
    );
  }
  const Icon =
    item.type === "youtube"
      ? Youtube
      : item.type === "video"
        ? Video
        : item.type === "image"
          ? Image
          : FileText;
  return (
    <div className="w-20 h-14 flex items-center justify-center bg-gray-100 rounded-lg border">
      <Icon size={22} className="text-gray-400" />
    </div>
  );
}
