import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  ArrowRight,
  Calendar,
  CalendarClock,
  CalendarPlus,
  Camera,
  Check,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting, getOpeningGreeting } from "@/utils/greetings";
import { exportToExcel } from "@/utils/exportExcel";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import useResourceList from "@/hooks/useResourceList";
import AsyncResourceSelect from "./AsyncResourceSelect";
import DataTable from "./DataTable";
import DatePickerInput from "./DatePickerInput";
import LearningJourneyRoadmap from "./LearningJourneyRoadmap";
import Modal from "./Modal";
import Pagination from "./Pagination";
import ResourceForm from "./ResourceForm";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

export default function ResourcePage({ resource: cfg }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortKey, setSortKey] = useState("");
  const [sortOrder, setSortOrder] = useState("asc");
  const [branches, setBranches] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [modal, setModal] = useState(null); // { row? }
  const [saving, setSaving] = useState(false);
  const [quickBusyId, setQuickBusyId] = useState(null);
  const [decisionModal, setDecisionModal] = useState(null); // { row, status, notes }

  // Filter Rentang Tanggal & Download Excel (Admin & Tutor)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  // Switcher Anak khusus Orang Tua (Multi-Anak)
  const [studentIdFilter, setStudentIdFilter] = useState("");
  const [myChildren, setMyChildren] = useState([]);

  // Modal siapkan slot nilai kelas oleh Admin Cabang / HQ (#8)
  const [initModal, setInitModal] = useState(false);
  const [initForm, setInitForm] = useState({
    class_id: null,
    class_name: "",
    report_month: new Date().toISOString().slice(0, 7),
    report_date: new Date().toISOString().slice(0, 10),
    material: "",
    homework: "",
  });

  // Modal Roadmap 12 Pertemuan untuk Admin & Tutor di menu Laporan Belajar
  const [roadmapModal, setRoadmapModal] = useState(false);
  const [roadmapStudent, setRoadmapStudent] = useState(null);

  // Modal Dokumentasi Foto/Video Kegiatan Kelas (Laporan Belajar Harian - Orang Tua)
  const [activityDocModal, setActivityDocModal] = useState(null);

  // Fitur Ambil Reschedule di halaman Izin (Siswa & Ortu) - PDF Hal 2
  const isLeavesPage = cfg.endpoint === API_ENDPOINTS.LEAVES;
  const isLearningReportsPage = cfg.endpoint === API_ENDPOINTS.LEARNING_REPORTS;
  const isStudentSide = ["siswa", "ortu"].includes(user?.role);
  const [rescheduleQuota, setRescheduleQuota] = useState(null);
  const [portalStudents, setPortalStudents] = useState([]);
  const [rescheduleModal, setRescheduleModal] = useState(null); // { leaveRow? }
  const [rescheduleForm, setRescheduleForm] = useState({
    student_id: "",
    class_id: "",
    tutor_id: "",
    new_date: "",
    new_day: "",
    new_time: "15:00",
    original_date: "",
    reason: "",
    leave_id: null,
  });
  const [rescheduleSaving, setRescheduleSaving] = useState(false);

  const isHQ = ["owner", "admin_pusat"].includes(user.role);
  const isStaff = STAFF.includes(user.role);
  const isParent = user?.role === "ortu";
  const pageTitle = cfg.getTitle ? cfg.getTitle(user) : cfg.title;
  const canDownloadExcel = ["owner", "admin_pusat", "admin_cabang", "tutor"].includes(user?.role);
  const showBranchFilter = Boolean(cfg.branchFilter && isHQ);

  const loadRescheduleContext = async () => {
    if (!isLeavesPage || !isStudentSide) return;
    try {
      const [qRes, pRes] = await Promise.all([
        api.get(API_ENDPOINTS.PORTAL_RESCHEDULE_QUOTA),
        api.get(API_ENDPOINTS.PORTAL_SUMMARY),
      ]);
      setRescheduleQuota(qRes.data.data || null);
      setPortalStudents(pRes.data.data?.students || []);
    } catch {
      setRescheduleQuota(null);
    }
  };

  useEffect(() => {
    loadRescheduleContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeavesPage, isStudentSide]);

  const openRescheduleModal = (leaveRow = null) => {
    const primaryStu = portalStudents[0] || {};
    const origDate = leaveRow?.start_date ? String(leaveRow.start_date).slice(0, 10) : "";
    setRescheduleForm({
      student_id: primaryStu.id || "",
      class_id: primaryStu.class_id || "",
      tutor_id: primaryStu.tutor_id || "",
      new_date: "",
      new_day: "",
      new_time: "15:00",
      original_date: origDate,
      reason: leaveRow?.reason || "",
      leave_id: leaveRow?.id || null,
    });
    setRescheduleModal({ leaveRow });
  };

  const submitReschedule = async (e) => {
    e.preventDefault();
    if (!rescheduleForm.class_id) {
      toast.error("Anda belum terdaftar di kelas aktif. Hubungi admin cabang.");
      return;
    }
    if (!rescheduleForm.new_date || !rescheduleForm.new_time) {
      toast.error("Tanggal reschedule dan jam sesi wajib diisi");
      return;
    }
    setRescheduleSaving(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.PORTAL_RESCHEDULE, {
            student_id: rescheduleForm.student_id || undefined,
            class_id: rescheduleForm.class_id,
            tutor_id: rescheduleForm.tutor_id || undefined,
            new_date: rescheduleForm.new_date,
            new_time: rescheduleForm.new_time,
            original_date: rescheduleForm.original_date || undefined,
            reason: rescheduleForm.reason || "Reschedule dari halaman Izin",
            leave_id: rescheduleForm.leave_id || undefined,
          }),
        { success: getClosingGreeting(user.role, "Jadwal berhasil di-reschedule!") }
      );
      setRescheduleModal(null);
      await loadRescheduleContext();
      refetch();
    } catch {
      /* toast handled */
    } finally {
      setRescheduleSaving(false);
    }
  };

  useEffect(() => {
    if (!showBranchFilter) return;
    api
      .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
      .then((r) => setBranches(r.data.data || []))
      .catch(() => setBranches([]));
  }, [showBranchFilter]);

  // Load anak-anak untuk orang tua jika di menu absensi atau laporan belajar
  useEffect(() => {
    if (isParent) {
      api
        .get(API_ENDPOINTS.MY_STUDENTS)
        .then((r) => setMyChildren(r.data.data || []))
        .catch(() => setMyChildren([]));
    }
  }, [isParent]);

  const debounced = useDebounce(search, 300);
  const queryParams = {
    page,
    limit,
    search: debounced,
    ...(showBranchFilter && branchId ? { branch_id: branchId } : {}),
    ...(cfg.userSortFilters && roleFilter ? { role: roleFilter } : {}),
    ...(cfg.userSortFilters && statusFilter ? { status: statusFilter } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
    ...(studentIdFilter ? { student_id: studentIdFilter } : {}),
    ...(sortKey ? { sort: sortKey, order: sortOrder } : {}),
  };
  const { rows, pagination, loading, error, refetch } = useResourceList(cfg.endpoint.LIST, queryParams);

  const canCreate = cfg.c.includes(user.role);
  const canEdit = cfg.u.includes(user.role);
  const isApprover = cfg.staffApproves ? isStaff : isHQ;
  const rawFields = cfg.getFields ? cfg.getFields(user, modal?.row) : cfg.fields;
  const fields = rawFields.filter((f) => !f.approveOnly || (isApprover && modal?.row));
  const columns = cfg.getColumns ? cfg.getColumns(user) : cfg.columns;

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get(cfg.endpoint.LIST, {
        params: {
          limit: 5000,
          export: 1,
          search: debounced || undefined,
          branch_id: showBranchFilter && branchId ? branchId : undefined,
          role: cfg.userSortFilters && roleFilter ? roleFilter : undefined,
          status: cfg.userSortFilters && statusFilter ? statusFilter : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          student_id: studentIdFilter || undefined,
          sort: sortKey || undefined,
          order: sortOrder,
        },
      });
      const dataToExport = res.data.data || rows;
      exportToExcel(cfg.title || "Export_ADLS", columns, dataToExport);
    } catch {
      exportToExcel(cfg.title || "Export_ADLS", columns, rows);
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const save = async (values) => {
    setSaving(true);
    try {
      const row = modal.row;
      await request(
        () => (row ? api.put(cfg.endpoint.DETAIL(row.id), values) : api.post(cfg.endpoint.LIST, values)),
        { success: getClosingGreeting(user.role, `${cfg.title} berhasil disimpan.`) }
      );
      setModal(null);
      refetch();
    } catch {
      /* toast sudah tampil */
    } finally {
      setSaving(false);
    }
  };

  const handleQuickDecision = async (row, status) => {
    setQuickBusyId(row.id);
    try {
      await request(
        () => api.put(cfg.endpoint.DETAIL(row.id), { status }),
        {
          success: getClosingGreeting(
            user.role,
            status === "approved" ? "Pengajuan berhasil di-ACC (disetujui)." : "Pengajuan telah ditolak."
          ),
        }
      );
      refetch();
    } catch {
      /* toast sudah tampil */
    } finally {
      setQuickBusyId(null);
    }
  };

  const onQuickDecisionClick = (row, status) => {
    if (cfg.name === "leaves") {
      setDecisionModal({ row, status, notes: row.approval_notes || "" });
    } else {
      handleQuickDecision(row, status);
    }
  };

  const submitDecision = async (e) => {
    e.preventDefault();
    if (!decisionModal) return;
    setQuickBusyId(decisionModal.row.id);
    try {
      await request(
        () =>
          api.put(cfg.endpoint.DETAIL(decisionModal.row.id), {
            status: decisionModal.status,
            approval_notes: decisionModal.notes,
          }),
        {
          success: getClosingGreeting(
            user.role,
            decisionModal.status === "approved"
              ? "Pengajuan cuti/izin berhasil di-ACC (Approved)."
              : "Pengajuan cuti/izin telah ditolak (Rejected)."
          ),
        }
      );
      setDecisionModal(null);
      refetch();
    } catch {
      /* toast */
    } finally {
      setQuickBusyId(null);
    }
  };

  const submitInitClass = async (e) => {
    e.preventDefault();
    if (!initForm.class_id) {
      toast.error("Pilih kelas terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.LEARNING_REPORTS_INIT_CLASS, {
            class_id: initForm.class_id,
            report_month: initForm.report_month,
            report_date: initForm.report_date,
            material: initForm.material,
            homework: initForm.homework,
          }),
        { success: getClosingGreeting(user.role, "Slot kolom nilai kelas siap di Portal Tutor!") }
      );
      setInitModal(false);
      refetch();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const remove = (row) =>
    toast(
      (t) => (
        <div className="text-sm">
          <p className="mb-2 font-medium">Hapus data ini?</p>
          <div className="flex gap-2">
            <button
              className="btn-primary !bg-none !bg-red-600 !px-3 !py-1"
              onClick={async () => {
                toast.dismiss(t.id);
                await request(() => api.delete(cfg.endpoint.DETAIL(row.id)), {
                  success: getClosingGreeting(user.role, "Data berhasil dihapus."),
                });
                refetch();
              }}
            >
              Hapus
            </button>
            <button className="btn-ghost !px-3 !py-1" onClick={() => toast.dismiss(t.id)}>
              Batal
            </button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );

  const branchOptions = [
    { value: "", label: "Semua Cabang" },
    ...branches.map((b) => ({ value: String(b.id), label: b.city ? `${b.name} (${b.city})` : b.name })),
  ];

  const getInitialValues = () => {
    if (modal?.row) return modal.row;
    const init = cfg.getDefaultValues ? cfg.getDefaultValues(user) : {};
    if (["admin_cabang", "tutor"].includes(user.role) && user.branch_id) {
      init.branch_id = user.branch_id;
    }
    if (cfg.defaultDateKey) {
      init[cfg.defaultDateKey] = new Date().toISOString().slice(0, 10);
    }
    return init;
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {user.role === "tutor" && cfg.tutorClockNotice && (
        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Sparkles size={20} className="shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-bold">{getOpeningGreeting(user)}</p>
              <p className="mt-0.5 text-xs text-sky-100">
                Absensi masuk tutor dilakukan real-time di Portal Tutor dengan pencatatan jam server otomatis.
              </p>
            </div>
          </div>
          <Link to="/" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-brand-dark shadow-sm transition hover:bg-sky-50">
            Buka Portal Tutor <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* 1. Header Bar: Title + Subtitle on Left, Actions on Right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">{pageTitle}</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            {cfg.subtitle || `Kelola dan pantau data ${pageTitle.toLowerCase()} secara terstruktur & real-time`}
          </p>
        </div>

        {/* Action Buttons Cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {isLearningReportsPage && [...STAFF, "tutor"].includes(user?.role) && (
            <button
              type="button"
              onClick={() => setRoadmapModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 shadow-2xs hover:bg-amber-100 transition"
            >
              <Star size={14} className="fill-amber-400 text-amber-500" />
              <span>Roadmap 12 Pertemuan</span>
            </button>
          )}

          {isLeavesPage && isStudentSide && rescheduleQuota?.allowed && (
            <button
              type="button"
              onClick={() => openRescheduleModal(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-800 shadow-2xs hover:bg-sky-100 transition"
              title={`Sisa jatah reschedule: ${rescheduleQuota.remaining} dari ${rescheduleQuota.maxLimit}`}
            >
              <CalendarClock size={15} className="text-sky-600" />
              <span>Ambil Reschedule (Sisa {rescheduleQuota.remaining}x)</span>
            </button>
          )}

          {canDownloadExcel && (
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition disabled:opacity-50"
              title="Download data sebagai file Excel (.csv UTF-8)"
            >
              {exporting ? (
                <Loader2 size={14} className="animate-spin text-emerald-700" />
              ) : (
                <FileSpreadsheet size={15} className="text-emerald-700" />
              )}
              <span>Export Excel</span>
            </button>
          )}

          {cfg.initClassAction && isStaff && (
            <button type="button" className="btn-ghost !py-2 text-xs font-bold" onClick={() => setInitModal(true)}>
              <CalendarPlus size={15} /> Siapkan Kolom Nilai
            </button>
          )}

          {canCreate && (
            <button className="btn-primary !py-2 text-xs font-bold shadow-sm" onClick={() => setModal({})}>
              <Plus size={16} />
              <span>Tambah {cfg.singular || pageTitle}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Dedicated Filter & Search Card Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box on Left */}
          <div className="relative min-w-[220px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-2.5 text-slate-400" />
            <input
              className="input !pl-10 !py-2 text-xs w-full"
              placeholder={`Cari data ${pageTitle.toLowerCase()}...`}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {/* Filter Dropdowns and Date Picker on Right */}
          <div className="flex flex-wrap items-center gap-2">
            {showBranchFilter && branches.length > 0 && (
              <div className="w-44 sm:w-48">
                <Select
                  options={branchOptions}
                  value={branchOptions.find((o) => o.value === branchId) || branchOptions[0]}
                  onChange={(opt) => {
                    setBranchId(opt?.value || "");
                    setPage(1);
                  }}
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: "0.75rem",
                      borderColor: "#cbd5e1",
                      fontSize: "0.75rem",
                      minHeight: 38,
                      height: 38,
                      fontWeight: 600,
                    }),
                    menu: (base) => ({ ...base, zIndex: 40, borderRadius: "0.75rem", fontSize: "0.75rem" }),
                  }}
                />
              </div>
            )}

            {cfg.userSortFilters && (
              <>
                <select
                  className="input !w-auto !py-2 text-xs font-medium"
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter Role"
                >
                  <option value="">Semua Role</option>
                  <option value="owner">Owner</option>
                  <option value="admin_pusat">Admin Pusat</option>
                  <option value="admin_cabang">Admin Cabang</option>
                  <option value="tutor">Tutor</option>
                  <option value="siswa">Siswa / Karyawan</option>
                  <option value="ortu">Orang Tua</option>
                </select>
                <select
                  className="input !w-auto !py-2 text-xs font-medium"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Filter Status"
                >
                  <option value="">Semua Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  className="input !w-auto !py-2 text-xs font-medium"
                  value={sortKey ? `${sortKey}:${sortOrder}` : ""}
                  onChange={(e) => {
                    const [k, o] = (e.target.value || "").split(":");
                    setSortKey(k || "");
                    setSortOrder(o || "asc");
                    setPage(1);
                  }}
                  aria-label="Sortir Users"
                >
                  <option value="">Urutkan: Terbaru</option>
                  <option value="role:asc">Sortir Role (A-Z)</option>
                  <option value="role:desc">Sortir Role (Z-A)</option>
                  <option value="status:asc">Sortir Status (Active)</option>
                  <option value="status:desc">Sortir Status (Inactive)</option>
                  <option value="name:asc">Sortir Nama (A-Z)</option>
                </select>
              </>
            )}

            {/* Switcher Anak untuk Orang Tua (Multi-Anak) di Absensi / Laporan */}
            {isParent && myChildren.length > 1 && (
              <select
                className="input !w-auto !py-2 text-xs font-semibold"
                value={studentIdFilter}
                onChange={(e) => {
                  setStudentIdFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua Anak ({myChildren.length})</option>
                {myChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    Anak: {c.name}
                  </option>
                ))}
              </select>
            )}

            {/* Filter Rentang Tanggal (Date Range Pill) */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
              <Calendar size={13} className="text-brand shrink-0" />
              <span className="text-slate-500 font-semibold hidden sm:inline">Periode:</span>
              <DatePickerInput
                compact
                showIcon={false}
                value={startDate}
                placeholder="dd/mm/yyyy"
                title="Dari Tanggal"
                onChange={(val) => {
                  setStartDate(val);
                  setPage(1);
                }}
              />
              <span className="text-slate-400 font-bold text-[11px]">-</span>
              <DatePickerInput
                compact
                showIcon={false}
                value={endDate}
                placeholder="dd/mm/yyyy"
                title="Sampai Tanggal"
                onChange={(val) => {
                  setEndDate(val);
                  setPage(1);
                }}
              />
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                  className="rounded-md p-0.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600 transition"
                  title="Reset Rentang Tanggal"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          rows={rows}
          loading={loading}
          error={error}
          canEdit={canEdit}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={handleSort}
          quickActions={
            cfg.quickApprove && isApprover
              ? (row) =>
                  row.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        disabled={quickBusyId === row.id}
                        onClick={() => onQuickDecisionClick(row, "approved")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                        title="ACC / Setujui"
                      >
                        <Check size={13} /> ACC
                      </button>
                      <button
                        type="button"
                        disabled={quickBusyId === row.id}
                        onClick={() => onQuickDecisionClick(row, "rejected")}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                        title="Tolak"
                      >
                        <X size={13} /> Tolak
                      </button>
                    </>
                  ) : null
              : isLeavesPage && isStudentSide && rescheduleQuota?.allowed
              ? (row) => (
                  <button
                    type="button"
                    onClick={() => openRescheduleModal(row)}
                    className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 transition hover:bg-sky-100"
                    title={`Ambil jadwal reschedule (Sisa kuota: ${rescheduleQuota.remaining}x)`}
                  >
                    <CalendarClock size={13} /> Ambil Reschedule
                  </button>
                )
              : isLearningReportsPage && isParent
              ? (row) =>
                  row.activity_photo_url ? (
                    <button
                      type="button"
                      onClick={() => setActivityDocModal(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-dark transition hover:bg-brand hover:text-white"
                      title="Lihat dokumentasi foto/video saat belajar di kelas"
                    >
                      <Camera size={13} /> Dokumentasi Kelas
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-400">
                      <Camera size={12} /> Belum diupload
                    </span>
                  )
              : undefined
          }
          onEdit={(row) => setModal({ row })}
          onDelete={remove}
          onRetry={refetch}
        />
        <Pagination pagination={pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </div>

      <Modal open={!!modal} title={`${modal?.row ? "Edit" : "Tambah"} ${pageTitle}`} onClose={() => setModal(null)}>
        {modal && (
          <ResourceForm
            fields={fields}
            initial={getInitialValues()}
            loading={saving}
            onSubmit={save}
            onCancel={() => setModal(null)}
          />
        )}
      </Modal>

      <Modal open={initModal} title="Siapkan Kolom Nilai Laporan Belajar Kelas" onClose={() => setInitModal(false)}>
        <form onSubmit={submitInitClass} className="space-y-3.5">
          <div className="rounded-xl bg-brand-50/70 p-3 text-xs text-slate-700">
            Fitur ini membuat kolom laporan nilai belajar otomatis untuk seluruh siswa aktif di kelas yang dipilih agar Tutor tinggal mengisi nilainya dari Portal Tutor.
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Pilih Kelas *</label>
            <AsyncResourceSelect
              endpoint={API_ENDPOINTS.CLASSES.LIST}
              value={initForm.class_id}
              initialLabel={initForm.class_name}
              placeholder="Cari type kelas / level / cabang..."
              formatOption={(c) => ({
                value: c.id,
                label: [c.class_type || c.name, c.level, c.schedule, c.branch_name].filter(Boolean).join(" · "),
                raw: c,
              })}
              onChange={(opt) => setInitForm({ ...initForm, class_id: opt ? opt.value : null, class_name: opt ? opt.label : "" })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bulan *</label>
              <DatePickerInput mode="month" required value={initForm.report_month} onChange={(val) => setInitForm({ ...initForm, report_month: val })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tanggal Laporan *</label>
              <DatePickerInput mode="date" required value={initForm.report_date} onChange={(val) => setInitForm({ ...initForm, report_date: val })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Materi Default (opsional)</label>
            <input className="input" placeholder="Kosongkan jika ingin diisi langsung oleh Tutor" value={initForm.material} onChange={(e) => setInitForm({ ...initForm, material: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">PR (Pekerjaan Rumah) Default (opsional)</label>
            <input className="input" placeholder="mis. Latihan Workbook Hal. 12" value={initForm.homework} onChange={(e) => setInitForm({ ...initForm, homework: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setInitModal(false)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Siapkan Kolom Kelas
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Keputusan ACC / Tolak Cuti dengan Keterangan (#11) */}
      <Modal
        open={!!decisionModal}
        title={`${decisionModal?.status === "approved" ? "ACC / Setujui" : "Tolak"} Pengajuan Cuti`}
        onClose={() => setDecisionModal(null)}
      >
        {decisionModal && (
          <form onSubmit={submitDecision} className="space-y-3.5">
            <div className={`rounded-xl p-3 text-xs ${decisionModal.status === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
              Konfirmasi keputusan status <b>{decisionModal.status === "approved" ? "APPROVED (Disetujui)" : "REJECTED (Ditolak)"}</b> untuk pengajuan cuti/izin ini.
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Keterangan / Alasan Keputusan
              </label>
              <textarea
                rows={3}
                className="input"
                placeholder={decisionModal.status === "approved" ? "mis. Disetujui, jadwal kelas pengganti sudah dikoordinasikan." : "mis. Jadwal ujian siswa padat, mohon diajukan di tanggal lain."}
                value={decisionModal.notes}
                onChange={(e) => setDecisionModal({ ...decisionModal, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setDecisionModal(null)}>
                Batal
              </button>
              <button
                className={`rounded-xl px-4 py-2 text-xs font-extrabold text-white shadow-sm transition ${
                  decisionModal.status === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                }`}
                disabled={quickBusyId === decisionModal.row.id}
              >
                {quickBusyId === decisionModal.row.id ? "Menyimpan..." : decisionModal.status === "approved" ? "ACC Pengajuan" : "Tolak Pengajuan"}
              </button>
            </div>
          </form>
        )}
      </Modal>
      {/* Modal Roadmap 12 Pertemuan (Kelola Kurikulum & Nilai Siswa) */}
      <Modal
        open={roadmapModal}
        title="Kelola Learning Journey Roadmap (12x Pertemuan)"
        onClose={() => setRoadmapModal(false)}
        maxWidth="max-w-5xl"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">
              Pilih Siswa untuk Melihat / Input Nilai 4 Aspek (opsional jika hanya ingin edit kurikulum global):
            </label>
            <AsyncResourceSelect
              endpoint={API_ENDPOINTS.STUDENTS.LIST}
              value={roadmapStudent?.id || null}
              initialLabel={roadmapStudent?.name || ""}
              isClearable
              formatOption={(s) => ({
                value: s.id,
                label: [s.name, s.level, s.branch_name].filter(Boolean).join(" · "),
                raw: s,
              })}
              onChange={(opt) => setRoadmapStudent(opt ? opt.raw : null)}
            />
          </div>
          <LearningJourneyRoadmap
            studentId={roadmapStudent?.id}
            studentName={roadmapStudent?.name}
            level={roadmapStudent?.level}
            compact
          />
        </div>
      </Modal>

      {/* Modal Pengambilan Reschedule dari Halaman Izin */}
      <Modal
        open={!!rescheduleModal}
        title="Ambil Jadwal Reschedule"
        onClose={() => setRescheduleModal(null)}
      >
        {rescheduleModal && (
          <form onSubmit={submitReschedule} className="space-y-3.5">
            {rescheduleQuota && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-3 text-xs text-sky-900">
                Sisa kuota reschedule Anda: <b>{rescheduleQuota.remaining} dari {rescheduleQuota.maxLimit}x</b> ({rescheduleQuota.periodLabel}).
              </div>
            )}

            {portalStudents.length > 1 && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Pilih Siswa / Kelas *</label>
                <select
                  required
                  className="input text-xs"
                  value={rescheduleForm.student_id}
                  onChange={(e) => {
                    const stu = portalStudents.find((s) => String(s.id) === e.target.value);
                    setRescheduleForm({
                      ...rescheduleForm,
                      student_id: stu?.id || "",
                      class_id: stu?.class_id || "",
                      tutor_id: stu?.tutor_id || "",
                    });
                  }}
                >
                  {portalStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.class_name || s.class_type || "Kelas"} ({s.level || "-"})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Tanggal Reschedule *</label>
                <DatePickerInput
                  mode="date"
                  required
                  value={rescheduleForm.new_date}
                  onChange={(dt) => {
                    if (!dt) {
                      setRescheduleForm({ ...rescheduleForm, new_date: "", new_day: "" });
                      return;
                    }
                    const [y, m, d] = dt.split("-").map(Number);
                    const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                    setRescheduleForm({
                      ...rescheduleForm,
                      new_date: dt,
                      new_day: dayNames[new Date(y, m - 1, d).getDay()] || "Senin",
                    });
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Jam Sesi Pengganti *</label>
                <select
                  required
                  className="input text-xs"
                  value={rescheduleForm.new_time}
                  onChange={(e) => setRescheduleForm({ ...rescheduleForm, new_time: e.target.value })}
                >
                  <option value="09:00">Sesi 1 (09:00 - 10:30)</option>
                  <option value="10:30">Sesi 2 (10:30 - 12:00)</option>
                  <option value="13:00">Sesi 3 (13:00 - 14:30)</option>
                  <option value="15:00">Sesi 4 (15:00 - 16:30)</option>
                  <option value="17:00">Sesi 5 (17:00 - 18:30)</option>
                  <option value="19:00">Sesi 6 (19:00 - 20:30)</option>
                </select>
              </div>
            </div>

            {rescheduleForm.new_day && (
              <div className="text-xs font-semibold text-slate-600">
                Hari terpilih: <b className="text-brand-dark">{rescheduleForm.new_day}</b>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-slate-700">Catatan / Alasan Reschedule</label>
              <textarea
                rows={2}
                className="input text-xs"
                placeholder="mis. Pengganti kelas karena acara keluarga..."
                value={rescheduleForm.reason}
                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setRescheduleModal(null)}>
                Batal
              </button>
              <button type="submit" disabled={rescheduleSaving} className="btn-primary">
                {rescheduleSaving && <Loader2 size={15} className="animate-spin" />}
                Konfirmasi Reschedule
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Dokumentasi Foto / Video Kegiatan Kelas (Orang Tua - Laporan Belajar Harian) */}
      <Modal
        open={!!activityDocModal}
        title="Dokumentasi Foto / Video Kegiatan Kelas"
        onClose={() => setActivityDocModal(null)}
      >
        {activityDocModal && (() => {
          const mediaUrl = resolveAssetUrl(activityDocModal.activity_photo_url);
          const isVideo = /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(mediaUrl || "");
          return (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950/5">
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    controls
                    className="max-h-[420px] w-full rounded-2xl bg-black object-contain"
                  />
                ) : (
                  <img
                    src={mediaUrl}
                    alt={`Dokumentasi kelas ${activityDocModal.class_name || ""}`}
                    className="max-h-[420px] w-full object-contain"
                  />
                )}
              </div>

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-2">
                <div>
                  <span className="text-slate-400">Siswa:</span>{" "}
                  <b className="text-slate-800">{activityDocModal.student_name || "-"}</b>
                </div>
                <div>
                  <span className="text-slate-400">Tanggal:</span>{" "}
                  <b className="text-slate-800">{String(activityDocModal.report_date || "").slice(0, 10) || "-"}</b>
                </div>
                <div>
                  <span className="text-slate-400">Kelas:</span>{" "}
                  <b className="text-slate-800">{activityDocModal.class_name || "-"}</b>
                </div>
                <div>
                  <span className="text-slate-400">Sesi / Waktu:</span>{" "}
                  <b className="text-slate-800">{activityDocModal.activity_session_time || "-"}</b>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400">Materi Hari Ini:</span>{" "}
                  <b className="text-slate-800">{activityDocModal.material || "-"}</b>
                </div>
                {activityDocModal.homework && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">PR / Latihan:</span>{" "}
                    <b className="text-slate-800">{activityDocModal.homework}</b>
                  </div>
                )}
                {activityDocModal.activity_attendance_summary && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">Ringkasan Kehadiran:</span>{" "}
                    <b className="text-slate-800">{activityDocModal.activity_attendance_summary}</b>
                  </div>
                )}
                {(activityDocModal.activity_notes || activityDocModal.notes) && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400">Catatan Tutor:</span>{" "}
                    <span className="text-slate-700">{activityDocModal.activity_notes || activityDocModal.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink size={14} /> Buka File Asli
                </a>
                <button type="button" className="btn-primary !py-2 text-xs" onClick={() => setActivityDocModal(null)}>
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