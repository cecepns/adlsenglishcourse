import { useEffect, useState } from "react";
import { ExternalLink, Link2, Loader2, RefreshCw, Search, Video } from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import useDebounce from "@/hooks/useDebounce";
import Modal from "@/components/Modal";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

export default function Meetings() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("online");
  const [classTypeFilter, setClassTypeFilter] = useState("Semua Tipe");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 300);

  const [editModal, setEditModal] = useState(null);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [classType, setClassType] = useState("online");
  const [saving, setSaving] = useState(false);

  const canManage = [...STAFF, "tutor"].includes(user.role);

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 100, search: debounced || undefined };
      if (filterType !== "all") params.type = filterType;
      const { data } = await api.get(API_ENDPOINTS.CLASSES.LIST, { params });
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
  }, [filterType, debounced]);

  const openEdit = (row) => {
    setEditModal(row);
    setMeetingUrl(row.meeting_url || "");
    setClassType(row.type || "online");
  };

  const saveUrl = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request(
        () => api.put(API_ENDPOINTS.CLASSES.DETAIL(editModal.id), { meeting_url: meetingUrl, type: classType }),
        { success: getClosingGreeting(user.role, "Link class meeting berhasil diperbarui.") }
      );
      setEditModal(null);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const displayRows = rows.filter((r) => {
    if (classTypeFilter === "Semua Tipe") return true;
    const typeStr = (r.class_type || r.name || "").toLowerCase();
    return typeStr.includes(classTypeFilter.toLowerCase());
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Class Meeting Online</h1>
          <p className="text-sm text-slate-500">Ruang kelas online resmi ADLS English Course untuk Tutor dan Siswa</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            {[
              { id: "online", label: "Kelas Online" },
              { id: "all", label: "Semua Kelas" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  filterType === tab.id ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative w-56">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              className="input !pl-10"
              placeholder="Cari kelas / tutor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={load} className="btn-ghost !py-2.5" aria-label="Refresh">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Pengelompokan Berdasarkan Type Kelas (PDF Hal 1 Item 5) */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <span className="text-xs font-bold text-slate-500 px-2">Type Kelas:</span>
        {["Semua Tipe", "Regular", "Private", "Intensive"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setClassTypeFilter(t)}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
              classTypeFilter === t
                ? "bg-brand text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-44 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : displayRows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center p-12 text-center text-slate-400">
          <Video size={42} className="mb-2" />
          <p className="text-sm font-semibold">Tidak ada kelas yang cocok dengan filter ({classTypeFilter})</p>
          <p className="mt-1 text-xs">Pilih "Semua Tipe" atau ubah kata kunci pencarian.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayRows.map((c) => {
            const hasUrl = Boolean(c.meeting_url && /^https?:\/\//i.test(c.meeting_url));
            return (
              <div key={c.id} className="card flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                      <Video size={20} />
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                        c.type === "online" ? "bg-sky-100 text-sky-700" : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {c.type || "offline"}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                    {c.class_type && c.class_type !== c.name ? `${c.class_type} · ${c.name}` : c.class_type || c.name}
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-brand">{c.level || "Umum"}</p>
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div><span className="font-semibold">Jadwal:</span> {c.schedule || "-"}</div>
                    <div><span className="font-semibold">Tutor:</span> {c.tutor_name || "-"}</div>
                    <div><span className="font-semibold">Cabang:</span> {c.branch_name || "Pusat"}</div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {hasUrl ? (
                    <a
                      href={c.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary flex-1 !py-2 text-xs"
                    >
                      <ExternalLink size={14} /> Gabung Kelas Online
                    </a>
                  ) : (
                    <span className="flex-1 text-xs font-medium text-slate-400">
                      {c.meeting_url ? c.meeting_url : "Link meeting belum diset"}
                    </span>
                  )}
                  {canManage && (
                    <button type="button" onClick={() => openEdit(c)} className="btn-ghost !px-3 !py-2 text-xs">
                      <Link2 size={14} /> Atur Link
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!editModal} title={`Atur Class Meeting: ${editModal?.name || ""}`} onClose={() => setEditModal(null)}>
        <form onSubmit={saveUrl} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Tipe Kelas</label>
            <select className="input" value={classType} onChange={(e) => setClassType(e.target.value)}>
              <option value="online">online</option>
              <option value="offline">offline</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Link Meeting Resmi (Zoom / Google Meet)</label>
            <input
              type="url"
              className="input"
              placeholder="https://meet.google.com/xxx-yyyy-zzz"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditModal(null)}>Batal</button>
            <button className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={15} className="animate-spin" />}
              Simpan Link
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

