import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import Select from "react-select";
import { ArrowRight, CalendarPlus, Check, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting, getOpeningGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import useResourceList from "@/hooks/useResourceList";
import AsyncResourceSelect from "./AsyncResourceSelect";
import DataTable from "./DataTable";
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

  const isHQ = ["owner", "admin_pusat"].includes(user.role);
  const isStaff = STAFF.includes(user.role);
  const showBranchFilter = Boolean(cfg.branchFilter && isHQ);

  useEffect(() => {
    if (!showBranchFilter) return;
    api
      .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
      .then((r) => setBranches(r.data.data || []))
      .catch(() => setBranches([]));
  }, [showBranchFilter]);

  const debounced = useDebounce(search, 300);
  const queryParams = {
    page,
    limit,
    search: debounced,
    ...(showBranchFilter && branchId ? { branch_id: branchId } : {}),
    ...(cfg.userSortFilters && roleFilter ? { role: roleFilter } : {}),
    ...(cfg.userSortFilters && statusFilter ? { status: statusFilter } : {}),
    ...(sortKey ? { sort: sortKey, order: sortOrder } : {}),
  };
  const { rows, pagination, loading, error, refetch } = useResourceList(cfg.endpoint.LIST, queryParams);

  const canCreate = cfg.c.includes(user.role);
  const canEdit = cfg.u.includes(user.role);
  const isApprover = cfg.staffApproves ? isStaff : isHQ;
  const rawFields = cfg.getFields ? cfg.getFields(user, modal?.row) : cfg.fields;
  const fields = rawFields.filter((f) => !f.approveOnly || (isApprover && modal?.row));
  const columns = cfg.getColumns ? cfg.getColumns(user) : cfg.columns;

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
    <div>
      {user.role === "tutor" && cfg.tutorClockNotice && (
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:flex-row sm:items-center">
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

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">{cfg.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {showBranchFilter && branches.length > 0 && (
            <div className="w-44">
              <Select
                options={branchOptions}
                value={branchOptions.find((o) => o.value === branchId) || branchOptions[0]}
                onChange={(opt) => {
                  setBranchId(opt?.value || "");
                  setPage(1);
                }}
                styles={{
                  control: (base) => ({ ...base, borderRadius: "0.75rem", borderColor: "#cbd5e1", fontSize: "0.875rem", minHeight: 42 }),
                  menu: (base) => ({ ...base, zIndex: 30, borderRadius: "0.75rem" }),
                }}
              />
            </div>
          )}

          {cfg.userSortFilters && (
            <>
              <select
                className="input !w-auto min-w-[140px]"
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
                className="input !w-auto min-w-[130px]"
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
                className="input !w-auto min-w-[160px]"
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
                <option value="status:asc">Sortir Status (Active dulu)</option>
                <option value="status:desc">Sortir Status (Inactive dulu)</option>
                <option value="name:asc">Sortir Nama (A-Z)</option>
              </select>
            </>
          )}

          <div className="relative flex-1 sm:w-56">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              className="input !pl-10"
              placeholder="Cari..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          {cfg.initClassAction && isStaff && (
            <button type="button" className="btn-ghost" onClick={() => setInitModal(true)}>
              <CalendarPlus size={16} /> Siapkan Kolom Nilai Kelas
            </button>
          )}

          {canCreate && (
            <button className="btn-primary" onClick={() => setModal({})}>
              <Plus size={16} />
              Tambah
            </button>
          )}
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
              : undefined
          }
          onEdit={(row) => setModal({ row })}
          onDelete={remove}
          onRetry={refetch}
        />
        <Pagination pagination={pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </div>

      <Modal open={!!modal} title={`${modal?.row ? "Edit" : "Tambah"} ${cfg.title}`} onClose={() => setModal(null)}>
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bulan (YYYY-MM) *</label>
              <input type="month" required className="input" value={initForm.report_month} onChange={(e) => setInitForm({ ...initForm, report_month: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Tanggal Laporan *</label>
              <input type="date" required className="input" value={initForm.report_date} onChange={(e) => setInitForm({ ...initForm, report_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Materi Default (opsional)</label>
            <input className="input" placeholder="Kosongkan jika ingin diisi langsung oleh Tutor" value={initForm.material} onChange={(e) => setInitForm({ ...initForm, material: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">PR Anak Default (opsional)</label>
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
    </div>
  );
}