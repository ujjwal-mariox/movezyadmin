import { useState, useEffect, useCallback, useMemo } from "react";
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
  GraduationCap,
  BookOpen,
  Award,
  Users,
  Layers,
  Clock,
  Zap,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
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

type ProgramType = "ONBOARDING" | "SAFETY" | "COMPLIANCE" | "SKILL_UP" | "REFRESHER";
type ProgramTrigger = "MANUAL" | "ON_SIGNUP" | "INCIDENT" | "LOW_RATING" | "POLICY_UPDATE" | "EXPIRY_DUE";
type AssignmentControl = "ALL_DRIVERS" | "BY_CITY" | "BY_COHORT" | "INCIDENT_TRIGGER" | "MANUAL";

interface ProgramSeed {
  id: string;
  title: string;
  description: string;
  type: ProgramType;
  trigger: ProgramTrigger;
  assignment: AssignmentControl;
  modules: number;
  durationMin: number;
  assessment: boolean;
  passScore: number;
  avgAssessmentScore: number;
  certification: boolean;
  expiryDays: number;
  completionRate: number;
  impactScore: number;
  enrolled: number;
  certified: number;
  reTrainingDue: number;
  mandatory: boolean;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED";
}

const PROGRAM_SEEDS: ProgramSeed[] = [
  {
    id: "p1",
    title: "Driver Onboarding Essentials",
    description: "App walkthrough, platform rules, and the first-week checklist for new drivers.",
    type: "ONBOARDING",
    trigger: "ON_SIGNUP",
    assignment: "ALL_DRIVERS",
    modules: 6,
    durationMin: 45,
    assessment: true,
    passScore: 70,
    avgAssessmentScore: 82,
    certification: true,
    expiryDays: 365,
    completionRate: 92,
    impactScore: 84,
    enrolled: 1240,
    certified: 1142,
    reTrainingDue: 32,
    mandatory: true,
    status: "ACTIVE",
  },
  {
    id: "p2",
    title: "Road Safety & Defensive Driving",
    description: "Core safety module — traffic rules, hazards, and defensive techniques.",
    type: "SAFETY",
    trigger: "ON_SIGNUP",
    assignment: "ALL_DRIVERS",
    modules: 8,
    durationMin: 75,
    assessment: true,
    passScore: 80,
    avgAssessmentScore: 86,
    certification: true,
    expiryDays: 180,
    completionRate: 78,
    impactScore: 91,
    enrolled: 1180,
    certified: 920,
    reTrainingDue: 214,
    mandatory: true,
    status: "ACTIVE",
  },
  {
    id: "p3",
    title: "Handling Fragile & Sensitive Items",
    description: "Packaging standards, loading sequence, and liability for fragile deliveries.",
    type: "SKILL_UP",
    trigger: "MANUAL",
    assignment: "BY_COHORT",
    modules: 4,
    durationMin: 30,
    assessment: true,
    passScore: 70,
    avgAssessmentScore: 74,
    certification: false,
    expiryDays: 0,
    completionRate: 64,
    impactScore: 58,
    enrolled: 420,
    certified: 268,
    reTrainingDue: 0,
    mandatory: false,
    status: "ACTIVE",
  },
  {
    id: "p4",
    title: "Customer Service Excellence",
    description: "Communication, de-escalation, and handling complaints with professionalism.",
    type: "SKILL_UP",
    trigger: "LOW_RATING",
    assignment: "INCIDENT_TRIGGER",
    modules: 5,
    durationMin: 40,
    assessment: true,
    passScore: 75,
    avgAssessmentScore: 79,
    certification: false,
    expiryDays: 0,
    completionRate: 71,
    impactScore: 77,
    enrolled: 186,
    certified: 132,
    reTrainingDue: 0,
    mandatory: false,
    status: "ACTIVE",
  },
  {
    id: "p5",
    title: "Prohibited Items & Compliance",
    description: "What you must refuse to carry — legal, safety, and platform policy.",
    type: "COMPLIANCE",
    trigger: "POLICY_UPDATE",
    assignment: "ALL_DRIVERS",
    modules: 3,
    durationMin: 20,
    assessment: true,
    passScore: 90,
    avgAssessmentScore: 93,
    certification: true,
    expiryDays: 365,
    completionRate: 88,
    impactScore: 95,
    enrolled: 1240,
    certified: 1090,
    reTrainingDue: 68,
    mandatory: true,
    status: "ACTIVE",
  },
  {
    id: "p6",
    title: "Accident & Incident Response",
    description: "What to do during and after an accident — triggered automatically after any incident.",
    type: "SAFETY",
    trigger: "INCIDENT",
    assignment: "INCIDENT_TRIGGER",
    modules: 4,
    durationMin: 25,
    assessment: true,
    passScore: 85,
    avgAssessmentScore: 88,
    certification: false,
    expiryDays: 0,
    completionRate: 81,
    impactScore: 89,
    enrolled: 94,
    certified: 76,
    reTrainingDue: 0,
    mandatory: true,
    status: "ACTIVE",
  },
  {
    id: "p7",
    title: "Annual Safety Refresher",
    description: "Mandatory yearly refresher on updated safety protocols and platform changes.",
    type: "REFRESHER",
    trigger: "EXPIRY_DUE",
    assignment: "ALL_DRIVERS",
    modules: 5,
    durationMin: 35,
    assessment: true,
    passScore: 75,
    avgAssessmentScore: 81,
    certification: true,
    expiryDays: 365,
    completionRate: 69,
    impactScore: 72,
    enrolled: 860,
    certified: 594,
    reTrainingDue: 124,
    mandatory: true,
    status: "DRAFT",
  },
];

