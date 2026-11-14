import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  Calendar,
  Check,
  CheckSquare,
  ClipboardList,
  Copy,
  CreditCard,
  DollarSign,
  FolderPlus,
  Loader2,
  PackageCheck,
  Pencil,
  Percent,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  ShoppingCart,
  Square,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsyncResourceSelect from "@/components/AsyncResourceSelect";
import ImageUploadField from "@/components/ImageUploadField";
import Modal from "@/components/Modal";
import ProductImage from "@/components/ProductImage";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const AGE_TABS = ["Semua", "Anak", "Remaja", "Dewasa"];
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const ORDER_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  shipped: "bg-indigo-100 text-indigo-700",
  belum_lunas: "bg-orange-100 text-orange-800 border border-orange-200",
  belum_bayar: "bg-rose-100 text-rose-800 border border-rose-200",
  cancelled: "bg-red-100 text-red-700",
};

const ORDER_STATUS_TABS = [
  { id: "Semua", label: "Semua Status" },
  { id: "completed", label: "Selesai (Lunas)" },
  { id: "belum_lunas", label: "Belum Lunas" },
  { id: "belum_bayar", label: "Belum Bayar" },
  { id: "cancelled", label: "Dibatalkan" },
];

export default function CatalogShop() {
  const { user } = useAuth();
  const isStaff = STAFF.includes(user.role);

  const [tab, setTab] = useState("catalog"); // catalog | orders
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [ageGroup, setAgeGroup] = useState("Semua");
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  // Kategori Modal (#21)
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // Checkout Modal (Kas Mini POS)
  const [orderModal, setOrderModal] = useState(null);
  const [orderForm, setOrderForm] = useState({
    qty: 1,
    buyer_name: user.name || "",
    buyer_phone: "",
    branch_id: user.branch_id || null,
    branch_name: user.branch_name || "",
    payment_proof: "",
    notes: "",
    transaction_date: new Date().toISOString().slice(0, 16),
    cashier_name: user.name || "Pegawai Kasir",
    is_direct_payment: true,
    amount_paid: "",
    payment_method: "Cash",
    discount_type: "rupiah",
    discount_val: 0,
    tax_percent: 0,
    extra_fee: 0,
  });

  // Modal Biaya Tambahan (PPN & Ongkir / Ekstra)
  const [feeModal, setFeeModal] = useState(false);

  // Status Filter Pesanan
  const [orderStatusFilter, setOrderStatusFilter] = useState("Semua");

  // Modal Pelunasan Piutang / Belum Lunas
  const [settleModal, setSettleModal] = useState(null);
  const [settleForm, setSettleForm] = useState({ amount: "", payment_method: "Cash" });
  const [settling, setSettling] = useState(false);

  // Master Product CRUD Modal (Staff only)
  const [prodModal, setProdModal] = useState(null);
  const [prodForm, setProdForm] = useState({
    name: "",
    category: "Merchandise",
    age_group: "Semua",
    price: "",
    stock: "",
    image: "",
    description: "",
  });

  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await api.get(API_ENDPOINTS.PRODUCT_CATEGORIES.LIST);
      setCategoriesList(data.data || []);
    } catch {
      setCategoriesList([]);
    }
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.PRODUCTS.LIST, {
        params: {
          limit: 100,
          search: debounced || undefined,
          age_group: ageGroup === "Semua" ? undefined : ageGroup,
          category: category === "Semua" ? undefined : category,
        },
      });
      setProducts(data.data || []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.PRODUCT_ORDERS, {
        params: {
          limit: 100,
          search: debounced || undefined,
          status: orderStatusFilter === "Semua" ? undefined : orderStatusFilter,
        },
      });
      setOrders(data.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    api
      .get(API_ENDPOINTS.BILLS_BANK_INFO)
      .then((r) => setBankInfo(r.data.data))
      .catch(() => {});
  }, [loadCategories]);

  useEffect(() => {
    if (tab === "catalog") loadProducts();
    else loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ageGroup, category, debounced, orderStatusFilter]);

  const calcSubtotal = (prod, qty) => (Number(qty) || 1) * Number(prod?.price || 0);
  const calcDiscount = (subtotal, form) => {
    if (form.discount_type === "persen") {
      return (subtotal * (Number(form.discount_val) || 0)) / 100;
    }
    return Number(form.discount_val) || 0;
  };
  const calcTax = (subtotalAfterDisc, taxPercent) => {
    return (subtotalAfterDisc * (Number(taxPercent) || 0)) / 100;
  };
  const calcTotal = (prod, form) => {
    const sub = calcSubtotal(prod, form.qty);
    const disc = Math.min(sub, calcDiscount(sub, form));
    const afterDisc = Math.max(0, sub - disc);
    const tax = calcTax(afterDisc, form.tax_percent);
    const fee = Number(form.extra_fee) || 0;
    return Math.max(0, afterDisc + tax + fee);
  };

  const openOrder = (product) => {
    setOrderModal(product);
    setOrderForm({
      qty: 1,
      buyer_name: user.name || "",
      buyer_phone: "",
      branch_id: user.branch_id || null,
      branch_name: user.branch_name || "",
      payment_proof: "",
      notes: "",
      transaction_date: new Date().toISOString().slice(0, 16),
      cashier_name: user.name || "Pegawai Kasir",
      is_direct_payment: true,
      amount_paid: "",
      payment_method: "Cash",
      discount_type: "rupiah",
      discount_val: 0,
      tax_percent: 0,
      extra_fee: 0,
    });
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    setSaving(true);
    const subtotal = calcSubtotal(orderModal, orderForm.qty);
    const disc = Math.min(subtotal, calcDiscount(subtotal, orderForm));
    const tax = calcTax(Math.max(0, subtotal - disc), orderForm.tax_percent);
    const fee = Number(orderForm.extra_fee) || 0;
    const finalTotal = Math.max(0, subtotal - disc + tax + fee);
    const amtPaid = orderForm.is_direct_payment
      ? finalTotal
      : (orderForm.amount_paid !== "" ? Number(orderForm.amount_paid) : 0);

    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.PRODUCT_ORDERS, {
            product_id: orderModal.id,
            qty: Number(orderForm.qty) || 1,
            buyer_name: orderForm.buyer_name,
            buyer_phone: orderForm.buyer_phone,
            branch_id: orderForm.branch_id || null,
            payment_proof: orderForm.payment_proof,
            notes: orderForm.notes,
            transaction_date: orderForm.transaction_date,
            cashier_name: orderForm.cashier_name,
            is_direct_payment: orderForm.is_direct_payment ? 1 : 0,
            amount_paid: amtPaid,
            payment_method: orderForm.payment_method,
            discount_amount: disc,
            tax_amount: tax,
            extra_fee: fee,
          }),
        { success: getClosingGreeting(user.role, `Pesanan Kas Mini ${orderModal.name} berhasil diproses!`) }
      );
      setOrderModal(null);
      loadProducts();
      if (tab === "orders") loadOrders();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const openSettleModal = (order) => {
    const remaining = Math.max(0, Number(order.total_price || 0) - Number(order.amount_paid || 0));
    setSettleModal(order);
    setSettleForm({
      amount: remaining,
      payment_method: order.payment_method || "Cash",
    });
  };

  const submitSettle = async (e) => {
    e.preventDefault();
    if (!settleModal) return;
    setSettling(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.PRODUCT_ORDERS_SETTLE(settleModal.id), {
            amount: Number(settleForm.amount) || 0,
            payment_method: settleForm.payment_method,
          }),
        { success: getClosingGreeting(user.role, "Pembayaran pesanan berhasil dicatat!") }
      );
      setSettleModal(null);
      loadOrders();
    } catch {
      /* toast handled */
    } finally {
      setSettling(false);
    }
  };

  const openProdModal = (row = null) => {
    const defaultCat = categoriesList[0]?.name || "Merchandise";
    setProdModal(row ? { row } : {});
    setProdForm(
      row
        ? {
            name: row.name || "",
            category: row.category || defaultCat,
            age_group: row.age_group || "Semua",
            price: row.price ?? "",
            stock: row.stock ?? "",
            image: row.image || "",
            description: row.description || "",
          }
        : {
            name: "",
            category: defaultCat,
            age_group: "Semua",
            price: "",
            stock: "20",
            image: "",
            description: "",
          }
    );
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request(
        () =>
          prodModal.row
            ? api.put(API_ENDPOINTS.PRODUCTS.DETAIL(prodModal.row.id), prodForm)
            : api.post(API_ENDPOINTS.PRODUCTS.LIST, prodForm),
        { success: getClosingGreeting(user.role, "Produk katalog berhasil disimpan.") }
      );
      setProdModal(null);
      loadProducts();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = (row) => {
    toast(
      (t) => (
        <div className="text-sm">
          <p className="mb-2 font-medium">Hapus produk "{row.name}"?</p>
          <div className="flex gap-2">
            <button
              className="btn-primary !bg-none !bg-red-600 !px-3 !py-1"
              onClick={async () => {
                toast.dismiss(t.id);
                await request(() => api.delete(API_ENDPOINTS.PRODUCTS.DETAIL(row.id)), {
                  success: getClosingGreeting(user.role, "Produk berhasil dihapus."),
                });
                loadProducts();
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

  const updateOrderStatus = async (orderId, nextStatus) => {
    try {
      await request(() => api.put(`${API_ENDPOINTS.PRODUCT_ORDERS}/${orderId}`, { status: nextStatus }), {
        success: getClosingGreeting(user.role, "Status pesanan berhasil diperbarui."),
      });
      loadOrders();
    } catch {
      /* toast handled */
    }
  };

  const copyAcc = (text) => {
    navigator.clipboard?.writeText(text);
    toast.success(`Nomor rekening disalin: ${text}`);
  };

  const categoryTabs = ["Semua", ...categoriesList.map((c) => c.name)];
  const selectCategories = categoriesList.length
    ? categoriesList.map((c) => c.name)
    : ["Merchandise", "Buku"];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Katalog & Order Produk ADLS</h1>
          <p className="text-sm text-slate-500">ADLS Deo, Buku Tambahan, T-Shirt, Tas & perlengkapan belajar sesuai kelompok usia</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setTab("catalog")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === "catalog"
                  ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShoppingBag size={14} /> Katalog Produk
            </button>
            <button
              type="button"
              onClick={() => setTab("orders")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === "orders"
                  ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ClipboardList size={14} /> Riwayat Order
            </button>
          </div>
          {isStaff && tab === "catalog" && (
            <>
              <button type="button" onClick={() => setCatModal(true)} className="btn-ghost">
                <FolderPlus size={16} /> Kelola Kategori
              </button>
              <button type="button" onClick={() => openProdModal(null)} className="btn-primary">
                <Plus size={16} /> Tambah Produk
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        {tab === "catalog" ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-bold uppercase text-slate-400">Usia:</span>
              {AGE_TABS.map((ag) => (
                <button
                  key={ag}
                  type="button"
                  onClick={() => setAgeGroup(ag)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    ageGroup === ag
                      ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
            <div className="hidden h-4 w-px bg-slate-200 sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-bold uppercase text-slate-400">Kategori:</span>
              {categoryTabs.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    category === cat ? "bg-amber-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-500">Daftar pesanan produk ADLS & verifikasi pembayaran</div>
        )}
        <div className="relative w-full sm:w-60">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            className="input !pl-10"
            placeholder={tab === "catalog" ? "Cari produk..." : "Cari pemesan / produk..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {tab === "catalog" ? (
        loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-72 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <ShoppingBag size={42} className="mb-2" />
            <p className="text-sm font-semibold">Belum ada produk pada filter ini</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((p) => {
              const outOfStock = Number(p.stock || 0) <= 0;
              return (
                <div key={p.id} className="card group flex flex-col justify-between overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div>
                    <ProductImage src={p.image} alt={p.name} size="card" />
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {p.category && (
                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                          {p.category}
                        </span>
                      )}
                      {p.age_group && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                          Usia: {p.age_group}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-2 text-base font-extrabold text-slate-900">{p.name}</h3>
                    {p.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.description}</p>}
                  </div>

                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-extrabold text-brand-dark">{rp(p.price)}</span>
                      <span className={`text-xs font-bold ${outOfStock ? "text-red-500" : "text-emerald-600"}`}>
                        Stok: {p.stock ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={outOfStock}
                        onClick={() => openOrder(p)}
                        className={`btn-primary flex-1 !py-2 text-xs ${outOfStock ? "!bg-none !bg-slate-300 cursor-not-allowed" : ""}`}
                      >
                        <ShoppingCart size={14} /> {outOfStock ? "Stok Habis" : "Order Produk"}
                      </button>
                      {isStaff && (
                        <>
                          <button
                            type="button"
                            onClick={() => openProdModal(p)}
                            className="rounded-xl border border-slate-200 p-2 text-brand hover:bg-brand-50"
                            title="Edit Produk"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(p)}
                            className="rounded-xl border border-slate-200 p-2 text-red-500 hover:bg-red-50"
                            title="Hapus Produk"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {/* Status Filter Tabs (Selesai, Belum Lunas, Belum Bayar, Dibatalkan) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
              {ORDER_STATUS_TABS.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(st.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    orderStatusFilter === st.id
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total: {orders.length} transaksi
            </div>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="space-y-2.5 p-5">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-12 text-slate-400">
                <PackageCheck size={40} />
                <span>Tidak ada pesanan produk dengan filter ini</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">Produk</th>
                      <th className="px-4 py-3 font-bold">Pemesan & Kasir</th>
                      <th className="px-4 py-3 font-bold">Cabang</th>
                      <th className="px-4 py-3 font-bold">Rincian Pembayaran</th>
                      <th className="px-4 py-3 font-bold">Bukti</th>
                      <th className="px-4 py-3 font-bold">Status</th>
                      <th className="px-4 py-3 text-right font-bold">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => {
                      const proofUrl = resolveAssetUrl(o.payment_proof);
                      const isUnpaid = o.status === "belum_lunas" || o.status === "belum_bayar";
                      const sisa = Math.max(0, Number(o.total_price || 0) - Number(o.amount_paid || 0));
                      return (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <ProductImage src={o.product_image} alt={o.product_name} size="sm" />
                              <div>
                                <div className="font-bold text-slate-800">{o.product_name || `Produk #${o.product_id}`}</div>
                                <div className="text-xs text-slate-400">{o.notes || "-"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{o.buyer_name}</div>
                            <div className="text-xs text-slate-500">{o.buyer_phone || "-"}</div>
                            {o.cashier_name && (
                              <div className="mt-0.5 text-[11px] text-slate-400">Kasir: {o.cashier_name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{o.branch_name || "Pusat"}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-brand-dark">{rp(o.total_price)}</div>
                            <div className="text-xs text-slate-500">{o.qty} pcs · {o.payment_method || "Cash"}</div>
                            {isUnpaid && (
                              <div className="mt-0.5 text-xs font-bold text-rose-600">
                                Dibayar: {rp(o.amount_paid || 0)} · Sisa: {rp(sisa)}
                              </div>
                            )}
                          </td>
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
                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${ORDER_BADGE[o.status] || "bg-slate-100 text-slate-700"}`}>
                              {o.status === "completed" ? "Selesai" : o.status === "belum_lunas" ? "Belum Lunas" : o.status === "belum_bayar" ? "Belum Bayar" : o.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isStaff && isUnpaid && (
                                <button
                                  type="button"
                                  onClick={() => openSettleModal(o)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                                >
                                  <CreditCard size={12} /> Lunasi
                                </button>
                              )}
                              {isStaff && (
                                <select
                                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                                  value={o.status}
                                  onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                                >
                                  {["pending", "paid", "shipped", "completed", "belum_lunas", "belum_bayar", "cancelled"].map((st) => (
                                    <option key={st} value={st}>{st}</option>
                                  ))}
                                </select>
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
          </div>
        </div>
      )}

      {/* Modal Kelola Kategori Produk (#21) */}
      <Modal open={catModal} title="Kelola Kategori Produk" onClose={() => setCatModal(false)}>
        <div className="space-y-4">
          <form onSubmit={addCategory} className="flex gap-2">
            <input
              required
              className="input flex-1"
              placeholder="Nama kategori baru (mis. Seragam, Modul Grammar)"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <button className="btn-primary shrink-0" disabled={savingCat}>
              {savingCat ? <Loader2 size={14} className="animate-spin" /> : <Plus size={15} />}
              Tambah
            </button>
          </form>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase text-slate-400">Kategori Tersedia ({categoriesList.length})</div>
            {categoriesList.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada kategori</div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {categoriesList.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteCategory(c)}
                      className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                      title="Hapus kategori"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Checkout Kas Mini POS (Matching Screenshot ca2283b3.jpg & 52e4c05a.jpg) */}
      <Modal open={!!orderModal} title="Checkout · Kas Mini ADLS" onClose={() => setOrderModal(null)}>
        {orderModal && (() => {
          const subtotal = calcSubtotal(orderModal, orderForm.qty);
          const disc = Math.min(subtotal, calcDiscount(subtotal, orderForm));
          const afterDisc = Math.max(0, subtotal - disc);
          const tax = calcTax(afterDisc, orderForm.tax_percent);
          const fee = Number(orderForm.extra_fee) || 0;
          const finalTotal = Math.max(0, afterDisc + tax + fee);

          return (
            <form onSubmit={submitOrder} className="space-y-4">
              {/* Info Pelanggan & Produk */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <User size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      required
                      className="input !py-1 text-sm font-bold text-slate-900 bg-white"
                      placeholder="Nama Pelanggan / Siswa (mis. Mrs. Martha)"
                      value={orderForm.buyer_name}
                      onChange={(e) => setOrderForm({ ...orderForm, buyer_name: e.target.value })}
                    />
                    <input
                      className="input !py-0.5 mt-1 text-xs text-slate-600 bg-white"
                      placeholder="Nomor WhatsApp Pelanggan (08...)"
                      value={orderForm.buyer_phone}
                      onChange={(e) => setOrderForm({ ...orderForm, buyer_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 pt-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProductImage src={orderModal.image} alt={orderModal.name} size="sm" />
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-800 truncate">{orderModal.name}</div>
                      <div className="text-[11px] text-slate-500">{rp(orderModal.price)} / pcs</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <label className="text-xs font-semibold text-slate-600">Qty:</label>
                    <input
                      type="number"
                      min="1"
                      max={orderModal.stock || 1}
                      required
                      className="input !w-16 !py-1 text-center font-bold"
                      value={orderForm.qty}
                      onChange={(e) => setOrderForm({ ...orderForm, qty: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Keterangan */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Keterangan
                </label>
                <input
                  className="input !py-2 text-xs"
                  placeholder="Catatan pesanan / ukuran / instruksi khusus..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                />
              </div>

              {/* Tanggal Transaksi & Pegawai */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-600">
                    <Calendar size={13} className="text-brand" /> Tanggal Transaksi
                  </label>
                  <input
                    type="datetime-local"
                    className="input !py-1.5 text-xs"
                    value={orderForm.transaction_date}
                    onChange={(e) => setOrderForm({ ...orderForm, transaction_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-bold text-slate-600">
                    <User size={13} className="text-brand" /> Pegawai / Kasir
                  </label>
                  <input
                    className="input !py-1.5 text-xs"
                    value={orderForm.cashier_name}
                    onChange={(e) => setOrderForm({ ...orderForm, cashier_name: e.target.value })}
                    placeholder="Nama Kasir"
                  />
                </div>
              </div>

              {/* Toggle Langsung Bayar & Tombol Tambah Biaya Tambahan */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <button
                  type="button"
                  onClick={() => setOrderForm((prev) => ({ ...prev, is_direct_payment: !prev.is_direct_payment }))}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    orderForm.is_direct_payment
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white text-slate-700 border border-slate-300"
                  }`}
                >
                  {orderForm.is_direct_payment ? <CheckSquare size={16} /> : <Square size={16} />}
                  <span>{orderForm.is_direct_payment ? "✓ Langsung bayar (Lunas)" : "Tidak Langsung Bayar (Belum Lunas)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFeeModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand/40 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand-100/70"
                >
                  <Plus size={14} /> Tambah Biaya Tambahan
                  {(orderForm.tax_percent > 0 || orderForm.extra_fee > 0) && (
                    <span className="rounded-full bg-brand px-1.5 py-0.2 text-[10px] text-white">
                      Aktif
                    </span>
                  )}
                </button>
              </div>

              {/* Jika TIDAK Langsung Bayar: input uang muka */}
              {!orderForm.is_direct_payment && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span>Uang Muka / Dibayar Sekarang (Rp)</span>
                    <span className="text-[11px] text-amber-700 font-normal">Kosongkan jika Belum Bayar sama sekali (Rp 0)</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={finalTotal}
                    className="input !py-1.5 text-xs bg-white"
                    placeholder="mis. 20000 (Sisa akan dicatat sebagai Belum Lunas)"
                    value={orderForm.amount_paid}
                    onChange={(e) => setOrderForm({ ...orderForm, amount_paid: e.target.value })}
                  />
                </div>
              )}

              {/* Metode Bayar */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Metode Bayar
                </label>
                <select
                  className="input !py-2 text-xs"
                  value={orderForm.payment_method}
                  onChange={(e) => setOrderForm({ ...orderForm, payment_method: e.target.value })}
                >
                  <option value="Cash">Cash (Tunai)</option>
                  <option value="Transfer BCA">Transfer Bank BCA</option>
                  <option value="Transfer Mandiri">Transfer Bank Mandiri</option>
                  <option value="QRIS">QRIS / E-Wallet</option>
                </select>
              </div>

              {/* Diskon (Rupiah Rp / Persen %) */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Diskon Promo
                  </label>
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, discount_type: "rupiah" })}
                      className={`rounded px-2.5 py-0.5 ${
                        orderForm.discount_type === "rupiah" ? "bg-slate-800 text-white" : "text-slate-600"
                      }`}
                    >
                      {orderForm.discount_type === "rupiah" && "✓ "}Rupiah Rp
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, discount_type: "persen" })}
                      className={`rounded px-2.5 py-0.5 ${
                        orderForm.discount_type === "persen" ? "bg-slate-800 text-white" : "text-slate-600"
                      }`}
                    >
                      {orderForm.discount_type === "persen" && "✓ "}Persen %
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    className="input !py-1.5 text-xs"
                    placeholder={orderForm.discount_type === "persen" ? "mis. 10%" : "mis. 5000"}
                    value={orderForm.discount_val || ""}
                    onChange={(e) => setOrderForm({ ...orderForm, discount_val: e.target.value })}
                  />
                  <div className="pointer-events-none absolute right-3 top-2 text-xs font-bold text-slate-400">
                    {orderForm.discount_type === "persen" ? "%" : "Rp"}
                  </div>
                </div>
              </div>

              {/* Rincian Ringkasan Harga */}
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({orderForm.qty} pcs)</span>
                  <span className="font-semibold">{rp(subtotal)}</span>
                </div>
                {disc > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Diskon</span>
                    <span className="font-semibold">- {rp(disc)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>PPN ({orderForm.tax_percent}%)</span>
                    <span className="font-semibold">+ {rp(tax)}</span>
                  </div>
                )}
                {fee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Tambahan / Ongkir</span>
                    <span className="font-semibold">+ {rp(fee)}</span>
                  </div>
                )}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">Total Harga</div>
                  <div className="text-xl font-extrabold text-slate-900">{rp(finalTotal)}</div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-ghost !px-3" onClick={() => setOrderModal(null)}>
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:bg-emerald-700"
                  >
                    {saving && <Loader2 size={16} className="animate-spin" />}
                    <span>Bayar</span>
                  </button>
                </div>
              </div>
            </form>
          );
        })()}
      </Modal>

      {/* Modal Tambah Biaya Tambahan (PPN & Ongkir) */}
      <Modal open={feeModal} title="Tambah Biaya Tambahan" onClose={() => setFeeModal(false)}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
              PPN (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="input !py-2 text-xs"
                placeholder="mis. 11"
                value={orderForm.tax_percent || ""}
                onChange={(e) => setOrderForm({ ...orderForm, tax_percent: Number(e.target.value) || 0 })}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Biaya Tambahan / Ongkir (Rp)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                className="input !py-2 text-xs"
                placeholder="mis. 10000"
                value={orderForm.extra_fee || ""}
                onChange={(e) => setOrderForm({ ...orderForm, extra_fee: Number(e.target.value) || 0 })}
              />
              <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => setFeeModal(false)}
            >
              Simpan Biaya Tambahan
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Lunasi Pembayaran Pesanan */}
      <Modal open={!!settleModal} title="Lunasi Pembayaran Pesanan" onClose={() => setSettleModal(null)}>
        {settleModal && (
          <form onSubmit={submitSettle} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3.5 space-y-1.5 text-xs">
              <div className="font-bold text-slate-900">{settleModal.product_name || `Produk #${settleModal.product_id}`}</div>
              <div className="text-slate-600">Pemesan: <b>{settleModal.buyer_name}</b></div>
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5">
                <span>Total Harga:</span>
                <span className="font-bold text-slate-900">{rp(settleModal.total_price)}</span>
              </div>
              <div className="flex justify-between">
                <span>Sudah Dibayar:</span>
                <span className="font-bold text-emerald-700">{rp(settleModal.amount_paid || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600">
                <span>Sisa Tunggakan:</span>
                <span>{rp(Math.max(0, Number(settleModal.total_price || 0) - Number(settleModal.amount_paid || 0)))}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Jumlah Pembayaran Sekarang (Rp) *
              </label>
              <input
                type="number"
                min="1"
                required
                className="input"
                value={settleForm.amount}
                onChange={(e) => setSettleForm({ ...settleForm, amount: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Metode Pembayaran
              </label>
              <select
                className="input"
                value={settleForm.payment_method}
                onChange={(e) => setSettleForm({ ...settleForm, payment_method: e.target.value })}
              >
                <option value="Cash">Cash (Tunai)</option>
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="Transfer Mandiri">Transfer Mandiri</option>
                <option value="QRIS">QRIS</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setSettleModal(null)}>
                Batal
              </button>
              <button className="btn-primary" disabled={settling}>
                {settling && <Loader2 size={15} className="animate-spin" />}
                Catat Pelunasan
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!prodModal} title={prodModal?.row ? "Edit Produk Katalog" : "Tambah Produk Katalog"} onClose={() => setProdModal(null)}>
        <form onSubmit={saveProduct} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Nama Produk *</label>
            <input required className="input" value={prodForm.name} onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })} placeholder="mis. ADLS Deo / Buku Tambahan / T-Shirt" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Gambar Produk</label>
            <ImageUploadField value={prodForm.image} onChange={(url) => setProdForm({ ...prodForm, image: url })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">Kategori</label>
                <button
                  type="button"
                  onClick={() => setCatModal(true)}
                  className="text-[11px] font-bold text-brand hover:underline"
                >
                  + Kategori Baru
                </button>
              </div>
              <select className="input" value={prodForm.category} onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}>
                {prodForm.category && !selectCategories.includes(prodForm.category) && (
                  <option value={prodForm.category}>{prodForm.category}</option>
                )}
                {selectCategories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Kelompok Usia</label>
              <select className="input" value={prodForm.age_group} onChange={(e) => setProdForm({ ...prodForm, age_group: e.target.value })}>
                <option value="Semua">Semua</option>
                <option value="Anak">Anak</option>
                <option value="Remaja">Remaja</option>
                <option value="Dewasa">Dewasa</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Harga (Rp) *</label>
              <input type="number" required className="input" value={prodForm.price} onChange={(e) => setProdForm({ ...prodForm, price: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Stok *</label>
              <input type="number" required className="input" value={prodForm.stock} onChange={(e) => setProdForm({ ...prodForm, stock: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Deskripsi</label>
            <textarea rows={2} className="input" value={prodForm.description} onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setProdModal(null)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Simpan Produk
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
