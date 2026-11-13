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
import toast from "react-hot-toast";

export default function StudentsDatabase() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [branches, setBranches] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resDb, resBranches] = await Promise.all([
        api.get(API_ENDPOINTS.STUDENTS_DATABASE, {
          params: { branch_id: branchFilter || undefined },
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
  }, [branchFilter]);

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
    const headers = [
      "No.",
      "Student Names",
      "Class",
      "Branch",
      "Payment",
      "Payment Method",
      "Date Of Payment",
      "Class Day 1 Schedule",
      "Class Day 2 Schedule",
      "Class Day 3 Schedule",
      "Class Time Start",
      "Class Time End",
      "Tutor PIC",
      "Student WhatsApp",
      "Parent WhatsApp",
      "Housing Complex",
      "Marketing Source",
    ];

    const rows = filtered.map((r, idx) => [
      idx + 1,
      `"${(r.student_name || "").replace(/"/g, '""')}"`,
      `"${(r.class_name || "").replace(/"/g, '""')}"`,
      `"${(r.branch_name || "").replace(/"/g, '""')}"`,
      r.payment_status || "Not Paid",
      r.payment_method || "",
      r.date_of_payment || "",
      r.day_1 || "",
      r.day_2 || "",
      r.day_3 || "",
      r.time_start || "",
      r.time_end || "",
      `"${(r.tutor_name || "").replace(/"/g, '""')}"`,
      r.student_wa || "",
      r.parent_wa || "",
      `"${(r.housing_complex || "").replace(/"/g, '""')}"`,
      r.marketing_source || "",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Database_Siswa_ADLS_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("File CSV rekap database berhasil diunduh");
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
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            className="input !pl-10 !py-2 text-xs"
            placeholder="Cari nama siswa, kelas, cabang, atau tutor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {["owner", "admin_pusat"].includes(user?.role) && (
            <select
              className="input !w-auto !py-2 text-xs"
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
            className="input !w-auto !py-2 text-xs"
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="">Semua Status Bayar</option>
            <option value="Paid">Hanya Paid (Lunas)</option>
            <option value="Not Paid">Hanya Not Paid (Belum Lunas)</option>
          </select>
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

