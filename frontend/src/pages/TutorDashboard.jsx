import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BellRing,
  BookOpenCheck,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Play,
  RefreshCw,
  Save,
  School,
  Sparkles,
  UserMinus,
  Users,
  Video,
  X,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting, getOpeningGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import DatePickerInput from "@/components/DatePickerInput";
import ImageUploadField from "@/components/ImageUploadField";
import LearningJourneyRoadmap from "@/components/LearningJourneyRoadmap";
import Modal from "@/components/Modal";
import MonthlyEvaluationTable from "@/components/MonthlyEvaluationTable";

const ATT_OPTIONS = [
  { value: "hadir", label: "Hadir", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "izin", label: "Izin", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "sakit", label: "Sakit", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "alpha", label: "Alpha", cls: "bg-red-100 text-red-700 border-red-200" },
];

export default function TutorDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [journeyStudentId, setJourneyStudentId] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));

  const [classDetail, setClassDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [sharedMaterial, setSharedMaterial] = useState("");
  const [sharedHomework, setSharedHomework] = useState("");
  const [rows, setRows] = useState([]);

  // Day Filter Tabs (PDF Hal 1 Item 2)
  const [dayFilter, setDayFilter] = useState("Hari Ini");

  // Classroom Activity Photos (Dokumentasi Foto Belajar ke Orang Tua)
  const [activityPhotos, setActivityPhotos] = useState([]);
  const [photoForm, setPhotoForm] = useState({
    photo_url: "",
    session_time: "",
    attendance_summary: "",
    notes: "",
  });
  const [submittingPhoto, setSubmittingPhoto] = useState(false);

  // Filter Rentang Tanggal Banner (PDF Hal 1 - Revisi Tutor)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal Lembar Penilaian Evaluasi Bulanan (PDF Hal 2 - Revisi Tutor)
  const [evalModal, setEvalModal] = useState(null);

  // Tutor Backup State (PDF Hal 4)
  const [backupModalClass, setBackupModalClass] = useState(null);
  const [backupReason, setBackupReason] = useState("");
  const [backupDate, setBackupDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [backupSubmitting, setBackupSubmitting] = useState(false);
  const [acceptingSubId, setAcceptingSubId] = useState(null);

  const openRequestBackupModal = (c) => {
    setBackupModalClass(c);
    setBackupReason("");
    setBackupDate(sessionDate || new Date().toISOString().slice(0, 10));
  };

  const handleSendBackupRequest = async (e) => {
    e.preventDefault();
    if (!backupModalClass?.id) return;
    if (!backupReason.trim()) {
      return toast.error("Silakan tuliskan alasan tidak bisa hadir kelas");
    }
    setBackupSubmitting(true);
    try {
      await request(
        () =>
          api.post(`/tutor-portal/classes/${backupModalClass.id}/request-backup`, {
            substitute_date: backupDate,
            reason: backupReason.trim(),
          }),
        { success: "Permintaan tutor backup berhasil diajukan ke sistem!" }
      );
      setBackupModalClass(null);
      loadOverview();
    } catch {
      /* handled */
    } finally {
      setBackupSubmitting(false);
    }
  };

  const handleAcceptBackup = async (subId) => {
    if (!window.confirm("Yakin ingin menerima tugas sebagai Tutor Pengganti (Backup) untuk kelas ini?")) return;
    setAcceptingSubId(subId);
    try {
      await request(
        () => api.post(`/tutor-portal/backup-requests/${subId}/accept`),
        { success: "Berhasil di-ACC! Kelas kini aktif di dashboard jadwal Anda." }
      );
      loadOverview();
    } catch {
      /* handled */
    } finally {
      setAcceptingSubId(null);
    }
  };

  // Aturan Periode Penilaian Bulanan (PDF Hal 2: fungsi aktif tgl 20-31 setiap bulannya)
  const todayDayNum = new Date().getDate();
  const isEvaluationWindow = todayDayNum >= 20 && todayDayNum <= 31;

  const openEvaluationModal = async (student) => {
    const evalMonth = sessionDate ? sessionDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
    setEvalModal({
      student,
      month: evalMonth,
      structure: [],
      scores: {},
      notes: "",
      title: `LEMBAR EVALUASI BULANAN`,
      loading: true,
      saving: false,
    });
    try {
      const { data } = await api.get(API_ENDPOINTS.MONTHLY_EVALUATIONS.GET, {
        params: {
          student_id: student.student_id || student.id,
          class_id: selectedClassId,
          month: evalMonth,
        },
      });
      const d = data.data || {};
      setEvalModal((prev) =>
        prev
          ? {
              ...prev,
              title: d.title || `LEMBAR EVALUASI ${evalMonth}`,
              structure: d.structure || [],
              scores: d.scores || {},
              notes: d.notes || "",
              loading: false,
            }
          : null
      );
    } catch {
      toast.error("Gagal memuat template lembar evaluasi bulanan");
      setEvalModal((prev) => (prev ? { ...prev, loading: false } : null));
    }
  };

  const handleScoreChange = (crId, val) => {
    setEvalModal((prev) =>
      prev
        ? {
            ...prev,
            scores: { ...prev.scores, [crId]: val },
          }
        : null
    );
  };

  const saveEvaluationModal = async () => {
    if (!evalModal) return;
    setEvalModal((prev) => ({ ...prev, saving: true }));
    try {
      await request(
        () =>
          api.put(API_ENDPOINTS.MONTHLY_EVALUATIONS.SCORES, {
            student_id: evalModal.student.student_id || evalModal.student.id,
            class_id: selectedClassId,
            month: evalModal.month,
            scores: evalModal.scores,
            notes: evalModal.notes,
          }),
        { success: getClosingGreeting("tutor", "Penilaian evaluasi bulanan siswa berhasil disimpan & tersinkron ke akun orang tua!") }
      );
      setEvalModal(null);
    } catch {
      setEvalModal((prev) => ({ ...prev, saving: false }));
    }
  };

  const loadPhotos = useCallback(async (clsId) => {
    if (!clsId) return setActivityPhotos([]);
    try {
      const { data } = await api.get(API_ENDPOINTS.CLASS_ACTIVITY_PHOTOS, { params: { class_id: clsId } });
      setActivityPhotos(data.data || []);
    } catch {
      setActivityPhotos([]);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.TUTOR_PORTAL.OVERVIEW);
      const ov = data.data;
      setOverview(ov);
      if (ov?.server_date) setSessionDate(ov.server_date);
      if (ov?.classes?.length && !ov.classes.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(ov.classes[0].id);
      }
    } catch {
      setOverview({ branches: [], classes: [] });
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  const loadClassDetail = useCallback(async (clsId, dateStr) => {
    if (!clsId) {
      setClassDetail(null);
      setRows([]);
      return;
    }
    setDetailLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.TUTOR_PORTAL.CLASS_DETAIL(clsId), {
        params: { date: dateStr, month: String(dateStr || "").slice(0, 7) },
      });
      const detail = data.data;
      setClassDetail(detail);
      const list = detail?.students || [];
      const firstMaterial = list.find((s) => s.material)?.material || "";
      const firstHomework = list.find((s) => s.homework)?.homework || "";
      setSharedMaterial(firstMaterial);
      setSharedHomework(firstHomework);
      setRows(list);
    } catch {
      setClassDetail(null);
      setRows([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassDetail(selectedClassId, sessionDate);
      loadPhotos(selectedClassId);
    }
  }, [selectedClassId, sessionDate, loadClassDetail, loadPhotos]);

  const handleClockIn = async (cls) => {
    setCheckingInId(cls.id);
    try {
      const res = await request(() => api.post(API_ENDPOINTS.TUTOR_PORTAL.CHECK_IN, { class_id: cls.id }));
      toast.success(getClosingGreeting("tutor", res?.message || `Absensi masuk kelas ${cls.class_type || cls.name} berhasil dicatat!`));
      await loadOverview();
      if (selectedClassId === cls.id) {
        await loadClassDetail(cls.id, sessionDate);
      }
    } catch {
      /* toast handled */
    } finally {
      setCheckingInId(null);
    }
  };

  const updateRow = (studentId, patch) => {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, ...patch } : r)));
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, attendance_status: "hadir" })));
  };

  const calcAttSummary = () => {
    if (!rows.length) return "";
    const hadir = rows.filter((r) => r.attendance_status === "hadir").length;
    const izin = rows.filter((r) => r.attendance_status === "izin" || r.attendance_status === "sakit").length;
    const alpha = rows.filter((r) => r.attendance_status === "alpha").length;
    return `Hadir: ${hadir} siswa dari ${rows.length} siswa · Izin: ${izin} · Alpha: ${alpha}`;
  };

  const handleSavePhoto = async (e) => {
    e.preventDefault();
    if (!photoForm.photo_url) {
      toast.error("Dokumentasi kegiatan (foto/video) wajib diunggah");
      return;
    }
    setSubmittingPhoto(true);
    const summary = photoForm.attendance_summary || calcAttSummary();
    const time = photoForm.session_time || (classDetail?.class?.schedule || "16.00-17.30");
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.CLASS_ACTIVITY_PHOTOS, {
            class_id: selectedClassId,
            session_date: sessionDate,
            session_time: time,
            photo_url: photoForm.photo_url,
            attendance_summary: summary,
            material: sharedMaterial,
            homework: sharedHomework,
            notes: photoForm.notes,
          }),
        { success: getClosingGreeting("tutor", "Dokumentasi kegiatan kelas (foto/video) berhasil dikirim & terhubung ke orang tua!") }
      );
      setPhotoForm({ photo_url: "", session_time: "", attendance_summary: "", notes: "" });
      loadPhotos(selectedClassId);
    } catch {
      /* toast handled */
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const saveSession = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;
    if (!rows.length) {
      toast.error("Belum ada siswa aktif di kelas ini");
      return;
    }
    setSaving(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.TUTOR_PORTAL.SAVE_SESSION(selectedClassId), {
            date: sessionDate,
            report_month: sessionDate.slice(0, 7),
            material: sharedMaterial,
            homework: sharedHomework,
            entries: rows,
          }),
        { success: getClosingGreeting("tutor", "Absensi siswa & laporan nilai belajar berhasil disimpan!") }
      );
      await loadClassDetail(selectedClassId, sessionDate);
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const classes = overview?.classes || [];
  const branches = overview?.branches || [];

  const todayDayName = new Date().toLocaleDateString("id-ID", { weekday: "long" }); // "Senin", "Selasa", dll.
  const filteredClasses = classes.filter((c) => {
    if (dayFilter === "Semua Hari") return true;
    if (c.is_backup) return true;
    const targetDay = dayFilter === "Hari Ini" ? todayDayName : dayFilter;
    const targetLower = targetDay.toLowerCase();
    const days = [c.day_1, c.day_2, c.day_3].filter(Boolean).map((d) => String(d).trim().toLowerCase());
    if (days.some((d) => d === targetLower || d.includes(targetLower))) return true;
    if (c.schedule && c.schedule.toLowerCase().includes(targetLower)) return true;
    return false;
  });

  return (
    <div className="space-y-5">
      {/* Header Gradient Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <Sparkles size={13} className="text-amber-300" />
              Portal Mengajar Tutor ADLS · 1 Akun Multi-Cabang
            </div>
            <h1 className="mt-2.5 text-xl font-extrabold sm:text-2xl">{getOpeningGreeting(user)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-sky-100">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-white">
                <Clock size={13} /> Jam Server: {overview?.server_date || "-"} · {overview?.server_time || "--:--"} WIB
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-white">
                <Building2 size={13} /> Mengajar di {branches.length} Cabang ({classes.length} Kelas Anda)
              </span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2.5 sm:items-end self-start">
            <div className="flex flex-wrap gap-2">
              <Link to="/audio" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25">
                <Headphones size={14} /> Audio Listening
              </Link>
              <Link to="/meetings" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25">
                <Video size={14} /> Meeting Online
              </Link>
              <button
                type="button"
                onClick={loadOverview}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-brand-dark shadow-sm transition hover:bg-sky-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>

            {/* Date Range Picker Pill (PDF Hal 1 - Tambahkan periode seperti ini) */}
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-xs">
              <Calendar size={13} className="text-amber-300 shrink-0" />
              <span className="font-bold text-sky-100 hidden sm:inline">Periode:</span>
              <DatePickerInput
                compact
                showIcon={false}
                value={startDate}
                placeholder="dd/mm/yyyy"
                className="!text-white placeholder:text-sky-200"
                onChange={(val) => setStartDate(val)}
              />
              <span className="text-sky-200 font-bold text-[11px]">-</span>
              <DatePickerInput
                compact
                showIcon={false}
                value={endDate}
                placeholder="dd/mm/yyyy"
                className="!text-white placeholder:text-sky-200"
                onChange={(val) => setEndDate(val)}
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="rounded-md p-0.5 text-sky-200 hover:bg-white/20 hover:text-white transition"
                  title="Reset Rentang Tanggal"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifikasi Permintaan Tutor Pengganti (Backup) Butuh ACC (PDF Hal 4) */}
      {overview?.pending_backup_requests?.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-amber-900">
            <BellRing size={18} className="text-amber-600 animate-bounce" />
            <span>Permintaan Tutor Pengganti (Backup) Menunggu Konfirmasi (ACC)</span>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-xs text-amber-900 font-bold">
              {overview.pending_backup_requests.length} Tersedia
            </span>
          </div>
          <p className="text-xs text-amber-800">
            Ada rekan tutor yang berhalangan hadir pada cabang &amp; level yang Anda kuasai. Klik <b>Terima &amp; ACC</b> jika Anda siap menggantikan kelas tersebut.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {overview.pending_backup_requests.map((req) => (
              <div key={req.id} className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-2xs space-y-2.5 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-900">
                      {req.class_type || req.class_name} · <span className="text-brand">{req.level}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Mencari Backup
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 space-y-0.5">
                    <div>Cabang: <b>{req.branch_name || "Pusat"}</b></div>
                    <div>Tanggal: <b>{req.substitute_date}</b> · Jam: <b>{req.schedule || "-"}</b></div>
                  </div>
                  <div className="mt-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-700">
                    <div>Tutor Asli: <b className="text-slate-900">{req.original_tutor_name}</b></div>
                    <div className="text-slate-500 italic mt-0.5">Alasan: "{req.reason || "Tidak bisa hadir"}"</div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={acceptingSubId === req.id}
                  onClick={() => handleAcceptBackup(req.id)}
                  className="btn-primary w-full !py-2 text-xs font-bold"
                >
                  {acceptingSubId === req.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Terima &amp; ACC Jadi Tutor Pengganti
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daftar Kelas Khusus Tutor Ini (#7 Multi-Cabang) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Jadwal & Kelas Saya Hari Ini</h2>
            <p className="text-xs text-slate-500">Hanya menampilkan kelas milik Anda di semua cabang yang Anda ajar. Klik absen masuk real-time lalu isi nilai siswa di bawah.</p>
          </div>
          {branches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => (
                <span key={b.branch_name} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {b.branch_name}: {b.class_count} kelas
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Day Filter Tabs (PDF Hal 1 Item 2) */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {["Hari Ini", "Semua Hari", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setDayFilter(day)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                dayFilter === day
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {day}
              {day === "Hari Ini" && ` (${todayDayName})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="card h-44 animate-pulse bg-slate-100" />)}
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-10 text-center text-slate-400">
            <School size={40} className="mb-2" />
            <p className="text-sm font-bold text-slate-600">Tidak ada jadwal mengajar untuk {dayFilter}</p>
            <p className="mt-1 text-xs">Pilih tab "Semua Hari" untuk melihat seluruh jadwal kelas Anda minggu ini.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredClasses.map((c) => {
              const selected = c.id === selectedClassId;
              const checkedIn = Boolean(c.today_att_id);
              const isLate = Number(c.today_late_minutes || 0) > 0;
              return (
                <div
                  key={c.id}
                  className={`card flex flex-col justify-between p-4 transition ${
                    selected ? "border-brand ring-2 ring-brand/20 shadow-md" : "hover:border-slate-300"
                  }`}
                >
                  <div onClick={() => setSelectedClassId(c.id)} className="cursor-pointer">
                    {Boolean(c.is_backup) && (
                      <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                        <Sparkles size={11} className="text-amber-600" /> Kelas Pengganti (Backup: Tutor {c.original_tutor_name || "Lain"})
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                        <Building2 size={11} /> {c.branch_name || "Pusat"}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${c.type === "online" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"}`}>
                        {c.type || "offline"}
                      </span>
                    </div>
                    <h3 className="mt-2.5 text-base font-extrabold text-slate-900">
                      {c.class_type || c.name} · <span className="text-brand">{c.level || "Umum"}</span>
                    </h3>
                    <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                      <div><b>Jadwal:</b> {c.schedule || "-"}</div>
                      <div className="flex items-center gap-1">
                        <Users size={13} className="text-brand" /> <b>{c.student_count}</b> siswa aktif terdaftar
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {checkedIn ? (
                      <div
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${
                          isLate ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Masuk Pukul {c.today_check_in}
                        </span>
                        <span>{isLate ? `Telat ${c.today_late_minutes} mnt` : "Tepat Waktu"}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={checkingInId === c.id}
                        onClick={() => handleClockIn(c)}
                        className="btn-primary w-full !py-2 text-xs"
                      >
                        {checkingInId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                        Absen Masuk Kelas (Real-Time)
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClassId(c.id)}
                        className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          selected
                            ? "border-transparent bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {selected ? "Sedang Dibuka" : `Buka Daftar Siswa (${c.student_count})`}
                      </button>
                      {c.type === "online" && c.meeting_url && /^https?:\/\//i.test(c.meeting_url) && (
                        <a
                          href={c.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-sky-200 bg-sky-50 p-1.5 text-sky-700 hover:bg-sky-100"
                          title="Buka Link Meeting"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>

                    {/* Status atau Tombol Ajukan Tutor Pengganti / Backup (PDF Hal 4) */}
                    {!c.is_backup && (
                      <div className="border-t border-slate-100/80 pt-2 text-center">
                        {c.backup_status === "seeking" ? (
                          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[11px] font-bold text-amber-900">
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} className="text-amber-600 animate-spin" /> Menunggu Tutor Pengganti...
                            </span>
                            <span className="text-[10px] text-amber-700 italic truncate max-w-[120px]" title={c.backup_reason}>
                              {c.backup_reason}
                            </span>
                          </div>
                        ) : c.backup_status === "scheduled" ? (
                          <div className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 text-[11px] font-bold text-indigo-800">
                            <Sparkles size={12} className="text-indigo-600 shrink-0" />
                            <span>Digantikan oleh: <b>Tutor {c.backup_tutor_name}</b></span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openRequestBackupModal(c)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline transition"
                          >
                            <UserMinus size={12} />
                            Tidak bisa hadir kelas &amp; butuh tutor backup?
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Dokumentasi Foto Kegiatan Belajar ke Orang Tua (Laporan Nyata) */}
      {selectedClassId && (
        <div className="card overflow-hidden border border-brand/20 bg-gradient-to-br from-white via-sky-50/30 to-indigo-50/20 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Camera size={18} />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Dokumentasi Foto & Video Kegiatan Kelas (Terkirim ke Ortu)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kirim foto atau video kegiatan per pertemuan ke Portal Orang Tua agar mereka dapat melihat bukti kehadiran & aktivitas belajar putra-putrinya secara nyata.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSavePhoto} className="mt-4 space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Foto / Video Kegiatan Belajar di Kelas *
                </label>
                <ImageUploadField
                  allowPdf={false}
                  allowVideo={true}
                  value={photoForm.photo_url}
                  onChange={(url) => setPhotoForm({ ...photoForm, photo_url: url })}
                  placeholder="Unggah foto atau video suasana kelas / murid belajar..."
                  buttonLabel="Upload Foto / Video"
                />
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Jam / Sesi Pertemuan
                  </label>
                  <input
                    className="input !py-2 text-xs"
                    placeholder="mis. 16.00 - 17.30 WIB"
                    value={photoForm.session_time || classDetail?.class?.schedule || ""}
                    onChange={(e) => setPhotoForm({ ...photoForm, session_time: e.target.value })}
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Ringkasan Kehadiran
                    </label>
                    <button
                      type="button"
                      onClick={() => setPhotoForm({ ...photoForm, attendance_summary: calcAttSummary() })}
                      className="text-[11px] font-bold text-brand hover:underline"
                    >
                      Hitung Otomatis dari Tabel
                    </button>
                  </div>
                  <input
                    className="input !py-2 text-xs"
                    placeholder="mis. Hadir: 8 siswa dari 9 siswa · Izin: 1 · Alpha: 0"
                    value={photoForm.attendance_summary || calcAttSummary()}
                    onChange={(e) => setPhotoForm({ ...photoForm, attendance_summary: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <input
                className="input !py-2 text-xs flex-1"
                placeholder="Catatan tambahan untuk orang tua (mis. Siswa sangat aktif saat praktik percakapan)..."
                value={photoForm.notes}
                onChange={(e) => setPhotoForm({ ...photoForm, notes: e.target.value })}
              />
              <button
                type="submit"
                disabled={submittingPhoto || !photoForm.photo_url}
                className="btn-primary shrink-0 !py-2 text-xs font-bold"
              >
                {submittingPhoto ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                Kirim Dokumentasi ke Ortu
              </button>
            </div>
          </form>

          {/* Galeri Riwayat Foto/Video Sesi Kelas Ini */}
          {activityPhotos.length > 0 && (
            <div className="mt-4 border-t border-slate-200/80 pt-3">
              <div className="mb-2 text-xs font-bold text-slate-700">
                Dokumentasi Pertemuan Sebelumnya ({activityPhotos.length} dokumentasi):
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {activityPhotos.map((p) => {
                  const isVid = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(p.photo_url || "");
                  return (
                    <div key={p.id} className="relative group shrink-0 w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                      <div className="relative h-24 w-full rounded-lg overflow-hidden bg-slate-900">
                        {isVid ? (
                          <>
                            <video
                              src={resolveAssetUrl(p.photo_url)}
                              className="h-full w-full object-cover opacity-90"
                              muted
                              playsInline
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs">
                                <Play size={13} className="ml-0.5 fill-white" />
                              </span>
                            </div>
                          </>
                        ) : (
                          <img
                            src={resolveAssetUrl(p.photo_url)}
                            alt="Kegiatan Kelas"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-slate-800 truncate">{p.session_date}</div>
                      <div className="text-[10px] text-slate-500 truncate">{p.session_time || p.attendance_summary || (isVid ? "Video Kelas" : "Sesi Selesai")}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto Class Roster: Input Materi + Absensi Siswa + Nilai Laporan Belajar (#8 & #9) */}
      {selectedClassId && (
        <div className="card overflow-hidden">
          <form onSubmit={saveSession}>
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-brand-50/40 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpenCheck size={19} className="text-brand" />
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Lembar Mengajar: {classDetail?.class?.class_type || classDetail?.class?.name || "Memuat..."} ({classDetail?.class?.level || "-"})
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Cabang: <b>{classDetail?.class?.branch_name || "-"}</b> · Jadwal: {classDetail?.class?.schedule || "-"} · Daftar siswa & kolom nilai dari Admin Cabang tampil otomatis.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="w-40">
                    <DatePickerInput
                      mode="date"
                      value={sessionDate}
                      onChange={(val) => { if (val) setSessionDate(val); }}
                      className="!py-2 !text-xs font-semibold"
                    />
                  </div>
                  <button type="button" onClick={markAllPresent} className="btn-ghost !py-2 text-xs">
                    <CheckCircle2 size={14} /> Tandai Semua Hadir
                  </button>
                  <button type="submit" disabled={saving || !rows.length} className="btn-primary !py-2 text-xs">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Simpan Absensi & Nilai Kelas
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Materi yang Diajarkan Hari Ini</label>
                  <input
                    className="input"
                    placeholder="mis. Unit 3 - Describing Daily Activities & Speaking Practice"
                    value={sharedMaterial}
                    onChange={(e) => setSharedMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">PR (Pekerjaan Rumah - opsional)</label>
                  <input
                    className="input"
                    placeholder="mis. Latihan hal. 15-16 di Workbook"
                    value={sharedHomework}
                    onChange={(e) => setSharedHomework(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="space-y-2.5 p-5">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-400">
                <Users size={38} />
                <p className="text-sm font-semibold">Belum ada siswa aktif terdaftar di kelas ini</p>
                <p className="text-xs">Saat Admin memasukkan siswa ke kelas ini, seluruh nama siswa akan muncul otomatis di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">No & Nama Siswa</th>
                      <th className="px-4 py-3 font-bold">Absensi</th>
                      <th className="px-4 py-3 font-bold min-w-[220px]">Laporan Belajar Bulanan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((s, idx) => (
                      <tr key={s.student_id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{s.name}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span>{s.level || "-"}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ATT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateRow(s.student_id, { attendance_status: opt.value })}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                                  s.attendance_status === opt.value
                                    ? opt.cls
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <button
                              type="button"
                              onClick={() => openEvaluationModal(s)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:opacity-95"
                              title="Buka lembar penilaian evaluasi bulanan siswa"
                            >
                              <BookOpenCheck size={14} />
                              <span>Berikan Penilaian Bulanan</span>
                            </button>
                            <span className="text-[10px] font-medium text-slate-500">
                              {isEvaluationWindow ? (
                                <span className="font-bold text-emerald-700">● Periode Aktif (Tgl 20-31)</span>
                              ) : (
                                <span className="text-amber-700">Periode pengisian: Tgl 20-31 bulanan</span>
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Learning Journey Roadmap 12x Pertemuan untuk Kelas Terpilih (Sinkron dengan Admin) */}
      {selectedClassId && rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
            <div className="text-xs font-bold text-slate-600">
              Pilih Siswa untuk Input Nilai Roadmap 12 Pertemuan:
            </div>
            <select
              className="input !h-9 !w-auto text-xs font-bold"
              value={journeyStudentId || rows[0]?.student_id || ""}
              onChange={(e) => setJourneyStudentId(e.target.value)}
            >
              {rows.map((s) => (
                <option key={s.student_id} value={s.student_id}>
                  {s.student_name || s.name}
                </option>
              ))}
            </select>
          </div>
          {(() => {
            const activeStu = rows.find((s) => String(s.student_id) === String(journeyStudentId)) || rows[0];
            return (
              <LearningJourneyRoadmap
                studentId={activeStu?.student_id}
                studentName={activeStu?.student_name || activeStu?.name}
                level={classDetail?.class?.level}
              />
            );
          })()}
        </div>
      )}

      {/* Modal Lembar Penilaian Evaluasi Bulanan Siswa (PDF Hal 2 - Revisi Tutor) */}
      <Modal
        open={Boolean(evalModal)}
        title={evalModal?.title || "Lembar Evaluasi Bulanan Siswa"}
        onClose={() => setEvalModal(null)}
        maxWidth="max-w-4xl"
      >
        {evalModal && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-xs">
              <div className="space-y-1">
                <div className="font-extrabold text-slate-900 text-sm">
                  {evalModal.student.student_name || evalModal.student.name}
                </div>
                <div className="text-slate-500">
                  Kelas: <span className="font-semibold text-slate-800">{classDetail?.class?.name || "Kelas"}</span> · Level: <span className="font-semibold text-brand-dark">{classDetail?.class?.level || "-"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand-light/70 px-2.5 py-1 text-[11px] font-bold text-brand-dark">
                  Periode: {evalModal.month}
                </span>
                {isEvaluationWindow ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                    ● Periode Pengisian Aktif (Tgl 20-31)
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                    Pengisian tanggal 20-31 bulanan
                  </span>
                )}
              </div>
            </div>

            {evalModal.loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="animate-spin mr-2" size={20} />
                <span>Memuat lembar evaluasi bulanan...</span>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs text-sky-900">
                  Klik kotak pada kolom <b>(1) Needs Stimulation</b>, <b>(2) Beginning to Develop</b>, <b>(3) Developing as Expected</b>, atau <b>(4) Very Good</b> pada setiap target kompetensi untuk memberikan penilaian.
                </div>

                <MonthlyEvaluationTable
                  title={evalModal.title}
                  structure={evalModal.structure}
                  scores={evalModal.scores}
                  editable={true}
                  onScoreChange={handleScoreChange}
                />

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Catatan Perkembangan Siswa / Notes for Parents (Opsional):
                  </label>
                  <textarea
                    rows={3}
                    className="input text-xs"
                    placeholder="Tuliskan catatan perkembangan dan pesan motivasi untuk ananda dan orang tua..."
                    value={evalModal.notes || ""}
                    onChange={(e) =>
                      setEvalModal((prev) => (prev ? { ...prev, notes: e.target.value } : null))
                    }
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <Link
                    to={`/monthly-evaluations?student_id=${evalModal.student.student_id || evalModal.student.id}&month=${evalModal.month}`}
                    className="text-xs font-bold text-brand hover:underline inline-flex items-center gap-1"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={13} />
                    Buka Halaman Penuh Master Penilaian Bulanan
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEvalModal(null)}
                      className="btn-secondary !py-2 !text-xs"
                      disabled={evalModal.saving}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={saveEvaluationModal}
                      disabled={evalModal.saving}
                      className="btn-primary !py-2 !text-xs"
                    >
                      {evalModal.saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Simpan &amp; Sinkron ke Ortu
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Ajukan Tutor Pengganti / Backup (PDF Hal 4) */}
      <Modal
        open={Boolean(backupModalClass)}
        title="Ajukan Tutor Pengganti (Backup)"
        onClose={() => !backupSubmitting && setBackupModalClass(null)}
        maxWidth="max-w-md"
      >
        {backupModalClass && (
          <form onSubmit={handleSendBackupRequest} className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs space-y-1">
              <div className="font-bold text-slate-800">
                {backupModalClass.class_type || backupModalClass.name} · <span className="text-brand">{backupModalClass.level}</span>
              </div>
              <div className="text-slate-500">
                Cabang: <b>{backupModalClass.branch_name || "Pusat"}</b> · Jadwal: <b>{backupModalClass.schedule || "-"}</b>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tanggal Izin / Kelas yang Digantikan *</label>
              <DatePickerInput
                required
                value={backupDate}
                onChange={(val) => setBackupDate(val)}
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Alasan Tidak Bisa Hadir *</label>
              <textarea
                required
                rows={3}
                className="input !text-xs"
                placeholder="Contoh: Sakit, urusan mendadak, izin keperluan dinas, dll..."
                value={backupReason}
                onChange={(e) => setBackupReason(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                *Permintaan akan ditayangkan kepada tutor lain di cabang yang sama dan berkualifikasi di level ini. Jadwal di admin dashboard akan ditandai berkedip merah sampai terisi.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setBackupModalClass(null)}
                className="btn-secondary !py-2 !text-xs"
                disabled={backupSubmitting}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={backupSubmitting}
                className="btn-primary !py-2 !text-xs font-bold"
              >
                {backupSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Kirim Permintaan Backup
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