const PROGRAM_TYPE_TONE: Record<ProgramType, { badge: string; label: string }> = {
  ONBOARDING: { badge: "bg-blue-100 text-blue-700", label: "Onboarding" },
  SAFETY: { badge: "bg-red-100 text-red-700", label: "Safety" },
  COMPLIANCE: { badge: "bg-purple-100 text-purple-700", label: "Compliance" },
  SKILL_UP: { badge: "bg-amber-100 text-amber-700", label: "Skill Up" },
  REFRESHER: { badge: "bg-teal-100 text-teal-700", label: "Refresher" },
};

const TRIGGER_LABEL: Record<ProgramTrigger, string> = {
  MANUAL: "Manual",
  ON_SIGNUP: "On signup",
  INCIDENT: "After incident",
  LOW_RATING: "Low rating",
  POLICY_UPDATE: "Policy update",
  EXPIRY_DUE: "Expiry due",
};

const ASSIGNMENT_LABEL: Record<AssignmentControl, string> = {
  ALL_DRIVERS: "All drivers",
  BY_CITY: "By city",
  BY_COHORT: "By cohort",
  INCIDENT_TRIGGER: "Incident-based",
  MANUAL: "Manual assign",
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
  const [viewMode, setViewMode] = useState<"programs" | "content">("programs");
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

  const programStats = useMemo(() => {
    const totalPrograms = PROGRAM_SEEDS.length;
    const totalEnrolled = PROGRAM_SEEDS.reduce((a, p) => a + p.enrolled, 0);
    const totalCertified = PROGRAM_SEEDS.reduce((a, p) => a + p.certified, 0);
    const reTrainingDue = PROGRAM_SEEDS.reduce((a, p) => a + p.reTrainingDue, 0);
    const avgCompletion = Math.round(
      PROGRAM_SEEDS.reduce((a, p) => a + p.completionRate, 0) / totalPrograms,
    );
    return { totalPrograms, totalEnrolled, totalCertified, reTrainingDue, avgCompletion };
  }, []);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-6 h-6" />
            Training &amp; Learning
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Structured training programs for driver readiness, plus a flexible learning content library.
          </p>
        </div>
        {viewMode === "content" && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} /> Add Material
          </button>
        )}
        {viewMode === "programs" && (
          <button
            onClick={() => showNotification("success", "Program builder coming soon — backend in progress")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} /> New Program
          </button>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-sm font-medium ${notification.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
        >
          {notification.message}
        </div>
      )}

      {/* KPI strip (programs view) */}
      {viewMode === "programs" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Active Programs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{programStats.totalPrograms}</p>
                <p className="text-xs text-gray-400 mt-1">Across 5 categories</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-green-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Certified Drivers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {programStats.totalCertified.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  of {programStats.totalEnrolled.toLocaleString()} enrolled
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <Award className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-purple-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Completion</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{programStats.avgCompletion}%</p>
                <p className="text-xs text-gray-400 mt-1">Across all programs</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Re-training Due</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{programStats.reTrainingDue}</p>
                <p className="text-xs text-gray-400 mt-1">Certificates expiring</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View switcher */}
      <div className="flex items-center border-b border-gray-200">
        <button
          onClick={() => setViewMode("programs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            viewMode === "programs"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Training Programs
          <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {programStats.totalPrograms}
          </span>
        </button>
        <button
          onClick={() => setViewMode("content")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            viewMode === "content"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Learning Content
          <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {totalItems}
          </span>
        </button>
      </div>

      {/* Training Programs view */}
      {viewMode === "programs" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {PROGRAM_SEEDS.map((p) => {
            const tone = PROGRAM_TYPE_TONE[p.type];
            const completionTone =
              p.completionRate >= 85
                ? "bg-green-500"
                : p.completionRate >= 65
                ? "bg-blue-500"
                : "bg-amber-500";
            const impactTone =
              p.impactScore >= 85
                ? "text-green-700"
                : p.impactScore >= 70
                ? "text-blue-700"
                : "text-amber-700";
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-gray-900 text-base">{p.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tone.badge}`}>
                        {tone.label}
                      </span>
                      {p.mandatory && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3 h-3" /> Mandatory
                        </span>
                      )}
                      {p.certification && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <Award className="w-3 h-3" /> Certified
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                        p.status === "DRAFT" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-snug">{p.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-2 mb-3 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                      <Layers className="w-3 h-3" /> Modules
                    </div>
                    <div className="font-semibold text-gray-900">{p.modules}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                      <Clock className="w-3 h-3" /> Duration
                    </div>
                    <div className="font-semibold text-gray-900">{p.durationMin}m</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Pass
                    </div>
                    <div className="font-semibold text-gray-900">
                      {p.assessment ? `${p.passScore}%` : "—"}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                      <TrendingUp className="w-3 h-3" /> Avg Score
                    </div>
                    <div className={`font-semibold ${
                      p.avgAssessmentScore >= p.passScore ? "text-green-700" : "text-amber-700"
                    }`}>
                      {p.assessment ? `${p.avgAssessmentScore}%` : "—"}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
                      <Clock className="w-3 h-3" /> Expiry
                    </div>
                    <div className="font-semibold text-gray-900">
                      {p.expiryDays > 0 ? `${p.expiryDays}d` : "Never"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs border border-indigo-100">
                    <Zap className="w-3 h-3" /> Trigger: {TRIGGER_LABEL[p.trigger]}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs border border-gray-200">
                    <Users className="w-3 h-3" /> {ASSIGNMENT_LABEL[p.assignment]}
                  </span>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-500">Completion Rate</span>
                      <span className="font-semibold text-gray-900">{p.completionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`${completionTone} h-1.5 rounded-full`}
                        style={{ width: `${p.completionRate}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="text-gray-500">
                      <span className="font-semibold text-gray-900">{p.certified.toLocaleString()}</span>
                      <span className="text-gray-400"> / {p.enrolled.toLocaleString()}</span> certified
                    </div>
                    <div className={`flex items-center gap-1 font-semibold ${impactTone}`}>
                      <TrendingUp className="w-3 h-3" />
                      Impact {p.impactScore}
                    </div>
                  </div>
                  {p.reTrainingDue > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 rounded-md px-2 py-1 border border-amber-200">
                      <AlertCircle className="w-3 h-3" />
                      {p.reTrainingDue} drivers due for re-training
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="lg:col-span-2 text-xs text-gray-400 italic px-2">
            Programs view shows structured, module-based training with assessments and certification. The content library tab manages supporting media.
          </div>
        </div>
      )}

      {/* Filters (content view) */}
      {viewMode === "content" && (
      <>
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
      </>
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
