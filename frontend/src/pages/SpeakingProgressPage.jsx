import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  CheckCircle2,
  Clapperboard,
  Film,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
  Video,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsyncResourceSelect from "@/components/AsyncResourceSelect";
import ImageUploadField from "@/components/ImageUploadField";
import Modal from "@/components/Modal";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

export default function SpeakingProgressPage() {
  const { user } = useAuth();
  const isHQ = ["owner", "admin_pusat"].includes(user?.role);
  const isStaff = STAFF.includes(user?.role);

  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(user?.role === "admin_cabang" ? String(user?.branch_id || "") : "");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upload / Edit Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [form, setForm] = useState({
    student_id: "",
    student_name: "",
    type: "after", // "before" | "after"
    month: new Date().toISOString().slice(0, 7),
    period_label: "",
    title: "",
    video_url: "",
    notes: "",
    speaking_score: "",
  });
  const [saving, setSaving] = useState(false);

  // Load branches
  useEffect(() => {
    if (isHQ) {
      api
        .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
        .then((r) => setBranches(r.data.data || []))
        .catch(() => {});
    }
  }, [isHQ]);

  // Load initial student on mount or when branchFilter changes
  useEffect(() => {
    const fetchInitialStudent = async () => {
      try {
        const res = await api.get(API_ENDPOINTS.STUDENTS.LIST, {
          params: {
            limit: 1,
            branch_id: branchFilter || undefined,
            status: "active",
          },
        });
        const first = res.data.data?.[0] || null;
        if (first) {
          setSelectedStudent(first);
          setSelectedStudentId(String(first.id));
        } else {
          setSelectedStudent(null);
          setSelectedStudentId("");
          setVideos([]);
        }
      } catch {
        // silent
      }
    };
    fetchInitialStudent();
  }, [branchFilter]);

  // Load videos for selected student
  const loadVideos = async (id = selectedStudentId) => {
    if (!id) {
      setVideos([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.SPEAKING_PROGRESS.STUDENT(id));
      setVideos(res.data.data?.videos || []);
      if (res.data.data?.student && (!selectedStudent || String(selectedStudent.id) !== String(id))) {
        setSelectedStudent(res.data.data.student);
      }
    } catch (err) {
      toast.error("Gagal memuat video progres speaking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudentId]);

  const openUploadModal = (type = "after") => {
    setEditingVideo(null);
    const nowMonth = new Date().toISOString().slice(0, 7);
    setForm({
      student_id: selectedStudentId || (selectedStudent?.id ? String(selectedStudent.id) : ""),
      student_name: selectedStudent?.name || "",
      type,
      month: nowMonth,
      period_label: type === "before" ? "Before (Awal Masuk)" : `Progres Bulan ${nowMonth}`,
      title: type === "before" ? "Speaking Video Awal Masuk" : "Monthly Speaking Progress",
      video_url: "",
      notes: "",
      speaking_score: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (vid) => {
    setEditingVideo(vid);
    setForm({
      student_id: String(vid.student_id),
      student_name: vid.student_name || selectedStudent?.name || "",
      type: vid.type || "after",
      month: vid.month || new Date().toISOString().slice(0, 7),
      period_label: vid.period_label || "",
      title: vid.title || "",
      video_url: vid.video_url || "",
      notes: vid.notes || "",
      speaking_score: vid.speaking_score !== null ? String(vid.speaking_score) : "",
    });
    setModalOpen(true);
  };

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    if (!form.student_id) {
      toast.error("Silakan pilih siswa");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Judul video wajib diisi");
      return;
    }
    if (!form.video_url.trim()) {
      toast.error("File video speaking wajib diunggah");
      return;
    }

    setSaving(true);
    try {
      if (editingVideo?.id) {
        await api.put(API_ENDPOINTS.SPEAKING_PROGRESS.DETAIL(editingVideo.id), form);
        toast.success("Video progres speaking berhasil diperbarui!");
      } else {
        await api.post(API_ENDPOINTS.SPEAKING_PROGRESS.LIST, form);
        toast.success("Video progres speaking berhasil disimpan!");
      }
      setModalOpen(false);
      if (form.student_id !== selectedStudentId) {
        setSelectedStudentId(form.student_id);
      } else {
        loadVideos(form.student_id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan video");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async (vid) => {
    if (!window.confirm(`Hapus video "${vid.title}"?`)) return;
    try {
      await api.delete(API_ENDfczxsPOINTS.SPEAKING_PROGRESS.DETAIL(vid.id));
      toast.success("Video berhasil dihapus");
      loadVideos();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus video");
    }
  };

  const beforeVideos = videos.filter((v) => v.type === "before");
  const afterVideos = videos.filter((v) => v.type === "after");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm shadow-purple-600/20">
              <Film size={20} />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Speaking Progress: Before - After Video Siswa
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Bandingkan rekaman video kemampuan speaking siswa saat awal masuk (Before) dengan progres bulanan terkini (After).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openUploadModal("before")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-700 shadow-2xs hover:bg-purple-100 transition"
          >
            <Video size={14} /> + Upload Video Before (Awal)
          </button>
          <button
            type="button"
            onClick={() => openUploadModal("after")}
            className="btn-primary !py-2 text-xs font-bold shadow-sm"
          >
            <Plus size={15} /> + Upload Progres Bulanan (After)
          </button>
        </div>
      </div>

      {/* Selector Toolbar: Cabang & Siswa */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {isHQ && branches.length > 0 && (
            <div className="w-48 sm:w-56">
              <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">Cabang ADLS</label>
              <select
                className="input !py-2 text-xs w-full"
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  setSelectedStudentId("");
                }}
              >
                <option value="">Semua Cabang</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[260px]">
            <label className="mb-1 block text-[11px] font-bold text-slate-500 uppercase">
              Cari &amp; Pilih Siswa (React Select API)
            </label>
            <AsyncResourceSelect
              endpoint={API_ENDPOINTS.STUDENTS.LIST}
              value={selectedStudent?.id ? Number(selectedStudent.id) : null}
              initialLabel={selectedStudent?.name || ""}
              extraParams={{
                status: "active",
                ...(branchFilter ? { branch_id: branchFilter } : {}),
              }}
              placeholder="Ketik untuk mencari nama siswa, level, atau kelas..."
              formatOption={(s) => ({
                value: s.id,
                label: [s.name, s.class_name || s.class_type, s.level, s.branch_name].filter(Boolean).join(" · "),
                raw: s,
              })}
              onChange={(opt) => {
                setSelectedStudent(opt ? opt.raw : null);
                setSelectedStudentId(opt ? String(opt.value) : "");
              }}
            />
          </div>

          <div className="self-end">
            <button
              type="button"
              onClick={loadVideos}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50"
              title="Segarkan data"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {selectedStudent && (
          <div className="rounded-xl bg-slate-50 p-3 text-xs flex flex-wrap items-center justify-between gap-2 border border-slate-100">
            <div className="flex items-center gap-2">
              <User size={15} className="text-brand" />
              <span className="font-bold text-slate-800">{selectedStudent.name}</span>
              <span className="text-slate-400">· {selectedStudent.class_name || "Kelas"}</span>
              <span className="rounded-md bg-brand-50 px-2 py-0.5 font-bold text-brand">
                {selectedStudent.level || "General"}
              </span>
            </div>
            <div className="text-slate-500">
              Total Video: <b>{videos.length}</b> ({beforeVideos.length} Before · {afterVideos.length} After)
            </div>
          </div>
        )}
      </div>

      {/* Before - After Side-by-Side Comparison Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* KOLOM KIRI: BEFORE (AWAL MASUK) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-purple-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-purple-100 p-1.5 text-purple-700">
                <Video size={16} />
              </span>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-purple-900">
                  Video BEFORE (Awal Masuk)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Rekaman speaking pertama saat tes masuk / placement test
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openUploadModal("before")}
              className="text-xs font-bold text-purple-700 hover:underline"
            >
              + Tambah
            </button>
          </div>

          {loading ? (
            <div className="card flex items-center justify-center p-12 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2 text-purple-600" /> Memuat video before...
            </div>
          ) : beforeVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 p-8 text-center text-xs text-slate-500">
              <Clapperboard size={32} className="mx-auto mb-2 text-purple-300" />
              <div className="font-bold text-slate-700">Belum ada Video Before</div>
              <p className="mt-1 text-slate-400 max-w-xs mx-auto">
                Video speaking awal masuk dapat diambil otomatis dari Placement Test atau diunggah langsung oleh admin.
              </p>
              <button
                type="button"
                onClick={() => openUploadModal("before")}
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-purple-700"
              >
                <Plus size={13} /> Upload Video Before Sekarang
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {beforeVideos.map((v) => (
                <div key={v.id} className="card overflow-hidden border-purple-100 shadow-sm">
                  <div className="bg-purple-900">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-72 w-full object-contain"
                      src={resolveAssetUrl(v.video_url)}
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-extrabold text-purple-800">
                        {v.period_label || "Before (Awal Masuk)"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {String(v.created_at || "").slice(0, 10)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{v.title}</h4>

                    {v.notes && (
                      <p className="text-xs text-slate-600 bg-purple-50/50 rounded-xl p-2.5 border border-purple-100/60 leading-relaxed italic">
                        "{v.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Uploader: <b className="text-slate-600">{v.uploader_name || "Admin"}</b>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(v)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(v)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* KOLOM KANAN: AFTER (PROGRES BULANAN DARI TUTOR) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
                <Sparkles size={16} />
              </span>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-900">
                  Video AFTER (Progres Bulanan)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Video evaluasi berbicara bulanan yang diunggah tutor kelas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openUploadModal("after")}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              + Tambah
            </button>
          </div>

          {loading ? (
            <div className="card flex items-center justify-center p-12 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2 text-emerald-600" /> Memuat video after...
            </div>
          ) : afterVideos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/30 p-8 text-center text-xs text-slate-500">
              <Film size={32} className="mx-auto mb-2 text-emerald-300" />
              <div className="font-bold text-slate-700">Belum ada Video Progres (After)</div>
              <p className="mt-1 text-slate-400 max-w-xs mx-auto">
                Tutor dapat merekam dan mengunggah video kemampuan berbicara siswa setiap bulan agar ortu dapat melihat perkembangan anaknya.
              </p>
              <button
                type="button"
                onClick={() => openUploadModal("after")}
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                <Plus size={13} /> Upload Video Progres Bulanan
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {afterVideos.map((v) => (
                <div key={v.id} className="card overflow-hidden border-emerald-100 shadow-sm">
                  <div className="bg-slate-900">
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      className="max-h-72 w-full object-contain"
                      src={resolveAssetUrl(v.video_url)}
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-extrabold text-emerald-800">
                        {v.period_label || `Bulan ${v.month}`}
                      </span>
                      {v.speaking_score !== null && (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                          Skor: {v.speaking_score}
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">{v.title}</h4>

                    {v.notes && (
                      <p className="text-xs text-slate-600 bg-emerald-50/50 rounded-xl p-2.5 border border-emerald-100/60 leading-relaxed italic">
                        "{v.notes}"
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 text-[11px]">
                        Tutor: <b className="text-slate-600">{v.uploader_name || "Tutor"}</b>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(v)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        {isStaff && (
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(v)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: UPLOAD / EDIT VIDEO SPEAKING */}
      <Modal
        open={modalOpen}
        title={
          editingVideo
            ? `Edit Video: ${editingVideo.title}`
            : form.type === "before"
            ? "Upload Video Before (Awal Masuk Siswa)"
            : "Upload Video Progres Bulanan (After)"
        }
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSaveVideo} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Pilih Siswa *</label>
            <AsyncResourceSelect
              endpoint={API_ENDPOINTS.STUDENTS.LIST}
              value={form.student_id ? Number(form.student_id) : null}
              initialLabel={form.student_name || selectedStudent?.name || ""}
              extraParams={{
                status: "active",
                ...(branchFilter ? { branch_id: branchFilter } : {}),
              }}
              placeholder="Ketik untuk mencari nama siswa..."
              formatOption={(s) => ({
                value: s.id,
                label: [s.name, s.class_name || s.class_type, s.level, s.branch_name].filter(Boolean).join(" · "),
                raw: s,
              })}
              onChange={(opt) => {
                setForm((prev) => ({
                  ...prev,
                  student_id: opt ? String(opt.value) : "",
                  student_name: opt ? opt.label : "",
                }));
              }}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tipe Video *</label>
              <select
                className="input !py-1.5 text-xs font-bold"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="before">Before (Awal Masuk)</option>
                <option value="after">After (Progres Bulanan)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Bulan / Periode</label>
              <input
                type="month"
                className="input !py-1.5 text-xs"
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Label Periode</label>
              <input
                className="input !py-1.5 text-xs"
                placeholder="mis. Before (Awal Masuk) / Bulan ke-1"
                value={form.period_label}
                onChange={(e) => setForm({ ...form, period_label: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Skor Speaking (Opsional)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input !py-1.5 text-xs"
                placeholder="mis. 85"
                value={form.speaking_score}
                onChange={(e) => setForm({ ...form, speaking_score: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Judul / Topik Speaking *</label>
            <input
              required
              className="input !py-1.5 text-xs"
              placeholder="mis. Self Introduction & Daily Activities"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Upload File Video Speaking *</label>
            <ImageUploadField
              allowVideo={true}
              value={form.video_url}
              onChange={(url) => setForm({ ...form, video_url: url })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Catatan Perkembangan dari Tutor</label>
            <textarea
              rows="3"
              className="input !py-1.5 text-xs"
              placeholder="mis. Pengucapan kata jauh lebih jelas dan percaya diri dibandingkan awal masuk. Struktur kalimat sudah mulai lengkap."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="btn-ghost !py-1.5 !text-xs"
              onClick={() => setModalOpen(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary !py-1.5 !text-xs font-bold"
            >
              {saving && <Loader2 size={13} className="animate-spin mr-1" />}
              {editingVideo ? "Simpan Perubahan" : "Simpan Video"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
