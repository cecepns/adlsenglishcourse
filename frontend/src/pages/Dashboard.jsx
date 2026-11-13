import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Select from "react-select";
import {
  Award,
  CalendarCheck,
  CalendarClock,
  CalendarOff,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  GraduationCap,
  HelpCircle,
  MessageSquareWarning,
  Receipt,
  RefreshCw,
  School,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  Wallet,
  XCircle,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getOpeningGreeting } from "@/utils/greetings";
import { useAuth } from "@/context/AuthContext";
import { DonutChart, GroupedBarChart, HorizontalBars, LineAreaChart } from "@/components/Charts";
import Modal from "@/components/Modal";

const MN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const fmtMonth = (ym) => {
  const [y, m] = String(ym || "").split("-");
  return m ? `${MN[+m - 1] || m} ${y.slice(2)}` : ym;
};
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const shortRp = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}jt` : n >= 1e3 ? `${Math.round(n / 1e3)}rb` : `${n}`);

const BRANCH_PALETTE = [
  "#2a5885", // ADLS Blue
  "#059669", // Emerald
  "#d97706", // Amber
  "#7c3aed", // Purple
  "#db2777", // Pink
  "#0891b2", // Cyan
  "#ea580c", // Orange
  "#4f46e5", // Indigo
];

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
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  });
  const [loading, setLoading] = useState(true);

  // Ketersediaan Tutor state
  const [tutorAvail, setTutorAvail] = useState([]);
  const [loadingTutorAvail, setLoadingTutorAvail] = useState(false);
  const [availModalTutor, setAvailModalTutor] = useState(null);

  // Grafik Pertumbuhan state
  const [growthView, setGrowthView] = useState("monthly"); // "weekly" | "monthly"
  const [growthMetric, setGrowthMetric] = useState("active"); // "active" | "new" | "out"

  const isOwner = user.role === "owner";
  const isHQ = ["owner", "admin_pusat"].includes(user.role);

  const loadStats = useCallback(() => {
    setLoading(true);
    const params = {};
    if (branchId) params.branch_id = branchId;
    if (selectedMonth) params.month = selectedMonth;

    api
      .get(API_ENDPOINTS.STATS, { params })
      .then((r) => setStats(r.data.data))
      .catch(() => setStats({}))
      .finally(() => setLoading(false));
  }, [branchId, selectedMonth]);

  const loadTutorAvail = useCallback(() => {
    setLoadingTutorAvail(true);
    api
      .get(API_ENDPOINTS.TUTORS_AVAILABILITY, { params: branchId ? { branch_id: branchId } : {} })
      .then((r) => setTutorAvail(r.data.data?.tutors || []))
      .catch(() => setTutorAvail([]))
      .finally(() => setLoadingTutorAvail(false));
  }, [branchId]);

  useEffect(() => {
    loadStats();
    loadTutorAvail();
  }, [loadStats, loadTutorAvail]);

  const branchOptions = [
    { value: "", label: "Semua Cabang" },
    ...(stats?.branchOptions || []).map((b) => ({ value: String(b.id), label: b.name })),
  ];

  const att = stats?.attendanceBreakdown || { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
  const billMonths = stats?.billsByMonth || [];
  const topTutors = stats?.topTutors || [];
  const topExpenses = stats?.topExpenses || [];
  const paidStudents = stats?.paidStudents || {};
  const paidCashCount = Number(paidStudents.cashCount || 0);
  const paidCashAmount = Number(paidStudents.cashAmount || 0);
  const paidTransferCount = Number(paidStudents.transferCount || 0);
  const paidTransferAmount = Number(paidStudents.transferAmount || 0);
  const paidTotalCount =
    Number(paidStudents.totalCount ?? paidStudents.total ?? (paidCashCount + paidTransferCount));
  const paidTotalAmount =
    Number(paidStudents.totalAmount ?? (paidCashAmount + paidTransferAmount));

  const unpaidStudents = stats?.unpaidStudents || {};
  const unpaidCount = Number(unpaidStudents.count ?? unpaidStudents.total ?? 0);
  const unpaidAmount = Number(unpaidStudents.amount ?? 0);

  const branchPaidUnpaid = stats?.branchPaidUnpaid || [];
  const marketingSources = stats?.marketingSources || [];
  const stopReasons = stats?.stopReasons || [];
  const branchGrowth = stats?.branchGrowth || { weekly: [], monthly: [] };

  const todos = [];
  if (isHQ && stats?.pendingLeaves > 0) {
    todos.push({ to: "/leaves", color: "text-amber-600", label: `${stats.pendingLeaves} pengajuan izin/cuti menunggu persetujuan Admin Pusat / Owner` });
  }
  if (stats?.verifikasiBills > 0) {
    todos.push({ to: "/bills", color: "text-sky-600", label: `${stats.verifikasiBills} bukti pembayaran SPP menunggu verifikasi admin` });
  }
  if (stats?.unpaidBills > 0) {
    todos.push({
      to: "/bills",
      color: "text-rose-600",
      label: `${stats.unpaidBills} tagihan SPP belum lunas (${rp(stats.unpaidAmount)})`,
    });
  }
  if (isHQ && stats?.openComplaints > 0) {
    todos.push({ to: "/complaints", color: "text-indigo-600", label: `${stats.openComplaints} komplen berstatus open perlu ditindak` });
  }

  // Siapkan data grafik pertumbuhan cabang
  const growthData = growthView === "weekly" ? branchGrowth.weekly || [] : branchGrowth.monthly || [];
  const growthLabels = growthData.map((d) => (growthView === "weekly" ? d.week : fmtMonth(d.month)));
  // Ambil list semua cabang dari dataset
  const branchIdMap = {};
  growthData.forEach((d) => {
    Object.keys(d.branches || {}).forEach((bid) => {
      if (!branchIdMap[bid]) {
        branchIdMap[bid] = d.branches[bid].name;
      }
    });
  });
  const branchKeys = Object.keys(branchIdMap);

  const growthSeries = branchKeys.map((bid, idx) => ({
    name: branchIdMap[bid],
    color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length],
    data: growthData.map((d) => {
      const bObj = d.branches?.[bid] || { active: 0, new: 0, out: 0 };
      return bObj[growthMetric] || 0;
    }),
  }));

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-sky-200">ADLS English Course · Learning & Management Portal</p>
            <h1 className="mt-1 text-2xl font-extrabold">Halo, {user.name}</h1>
            <p className="mt-0.5 text-sm font-medium text-sky-100">
              {getOpeningGreeting(user)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Bulan (#16) */}
            <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
              <span className="font-semibold text-sky-200">Bulan:</span>
              <input
                type="month"
                className="rounded-lg border-0 bg-white px-2 py-1 text-xs font-bold text-slate-800 shadow-sm outline-none"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                aria-label="Pilih Bulan"
              />
            </div>

            {/* Filter Cabang (Owner & Admin Pusat per #21) */}
            {isHQ && stats?.branchOptions?.length > 0 && (
              <div className="w-48 text-slate-800">
                <Select
                  options={branchOptions}
                  value={branchOptions.find((o) => o.value === branchId) || branchOptions[0]}
                  onChange={(opt) => setBranchId(opt?.value || "")}
                  isSearchable
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderRadius: "0.75rem",
                      borderColor: "rgba(255,255,255,0.3)",
                      fontSize: "0.875rem",
                      minHeight: 38,
                      boxShadow: "none",
                    }),
                    menu: (base) => ({ ...base, zIndex: 30, borderRadius: "0.75rem", color: "#1e293b" }),
                  }}
                />
              </div>
            )}

            <button
              onClick={() => {
                loadStats();
                loadTutorAvail();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-extrabold text-brand-dark shadow-sm transition hover:bg-sky-50 disabled:opacity-60"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* #19 Akses Informasi Jumlah Siswa (Owner & Admin Pusat bisa lihat aktif & non-aktif) */}
        <KpiCard
          icon={GraduationCap}
          label="Siswa Aktif"
          value={stats ? stats.students ?? 0 : "…"}
          sub={stats ? `${stats.totalStudents ?? 0} total · ${stats.inactiveStudents ?? 0} nonaktif` : ""}
          color="blue"
        />

        {/* Siswa Baru vs Keluar (#14) */}
        <KpiCard
          icon={TrendingUp}
          label="Siswa Baru (Bulan Ini)"
          value={stats ? stats.newStudents ?? 0 : "…"}
          sub={stats ? `${stats.outStudents ?? 0} siswa berhenti (out)` : ""}
          color="emerald"
        />

        {/* Paid Students: Cash vs Transfer */}
        <KpiCard
          icon={UserCheck}
          label="Siswa Lunas (Paid)"
          value={stats ? `${paidTotalCount} Siswa` : "…"}
          sub={
            stats
              ? `Cash: ${paidCashCount} · Transfer: ${paidTransferCount} (${rp(paidTotalAmount)})`
              : ""
          }
          color="emerald"
        />

        {/* Unpaid Students */}
        <KpiCard
          icon={UserX}
          label="Siswa Belum Bayar"
          value={stats ? `${unpaidCount} Siswa` : "…"}
          sub={stats ? `Tunggakan: ${rp(unpaidAmount)}` : ""}
          color="rose"
        />

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
          icon={TrendingDown}
          label="Total Pengeluaran"
          value={stats ? rp(stats.totalExpenses) : "…"}
          sub={stats ? `Top ${topExpenses.length} kategori pengeluaran` : ""}
          color="amber"
        />
      </div>

      {/* Action Todos */}
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

      {/* #13 Section Rincian Paid & Unpaid Student Keseluruhan & Per Cabang */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Rincian Pembayaran Siswa (Paid & Unpaid Student)
            </h3>
            <p className="text-xs text-slate-500">
              Status pembayaran siswa aktif berdasarkan metode Cash dan Transfer untuk bulan {fmtMonth(selectedMonth)}
            </p>
          </div>
          <Link
            to="/students-database"
            className="inline-flex items-center gap-1 rounded-xl bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-100"
          >
            Buka Rekap Database Siswa <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">Siswa Lunas (Cash)</span>
              <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-900">Tunai</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-emerald-900">{paidCashCount} Siswa</div>
            <div className="mt-1 text-xs font-semibold text-emerald-700">{rp(paidCashAmount)}</div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-blue-800">Siswa Lunas (Transfer)</span>
              <span className="rounded-full bg-blue-200 px-2 py-0.5 text-xs font-bold text-blue-900">Transfer</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-blue-900">{paidTransferCount} Siswa</div>
            <div className="mt-1 text-xs font-semibold text-blue-700">{rp(paidTransferAmount)}</div>
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-rose-800">Siswa Belum Bayar (Unpaid)</span>
              <span className="rounded-full bg-rose-200 px-2 py-0.5 text-xs font-bold text-rose-900">Pending</span>
            </div>
            <div className="mt-2 text-2xl font-extrabold text-rose-900">{unpaidCount} Siswa</div>
            <div className="mt-1 text-xs font-semibold text-rose-700">Tunggakan {rp(unpaidAmount)}</div>
          </div>
        </div>

        {/* Rincian Berdasarkan Masing-Masing Cabang */}
        {branchPaidUnpaid.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-3.5 py-2.5 font-bold">Cabang</th>
                  <th className="px-3.5 py-2.5 text-center font-bold">Paid (Cash)</th>
                  <th className="px-3.5 py-2.5 text-center font-bold">Paid (Transfer)</th>
                  <th className="px-3.5 py-2.5 text-center font-bold">Total Paid</th>
                  <th className="px-3.5 py-2.5 text-center font-bold">Unpaid Student</th>
                  <th className="px-3.5 py-2.5 text-right font-bold">Tunggakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {branchPaidUnpaid.map((b) => {
                  const cashCnt = Number(b.paid_cash_count ?? b.cash_count ?? 0);
                  const cashAmt = Number(b.paid_cash_amount ?? b.cash_amount ?? 0);
                  const transferCnt = Number(b.paid_transfer_count ?? b.transfer_count ?? 0);
                  const transferAmt = Number(b.paid_transfer_amount ?? b.transfer_amount ?? 0);
                  const totalPaid = Number(b.paid_count ?? b.total_paid ?? (cashCnt + transferCnt));
                  const unpCount = Number(b.unpaid_count ?? b.unpaid_students ?? 0);
                  const unpAmt = Number(b.unpaid_amount ?? 0);
                  return (
                    <tr key={b.branch_id} className="hover:bg-slate-50/80">
                      <td className="px-3.5 py-2 font-bold text-slate-800">{b.branch_name}</td>
                      <td className="px-3.5 py-2 text-center text-slate-700">
                        <b>{cashCnt}</b> <span className="text-[11px] text-slate-400">({shortRp(cashAmt)})</span>
                      </td>
                      <td className="px-3.5 py-2 text-center text-slate-700">
                        <b>{transferCnt}</b> <span className="text-[11px] text-slate-400">({shortRp(transferAmt)})</span>
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                          {totalPaid} siswa
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 font-bold ${unpCount > 0 ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500"}`}>
                          {unpCount} siswa
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-right font-bold text-rose-600">{rp(unpAmt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* #14 & #21 Grafik Pertumbuhan Siswa Setiap Cabang (Weekly vs Monthly) */}
      <ChartCard
        title="Grafik Pertumbuhan Siswa Setiap Cabang"
        subtitle={`Perkembangan siswa berdasarkan masing-masing cabang (${growthView === "weekly" ? "Mingguan" : "Bulanan"})`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGrowthMetric("active")}
                className={`rounded-lg px-2.5 py-1 transition ${growthMetric === "active" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Siswa Aktif
              </button>
              <button
                type="button"
                onClick={() => setGrowthMetric("new")}
                className={`rounded-lg px-2.5 py-1 transition ${growthMetric === "new" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                New Student
              </button>
              <button
                type="button"
                onClick={() => setGrowthMetric("out")}
                className={`rounded-lg px-2.5 py-1 transition ${growthMetric === "out" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Student Out
              </button>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setGrowthView("weekly")}
                className={`rounded-lg px-2.5 py-1 transition ${growthView === "weekly" ? "bg-white text-brand shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setGrowthView("monthly")}
                className={`rounded-lg px-2.5 py-1 transition ${growthView === "monthly" ? "bg-white text-brand shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
              >
                Monthly
              </button>
            </div>
          </div>
        }
      >
        {growthSeries.length > 0 && growthLabels.length > 0 ? (
          <LineAreaChart
            labels={growthLabels}
            series={growthSeries}
            formatValue={(v) => `${v} siswa`}
          />
        ) : (
          <div className="py-12 text-center text-sm text-slate-400">Belum ada rekaman pertumbuhan siswa</div>
        )}
      </ChartCard>

      {/* Row: Marketing Source & Stop Reason */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* #15 Informasi Sumber Pendaftaran (Marketing Source) */}
        <ChartCard
          title="Sumber Pendaftaran (Marketing Source)"
          subtitle="Distribusi calon siswa mengenal ADLS English Course"
        >
          {marketingSources.length > 0 ? (
            <HorizontalBars
              items={marketingSources.map((m, idx) => ({
                label: m.source,
                value: m.count,
                color: BRANCH_PALETTE[idx % BRANCH_PALETTE.length],
              }))}
              formatValue={(v) => `${v} pendaftar`}
              emptyText="Belum ada data sumber pendaftaran"
            />
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">Belum ada data pendaftar</div>
          )}
        </ChartCard>

        {/* #16 Alasan Siswa Berhenti (Stop Reasons) */}
        <ChartCard
          title="Alasan Siswa Berhenti (Student Out)"
          subtitle="Evaluasi dan data retensi siswa non-aktif / berhenti"
        >
          {stopReasons.length > 0 ? (
            <HorizontalBars
              items={stopReasons.map((s, idx) => ({
                label: s.reason,
                value: s.count,
                color: ["#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4", "#64748b"][idx % 5],
              }))}
              formatValue={(v) => `${v} siswa`}
              emptyText="Belum ada siswa yang berhenti (status out)"
            />
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">Tidak ada siswa yang berstatus berhenti (out)</div>
          )}
        </ChartCard>
      </div>

      {/* Row: Pemasukan SPP, Top Expenses, Rekap Kehadiran, & Top Tutors */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Pemasukan SPP per Bulan */}
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

        {/* Total Top 4 Expenses */}
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

        {/* Rekap Kehadiran Siswa */}
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

        {/* #12 Tutor Berprestasi + Informasi Jumlah Siswa yang Diajar */}
        <ChartCard
          title="Tutor Berprestasi & Beban Mengajar"
          subtitle="Tingkat ketepatan waktu & total siswa yang diajar oleh masing-masing tutor"
          right={
            <Link to="/tutor_attendance" className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline">
              Absensi Tutor <ChevronRight size={14} />
            </Link>
          }
        >
          {topTutors.length ? (
            <div className="space-y-3">
              {topTutors.map((t, idx) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-slate-200"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold shadow-sm ${
                        idx === 0
                          ? "bg-amber-100 text-amber-800 ring-2 ring-amber-300"
                          : idx === 1
                          ? "bg-slate-200 text-slate-800"
                          : idx === 2
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {idx === 0 ? <Award size={18} className="text-amber-600" /> : `#${idx + 1}`}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {t.name}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500 truncate" title={t.branch_name}>
                        {t.branch_name || "Semua Cabang"}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded-md bg-brand-50 px-2 py-0.5 font-bold text-brand-dark">
                          {t.student_count || 0} Siswa Diajar
                        </span>
                        <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-semibold text-slate-600">
                          {t.classes_count || 0} Kelas
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right min-w-[115px]">
                    <span
                      className={`inline-block whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-extrabold ${
                        t.on_time_rate >= 85
                          ? "bg-emerald-100 text-emerald-800"
                          : t.on_time_rate >= 50
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {t.on_time_rate}% Tepat Waktu
                    </span>
                    <div className="mt-1 text-[11px] font-medium text-slate-400 whitespace-nowrap">
                      {t.on_time_sessions}/{t.total_sessions} sesi hadir
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">Belum ada data tutor aktif</div>
          )}
        </ChartCard>
      </div>

      {/* #20 & #6 Ketersediaan Jadwal Kosong Tutor (Menggantikan Ringkasan Kelas) */}
      <ChartCard
        title="Ketersediaan Jadwal Kosong Tutor"
        subtitle="Sistem real-time pemantauan slot mengajar kosong dan bentrok jadwal tutor"
        right={
          <button
            type="button"
            onClick={loadTutorAvail}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
          >
            <RefreshCw size={13} className={loadingTutorAvail ? "animate-spin" : ""} /> Refresh Jadwal
          </button>
        }
      >
        {tutorAvail.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-3.5 py-3 font-bold">Nama Tutor</th>
                  <th className="px-3.5 py-3 font-bold">Cabang</th>
                  <th className="px-3.5 py-3 text-center font-bold">Kelas Aktif</th>
                  <th className="px-3.5 py-3 text-center font-bold">Slot Terisi (Busy)</th>
                  <th className="px-3.5 py-3 text-center font-bold">Slot Kosong</th>
                  <th className="px-3.5 py-3 font-bold">Ringkasan Waktu Kosong</th>
                  <th className="px-3.5 py-3 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tutorAvail.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-3 font-bold text-slate-900">{t.name}</td>
                    <td className="px-3.5 py-3 text-slate-600">{t.branch_name}</td>
                    <td className="px-3.5 py-3 text-center font-bold text-brand-dark">{t.active_classes}</td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                        {t.busy_slots_count} slot
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                        {t.empty_slots_count} slot kosong
                      </span>
                    </td>
                    <td className="max-w-xs truncate px-3.5 py-3 text-slate-600">
                      {t.free_summary?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {t.free_summary.slice(0, 3).map((s, i) => (
                            <span key={i} className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px]">
                              {s}
                            </span>
                          ))}
                          {t.free_summary.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{t.free_summary.length - 3} lagi</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Penuh / Tidak ada slot</span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setAvailModalTutor(t)}
                        className="btn-ghost !px-2.5 !py-1 text-xs"
                      >
                        Lihat Slot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-400">Belum ada data ketersediaan tutor</div>
        )}
      </ChartCard>

      {/* Modal Detail Slot Tutor */}
      <Modal
        open={!!availModalTutor}
        title={`Jadwal & Ketersediaan: ${availModalTutor?.name || ""}`}
        onClose={() => setAvailModalTutor(null)}
      >
        {availModalTutor && (
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              <b>Cabang:</b> {availModalTutor.branch_name} · <b>Kelas Aktif:</b> {availModalTutor.active_classes} ·{" "}
              <b>Slot Terisi:</b> {availModalTutor.busy_slots_count} · <b>Slot Kosong:</b> {availModalTutor.empty_slots_count}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Slot Terisi (Jadwal Mengajar):</h4>
              {availModalTutor.busy_slots?.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {availModalTutor.busy_slots.map((b, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2 text-xs">
                      <div>
                        <div className="font-bold text-slate-800">{b.day} ({b.time_range})</div>
                        <div className="text-slate-500">{b.class_name} · {b.class_type}</div>
                      </div>
                      <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">Terisi</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                  Tidak ada kelas aktif yang terisi
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-700">Slot Kosong Tersedia:</h4>
              {availModalTutor.empty_slots?.length ? (
                <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {availModalTutor.empty_slots.map((e, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-2 py-1 text-center text-[11px] font-semibold text-emerald-800"
                      >
                        {e.day} {e.time_range}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                  Semua slot sesi terisi penuh
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
