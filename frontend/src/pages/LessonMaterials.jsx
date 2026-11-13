import { useEffect, useState, useMemo } from "react";
import {
  FileText,
  Upload,
  Search,
  Filter,
  Eye,
  Plus,
  Lock,
  Sparkles,
  BookOpen,
  Layers,
  GraduationCap,
  Calendar,
  Building2,
  Trash2,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import { COURSE_LEVELS } from "@/config/resources";
import SecureDocViewer from "@/components/SecureDocViewer";
import Modal from "@/components/Modal";
import toast from "react-hot-toast";

const CATEGORIES = ["Lesson Plan", "Modul Belajar (PDF)", "Slide Presentasi (PPT)", "Worksheet"];

export default function LessonMaterials() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploadModal, setUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    category: "Lesson Plan",
    level: COURSE_LEVELS[0],
    file_type: "pdf",
    file_url: "",
    description: "",
  });

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.LESSON_MATERIALS.LIST, {
        params: { limit: 100 },
      });
      setMaterials(res.data.data || []);
    } catch {
      toast.error("Gagal memuat materi pembelajaran");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await api.post(API_ENDPOINTS.UPLOAD, formData);
      const url = res.data.data.url;
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      setForm((prev) => ({
        ...prev,
        file_url: url,
        file_type: ext,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ""),
      }));
      toast.success("File berhasil diunggah");
    } catch {
      toast.error("Gagal mengunggah file");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveMaterial = async (e) => {
    e.preventDefault();
    if (!form.file_url) return toast.error("Silakan pilih file materi terlebih dahulu");
    setUploading(true);
    try {
      await api.post(API_ENDPOINTS.LESSON_MATERIALS.LIST, form);
      toast.success("Materi pembelajaran berhasil ditambahkan");
      setUploadModal(false);
      setForm({
        title: "",
        category: "Lesson Plan",
        level: COURSE_LEVELS[0],
        file_type: "pdf",
        file_url: "",
        description: "",
      });
      loadMaterials();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan materi");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Hapus materi "${title}"?`)) return;
    try {
      await api.delete(API_ENDPOINTS.LESSON_MATERIALS.DETAIL(id));
      toast.success("Materi berhasil dihapus");
      loadMaterials();
    } catch {
      toast.error("Gagal menghapus materi");
    }
  };

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchSearch =
        !search ||
        (m.title && m.title.toLowerCase().includes(search.toLowerCase())) ||
        (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
      const matchLevel = !levelFilter || m.level === levelFilter;
      const matchCat = !categoryFilter || m.category === categoryFilter;
      return matchSearch && matchLevel && matchCat;
    });
  }, [materials, search, levelFilter, categoryFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-6 text-white shadow-md">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-amber-200">
              <Sparkles size={14} /> ADLS Academic Repository
            </div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Materi Pembelajaran & Lesson Plan</h1>
            <p className="mt-1 text-sm text-sky-100 max-w-2xl">
              Pusat kurikulum, modul PDF, dan presentasi PPT resmi ADLS Solusi Indonesia. Akses aman terlindungi watermark untuk Owner, Admin, dan Tutor.
            </p>
          </div>

          {isOwner && (
            <button
              onClick={() => setUploadModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-sky-50"
            >
              <Plus size={16} />
              <span>Unggah Materi (Owner)</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            className="input !pl-10 !py-2 text-xs"
            placeholder="Cari judul materi atau topik pembelajaran..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
            <Filter size={14} /> Filter:
          </div>
          <select
            className="input !w-auto !py-2 text-xs"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">Semua Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="input !w-auto !py-2 text-xs"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="">Semua Level</option>
            {COURSE_LEVELS.map((lv) => (
              <option key={lv} value={lv}>{lv}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Materials Grid */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">Memuat materi pembelajaran...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <FileText size={40} className="mx-auto text-slate-300" />
          <h3 className="mt-3 text-base font-bold text-slate-700">Belum ada materi pembelajaran</h3>
          <p className="mt-1 text-xs text-slate-400">
            {isOwner
              ? "Klik tombol 'Unggah Materi' di atas untuk menambahkan Lesson Plan, Modul PDF, atau Slide PPT."
              : "Materi pembelajaran belum diunggah oleh Owner."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => {
            const isPpt = /ppt/i.test(m.file_type || "") || /\.ppt/i.test(m.file_url || "");
            const badgeBg = isPpt
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-sky-100 text-sky-800 border-sky-200";

            return (
              <div
                key={m.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold ${badgeBg}`}>
                      {isPpt ? "PPT / Slides" : "PDF Book"}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {m.created_at ? String(m.created_at).slice(0, 10) : ""}
                    </span>
                  </div>

                  <h3 className="mt-3 line-clamp-2 text-base font-bold text-slate-900" title={m.title}>
                    {m.title}
                  </h3>

                  {m.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{m.description}</p>
                  )}

                  <div className="mt-4 space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap size={14} className="text-brand shrink-0" />
                      <span>Level: <b>{m.level || "Semua Level"}</b></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-indigo-500 shrink-0" />
                      <span>Kategori: <b>{m.category || "Lesson Plan"}</b></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDoc(m)}
                    className="btn-primary flex-1 !py-2 text-xs font-bold"
                  >
                    <Eye size={14} />
                    <span>Buka Materi (Secure)</span>
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id, m.title)}
                      className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                      title="Hapus Materi"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Secure Viewer Modal */}
      {selectedDoc && (
        <SecureDocViewer
          fileUrl={selectedDoc.file_url}
          title={selectedDoc.title}
          fileType={selectedDoc.file_type}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Owner Upload Modal */}
      {uploadModal && (
        <Modal title="Unggah Materi Pembelajaran (Khusus Owner)" onClose={() => setUploadModal(false)}>
          <form onSubmit={handleSaveMaterial} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Judul Materi / Lesson Plan *
              </label>
              <input
                required
                className="input"
                placeholder="mis. Lesson Plan Super Basic Unit 1 - Greetings"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Kategori *
                </label>
                <select
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                  Level Kelas *
                </label>
                <select
                  className="input"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                >
                  {COURSE_LEVELS.map((lv) => (
                    <option key={lv} value={lv}>{lv}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Pilih File (PDF atau PPT/PPTX) *
              </label>
              <input
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx"
                className="input !py-1.5 text-xs"
                onChange={handleFileUpload}
              />
              {uploading && <div className="mt-1 text-xs text-brand font-semibold">Mengunggah file...</div>}
              {form.file_url && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Lock size={13} />
                  <span>File tersimpan: {form.file_url}</span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                Deskripsi / Petunjuk Pengajaran
              </label>
              <textarea
                rows={3}
                className="input"
                placeholder="Petunjuk atau ringkasan topik pengajaran bagi tutor..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUploadModal(false)}
                className="btn-ghost"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={uploading || !form.file_url}
                className="btn-primary"
              >
                Simpan & Bagikan ke Tutor
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

