import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Select from "react-select";
import {
  Award,
  CalendarCheck,
  CalendarOff,
  ChevronRight,
  Clock,
  GraduationCap,
  MessageSquareWarning,
  Receipt,
  RefreshCw,
  School,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getOpeningGreeting } from "@/utils/greetings";
import { useAuth } from "@/context/AuthContext";
import { DonutChart, GroupedBarChart, HorizontalBars, LineAreaChart } from "@/components/Charts";

const MN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtMonth = (ym) => {
  const [y, m] = String(ym || "").split("-");
  return m ? `${MN[+m - 1] || m} ${y.slice(2)}` : ym;
};
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const shortRp = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}jt` : n >= 1e3 ? `${Math.round(n / 1e3)}rb` : `${n}`);

const ICON_BG = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-600",
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  orange: "bg-orange-50 text-orange-600",
  purple: "bg-purple-50 text-purple-600",
};

function KpiCard({ icon: Icon, label, value, sub, color = "blue" }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${ICON_BG[color] || ICON_BG.blue}`}>
          <Icon size={17} />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-extrabold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, right, children }) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(() => {
    setLoading(true);
    api
      .get(API_ENDPOINTS.STATS, { params: branchId ? { branch_id: branchId } : {} })
      .then((r) => setStats(r.data.data))
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [branchId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const isOwner = user.role === "owner";
  const isHQ = ["owner", "admin_pusat"].includes(user.role);
  const branchOptions = [
    { value: "", label: "Semua Cabang" },
    ...(stats?.branchOptions || []).map((b) => ({ value: String(b.id), label: b.name })),
  ];

  const att = stats?.attendanceBreakdown || { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
  const stuMonths = stats?.studentsByMonth || [];
  const billMonths = stats?.billsByMonth || [];
  const branchStats = stats?.studentsByBranch || [];
  const classSummary = stats?.classSummary || [];
  const topTutors = stats?.topTutors || [];
  const topExpenses = stats?.topExpenses || [];

  const todos = [];
  if (stats?.pendingLeaves > 0) {
    todos.push({ to: "/leaves", color: "text-amber-600", label: `${stats.pendingLeaves} pengajuan izin/cuti menunggu persetujuan` });
  }
  if (stats?.verifikasiBills > 0) {
    todos.push({ to: "/bills", color: "text-sky-600", label: `${stats.verifikasiBills} bukti pembayaran SPP menunggu verifikasi admin` });
  }
  if (stats?.unpaidBills > 0) {
    todos.push({
      to: "/bills",
      color: "text-rose-600",
      label: isOwner
        ? `${stats.unpaidBills} tagihan SPP berstatus belum lunas`
        : `${stats.unpaidBills} tagihan SPP belum lunas (${rp(stats.unpaidAmount)})`,
    });
  }
  if (isHQ && stats?.openComplaints > 0) {
    todos.push({ to: "/complaints", color: "text-indigo-600", label: `${stats.openComplaints} komplen berstatus open perlu ditindak` });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Halo, {user.name}</h1>
          <p className="mt-0.5 text-sm font-medium text-slate-600">
            {getOpeningGreeting(user)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {isHQ && stats?.branchOptions?.length > 0 && (
            <div className="w-52">
              <Select
                options={branchOptions}
                value={branchOptions.find((o) => o.value === branchId) || branchOptions[0]}
                onChange={(opt) => setBranchId(opt?.value || "")}
                isSearchable
                styles={{
                  control: (base) => ({ ...base, borderRadius: "0.75rem", borderColor: "#cbd5e1", fontSize: "0.875rem", minHeight: 40 }),
                  menu: (base) => ({ ...base, zIndex: 30, borderRadius: "0.75rem" }),
                }}
              />
            </div>
          )}
          <button onClick={loadStats} className="btn-ghost !py-2" disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          icon={GraduationCap}
          label="Siswa Aktif"
          value={stats ? stats.students ?? 0 : "…"}
          sub={stats ? `${stats.totalStudents ?? 0} total · ${stats.inactiveStudents ?? 0} nonaktif` : ""}
          color="blue"
        />
        {!isOwner && (
          <KpiCard
            icon={Wallet}
            label="Pemasukan SPP"
            value={stats ? rp(stats.paidAmount) : "…"}
            sub={stats ? `${stats.paidBills ?? 0} tagihan terbayar` : ""}
            color="emerald"
          />
        )}
        {!isOwner && (
          <KpiCard
            icon={Receipt}
            label="Tagihan Belum Lunas"
            value={stats ? rp(stats.unpaidAmount) : "…"}
            sub={stats ? `${stats.unpaidBills ?? 0} tagihan · ${stats.overdueBills ?? 0} menunggak` : ""}
            color="rose"
          />
        )}
        <KpiCard
          icon={CalendarCheck}
          label="Kehadiran Siswa"
          value={stats ? `${stats.attendanceRate ?? 0}%` : "…"}
          sub={stats ? `dari ${stats.attendanceTotal ?? 0} catatan absensi` : ""}
          color="sky"
        />
        <KpiCard
          icon={Clock}
          label="Kehadiran Tutor"
          value={stats ? `${stats.tutorAttendanceRate ?? 0}%` : "…"}
          sub={stats ? `${stats.tutorAttendanceTotal ?? 0} sesi · ${stats.tutorLateCount ?? 0} telat` : ""}
          color="emerald"
        />
        <KpiCard
          icon={School}
          label="Kelas Aktif"
          value={stats ? stats.classes ?? 0 : "…"}
          sub={stats ? `${stats.offlineClasses ?? 0} offline · ${stats.onlineClasses ?? 0} online` : ""}
          color="indigo"
        />
        <KpiCard
          icon={Users}
          label="Tutor & Cabang"
          value={stats ? stats.tutors ?? 0 : "…"}
          sub={stats ? `${stats.branches ?? 0} cabang aktif` : ""}
          color="amber"
        />
        <KpiCard
          icon={TrendingDown}
          label="Total Pengeluaran"
          value={stats ? rp(stats.totalExpenses) : "…"}
          sub={stats ? `Top ${topExpenses.length} kategori pengeluaran` : ""}
          color="rose"
        />
        {isOwner && (
          <KpiCard
            icon={CalendarOff}
            label="Izin/Cuti Menunggu"
            value={stats ? stats.pendingLeaves ?? 0 : "…"}
            sub="Menunggu persetujuan pusat"
            color="orange"
          />
        )}
        {isOwner && (
          <KpiCard
            icon={MessageSquareWarning}
            label="Komplen Terbuka"
            value={stats ? stats.openComplaints ?? 0 : "…"}
            sub={`${stats?.products ?? 0} item di katalog`}
            color="purple"
          />
        )}
      </div>

      {todos.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-slate-600">Perlu Tindakan</h3>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {todos.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-brand hover:bg-brand-50/40"
              >
                <span className={t.color}>{t.label}</span>
                <ChevronRight size={16} className="shrink-0 text-slate-400" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Grafik Pertumbuhan Siswa (6 Bulan)" subtitle="Total siswa kumulatif & pendaftaran baru">
          <LineAreaChart
            labels={stuMonths.map((m) => fmtMonth(m.month))}
            series={[
              { name: "Total Siswa", color: "#2a5885", data: stuMonths.map((m) => m.total) },
              { name: "Siswa Baru", color: "#16a34a", data: stuMonths.map((m) => m.added) },
            ]}
          />
        </ChartCard>

        {!isOwner ? (
          <ChartCard title="Pemasukan SPP per Bulan" subtitle="Perbandingan tagihan terbayar vs belum lunas">
            <GroupedBarChart
              labels={billMonths.map((m) => fmtMonth(m.month))}
              formatValue={shortRp}
              series={[
                { name: "Terbayar", color: "#16a34a", data: billMonths.map((m) => m.paid) },
                { name: "Belum Lunas", color: "#f59e0b", data: billMonths.map((m) => m.unpaid) },
              ]}
            />
          </ChartCard>
        ) : (
          <ChartCard
            title="Total Top 4 Expenses ADLS"
            subtitle={`Total keseluruhan pengeluaran: ${rp(stats?.totalExpenses)}`}
            right={
              <Link to="/expenses" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                Kelola Pengeluaran <ChevronRight size={14} />
              </Link>
            }
          >
            <HorizontalBars
              items={topExpenses.map((e, idx) => ({
                label: e.category,
                value: e.total,
                sub: `${e.items} transaksi`,
                color: ["#e11d48", "#f59e0b", "#2a5885", "#6366f1"][idx % 4],
              }))}
              formatValue={rp}
              emptyText="Belum ada data pengeluaran"
            />
          </ChartCard>
        )}

        <ChartCard title="Siswa Aktif per Cabang" subtitle="Distribusi jumlah siswa di tiap cabang">
          <HorizontalBars
            items={branchStats.map((b) => ({
              label: b.city ? `${b.name} (${b.city})` : b.name,
              value: b.count,
              color: "#2a5885",
            }))}
            formatValue={(v) => `${v} siswa`}
            emptyText="Belum ada data cabang"
          />
        </ChartCard>

        <ChartCard title="Rekap Kehadiran Siswa" subtitle="Distribusi status absensi seluruh sesi">
          <DonutChart
            centerValue={`${stats?.attendanceRate ?? 0}%`}
            centerLabel="Tingkat Hadir"
            segments={[
              { label: "Hadir", value: att.hadir, color: "#16a34a" },
              { label: "Izin", value: att.izin, color: "#f59e0b" },
              { label: "Sakit", value: att.sakit, color: "#0ea5e9" },
              { label: "Alpha", value: att.alpha, color: "#ef4444" },
            ]}
          />
        </ChartCard>

        {!isOwner && (
          <ChartCard
            title="Total Top 4 Expenses ADLS"
            subtitle={`Total keseluruhan pengeluaran: ${rp(stats?.totalExpenses)}`}
            right={
              <Link to="/expenses" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
                Kelola Pengeluaran <ChevronRight size={14} />
              </Link>
            }
          >
            <HorizontalBars
              items={topExpenses.map((e, idx) => ({
                label: e.category,
                value: e.total,
                sub: `${e.items} transaksi`,
                color: ["#e11d48", "#f59e0b", "#2a5885", "#6366f1"][idx % 4],
              }))}
              formatValue={rp}
              emptyText="Belum ada data pengeluaran"
            />
          </ChartCard>
        )}

        <ChartCard
          title="Tutor Berprestasi"
          subtitle="Berdasarkan tingkat ketepatan waktu mengajar & sesi absensi"
          right={
            <Link to="/tutor_attendance" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
              Absensi Tutor <ChevronRight size={14} />
            </Link>
          }
        >
          {topTutors.length ? (
            <div className="space-y-2.5">
              {topTutors.map((t, idx) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-extrabold ${idx === 0 ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand"}`}>
                      {idx === 0 ? <Award size={16} /> : `#${idx + 1}`}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-800">{t.name}</div>
                      <div className="text-xs text-slate-500">
                        {t.branch_name} · {t.classes_count} kelas · {t.on_time_sessions}/{t.total_sessions} tepat waktu
                      </div>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.on_time_rate >= 85 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                    {t.on_time_rate}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">Belum ada data tutor aktif</div>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Ringkasan Kelas"
        subtitle="Daftar kelas teratas beserta jumlah siswa aktif"
        right={
          <Link to="/classes" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
            Lihat Semua <ChevronRight size={14} />
          </Link>
        }
      >
        {classSummary.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">Kelas</th>
                  <th className="px-4 py-3 font-bold">Level</th>
                  <th className="px-4 py-3 font-bold">Cabang</th>
                  <th className="px-4 py-3 font-bold">Jadwal</th>
                  <th className="px-4 py-3 font-bold">Tipe</th>
                  <th className="px-4 py-3 text-right font-bold">Siswa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classSummary.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-600">{c.level || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.branch_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{c.schedule || "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${c.type === "online" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"}`}>
                        {c.type || "offline"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-dark">{c.student_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">Belum ada kelas terdaftar</div>
        )}
      </ChartCard>
    </div>
  );
}
