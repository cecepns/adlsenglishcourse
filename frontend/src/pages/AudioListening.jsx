import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Headphones, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import AsyncResourceSelect from "@/components/AsyncResourceSelect";
import MediaUploadField from "@/components/MediaUploadField";
import Modal from "@/components/Modal";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const LEVELS = ["Semua", "Kids", "Teens", "Dewasa / Karyawan"];

export default function AudioListening() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("Semua");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: "", level: "Kids", module_name: "", audio_url: "", description: "", branch_id: null, branch_name: "" });
  const [saving, setSaving] = useState(false);

  const canManage = [...STAFF, "tutor"].includes(user.role);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.AUDIO_MATERIALS.LIST, {
        params: {
          limit: 100,
          search: debounced || undefined,
          level: levelFilter === "Semua" ? undefined : levelFilter,
        },
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
  }, [levelFilter, debounced]);

  const openModal = (row = null) => {
    setModal(row ? { row } : {});
    setForm(
      row
        ? {
            title: row.title || "",
            level: row.level || "Kids",
            module_name: row.module_name || "",
            audio_url: row.audio_url || "",
            description: row.description || "",
            branch_id: row.branch_id || null,
            branch_name: row.branch_name || "",
          }
        : {
            title: "",
            level: "Kids",
            module_name: "",
            audio_url: "",
            description: "",
            branch_id: user.branch_id || null,
            branch_name: user.branch_name || "",
          }
    );
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.audio_url.trim()) {
      toast.error("Judul dan file/link audio wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        level: form.level,
        module_name: form.module_name,
        audio_url: form.audio_url,
        description: form.description,
        branch_id: form.branch_id || null,
      };
      await request(
        () =>
          modal.row
            ? api.put(API_ENDPOINTS.AUDIO_MATERIALS.DETAIL(modal.row.id), payload)
            : api.post(API_ENDPOINTS.AUDIO_MATERIALS.LIST, payload),
        { success: getClosingGreeting(user.role, "Materi audio listening berhasil disimpan.") }
      );
      setModal(null);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const remove = (row) => {
    toast(
      (t) => (
        <div className="text-sm">
          <p className="mb-2 font-medium">Hapus materi audio "{row.title}"?</p>
          <div className="flex gap-2">
            <button
              className="btn-primary !bg-red-600 !px-3 !py-1"
              onClick={async () => {
                toast.dismiss(t.id);
                await request(() => api.delete(API_ENDPOINTS.AUDIO_MATERIALS.DETAIL(row.id)), {
                  success: getClosingGreeting(user.role, "Materi audio berhasil dihapus."),
                });
                load();
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

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Audio Listening Pembelajaran</h1>
          <p className="text-sm text-slate-500">Akses audio listening modul & QRIS langsung dari website resmi ADLS</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-60">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              className="input !pl-10"
              placeholder="Cari materi / modul..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canManage && (
            <button type="button" onClick={() => openModal(null)} className="btn-primary">
              <Plus size={16} /> Tambah Audio
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((lv) => (
          <button
            key={lv}
            type="button"
            onClick={() => setLevelFilter(lv)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              levelFilter === lv
                ? "bg-brand text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {lv}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card h-40 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center text-slate-400">
          <Headphones size={42} className="mb-2" />
          <p className="text-sm font-semibold">Belum ada materi audio listening</p>
          <p className="mt-1 text-xs">Tutor atau Admin dapat mengunggah rekaman audio (.mp3/.wav/.m4a) atau tautan modul QRIS.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((item) => {
            const url = resolveAssetUrl(item.audio_url);
            return (
              <div key={item.id} className="card flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                        <Headphones size={22} />
                      </span>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">{item.title}</h3>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700">{item.level || "Umum"}</span>
                          {item.module_name && <span className="font-semibold text-slate-500">· {item.module_name}</span>}
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => openModal(item)} className="rounded-lg p-1.5 text-brand hover:bg-brand-50" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => remove(item)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Hapus">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                  {item.description && <p className="mt-3 text-sm text-slate-600">{item.description}</p>}
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <audio controls src={url} className="h-10 w-full" preload="metadata" />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                  <span>Diunggah oleh {item.author_name || "Admin/Tutor"}</span>
                  <span>{item.branch_name || "Semua Cabang"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} title={modal?.row ? "Edit Audio Listening" : "Tambah Audio Listening"} onClose={() => setModal(null)}>
        <form onSubmit={save} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Judul Materi Audio *</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="mis. Listening Unit 1 - Greetings" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Level</label>
              <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="Kids">Kids</option>
                <option value="Teens">Teens</option>
                <option value="Dewasa / Karyawan">Dewasa / Karyawan</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Nama Modul / QRIS Modul</label>
              <input className="input" value={form.module_name} onChange={(e) => setForm({ ...form, module_name: e.target.value })} placeholder="mis. Modul QRIS Book 1" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">File Audio / Link *</label>
            <MediaUploadField mode="audio" value={form.audio_url} onChange={(url) => setForm({ ...form, audio_url: url })} />
          </div>
          {STAFF.includes(user.role) && user.role !== "admin_cabang" && (
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Cabang (opsional, kosong = semua)</label>
              <AsyncResourceSelect
                endpoint={API_ENDPOINTS.BRANCHES.LIST}
                value={form.branch_id}
                initialLabel={form.branch_name}
                isClearable
                onChange={(opt) => setForm({ ...form, branch_id: opt ? opt.value : null, branch_name: opt ? opt.label : "" })}
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Deskripsi / Instruksi</label>
            <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Simpan Audio
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

