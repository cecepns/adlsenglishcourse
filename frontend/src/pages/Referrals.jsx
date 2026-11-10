import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Gift, Loader2, Plus, Search, Tag, Users } from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import useResourceList from "@/hooks/useResourceList";
import AsyncResourceSelect from "@/components/AsyncResourceSelect";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const BADGE = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  applied: "bg-emerald-100 text-emerald-700",
};

export default function Referrals() {
  const { user } = useAuth();
  const isStaff = STAFF.includes(user.role);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const debounced = useDebounce(search, 300);

  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState({
    referrer_name: user.name || "",
    referred_student_name: "",
    referred_phone: "",
    branch_id: user.branch_id || null,
    branch_name: user.branch_name || "",
    commission_amount: "50000",
    notes: "",
  });

  const [applyModal, setApplyModal] = useState(null);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [saving, setSaving] = useState(false);

  const { rows, pagination, loading, error, refetch } = useResourceList(API_ENDPOINTS.REFERRALS.LIST, {
    page,
    limit,
    search: debounced,
  });

  const submitReferral = async (e) => {
    e.preventDefault();
    if (!form.referrer_name.trim() || !form.referred_student_name.trim()) {
      toast.error("Nama pengajak dan nama teman/anak yang diajak wajib diisi");
      return;
    }
    setSaving(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.REFERRALS.LIST, {
            referrer_name: form.referrer_name,
            referred_student_name: form.referred_student_name,
            referred_phone: form.referred_phone,
            branch_id: form.branch_id || null,
            ...(isStaff ? { commission_amount: Number(form.commission_amount || 50000), status: "approved" } : {}),
            notes: form.notes,
          }),
        { success: getClosingGreeting(user.role, "Data referral komisi berhasil dikirim!") }
      );
      setCreateModal(false);
      refetch();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const applyCommission = async (e) => {
    e.preventDefault();
    if (!selectedBillId) {
      toast.error("Pilih tagihan SPP tujuan terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await request(
        () => api.post(API_ENDPOINTS.REFERRAL_APPLY(applyModal.id), { bill_id: selectedBillId }),
        { success: getClosingGreeting(user.role, "Komisi referral berhasil diterapkan sebagai potongan SPP!") }
      );
      setApplyModal(null);
      setSelectedBillId(null);
      refetch();
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
          <h1 className="text-2xl font-extrabold text-slate-900">Komisi Referral (Potongan SPP)</h1>
          <p className="text-sm text-slate-500">Apresiasi komisi potongan SPP bagi orang tua & siswa yang berhasil mengajak teman/anak bergabung</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              className="input !pl-10"
              placeholder="Cari nama pengajak / siswa..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setForm({
                referrer_name: user.name || "",
                referred_student_name: "",
                referred_phone: "",
                branch_id: user.branch_id || null,
                branch_name: user.branch_name || "",
                commission_amount: "50000",
                notes: "",
              });
              setCreateModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} /> Ajukan Referral
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : loading ? (
          <div className="space-y-2.5 p-5">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-slate-400">
            <Users size={40} />
            <span>Belum ada data referral masuk</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Pengajak (Ortu/Siswa)</th>
                  <th className="px-4 py-3.5 font-bold">Teman / Anak Diajak</th>
                  <th className="px-4 py-3.5 font-bold">Cabang</th>
                  <th className="px-4 py-3.5 font-bold">Komisi Potongan</th>
                  <th className="px-4 py-3.5 font-bold">Status & Tagihan</th>
                  {isStaff && <th className="px-4 py-3.5 text-right font-bold">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-bold text-slate-900">{r.referrer_name}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{r.referred_student_name}</div>
                      <div className="text-xs text-slate-500">{r.referred_phone || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.branch_name || "-"}</td>
                    <td className="px-4 py-3 font-extrabold text-emerald-600">{rp(r.commission_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${BADGE[r.status] || "bg-slate-100 text-slate-700"}`}>
                        {r.status}
                      </span>
                      {r.applied_bill_title && (
                        <div className="mt-0.5 text-[11px] text-slate-500">Potong: {r.applied_bill_title}</div>
                      )}
                    </td>
                    {isStaff && (
                      <td className="px-4 py-3 text-right">
                        {r.status !== "applied" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setApplyModal(r);
                              setSelectedBillId(null);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <Tag size={13} /> Potong ke SPP
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={14} /> Diterapkan
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </div>

      <Modal open={createModal} title="Ajukan Komisi Referral Baru" onClose={() => setCreateModal(false)}>
        <form onSubmit={submitReferral} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Nama Pengajak (Orang Tua / Siswa) *</label>
            <input required className="input" value={form.referrer_name} onChange={(e) => setForm({ ...form, referrer_name: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nama Teman / Calon Siswa *</label>
              <input required className="input" value={form.referred_student_name} onChange={(e) => setForm({ ...form, referred_student_name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">No. WhatsApp Calon Siswa</label>
              <input className="input" placeholder="08..." value={form.referred_phone} onChange={(e) => setForm({ ...form, referred_phone: e.target.value })} />
            </div>
          </div>
          {isStaff && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nominal Komisi (Rp)</label>
              <input type="number" className="input" value={form.commission_amount} onChange={(e) => setForm({ ...form, commission_amount: e.target.value })} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Cabang Pendaftaran</label>
            <AsyncResourceSelect
              endpoint={API_ENDPOINTS.PUBLIC_BRANCHES}
              value={form.branch_id}
              initialLabel={form.branch_name}
              isClearable
              onChange={(opt) => setForm({ ...form, branch_id: opt ? opt.value : null, branch_name: opt ? opt.label : "" })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Catatan</label>
            <input className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setCreateModal(false)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Kirim Referral
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!applyModal} title={`Terapkan Potongan SPP: ${applyModal?.referrer_name || ""}`} onClose={() => setApplyModal(null)}>
        {applyModal && (
          <form onSubmit={applyCommission} className="space-y-3.5">
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <div className="flex items-center gap-1.5 font-extrabold">
                <Gift size={14} /> Nilai Komisi: {rp(applyModal.commission_amount)}
              </div>
              <p className="mt-1">Pilih tagihan SPP yang akan dikurangi oleh komisi referral untuk mengajak <b>{applyModal.referred_student_name}</b>.</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Pilih Tagihan SPP Tujuan *</label>
              <AsyncResourceSelect
                endpoint={API_ENDPOINTS.BILLS.LIST}
                value={selectedBillId}
                placeholder="Cari siswa / judul tagihan belum lunas..."
                formatOption={(b) => ({
                  value: b.id,
                  label: `[${b.status}] ${b.student_name || `Siswa #${b.student_id}`} · ${b.title} (${rp(b.amount)})`,
                  raw: b,
                })}
                onChange={(opt) => setSelectedBillId(opt ? opt.value : null)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setApplyModal(null)}>Batal</button>
              <button className="btn-primary" disabled={saving}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                Terapkan Potongan SPP
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
