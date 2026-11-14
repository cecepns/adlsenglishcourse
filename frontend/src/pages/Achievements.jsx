import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import { Award, Gift, RefreshCw, Search, Trophy } from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

export default function Achievements() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [claimingId, setClaimingId] = useState(null);
  const [classFilter, setClassFilter] = useState("");
  const [sortBy, setSortBy] = useState("uas"); // "uas" | "formatif" | "name"
  const debounced = useDebounce(search, 300);

  const isHQ = ["owner", "admin_pusat"].includes(user.role);
  const isStaff = STAFF.includes(user.role);

  useEffect(() => {
    if (!isHQ) return;
    api
      .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
      .then((r) => setBranches(r.data.data || []))
      .catch(() => setBranches([]));
  }, [isHQ]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.ACHIEVEMENTS, {
        params: { search: debounced || undefined, branch_id: branchId || undefined },
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
  }, [debounced, branchId]);

  const classOptions = Array.from(new Set(rows.map((r) => r.class_name).filter(Boolean))).sort();

  const filteredRows = rows
    .filter((r) => {
      if (classFilter && r.class_name !== classFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name") return (a.student_name || "").localeCompare(b.student_name || "");
      if (sortBy === "formatif") return (b.formatif_100_count || 0) - (a.formatif_100_count || 0);
      return (b.uas_100_count || 0) - (a.uas_100_count || 0);
    });

  const claimFreeSpp = async (row) => {
    toast(
      (t) => (
        <div className="text-sm">
          <p className="mb-2 font-semibold">Klaim reward Gratis 1x SPP untuk {row.student_name}?</p>
          <div className="flex gap-2">
            <button
              className="btn-primary !px-3 !py-1"
              onClick={async () => {
                toast.dismiss(t.id);
                setClaimingId(row.student_id);
                try {
                  await request(
                    () => api.post(API_ENDPOINTS.ACHIEVEMENTS_CLAIM, { student_id: row.student_id }),
                    { success: getClosingGreeting(user.role, `Gratis 1x SPP untuk ${row.student_name} berhasil diklaim!`) }
                  );
                  load();
                } catch {
                  /* toast handled */
                } finally {
                  setClaimingId(null);
                }
              }}
            >
              Ya, Klaim
            </button>
            <button className="btn-ghost !px-3 !py-1" onClick={() => toast.dismiss(t.id)}>Batal</button>
          </div>
        </div>
      ),
      { duration: Infinity }
    );
  };

  const branchOptions = [
    { value: "", label: "Semua Cabang" },
    ...branches.map((b) => ({ value: String(b.id), label: b.city ? `${b.name} (${b.city})` : b.name })),
  ];

  const topAchievers = rows.filter((r) => r.uas_100_count > 0).slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Prestasi Murid Nilai 100</h1>
          <p className="text-sm text-slate-500">Pelacakan nilai sempurna — capai 20x nilai UAS 100 untuk mendapatkan Reward Gratis 1x SPP</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isHQ && branches.length > 0 && (
            <div className="w-44">
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

          {classOptions.length > 0 && (
            <select
              className="input !w-auto text-xs font-semibold"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="">Semua Kelas ({rows.length})</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas: {cls}
                </option>
              ))}
            </select>
          )}

          <select
            className="input !w-auto text-xs font-semibold"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="uas">Urut: UAS 100 Terbanyak</option>
            <option value="formatif">Urut: Formatif 100</option>
            <option value="name">Urut: Nama Siswa (A-Z)</option>
          </select>

          <div className="relative w-52">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              className="input !pl-10"
              placeholder="Cari nama siswa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={load} className="btn-ghost !py-2.5" aria-label="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {topAchievers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {topAchievers.map((s, idx) => (
            <div key={s.student_id} className="card border-amber-200 bg-gradient-to-br from-amber-50/60 to-white p-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                  <Trophy size={13} /> Peringkat #{idx + 1}
                </span>
                <span className="text-xs font-bold text-brand">{s.uas_100_count}x UAS 100</span>
              </div>
              <div className="mt-2.5 text-base font-extrabold text-slate-900">{s.student_name}</div>
              <div className="text-xs text-slate-500">{s.class_name} · {s.branch_name}</div>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2.5 p-5">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : filteredRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-slate-400">
            <Award size={40} />
            <span>Tidak ada data siswa yang cocok dengan filter</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Siswa</th>
                  <th className="px-4 py-3.5 font-bold">Kelas / Cabang</th>
                  <th className="px-4 py-3.5 font-bold">Formatif 100</th>
                  <th className="px-4 py-3.5 font-bold">UAS (Sumatif) 100</th>
                  <th className="px-4 py-3.5 font-bold">Progres Free 1x SPP (20x)</th>
                  <th className="px-4 py-3.5 font-bold">Hak Reward</th>
                  {isStaff && <th className="px-4 py-3.5 text-right font-bold">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r) => {
                  const pct = Math.min(100, Math.round(((r.available_free_spp > 0 ? 20 : r.progress_to_next) / 20) * 100));
                  return (
                    <tr key={r.student_id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.student_name}</div>
                        <div className="text-xs text-slate-500">{r.level}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div>{r.class_name}</div>
                        <div className="text-slate-400">{r.branch_name}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{r.formatif_100_count}x</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">
                          {r.uas_100_count}x Nilai 100
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-40">
                          <div className="mb-1 flex justify-between text-[11px] font-bold text-slate-600">
                            <span>{r.available_free_spp > 0 ? "20 / 20 Siap Klaim!" : `${r.progress_to_next} / 20`}</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${r.available_free_spp > 0 ? "bg-emerald-500" : "bg-gradient-to-r from-brand-dark via-brand to-sky-700"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.available_free_spp > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-bold text-emerald-700">
                            Tersedia {r.available_free_spp}x Free SPP
                          </span>
                        ) : (
                          <span className="text-slate-500">Diklaim: {r.claimed_free_spp}x</span>
                        )}
                      </td>
                      {isStaff && (
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={r.available_free_spp <= 0 || claimingId === r.student_id}
                            onClick={() => claimFreeSpp(r)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                              r.available_free_spp > 0
                                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                : "cursor-not-allowed bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Gift size={14} /> Klaim Free SPP
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

