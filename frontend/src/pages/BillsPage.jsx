import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  Building2,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Copy,
  CreditCard,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  Receipt,
  Search,
  Settings,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { exportToExcel } from "@/utils/exportExcel";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import useResourceList from "@/hooks/useResourceList";
import AsyncResourceSelect from "@/components/AsyncResourceSelect";
import DatePickerInput from "@/components/DatePickerInput";
import ImageUploadField from "@/components/ImageUploadField";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const STATUS_BADGE = {
  paid: "bg-emerald-100 text-emerald-700",
  verifikasi: "bg-sky-100 text-sky-700",
  unpaid: "bg-amber-100 text-amber-700",
  overdue: "bg-red-100 text-red-700",
};

const toWaUrl = (phone, msg) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return null;
  const intl = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
};

export default function BillsPage() {
  const { user } = useAuth();
  const isStaff = STAFF.includes(user.role);
  const isHQ = ["owner", "admin_pusat"].includes(user.role);

  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Pay Proof modal
  const [payModal, setPayModal] = useState(null);
  const [payForm, setPayForm] = useState({ payment_method: "Transfer BCA PT ADLS", proof: "", notes: "" });

  // Bulk Generate modal
  const [genModal, setGenModal] = useState(false);
  const [genForm, setGenForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    amount: "400000",
    due_date: `${new Date().toISOString().slice(0, 7)}-10`,
    title: "",
    branch_id: user.role === "admin_cabang" ? user.branch_id : null,
    branch_name: user.branch_name || "",
  });

  // Create / Edit Tagihan modal
  const [crudModal, setCrudModal] = useState(null);
  const [crudForm, setCrudForm] = useState({
    student_id: null,
    student_name: "",
    title: "",
    month: new Date().toISOString().slice(0, 7),
    amount: "",
    discount: "0",
    due_date: "",
    status: "unpaid",
    branch_id: null,
    branch_name: "",
  });

  // Bank Account Management Modal
  const [manageBankModal, setManageBankModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankForm, setBankForm] = useState({
    bank_name: "BSI",
    account_number: "7239458167",
    account_holder: "PT. Adls Solusi Indonesia",
    company_name: "PT. Adls Solusi Indonesia",
  });
  const [savingBank, setSavingBank] = useState(false);

  const [saving, setSaving] = useState(false);
  const debounced = useDebounce(search, 300);

  // Filter Rentang Tanggal & Download Excel (Admin & Tutor)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);
  const canDownloadExcel = ["owner", "admin_pusat", "admin_cabang", "tutor"].includes(user?.role);

  useEffect(() => {
    api
      .get(API_ENDPOINTS.BILLS_BANK_INFO)
      .then((r) => setBankInfo(r.data.data))
      .catch(() => {});
    if (isHQ) {
      api
        .get(API_ENDPOINTS.BRANCHES.LIST, { params: { limit: 100 } })
        .then((r) => setBranches(r.data.data || []))
        .catch(() => {});
    }
  }, [isHQ]);

  const queryParams = {
    page,
    limit,
    search: debounced,
    ...(isHQ && branchId ? { branch_id: branchId } : {}),
    ...(startDate ? { start_date: startDate } : {}),
    ...(endDate ? { end_date: endDate } : {}),
  };
  const { rows, pagination, loading, error, refetch } = useResourceList(API_ENDPOINTS.BILLS.LIST, queryParams);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const res = await api.get(API_ENDPOINTS.BILLS.LIST, {
        params: {
          limit: 5000,
          export: 1,
          search: debounced || undefined,
          branch_id: isHQ && branchId ? branchId : undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        },
      });
      const dataToExport = res.data.data || rows;
      const cols = [
        { key: "month", label: "Bulan" },
        { key: "student_name", label: "Siswa" },
        { key: "branch_name", label: "Cabang" },
        { key: "title", label: "Tagihan" },
        { key: "amount", label: "Nominal" },
        { key: "discount", label: "Diskon" },
        { key: "due_date", label: "Jatuh Tempo" },
        { key: "status", label: "Status" },
        { key: "payment_method", label: "Metode Bayar" },
        { key: "paid_at", label: "Tanggal Bayar" },
        { key: "notes", label: "Catatan" },
      ];
      exportToExcel("Rekap_Tagihan_SPP_ADLS", cols, dataToExport);
    } catch {
      exportToExcel("Rekap_Tagihan_SPP_ADLS", [
        { key: "month", label: "Bulan" },
        { key: "student_name", label: "Siswa" },
        { key: "branch_name", label: "Cabang" },
        { key: "title", label: "Tagihan" },
        { key: "amount", label: "Nominal" },
        { key: "discount", label: "Diskon" },
        { key: "due_date", label: "Jatuh Tempo" },
        { key: "status", label: "Status" },
      ], rows);
    } finally {
      setExporting(false);
    }
  };

  const copyAcc = (text) => {
    navigator.clipboard?.writeText(text);
    toast.success(`Nomor rekening disalin: ${text}`);
  };

  const fetchBankInfo = async () => {
    try {
      const r = await api.get(API_ENDPOINTS.BILLS_BANK_INFO);
      setBankInfo(r.data.data);
    } catch {}
  };

  const openManageBankModal = async () => {
    setManageBankModal(true);
    setEditingBank(null);
    setBankForm({
      bank_name: "BSI",
      account_number: "7239458167",
      account_holder: bankInfo?.company || "PT. Adls Solusi Indonesia",
      company_name: bankInfo?.company || "PT. Adls Solusi Indonesia",
    });
    setLoadingAccounts(true);
    try {
      const res = await api.get(API_ENDPOINTS.BILLS_BANK_ACCOUNTS);
      setBankAccounts(res.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memuat daftar rekening");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const startEditBank = (acc) => {
    setEditingBank(acc);
    setBankForm({
      bank_name: acc.bank_name || acc.bank || "",
      account_number: acc.account_number || acc.number || "",
      account_holder: acc.account_holder || acc.holder || "",
      company_name: acc.company_name || bankInfo?.company || "PT. Adls Solusi Indonesia",
    });
  };

  const cancelEditBank = () => {
    setEditingBank(null);
    setBankForm({
      bank_name: "BSI",
      account_number: "7239458167",
      account_holder: bankInfo?.company || "PT. Adls Solusi Indonesia",
      company_name: bankInfo?.company || "PT. Adls Solusi Indonesia",
    });
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!bankForm.bank_name?.trim() || !bankForm.account_number?.trim() || !bankForm.account_holder?.trim()) {
      toast.error("Nama Bank, Nomor Rekening, dan Atas Nama wajib diisi");
      return;
    }
    setSavingBank(true);
    try {
      if (editingBank?.id) {
        await api.put(API_ENDPOINTS.BILLS_BANK_ACCOUNT(editingBank.id), bankForm);
        toast.success("Rekening berhasil diperbarui");
      } else {
        await api.post(API_ENDPOINTS.BILLS_BANK_ACCOUNTS, bankForm);
        toast.success("Rekening berhasil ditambahkan");
      }
      const res = await api.get(API_ENDPOINTS.BILLS_BANK_ACCOUNTS);
      setBankAccounts(res.data.data || []);
      await fetchBankInfo();
      cancelEditBank();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan rekening");
    } finally {
      setSavingBank(false);
    }
  };

  const handleDeleteBank = async (acc) => {
    if (!window.confirm(`Hapus rekening ${acc.bank_name || acc.bank} (${acc.account_number || acc.number})?`)) return;
    try {
      await api.delete(API_ENDPOINTS.BILLS_BANK_ACCOUNT(acc.id));
      toast.success("Rekening berhasil dihapus");
      const res = await api.get(API_ENDPOINTS.BILLS_BANK_ACCOUNTS);
      setBankAccounts(res.data.data || []);
      await fetchBankInfo();
      if (editingBank?.id === acc.id) cancelEditBank();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus rekening");
    }
  };

  const openPay = (bill) => {
    setPayModal(bill);
    const defaultMethod = bankInfo?.accounts?.[0]
      ? `Transfer ${bankInfo.accounts[0].bank} (${bankInfo.accounts[0].number})`
      : "Transfer BSI (7239458167)";
    setPayForm({ payment_method: defaultMethod, proof: bill.proof || "", notes: "" });
  };

  const submitPay = async (e) => {
    e.preventDefault();
    if (!payForm.proof.trim()) {
      toast.error("Bukti transfer ke PT ADLS wajib diunggah");
      return;
    }
    setSaving(true);
    try {
      await request(() => api.post(API_ENDPOINTS.BILLS_PAY(payModal.id), payForm), {
        success: getClosingGreeting(user.role, "Bukti pembayaran ke PT ADLS berhasil dikirim!"),
      });
      setPayModal(null);
      refetch();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const verifyBill = async (bill, action) => {
    try {
      await request(() => api.post(API_ENDPOINTS.BILLS_VERIFY(bill.id), { action }), {
        success: getClosingGreeting(user.role, action === "approve" ? "Pembayaran diverifikasi Lunas." : "Pembayaran dikembalikan ke Belum Lunas."),
      });
      refetch();
    } catch {
      /* toast handled */
    }
  };

  const generateBills = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await request(
        () =>
          api.post(API_ENDPOINTS.BILLS_GENERATE, {
            month: genForm.month,
            amount: Number(genForm.amount) || 400000,
            due_date: genForm.due_date,
            title: genForm.title || `SPP Bulan ${genForm.month}`,
            branch_id: genForm.branch_id || null,
          }),
        { success: getClosingGreeting(user.role, "Tagihan SPP bulanan berhasil digenerate.") }
      );
      if (res?.message) toast(res.message, { icon: "🧾" });
      setGenModal(false);
      refetch();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const openCrud = (row = null) => {
    setCrudModal(row ? { row } : {});
    setCrudForm(
      row
        ? {
            student_id: row.student_id,
            student_name: row.student_name || "",
            title: row.title || "",
            month: row.month || "",
            amount: row.amount ?? "",
            discount: row.discount ?? "0",
            due_date: String(row.due_date || "").slice(0, 10),
            status: row.status || "unpaid",
            branch_id: row.branch_id || null,
            branch_name: row.branch_name || "",
          }
        : {
            student_id: null,
            student_name: "",
            title: `SPP Bulan ${new Date().toISOString().slice(0, 7)}`,
            month: new Date().toISOString().slice(0, 7),
            amount: "400000",
            discount: "0",
            due_date: `${new Date().toISOString().slice(0, 7)}-10`,
            status: "unpaid",
            branch_id: user.branch_id || null,
            branch_name: user.branch_name || "",
          }
    );
  };

  const saveCrud = async (e) => {
    e.preventDefault();
    if (!crudForm.student_id || !crudForm.title.trim()) {
      toast.error("Siswa dan judul tagihan wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        student_id: crudForm.student_id,
        title: crudForm.title,
        month: crudForm.month,
        amount: Number(crudForm.amount || 0),
        discount: Number(crudForm.discount || 0),
        due_date: crudForm.due_date || null,
        status: crudForm.status,
        branch_id: crudForm.branch_id || null,
      };
      await request(
        () =>
          crudModal.row
            ? api.put(API_ENDPOINTS.BILLS.DETAIL(crudModal.row.id), payload)
            : api.post(API_ENDPOINTS.BILLS.LIST, payload),
        { success: getClosingGreeting(user.role, "Data tagihan SPP berhasil disimpan.") }
      );
      setCrudModal(null);
      refetch();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const deleteBill = (row) => {
    toast(
      (t) => (
        <div className="text-sm">
          <p className="mb-2 font-medium">Hapus tagihan "{row.title}"?</p>
          <div className="flex gap-2">
            <button
              className="btn-primary !bg-none !bg-red-600 !px-3 !py-1"
              onClick={async () => {
                toast.dismiss(t.id);
                await request(() => api.delete(API_ENDPOINTS.BILLS.DETAIL(row.id)), {
                  success: getClosingGreeting(user.role, "Tagihan berhasil dihapus."),
                });
                refetch();
              }}
            >
              Hapus
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Tagihan SPP & Pembayaran</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Pembayaran resmi ditransfer ke rekening PT ADLS English Course dengan verifikasi bukti transfer</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canDownloadExcel && (
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || rows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs hover:bg-emerald-100 transition disabled:opacity-50"
              title="Download data tagihan SPP sebagai Excel (.csv UTF-8)"
            >
              {exporting ? (
                <Loader2 size={14} className="animate-spin text-emerald-700" />
              ) : (
                <FileSpreadsheet size={15} className="text-emerald-700" />
              )}
              <span>Export Excel</span>
            </button>
          )}
          {isStaff && (
            <>
              <button type="button" onClick={() => setGenModal(true)} className="btn-ghost !py-2 text-xs font-bold">
                <CalendarPlus size={15} /> Generate SPP
              </button>
              <button type="button" onClick={() => openCrud(null)} className="btn-primary !py-2 text-xs font-bold shadow-sm">
                <Plus size={16} /> Tambah Tagihan
              </button>
            </>
          )}
        </div>
      </div>

      {bankInfo?.accounts && (
        <div className="rounded-2xl border border-brand-light/40 bg-gradient-to-r from-brand-50 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-extrabold text-brand-dark">
                <Building2 size={18} className="text-brand" /> Rekening Resmi {bankInfo.company}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Mohon transfer pembayaran SPP dan produk resmi hanya ke rekening berikut:</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              {bankInfo.accounts.map((a) => (
                <button
                  key={a.id || a.number}
                  type="button"
                  onClick={() => copyAcc(a.number)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-xs shadow-sm transition hover:border-brand hover:bg-brand-50/20"
                  title="Klik untuk salin no rekening"
                >
                  <div>
                    <div className="font-extrabold text-brand-dark">{a.bank}: {a.number}</div>
                    <div className="text-[11px] text-slate-500">a.n. {a.holder}</div>
                  </div>
                  <Copy size={14} className="text-brand" />
                </button>
              ))}
              {isStaff && (
                <button
                  type="button"
                  onClick={openManageBankModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-brand/60 bg-white/90 px-3 py-2 text-xs font-bold text-brand shadow-2xs hover:bg-brand hover:text-white transition"
                  title="Kelola daftar nomor rekening resmi"
                >
                  <Settings size={14} />
                  <span>Kelola Rekening</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-2.5 text-slate-400" />
            <input
              className="input !pl-10 !py-2 text-xs w-full"
              placeholder="Cari nama siswa, bulan, atau nomor tagihan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isHQ && branches.length > 0 && (
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
                    menu: (base) => ({ ...base, zIndex: 30, borderRadius: "0.75rem", fontSize: "0.75rem" }),
                  }}
                />
              </div>
            )}

            {/* Filter Rentang Tanggal Jatuh Tempo */}
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs">
              <Calendar size={13} className="text-brand shrink-0" />
              <span className="text-slate-500 font-semibold hidden sm:inline">Tempo:</span>
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
        {error ? (
          <div className="p-8 text-center text-red-600">{error} <button className="ml-2 underline" onClick={refetch}>Coba lagi</button></div>
        ) : loading ? (
          <div className="space-y-2.5 p-5">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-slate-400">
            <Receipt size={40} />
            <span>Belum ada tagihan SPP</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 font-bold">Tagihan</th>
                  <th className="px-4 py-3.5 font-bold">Siswa & Cabang</th>
                  <th className="px-4 py-3.5 font-bold">Nominal Net</th>
                  <th className="px-4 py-3.5 font-bold">Jatuh Tempo</th>
                  <th className="px-4 py-3.5 font-bold">Bukti</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-4 py-3.5 text-right font-bold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const discount = Number(r.discount || 0);
                  const net = Math.max(0, Number(r.amount || 0) - discount);
                  const proofUrl = resolveAssetUrl(r.proof);
                  const waUrl = toWaUrl(
                    r.parent_phone,
                    `Halo Bapak/Ibu wali dari ${r.student_name || "siswa ADLS"}, pengingat tagihan ${r.title} sebesar ${rp(net)} (jatuh tempo ${String(r.due_date || "-").slice(0, 10)}). Pembayaran ke rekening PT ADLS English Course. Terima kasih!`
                  );

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.title}</div>
                        {r.month && <div className="text-xs text-slate-400">Periode {r.month}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{r.student_name || `Siswa #${r.student_id}`}</div>
                        <div className="text-xs text-slate-500">{r.branch_name || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-extrabold text-brand-dark">{rp(net)}</div>
                        {discount > 0 && <div className="text-[11px] font-semibold text-emerald-600">Diskon Referral -{rp(discount)}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{String(r.due_date || "").slice(0, 10) || "-"}</td>
                      <td className="px-4 py-3">
                        {proofUrl ? (
                          <a href={proofUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand hover:underline">
                            Lihat Bukti
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${STATUS_BADGE[r.status] || "bg-slate-100 text-slate-700"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {r.status !== "paid" && (
                            <button
                              type="button"
                              onClick={() => openPay(r)}
                              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-brand-dark via-brand to-sky-700 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:brightness-110"
                            >
                              <CreditCard size={13} /> Bayar
                            </button>
                          )}
                          {isStaff && r.status === "verifikasi" && (
                            <>
                              <button
                                type="button"
                                onClick={() => verifyBill(r, "approve")}
                                className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100"
                                title="Setujui Lunas"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => verifyBill(r, "reject")}
                                className="rounded-lg bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
                                title="Tolak Bukti"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          {isStaff && r.status !== "paid" && waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 hover:bg-emerald-100"
                              title="Kirim Pengingat WhatsApp"
                            >
                              <MessageCircle size={16} />
                            </a>
                          )}
                          {isStaff && (
                            <>
                              <button type="button" onClick={() => openCrud(r)} className="rounded-lg p-1.5 text-brand hover:bg-brand-50" title="Edit">
                                <Pencil size={15} />
                              </button>
                              <button type="button" onClick={() => deleteBill(r)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Hapus">
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination pagination={pagination} onPage={setPage} onLimit={(n) => { setLimit(n); setPage(1); }} />
      </div>

      <Modal open={!!payModal} title={`Bayar SPP: ${payModal?.title || ""}`} onClose={() => setPayModal(null)}>
        {payModal && (
          <form onSubmit={submitPay} className="space-y-3.5">
            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between font-bold text-slate-900">
                <span>{payModal.student_name}</span>
                <span className="text-brand-dark">{rp(Math.max(0, Number(payModal.amount || 0) - Number(payModal.discount || 0)))}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Transfer ke rekening resmi {bankInfo?.company || "PT. Adls Solusi Indonesia"} (
                {bankInfo?.accounts?.map((a) => `${a.bank} ${a.number} a.n. ${a.holder}`).join(" / ") || "BSI 7239458167 a.n. PT. Adls Solusi Indonesia"}
                ) lalu unggah bukti transfer di bawah ini.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Metode Transfer Rekening Resmi</label>
              <select className="input" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                {bankInfo?.accounts?.map((a) => (
                  <option key={a.id || a.number} value={`Transfer ${a.bank} (${a.number})`}>
                    Transfer {a.bank} - {a.number} ({a.holder})
                  </option>
                ))}
                <option value="QRIS PT. Adls Solusi Indonesia">QRIS PT. Adls Solusi Indonesia</option>
                <option value="Cash / Tunai">Cash / Tunai</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bukti Pembayaran *</label>
              <ImageUploadField allowPdf value={payForm.proof} onChange={(url) => setPayForm({ ...payForm, proof: url })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Catatan Pengirim</label>
              <input className="input" placeholder="mis. Transfer dari rekening Budi" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setPayModal(null)}>Batal</button>
              <button className="btn-primary" disabled={saving}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                Kirim Bukti Pembayaran
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={genModal} title="Generate Tagihan SPP Bulanan" onClose={() => setGenModal(false)}>
        <form onSubmit={generateBills} className="space-y-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bulan *</label>
              <DatePickerInput mode="month" required value={genForm.month} onChange={(val) => setGenForm({ ...genForm, month: val, due_date: val ? `${val}-10` : "" })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nominal SPP (Rp) *</label>
              <input type="number" required className="input" value={genForm.amount} onChange={(e) => setGenForm({ ...genForm, amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Judul Tagihan (opsional)</label>
            <input className="input" placeholder={`SPP Bulan ${genForm.month}`} value={genForm.title} onChange={(e) => setGenForm({ ...genForm, title: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Jatuh Tempo</label>
            <DatePickerInput mode="date" value={genForm.due_date} onChange={(val) => setGenForm({ ...genForm, due_date: val })} isClearable />
          </div>
          {isHQ && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Cabang (kosong = seluruh siswa aktif)</label>
              <AsyncResourceSelect
                endpoint={API_ENDPOINTS.BRANCHES.LIST}
                value={genForm.branch_id}
                initialLabel={genForm.branch_name}
                isClearable
                onChange={(opt) => setGenForm({ ...genForm, branch_id: opt ? opt.value : null, branch_name: opt ? opt.label : "" })}
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setGenModal(false)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Generate Sekarang
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!crudModal} title={crudModal?.row ? "Edit Tagihan SPP" : "Tambah Tagihan SPP"} onClose={() => setCrudModal(null)}>
        <form onSubmit={saveCrud} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Siswa *</label>
            <AsyncResourceSelect
              endpoint={API_ENDPOINTS.STUDENTS.LIST}
              value={crudForm.student_id}
              initialLabel={crudForm.student_name}
              formatOption={(s) => ({ value: s.id, label: [s.name, s.level, s.branch_name].filter(Boolean).join(" · "), raw: s })}
              onChange={(opt) =>
                setCrudForm((prev) => ({
                  ...prev,
                  student_id: opt ? opt.value : null,
                  student_name: opt ? opt.label : "",
                  branch_id: opt?.raw?.branch_id || prev.branch_id,
                  branch_name: opt?.raw?.branch_name || prev.branch_name,
                }))
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Judul Tagihan *</label>
              <input required className="input" value={crudForm.title} onChange={(e) => setCrudForm({ ...crudForm, title: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Bulan</label>
              <DatePickerInput mode="month" value={crudForm.month} onChange={(val) => setCrudForm({ ...crudForm, month: val })} isClearable />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nominal (Rp) *</label>
              <input type="number" required className="input" value={crudForm.amount} onChange={(e) => setCrudForm({ ...crudForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Potongan / Diskon (Rp)</label>
              <input type="number" className="input" value={crudForm.discount} onChange={(e) => setCrudForm({ ...crudForm, discount: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Jatuh Tempo</label>
              <DatePickerInput mode="date" value={crudForm.due_date} onChange={(val) => setCrudForm({ ...crudForm, due_date: val })} isClearable />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Status</label>
              <select className="input" value={crudForm.status} onChange={(e) => setCrudForm({ ...crudForm, status: e.target.value })}>
                <option value="unpaid">unpaid</option>
                <option value="verifikasi">verifikasi</option>
                <option value="paid">paid</option>
                <option value="overdue">overdue</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setCrudModal(null)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Simpan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Kelola Rekening Resmi */}
      <Modal
        open={manageBankModal}
        title="Kelola Rekening Resmi Pembayaran"
        onClose={() => { setManageBankModal(false); cancelEditBank(); }}
      >
        <div className="space-y-4">
          {/* List of Existing Accounts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Daftar Rekening Resmi ({bankAccounts.length})
              </h4>
            </div>

            {loadingAccounts ? (
              <div className="flex items-center justify-center p-6 text-slate-400">
                <Loader2 size={18} className="animate-spin mr-2" /> Memuat daftar rekening...
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                Belum ada rekening yang terdaftar. Tambahkan rekening baru di formulir bawah.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                {bankAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className={`flex items-center justify-between rounded-xl border p-3 transition ${
                      editingBank?.id === acc.id
                        ? "border-brand bg-brand-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-brand-100 px-2 py-0.5 text-xs font-extrabold text-brand-dark">
                          {acc.bank_name || acc.bank}
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {acc.account_number || acc.number}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        a.n. <span className="font-semibold text-slate-700">{acc.account_holder || acc.holder}</span>
                        {acc.company_name && acc.company_name !== (acc.account_holder || acc.holder) && (
                          <span className="text-[11px] text-slate-400"> ({acc.company_name})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => startEditBank(acc)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand transition"
                        title="Edit Rekening"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBank(acc)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
                        title="Hapus Rekening"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Tambah / Edit */}
          <form onSubmit={handleSaveBank} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-dark">
                {editingBank ? `Edit Rekening: ${editingBank.bank_name}` : "Tambah / Perbarui Rekening"}
              </span>
              {editingBank && (
                <button
                  type="button"
                  onClick={cancelEditBank}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Batal Edit (Mode Tambah)
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Pilihan Cepat Bank</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {["BSI", "BCA", "Mandiri", "BRI", "BNI", "CIMB Niaga", "Permata"].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBankForm({ ...bankForm, bank_name: b })}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      bankForm.bank_name === b
                        ? "bg-brand text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Bank *</label>
                <input
                  required
                  className="input !py-1.5 text-xs"
                  placeholder="mis. BSI"
                  value={bankForm.bank_name}
                  onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nomor Rekening *</label>
                <input
                  required
                  className="input !py-1.5 text-xs font-mono"
                  placeholder="mis. 7239458167"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Atas Nama (A.N.) *</label>
                <input
                  required
                  className="input !py-1.5 text-xs"
                  placeholder="mis. PT. Adls Solusi Indonesia"
                  value={bankForm.account_holder}
                  onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Lembaga / Perusahaan</label>
                <input
                  className="input !py-1.5 text-xs"
                  placeholder="mis. PT. Adls Solusi Indonesia"
                  value={bankForm.company_name}
                  onChange={(e) => setBankForm({ ...bankForm, company_name: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="btn-ghost !py-1.5 !text-xs"
                onClick={() => { setManageBankModal(false); cancelEditBank(); }}
              >
                Tutup
              </button>
              <button
                type="submit"
                className="btn-primary !py-1.5 !text-xs"
                disabled={savingBank}
              >
                {savingBank && <Loader2 size={13} className="animate-spin mr-1" />}
                {editingBank ? "Simpan Perubahan" : "Simpan Rekening"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

