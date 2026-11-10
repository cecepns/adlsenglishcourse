import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  Building2,
  ClipboardList,
  Copy,
  Loader2,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
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
const CATEGORIES = ["Semua", "Buku", "Merchandise"];
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

const ORDER_BADGE = {
  pending: "bg-amber-100 text-amber-700",
  paid: "bg-sky-100 text-sky-700",
  shipped: "bg-indigo-100 text-indigo-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function CatalogShop() {
  const { user } = useAuth();
  const isStaff = STAFF.includes(user.role);

  const [tab, setTab] = useState("catalog"); // catalog | orders
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const [ageGroup, setAgeGroup] = useState("Semua");
  const [category, setCategory] = useState("Semua");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  // Checkout Modal
  const [orderModal, setOrderModal] = useState(null);
  const [orderForm, setOrderForm] = useState({
    qty: 1,
    buyer_name: user.name || "",
    buyer_phone: "",
    branch_id: user.branch_id || null,
    branch_name: user.branch_name || "",
    payment_proof: "",
    notes: "",
  });

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
        params: { limit: 100, search: debounced || undefined },
      });
      setOrders(data.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api
      .get(API_ENDPOINTS.BILLS_BANK_INFO)
      .then((r) => setBankInfo(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "catalog") loadProducts();
    else loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, ageGroup, category, debounced]);

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
    });
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    setSaving(true);
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
          }),
        { success: getClosingGreeting(user.role, `Pesanan ${orderModal.name} berhasil dikirim!`) }
      );
      setOrderModal(null);
      loadProducts();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const openProdModal = (row = null) => {
    setProdModal(row ? { row } : {});
    setProdForm(
      row
        ? {
            name: row.name || "",
            category: row.category || "Merchandise",
            age_group: row.age_group || "Semua",
            price: row.price ?? "",
            stock: row.stock ?? "",
            image: row.image || "",
            description: row.description || "",
          }
        : {
            name: "",
            category: "Merchandise",
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
              className="btn-primary !bg-red-600 !px-3 !py-1"
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
                tab === "catalog" ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ShoppingBag size={14} /> Katalog Produk
            </button>
            <button
              type="button"
              onClick={() => setTab("orders")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                tab === "orders" ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ClipboardList size={14} /> Riwayat Order
            </button>
          </div>
          {isStaff && tab === "catalog" && (
            <button type="button" onClick={() => openProdModal(null)} className="btn-primary">
              <Plus size={16} /> Tambah Produk
            </button>
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
                    ageGroup === ag ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-bold uppercase text-slate-400">Kategori:</span>
              {CATEGORIES.map((cat) => (
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
                        className={`btn-primary flex-1 !py-2 text-xs ${outOfStock ? "!bg-slate-300 cursor-not-allowed" : ""}`}
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
        <div className="card overflow-hidden">
          {loading ? (
            <div className="space-y-2.5 p-5">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-slate-400">
              <PackageCheck size={40} />
              <span>Belum ada pesanan produk</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Produk</th>
                    <th className="px-4 py-3 font-bold">Pemesan</th>
                    <th className="px-4 py-3 font-bold">Cabang</th>
                    <th className="px-4 py-3 font-bold">Qty & Total</th>
                    <th className="px-4 py-3 font-bold">Bukti</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    {isStaff && <th className="px-4 py-3 text-right font-bold">Ubah Status</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const proofUrl = resolveAssetUrl(o.payment_proof);
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
                        </td>
                        <td className="px-4 py-3 text-slate-600">{o.branch_name || "Pusat"}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-brand-dark">{rp(o.total_price)}</div>
                          <div className="text-xs text-slate-500">{o.qty} pcs × {rp(o.unit_price)}</div>
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
                            {o.status}
                          </span>
                        </td>
                        {isStaff && (
                          <td className="px-4 py-3 text-right">
                            <select
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700"
                              value={o.status}
                              onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                            >
                              {["pending", "paid", "shipped", "completed", "cancelled"].map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
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
      )}

      <Modal open={!!orderModal} title={`Order Produk: ${orderModal?.name || ""}`} onClose={() => setOrderModal(null)}>
        {orderModal && (
          <form onSubmit={submitOrder} className="space-y-3.5">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
              <ProductImage src={orderModal.image} alt={orderModal.name} size="sm" />
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-900">{orderModal.name}</div>
                <div className="text-xs text-slate-500">{rp(orderModal.price)} / pcs · Stok: {orderModal.stock}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold uppercase text-slate-400">Total</div>
                <div className="text-base font-extrabold text-brand-dark">{rp((Number(orderForm.qty) || 1) * Number(orderModal.price || 0))}</div>
              </div>
            </div>

            {bankInfo?.accounts && (
              <div className="rounded-xl border border-brand-light/40 bg-brand-50/70 p-3 text-xs">
                <div className="mb-1.5 flex items-center gap-1.5 font-extrabold text-brand-dark">
                  <Building2 size={14} /> Transfer Pembayaran ke Rekening {bankInfo.company}
                </div>
                <div className="space-y-1">
                  {bankInfo.accounts.map((a) => (
                    <div key={a.number} className="flex items-center justify-between">
                      <span><b>{a.bank}</b> {a.number} ({a.holder})</span>
                      <button type="button" onClick={() => copyAcc(a.number)} className="inline-flex items-center gap-1 font-bold text-brand hover:underline">
                        <Copy size={12} /> Salin
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Jumlah (Qty) *</label>
                <input
                  type="number"
                  min="1"
                  max={orderModal.stock || 1}
                  required
                  className="input"
                  value={orderForm.qty}
                  onChange={(e) => setOrderForm({ ...orderForm, qty: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">No. WhatsApp Pemesan</label>
                <input
                  className="input"
                  placeholder="08..."
                  value={orderForm.buyer_phone}
                  onChange={(e) => setOrderForm({ ...orderForm, buyer_phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nama Pemesan / Siswa *</label>
              <input
                required
                className="input"
                value={orderForm.buyer_name}
                onChange={(e) => setOrderForm({ ...orderForm, buyer_name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Cabang Pengambilan</label>
              <AsyncResourceSelect
                endpoint={API_ENDPOINTS.PUBLIC_BRANCHES}
                value={orderForm.branch_id}
                initialLabel={orderForm.branch_name}
                isClearable
                onChange={(opt) => setOrderForm({ ...orderForm, branch_id: opt ? opt.value : null, branch_name: opt ? opt.label : "" })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Upload Bukti Transfer PT ADLS (opsional saat checkout)</label>
              <ImageUploadField allowPdf value={orderForm.payment_proof} onChange={(url) => setOrderForm({ ...orderForm, payment_proof: url })} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Catatan (Ukuran Kaos / Varian)</label>
              <input className="input" placeholder="mis. Ukuran L" value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-ghost" onClick={() => setOrderModal(null)}>Batal</button>
              <button className="btn-primary" disabled={saving}>
                {saving && <Loader2 size={15} className="animate-spin" />}
                Konfirmasi Order
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
              <label className="mb-1 block text-sm font-semibold text-slate-700">Kategori</label>
              <select className="input" value={prodForm.category} onChange={(e) => setProdForm({ ...prodForm, category: e.target.value })}>
                <option value="Merchandise">Merchandise</option>
                <option value="Buku">Buku</option>
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

