import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Award,
  BookOpenCheck,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  Camera,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  Film,
  GraduationCap,
  Headphones,
  Image as ImageIcon,
  Info,
  Loader2,
  MapPin,
  Megaphone,
  Play,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting, getOpeningGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { CLASS_TYPES, COURSE_LEVELS } from "@/config/resources";
import { useAuth } from "@/context/AuthContext";
import DatePickerInput from "@/components/DatePickerInput";
import LearningJourneyRoadmap from "@/components/LearningJourneyRoadmap";
import MonthlyEvaluationTable from "@/components/MonthlyEvaluationTable";
import Modal from "@/components/Modal";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function PortalDashboard() {
  const { user } = useAuth();
  const isParent = user.role === "ortu";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [monthlyEval, setMonthlyEval] = useState(null);
  const [branches, setBranches] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Modal Tambah Anak (1 Akun Ortu Multi-Anak)
  const [childModal, setChildModal] = useState(false);
  const [childForm, setChildForm] = useState({
    name: "",
    class_type: "Regular",
    level: COURSE_LEVELS[0],
    branch_id: user.branch_id ? String(user.branch_id) : "",
    class_id: "",
  });
  const [savingChild, setSavingChild] = useState(false);

  // Modal E-Sertifikat (#16)
  const [certModal, setCertModal] = useState(null);
  const [certLoadingId, setCertLoadingId] = useState(null);

  // Modal Reschedule Khusus Kelas Private (#7)
  const [rescheduleModal, setRescheduleModal] = useState(null); // student object
  const [rescheduleQuota, setRescheduleQuota] = useState(null);
  const [loadingQuota, setLoadingQuota] = useState(false);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({
    reschedule_date: "",
    new_day: "Senin",
    new_time_start: "14:00",
    new_time_end: "15:30",
    reason: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedStudentId) params.student_id = selectedStudentId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const evalMonth = startDate ? startDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
      const [sumRes, evalRes] = await Promise.all([
        api.get(API_ENDPOINTS.PORTAL_SUMMARY, { params }),
        isParent
          ? api.get(API_ENDPOINTS.MONTHLY_EVALUATIONS.GET, {
              params: { month: evalMonth, student_id: selectedStudentId || undefined },
            }).catch(() => ({ data: { data: null } }))
          : Promise.resolve({ data: { data: null } }),
      ]);
      setData(sumRes.data.data);
      setMonthlyEval(evalRes.data.data || null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId, startDate, endDate, isParent]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isParent) return;
    api
      .get(API_ENDPOINTS.PUBLIC_BRANCHES)
      .then((r) => setBranches(r.data.data || []))
      .catch(() => {});
  }, [isParent]);

  // Load classes saat child modal dibuka
  useEffect(() => {
    if (childModal) {
      api
        .get(API_ENDPOINTS.CLASSES.LIST, { params: { limit: 100 } })
        .then((r) => setAvailableClasses(r.data.data || []))
        .catch(() => {});
    }
  }, [childModal]);

  const submitAddChild = async (e) => {
    e.preventDefault();
    if (!childForm.name.trim()) {
      toast.error("Nama anak wajib diisi");
      return;
    }
    setSavingChild(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.PORTAL_ADD_CHILD, {
            name: childForm.name,
            class_type: childForm.class_type,
            level: childForm.level,
            branch_id: childForm.branch_id ? Number(childForm.branch_id) : null,
            class_id: childForm.class_id ? Number(childForm.class_id) : null,
          }),
        { success: getClosingGreeting(user.role, `Ananda ${childForm.name} berhasil ditambahkan ke akun Anda!`) }
      );
      setChildModal(false);
      setChildForm({
        name: "",
        class_type: "Regular",
        level: COURSE_LEVELS[0],
        branch_id: user.branch_id ? String(user.branch_id) : "",
        class_id: "",
      });
      load();
    } catch {
      /* toast handled */
    } finally {
      setSavingChild(false);
    }
  };

  const handleCertChoice = async (student, choice) => {
    setCertLoadingId(student.id);
    try {
      await request(
        () => api.post(API_ENDPOINTS.PORTAL_CERTIFICATE_CHOICE, { student_id: student.id, choice }),
        {
          success:
            choice === "pickup_pusat"
              ? getClosingGreeting(user.role, "Pilihan ambil sertifikat di Admin Pusat (Dedaun) berhasil disimpan.")
              : getClosingGreeting(user.role, "E-Sertifikat siap diunduh!"),
        }
      );
      await load();
      if (choice === "download") {
        const res = await api.get(API_ENDPOINTS.PORTAL_CERTIFICATE(student.id));
        setCertModal(res.data.data);
      }
    } catch {
      /* toast handled */
    } finally {
      setCertLoadingId(null);
    }
  };

  // Reschedule handler (#7)
  const openReschedule = async (student) => {
    setRescheduleModal(student);
    setLoadingQuota(true);
    setRescheduleForm({
      reschedule_date: "",
      new_day: "Senin",
      new_time_start: "14:00",
      new_time_end: "15:30",
      reason: "",
    });
    try {
      const res = await api.get(API_ENDPOINTS.PORTAL_RESCHEDULE_QUOTA, {
        params: { student_id: student.id },
      });
      setRescheduleQuota(res.data.data);
    } catch {
      setRescheduleQuota(null);
    } finally {
      setLoadingQuota(false);
    }
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleModal) return;
    if (!rescheduleForm.reschedule_date) {
      toast.error("Pilih tanggal pengganti");
      return;
    }
    if (!rescheduleForm.new_time_start || !rescheduleForm.new_time_end) {
      toast.error("Jam mulai dan jam selesai wajib diisi");
      return;
    }
    setSubmittingReschedule(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.PORTAL_RESCHEDULE, {
            student_id: rescheduleModal.id,
            class_id: rescheduleModal.class_id || 0,
            tutor_id: rescheduleModal.tutor_id || 0,
            new_date: rescheduleForm.reschedule_date,
            reschedule_date: rescheduleForm.reschedule_date,
            new_day: rescheduleForm.new_day,
            new_time_start: rescheduleForm.new_time_start,
            new_time_end: rescheduleForm.new_time_end,
            new_time: `${rescheduleForm.new_time_start} - ${rescheduleForm.new_time_end}`,
            reason: rescheduleForm.reason,
          }),
        { success: getClosingGreeting(user.role, "Sesi kelas private berhasil di-reschedule!") }
      );
      setRescheduleModal(null);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const downloadHtmlCert = (cert) => {
    const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8" /><title>E-Sertifikat ADLS - ${cert.student_name}</title>
<style>
  body { font-family: Georgia, serif; background: #f8fafc; margin: 0; padding: 32px; color: #0f172a; }
  .cert { max-width: 820px; margin: 0 auto; background: #fff; border: 10px double #1e3a5f; padding: 48px; text-align: center; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
  .brand { color: #2a5885; font-size: 14px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; }
  h1 { font-size: 36px; margin: 12px 0 6px; color: #1e3a5f; }
  .sub { font-size: 15px; color: #475569; margin-bottom: 28px; }
  .name { font-size: 32px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #cbd5e1; display: inline-block; padding: 0 24px 8px; margin: 8px 0 16px; }
  .meta { font-size: 15px; line-height: 1.7; color: #334155; }
  .foot { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 16px; }
</style></head>
<body>
  <div class="cert">
    <div class="brand">PT ADLS Solusi Indonesia · Official E-Certificate</div>
    <h1>CERTIFICATE OF COMPLETION</h1>
    <div class="sub">Diberikan dengan bangga kepada:</div>
    <div class="name">${cert.student_name}</div>
    <div class="meta">
      Telah menyelesaikan program kursus Bahasa Inggris<br/>
      <b>Type Kelas:</b> ${cert.class_type} &nbsp;·&nbsp; <b>Level:</b> ${cert.level}<br/>
      <b>Cabang:</b> ${cert.branch_name} &nbsp;·&nbsp; <b>Tanggal Lulus:</b> ${String(cert.completed_at || "").slice(0, 10)}
    </div>
    <div class="foot">
      <span>Kode Sertifikat: <b>${cert.certificate_code}</b></span>
      <span>Admin Pusat ADLS (Dedaun)</span>
    </div>
  </div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `E-Sertifikat-ADLS-${cert.student_name.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const students = data?.students || [];
  const primary = students[0];
  const att = data?.attendance || { total: 0, hadir: 0, rate: 0 };
  const bills = data?.bills || { unpaidCount: 0, verifikasiCount: 0, unpaidAmount: 0, paidCount: 0 };
  const ach = data?.achievements || { uas100Count: 0, freeSppEarned: 0, claimedFreeSpp: 0, progressToNext: 0 };
  const recentReports = data?.recentReports || [];
  const announcements = data?.announcements || [];
  const pct = Math.min(100, Math.round((ach.progressToNext / 20) * 100));

  // SPP Reminder: Pada / setelah tanggal 25 bila ada tagihan belum lunas
  const isLateMonth = new Date().getDate() >= 25;
  const showSppReminder = isLateMonth && bills.unpaidCount > 0;

  return (
    <div className="space-y-5">
      {/* Banner Reminder Pembayaran SPP (Mulai tgl 25) */}
      {showSppReminder && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 text-amber-900">
              <AlertTriangle size={22} />
            </span>
            <div>
              <div className="text-sm font-extrabold text-amber-900">
                Pengingat Pembayaran SPP (Periode Akhir Bulan)
              </div>
              <p className="text-xs text-amber-800">
                Hari ini sudah memasuki tanggal 25 atau lebih. Anda memiliki <b>{bills.unpaidCount} tagihan SPP</b> belum lunas{" "}
                (Total: <b>{rp(bills.unpaidAmount)}</b>). Mohon segera melakukan pembayaran sebelum batas tempo.
              </p>
            </div>
          </div>
          <Link
            to="/bills"
            className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
          >
            <CreditCard size={14} /> Bayar Sekarang
          </Link>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <Sparkles size={13} className="text-amber-300" />
              {user.role === "siswa" ? "Portal Siswa Mandiri & Kelas Karyawan" : "Portal Orang Tua ADLS · 1 Akun Multi-Anak"}
            </div>
            <h1 className="mt-2.5 text-xl font-extrabold sm:text-2xl">{getOpeningGreeting(user)}</h1>
            {primary ? (
              <p className="mt-1 text-sm text-sky-100">
                {isParent ? "Siswa terhubung" : "Data Siswa"} ({students.length}):{" "}
                <span className="font-bold text-white">
                  {students.map((s) => `${s.name} (${s.level || "Reguler"})`).join(", ")}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-sky-100">
                Jika profil siswa belum tertaut dengan akun Anda, hubungi Admin Cabang atau gunakan tombol Tambah Anak.
              </p>
            )}
          </div>
          <div className="flex flex-col items-start gap-2.5 lg:items-end">
            <div className="flex flex-wrap gap-2">
              {isParent && (
                <button
                  type="button"
                  onClick={() => setChildModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-brand-dark shadow-sm transition hover:bg-sky-50"
                >
                  <Plus size={14} /> Tambah Anak
                </button>
              )}
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
              </button>
            </div>

            {/* Filter Periode DatePicker (PDF Ortu Hal 1) */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs text-slate-700 shadow-sm">
              <Calendar size={13} className="text-brand shrink-0" />
              <span className="font-bold text-slate-500">Periode:</span>
              <DatePickerInput
                compact
                showIcon={false}
                value={startDate}
                onChange={setStartDate}
                placeholder="dd/mm/yyyy"
                title="Tanggal Mulai"
              />
              <span className="text-slate-400 font-bold">-</span>
              <DatePickerInput
                compact
                showIcon={false}
                value={endDate}
                onChange={setEndDate}
                placeholder="dd/mm/yyyy"
                title="Tanggal Selesai"
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* #19 Switcher Multi-Anak pada 1 Email Orang Tua */}
      {isParent && students.length > 1 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">
            <Users size={16} className="text-brand" /> Pilih Anak (1 Akun):
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedStudentId("")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedStudentId === ""
                  ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Anak ({students.length})
            </button>
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStudentId(String(s.id))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  String(selectedStudentId) === String(s.id)
                    ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI Cards Row (Per #2: Hapus Nilai UAS 100 & Tagihan SPP untuk Siswa / Karyawan) */}
      <div className={`grid grid-cols-2 gap-4 ${isParent ? "lg:grid-cols-4" : "lg:grid-cols-2"}`}>
        <Link to="/attendance" className="card p-4 transition hover:border-brand/40 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <CalendarCheck size={16} className="text-emerald-600" /> Kehadiran
            </div>
            <span className="text-[11px] font-semibold text-brand">Lihat Detail →</span>
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{att.rate}%</div>
          <div className="text-xs text-slate-500">{att.hadir} hadir dari {att.total} sesi</div>
        </Link>
        {isParent && (() => {
          const hasUnpaid = Boolean(bills.hasUnpaidSpp || bills.unpaidCount > 0);
          const displayNominal = hasUnpaid
            ? (bills.unpaidAmount > 0 ? bills.unpaidAmount : (bills.latestPricelist || 0))
            : (bills.latestPricelist || bills.unpaidAmount || 0);
          return (
            <Link
              to="/bills"
              className={`card p-4 transition ${
                hasUnpaid
                  ? "animate-pulse border-2 border-red-500 bg-red-50/90 shadow-md shadow-red-200 hover:border-red-600"
                  : "hover:border-brand/40 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className={`flex items-center gap-2 text-xs font-bold uppercase ${hasUnpaid ? "text-red-700" : "text-slate-500"}`}>
                  <Receipt size={16} className={hasUnpaid ? "text-red-600" : "text-rose-600"} /> Tagihan SPP
                </div>
                {hasUnpaid ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase text-white">
                    Belum Bayar
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700">Lunas ✓</span>
                )}
              </div>
              <div className={`mt-2 text-2xl font-extrabold ${hasUnpaid ? "text-red-700" : "text-slate-900"}`}>
                {rp(displayNominal)}
              </div>
              <div className={`text-xs font-medium ${hasUnpaid ? "text-red-600" : "text-slate-500"}`}>
                {bills.latestPricelist > 0
                  ? `Pricelist SPP: ${rp(bills.latestPricelist)} · ${bills.unpaidCount} belum lunas`
                  : `${bills.unpaidCount} belum lunas · ${bills.verifikasiCount} verifikasi`}
              </div>
            </Link>
          );
        })()}
        {/* Tampilkan Nilai UAS 100 HANYA untuk Orang Tua (anak), tidak untuk kelas karyawan (#2) */}
        {isParent && (
          <Link to="/achievements" className="card p-4 transition hover:border-brand/40 hover:shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
              <Trophy size={16} className="text-amber-600" /> Nilai UAS 100
            </div>
            <div className="mt-2 text-2xl font-extrabold text-slate-900">{ach.uas100Count}x</div>
            <div className="text-xs text-slate-500">Progres Free SPP: {ach.progressToNext} / 20</div>
          </Link>
        )}
        <Link to="/videos" className="card p-4 transition hover:border-brand/40 hover:shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Film size={16} className="text-indigo-600" /> Project Video
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{data?.videoCount ?? 0}</div>
          <div className="text-xs text-slate-500">Video bulanan terkumpul</div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isParent ? (
          <Link
            to="/bills"
            className={`card flex items-center gap-3 p-4 transition ${
              bills.hasUnpaidSpp || bills.unpaidCount > 0
                ? "animate-pulse border-2 border-red-500 bg-red-50/90 shadow-md shadow-red-200 hover:border-red-600"
                : "hover:border-brand"
            }`}
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              bills.hasUnpaidSpp || bills.unpaidCount > 0 ? "bg-red-600 text-white" : "bg-rose-50 text-rose-600"
            }`}>
              <CreditCard size={20} />
            </span>
            <div className="min-w-0">
              <div className={`text-sm font-bold ${bills.hasUnpaidSpp || bills.unpaidCount > 0 ? "text-red-800" : "text-slate-900"}`}>
                Bayar SPP (PT ADLS)
              </div>
              <div className={`text-xs ${bills.hasUnpaidSpp || bills.unpaidCount > 0 ? "font-bold text-red-600" : "text-slate-500"}`}>
                {bills.hasUnpaidSpp || bills.unpaidCount > 0
                  ? `Belum lunas: ${rp(bills.unpaidAmount || bills.latestPricelist)}`
                  : "Lihat rekening & upload bukti"}
              </div>
            </div>
          </Link>
        ) : (
          <Link to="/audio" className="card flex items-center gap-3 p-4 transition hover:border-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Headphones size={20} /></span>
            <div>
              <div className="text-sm font-bold text-slate-900">Audio Listening</div>
              <div className="text-xs text-slate-500">Audio latihan khusus level Anda</div>
            </div>
          </Link>
        )}
        <Link to="/videos" className="card flex items-center gap-3 p-4 transition hover:border-brand">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Film size={20} /></span>
          <div>
            <div className="text-sm font-bold text-slate-900">Upload Project Video</div>
            <div className="text-xs text-slate-500">Tugas video tiap bulan</div>
          </div>
        </Link>
        {isParent ? (
          <Link to="/monthly-evaluations" className="card flex items-center gap-3 p-4 transition hover:border-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><BookOpenCheck size={20} /></span>
            <div>
              <div className="text-sm font-bold text-slate-900">Laporan Belajar Bulanan</div>
              <div className="text-xs text-slate-500">Lembar evaluasi kompetensi ananda</div>
            </div>
          </Link>
        ) : (
          <Link to="/leaves" className="card flex items-center gap-3 p-4 transition hover:border-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><CalendarOff size={20} /></span>
            <div>
              <div className="text-sm font-bold text-slate-900">Ajukan Izin &amp; Reschedule</div>
              <div className="text-xs text-slate-500">Ajukan izin tidak masuk kelas</div>
            </div>
          </Link>
        )}
        <Link to="/products" className="card flex items-center gap-3 p-4 transition hover:border-brand">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ShoppingBag size={20} /></span>
          <div>
            <div className="text-sm font-bold text-slate-900">Order Produk ADLS</div>
            <div className="text-xs text-slate-500">Deo, Buku, Kaos & Tas</div>
          </div>
        </Link>
      </div>

      {/* Learning Journey Roadmap (Bulanan Jan–Des untuk Ortu, 12x Pertemuan untuk Siswa) */}
      <LearningJourneyRoadmap
        studentId={primary?.id}
        studentName={primary?.name}
        level={primary?.level}
        courseCompleted={primary?.course_completed}
        variant={isParent ? "monthly" : "meetings"}
      />

      {/* Dokumentasi Foto & Video Aktivitas Kelas Terkini (Laporan Nyata untuk Orang Tua) */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-brand-50/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-brand" />
              <h3 className="text-base font-extrabold text-slate-900">
                Dokumentasi Foto & Video Aktivitas Kelas Terkini
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Foto dan video dokumentasi langsung dari tutor di kelas setiap pertemuan. Memastikan siswa hadir & aktif belajar secara nyata.
            </p>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800 self-start">
            ✓ Verifikasi Tutor
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {(!data?.activityPhotos || data.activityPhotos.length === 0) ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <ImageIcon size={36} className="mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">Belum ada dokumentasi kegiatan kelas</p>
              <p className="text-[11px] text-slate-400">Foto atau video dokumentasi yang dikirim oleh tutor saat sesi belajar akan muncul otomatis di sini.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.activityPhotos.map((photo) => {
                const isVid = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(photo.photo_url || "");
                return (
                  <div key={photo.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-950 cursor-pointer" onClick={() => setPreviewPhoto(photo)}>
                      {isVid ? (
                        <>
                          <video
                            src={resolveAssetUrl(photo.photo_url)}
                            className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-105"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand/90 text-white shadow-lg backdrop-blur-xs transition group-hover:scale-110">
                              <Play size={20} className="ml-0.5 fill-white" />
                            </span>
                          </div>
                          <div className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                            ▶ Video
                          </div>
                        </>
                      ) : (
                        <img
                          src={resolveAssetUrl(photo.photo_url)}
                          alt="Dokumentasi Kelas"
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                        <span className="text-xs font-bold text-white flex items-center gap-1">
                          <Eye size={13} /> {isVid ? "Putar Video Penuh" : "Lihat Foto Penuh"}
                        </span>
                      </div>
                    </div>
                  <div className="p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                      <span className="font-bold text-slate-700">{photo.session_date}</span>
                      <span>{photo.session_time || "Sesi Kelas"}</span>
                    </div>
                    <div className="font-extrabold text-slate-900 truncate">
                      {photo.class_name} · <span className="text-brand font-semibold">{photo.branch_name || "ADLS"}</span>
                    </div>
                    {photo.attendance_summary && (
                      <div className="rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-800 text-[11px]">
                        {photo.attendance_summary}
                      </div>
                    )}
                    {photo.material && (
                      <div className="text-slate-600 line-clamp-1">
                        <span className="font-semibold">Materi:</span> {photo.material}
                      </div>
                    )}
                    {photo.notes && (
                      <div className="text-[11px] text-slate-500 line-clamp-2 italic">
                        "{photo.notes}"
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {isParent ? (
          /* PDF Ortu Hal 8: Diganti menjadi Evaluasi Bulanan */
          <div className="card p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Evaluasi Bulanan</h3>
                <p className="text-xs text-slate-500">Lembar evaluasi pencapaian kompetensi bulanan ananda</p>
              </div>
              <Link to="/monthly-evaluations" className="text-xs font-bold text-brand hover:underline">
                Lihat Semua →
              </Link>
            </div>
            <MonthlyEvaluationTable
              title={monthlyEval?.title || "LEMBAR EVALUASI BULANAN"}
              structure={monthlyEval?.structure || []}
              scores={monthlyEval?.scores || {}}
              editable={false}
              compact
            />
          </div>
        ) : (
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  PR &amp; Hasil Ujian (Formatif / Sumatif)
                </h3>
                <p className="text-xs text-slate-500">Laporan materi, tugas, dan evaluasi bulanan</p>
              </div>
              <Link to="/learning_reports" className="text-xs font-bold text-brand hover:underline">Lihat Semua</Link>
            </div>
            {recentReports.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <BookOpenCheck size={32} className="mx-auto mb-2" />
                Belum ada laporan belajar terbaru
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentReports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-brand">{r.report_month} · {r.student_name}</span>
                      <span className="text-slate-400">{r.class_name || "-"}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-800">{r.material || "Evaluasi Bulanan"}</div>
                    {r.homework && <div className="mt-1 text-xs font-semibold text-amber-700">Tugas/PR: {r.homework}</div>}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                        Formatif: <b>{r.formative_score ?? "-"}</b>
                      </span>
                      <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                        Sumatif/UAS: <b>{r.summative_score ?? "-"}</b>
                      </span>
                      <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                        Speaking: <b>{r.speaking_score ?? "-"}</b>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-5">
          {/* #2 Hapus informasi Reward 20x untuk Kelas Karyawan */}
          {isParent && (
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award size={20} className="text-amber-500" />
                  <h3 className="text-base font-extrabold text-slate-900">Progres Reward 20x Nilai UAS 100</h3>
                </div>
                <Link to="/achievements" className="text-xs font-bold text-brand hover:underline">Detail</Link>
              </div>
              <p className="mt-1 text-xs text-slate-500">Kumpulkan 20x nilai Sumatif/UAS 100 untuk Gratis 1x SPP!</p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs font-bold text-slate-700">
                  <span>Progres siklus saat ini: {ach.progressToNext} / 20</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-dark via-brand to-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Total diperoleh: <b>{ach.freeSppEarned}x Free SPP</b> · Sudah diklaim: <b>{ach.claimedFreeSpp}x</b>
                </div>
              </div>
            </div>
          )}

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-brand" />
                <h3 className="text-base font-extrabold text-slate-900">Pusat Informasi Terbaru</h3>
              </div>
              <Link to="/announcements" className="text-xs font-bold text-brand hover:underline">Semua Info</Link>
            </div>
            {announcements.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">Belum ada pengumuman terbaru</div>
            ) : (
              <div className="space-y-2.5">
                {announcements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand">{a.info_type || "Pengumuman"}</span>
                      <span className="text-slate-400">{a.event_date ? String(a.event_date).slice(0, 10) : ""}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-800">{a.title}</div>
                    {a.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{a.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Headphones size={20} className="text-brand" />
              <div>
                <div className="text-sm font-bold text-slate-900">Audio Listening & Materi QRIS</div>
                <div className="text-xs text-slate-500">{primary?.level ? `Level: ${primary.level}` : "Akses materi listening modul"}</div>
              </div>
            </div>
            <Link to="/audio" className="btn-ghost !px-3 !py-1.5 text-xs">Buka Audio</Link>
          </div>
        </div>
      </div>

      {/* Profil Siswa & Jadwal Kelas + Fitur Reschedule Private (#7) + Sertifikat (#16) */}
      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-brand" />
            <h3 className="text-base font-extrabold text-slate-900">
              {isParent ? "Profil Anak, Jadwal Kelas & Sertifikat Kelulusan" : "Profil Siswa, Jadwal & Sertifikat Kelulusan"}
            </h3>
          </div>
          {isParent && (
            <button type="button" onClick={() => setChildModal(true)} className="btn-ghost !px-3 !py-1.5 text-xs">
              <Plus size={14} /> Tambah Anak (1 Akun)
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">Belum ada profil siswa terhubung dengan akun ini.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {students.map((s) => {
              // #16 Sertifikat tampil jika status selesai ATAU ada file sertifikat ATAU kode sertifikat
              const completed =
                Number(s.course_completed) === 1 || Boolean(s.certificate_url) || Boolean(s.certificate_code);
              const isPrivate =
                (s.class_type || "").toLowerCase().includes("private") ||
                user.role === "siswa" ||
                (s.class_name || "").toLowerCase().includes("private");

              return (
                <div key={s.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-extrabold text-slate-900">{s.name}</span>
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        {s.level || "-"}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
                      <div><span className="font-semibold text-slate-500">Type Kelas:</span> <b>{s.class_type || s.class_name || "-"}</b></div>
                      <div><span className="font-semibold text-slate-500">Tipe:</span> <b className="capitalize">{s.class_mode || "offline"}</b></div>
                      <div><span className="font-semibold text-slate-500">Jadwal:</span> <b>{s.schedule || "-"}</b></div>
                      <div><span className="font-semibold text-slate-500">Cabang:</span> <b>{s.branch_name || "-"}</b></div>
                    </div>

                    {/* Sembunyikan Nama Tutor & Link Meeting dari Portal Ortu per #4 */}
                    {!isParent && s.tutor_name && (
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <span><span className="font-semibold text-slate-500">Tutor:</span> <b>{s.tutor_name}</b></span>
                      </div>
                    )}
                    {!isParent && s.meeting_url && /^https?:\/\//i.test(s.meeting_url) && (
                      <div className="mt-2">
                        <a
                          href={s.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                        >
                          <ExternalLink size={13} /> Link Class Meeting
                        </a>
                      </div>
                    )}

                    {/* #7 Fitur Reschedule Khusus Kelas Private */}
                    {isPrivate && (
                      <div className="mt-3 rounded-lg border border-sky-100 bg-sky-50/60 p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-900">Reschedule Kelas Private:</span>
                          <button
                            type="button"
                            onClick={() => openReschedule(s)}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-brand-dark"
                          >
                            <CalendarClock size={13} /> Atur Jadwal Baru
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-sky-700">
                          Jatah maks 2x/bulan (karyawan maks 6x/3 bln). Sistem otomatis mengecek ketersediaan jam kosong tutor.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* #16 Pilihan E-Sertifikat / Ambil di Admin Pusat (Dedaun) */}
                  <div className="mt-4 border-t border-slate-200/80 pt-3">
                    {completed ? (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">
                            <CheckCircle2 size={13} /> Course Selesai / Sertifikat Siap
                          </span>
                          {s.certificate_delivery && (
                            <span className="font-bold text-brand-dark">
                              {s.certificate_delivery === "pickup_pusat"
                                ? "Pilihan: Ambil di Admin Pusat (Dedaun)"
                                : "Pilihan: Download E-Sertifikat"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={certLoadingId === s.id}
                            onClick={() => handleCertChoice(s, "download")}
                            className="btn-primary flex-1 !py-2 text-xs"
                          >
                            {certLoadingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Download E-Sertifikat
                          </button>
                          <button
                            type="button"
                            disabled={certLoadingId === s.id}
                            onClick={() => handleCertChoice(s, "pickup_pusat")}
                            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              s.certificate_delivery === "pickup_pusat"
                                ? "border-amber-400 bg-amber-50 text-amber-800"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <MapPin size={14} /> Ambil di Admin Pusat (Dedaun)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Award size={14} className="shrink-0 text-slate-400" />
                        <span>Course berjalan — opsi Download E-Sertifikat / Ambil di Admin Pusat (Dedaun) aktif otomatis saat kelulusan.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tambah Anak (Multi-Anak 1 Akun Ortu) */}
      <Modal open={childModal} title="Tambah Anak di Akun Orang Tua" onClose={() => setChildModal(false)}>
        <form onSubmit={submitAddChild} className="space-y-3.5">
          <div className="rounded-xl bg-brand-50/70 p-3 text-xs text-slate-700">
            Cukup 1 email Orang Tua untuk memantau beberapa anak sekaligus tanpa perlu membuat akun baru.
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Nama Lengkap Anak *</label>
            <input
              required
              className="input"
              placeholder="mis. Adik Bintang"
              value={childForm.name}
              onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Type Kelas *</label>
              <select
                className="input"
                value={childForm.class_type}
                onChange={(e) => setChildForm({ ...childForm, class_type: e.target.value })}
              >
                {CLASS_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Level *</label>
              <select
                className="input"
                value={childForm.level}
                onChange={(e) => setChildForm({ ...childForm, level: e.target.value })}
              >
                {COURSE_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Cabang</label>
            <select
              className="input"
              value={childForm.branch_id}
              onChange={(e) => setChildForm({ ...childForm, branch_id: e.target.value })}
            >
              <option value="">-- Pilih Cabang --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.city ? `${b.name} (${b.city})` : b.name}</option>
              ))}
            </select>
          </div>
          {availableClasses.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Pilih Kelas & Jadwal (Opsional)</label>
              <select
                className="input"
                value={childForm.class_id}
                onChange={(e) => setChildForm({ ...childForm, class_id: e.target.value })}
              >
                <option value="">-- Tentukan nanti oleh Admin --</option>
                {availableClasses
                  .filter((c) => !childForm.branch_id || String(c.branch_id) === String(childForm.branch_id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.class_type || c.name, c.level, c.schedule, c.branch_name].filter(Boolean).join(" · ")}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setChildModal(false)}>Batal</button>
            <button className="btn-primary" disabled={savingChild}>
              {savingChild && <Loader2 size={15} className="animate-spin" />}
              Tambahkan Anak
            </button>
          </div>
        </form>
      </Modal>

      {/* #7 Modal Reschedule Khusus Kelas Private */}
      <Modal
        open={!!rescheduleModal}
        title={`Reschedule Sesi Kelas Private: ${rescheduleModal?.name || ""}`}
        onClose={() => setRescheduleModal(null)}
      >
        {rescheduleModal && (
          <form onSubmit={submitReschedule} className="space-y-4">
            {loadingQuota ? (
              <div className="py-6 text-center text-sm text-slate-400">
                <Loader2 size={24} className="mx-auto mb-2 animate-spin text-brand" /> Memuat kuota reschedule...
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-900">
                  <div className="font-bold">Ketentuan Reschedule Private ADLS:</div>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-sky-800">
                    <li>Maksimal 2x reschedule dalam 1 bulan (jika tidak dipakai di bulan tsb, jatah hangus).</li>
                    {user.role === "siswa" && (
                      <li>Khusus Kelas Karyawan: Kuota maksimal 6x reschedule dalam 3 bulan.</li>
                    )}
                    <li>Sistem otomatis menolak bila jam bentrok dengan jadwal tutor yang lain.</li>
                  </ul>
                  {rescheduleQuota && (
                    <div className="mt-2.5 flex flex-wrap gap-2 border-t border-sky-200/80 pt-2 font-bold text-slate-800">
                      <span className="rounded bg-white px-2 py-0.5 shadow-xs">
                        Terpakai Bulan Ini: {rescheduleQuota.monthUsed ?? rescheduleQuota.usedCount ?? 0} / {rescheduleQuota.monthMax ?? rescheduleQuota.maxLimit ?? (user.role === "siswa" ? 6 : 2)} kali
                      </span>
                      <span className="rounded bg-white px-2 py-0.5 shadow-xs">
                        Sisa Kuota: {rescheduleQuota.monthRemaining ?? rescheduleQuota.remaining ?? 0} kali
                      </span>
                      {(rescheduleQuota.isEmployee || user.role === "siswa") && (
                        <span className="rounded bg-white px-2 py-0.5 shadow-xs">
                          Kuota 3 Bulan: {rescheduleQuota.threeMonthRemaining ?? rescheduleQuota.remaining ?? 0} / {rescheduleQuota.threeMonthMax ?? rescheduleQuota.maxLimit ?? 6} kali
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Tanggal Pengganti *</label>
                    <DatePickerInput
                      mode="date"
                      required
                      value={rescheduleForm.reschedule_date}
                      onChange={(dt) => {
                        if (!dt) {
                          setRescheduleForm({ ...rescheduleForm, reschedule_date: "" });
                          return;
                        }
                        const [y, m, d] = dt.split("-").map(Number);
                        const dayIdx = new Date(y, m - 1, d).getDay();
                        const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                        setRescheduleForm({
                          ...rescheduleForm,
                          reschedule_date: dt,
                          new_day: dayNames[dayIdx] || "Senin",
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Hari (Otomatis)</label>
                    <input
                      readOnly
                      className="input bg-slate-100"
                      value={rescheduleForm.new_day}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Jam Mulai *</label>
                    <input
                      type="time"
                      required
                      className="input"
                      value={rescheduleForm.new_time_start}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, new_time_start: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Jam Selesai *</label>
                    <input
                      type="time"
                      required
                      className="input"
                      value={rescheduleForm.new_time_end}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, new_time_end: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Alasan Reschedule</label>
                  <textarea
                    rows={2}
                    className="input"
                    placeholder="mis. Tugas kantor lembur mendadak / ada agenda dinas"
                    value={rescheduleForm.reason}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" className="btn-ghost" onClick={() => setRescheduleModal(null)}>
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      submittingReschedule ||
                      (rescheduleQuota && (
                        rescheduleQuota.remaining !== undefined
                          ? rescheduleQuota.remaining <= 0
                          : (rescheduleQuota.monthRemaining !== undefined && rescheduleQuota.monthRemaining <= 0)
                      ))
                    }
                  >
                    {submittingReschedule && <Loader2 size={15} className="animate-spin" />}
                    Simpan Reschedule
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>

      {/* Modal Preview & Download E-Sertifikat (#16) */}
      <Modal open={!!certModal} title="E-Sertifikat Kelulusan ADLS" onClose={() => setCertModal(null)}>
        {certModal && (
          <div className="space-y-4">
            <div className="rounded-2xl border-4 border-double border-brand-dark bg-gradient-to-br from-white via-sky-50/40 to-amber-50/40 p-6 text-center shadow-inner">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand">
                PT ADLS Solusi Indonesia · Official E-Certificate
              </div>
              <h2 className="mt-2 font-serif text-2xl font-extrabold text-brand-dark">CERTIFICATE OF COMPLETION</h2>
              <p className="mt-2 text-xs text-slate-500">Diberikan kepada siswa berprestasi:</p>
              <div className="mt-2 inline-block border-b-2 border-slate-300 px-6 pb-1 text-xl font-extrabold text-slate-900">
                {certModal.student_name}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div>Type Kelas: <b>{certModal.class_type}</b> · Level: <b>{certModal.level}</b></div>
                <div>Cabang: <b>{certModal.branch_name}</b> · Selesai: <b>{String(certModal.completed_at || "").slice(0, 10)}</b></div>
                <div className="pt-1 font-mono text-[11px] text-slate-500">Kode Verifikasi: {certModal.certificate_code}</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {certModal.certificate_url && (
                <a
                  href={resolveAssetUrl(certModal.certificate_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  <ExternalLink size={15} /> Buka File Asli
                </a>
              )}
              <button type="button" onClick={() => window.print()} className="btn-ghost">
                <Printer size={15} /> Cetak / Save PDF
              </button>
              <button type="button" onClick={() => downloadHtmlCert(certModal)} className="btn-primary">
                <Download size={15} /> Download E-Sertifikat
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Preview Foto / Video Kegiatan Belajar */}
      <Modal
        open={!!previewPhoto}
        title={
          /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(previewPhoto?.photo_url || "")
            ? "Dokumentasi Video Kegiatan Belajar"
            : "Dokumentasi Foto Pertemuan Kelas"
        }
        onClose={() => setPreviewPhoto(null)}
      >
        {previewPhoto && (() => {
          const isVid = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(previewPhoto.photo_url || "");
          const mediaUrl = resolveAssetUrl(previewPhoto.photo_url);
          return (
            <div className="space-y-3.5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
                {isVid ? (
                  <video
                    src={mediaUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[65vh] w-full rounded-2xl object-contain mx-auto"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt="Dokumentasi Kelas"
                    className="max-h-[65vh] w-full object-contain mx-auto"
                  />
                )}
              </div>
              <div className="rounded-xl bg-slate-50 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900 text-sm">{previewPhoto.class_name}</span>
                  <span className="font-bold text-brand">{previewPhoto.branch_name || "ADLS"}</span>
                </div>
                <div className="text-slate-600">
                  Sesi: <b>{previewPhoto.session_date}</b> {previewPhoto.session_time && `· ${previewPhoto.session_time}`}
                </div>
                {previewPhoto.attendance_summary && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 font-bold text-emerald-800">
                    {previewPhoto.attendance_summary}
                  </div>
                )}
                {previewPhoto.material && (
                  <div className="text-slate-700">
                    <span className="font-semibold text-slate-900">Materi:</span> {previewPhoto.material}
                  </div>
                )}
                {previewPhoto.notes && (
                  <div className="text-slate-600 italic">
                    "{previewPhoto.notes}"
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button type="button" className="btn-ghost" onClick={() => setPreviewPhoto(null)}>
                  Tutup
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
