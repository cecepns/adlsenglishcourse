import { useEffect, useState } from "react";
import Select from "react-select";
import { Banknote, CheckCircle2, Loader2, RefreshCw, Settings2, Wallet } from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import Modal from "@/components/Modal";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const HQ = ["owner", "admin_pusat"];
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function Payroll() {
  const { user } = useAuth();
  const isStaff = STAFF.includes(user.role);
  const isHQ = HQ.includes(user.role);

  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [rows, setRows] = useState([]);
  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  const [ruleModal, setRuleModal] = useState(false);
  const [ruleForm, setRuleForm] = useState({ base_rate: 100000, transport_allowance: 15000, late_penalty: 10000, ontime_bonus: 150000 });
  const [savingRule, setSavingRule] = useState(false);

  useEffect(() => {
    if (!isHQ) return;
    api
      .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
      .then((r) => setBranches(r.data.data || []))
      .catch(() => {});
  }, [isHQ]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.PAYROLL, {
        params: { month, branch_id: branchId || undefined },
      });
      setRows(data.data || []);
      if (data.rule) {
        setRule(data.rule);
        setRuleForm(data.rule);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, branchId]);

  const payTutor = async (row) => {
    setPayingId(row.tutor_id);
    try {
      await request(() => api.post(API_ENDPOINTS.PAYROLL_PAY, row), {
        success: getClosingGreeting(user.role, `Honor tutor ${row.tutor_name} berhasil dibayarkan!`),
      });
      load();
    } catch {
      /* toast handled */
    } finally {
      setPayingId(null);
    }
  };

  const saveRules = async (e) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      await request(() => api.put(API_ENDPOINTS.PAYROLL_RULES, ruleForm), {
        success: getClosingGreeting(user.role, "Aturan perhitungan gaji tutor diperbarui."),
      });
      setRuleModal(false);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSavingRule(false);
    }
  };

  const totalPayroll = rows.reduce((s, r) => s + Number(r.total_amount || 0), 0);
  const paidCount = rows.filter((r) => r.payment_status === "paid").length;

  const branchOptions = [
    { value: "", label: "Semua Cabang" },
    ...branches.map((b) => ({ value: String(b.id), label: b.city ? `${b.name} (${b.city})` : b.name })),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Payroll Honor Tutor</h1>
          <p className="text-sm text-slate-500">Perhitungan otomatis berdasarkan sesi hadir, tunjangan transport, potongan telat, dan bonus tepat waktu</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" className="input !w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
          {isHQ && branches.length > 0 && (
            <div className="w-48">
              <Select
                options={branchOptions}
                value={branchOptions.find((o) => o.value === branchId) || branchOptions[0]}
                onChange={(opt) => setBranchId(opt?.value || "")}
                styles={{
                  control: (base) => ({ ...base, borderRadius: "0.75rem", borderColor: "#cbd5e1", fontSize: "0.875rem", minHeight: 42 }),
                  menu: (base) => ({ ...base, zIndex: 30, borderRadius: "0.75rem" }),
                }}
              />
            </div>
          )}
          {isHQ && (
            <button type="button" onClick={() => setRuleModal(true)} className="btn-ghost">
              <Settings2 size={16} /> Aturan Gaji
            </button>
          )}
          <button type="button" onClick={load} className="btn-ghost !py-2.5" aria-label="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <div className="text-xs font-bold uppercase text-slate-400">Tutor Periode {month}</div>
          <div className="mt-1.5 text-2xl font-extrabold text-slate-900">{rows.length} Tutor</div>
          <div className="text-xs text-slate-500">{paidCount} sudah dibayar · {rows.length - paidCount} belum dibayar</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase text-slate-400">Total Estimasi Payroll</div>
          <div className="mt-1.5 text-2xl font-extrabold text-brand-dark">{rp(totalPayroll)}</div>
          <div className="text-xs text-slate-500">Akumulasi honor bulan berjalan</div>
        </div>
        <div className="card p-4">
          <div className="text-xs font-bold uppercase text-slate-400">Formula Aktif</div>
          <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
            <div>Honor dasar: <b>{rp(rule?.base_rate)}</b>/sesi · Transport: <b>{rp(rule?.transport_allowance)}</b></div>
            <div>Potongan telat: <b>-{rp(rule?.late_penalty)}</b> · Bonus 0 telat: <b>+{rp(rule?.ontime_bonus)}</b></div>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2.5 p-5">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-slate-400">
            <Wallet size={40} />
            <span>Belum ada data tutor aktif</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Tutor & Cabang</th>
                  <th className="px-4 py-3.5 font-bold">Kehadiran</th>
                  <th className="px-4 py-3.5 font-bold">Honor + Transport</th>
                  <th className="px-4 py-3.5 font-bold">Potongan / Bonus</th>
                  <th className="px-4 py-3.5 font-bold">Total Terima</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  {isStaff && <th className="px-4 py-3.5 text-right font-bold">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.tutor_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{r.tutor_name}</div>
                      <div className="text-xs text-slate-500">{r.branch_name} · Tarif {rp(r.rate)}/sesi</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div><b>{r.sessions_count}</b> sesi hadir ({r.ontime_count} tepat waktu)</div>
                      <div className="text-slate-400">{r.late_count} terlambat · {r.absent_count} izin/cuti</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-semibold text-slate-800">{rp(r.base_pay)}</div>
                      <div className="text-slate-500">Transport +{rp(r.transport_pay)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="text-rose-600">Telat: -{rp(r.penalty_amount)}</div>
                      <div className="text-emerald-600">Bonus: +{rp(r.bonus_amount)}</div>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-brand-dark">{rp(r.total_amount)}</td>
                    <td className="px-4 py-3">
                      {r.payment_status === "paid" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 size={12} /> Paid ({String(r.paid_at || "").slice(0, 10)})
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">Belum Dibayar</span>
                      )}
                    </td>
                    {isStaff && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={r.payment_status === "paid" || payingId === r.tutor_id}
                          onClick={() => payTutor(r)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            r.payment_status === "paid"
                              ? "cursor-not-allowed bg-slate-100 text-slate-400"
                              : "bg-brand text-white hover:bg-brand-dark"
                          }`}
                        >
                          <Banknote size={14} /> {r.payment_status === "paid" ? "Lunas" : "Bayar Honor"}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={ruleModal} title="Aturan Perhitungan Payroll Tutor" onClose={() => setRuleModal(false)}>
        <form onSubmit={saveRules} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Honor Dasar Default / Sesi (Rp)</label>
            <input type="number" required className="input" value={ruleForm.base_rate} onChange={(e) => setRuleForm({ ...ruleForm, base_rate: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Tunjangan Transport / Sesi (Rp)</label>
            <input type="number" required className="input" value={ruleForm.transport_allowance} onChange={(e) => setRuleForm({ ...ruleForm, transport_allowance: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Potongan Keterlambatan / Kejadian (Rp)</label>
            <input type="number" required className="input" value={ruleForm.late_penalty} onChange={(e) => setRuleForm({ ...ruleForm, late_penalty: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Bonus Disiplin (0 Telat & 0 Absen / Bulan) (Rp)</label>
            <input type="number" required className="input" value={ruleForm.ontime_bonus} onChange={(e) => setRuleForm({ ...ruleForm, ontime_bonus: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setRuleModal(false)}>Batal</button>
            <button className="btn-primary" disabled={savingRule}>
              {savingRule && <Loader2 size={15} className="animate-spin" />}
              Simpan Aturan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

