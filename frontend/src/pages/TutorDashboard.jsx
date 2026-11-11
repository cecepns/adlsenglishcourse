import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Headphones,
  Loader2,
  RefreshCw,
  Save,
  School,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting, getOpeningGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";

const ATT_OPTIONS = [
  { value: "hadir", label: "Hadir", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "izin", label: "Izin", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "sakit", label: "Sakit", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  { value: "alpha", label: "Alpha", cls: "bg-red-100 text-red-700 border-red-200" },
];

export default function TutorDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));

  const [classDetail, setClassDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [sharedMaterial, setSharedMaterial] = useState("");
  const [sharedHomework, setSharedHomework] = useState("");
  const [rows, setRows] = useState([]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.TUTOR_PORTAL.OVERVIEW);
      const ov = data.data;
      setOverview(ov);
      if (ov?.server_date) setSessionDate(ov.server_date);
      if (ov?.classes?.length && !ov.classes.some((c) => c.id === selectedClassId)) {
        setSelectedClassId(ov.classes[0].id);
      }
    } catch {
      setOverview({ branches: [], classes: [] });
    } finally {
      setLoading(false);
    }
  }, [selectedClassId]);

  const loadClassDetail = useCallback(async (clsId, dateStr) => {
    if (!clsId) {
      setClassDetail(null);
      setRows([]);
      return;
    }
    setDetailLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.TUTOR_PORTAL.CLASS_DETAIL(clsId), {
        params: { date: dateStr, month: String(dateStr || "").slice(0, 7) },
      });
      const detail = data.data;
      setClassDetail(detail);
      const list = detail?.students || [];
      const firstMaterial = list.find((s) => s.material)?.material || "";
      const firstHomework = list.find((s) => s.homework)?.homework || "";
      setSharedMaterial(firstMaterial);
      setSharedHomework(firstHomework);
      setRows(list);
    } catch {
      setClassDetail(null);
      setRows([]);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (selectedClassId) {
      loadClassDetail(selectedClassId, sessionDate);
    }
  }, [selectedClassId, sessionDate, loadClassDetail]);

  const handleClockIn = async (cls) => {
    setCheckingInId(cls.id);
    try {
      const res = await request(() => api.post(API_ENDPOINTS.TUTOR_PORTAL.CHECK_IN, { class_id: cls.id }));
      toast.success(getClosingGreeting("tutor", res?.message || `Absensi masuk kelas ${cls.class_type || cls.name} berhasil dicatat!`));
      await loadOverview();
      if (selectedClassId === cls.id) {
        await loadClassDetail(cls.id, sessionDate);
      }
    } catch {
      /* toast handled */
    } finally {
      setCheckingInId(null);
    }
  };

  const updateRow = (studentId, patch) => {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, ...patch } : r)));
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, attendance_status: "hadir" })));
  };

  const saveSession = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;
    if (!rows.length) {
      toast.error("Belum ada siswa aktif di kelas ini");
      return;
    }
    setSaving(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.TUTOR_PORTAL.SAVE_SESSION(selectedClassId), {
            date: sessionDate,
            report_month: sessionDate.slice(0, 7),
            material: sharedMaterial,
            homework: sharedHomework,
            entries: rows,
          }),
        { success: getClosingGreeting("tutor", "Absensi siswa & laporan nilai belajar berhasil disimpan!") }
      );
      await loadClassDetail(selectedClassId, sessionDate);
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const classes = overview?.classes || [];
  const branches = overview?.branches || [];

  return (
    <div className="space-y-5">
      {/* Header Gradient Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <Sparkles size={13} className="text-amber-300" />
              Portal Mengajar Tutor ADLS · 1 Akun Multi-Cabang
            </div>
            <h1 className="mt-2.5 text-xl font-extrabold sm:text-2xl">{getOpeningGreeting(user)}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-sky-100">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-white">
                <Clock size={13} /> Jam Server: {overview?.server_date || "-"} · {overview?.server_time || "--:--"} WIB
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 font-semibold text-white">
                <Building2 size={13} /> Mengajar di {branches.length} Cabang ({classes.length} Kelas Anda)
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <Link to="/audio" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25">
              <Headphones size={14} /> Audio Listening
            </Link>
            <Link to="/meetings" className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25">
              <Video size={14} /> Meeting Online
            </Link>
            <button
              type="button"
              onClick={loadOverview}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-brand-dark shadow-sm transition hover:bg-sky-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Daftar Kelas Khusus Tutor Ini (#7 Multi-Cabang) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Jadwal & Kelas Saya Hari Ini</h2>
            <p className="text-xs text-slate-500">Hanya menampilkan kelas milik Anda di semua cabang yang Anda ajar. Klik absen masuk real-time lalu isi nilai siswa di bawah.</p>
          </div>
          {branches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {branches.map((b) => (
                <span key={b.branch_name} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
                  {b.branch_name}: {b.class_count} kelas
                </span>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <div key={i} className="card h-44 animate-pulse bg-slate-100" />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="card flex flex-col items-center justify-center p-10 text-center text-slate-400">
            <School size={40} className="mb-2" />
            <p className="text-sm font-bold text-slate-600">Belum ada kelas yang ditugaskan kepada Anda</p>
            <p className="mt-1 text-xs">Admin Cabang atau Admin Pusat dapat menugaskan kelas ke akun Anda di menu Kelas.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((c) => {
              const selected = c.id === selectedClassId;
              const checkedIn = Boolean(c.today_att_id);
              const isLate = Number(c.today_late_minutes || 0) > 0;
              return (
                <div
                  key={c.id}
                  className={`card flex flex-col justify-between p-4 transition ${
                    selected ? "border-brand ring-2 ring-brand/20 shadow-md" : "hover:border-slate-300"
                  }`}
                >
                  <div onClick={() => setSelectedClassId(c.id)} className="cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                        <Building2 size={11} /> {c.branch_name || "Pusat"}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${c.type === "online" ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-700"}`}>
                        {c.type || "offline"}
                      </span>
                    </div>
                    <h3 className="mt-2.5 text-base font-extrabold text-slate-900">
                      {c.class_type || c.name} · <span className="text-brand">{c.level || "Umum"}</span>
                    </h3>
                    <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                      <div><b>Jadwal:</b> {c.schedule || "-"}</div>
                      <div className="flex items-center gap-1">
                        <Users size={13} className="text-brand" /> <b>{c.student_count}</b> siswa aktif terdaftar
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                    {checkedIn ? (
                      <div
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold ${
                          isLate ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 size={14} /> Masuk Pukul {c.today_check_in}
                        </span>
                        <span>{isLate ? `Telat ${c.today_late_minutes} mnt` : "Tepat Waktu"}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={checkingInId === c.id}
                        onClick={() => handleClockIn(c)}
                        className="btn-primary w-full !py-2 text-xs"
                      >
                        {checkingInId === c.id ? <Loader2 size={14} className="animate-spin" /> : <Clock size={14} />}
                        Absen Masuk Kelas (Real-Time)
                      </button>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedClassId(c.id)}
                        className={`flex-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          selected
                            ? "border-transparent bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {selected ? "Sedang Dibuka" : `Buka Daftar Siswa (${c.student_count})`}
                      </button>
                      {c.type === "online" && c.meeting_url && /^https?:\/\//i.test(c.meeting_url) && (
                        <a
                          href={c.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-xl border border-sky-200 bg-sky-50 p-1.5 text-sky-700 hover:bg-sky-100"
                          title="Buka Link Meeting"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Auto Class Roster: Input Materi + Absensi Siswa + Nilai Laporan Belajar (#8 & #9) */}
      {selectedClassId && (
        <div className="card overflow-hidden">
          <form onSubmit={saveSession}>
            <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-brand-50/40 p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpenCheck size={19} className="text-brand" />
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Lembar Mengajar: {classDetail?.class?.class_type || classDetail?.class?.name || "Memuat..."} ({classDetail?.class?.level || "-"})
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Cabang: <b>{classDetail?.class?.branch_name || "-"}</b> · Jadwal: {classDetail?.class?.schedule || "-"} · Daftar siswa & kolom nilai dari Admin Cabang tampil otomatis.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    className="input !w-auto text-xs font-semibold"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                  />
                  <button type="button" onClick={markAllPresent} className="btn-ghost !py-2 text-xs">
                    <CheckCircle2 size={14} /> Tandai Semua Hadir
                  </button>
                  <button type="submit" disabled={saving || !rows.length} className="btn-primary !py-2 text-xs">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Simpan Absensi & Nilai Kelas
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Materi yang Diajarkan Hari Ini</label>
                  <input
                    className="input"
                    placeholder="mis. Unit 3 - Describing Daily Activities & Speaking Practice"
                    value={sharedMaterial}
                    onChange={(e) => setSharedMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-slate-600">PR Anak (Pekerjaan Rumah - opsional)</label>
                  <input
                    className="input"
                    placeholder="mis. Latihan hal. 15-16 di Workbook"
                    value={sharedHomework}
                    onChange={(e) => setSharedHomework(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {detailLoading ? (
              <div className="space-y-2.5 p-5">{[...Array(4)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-400">
                <Users size={38} />
                <p className="text-sm font-semibold">Belum ada siswa aktif terdaftar di kelas ini</p>
                <p className="text-xs">Saat Admin memasukkan siswa ke kelas ini, seluruh nama siswa akan muncul otomatis di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-bold">No & Nama Siswa</th>
                      <th className="px-4 py-3 font-bold">Absensi</th>
                      <th className="px-3 py-3 font-bold w-24">Formatif</th>
                      <th className="px-3 py-3 font-bold w-24">Sumatif / UAS</th>
                      <th className="px-3 py-3 font-bold w-24">Speaking</th>
                      <th className="px-4 py-3 font-bold min-w-[200px]">Catatan Perkembangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((s, idx) => (
                      <tr key={s.student_id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900">{s.name}</div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span>{s.level || "-"}</span>
                                {s.report_id && (
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
                                    Kolom Nilai Siap
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {ATT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => updateRow(s.student_id, { attendance_status: opt.value })}
                                className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                                  s.attendance_status === opt.value
                                    ? opt.cls
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            className="input !px-2.5 !py-1.5 text-center text-xs font-bold"
                            value={s.formative_score}
                            onChange={(e) => updateRow(s.student_id, { formative_score: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            className="input !px-2.5 !py-1.5 text-center text-xs font-bold"
                            value={s.summative_score}
                            onChange={(e) => updateRow(s.student_id, { summative_score: e.target.value })}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            className="input !px-2.5 !py-1.5 text-center text-xs font-bold"
                            value={s.speaking_score}
                            onChange={(e) => updateRow(s.student_id, { speaking_score: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            className="input !px-2.5 !py-1.5 text-xs"
                            placeholder="Catatan / materi khusus siswa..."
                            value={s.notes}
                            onChange={(e) => updateRow(s.student_id, { notes: e.target.value })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
