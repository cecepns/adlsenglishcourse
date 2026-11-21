import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  Video,
  X,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import { exportToExcel } from "@/utils/exportExcel";
import DatePickerInput from "@/components/DatePickerInput";
import Modal from "@/components/Modal";

const ROLE_LABELS = {
  owner: "Owner",
  admin_pusat: "Admin Pusat",
  admin_cabang: "Admin Cabang",
  tutor: "Tutor",
};

const ROLE_BADGES = {
  owner: "bg-purple-100 text-purple-800 border-purple-200",
  admin_pusat: "bg-blue-100 text-blue-800 border-blue-200",
  admin_cabang: "bg-emerald-100 text-emerald-800 border-emerald-200",
  tutor: "bg-amber-100 text-amber-800 border-amber-200",
};

export default function EmployeeAttendancePage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const isHQ = ["owner", "admin_pusat"].includes(user?.role);

  // Active Tab: "today" | "history" | "settings"
  const [tab, setTab] = useState("today");

  // Realtime Clock State
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"
      );
      setCurrentDateStr(
        now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Today's Attendance State
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayData, setTodayData] = useState(null);
  const [activeSetting, setActiveSetting] = useState({ work_start: "08:00", work_end: "17:00", late_tolerance_minutes: 15 });

  // Check-in / Check-out Form State
  const [gpsLocation, setGpsLocation] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const [photoUrl, setPhotoUrl] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Live Webcam Modal State
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [webcamStream, setWebcamStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Hidden camera file input ref
  const cameraInputRef = useRef(null);

  // History & Rekapitulasi State
  const [historyRows, setHistoryRows] = useState([]);
  const [historySummary, setHistorySummary] = useState(null);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // History Filters (Date Range & Roles)
  const [datePreset, setDatePreset] = useState("this_month");
  const [filterStartDate, setFilterStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [filterEndDate, setFilterEndDate] = useState(() => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  });
  const [filterRole, setFilterRole] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Reset Attendance Modal State (Owner only)
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetScope, setResetScope] = useState("filtered"); // "filtered" | "all"
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetting, setResetting] = useState(false);

  // Helper to apply quick date presets
  const applyDatePreset = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const fmt = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    if (preset === "today") {
      const todayStr = fmt(now);
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === "this_month") {
      const first = new Date(y, m, 1);
      const last = new Date(y, m + 1, 0);
      setFilterStartDate(fmt(first));
      setFilterEndDate(fmt(last));
    } else if (preset === "last_7_days") {
      const past = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      setFilterStartDate(fmt(past));
      setFilterEndDate(fmt(now));
    } else if (preset === "last_30_days") {
      const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      setFilterStartDate(fmt(past));
      setFilterEndDate(fmt(now));
    } else if (preset === "last_month") {
      const first = new Date(y, m - 1, 1);
      const last = new Date(y, m, 0);
      setFilterStartDate(fmt(first));
      setFilterEndDate(fmt(last));
    } else if (preset === "all") {
      setFilterStartDate("");
      setFilterEndDate("");
    }
  };

  const handleStartDateChange = (val) => {
    setFilterStartDate(val);
    setDatePreset("custom");
  };

  const handleEndDateChange = (val) => {
    setFilterEndDate(val);
    setDatePreset("custom");
  };

  const [branches, setBranches] = useState([]);

  // Detail Modal State
  const [detailModal, setDetailModal] = useState(null);

  // Settings State (Owner only)
  const [settingsList, setSettingsList] = useState([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Load Branches
  useEffect(() => {
    if (isHQ) {
      api
        .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
        .then((r) => setBranches(r.data.data || []))
        .catch(() => {});
    }
  }, [isHQ]);

  // Load Today Attendance
  const loadToday = async () => {
    setTodayLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.TODAY);
      setTodayData(res.data.data?.attendance || null);
      if (res.data.data?.setting) {
        setActiveSetting(res.data.data.setting);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memuat status absensi hari ini");
    } finally {
      setTodayLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, []);

  // Detect GPS Location
  const detectGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Browser Anda tidak mendukung deteksi lokasi GPS.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy);

        let locationName = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)} (Akurasi: ±${acc}m)`;
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData?.display_name) {
              locationName = geoData.display_name;
            }
          }
        } catch {
          // fallback to coordinates
        }

        setGpsLocation({
          lat,
          lng,
          accuracy: acc,
          locationName,
        });
        setGpsLoading(false);
        toast.success("Lokasi GPS berhasil terdeteksi!");
      },
      (err) => {
        setGpsLoading(false);
        let msg = "Gagal mendeteksi lokasi GPS.";
        if (err.code === 1) msg = "Izin akses lokasi GPS ditolak oleh browser/perangkat Anda.";
        else if (err.code === 2) msg = "Sinyal GPS tidak ditemukan atau perangkat offline.";
        else if (err.code === 3) msg = "Waktu pencarian lokasi GPS habis (timeout).";
        setGpsError(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Auto-detect GPS when entering page
  useEffect(() => {
    if (tab === "today") {
      detectGps();
    }
  }, [tab]);

  // Handle File Upload from Camera / File Input
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    setUploadingPhoto(true);
    try {
      const { data } = await api.post(API_ENDPOINTS.UPLOAD, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoUrl(data.data.url);
      toast.success("Foto kamera berhasil diambil & diunggah!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengunggah foto kamera");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Live Webcam functions for desktop/laptop
  const startWebcam = async () => {
    setWebcamOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setWebcamStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      toast.error("Tidak dapat membuka webcam kamera. Pastikan izin kamera telah diaktifkan.");
      setWebcamOpen(false);
    }
  };

  const stopWebcam = () => {
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
    setWebcamOpen(false);
  };

  useEffect(() => {
    if (webcamOpen && webcamStream && videoRef.current) {
      videoRef.current.srcObject = webcamStream;
    }
  }, [webcamOpen, webcamStream]);

  const captureWebcamSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopWebcam();
      setUploadingPhoto(true);
      const fd = new FormData();
      fd.append("file", blob, `selfie-${Date.now()}.jpg`);
      try {
        const { data } = await api.post(API_ENDPOINTS.UPLOAD, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setPhotoUrl(data.data.url);
        toast.success("Foto webcam berhasil diambil!");
      } catch (err) {
        toast.error(err.response?.data?.message || "Gagal mengunggah foto");
      } finally {
        setUploadingPhoto(false);
      }
    }, "image/jpeg", 0.85);
  };

  // Submit Check-in
  const handleCheckIn = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      return toast.error("Silakan ambil foto bukti selfie kehadiran menggunakan kamera terlebih dahulu");
    }
    setSubmitting(true);
    try {
      const res = await api.post(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.CHECK_IN, {
        photo_url: photoUrl,
        lat: gpsLocation?.lat || null,
        lng: gpsLocation?.lng || null,
        location_name: gpsLocation?.locationName || "",
        notes: notes || "",
      });
      toast.success(res.data.message || "Check-in masuk berhasil dicatat!");
      setPhotoUrl("");
      setNotes("");
      loadToday();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal melakukan check-in");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Check-out
  const handleCheckOut = async (e) => {
    e.preventDefault();
    if (!photoUrl) {
      return toast.error("Silakan ambil foto bukti selfie kepulangan menggunakan kamera terlebih dahulu");
    }
    setSubmitting(true);
    try {
      const res = await api.post(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.CHECK_OUT, {
        photo_url: photoUrl,
        lat: gpsLocation?.lat || null,
        lng: gpsLocation?.lng || null,
        location_name: gpsLocation?.locationName || "",
        notes: notes || "",
      });
      toast.success(res.data.message || "Check-out pulang berhasil dicatat!");
      setPhotoUrl("");
      setNotes("");
      loadToday();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal melakukan check-out");
    } finally {
      setSubmitting(false);
    }
  };

  // Load History / Rekap Data Absensi Karyawan
  const loadHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.LIST, {
        params: {
          page,
          limit: historyPagination.limit,
          start_date: filterStartDate || undefined,
          end_date: filterEndDate || undefined,
          role: filterRole || undefined,
          branch_id: filterBranchId || undefined,
          status: filterStatus || undefined,
          search: debouncedSearch || undefined,
        },
      });
      setHistoryRows(res.data.data || []);
      setHistorySummary(res.data.summary || null);
      setHistoryPagination(res.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memuat data rekap absensi karyawan");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "history") {
      loadHistory(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterStartDate, filterEndDate, filterRole, filterBranchId, filterStatus, debouncedSearch]);

  // Export History to Excel (CSV UTF-8)
  const handleExportExcel = async () => {
    try {
      const res = await api.get(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.LIST, {
        params: {
          limit: 2000,
          start_date: filterStartDate || undefined,
          end_date: filterEndDate || undefined,
          role: filterRole || undefined,
          branch_id: filterBranchId || undefined,
          status: filterStatus || undefined,
          search: debouncedSearch || undefined,
        },
      });
      const rows = res.data.data || [];
      if (!rows.length) return toast.error("Tidak ada data absensi untuk diekspor");

      const cols = [
        { key: "no", label: "No." },
        { key: "date", label: "Tanggal" },
        { key: "user_name", label: "Nama Karyawan" },
        { key: "user_role", label: "Role" },
        { key: "branch_name", label: "Cabang" },
        { key: "check_in_time", label: "Jam Masuk" },
        { key: "check_in_status", label: "Status Masuk" },
        { key: "late_minutes", label: "Telat (Menit)" },
        { key: "check_in_location", label: "Lokasi GPS Masuk" },
        { key: "check_in_photo_url", label: "Link Foto Masuk" },
        { key: "check_out_time", label: "Jam Pulang" },
        { key: "check_out_status", label: "Status Pulang" },
        { key: "early_leave_minutes", label: "Pulang Cepat (Menit)" },
        { key: "check_out_location", label: "Lokasi GPS Pulang" },
        { key: "check_out_photo_url", label: "Link Foto Pulang" },
        { key: "work_duration_str", label: "Durasi Kerja" },
        { key: "status", label: "Status Keseluruhan" },
        { key: "check_in_notes", label: "Catatan Masuk" },
        { key: "check_out_notes", label: "Catatan Pulang" },
      ];

      const dataToExport = rows.map((r, i) => {
        const hrs = Math.floor((r.work_duration_minutes || 0) / 60);
        const mins = (r.work_duration_minutes || 0) % 60;
        return {
          no: i + 1,
          date: r.date || "",
          user_name: r.user_name || "",
          user_role: ROLE_LABELS[r.user_role || r.role] || r.role || "",
          branch_name: r.branch_name || "Pusat",
          check_in_time: r.check_in_time ? `${r.check_in_time} WIB` : "-",
          check_in_status: r.check_in_status === "late" ? "Terlambat" : r.check_in_time ? "Tepat Waktu" : "-",
          late_minutes: r.late_minutes || 0,
          check_in_location: r.check_in_location || "-",
          check_in_photo_url: r.check_in_photo ? resolveAssetUrl(r.check_in_photo) : "-",
          check_out_time: r.check_out_time ? `${r.check_out_time} WIB` : "-",
          check_out_status: r.check_out_status === "early_leave" ? "Pulang Cepat" : r.check_out_time ? "Tepat Waktu" : "-",
          early_leave_minutes: r.early_leave_minutes || 0,
          check_out_location: r.check_out_location || "-",
          check_out_photo_url: r.check_out_photo ? resolveAssetUrl(r.check_out_photo) : "-",
          work_duration_str: r.work_duration_minutes ? `${hrs} jam ${mins} mnt` : "-",
          status:
            r.status === "late"
              ? "Terlambat"
              : r.status === "early_leave"
              ? "Pulang Cepat"
              : r.status === "present"
              ? "Hadir Tepat Waktu"
              : r.status || "-",
          check_in_notes: r.check_in_notes || "",
          check_out_notes: r.check_out_notes || "",
        };
      });

      const startLabel = filterStartDate || "Awal";
      const endLabel = filterEndDate || "Akhir";
      exportToExcel(`Rekap_Absensi_Karyawan_${startLabel}_sd_${endLabel}`, cols, dataToExport);
    } catch {
      toast.error("Gagal mengekspor data absensi");
    }
  };

  // Reset Employee Attendance (Owner only)
  const handleResetAttendance = async (e) => {
    e.preventDefault();
    if (!isOwner) return;
    if (resetConfirmation.trim().toUpperCase() !== "RESET") {
      return toast.error('Ketik "RESET" dengan huruf besar untuk mengonfirmasi');
    }
    setResetting(true);
    try {
      const payload = {
        scope: resetScope,
        start_date: resetScope === "filtered" ? (filterStartDate || undefined) : undefined,
        end_date: resetScope === "filtered" ? (filterEndDate || undefined) : undefined,
        branch_id: resetScope === "filtered" ? (filterBranchId || undefined) : undefined,
        role: resetScope === "filtered" ? (filterRole || undefined) : undefined,
        status: resetScope === "filtered" ? (filterStatus || undefined) : undefined,
      };
      const res = await api.post(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.RESET, payload);
      toast.success(res.data.message || "Data absensi dan file foto bukti berhasil di-reset");
      setResetModalOpen(false);
      setResetConfirmation("");
      loadHistory(1);
      loadToday();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mereset data absensi");
    } finally {
      setResetting(false);
    }
  };

  // Delete Attendance Record (Owner only)
  const handleDeleteRecord = async (row) => {
    if (!isOwner) return;
    if (!window.confirm(`Hapus catatan absensi ${row.user_name} pada tanggal ${row.date}?`)) return;
    try {
      await api.delete(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.DETAIL(row.id));
      toast.success("Catatan absensi berhasil dihapus");
      loadHistory(historyPagination.page);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus data absensi");
    }
  };

  // Load Settings (Owner only)
  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.SETTINGS);
      setSettingsList(res.data.data || []);
    } catch (err) {
      toast.error("Gagal memuat pengaturan jam kerja");
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "settings" && isOwner) {
      loadSettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isOwner]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isOwner) return;
    setSavingSettings(true);
    try {
      await api.put(API_ENDPOINTS.EMPLOYEE_ATTENDANCE.SETTINGS, { settings: settingsList });
      toast.success("Pengaturan jam kerja karyawan berhasil diperbarui oleh Owner!");
      loadToday();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan pengaturan jam kerja");
    } finally {
      setSavingSettings(false);
    }
  };

  const updateSettingItem = (index, field, value) => {
    const next = [...settingsList];
    next[index] = { ...next[index], [field]: value };
    setSettingsList(next);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-amber-200">
              <UserCheck size={14} /> Absensi Harian Karyawan ADLS
            </div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Absensi Karyawan &amp; Staff</h1>
            <p className="mt-1 text-xs text-sky-100 sm:text-sm">
              Sistem presensi kerja harian untuk <b>Admin Pusat</b>, <b>Admin Cabang</b>, dan <b>Tutor</b> dengan verifikasi GPS akurat &amp; bukti foto kamera.
            </p>
          </div>

          {/* Clock Widget */}
          <div className="flex flex-col items-start rounded-2xl bg-white/10 p-3.5 backdrop-blur-xs border border-white/20 sm:items-end">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-200">Waktu Server (WIB)</span>
            <div className="mt-0.5 font-mono text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {currentTimeStr || "--:--:-- WIB"}
            </div>
            <span className="text-xs text-sky-100">{currentDateStr}</span>
          </div>
        </div>

        {/* User Status Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/20 pt-3 text-xs">
          <span className="text-sky-100">Login Sebagai:</span>
          <span className="font-extrabold text-white">{user?.name}</span>
          <span className="rounded-full bg-white/20 px-2 py-0.5 font-bold text-white uppercase">
            {ROLE_LABELS[user?.role] || user?.role}
          </span>
          {user?.branch_name && (
            <span className="inline-flex items-center gap-1 text-sky-100">
              · <Building2 size={13} /> {user.branch_name}
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setTab("today")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            tab === "today"
              ? "border-brand text-brand"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Clock size={16} /> Absen Masuk &amp; Pulang Hari Ini
        </button>

        <button
          type="button"
          onClick={() => setTab("history")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
            tab === "history"
              ? "border-brand text-brand"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileSpreadsheet size={16} /> Rekap Absensi Karyawan
        </button>

        {isOwner && (
          <button
            type="button"
            onClick={() => setTab("settings")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
              tab === "settings"
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Settings size={16} /> Atur Jam Kerja (Owner)
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHECK-IN & CHECK-OUT HARI INI */}
      {/* ========================================================================= */}
      {tab === "today" && (
        <div className="space-y-5">
          {todayLoading ? (
            <div className="flex items-center justify-center p-12 text-slate-400">
              <Loader2 size={24} className="animate-spin mr-2 text-brand" /> Memuat status absensi hari ini...
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Left Column: Shift Schedule & Status Info */}
              <div className="space-y-4 lg:col-span-1">
                {/* Working Hours Card */}
                <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-sky-950 shadow-2xs">
                  <div className="flex items-center gap-2 font-extrabold text-sm text-sky-900">
                    <ShieldCheck size={18} className="text-brand" /> Jadwal Kerja Hari Ini
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-sky-200/60 pb-1.5">
                      <span className="text-slate-600">Jam Masuk (Check-in):</span>
                      <span className="font-extrabold text-slate-900">{activeSetting.work_start || "08:00"} WIB</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-sky-200/60 pb-1.5">
                      <span className="text-slate-600">Toleransi Telat:</span>
                      <span className="font-bold text-amber-700">+{activeSetting.late_tolerance_minutes || 15} Menit</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-sky-200/60 pb-1.5">
                      <span className="text-slate-600">Jam Pulang (Check-out):</span>
                      <span className="font-extrabold text-slate-900">{activeSetting.work_end || "17:00"} WIB</span>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-sky-800 leading-relaxed">
                    *Waktu ditentukan langsung oleh <b>Owner ADLS</b>. Absensi wajib menyertakan foto kamera langsung &amp; lokasi GPS aktif.
                  </p>
                </div>

                {/* GPS Status Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Compass size={16} className="text-brand" /> Deteksi GPS Anda
                    </div>
                    <button
                      type="button"
                      onClick={detectGps}
                      disabled={gpsLoading}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                    >
                      <RefreshCw size={12} className={gpsLoading ? "animate-spin" : ""} /> Refresh GPS
                    </button>
                  </div>

                  <div className="mt-2.5">
                    {gpsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                        <Loader2 size={14} className="animate-spin text-brand" /> Mendeteksi koordinat GPS...
                      </div>
                    ) : gpsLocation ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-2.5 text-xs">
                        <div className="flex items-start gap-1.5 text-emerald-800">
                          <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-600" />
                          <div>
                            <span className="font-bold">GPS Terdeteksi:</span>
                            <div className="text-[11px] text-slate-600 break-words mt-0.5">
                              {gpsLocation.locationName}
                            </div>
                            <div className="mt-1 font-mono text-[10px] text-slate-500">
                              Koordinat: {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${gpsLocation.lat},${gpsLocation.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1.5 inline-flex items-center gap-1 font-bold text-brand text-[11px] hover:underline"
                            >
                              <ExternalLink size={12} /> Buka di Google Maps
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5 text-xs text-amber-800">
                        <div className="flex items-start gap-1.5">
                          <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-600" />
                          <div>
                            <span className="font-bold">GPS Belum Aktif</span>
                            <p className="mt-0.5 text-[11px] text-slate-600">
                              {gpsError || "Klik tombol 'Refresh GPS' dan beri izin akses lokasi saat browser meminta izin."}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Check-in / Check-out Interactive Cards */}
              <div className="space-y-5 lg:col-span-2">
                {/* STATUS BAR: Sudah Check-in? Sudah Check-out? */}
                {todayData && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Status Kehadiran Anda Hari Ini:
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {/* Check-in info */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">Check-in Masuk:</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            todayData.check_in_status === "late" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                          }`}>
                            {todayData.check_in_status === "late" ? `Terlambat ${todayData.late_minutes}m` : "Tepat Waktu"}
                          </span>
                        </div>
                        <div className="mt-1 text-xl font-black text-emerald-950 font-mono">
                          {todayData.check_in_time} WIB
                        </div>
                        {todayData.check_in_photo && (
                          <div className="mt-2 flex items-center gap-2">
                            <img
                              src={resolveAssetUrl(todayData.check_in_photo)}
                              alt="Selfie Check-in"
                              className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                              onClick={() => setDetailModal(todayData)}
                            />
                            <div className="text-[11px] text-slate-500">
                              <span className="font-bold text-slate-700">Foto selfie masuk</span>
                              <div className="text-[10px] truncate max-w-[180px]">{todayData.check_in_location || "Lokasi GPS tercatat"}</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Check-out info */}
                      <div className={`rounded-xl border p-3 ${
                        todayData.check_out_time
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-slate-200 bg-slate-50/60"
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-600">Check-out Pulang:</span>
                          {todayData.check_out_time ? (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                              todayData.check_out_status === "early_leave" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                            }`}>
                              {todayData.check_out_status === "early_leave" ? `Pulang Cepat ${todayData.early_leave_minutes}m` : "Selesai"}
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              Belum Pulang
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xl font-black text-slate-900 font-mono">
                          {todayData.check_out_time ? `${todayData.check_out_time} WIB` : "--:-- WIB"}
                        </div>
                        {todayData.check_out_photo && (
                          <div className="mt-2 flex items-center gap-2">
                            <img
                              src={resolveAssetUrl(todayData.check_out_photo)}
                              alt="Selfie Check-out"
                              className="h-10 w-10 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                              onClick={() => setDetailModal(todayData)}
                            />
                            <div className="text-[11px] text-slate-500">
                              <span className="font-bold text-slate-700">Foto selfie pulang</span>
                              <div className="text-[10px] truncate max-w-[180px]">{todayData.check_out_location || "Lokasi GPS tercatat"}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {todayData.work_duration_minutes > 0 && (
                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                        <span className="font-semibold text-slate-600">Total Durasi Jam Kerja Hari Ini:</span>
                        <span className="font-extrabold text-brand-dark">
                          {Math.floor(todayData.work_duration_minutes / 60)} Jam {todayData.work_duration_minutes % 60} Menit
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* FORM CHECK-IN / CHECK-OUT */}
                {(!todayData || !todayData.check_in_time) && (
                  /* Form Check-in Masuk */
                  <div className="card p-5 border-2 border-brand/30">
                    <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                      <Camera size={20} className="text-brand" /> Form Presensi Masuk (Check-in)
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Ambil foto selfie kehadiran di lokasi kerja menggunakan kamera HP/laptop. Lokasi GPS akan otomatis terhubung.
                    </p>

                    <form onSubmit={handleCheckIn} className="mt-4 space-y-4">
                      {/* Photo Capture Section */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          Foto Selfie Kehadiran Masuk *
                        </label>

                        {photoUrl ? (
                          <div className="relative inline-block rounded-xl border border-emerald-300 bg-emerald-50 p-2">
                            <img
                              src={resolveAssetUrl(photoUrl)}
                              alt="Preview Selfie"
                              className="h-44 w-44 rounded-lg object-cover shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoUrl("")}
                              className="absolute top-3 right-3 rounded-full bg-rose-600 p-1 text-white shadow-md hover:bg-rose-700"
                              title="Hapus / Foto Ulang"
                            >
                              <X size={14} />
                            </button>
                            <div className="mt-1 text-center text-[11px] font-bold text-emerald-700">
                              ✓ Foto siap disubmit
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2.5">
                            {/* Hidden direct camera input (opens selfie camera on phones) */}
                            <input
                              type="file"
                              accept="image/*"
                              capture="user"
                              ref={cameraInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                            />

                            <button
                              type="button"
                              disabled={uploadingPhoto}
                              onClick={() => cameraInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-dark transition disabled:opacity-50"
                            >
                              {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                              Buka Kamera HP / Selfie
                            </button>

                            <button
                              type="button"
                              disabled={uploadingPhoto}
                              onClick={startWebcam}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                            >
                              <Video size={16} className="text-brand" /> Buka Kamera Webcam (Laptop)
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Catatan Check-in */}
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Catatan Masuk (Opsional)
                        </label>
                        <input
                          className="input !py-2 text-xs"
                          placeholder="mis. Mengajar kelas pagi / tugas piket cabang"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={submitting || uploadingPhoto || !photoUrl}
                          className="btn-primary w-full !py-2.5 text-sm font-bold shadow-md"
                        >
                          {submitting ? (
                            <Loader2 size={18} className="animate-spin mr-2" />
                          ) : (
                            <UserCheck size={18} className="mr-2" />
                          )}
                          Simpan Check-in Masuk Hari Ini
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {todayData && todayData.check_in_time && !todayData.check_out_time && (
                  /* Form Check-out Pulang */
                  <div className="card p-5 border-2 border-emerald-300 bg-emerald-50/20">
                    <div className="flex items-center gap-2 text-base font-extrabold text-slate-900">
                      <Clock size={20} className="text-emerald-600" /> Form Presensi Pulang (Check-out)
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Ambil foto selfie kepulangan kerja saat jam kerja selesai. Durasi jam kerja akan dihitung secara otomatis.
                    </p>

                    <form onSubmit={handleCheckOut} className="mt-4 space-y-4">
                      {/* Photo Capture Section */}
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-700">
                          Foto Selfie Kepulangan Kerja *
                        </label>

                        {photoUrl ? (
                          <div className="relative inline-block rounded-xl border border-emerald-300 bg-emerald-50 p-2">
                            <img
                              src={resolveAssetUrl(photoUrl)}
                              alt="Preview Selfie Pulang"
                              className="h-44 w-44 rounded-lg object-cover shadow-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setPhotoUrl("")}
                              className="absolute top-3 right-3 rounded-full bg-rose-600 p-1 text-white shadow-md hover:bg-rose-700"
                              title="Hapus / Foto Ulang"
                            >
                              <X size={14} />
                            </button>
                            <div className="mt-1 text-center text-[11px] font-bold text-emerald-700">
                              ✓ Foto pulang siap disubmit
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2.5">
                            <input
                              type="file"
                              accept="image/*"
                              capture="user"
                              ref={cameraInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                            />

                            <button
                              type="button"
                              disabled={uploadingPhoto}
                              onClick={() => cameraInputRef.current?.click()}
                              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                              Buka Kamera HP / Selfie Pulang
                            </button>

                            <button
                              type="button"
                              disabled={uploadingPhoto}
                              onClick={startWebcam}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                            >
                              <Video size={16} className="text-emerald-600" /> Buka Kamera Webcam
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Catatan Check-out */}
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Catatan / Laporan Hari Ini (Opsional)
                        </label>
                        <input
                          className="input !py-2 text-xs"
                          placeholder="mis. Pekerjaan selesai sesuai jadwal / kelas berjalan lancar"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={submitting || uploadingPhoto || !photoUrl}
                          className="btn-primary w-full !py-2.5 text-sm font-bold !bg-emerald-600 hover:!bg-emerald-700 shadow-md"
                        >
                          {submitting ? (
                            <Loader2 size={18} className="animate-spin mr-2" />
                          ) : (
                            <Clock size={18} className="mr-2" />
                          )}
                          Simpan Check-out Pulang Hari Ini
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {todayData && todayData.check_in_time && todayData.check_out_time && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5 text-center shadow-xs">
                    <CheckCircle2 size={36} className="mx-auto text-emerald-600" />
                    <h3 className="mt-2 text-lg font-extrabold text-emerald-950">
                      Presensi Hari Ini Telah Lengkap!
                    </h3>
                    <p className="mt-1 text-xs text-emerald-800 max-w-md mx-auto">
                      Anda telah menyelesaikan check-in masuk dan check-out pulang untuk hari ini. Terima kasih atas dedikasi dan kerja keras Anda di ADLS English Course!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAPITULASI ABSENSI KARYAWAN */}
      {/* ========================================================================= */}
      {tab === "history" && (
        <div className="space-y-4">
          {/* Summary KPIs */}
          {historySummary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500">Total Absensi Tercatat</span>
                <div className="mt-1 text-2xl font-black text-slate-900">{historySummary.total}</div>
                <span className="text-[11px] text-slate-400">
                  {filterStartDate && filterEndDate
                    ? `${filterStartDate} s/d ${filterEndDate}`
                    : filterStartDate
                    ? `Mulai ${filterStartDate}`
                    : filterEndDate
                    ? `Sampai ${filterEndDate}`
                    : "Semua Tanggal"}
                </span>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-emerald-700">Hadir Tepat Waktu</span>
                <div className="mt-1 text-2xl font-black text-emerald-900">{historySummary.on_time_count}</div>
                <span className="text-[11px] text-emerald-600">Sesuai toleransi shift</span>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-amber-700">Terlambat</span>
                <div className="mt-1 text-2xl font-black text-amber-900">{historySummary.late_count}</div>
                <span className="text-[11px] text-amber-600">Melewati jam masuk</span>
              </div>
              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 shadow-2xs">
                <span className="text-xs font-semibold text-sky-700">Check-out Selesai</span>
                <div className="mt-1 text-2xl font-black text-sky-900">{historySummary.completed_count}</div>
                <span className="text-[11px] text-sky-600">Lengkap masuk &amp; pulang</span>
              </div>
            </div>
          )}

          {/* Filter Toolbar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative min-w-[220px] flex-1">
                <Search size={16} className="pointer-events-none absolute left-3.5 top-2.5 text-slate-400" />
                <input
                  className="input !pl-10 !py-2 text-xs w-full"
                  placeholder="Cari nama karyawan, email, lokasi GPS..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Preset Date Range Dropdown */}
                <select
                  className="input !py-1.5 text-xs w-32 font-semibold"
                  value={datePreset}
                  onChange={(e) => applyDatePreset(e.target.value)}
                  title="Pilihan Rentang Tanggal Cepat"
                >
                  <option value="this_month">Bulan Ini</option>
                  <option value="today">Hari Ini</option>
                  <option value="last_7_days">7 Hari Terakhir</option>
                  <option value="last_30_days">30 Hari Terakhir</option>
                  <option value="last_month">Bulan Lalu</option>
                  <option value="all">Semua Tanggal</option>
                  <option value="custom">Custom Tanggal</option>
                </select>

                {/* Date Range: Dari Tanggal & Sampai Tanggal */}
                <div className="flex items-center gap-1 bg-slate-50/80 rounded-xl border border-slate-200 px-2 py-1 shadow-2xs">
                  <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Dari:</span>
                  <div className="w-28">
                    <DatePickerInput
                      mode="date"
                      compact
                      placeholder="Dari Tgl"
                      value={filterStartDate}
                      onChange={handleStartDateChange}
                      isClearable
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">s/d</span>
                  <div className="w-28">
                    <DatePickerInput
                      mode="date"
                      compact
                      placeholder="Sampai Tgl"
                      value={filterEndDate}
                      onChange={handleEndDateChange}
                      isClearable
                    />
                  </div>
                </div>

                {/* Role Filter */}
                <select
                  className="input !py-1.5 text-xs w-32"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="">Semua Role</option>
                  <option value="admin_pusat">Admin Pusat</option>
                  <option value="admin_cabang">Admin Cabang</option>
                  <option value="tutor">Tutor</option>
                </select>

                {/* Branch Filter (HQ only) */}
                {isHQ && branches.length > 0 && (
                  <select
                    className="input !py-1.5 text-xs w-36"
                    value={filterBranchId}
                    onChange={(e) => setFilterBranchId(e.target.value)}
                  >
                    <option value="">Semua Cabang</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Status Filter */}
                <select
                  className="input !py-1.5 text-xs w-32"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="present">Tepat Waktu</option>
                  <option value="late">Terlambat</option>
                  <option value="early_leave">Pulang Cepat</option>
                </select>

                {/* Export Excel Button */}
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                  title="Download Rekap Excel"
                >
                  <FileSpreadsheet size={15} />
                  <span>Export Excel</span>
                </button>

                {/* Reset Attendance Button (Owner only) */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetConfirmation("");
                      setResetScope("filtered");
                      setResetModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                    title="Reset Data Absensi & Unlink Foto Bukti"
                  >
                    <RotateCcw size={15} />
                    <span>Reset Absensi</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table List */}
          <div className="card overflow-hidden">
            {historyLoading ? (
              <div className="flex items-center justify-center p-12 text-slate-400">
                <Loader2 size={24} className="animate-spin mr-2 text-brand" /> Memuat rekap absensi...
              </div>
            ) : historyRows.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-400">
                <Clock size={36} className="mx-auto mb-2 text-slate-300" />
                Belum ada catatan absensi karyawan yang cocok pada periode ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3.5 py-3">Tanggal</th>
                      <th className="px-3.5 py-3">Karyawan</th>
                      <th className="px-3.5 py-3">Cabang</th>
                      <th className="px-3.5 py-3 text-center">Check-in Masuk</th>
                      <th className="px-3.5 py-3 text-center">Check-out Pulang</th>
                      <th className="px-3.5 py-3 text-center">Total Durasi</th>
                      <th className="px-3.5 py-3">Lokasi GPS</th>
                      <th className="px-3.5 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyRows.map((r) => {
                      const hrs = Math.floor((r.work_duration_minutes || 0) / 60);
                      const mins = (r.work_duration_minutes || 0) % 60;
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600 font-semibold">
                            {r.date}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="font-bold text-slate-900">{r.user_name}</div>
                            <span className={`inline-block mt-0.5 rounded px-1.5 py-0.2 text-[10px] font-extrabold border ${ROLE_BADGES[r.user_role || r.role] || "bg-slate-100 text-slate-700"}`}>
                              {ROLE_LABELS[r.user_role || r.role] || r.role}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-600">
                            {r.branch_name || "Pusat"}
                          </td>

                          {/* Check-in */}
                          <td className="px-3.5 py-2.5 text-center">
                            {r.check_in_time ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  {r.check_in_photo && (
                                    <img
                                      src={resolveAssetUrl(r.check_in_photo)}
                                      alt="Selfie"
                                      className="h-7 w-7 rounded-md object-cover border border-slate-200 cursor-pointer hover:scale-110 transition"
                                      onClick={() => setDetailModal(r)}
                                      title="Klik untuk zoom foto selfie"
                                    />
                                  )}
                                  <span className="font-mono font-bold text-slate-800">{r.check_in_time}</span>
                                </div>
                                <span className={`rounded-full px-2 py-0.2 text-[9px] font-extrabold uppercase ${
                                  r.check_in_status === "late" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {r.check_in_status === "late" ? `Telat ${r.late_minutes}m` : "On Time"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          {/* Check-out */}
                          <td className="px-3.5 py-2.5 text-center">
                            {r.check_out_time ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1.5">
                                  {r.check_out_photo && (
                                    <img
                                      src={resolveAssetUrl(r.check_out_photo)}
                                      alt="Selfie"
                                      className="h-7 w-7 rounded-md object-cover border border-slate-200 cursor-pointer hover:scale-110 transition"
                                      onClick={() => setDetailModal(r)}
                                      title="Klik untuk zoom foto selfie pulang"
                                    />
                                  )}
                                  <span className="font-mono font-bold text-slate-800">{r.check_out_time}</span>
                                </div>
                                <span className={`rounded-full px-2 py-0.2 text-[9px] font-extrabold uppercase ${
                                  r.check_out_status === "early_leave" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                                }`}>
                                  {r.check_out_status === "early_leave" ? `Awal ${r.early_leave_minutes}m` : "Selesai"}
                                </span>
                              </div>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                Belum
                              </span>
                            )}
                          </td>

                          {/* Work Duration */}
                          <td className="px-3.5 py-2.5 text-center font-bold text-brand-dark whitespace-nowrap">
                            {r.work_duration_minutes > 0 ? `${hrs}j ${mins}m` : "-"}
                          </td>

                          {/* GPS Location */}
                          <td className="px-3.5 py-2.5">
                            {r.check_in_lat && r.check_in_lng ? (
                              <a
                                href={`https://www.google.com/maps?q=${r.check_in_lat},${r.check_in_lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand hover:underline"
                                title="Buka koordinat di Google Maps"
                              >
                                <MapPin size={12} className="shrink-0" />
                                <span className="truncate max-w-[140px]">{r.check_in_location || "Buka Peta"}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setDetailModal(r)}
                                className="btn-ghost !px-2 !py-1 text-xs font-bold hover:text-brand"
                                title="Lihat detail lengkap foto & GPS"
                              >
                                <Eye size={14} /> Detail
                              </button>
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(r)}
                                  className="btn-ghost !px-1.5 !py-1 text-xs font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                  title="Hapus data absensi"
                                >
                                  <Trash2 size={14} />
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

      {/* ========================================================================= */}
      {/* TAB 3: PENGATURAN JAM KERJA OLEH OWNER */}
      {/* ========================================================================= */}
      {tab === "settings" && isOwner && (
        <div className="card p-5 max-w-4xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Pengaturan Jam Masuk &amp; Jam Pulang Karyawan
              </h2>
              <p className="text-xs text-slate-500">
                Khusus <b>Owner</b>: Tentukan jam masuk, toleransi keterlambatan, dan jam kepulangan untuk masing-masing role karyawan.
              </p>
            </div>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-extrabold text-purple-800">
              Hak Akses Owner
            </span>
          </div>

          {settingsLoading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-brand" /> Memuat pengaturan shift...
            </div>
          ) : (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {settingsList.map((st, idx) => (
                  <div key={st.role || idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-sm text-slate-900 capitalize">
                        Role: {ROLE_LABELS[st.role] || st.role}
                      </span>
                      <span className="text-[11px] font-bold text-brand">Shift Aktif</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-700">
                          Jam Masuk (Check-in) *
                        </label>
                        <input
                          type="time"
                          required
                          className="input !py-1.5 text-xs font-mono"
                          value={st.work_start}
                          onChange={(e) => updateSettingItem(idx, "work_start", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-700">
                          Jam Pulang (Check-out) *
                        </label>
                        <input
                          type="time"
                          required
                          className="input !py-1.5 text-xs font-mono"
                          value={st.work_end}
                          onChange={(e) => updateSettingItem(idx, "work_end", e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-[11px] font-bold text-slate-700">
                        Toleransi Keterlambatan (Menit) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        required
                        className="input !py-1.5 text-xs"
                        value={st.late_tolerance_minutes}
                        onChange={(e) => updateSettingItem(idx, "late_tolerance_minutes", e.target.value)}
                      />
                      <span className="text-[10px] text-slate-500">
                        Check-in setelah {st.work_start} + {st.late_tolerance_minutes} menit akan otomatis ditandai Terlambat.
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn-primary !py-2 text-xs font-bold shadow-sm"
                >
                  {savingSettings && <Loader2 size={14} className="animate-spin mr-1.5" />}
                  Simpan Semua Pengaturan Jam Kerja
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL WEBCAM CAPTURE (DESKTOP/LAPTOP) */}
      {/* ========================================================================= */}
      <Modal open={webcamOpen} title="Ambil Foto Bukti via Webcam" onClose={stopWebcam}>
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} autoPlay playsInline muted className="h-64 sm:h-80 w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={stopWebcam}>
              Batal
            </button>
            <button
              type="button"
              onClick={captureWebcamSnapshot}
              className="btn-primary inline-flex items-center gap-1.5"
            >
              <Camera size={16} /> Ambil Foto Sekarang
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL DETAIL BUKTI ABSENSI & FOTO ZOOM */}
      {/* ========================================================================= */}
      <Modal open={!!detailModal} title="Rincian Bukti Absensi Karyawan" onClose={() => setDetailModal(null)}>
        {detailModal && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <span className="text-sm font-extrabold text-slate-900">{detailModal.user_name}</span>
                <span className={`ml-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold border ${ROLE_BADGES[detailModal.user_role || detailModal.role]}`}>
                  {ROLE_LABELS[detailModal.user_role || detailModal.role] || detailModal.role}
                </span>
              </div>
              <span className="font-bold text-slate-500">{detailModal.date}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Check-in detail */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Presensi Masuk:</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                    detailModal.check_in_status === "late" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {detailModal.check_in_status === "late" ? `Telat ${detailModal.late_minutes}m` : "Tepat Waktu"}
                  </span>
                </div>
                <div className="font-mono text-base font-extrabold text-slate-900">
                  {detailModal.check_in_time || "-"} WIB
                </div>
                {detailModal.check_in_photo && (
                  <div>
                    <img
                      src={resolveAssetUrl(detailModal.check_in_photo)}
                      alt="Selfie Masuk"
                      className="h-44 w-full rounded-lg object-cover border border-slate-200"
                    />
                  </div>
                )}
                {detailModal.check_in_lat && detailModal.check_in_lng && (
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold">Lokasi GPS:</span>
                    <p className="text-[10px] text-slate-500 break-words">{detailModal.check_in_location}</p>
                    <a
                      href={`https://www.google.com/maps?q=${detailModal.check_in_lat},${detailModal.check_in_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-brand hover:underline mt-1"
                    >
                      <ExternalLink size={12} /> Buka Koordinat di Google Maps
                    </a>
                  </div>
                )}
                {detailModal.check_in_notes && (
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold">Catatan Masuk:</span> {detailModal.check_in_notes}
                  </div>
                )}
              </div>

              {/* Check-out detail */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <div className="font-bold text-slate-800 flex items-center justify-between">
                  <span>Presensi Pulang:</span>
                  {detailModal.check_out_time ? (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                      detailModal.check_out_status === "early_leave" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {detailModal.check_out_status === "early_leave" ? `Awal ${detailModal.early_leave_minutes}m` : "Selesai"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-600">Belum Pulang</span>
                  )}
                </div>
                <div className="font-mono text-base font-extrabold text-slate-900">
                  {detailModal.check_out_time ? `${detailModal.check_out_time} WIB` : "-"}
                </div>
                {detailModal.check_out_photo && (
                  <div>
                    <img
                      src={resolveAssetUrl(detailModal.check_out_photo)}
                      alt="Selfie Pulang"
                      className="h-44 w-full rounded-lg object-cover border border-slate-200"
                    />
                  </div>
                )}
                {detailModal.check_out_lat && detailModal.check_out_lng && (
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold">Lokasi GPS:</span>
                    <p className="text-[10px] text-slate-500 break-words">{detailModal.check_out_location}</p>
                    <a
                      href={`https://www.google.com/maps?q=${detailModal.check_out_lat},${detailModal.check_out_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-brand hover:underline mt-1"
                    >
                      <ExternalLink size={12} /> Buka Koordinat di Google Maps
                    </a>
                  </div>
                )}
                {detailModal.check_out_notes && (
                  <div className="text-[11px] text-slate-600">
                    <span className="font-semibold">Catatan Pulang:</span> {detailModal.check_out_notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="button" className="btn-primary !py-1.5 !text-xs font-bold" onClick={() => setDetailModal(null)}>
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* RESET ATTENDANCE MODAL (OWNER ONLY) */}
      {/* ========================================================================= */}
      {isOwner && (
        <Modal
          open={resetModalOpen}
          onClose={() => {
            if (!resetting) {
              setResetModalOpen(false);
              setResetConfirmation("");
            }
          }}
          title="Reset Data Absensi & Unlink Foto Bukti"
        >
          <form onSubmit={handleResetAttendance} className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3.5 text-xs text-rose-900 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-rose-700 text-sm">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <span>Peringatan Penting (Tindakan Tidak Dapat Dibatalkan)</span>
              </div>
              <p className="leading-relaxed">
                Tindakan ini akan <b>menghapus data absensi karyawan secara permanen</b> dari database sekaligus <b>menghapus (unlink) seluruh file foto bukti kamera selfie dari server</b> untuk menghemat storage.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase text-slate-700">Pilih Cakupan Reset:</label>
              <div className="space-y-2">
                <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                  resetScope === "filtered" ? "border-rose-400 bg-rose-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}>
                  <input
                    type="radio"
                    name="resetScope"
                    value="filtered"
                    checked={resetScope === "filtered"}
                    onChange={() => setResetScope("filtered")}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-900">Reset Sesuai Filter Saat Ini</div>
                    <div className="mt-1 text-slate-600 space-y-0.5">
                      <div>• Rentang Tanggal: <b className="text-slate-800">{filterStartDate && filterEndDate ? `${filterStartDate} s/d ${filterEndDate}` : filterStartDate ? `Mulai ${filterStartDate}` : filterEndDate ? `Sampai ${filterEndDate}` : "Semua Tanggal"}</b></div>
                      <div>• Role: <b className="text-slate-800">{filterRole ? (ROLE_LABELS[filterRole] || filterRole) : "Semua Role"}</b></div>
                      {isHQ && <div>• Cabang: <b className="text-slate-800">{filterBranchId ? (branches.find((b) => String(b.id) === String(filterBranchId))?.name || `#${filterBranchId}`) : "Semua Cabang"}</b></div>}
                      <div>• Status: <b className="text-slate-800">{filterStatus || "Semua Status"}</b></div>
                    </div>
                  </div>
                </label>

                <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                  resetScope === "all" ? "border-red-500 bg-red-50/60" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}>
                  <input
                    type="radio"
                    name="resetScope"
                    value="all"
                    checked={resetScope === "all"}
                    onChange={() => setResetScope("all")}
                    className="mt-0.5"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-red-700">Reset Seluruh Data Absensi (Full Clear)</div>
                    <div className="mt-1 text-slate-600">
                      Menghapus seluruh riwayat absensi karyawan dari awal dan meng-unlink seluruh file foto selfie yang ada di disk server tanpa terkecuali.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Ketik kata <span className="text-red-600 font-mono font-black">RESET</span> untuk konfirmasi:
              </label>
              <input
                type="text"
                required
                className="input uppercase tracking-wider font-mono font-bold text-center !py-2 text-sm"
                placeholder="RESET"
                value={resetConfirmation}
                onChange={(e) => setResetConfirmation(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                className="btn-ghost !py-1.5 !text-xs font-bold"
                onClick={() => {
                  setResetModalOpen(false);
                  setResetConfirmation("");
                }}
                disabled={resetting}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={resetConfirmation.trim().toUpperCase() !== "RESET" || resetting}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {resetting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Sedang Menghapus &amp; Unlink Foto...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} /> Hapus &amp; Unlink Foto
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
