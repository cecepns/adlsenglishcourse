import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Lock,
  LogIn,
  Mail,
  MessageCircle,
  Plus,
  TrendingUp,
  Trophy,
  UserPlus,
  Trash2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { CLASS_TYPES, COURSE_LEVELS, MARKETING_SOURCES } from "@/config/resources";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const { user, login, register } = useAuth();
  const [lang, setLang] = useState("id"); // "id" | "en"
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [form, setForm] = useState({ email: "", password: "" });

  const [reg, setReg] = useState({
    name: "",
    nickname: "",
    gender: "Laki-laki",
    birth_place: "",
    birth_date: "",
    school_origin: "",
    school_grade: "",
    religion: "Islam",
    housing_complex: "",
    address: "",
    phone: "",
    student_wa: "",
    parent_father_name: "",
    parent_father_job: "",
    parent_mother_name: "",
    parent_mother_job: "",
    parent_wa: "",
    marketing_source: "WhatsApp",
    reason_choosing: "",
    email: "",
    password: "",
    role: "siswa",
    class_type: "Regular",
    level: COURSE_LEVELS[0],
    branch_id: "",
  });

  const [children, setChildren] = useState([
    { name: "", nickname: "", class_type: "Regular", level: COURSE_LEVELS[0], branch_id: "" },
  ]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api
      .get(API_ENDPOINTS.PUBLIC_BRANCHES)
      .then((r) => setBranches(r.data.data || []))
      .catch(() => {});
  }, []);

  if (user) return <Navigate to="/" replace />;

  const t = {
    heroTitle1: "Focus Speaking.",
    heroTitle2: "Achieve 100.",
    heroSub: "Your trusted partner for English excellence.",
    badge1: "Speak Confidently",
    badge2: "Learn Effectively",
    badge3: "Achieve More",
    portalTag: "ADLS Learning Portal",
    welcome: lang === "en" ? "Welcome Back!" : "Welcome Back!",
    welcomeSub:
      lang === "en"
        ? "Log in to access your learning journey."
        : "Log in to access your learning journey.",
    emailLabel: lang === "en" ? "Email Address" : "Email Address",
    passLabel: lang === "en" ? "Password" : "Password",
    rememberMe: lang === "en" ? "Remember me" : "Ingat saya",
    forgotPass: lang === "en" ? "Forgot Password?" : "Lupa Password?",
    loginBtn: lang === "en" ? "Log In" : "Masuk ke Akun",
    googleBtn: lang === "en" ? "Continue with Google" : "Lanjutkan dengan Google",
    noAccount: lang === "en" ? "Don't have an account?" : "Belum punya akun?",
    createAccount: lang === "en" ? "Create an Account" : "Daftar di Sini",
    haveAccount: lang === "en" ? "Already have an account?" : "Sudah punya akun?",
    loginLink: lang === "en" ? "Sign In" : "Masuk",
    regTitle: lang === "en" ? "Student & Parent Registration" : "Formulir Pendaftaran Siswa & Orang Tua",
    footerText: "PT. ADLS Solusi Indonesia",
  };

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

  const addChildRow = () => {
    setChildren((prev) => [
      ...prev,
      { name: "", nickname: "", class_type: reg.class_type || "Regular", level: COURSE_LEVELS[0], branch_id: reg.branch_id || "" },
    ]);
  };

  const updateChildRow = (idx, patch) => {
    setChildren((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeChildRow = (idx) => {
    setChildren((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitRegister = async (e) => {
    e.preventDefault();
    if (reg.role === "ortu") {
      const validChildren = children.filter((c) => c.name.trim());
      if (!validChildren.length) {
        toast.error("Minimal 1 nama anak wajib diisi");
        return;
      }
    }
    setLoading(true);
    try {
      const payload = {
        ...reg,
        branch_id: reg.branch_id ? Number(reg.branch_id) : null,
      };
      if (reg.role === "ortu") {
        payload.children = children
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            nickname: c.nickname?.trim() || null,
            class_type: c.class_type || reg.class_type || "Regular",
            level: c.level || reg.level,
            branch_id: c.branch_id ? Number(c.branch_id) : (reg.branch_id ? Number(reg.branch_id) : null),
          }));
      }
      await register(payload);
    } catch {
      /* toast handled */
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Top Navbar / Language Switcher */}
      <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 py-3.5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="ADLS" className="h-10 w-10 object-contain" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-black tracking-tight text-brand-dark">ADLS</span>
            <span className="hidden text-slate-300 sm:inline">|</span>
            <span className="hidden text-sm font-bold text-slate-700 sm:inline">ADLS English Course</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold shadow-inner">
            <button
              type="button"
              onClick={() => setLang("id")}
              className={`rounded-lg px-2.5 py-1 transition ${
                lang === "id" ? "bg-white text-brand-dark shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              🇮🇩 ID
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              className={`rounded-lg px-2.5 py-1 transition ${
                lang === "en" ? "bg-white text-brand-dark shadow-sm" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Left Hero & Right Card (Strictly Matching Gambar 1) */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl lg:grid-cols-12">
          {/* Left Hero Panel (Gambar 1) */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1e4b85] via-[#245899] to-[#0284c7] p-8 text-white lg:col-span-7 lg:p-12 xl:p-14">
            {/* Background Light Graphic Waves */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl" />
            <svg
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 w-full opacity-15"
              viewBox="0 0 1440 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fill="#ffffff"
                d="M0,192L60,197.3C120,203,240,213,360,197.3C480,181,600,139,720,138.7C840,139,960,181,1080,192C1200,203,1320,181,1380,170.7L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
              />
            </svg>

            {/* Top Brand Logo */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="rounded-xl bg-white p-2 shadow-md">
                <img src="/logo.png" alt="ADLS English Course" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-white">ADLS | ADLS English Course</div>
                <div className="text-xs font-semibold text-sky-200">PT. ADLS Solusi Indonesia</div>
              </div>
            </div>

            {/* Hero Main Catchphrase (Gambar 1) */}
            <div className="relative z-10 my-auto py-10 lg:py-14">
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl text-white">
                {t.heroTitle1}
                <br />
                {t.heroTitle2}
              </h1>

              {/* Accent Line */}
              <div className="mt-4 h-1.5 w-24 rounded-full bg-amber-400" />

              <p className="mt-6 text-base font-medium leading-relaxed text-sky-100 sm:text-lg max-w-lg">
                {t.heroSub}
              </p>
            </div>

            {/* 3 Bottom Badges (Gambar 1) */}
            <div className="relative z-10 grid grid-cols-3 gap-3 border-t border-white/20 pt-6 text-center text-xs">
              <div className="flex flex-col items-center gap-2 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                  <MessageCircle size={18} />
                </span>
                <span className="font-extrabold text-white">{t.badge1}</span>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                  <TrendingUp size={18} />
                </span>
                <span className="font-extrabold text-white">{t.badge2}</span>
              </div>

              <div className="flex flex-col items-center gap-2 rounded-xl bg-white/10 p-3 backdrop-blur-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white">
                  <Trophy size={18} />
                </span>
                <span className="font-extrabold text-white">{t.badge3}</span>
              </div>
            </div>
          </div>

          {/* Right Auth Panel (Gambar 1) */}
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:col-span-5 lg:p-10 bg-white">
            <div className="mx-auto w-full max-w-md space-y-5">
              {/* Top Tag Pill */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-extrabold text-brand-dark">
                <Lock size={12} className="text-brand" /> {t.portalTag}
              </div>

              {/* Header Title */}
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                  {mode === "login" ? t.welcome : t.regTitle}
                </h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                  {mode === "login" ? t.welcomeSub : "Daftarkan diri Anda atau ananda untuk kursus bahasa Inggris terpadu."}
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`rounded-lg py-2 transition ${
                    mode === "login"
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <LogIn size={13} className="inline mr-1" /> {lang === "en" ? "Sign In" : "Masuk"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`rounded-lg py-2 transition ${
                    mode === "register"
                      ? "bg-brand text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <UserPlus size={13} className="inline mr-1" /> {lang === "en" ? "Register" : "Daftar di Sini"}
                </button>
              </div>

              {mode === "login" ? (
                /* LOGIN FORM (Gambar 1) */
                <form onSubmit={submitLogin} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      {t.emailLabel}
                    </label>
                    <div className="relative">
                      <Mail size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                      <input
                        required
                        type="email"
                        className="input !pl-10 !py-2.5 text-sm"
                        placeholder="Enter your email address"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      {t.passLabel}
                    </label>
                    <div className="relative">
                      <Lock size={16} className="pointer-events-none absolute left-3.5 top-3 text-slate-400" />
                      <input
                        required
                        type={showPass ? "text" : "password"}
                        className="input !pl-10 !pr-10 !py-2.5 text-sm"
                        placeholder="Enter your password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-slate-300 text-brand focus:ring-brand"
                      />
                      <span>{t.rememberMe}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => toast("Silakan hubungi Admin Pusat/Cabang untuk reset password.", { icon: "ℹ️" })}
                      className="font-bold text-brand hover:underline"
                    >
                      {t.forgotPass}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full !py-3 text-sm font-extrabold shadow-md shadow-brand/25"
                  >
                    <LogIn size={16} />
                    <span>{loading ? "Memproses..." : t.loginBtn}</span>
                  </button>

                  <div className="relative my-4 text-center text-xs text-slate-400">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative bg-white px-2 text-slate-400">or</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toast("Login Google segera hadir.", { icon: "🔔" })}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.9c2.28-2.1 3.645-5.18 3.645-9.14z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.92H1.21v3.15C3.25 21.43 7.31 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.32 14.28c-.24-.72-.38-1.49-.38-2.28s.14-1.56.38-2.28V6.57H1.21C.44 8.11 0 9.99 0 12s.44 3.89 1.21 5.43l4.11-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.57 1.21 6.57l4.11 3.15c.94-2.82 3.58-4.97 6.68-4.97z"
                      />
                    </svg>
                    <span>{t.googleBtn}</span>
                  </button>

                  <div className="text-center text-xs text-slate-500 pt-2">
                    {t.noAccount}{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="font-extrabold text-brand hover:underline"
                    >
                      {t.createAccount}
                    </button>
                  </div>
                </form>
              ) : (
                /* REGISTRATION FORM (Gambar 3 Fields) */
                <form onSubmit={submitRegister} className="space-y-3.5 max-h-[72vh] overflow-y-auto pr-1">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Daftar Sebagai *
                    </label>
                    <select
                      className="input !py-2 text-xs"
                      value={reg.role}
                      onChange={(e) => setReg({ ...reg, role: e.target.value })}
                    >
                      <option value="siswa">Siswa Mandiri / Kelas Karyawan</option>
                      <option value="ortu">Orang Tua / Wali Murid (1 Akun untuk Multi-Anak)</option>
                    </select>
                  </div>

                  {/* Program & Cabang */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                        Cabang ADLS *
                      </label>
                      <select
                        required
                        className="input !py-2 text-xs"
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

                    {reg.role === "siswa" && (
                      <div>
                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
                          Type Kelas *
                        </label>
                        <select
                          className="input !py-2 text-xs"
                          value={reg.class_type}
                          onChange={(e) => setReg({ ...reg, class_type: e.target.value })}
                        >
                          {CLASS_TYPES.map((ct) => (
                            <option key={ct} value={ct}>{ct}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {reg.role === "siswa" ? (
                    /* Siswa Mandiri Data */
                    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">
                        Identitas Lengkap Siswa (Gambar 3)
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          required
                          className="input !py-2 text-xs"
                          placeholder="Nama Lengkap Siswa *"
                          value={reg.name}
                          onChange={(e) => setReg({ ...reg, name: e.target.value })}
                        />
                        <input
                          className="input !py-2 text-xs"
                          placeholder="Nama Panggilan"
                          value={reg.nickname}
                          onChange={(e) => setReg({ ...reg, nickname: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <select
                          className="input !py-2 text-xs"
                          value={reg.level}
                          onChange={(e) => setReg({ ...reg, level: e.target.value })}
                        >
                          {COURSE_LEVELS.map((lv) => (
                            <option key={lv} value={lv}>{lv}</option>
                          ))}
                        </select>
                        <select
                          className="input !py-2 text-xs"
                          value={reg.gender}
                          onChange={(e) => setReg({ ...reg, gender: e.target.value })}
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>
                      <input
                        className="input !py-2 text-xs"
                        placeholder="Asal Perumahan / Wilayah Tempat Tinggal"
                        value={reg.housing_complex}
                        onChange={(e) => setReg({ ...reg, housing_complex: e.target.value })}
                      />
                      <textarea
                        rows={2}
                        className="input !py-2 text-xs"
                        placeholder="Alamat Lengkap Tempat Tinggal..."
                        value={reg.address}
                        onChange={(e) => setReg({ ...reg, address: e.target.value })}
                      />
                    </div>
                  ) : (
                    /* Ortu & Multi-Anak */
                    <div className="space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                        <div className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">
                          Data Orang Tua / Wali
                        </div>
                        <input
                          required
                          className="input !py-2 text-xs"
                          placeholder="Nama Lengkap Orang Tua / Wali *"
                          value={reg.name}
                          onChange={(e) => setReg({ ...reg, name: e.target.value })}
                        />
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            className="input !py-2 text-xs"
                            placeholder="Nama Ayah"
                            value={reg.parent_father_name}
                            onChange={(e) => setReg({ ...reg, parent_father_name: e.target.value })}
                          />
                          <input
                            className="input !py-2 text-xs"
                            placeholder="Nama Ibu"
                            value={reg.parent_mother_name}
                            onChange={(e) => setReg({ ...reg, parent_mother_name: e.target.value })}
                          />
                        </div>
                        <input
                          className="input !py-2 text-xs"
                          placeholder="Asal Perumahan / Wilayah"
                          value={reg.housing_complex}
                          onChange={(e) => setReg({ ...reg, housing_complex: e.target.value })}
                        />
                        <textarea
                          rows={2}
                          className="input !py-2 text-xs"
                          placeholder="Alamat Tempat Tinggal Lengkap..."
                          value={reg.address}
                          onChange={(e) => setReg({ ...reg, address: e.target.value })}
                        />
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-sky-50/50 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">
                            Data Anak ({children.length}) · 1 Akses Email
                          </span>
                          <button
                            type="button"
                            onClick={addChildRow}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand px-2 py-1 text-[11px] font-bold text-white shadow-sm"
                          >
                            <Plus size={12} /> Tambah Anak
                          </button>
                        </div>

                        {children.map((child, idx) => (
                          <div key={idx} className="rounded-lg border border-slate-200 bg-white p-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                required
                                className="input !py-1.5 text-xs"
                                placeholder={`Nama Lengkap Anak #${idx + 1} *`}
                                value={child.name}
                                onChange={(e) => updateChildRow(idx, { name: e.target.value })}
                              />
                              {children.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeChildRow(idx)}
                                  className="rounded-lg p-1 text-rose-500 hover:bg-rose-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select
                                className="input !py-1.5 text-xs"
                                value={child.class_type}
                                onChange={(e) => updateChildRow(idx, { class_type: e.target.value })}
                              >
                                {CLASS_TYPES.map((ct) => (
                                  <option key={ct} value={ct}>Type: {ct}</option>
                                ))}
                              </select>
                              <select
                                className="input !py-1.5 text-xs"
                                value={child.level}
                                onChange={(e) => updateChildRow(idx, { level: e.target.value })}
                              >
                                {COURSE_LEVELS.map((lv) => (
                                  <option key={lv} value={lv}>{lv}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sumber Marketing & Alasan Memilih (Point 9) */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                      Mengetahui ADLS Dari Mana? (Sumber Informasi)
                    </label>
                    <select
                      className="input !py-2 text-xs"
                      value={reg.marketing_source}
                      onChange={(e) => setReg({ ...reg, marketing_source: e.target.value })}
                    >
                      {MARKETING_SOURCES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>

                    <input
                      className="input !py-2 text-xs"
                      placeholder="Alasan memilih ADLS English Course..."
                      value={reg.reason_choosing}
                      onChange={(e) => setReg({ ...reg, reason_choosing: e.target.value })}
                    />
                  </div>

                  {/* Akun Login Info */}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      required
                      type="email"
                      className="input !py-2 text-xs"
                      placeholder="Email Login *"
                      value={reg.email}
                      onChange={(e) => setReg({ ...reg, email: e.target.value })}
                    />
                    <input
                      required
                      type="password"
                      className="input !py-2 text-xs"
                      placeholder="Password *"
                      value={reg.password}
                      onChange={(e) => setReg({ ...reg, password: e.target.value })}
                    />
                  </div>

                  <input
                    className="input !py-2 text-xs"
                    placeholder="No. WhatsApp Aktif (08...)"
                    value={reg.phone}
                    onChange={(e) => setReg({ ...reg, phone: e.target.value })}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full !py-2.5 text-xs font-extrabold shadow-md shadow-brand/25"
                  >
                    <UserPlus size={15} />
                    <span>{loading ? "Menyimpan Data..." : "Buat Akun Sekarang"}</span>
                  </button>

                  <div className="text-center text-xs text-slate-500 pt-1">
                    {t.haveAccount}{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="font-extrabold text-brand hover:underline"
                    >
                      {t.loginLink}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer (Point 4) */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs font-semibold text-slate-500">
        {t.footerText}
      </footer>
    </div>
  );
}
