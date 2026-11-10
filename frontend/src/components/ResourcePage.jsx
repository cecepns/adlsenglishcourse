import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { Plus, Search, Sparkles } from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting, getOpeningGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import useResourceList from "@/hooks/useResourceList";
import DataTable from "./DataTable";
import Modal from "./Modal";
import Pagination from "./Pagination";
import ResourceForm from "./ResourceForm";

export default function ResourcePage({ resource: cfg }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [modal, setModal] = useState(null); // { row? }
  const [saving, setSaving] = useState(false);

  const isHQ = ["owner", "admin_pusat"].includes(user.role);
  const showBranchFilter = Boolean(cfg.branchFilter && isHQ);

  useEffect(() => {
    if (!showBranchFilter) return;
    api
      .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
      .then((r) => setBranches(r.data.data || []))
      .catch(() => setBranches([]));
  }, [showBranchFilter]);

  const debounced = useDebounce(search, 300);
  const queryParams = { page, limit, search: debounced, ...(showBranchFilter && branchId ? { branch_id: branchId } : {}) };
  const { rows, pagination, loading, error, refetch } = useResourceList(cfg.endpoint.LIST, queryParams);

  const canCreate = cfg.c.includes(user.role);
  const canEdit = cfg.u.includes(user.role);
  const isApprover = isHQ;
  const rawFields = cfg.getFields ? cfg.getFields(user, modal?.row) : cfg.fields;
  const fields = rawFields.filter((f) => !f.approveOnly || (isApprover && modal?.row));

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

  const remove = (row) =>
    toast(
      (t) => (
        <div className="text-sm">
          <p className="mb-2 font-medium">Hapus data ini?</p>
          <div className="flex gap-2">
            <button
              className="btn-primary !bg-red-600 !px-3 !py-1"
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
      {user.role === "tutor" && cfg.endpoint.LIST === API_ENDPOINTS.TUTOR_ATTENDANCE.LIST && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-light/40 bg-gradient-to-r from-brand-50 to-white px-5 py-3.5 shadow-sm">
          <Sparkles size={20} className="shrink-0 text-brand" />
          <p className="text-sm font-semibold text-brand-dark">{getOpeningGreeting(user)}</p>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">{cfg.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {showBranchFilter && branches.length > 0 && (
            <div className="w-48">
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
          <div className="relative flex-1 sm:w-64">
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
          {canCreate && (
            <button className="btn-primary" onClick={() => setModal({})}>
              <Plus size={16} />
              Tambah
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={cfg.columns} rows={rows} loading={loading} error={error} canEdit={canEdit} onEdit={(row) => setModal({ row })} onDelete={remove} onRetry={refetch} />
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
    </div>
  );
}
