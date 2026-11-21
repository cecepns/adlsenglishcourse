import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import ImageUploadField from "@/components/ImageUploadField";
import Modal from "@/components/Modal";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

const toWaUrl = (phone, msg) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const intl = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
};

export default function PlacementTestAdmin() {
  const { user } = useAuth();
  const isHQ = ["owner", "admin_pusat"].includes(user?.role);
  const isStaff = STAFF.includes(user?.role);

  const [tab, setTab] = useState("submissions"); // "submissions" | "questions"
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState(user?.role === "admin_cabang" ? String(user?.branch_id || "") : "");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  // Submissions State
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [detailModal, setDetailModal] = useState(null); // submission object
  const [subQuestions, setSubQuestions] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Grading Form State
  const [gradingForm, setGradingForm] = useState({
    speaking_score: "",
    recommended_level: "Basic (A1)",
    assessor_notes: "",
  });
  const [savingGrade, setSavingGrade] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Edit & Delete Submission State
  const [editSubModal, setEditSubModal] = useState(null);
  const [editSubForm, setEditSubForm] = useState({
    candidate_name: "",
    candidate_phone: "",
    candidate_email: "",
    branch_id: "",
    school_origin: "",
    school_grade: "",
    age_or_level: "",
    pg_score: "0",
    total_correct: "0",
    total_pg: "20",
    speaking_video_url: "",
    speaking_score: "",
    recommended_level: "Basic (A1)",
    assessor_notes: "",
    status: "submitted",
  });
  const [savingSubEdit, setSavingSubEdit] = useState(false);
  const [deletingSubId, setDeletingSubId] = useState(null);

  // Questions State
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [qModal, setQModal] = useState(false);
  const [editingQ, setEditingQ] = useState(null);
  const [qForm, setQForm] = useState({
    question_number: 1,
    question_type: "multiple_choice",
    question_text: "",
    image_url: "",
    audio_url: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_option: "A",
    level: "Basic (A1)",
    is_active: 1,
  });
  const [savingQ, setSavingQ] = useState(false);

  // Load branches
  useEffect(() => {
    if (isHQ) {
      api
        .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
        .then((r) => setBranches(r.data.data || []))
        .catch(() => {});
    }
  }, [isHQ]);

  // Load Submissions
  const loadSubmissions = async () => {
    setLoadingSubs(true);
    try {
      const res = await api.get(API_ENDPOINTS.PLACEMENT_TEST.SUBMISSIONS, {
        params: {
          branch_id: branchFilter || undefined,
          status: statusFilter || undefined,
          search: debounced || undefined,
        },
      });
      setSubmissions(res.data.data || []);
    } catch (err) {
      toast.error("Gagal memuat daftar hasil test");
    } finally {
      setLoadingSubs(false);
    }
  };

  // Load Questions
  const loadQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const res = await api.get(API_ENDPOINTS.PLACEMENT_TEST.QUESTIONS);
      setQuestions(res.data.data || []);
    } catch (err) {
      toast.error("Gagal memuat bank soal");
    } finally {
      setLoadingQuestions(false);
    }
  };

  useEffect(() => {
    if (tab === "submissions") {
      loadSubmissions();
    } else {
      loadQuestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, branchFilter, statusFilter, debounced]);

  // Open Detail Modal
  const openDetail = async (sub) => {
    setDetailModal(sub);
    setGradingForm({
      speaking_score: sub.speaking_score !== null ? String(sub.speaking_score) : "",
      recommended_level: sub.recommended_level || "Basic (A1)",
      assessor_notes: sub.assessor_notes || "",
    });
    setLoadingDetail(true);
    try {
      const res = await api.get(API_ENDPOINTS.PLACEMENT_TEST.SUBMISSION_DETAIL(sub.id));
      setDetailModal(res.data.data.submission);
      setSubQuestions(res.data.data.questions || []);
    } catch (err) {
      toast.error("Gagal memuat detail jawaban");
    } finally {
      setLoadingDetail(false);
    }
  };

  // Submit Grade
  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!detailModal) return;
    setSavingGrade(true);
    try {
      await api.put(API_ENDPOINTS.PLACEMENT_TEST.GRADE(detailModal.id), {
        speaking_score: gradingForm.speaking_score ? Number(gradingForm.speaking_score) : null,
        recommended_level: gradingForm.recommended_level,
        assessor_notes: gradingForm.assessor_notes,
        status: "graded",
      });
      toast.success("Penilaian speaking & level rekomendasi berhasil disimpan!");
      loadSubmissions();
      setDetailModal((prev) => ({
        ...prev,
        speaking_score: gradingForm.speaking_score,
        recommended_level: gradingForm.recommended_level,
        assessor_notes: gradingForm.assessor_notes,
        status: "graded",
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan penilaian");
    } finally {
      setSavingGrade(false);
    }
  };

  // Enroll Candidate into Student Database
  const handleEnrollCandidate = async () => {
    if (!detailModal) return;
    const confirmEnroll = window.confirm(
      `Daftarkan ${detailModal.candidate_name} sebagai siswa resmi ADLS dan simpan video speaking sebagai Video Before?`
    );
    if (!confirmEnroll) return;

    setEnrolling(true);
    try {
      const res = await api.post(API_ENDPOINTS.PLACEMENT_TEST.ENROLL(detailModal.id), {
        parent_name: detailModal.candidate_name,
      });
      toast.success(res.data.message || "Calon murid berhasil terdaftar sebagai siswa!");
      loadSubmissions();
      setDetailModal((prev) => ({
        ...prev,
        status: "enrolled",
        student_id: res.data.student_id,
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mendaftarkan siswa");
    } finally {
      setEnrolling(false);
    }
  };

  // Open Edit Submission Modal
  const openEditSub = (sub) => {
    setEditSubModal(sub);
    setEditSubForm({
      candidate_name: sub.candidate_name || "",
      candidate_phone: sub.candidate_phone || "",
      candidate_email: sub.candidate_email || "",
      branch_id: sub.branch_id ? String(sub.branch_id) : "",
      school_origin: sub.school_origin || "",
      school_grade: sub.school_grade || "",
      age_or_level: sub.age_or_level || "",
      pg_score: sub.pg_score !== null && sub.pg_score !== undefined ? String(sub.pg_score) : "0",
      total_correct: sub.total_correct !== null && sub.total_correct !== undefined ? String(sub.total_correct) : "0",
      total_pg: sub.total_pg !== null && sub.total_pg !== undefined ? String(sub.total_pg) : "20",
      speaking_video_url: sub.speaking_video_url || "",
      speaking_score: sub.speaking_score !== null && sub.speaking_score !== undefined ? String(sub.speaking_score) : "",
      recommended_level: sub.recommended_level || "Basic (A1)",
      assessor_notes: sub.assessor_notes || "",
      status: sub.status || "submitted",
    });
  };

  // Save Submission Edits
  const handleSaveSubEdit = async (e) => {
    e.preventDefault();
    if (!editSubModal) return;
    setSavingSubEdit(true);
    try {
      await api.put(API_ENDPOINTS.PLACEMENT_TEST.SUBMISSION_DETAIL(editSubModal.id), {
        candidate_name: editSubForm.candidate_name,
        candidate_phone: editSubForm.candidate_phone,
        candidate_email: editSubForm.candidate_email || null,
        branch_id: editSubForm.branch_id ? Number(editSubForm.branch_id) : null,
        school_origin: editSubForm.school_origin || null,
        school_grade: editSubForm.school_grade || null,
        age_or_level: editSubForm.age_or_level || null,
        pg_score: editSubForm.pg_score !== "" ? Number(editSubForm.pg_score) : 0,
        total_correct: editSubForm.total_correct !== "" ? Number(editSubForm.total_correct) : 0,
        total_pg: editSubForm.total_pg !== "" ? Number(editSubForm.total_pg) : 20,
        speaking_video_url: editSubForm.speaking_video_url || null,
        speaking_score: editSubForm.speaking_score !== "" ? Number(editSubForm.speaking_score) : null,
        recommended_level: editSubForm.recommended_level,
        assessor_notes: editSubForm.assessor_notes || null,
        status: editSubForm.status,
      });
      toast.success("Perubahan data hasil placement test berhasil disimpan!");
      setEditSubModal(null);
      loadSubmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengubah data hasil placement");
    } finally {
      setSavingSubEdit(false);
    }
  };

  // Delete Placement Test Submission
  const handleDeleteSub = async (sub) => {
    if (!window.confirm(`Yakin ingin menghapus data hasil test calon murid "${sub.candidate_name}"?`)) return;
    setDeletingSubId(sub.id);
    try {
      await api.delete(API_ENDPOINTS.PLACEMENT_TEST.SUBMISSION_DETAIL(sub.id));
      toast.success("Data hasil placement test berhasil dihapus!");
      if (detailModal?.id === sub.id) setDetailModal(null);
      loadSubmissions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus data hasil placement");
    } finally {
      setDeletingSubId(null);
    }
  };

  // Questions Management
  const openAddQuestion = () => {
    setEditingQ(null);
    const nextNum = questions.length > 0 ? Math.max(...questions.map((q) => Number(q.question_number) || 0)) + 1 : 1;
    setQForm({
      question_number: nextNum,
      question_type: "multiple_choice",
      question_text: "",
      image_url: "",
      audio_url: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_option: "A",
      level: "Basic (A1)",
      is_active: 1,
    });
    setQModal(true);
  };

  const openEditQuestion = (q) => {
    setEditingQ(q);
    setQForm({
      question_number: q.question_number || 1,
      question_type: q.question_type || "multiple_choice",
      question_text: q.question_text || "",
      image_url: q.image_url || "",
      audio_url: q.audio_url || "",
      option_a: q.option_a || "",
      option_b: q.option_b || "",
      option_c: q.option_c || "",
      option_d: q.option_d || "",
      correct_option: q.correct_option || "A",
      level: q.level || "Basic (A1)",
      is_active: q.is_active !== undefined ? q.is_active : 1,
    });
    setQModal(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!qForm.question_text.trim()) {
      toast.error("Pertanyaan soal wajib diisi");
      return;
    }
    setSavingQ(true);
    try {
      if (editingQ?.id) {
        await api.put(API_ENDPOINTS.PLACEMENT_TEST.QUESTION_DETAIL(editingQ.id), qForm);
        toast.success("Soal berhasil diperbarui");
      } else {
        await api.post(API_ENDPOINTS.PLACEMENT_TEST.QUESTIONS, qForm);
        toast.success("Soal berhasil ditambahkan ke bank soal");
      }
      setQModal(false);
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan soal");
    } finally {
      setSavingQ(false);
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm(`Hapus soal nomor ${q.question_number}?`)) return;
    try {
      await api.delete(API_ENDPOINTS.PLACEMENT_TEST.QUESTION_DETAIL(q.id));
      toast.success("Soal berhasil dihapus");
      loadQuestions();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus soal");
    }
  };

  // Parse candidate answers JSON
  const parsedAnswers = (() => {
    if (!detailModal?.answers_json) return [];
    try {
      return typeof detailModal.answers_json === "string"
        ? JSON.parse(detailModal.answers_json)
        : detailModal.answers_json;
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-sm shadow-brand/20">
              <GraduationCap size={20} />
            </span>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Placement Test CBT &amp; Speaking
            </h1>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Manajemen tes penempatan calon murid baru (20 Soal PG + 1 Video Speaking Before).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/placement-test"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand/30 bg-white px-3.5 py-2 text-xs font-bold text-brand shadow-2xs hover:bg-brand hover:text-white transition"
          >
            <ExternalLink size={14} /> Link Test Calon Murid
          </a>

          {tab === "questions" && isStaff && (
            <button
              type="button"
              onClick={openAddQuestion}
              className="btn-primary !py-2 text-xs font-bold shadow-sm"
            >
              <Plus size={15} /> Tambah Soal CBT
            </button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("submissions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            tab === "submissions"
              ? "border-brand text-brand"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Award size={16} /> Hasil Test Calon Murid ({submissions.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("questions")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            tab === "questions"
              ? "border-brand text-brand"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileQuestion size={16} /> Bank Soal CBT ({questions.length})
        </button>
      </div>

      {/* TAB 1: HASIL TEST CALON MURID */}
      {tab === "submissions" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-[240px] flex-1">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-2.5 text-slate-400" />
                <input
                  className="input !pl-10 !py-2 text-xs w-full"
                  placeholder="Cari nama calon murid, nomor HP, asal sekolah..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isHQ && branches.length > 0 && (
                  <select
                    className="input !py-2 text-xs w-40 sm:w-48"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                  >
                    <option value="">Semua Cabang</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  className="input !py-2 text-xs w-36"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="submitted">Belum Dinilai</option>
                  <option value="graded">Sudah Dinilai</option>
                  <option value="enrolled">Sudah Jadi Siswa</option>
                </select>

                <button
                  type="button"
                  onClick={loadSubmissions}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                  title="Segarkan data"
                >
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="card overflow-hidden">
            {loadingSubs ? (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2 text-brand" /> Memuat hasil test calon murid...
              </div>
            ) : submissions.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                <FileQuestion size={36} className="mx-auto mb-2 text-slate-300" />
                Belum ada data pengerjaan placement test yang cocok.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Nama Calon Murid</th>
                      <th className="px-4 py-3">Cabang</th>
                      <th className="px-4 py-3">Kontak WA</th>
                      <th className="px-4 py-3 text-center">Skor PG</th>
                      <th className="px-4 py-3 text-center">Video Speaking</th>
                      <th className="px-4 py-3">Rekomendasi Level</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map((sub) => {
                      const waUrl = toWaUrl(
                        sub.candidate_phone,
                        `Halo Kak ${sub.candidate_name}, terima kasih telah mengikuti Placement Test di ADLS English Course! Hasil skor PG Anda: ${sub.pg_score}. Rekomendasi level kelas: ${sub.recommended_level}. Apakah ada yang ingin ditanyakan mengenai jadwal kelas?`
                      );

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {String(sub.created_at || "").slice(0, 10)}
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">
                            <div>{sub.candidate_name}</div>
                            {sub.school_origin && (
                              <div className="text-[11px] font-normal text-slate-400">
                                {sub.school_origin} {sub.school_grade ? `(${sub.school_grade})` : ""}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                            {sub.branch_name || "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {waUrl ? (
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
                                title="Chat calon murid via WhatsApp"
                              >
                                <MessageCircle size={14} /> {sub.candidate_phone}
                              </a>
                            ) : (
                              sub.candidate_phone || "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center rounded-lg bg-brand-50 px-2 py-0.5 font-black text-brand text-xs">
                              {sub.pg_score}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {sub.total_correct}/{sub.total_pg} benar
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sub.speaking_video_url ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                <Video size={13} /> Ada Video
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {sub.recommended_level || "Preschool (Pre A1)"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sub.status === "enrolled" ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                                Jadi Siswa
                              </span>
                            ) : sub.status === "graded" ? (
                              <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                                Dinilai
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                                Baru Masuk
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => openDetail(sub)}
                                className="btn-ghost !px-2 !py-1 text-xs font-bold hover:text-brand"
                                title="Lihat detail jawaban & beri nilai"
                              >
                                <Eye size={14} /> Detail
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditSub(sub)}
                                className="btn-ghost !px-2 !py-1 text-xs font-bold text-amber-700 hover:bg-amber-50"
                                title="Edit data calon & hasil test"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              {isStaff && (
                                <button
                                  type="button"
                                  disabled={deletingSubId === sub.id}
                                  onClick={() => handleDeleteSub(sub)}
                                  className="btn-ghost !px-2 !py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                  title="Hapus data hasil test"
                                >
                                  {deletingSubId === sub.id ? (
                                    <Loader2 size={14} className="animate-spin text-rose-600" />
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: BANK SOAL CBT */}
      {tab === "questions" && (
        <div className="space-y-4">
          <div className="card overflow-hidden">
            {loadingQuestions ? (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2 text-brand" /> Memuat bank soal CBT...
              </div>
            ) : questions.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                <BookOpen size={36} className="mx-auto mb-2 text-slate-300" />
                Belum ada soal dalam bank soal.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {questions.map((q) => {
                  const isSpeaking = q.question_type === "speaking";

                  return (
                    <div key={q.id} className="p-4 sm:p-5 hover:bg-slate-50/50 transition flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-black text-brand text-xs">
                          {q.question_number}
                        </span>

                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${
                                isSpeaking
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-brand-50 text-brand"
                              }`}
                            >
                              {isSpeaking ? "Speaking Task (Upload Video)" : "Pilihan Ganda"}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {q.level || "General"}
                            </span>
                            {Number(q.is_active) === 0 && (
                              <span className="rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">
                                Nonaktif
                              </span>
                            )}
                          </div>

                          <p className="text-sm font-bold text-slate-900 leading-snug whitespace-pre-line">
                            {q.question_text}
                          </p>

                          {q.image_url && (
                            <div className="pt-1">
                              <img
                                src={resolveAssetUrl(q.image_url)}
                                alt="Gambar Soal"
                                className="max-h-36 rounded-lg border border-slate-200 object-contain"
                              />
                            </div>
                          )}

                          {!isSpeaking && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-xs">
                              {[
                                { k: "A", t: q.option_a },
                                { k: "B", t: q.option_b },
                                { k: "C", t: q.option_c },
                                { k: "D", t: q.option_d },
                              ]
                                .filter((o) => Boolean(o.t))
                                .map((o) => (
                                  <div
                                    key={o.k}
                                    className={`rounded-lg px-2.5 py-1.5 flex items-center gap-2 ${
                                      q.correct_option === o.k
                                        ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200"
                                        : "bg-slate-50 text-slate-700 border border-slate-100"
                                    }`}
                                  >
                                    <span className="font-bold">{o.k}.</span>
                                    <span>{o.t}</span>
                                    {q.correct_option === o.k && (
                                      <span className="ml-auto text-[10px] uppercase tracking-wider text-emerald-700 font-black">
                                        ✓ Kunci
                                      </span>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {isStaff && (
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={() => openEditQuestion(q)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-brand transition"
                            title="Edit Soal"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                            title="Hapus Soal"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: DETAIL & PENILAIAN HASIL TEST */}
      <Modal
        open={Boolean(detailModal)}
        title={`Hasil Placement Test: ${detailModal?.candidate_name || ""}`}
        onClose={() => setDetailModal(null)}
      >
        {detailModal && (
          <div className="space-y-6">
            {/* Candidate Overview Card */}
            <div className="rounded-2xl border border-brand-light/30 bg-brand-50/40 p-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-sm text-brand-dark">
                  {detailModal.candidate_name}
                </span>
                <span className="rounded-md bg-white px-2 py-0.5 font-bold text-brand shadow-2xs">
                  {detailModal.branch_name || "ADLS Cabang"}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 text-slate-600">
                <div>
                  No. WA: <b className="text-slate-800">{detailModal.candidate_phone || "-"}</b>
                </div>
                <div>
                  Email: <b className="text-slate-800">{detailModal.candidate_email || "-"}</b>
                </div>
                <div>
                  Sekolah / Kantor: <b className="text-slate-800">{detailModal.school_origin || "-"}</b>
                </div>
                <div>
                  Tingkat / Usia: <b className="text-slate-800">{detailModal.age_or_level || detailModal.school_grade || "-"}</b>
                </div>
              </div>
            </div>

            {/* Test Summary Badges */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500">Skor Pilihan Ganda</div>
                <div className="text-2xl font-black text-brand">{detailModal.pg_score}</div>
                <div className="text-[10px] text-slate-400">
                  {detailModal.total_correct} dari {detailModal.total_pg} soal benar
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500">Nilai Speaking</div>
                <div className="text-2xl font-black text-emerald-600">
                  {detailModal.speaking_score !== null ? detailModal.speaking_score : "-"}
                </div>
                <div className="text-[10px] text-slate-400">Skor evaluasi speaking</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                <div className="text-[11px] font-bold text-slate-500">Rekomendasi Level</div>
                <div className="text-sm font-extrabold text-slate-800 mt-1">
                  {detailModal.recommended_level || "Basic (A1)"}
                </div>
                <div className="text-[10px] text-slate-400">Level penempatan kelas</div>
              </div>
            </div>

            {/* Speaking Video Player (If Available) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Video size={16} className="text-brand" /> Rekaman Video Speaking Calon Murid:
              </h4>
              {detailModal.speaking_video_url ? (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black shadow-sm">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-80 w-full object-contain"
                    src={resolveAssetUrl(detailModal.speaking_video_url)}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  Calon murid belum mengunggah video speaking saat placement test.
                </div>
              )}
            </div>

            {/* Form Evaluasi & Penilaian Speaking */}
            <form onSubmit={handleSaveGrade} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-dark">
                Input Penilaian Speaking &amp; Level Rekomendasi
              </h4>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Nilai Speaking (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input !py-1.5 text-xs"
                    placeholder="mis. 85"
                    value={gradingForm.speaking_score}
                    onChange={(e) => setGradingForm({ ...gradingForm, speaking_score: e.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Level Rekomendasi ADLS</label>
                  <select
                    className="input !py-1.5 text-xs"
                    value={gradingForm.recommended_level}
                    onChange={(e) => setGradingForm({ ...gradingForm, recommended_level: e.target.value })}
                  >
                    <option value="Preschool (Pre A1)">Preschool (Pre A1)</option>
                    <option value="Basic (A1)">Basic (A1)</option>
                    <option value="Intermediate (A2)">Intermediate (A2)</option>
                    <option value="Advance (B1 - B2)">Advance (B1 - B2)</option>
                    <option value="Umum / Karyawan">Umum / Karyawan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Catatan Evaluasi Tutor / Admin</label>
                <textarea
                  rows="2"
                  className="input !py-1.5 text-xs"
                  placeholder="mis. Pelafalan vokal cukup baik, perlu peningkatan kosa kata dasar dan kepercayaan diri dalam berbicara..."
                  value={gradingForm.assessor_notes}
                  onChange={(e) => setGradingForm({ ...gradingForm, assessor_notes: e.target.value })}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                {isStaff && detailModal.status !== "enrolled" ? (
                  <button
                    type="button"
                    onClick={handleEnrollCandidate}
                    disabled={enrolling}
                    className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 !py-1.5 !text-xs font-bold shadow-xs"
                    title="Jadikan murid resmi & simpan video speaking sebagai Video Before"
                  >
                    {enrolling ? <Loader2 size={13} className="animate-spin mr-1" /> : <UserCheck size={14} className="mr-1" />}
                    Jadikan Siswa Resmi (+ Set Video Before)
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Terdaftar sebagai Siswa ADLS
                  </span>
                )}

                <button
                  type="submit"
                  disabled={savingGrade}
                  className="btn-primary !py-1.5 !text-xs font-bold"
                >
                  {savingGrade && <Loader2 size={13} className="animate-spin mr-1" />}
                  Simpan Nilai &amp; Rekomendasi
                </button>
              </div>
            </form>

            {/* Jawaban Lengkap Pilihan Ganda Siswa */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Rincian Jawaban Soal Pilihan Ganda:
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 text-xs">
                {subQuestions
                  .filter((q) => q.question_type !== "speaking")
                  .map((q) => {
                    const ansObj = parsedAnswers.find(
                      (a) => Number(a.question_id) === Number(q.id) || Number(a.question_number) === Number(q.question_number)
                    );
                    const selected = ansObj?.selected_option || "-";
                    const isCorrect = String(selected).trim().toUpperCase() === String(q.correct_option || "").trim().toUpperCase();

                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl border p-2.5 transition ${
                          isCorrect ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-800">
                            No. {q.question_number}: {q.question_text}
                          </span>
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-black shrink-0 ${
                              isCorrect ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {isCorrect ? "BENAR" : "SALAH"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
                          <span>
                            Jawaban Siswa: <b>{selected}</b>
                          </span>
                          <span>
                            Kunci Jawaban: <b>{q.correct_option}</b>
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="btn-ghost !py-1.5 !text-xs"
                onClick={() => setDetailModal(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL: TAMBAH / EDIT SOAL CBT */}
      <Modal
        open={qModal}
        title={editingQ ? `Edit Soal CBT: No. ${editingQ.question_number}` : "Tambah Soal CBT Baru"}
        onClose={() => setQModal(false)}
      >
        <form onSubmit={handleSaveQuestion} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nomor Soal *</label>
              <input
                type="number"
                required
                className="input !py-1.5 text-xs"
                value={qForm.question_number}
                onChange={(e) => setQForm({ ...qForm, question_number: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tipe Soal *</label>
              <select
                className="input !py-1.5 text-xs"
                value={qForm.question_type}
                onChange={(e) => setQForm({ ...qForm, question_type: e.target.value })}
              >
                <option value="multiple_choice">Pilihan Ganda (PG)</option>
                <option value="speaking">Speaking Task (Upload Video)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tingkat Level</label>
              <select
                className="input !py-1.5 text-xs"
                value={qForm.level}
                onChange={(e) => setQForm({ ...qForm, level: e.target.value })}
              >
                <option value="Preschool (Pre A1)">Preschool (Pre A1)</option>
                <option value="Basic (A1)">Basic (A1)</option>
                <option value="Intermediate (A2)">Intermediate (A2)</option>
                <option value="Advance (B1 - B2)">Advance (B1 - B2)</option>
                <option value="Speaking Test">Speaking Test</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Pertanyaan / Instruksi Soal *</label>
            <textarea
              required
              rows="3"
              className="input !py-1.5 text-xs"
              placeholder="Ketik teks pertanyaan atau petunjuk soal..."
              value={qForm.question_text}
              onChange={(e) => setQForm({ ...qForm, question_text: e.target.value })}
            />
          </div>

          {/* Upload Gambar Soal (Optional) */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Gambar Soal (Opsional)</label>
            <ImageUploadField
              value={qForm.image_url}
              onChange={(url) => setQForm({ ...qForm, image_url: url })}
            />
          </div>

          {/* Opsi Jawaban (Jika Pilihan Ganda) */}
          {qForm.question_type === "multiple_choice" && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
              <div className="text-xs font-bold text-slate-700">Pilihan Jawaban (A, B, C, D) &amp; Kunci:</div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">Pilihan A *</label>
                  <input
                    required
                    className="input !py-1.5 text-xs"
                    placeholder="mis. Apple"
                    value={qForm.option_a}
                    onChange={(e) => setQForm({ ...qForm, option_a: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">Pilihan B *</label>
                  <input
                    required
                    className="input !py-1.5 text-xs"
                    placeholder="mis. Banana"
                    value={qForm.option_b}
                    onChange={(e) => setQForm({ ...qForm, option_b: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">Pilihan C *</label>
                  <input
                    required
                    className="input !py-1.5 text-xs"
                    placeholder="mis. Orange"
                    value={qForm.option_c}
                    onChange={(e) => setQForm({ ...qForm, option_c: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">Pilihan D *</label>
                  <input
                    required
                    className="input !py-1.5 text-xs"
                    placeholder="mis. Grape"
                    value={qForm.option_d}
                    onChange={(e) => setQForm({ ...qForm, option_d: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Kunci Jawaban Benar *</label>
                <div className="flex gap-2">
                  {["A", "B", "C", "D"].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setQForm({ ...qForm, correct_option: opt })}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-black transition ${
                        qForm.correct_option === opt
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Pilihan {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              className="btn-ghost !py-1.5 !text-xs"
              onClick={() => setQModal(false)}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingQ}
              className="btn-primary !py-1.5 !text-xs font-bold"
            >
              {savingQ && <Loader2 size={13} className="animate-spin mr-1" />}
              {editingQ ? "Simpan Perubahan" : "Tambahkan Soal"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL EDIT HASIL PLACEMENT TEST */}
      <Modal
        open={!!editSubModal}
        title={`Edit Data Hasil Placement Test: ${editSubModal?.candidate_name || ""}`}
        onClose={() => setEditSubModal(null)}
      >
        {editSubModal && (
          <form onSubmit={handleSaveSubEdit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
              Perbarui data identitas calon murid, skor pengerjaan CBT pilihan ganda, video &amp; nilai speaking, serta rekomendasi level kelas.
            </div>

            {/* Bagian 1: Data Identitas Calon Murid */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="text-xs font-bold text-slate-800">1. Data Calon Murid &amp; Cabang</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Calon Murid *</label>
                  <input
                    required
                    className="input !py-1.5 text-xs"
                    value={editSubForm.candidate_name}
                    onChange={(e) => setEditSubForm({ ...editSubForm, candidate_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">No. WhatsApp / HP *</label>
                  <input
                    required
                    className="input !py-1.5 text-xs"
                    placeholder="mis. 08123456789"
                    value={editSubForm.candidate_phone}
                    onChange={(e) => setEditSubForm({ ...editSubForm, candidate_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    className="input !py-1.5 text-xs"
                    value={editSubForm.candidate_email}
                    onChange={(e) => setEditSubForm({ ...editSubForm, candidate_email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Cabang ADLS</label>
                  <select
                    className="input !py-1.5 text-xs"
                    value={editSubForm.branch_id}
                    onChange={(e) => setEditSubForm({ ...editSubForm, branch_id: e.target.value })}
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Asal Sekolah</label>
                  <input
                    className="input !py-1.5 text-xs"
                    placeholder="mis. SDN Sukadami 01"
                    value={editSubForm.school_origin}
                    onChange={(e) => setEditSubForm({ ...editSubForm, school_origin: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Kelas / Grade</label>
                  <input
                    className="input !py-1.5 text-xs"
                    placeholder="mis. Kelas 4 SD"
                    value={editSubForm.school_grade}
                    onChange={(e) => setEditSubForm({ ...editSubForm, school_grade: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Usia / Kategori</label>
                  <input
                    className="input !py-1.5 text-xs"
                    placeholder="mis. 10 thn / Umum"
                    value={editSubForm.age_or_level}
                    onChange={(e) => setEditSubForm({ ...editSubForm, age_or_level: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Bagian 2: Nilai CBT Pilihan Ganda */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="text-xs font-bold text-slate-800">2. Hasil Pilihan Ganda (CBT)</div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Skor PG (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input !py-1.5 text-xs"
                    value={editSubForm.pg_score}
                    onChange={(e) => setEditSubForm({ ...editSubForm, pg_score: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Jumlah Benar</label>
                  <input
                    type="number"
                    min="0"
                    className="input !py-1.5 text-xs"
                    value={editSubForm.total_correct}
                    onChange={(e) => setEditSubForm({ ...editSubForm, total_correct: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Total Soal PG</label>
                  <input
                    type="number"
                    min="1"
                    className="input !py-1.5 text-xs"
                    value={editSubForm.total_pg}
                    onChange={(e) => setEditSubForm({ ...editSubForm, total_pg: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Bagian 3: Video Speaking & Nilai Evaluasi */}
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
              <div className="text-xs font-bold text-slate-800">3. Video Speaking &amp; Penilaian</div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">File Video Speaking (Upload / URL)</label>
                <ImageUploadField
                  value={editSubForm.speaking_video_url}
                  onChange={(url) => setEditSubForm({ ...editSubForm, speaking_video_url: url })}
                  allowVideo={true}
                  buttonLabel="Pilih File Video Speaking"
                  placeholder="Unggah rekaman video speaking calon murid..."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Nilai Speaking (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input !py-1.5 text-xs"
                    placeholder="Kosongkan jika belum"
                    value={editSubForm.speaking_score}
                    onChange={(e) => setEditSubForm({ ...editSubForm, speaking_score: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Rekomendasi Level *</label>
                  <select
                    className="input !py-1.5 text-xs"
                    value={editSubForm.recommended_level}
                    onChange={(e) => setEditSubForm({ ...editSubForm, recommended_level: e.target.value })}
                  >
                    <option value="Preschool (Pre A1)">Preschool (Pre A1)</option>
                    <option value="Basic (A1)">Basic (A1)</option>
                    <option value="Intermediate (A2)">Intermediate (A2)</option>
                    <option value="Advance (B1 - B2)">Advance (B1 - B2)</option>
                    <option value="Umum / Karyawan">Umum / Karyawan</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Status Pengerjaan *</label>
                  <select
                    className="input !py-1.5 text-xs"
                    value={editSubForm.status}
                    onChange={(e) => setEditSubForm({ ...editSubForm, status: e.target.value })}
                  >
                    <option value="submitted">submitted (Belum Dinilai)</option>
                    <option value="graded">graded (Sudah Dinilai)</option>
                    <option value="enrolled">enrolled (Sudah Jadi Siswa)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Catatan Evaluasi / Saran Tutor</label>
                <textarea
                  rows="2"
                  className="input !py-1.5 text-xs"
                  placeholder="Catatan kelebihan, aspek perlu perbaikan, atau rekomendasi..."
                  value={editSubForm.assessor_notes}
                  onChange={(e) => setEditSubForm({ ...editSubForm, assessor_notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="btn-ghost !py-1.5 !text-xs"
                onClick={() => setEditSubModal(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingSubEdit}
                className="btn-primary !py-1.5 !text-xs font-bold"
              >
                {savingSubEdit && <Loader2 size={13} className="animate-spin mr-1" />}
                Simpan Perubahan
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
