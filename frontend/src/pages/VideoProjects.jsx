import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Award, CheckCircle2, ExternalLink, Film, Loader2, Plus, Search, Star } from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsyncResourceSelect from "@/components/AsyncResourceSelect";
import MediaUploadField from "@/components/MediaUploadField";
import Modal from "@/components/Modal";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

export default function VideoProjects() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  const [submitModal, setSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    student_id: null,
    student_name: "",
    class_id: null,
    class_name: "",
    branch_id: null,
    month: new Date().toISOString().slice(0, 7),
    title: "",
    video_url: "",
    description: "",
  });

  const [reviewModal, setReviewModal] = useState(null);
  const [reviewForm, setReviewForm] = useState({ score: "", feedback: "", status: "reviewed" });
  const [saving, setSaving] = useState(false);

  const isReviewer = [...STAFF, "tutor"].includes(user.role);
  const isStudentSide = ["siswa", "ortu"].includes(user.role);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.VIDEO_PROJECTS.LIST, {
        params: { limit: 100, search: debounced || undefined },
      });
      setRows(data.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const openSubmit = async () => {
    const base = {
      student_id: null,
      student_name: "",
      class_id: null,
      class_name: "",
      branch_id: user.branch_id || null,
      month: new Date().toISOString().slice(0, 7),
      title: "",
      video_url: "",
      description: "",
    };
    if (isStudentSide) {
      try {
        const { data } = await api.get(API_ENDPOINTS.MY_STUDENTS);
        const first = data.data?.[0];
        if (first) {
          base.student_id = first.id;
          base.student_name = first.name;
          base.class_id = first.class_id || null;
          base.class_name = first.class_name || "";
          base.branch_id = first.branch_id || user.branch_id || null;
        }
      } catch {
        /* ignore */
      }
    }
    setSubmitForm(base);
    setSubmitModal(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    if (!submitForm.student_id || !submitForm.title.trim() || !submitForm.video_url.trim()) {
      toast.error("Siswa, judul project, dan file/link video wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.VIDEO_PROJECTS.LIST, {
            student_id: submitForm.student_id,
            class_id: submitForm.class_id,
            branch_id: submitForm.branch_id,
            month: submitForm.month,
            title: submitForm.title,
            video_url: submitForm.video_url,
            description: submitForm.description,
          }),
        { success: getClosingGreeting(user.role, "Project video bulanan berhasil dikumpulkan!") }
      );
      setSubmitModal(false);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const openReview = (row) => {
    setReviewModal(row);
    setReviewForm({
      score: row.score ?? "",
      feedback: row.feedback || "",
      status: row.status === "reviewed" ? "reviewed" : "reviewed",
    });
  };

  const handleReview = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request(
        () => api.put(API_ENDPOINTS.VIDEO_PROJECTS.DETAIL(reviewModal.id), reviewForm),
        { success: getClosingGreeting(user.role, "Penilaian project video berhasil disimpan.") }
      );
      setReviewModal(null);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Project Video Bulanan</h1>
          <p className="text-sm text-slate-500">Pengumpulan tugas video Speaking/Project bulanan oleh siswa dan apresiasi tutor</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              className="input !pl-10"
              placeholder="Cari siswa / judul / bulan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button type="button" onClick={openSubmit} className="btn-primary">
            <Plus size={16} /> Kumpulkan Video
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card h-52 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center text-slate-400">
          <Film size={42} className="mb-2" />
          <p className="text-sm font-semibold">Belum ada project video yang dikumpulkan</p>
          <p className="mt-1 text-xs">Klik "Kumpulkan Video" untuk mengunggah video (.mp4/.webm/.mov) atau menempelkan tautan video bulanan.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((v) => {
            const url = resolveAssetUrl(v.video_url);
            const isDirectVideo = url && /\.(mp4|webm|mov)(\?|$)/i.test(url);
            return (
              <div key={v.id} className="card flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand">{v.month}</span>
                      <h3 className="mt-2 text-lg font-extrabold text-slate-900">{v.title}</h3>
                      <p className="text-xs font-semibold text-slate-600">
                        {v.student_name || `Siswa #${v.student_id}`}
                        {v.class_name ? ` · ${v.class_name}` : ""}
                        {v.branch_name ? ` · ${v.branch_name}` : ""}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
                        v.status === "reviewed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {v.status === "reviewed" && <CheckCircle2 size={13} />}
                      {v.status === "reviewed" ? "Dinilai" : "Dikumpulkan"}
                    </span>
                  </div>

                  {v.description && <p className="mt-2.5 text-sm text-slate-600">{v.description}</p>}

                  <div className="mt-3">
                    {isDirectVideo ? (
                      <video controls src={url} className="max-h-52 w-full rounded-xl border border-slate-200 bg-black" preload="metadata" />
                    ) : (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-brand-light/40 bg-brand-50 px-3.5 py-2 text-xs font-bold text-brand hover:bg-brand-100"
                      >
                        <ExternalLink size={14} /> Tonton Video Project
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2 text-xs">
                    {v.score !== null && v.score !== undefined ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 font-extrabold text-amber-700">
                        <Star size={13} /> Nilai: {v.score}
                      </span>
                    ) : (
                      <span className="text-slate-400">Menunggu penilaian tutor</span>
                    )}
                    {v.feedback && <span className="text-slate-600">"{v.feedback}"</span>}
                  </div>
                  {isReviewer && (
                    <button type="button" onClick={() => openReview(v)} className="btn-ghost !px-3 !py-1.5 text-xs">
                      <Award size={14} /> Nilai / Feedback
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={submitModal} title="Kumpulkan Project Video Bulanan" onClose={() => setSubmitModal(false)}>
        <form onSubmit={handleSubmitProject} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Siswa *</label>
            <AsyncResourceSelect
              endpoint={isStudentSide ? API_ENDPOINTS.MY_STUDENTS : API_ENDPOINTS.STUDENTS.LIST}
              value={submitForm.student_id}
              initialLabel={submitForm.student_name}
              placeholder="Pilih nama siswa..."
              formatOption={(s) => ({ value: s.id, label: [s.name, s.level, s.branch_name].filter(Boolean).join(" · "), raw: s })}
              onChange={(opt) =>
                setSubmitForm((prev) => ({
                  ...prev,
                  student_id: opt ? opt.value : null,
                  student_name: opt ? opt.label : "",
                  class_id: opt?.raw?.class_id || prev.class_id,
                  branch_id: opt?.raw?.branch_id || prev.branch_id,
                }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bulan (YYYY-MM) *</label>
              <input type="month" className="input" required value={submitForm.month} onChange={(e) => setSubmitForm({ ...submitForm, month: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Judul Project *</label>
              <input className="input" required value={submitForm.title} onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })} placeholder="mis. My Daily Routine Speech" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Upload Video / Tautan Video *</label>
            <MediaUploadField mode="video" value={submitForm.video_url} onChange={(url) => setSubmitForm({ ...submitForm, video_url: url })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Keterangan Singkat</label>
            <textarea rows={2} className="input" value={submitForm.description} onChange={(e) => setSubmitForm({ ...submitForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setSubmitModal(false)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Kumpulkan
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!reviewModal} title={`Nilai Project: ${reviewModal?.title || ""}`} onClose={() => setReviewModal(null)}>
        <form onSubmit={handleReview} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Nilai Video (0-100)</label>
            <input type="number" min="0" max="100" className="input" value={reviewForm.score} onChange={(e) => setReviewForm({ ...reviewForm, score: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Feedback / Apresiasi Tutor</label>
            <textarea rows={3} className="input" placeholder="Berikan catatan dan apresiasi untuk siswa..." value={reviewForm.feedback} onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setReviewModal(null)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Simpan Nilai
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

