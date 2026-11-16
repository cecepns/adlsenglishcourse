import { useEffect, useState, useMemo } from "react";
import {
  Download,
  Search,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  GraduationCap,
  Building2,
  Calendar,
  RefreshCw,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import { exportToExcel } from "@/utils/exportExcel";
import toast from "react-hot-toast";

export default function StudentsDatabase() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [branches, setBranches] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resDb, resBranches] = await Promise.all([
        api.get(API_ENDPOINTS.STUDENTS_DATABASE, {
          params: {
            branch_id: branchFilter || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          },
        }),
        api.get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 50 } }),
      ]);
      setData(resDb.data.data || []);
      setBranches(resBranches.data.data || []);
    } catch {
      toast.error("Gagal memuat rekap database siswa");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchFilter, startDate, endDate]);

  const filtered = useMemo(() => {
    return data.filter((row) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (row.student_name && row.student_name.toLowerCase().includes(q)) ||
        (row.class_name && row.class_name.toLowerCase().includes(q)) ||
        (row.tutor_name && row.tutor_name.toLowerCase().includes(q)) ||
        (row.branch_name && row.branch_name.toLowerCase().includes(q));

      const matchPay = !paymentFilter || row.payment_status === paymentFilter;
      return matchSearch && matchPay;
    });
  }, [data, search, paymentFilter]);

  const exportCsv = () => {
    if (!filtered.length) return toast.error("Tidak ada data untuk diekspor");
    const cols = [
      { key: "no", label: "No." },
      { key: "student_name", label: "Student Names" },
      { key: "class_name", label: "Class" },
      { key: "branch_name", label: "Branch" },
      { key: "payment_status", label: "Payment" },
      { key: "payment_method", label: "Payment Method" },
      { key: "date_of_payment", label: "Date Of Payment" },
      { key: "day_1", label: "Class Day 1 Schedule" },
      { key: "day_2", label: "Class Day 2 Schedule" },
      { key: "day_3", label: "Class Day 3 Schedule" },
      { key: "time_start", label: "Class Time Start" },
      { key: "time_end", label: "Class Time End" },
      { key: "tutor_name", label: "Tutor PIC" },
      { key: "student_wa", label: "Student WhatsApp" },
      { key: "parent_wa", label: "Parent WhatsApp" },
      { key: "housing_complex", label: "Housing Complex" },
      { key: "marketing_source", label: "Marketing Source" },
    ];
    const dataToExport = filtered.map((r, idx) => ({
      no: idx + 1,
      student_name: r.student_name || "",
      class_name: r.class_name || "",
      branch_name: r.branch_name || "",
      payment_status: r.payment_status || "Not Paid",
      payment_method: r.payment_method || "",
      date_of_payment: r.date_of_payment || "",
      day_1: r.day_1 || "",
      day_2: r.day_2 || "",
      day_3: r.day_3 || "",
      time_start: r.time_start || "",
      time_end: r.time_end || "",
      tutor_name: r.tutor_name || "",
      student_wa: r.student_wa || "",
      parent_wa: r.parent_wa || "",
      housing_complex: r.housing_complex || "",
      marketing_source: r.marketing_source || "",
    }));
    exportToExcel("Rekap_Database_Siswa_ADLS", cols, dataToExport);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-6 text-white shadow-md">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-amber-200">
              <FileSpreadsheet size={14} /> Database Rekapitulasi Siswa
            </div>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">Rekap Database Siswa ADLS</h1>
            <p className="mt-1 text-sm text-sky-100 max-w-2xl">
              Tabel rekapitulasi data siswa, status pembayaran SPP (Paid / Not Paid), jadwal hari mengajar, dan Tutor PIC secara komprehensif.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-sky-50"
            >
              <Download size={15} />
              <span>Export Excel / CSV</span>
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-xl bg-white/15 p-2.5 text-white hover:bg-white/20 transition disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-[240px] flex-1 sm:max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-2.5 text-slate-400" />
          <input
            type="text"
            className="input !h-9.5 !pl-10 text-xs rounded-xl"
            placeholder="Cari nama siswa, kelas, cabang, atau tutor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["owner", "admin_pusat"].includes(user?.role) && (
            <select
              className="input !h-9.5 !w-auto text-xs rounded-xl"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <select
            className="input !h-9.5 !w-auto text-xs rounded-xl"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="">Semua Status Bayar</option>
            <option value="Paid">Hanya Paid (Lunas)</option>
            <option value="Not Paid">Hanya Not Paid (Belum Lunas)</option>
          </select>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
            <span className="font-semibold text-slate-500">Tgl Gabung:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs outline-none"
              title="Tanggal Mulai"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-xs outline-none"
              title="Tanggal Selesai"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-300"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Excel Table Layout */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-amber-50/80 text-slate-800">
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold text-center w-12">No.</th>
                <th className="border-r border-slate-200 px-4 py-3 font-extrabold min-w-[170px]">Student Names</th>
                <th className="border-r border-slate-200 px-4 py-3 font-extrabold min-w-[150px]">Class</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold text-center min-w-[80px]">Branch</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold text-center min-w-[90px]">Payment</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold text-center min-w-[100px]">Payment Method</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold text-center min-w-[80px]">Date Of Payment</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold bg-blue-50/70 min-w-[100px]">Class Day 1 Schedule</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold bg-blue-50/70 min-w-[100px]">Class Day 2 Schedule</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold bg-blue-50/70 min-w-[100px]">Class Day 3 Schedule</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold bg-sky-50 text-center min-w-[90px]">Class Time Start</th>
                <th className="border-r border-slate-200 px-3 py-3 font-extrabold bg-sky-50 text-center min-w-[90px]">Class Time End</th>
                <th className="px-4 py-3 font-extrabold min-w-[120px]">Tutor PIC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    Memuat data rekap siswa...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    Tidak ada data siswa ditemukan.
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => {
                  const isPaid = r.payment_status === "Paid";
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 transition font-medium text-slate-700"
                    >
                      <td className="border-r border-slate-100 px-3 py-2.5 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="border-r border-slate-100 px-4 py-2.5 font-bold text-slate-900">
                        {r.student_name}
                      </td>
                      <td className="border-r border-slate-100 px-4 py-2.5 text-slate-800">
                        {r.class_name}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-center font-semibold text-slate-600">
                        {r.branch_name}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-center">
                        {isPaid ? (
                          <span className="inline-block rounded bg-emerald-400 px-2 py-0.5 text-[11px] font-black tracking-wide text-emerald-950 shadow-sm">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-fuchsia-300 px-2 py-0.5 text-[11px] font-black tracking-wide text-fuchsia-950 shadow-sm">
                            Not Paid
                          </span>
                        )}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-center text-slate-600">
                        {r.payment_method || "-"}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-center font-bold text-slate-700">
                        {r.date_of_payment || "-"}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-slate-700">
                        {r.day_1 || "-"}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-slate-700">
                        {r.day_2 || "-"}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-slate-700">
                        {r.day_3 || "-"}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-center font-semibold text-slate-700">
                        {r.time_start || "-"}
                      </td>
                      <td className="border-r border-slate-100 px-3 py-2.5 text-center font-semibold text-slate-700">
                        {r.time_end || "-"}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-brand-dark">
                        {r.tutor_name || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <div>
            Total data siswa: <b>{filtered.length}</b> (Paid: <b>{filtered.filter((x) => x.payment_status === "Paid").length}</b> · Not Paid: <b>{filtered.filter((x) => x.payment_status === "Not Paid").length}</b>)
          </div>
          <div className="font-semibold text-brand-dark">
            PT. ADLS Solusi Indonesia · Master Student Database
          </div>
        </div>
      </div>
    </div>
  );
}

