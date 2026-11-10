import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpenCheck,
  CalendarCheck,
  CreditCard,
  Film,
  GraduationCap,
  Headphones,
  Megaphone,
  Receipt,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getOpeningGreeting } from "@/utils/greetings";
import { useAuth } from "@/context/AuthContext";

const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

export default function PortalDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.PORTAL_SUMMARY);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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
              <Sparkles size={13} />
              {user.role === "siswa" ? "Portal Siswa Mandiri & Kelas Karyawan" : "Portal Orang Tua ADLS"}
            </div>
            <h1 className="mt-2.5 text-xl font-extrabold sm:text-2xl">{getOpeningGreeting(user)}</h1>
            {primary ? (
              <p className="mt-1 text-sm text-sky-100">
                Siswa terhubung: <span className="font-bold text-white">{students.map((s) => `${s.name} (${s.level || "Reguler"})`).join(", ")}</span>
                {primary.branch_name ? ` · ${primary.branch_name}` : ""}
              </p>
            ) : (
              <p className="mt-1 text-xs text-sky-100">
                Jika profil siswa belum tertaut dengan akun Anda, hubungi Admin Cabang agar ditautkan di data Siswa.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/25"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Data
          </button>
        </div>
      </div>

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
        <Link to="/meetings" className="card flex items-center gap-3 p-4 transition hover:border-brand">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><Video size={20} /></span>
          <div>
            <div className="text-sm font-bold text-slate-900">Class Meeting Online</div>
            <div className="text-xs text-slate-500">Gabung sesi kelas online</div>
          </div>
        </Link>
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
                  <div className="mt-1 text-sm font-bold text-slate-800">{r.material}</div>
                  {r.homework && <div className="mt-1 text-xs font-semibold text-amber-700">PR: {r.homework}</div>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-700 border border-slate-200">
                      Formatif: <b>{r.formative_score ?? "-"}</b>
                    </span>
                    <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-700 border border-slate-200">
                      Sumatif/UAS: <b>{r.summative_score ?? "-"}</b>
                    </span>
                    <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-700 border border-slate-200">
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
                <div className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-500" style={{ width: `${pct}%` }} />
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
                <div className="text-sm font-bold text-slate-900">Audio Listening & Jadwal Kelas</div>
                <div className="text-xs text-slate-500">{primary?.class_name ? `${primary.class_name} (${primary.schedule || "-"})` : "Akses materi listening modul"}</div>
              </div>
            </div>
            <Link to="/audio" className="btn-ghost !px-3 !py-1.5 text-xs">Buka Audio</Link>
          </div>
        </div>
      </div>

      {students.length > 0 && (
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap size={18} className="text-brand" />
            <h3 className="text-base font-extrabold text-slate-900">Profil Siswa & Kelas</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {students.map((s) => (
              <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-900">{s.name}</span>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">{s.level || "Reguler"}</span>
                </div>
                <div className="mt-1.5 space-y-0.5 text-xs text-slate-600">
                  <div>Kelas: <b>{s.class_name || "-"}</b> ({s.class_type || "offline"})</div>
                  <div>Jadwal: {s.schedule || "-"}</div>
                  <div>Cabang: {s.branch_name || "-"}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

