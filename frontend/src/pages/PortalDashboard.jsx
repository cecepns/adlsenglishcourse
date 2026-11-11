import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Award,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CalendarOff,
  CheckCircle2,
  CreditCard,
  Download,
  ExternalLink,
  Film,
  GraduationCap,
  Headphones,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getClosingGreeting, getOpeningGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";
import { CLASS_TYPES, COURSE_LEVELS } from "@/config/resources";
import { useAuth } from "@/context/AuthContext";
import Modal from "@/components/Modal";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function PortalDashboard() {
  const { user } = useAuth();
  const isParent = user.role === "ortu";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [branches, setBranches] = useState([]);

  // Modal Tambah Anak (#19 1 Akun Ortu Multi-Anak)
  const [childModal, setChildModal] = useState(false);
  const [childForm, setChildForm] = useState({
    name: "",
    class_type: "Regular",
    level: COURSE_LEVELS[0],
    branch_id: user.branch_id ? String(user.branch_id) : "",
  });
  const [savingChild, setSavingChild] = useState(false);

  // Modal E-Sertifikat (#16)
  const [certModal, setCertModal] = useState(null);
  const [certLoadingId, setCertLoadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.PORTAL_SUMMARY, {
        params: selectedStudentId ? { student_id: selectedStudentId } : {},
      });
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isParent) return;
    api
      .get(API_ENDPOINTS.PUBLIC_BRANCHES)
      .then((r) => setBranches(r.data.data || []))
      .catch(() => {});
  }, [isParent]);

  const submitAddChild = async (e) => {
    e.preventDefault();
    if (!childForm.name.trim()) {
      toast.error("Nama anak wajib diisi");
      return;
    }
    setSavingChild(true);
    try {
      await request(
        () =>
          api.post(API_ENDPOINTS.PORTAL_ADD_CHILD, {
            name: childForm.name,
            class_type: childForm.class_type,
            level: childForm.level,
            branch_id: childForm.branch_id ? Number(childForm.branch_id) : null,
          }),
        { success: getClosingGreeting(user.role, `Ananda ${childForm.name} berhasil ditambahkan ke akun Anda!`) }
      );
      setChildModal(false);
      setChildForm({
        name: "",
        class_type: "Regular",
        level: COURSE_LEVELS[0],
        branch_id: user.branch_id ? String(user.branch_id) : "",
      });
      load();
    } catch {
      /* toast handled */
    } finally {
      setSavingChild(false);
    }
  };

  const handleCertChoice = async (student, choice) => {
    setCertLoadingId(student.id);
    try {
      await request(
        () => api.post(API_ENDPOINTS.PORTAL_CERTIFICATE_CHOICE, { student_id: student.id, choice }),
        {
          success:
            choice === "pickup_pusat"
              ? getClosingGreeting(user.role, "Pilihan ambil sertifikat di Admin Pusat (Dedaun) berhasil disimpan.")
              : getClosingGreeting(user.role, "E-Sertifikat siap diunduh!"),
        }
      );
      await load();
      if (choice === "download") {
        const res = await api.get(API_ENDPOINTS.PORTAL_CERTIFICATE(student.id));
        setCertModal(res.data.data);
      }
    } catch {
      /* toast handled */
    } finally {
      setCertLoadingId(null);
    }
  };

  const downloadHtmlCert = (cert) => {
    const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8" /><title>E-Sertifikat ADLS - ${cert.student_name}</title>
<style>
  body { font-family: Georgia, serif; background: #f8fafc; margin: 0; padding: 32px; color: #0f172a; }
  .cert { max-width: 820px; margin: 0 auto; background: #fff; border: 10px double #1e3a5f; padding: 48px; text-align: center; box-shadow: 0 12px 32px rgba(0,0,0,0.08); }
  .brand { color: #2a5885; font-size: 14px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; }
  h1 { font-size: 36px; margin: 12px 0 6px; color: #1e3a5f; }
  .sub { font-size: 15px; color: #475569; margin-bottom: 28px; }
  .name { font-size: 32px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #cbd5e1; display: inline-block; padding: 0 24px 8px; margin: 8px 0 16px; }
  .meta { font-size: 15px; line-height: 1.7; color: #334155; }
  .foot { margin-top: 40px; display: flex; justify-content: space-between; font-size: 13px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 16px; }
</style></head>
<body>
  <div class="cert">
    <div class="brand">PT ADLS English Course · Official E-Certificate</div>
    <h1>CERTIFICATE OF COMPLETION</h1>
    <div class="sub">Diberikan dengan bangga kepada:</div>
    <div class="name">${cert.student_name}</div>
    <div class="meta">
      Telah menyelesaikan program kursus Bahasa Inggris<br/>
      <b>Type Kelas:</b> ${cert.class_type} &nbsp;·&nbsp; <b>Level:</b> ${cert.level}<br/>
      <b>Cabang:</b> ${cert.branch_name} &nbsp;·&nbsp; <b>Tanggal Lulus:</b> ${String(cert.completed_at || "").slice(0, 10)}
    </div>
    <div class="foot">
      <span>Kode Sertifikat: <b>${cert.certificate_code}</b></span>
      <span>Admin Pusat ADLS (Dedaun)</span>
    </div>
  </div>
</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `E-Sertifikat-ADLS-${cert.student_name.replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const students = data?.students || [];
  const primary = students[0];
  const att = data?.attendance || { total: 0, hadir: 0, rate: 0 };
  const bills = data?.bills || { unpaidCount: 0, verifikasiCount: 0, unpaidAmount: 0, paidCount: 0 };
  const ach = data?.achievements || { uas100Count: 0, freeSppEarned: 0, claimedFreeSpp: 0, progressToNext: 0 };
  const recentReports = data?.recentReports || [];
  const announcements = data?.announcements || [];
  const pct = Math.min(100, Math.round((ach.progressToNext / 20) * 100));

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-brand-dark via-brand to-sky-700 p-5 text-white shadow-md sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
              <Sparkles size={13} className="text-amber-300" />
              {user.role === "siswa" ? "Portal Siswa Mandiri & Kelas Karyawan" : "Portal Orang Tua ADLS · 1 Akun Multi-Anak"}
            </div>
            <h1 className="mt-2.5 text-xl font-extrabold sm:text-2xl">{getOpeningGreeting(user)}</h1>
            {primary ? (
              <p className="mt-1 text-sm text-sky-100">
                Siswa terhubung ({students.length}):{" "}
                <span className="font-bold text-white">
                  {students.map((s) => `${s.name} (${s.level || "Reguler"})`).join(", ")}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-sky-100">
                Jika profil siswa belum tertaut dengan akun Anda, hubungi Admin Cabang atau gunakan tombol Tambah Anak.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            {isParent && (
              <button
                type="button"
                onClick={() => setChildModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-brand-dark shadow-sm transition hover:bg-sky-50"
              >
                <Plus size={14} /> Tambah Anak
              </button>
            )}
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* #19 Switcher Multi-Anak pada 1 Email Orang Tua */}
      {isParent && students.length > 1 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-3.5 sm:px-5">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-600">
            <Users size={16} className="text-brand" /> Pilih Anak (1 Akun):
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedStudentId("")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                selectedStudentId === ""
                  ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua Anak ({students.length})
            </button>
            {students.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStudentId(String(s.id))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                  String(selectedStudentId) === String(s.id)
                    ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <CalendarCheck size={16} className="text-emerald-600" /> Kehadiran
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{att.rate}%</div>
          <div className="text-xs text-slate-500">{att.hadir} hadir dari {att.total} sesi</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Receipt size={16} className="text-rose-600" /> Tagihan SPP
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{rp(bills.unpaidAmount)}</div>
          <div className="text-xs text-slate-500">{bills.unpaidCount} belum lunas · {bills.verifikasiCount} verifikasi</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Trophy size={16} className="text-amber-600" /> Nilai UAS 100
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{ach.uas100Count}x</div>
          <div className="text-xs text-slate-500">Progres Free SPP: {ach.progressToNext} / 20</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
            <Film size={16} className="text-indigo-600" /> Project Video
          </div>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">{data?.videoCount ?? 0}</div>
          <div className="text-xs text-slate-500">Video bulanan terkumpul</div>
        </div>
      </div>

      {/* Quick Actions: #4 Sembunyikan Class Meeting Online dari Portal Ortu */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/bills" className="card flex items-center gap-3 p-4 transition hover:border-brand">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600"><CreditCard size={20} /></span>
          <div>
            <div className="text-sm font-bold text-slate-900">Bayar SPP (PT ADLS)</div>
            <div className="text-xs text-slate-500">Lihat rekening & upload bukti</div>
          </div>
        </Link>
        <Link to="/videos" className="card flex items-center gap-3 p-4 transition hover:border-brand">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Film size={20} /></span>
          <div>
            <div className="text-sm font-bold text-slate-900">Upload Project Video</div>
            <div className="text-xs text-slate-500">Tugas video tiap bulan</div>
          </div>
        </Link>
        {!isParent ? (
          <Link to="/meetings" className="card flex items-center gap-3 p-4 transition hover:border-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Video size={20} /></span>
            <div>
              <div className="text-sm font-bold text-slate-900">Class Meeting Online</div>
              <div className="text-xs text-slate-500">Gabung sesi kelas online</div>
            </div>
          </Link>
        ) : (
          <Link to="/leaves" className="card flex items-center gap-3 p-4 transition hover:border-brand">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><CalendarOff size={20} /></span>
            <div>
              <div className="text-sm font-bold text-slate-900">Izin / Ket. Sakit Anak</div>
              <div className="text-xs text-slate-500">Ajukan izin tidak masuk kelas</div>
            </div>
          </Link>
        )}
        <Link to="/shop" className="card flex items-center gap-3 p-4 transition hover:border-brand">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ShoppingBag size={20} /></span>
          <div>
            <div className="text-sm font-bold text-slate-900">Order Produk ADLS</div>
            <div className="text-xs text-slate-500">Deo, Buku, Kaos & Tas</div>
          </div>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">PR Anak & Hasil Ujian (Formatif / Sumatif)</h3>
              <p className="text-xs text-slate-500">Laporan materi, PR rumah, dan nilai bulanan terbaru</p>
            </div>
            <Link to="/learning_reports" className="text-xs font-bold text-brand hover:underline">Lihat Semua</Link>
          </div>
          {recentReports.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              <BookOpenCheck size={32} className="mx-auto mb-2" />
              Belum ada laporan belajar terbaru
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentReports.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-brand">{r.report_month} · {r.student_name}</span>
                    <span className="text-slate-400">{r.class_name || "-"}</span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-800">{r.material || "Evaluasi Bulanan"}</div>
                  {r.homework && <div className="mt-1 text-xs font-semibold text-amber-700">PR: {r.homework}</div>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                      Formatif: <b>{r.formative_score ?? "-"}</b>
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                      Sumatif/UAS: <b>{r.summative_score ?? "-"}</b>
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                      Speaking: <b>{r.speaking_score ?? "-"}</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">Progres Reward 20x Nilai UAS 100</h3>
              </div>
              <Link to="/achievements" className="text-xs font-bold text-brand hover:underline">Detail</Link>
            </div>
            <p className="mt-1 text-xs text-slate-500">Kumpulkan 20x nilai Sumatif/UAS 100 untuk Gratis 1x SPP!</p>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs font-bold text-slate-700">
                <span>Progres siklus saat ini: {ach.progressToNext} / 20</span>
                <span>{pct}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-dark via-brand to-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Total diperoleh: <b>{ach.freeSppEarned}x Free SPP</b> · Sudah diklaim: <b>{ach.claimedFreeSpp}x</b>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-brand" />
                <h3 className="text-base font-extrabold text-slate-900">Pusat Informasi Terbaru</h3>
              </div>
              <Link to="/announcements" className="text-xs font-bold text-brand hover:underline">Semua Info</Link>
            </div>
            {announcements.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-400">Belum ada pengumuman terbaru</div>
            ) : (
              <div className="space-y-2.5">
                {announcements.map((a) => (
                  <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 font-bold text-brand">{a.info_type || "Pengumuman"}</span>
                      <span className="text-slate-400">{a.event_date ? String(a.event_date).slice(0, 10) : ""}</span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-800">{a.title}</div>
                    {a.body && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{a.body}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Headphones size={20} className="text-brand" />
              <div>
                <div className="text-sm font-bold text-slate-900">Audio Listening & Materi QRIS</div>
                <div className="text-xs text-slate-500">{primary?.level ? `Level: ${primary.level}` : "Akses materi listening modul"}</div>
              </div>
            </div>
            <Link to="/audio" className="btn-ghost !px-3 !py-1.5 text-xs">Buka Audio</Link>
          </div>
        </div>
      </div>

      {/* #4 Profil Siswa & Kelas (Ortu: Kelas, Level, Jadwal, Cabang, Tipe saja — tanpa tutor & link meeting) + #16 Sertifikat */}
      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-brand" />
            <h3 className="text-base font-extrabold text-slate-900">
              {isParent ? "Profil Anak, Jadwal Kelas & Sertifikat Kelulusan" : "Profil Siswa, Jadwal & Sertifikat Kelulusan"}
            </h3>
          </div>
          {isParent && (
            <button type="button" onClick={() => setChildModal(true)} className="btn-ghost !px-3 !py-1.5 text-xs">
              <Plus size={14} /> Tambah Anak (1 Akun)
            </button>
          )}
        </div>

        {students.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">Belum ada profil siswa terhubung dengan akun ini.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {students.map((s) => {
              const completed = Number(s.course_completed) === 1;
              return (
                <div key={s.id} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-extrabold text-slate-900">{s.name}</span>
                      <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                        {s.level || "-"}
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600">
                      <div><span className="font-semibold text-slate-500">Type Kelas:</span> <b>{s.class_type || s.class_name || "-"}</b></div>
                      <div><span className="font-semibold text-slate-500">Tipe:</span> <b className="capitalize">{s.class_mode || "offline"}</b></div>
                      <div><span className="font-semibold text-slate-500">Jadwal:</span> <b>{s.schedule || "-"}</b></div>
                      <div><span className="font-semibold text-slate-500">Cabang:</span> <b>{s.branch_name || "-"}</b></div>
                    </div>

                    {/* Hanya tampil untuk Siswa mandiri (bukan Ortu per #4) */}
                    {!isParent && s.tutor_name && (
                      <div className="mt-1.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-500">Tutor:</span> <b>{s.tutor_name}</b>
                      </div>
                    )}
                    {!isParent && s.meeting_url && /^https?:\/\//i.test(s.meeting_url) && (
                      <div className="mt-2">
                        <a
                          href={s.meeting_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                        >
                          <ExternalLink size={13} /> Link Class Meeting
                        </a>
                      </div>
                    )}
                  </div>

                  {/* #16 Pilihan E-Sertifikat / Ambil di Admin Pusat (Dedaun) */}
                  <div className="mt-4 border-t border-slate-200/80 pt-3">
                    {completed ? (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-700">
                            <CheckCircle2 size={13} /> Course Selesai ({String(s.completed_at || "").slice(0, 10) || "Lulus"})
                          </span>
                          {s.certificate_delivery && (
                            <span className="font-bold text-brand-dark">
                              {s.certificate_delivery === "pickup_pusat"
                                ? "Pilihan: Ambil di Admin Pusat (Dedaun)"
                                : "Pilihan: Download E-Sertifikat"}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={certLoadingId === s.id}
                            onClick={() => handleCertChoice(s, "download")}
                            className="btn-primary flex-1 !py-2 text-xs"
                          >
                            {certLoadingId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                            Download E-Sertifikat
                          </button>
                          <button
                            type="button"
                            disabled={certLoadingId === s.id}
                            onClick={() => handleCertChoice(s, "pickup_pusat")}
                            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
                              s.certificate_delivery === "pickup_pusat"
                                ? "border-amber-400 bg-amber-50 text-amber-800"
                                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            <MapPin size={14} /> Ambil di Admin Pusat (Dedaun)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Award size={14} className="shrink-0 text-slate-400" />
                        <span>Course berjalan — opsi Download E-Sertifikat / Ambil di Admin Pusat (Dedaun) aktif otomatis saat course selesai.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Tambah Anak (#19 Multi-Anak 1 Akun Ortu) */}
      <Modal open={childModal} title="Tambah Anak di Akun Orang Tua" onClose={() => setChildModal(false)}>
        <form onSubmit={submitAddChild} className="space-y-3.5">
          <div className="rounded-xl bg-brand-50/70 p-3 text-xs text-slate-700">
            Cukup 1 email Orang Tua untuk memantau beberapa anak sekaligus tanpa perlu membuat akun baru.
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Nama Lengkap Anak *</label>
            <input
              required
              className="input"
              placeholder="mis. Adik Bintang"
              value={childForm.name}
              onChange={(e) => setChildForm({ ...childForm, name: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Type Kelas *</label>
              <select
                className="input"
                value={childForm.class_type}
                onChange={(e) => setChildForm({ ...childForm, class_type: e.target.value })}
              >
                {CLASS_TYPES.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Level *</label>
              <select
                className="input"
                value={childForm.level}
                onChange={(e) => setChildForm({ ...childForm, level: e.target.value })}
              >
                {COURSE_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">Cabang</label>
            <select
              className="input"
              value={childForm.branch_id}
              onChange={(e) => setChildForm({ ...childForm, branch_id: e.target.value })}
            >
              <option value="">-- Pilih Cabang --</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.city ? `${b.name} (${b.city})` : b.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setChildModal(false)}>Batal</button>
            <button className="btn-primary" disabled={savingChild}>
              {savingChild && <Loader2 size={15} className="animate-spin" />}
              Tambahkan Anak
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Preview & Download E-Sertifikat (#16) */}
      <Modal open={!!certModal} title="E-Sertifikat Kelulusan ADLS" onClose={() => setCertModal(null)}>
        {certModal && (
          <div className="space-y-4">
            <div className="rounded-2xl border-4 border-double border-brand-dark bg-gradient-to-br from-white via-sky-50/40 to-amber-50/40 p-6 text-center shadow-inner">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-brand">
                PT ADLS English Course · Official E-Certificate
              </div>
              <h2 className="mt-2 font-serif text-2xl font-extrabold text-brand-dark">CERTIFICATE OF COMPLETION</h2>
              <p className="mt-2 text-xs text-slate-500">Diberikan kepada siswa berprestasi:</p>
              <div className="mt-2 inline-block border-b-2 border-slate-300 px-6 pb-1 text-xl font-extrabold text-slate-900">
                {certModal.student_name}
              </div>
              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <div>Type Kelas: <b>{certModal.class_type}</b> · Level: <b>{certModal.level}</b></div>
                <div>Cabang: <b>{certModal.branch_name}</b> · Selesai: <b>{String(certModal.completed_at || "").slice(0, 10)}</b></div>
                <div className="pt-1 font-mono text-[11px] text-slate-500">Kode Verifikasi: {certModal.certificate_code}</div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              {certModal.certificate_url && (
                <a
                  href={resolveAssetUrl(certModal.certificate_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  <ExternalLink size={15} /> Buka File Asli
                </a>
              )}
              <button type="button" onClick={() => window.print()} className="btn-ghost">
                <Printer size={15} /> Cetak / Save PDF
              </button>
              <button type="button" onClick={() => downloadHtmlCert(certModal)} className="btn-primary">
                <Download size={15} /> Download E-Sertifikat
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
