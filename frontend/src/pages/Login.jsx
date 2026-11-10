import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";

const HIGHLIGHTS = [
  "Absensi Tutor & Siswa Real-time",
  "Pembayaran SPP Resmi PT ADLS",
  "Rapor PR, Formatif & Sumatif",
  "Class Meeting & Audio Listening",
  "Payroll Honor & Multi-Cabang",
  "Portal Siswa & Kelas Karyawan",
];

export default function Login() {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState("login"); // login | register
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [reg, setReg] = useState({
    name: "",
    email: "",
    password: "",
    role: "siswa",
    student_name: "",
    level: "Kelas Karyawan",
    phone: "",
    branch_id: "",
  });
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get(API_ENDPOINTS.PUBLIC_BRANCHES)
      .then((r) => setBranches(r.data.data || []))
      .catch(() => {});
  }, []);

  if (user) return <Navigate to="/" replace />;

  const submitLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
    } catch {
      /* toast handled */
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        ...reg,
        branch_id: reg.branch_id ? Number(reg.branch_id) : null,
      });
    } catch {
      /* toast handled */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-12">
      {/* Left Hero Panel (Desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-dark via-brand to-sky-700 p-10 text-white lg:col-span-6 lg:flex xl:p-16">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-20 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3.5">
          <div className="rounded-2xl bg-white p-2 shadow-lg">
            <img src="/logo.png" alt="ADLS" className="h-12 w-12 object-contain" />
          </div>
          <div>
            <div className="text-lg font-extrabold tracking-tight">ADLS English Course</div>
            <div className="text-xs font-medium text-sky-200">Multi-Branch Learning & Academy System</div>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl py-8">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-amber-200 backdrop-blur-sm">
            <Sparkles size={14} /> Platform Terpadu Siswa, Orang Tua, Tutor & Cabang
          </div>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
            Kelola Kursus Bahasa Inggris Lebih Rapi, Transparan & Modern
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-sky-100/90 xl:text-base">
            Pantau absensi, progres belajar formatif & sumatif, pembayaran SPP ke PT ADLS,
            project video bulanan, audio listening, hingga payroll tutor dalam satu portal.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-white backdrop-blur-sm"
              >
                <CheckCircle2 size={16} className="shrink-0 text-amber-300" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-sky-100/80">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <ShieldCheck size={15} className="text-emerald-300" />
            Hak Akses Aman: Owner · Admin · Tutor · Siswa · Ortu
          </span>
          <span>PT ADLS English Course</span>
        </div>
      </div>

      {/* Right Auth Form Panel */}
      <div className="flex flex-col items-center justify-center p-5 sm:p-8 lg:col-span-6 lg:p-12">
        <div className="w-full max-w-md space-y-5">
          {/* Mobile Brand Header */}
          <div className="flex flex-col items-center text-center lg:hidden">
            <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-md">
              <img src="/logo.png" alt="ADLS" className="h-14 w-14 object-contain" />
            </div>
            <h1 className="mt-3 text-xl font-extrabold text-brand-dark">ADLS English Course</h1>
            <p className="text-xs text-slate-500">Portal Pembelajaran & Manajemen Multi-Cabang</p>
          </div>

          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand">
              <GraduationCap size={14} /> Portal Akses ADLS
            </div>
            <h2 className="mt-2.5 text-2xl font-extrabold text-slate-900">
              {mode === "login" ? "Masuk ke Akun Anda" : "Daftar Siswa / Orang Tua Baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Silakan masukkan email dan password untuk melanjutkan aktivitas hari ini."
                : "Pendaftaran cepat untuk Siswa Mandiri (Kelas Karyawan) maupun Orang Tua."}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition ${
                mode === "login"
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <LogIn size={15} /> Masuk
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`inline-flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition ${
                mode === "register"
                  ? "bg-brand text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <UserPlus size={15} /> Daftar Siswa / Ortu
            </button>
          </div>

          {/* Auth Form Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-7">
            {mode === "login" ? (
              <form onSubmit={submitLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                    <input
                      required
                      type="email"
                      className="input !pl-10"
                      placeholder="nama@adlsenglishcourse.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                    <input
                      required
                      type={showPass ? "text" : "password"}
                      className="input !pl-10 !pr-10"
                      placeholder="Masukkan password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? "Sembunyikan password" : "Lihat password"}
                      className="absolute right-3 top-2.5 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  className="btn-primary w-full !py-3 shadow-md shadow-brand/25 transition hover:shadow-lg"
                  disabled={loading}
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Masuk ke Portal
                </button>
              </form>
            ) : (
              <form onSubmit={submitRegister} className="space-y-3.5">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Daftar Sebagai
                  </label>
                  <select
                    className="input"
                    value={reg.role}
                    onChange={(e) =>
                      setReg({
                        ...reg,
                        role: e.target.value,
                        level: e.target.value === "siswa" ? "Kelas Karyawan" : "Kids",
                      })
                    }
                  >
                    <option value="siswa">Siswa Mandiri / Kelas Karyawan (Bayar Sendiri)</option>
                    <option value="ortu">Orang Tua / Wali Siswa</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Nama Lengkap *
                  </label>
                  <input
                    required
                    className="input"
                    placeholder="Nama lengkap Anda"
                    value={reg.name}
                    onChange={(e) => setReg({ ...reg, name: e.target.value })}
                  />
                </div>

                {reg.role === "ortu" && (
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Nama Siswa (Anak) *
                    </label>
                    <input
                      required
                      className="input"
                      placeholder="Nama lengkap putra/putri"
                      value={reg.student_name}
                      onChange={(e) => setReg({ ...reg, student_name: e.target.value })}
                    />
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Level
                    </label>
                    <select
                      className="input"
                      value={reg.level}
                      onChange={(e) => setReg({ ...reg, level: e.target.value })}
                    >
                      <option value="Kids">Kids</option>
                      <option value="Teens">Teens</option>
                      <option value="Kelas Karyawan">Kelas Karyawan</option>
                      <option value="Conversation / TOEFL">Conversation / TOEFL</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Cabang
                    </label>
                    <select
                      className="input"
                      value={reg.branch_id}
                      onChange={(e) => setReg({ ...reg, branch_id: e.target.value })}
                    >
                      <option value="">-- Pilih Cabang --</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.city ? `${b.name} (${b.city})` : b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Email *
                    </label>
                    <input
                      required
                      type="email"
                      className="input"
                      placeholder="email@contoh.com"
                      value={reg.email}
                      onChange={(e) => setReg({ ...reg, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      No. WhatsApp
                    </label>
                    <input
                      className="input"
                      placeholder="08..."
                      value={reg.phone}
                      onChange={(e) => setReg({ ...reg, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPass ? "text" : "password"}
                      className="input !pr-10"
                      placeholder="Minimal 6 karakter"
                      value={reg.password}
                      onChange={(e) => setReg({ ...reg, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((s) => !s)}
                      aria-label={showPass ? "Sembunyikan password" : "Lihat password"}
                      className="absolute right-3 top-2.5 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  className="btn-primary w-full !py-3 shadow-md shadow-brand/25 transition hover:shadow-lg"
                  disabled={loading}
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Buat Akun Sekarang
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-slate-400">
            {mode === "login" ? (
              <>
                Siswa Kelas Karyawan atau Orang Tua baru?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="font-bold text-brand hover:underline"
                >
                  Daftar di sini
                </button>
              </>
            ) : (
              <>
                Sudah punya akun ADLS?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="font-bold text-brand hover:underline"
                >
                  Masuk sekarang
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
