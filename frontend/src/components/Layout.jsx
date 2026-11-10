import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Banknote,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CalendarOff,
  Clock,
  Film,
  Gift,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquareWarning,
  Receipt,
  School,
  ShoppingBag,
  Trophy,
  UserCog,
  Video,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const ALL = [...STAFF, "tutor", "siswa", "ortu"];

const ROLE_LABELS = {
  owner: "Owner",
  admin_pusat: "Admin Pusat",
  admin_cabang: "Admin Cabang",
  tutor: "Tutor",
  siswa: "Siswa / Karyawan",
  ortu: "Orang Tua",
};

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: [...STAFF, "siswa", "ortu"], end: true },
  { to: "/tutor_attendance", label: "Absensi Tutor", icon: Clock, roles: [...STAFF, "tutor"] },
  { to: "/attendance", label: "Absensi Siswa", icon: CalendarCheck, roles: ALL },
  { to: "/students", label: "Siswa", icon: GraduationCap, roles: [...STAFF, "tutor"] },
  { to: "/classes", label: "Kelas", icon: School, roles: ALL },
  { to: "/meetings", label: "Meeting Online", icon: Video, roles: ALL },
  { to: "/audio", label: "Audio Listening", icon: Headphones, roles: ALL },
  { to: "/learning_reports", label: "Laporan Belajar", icon: BookOpenCheck, roles: ALL },
  { to: "/videos", label: "Project Video", icon: Film, roles: ALL },
  { to: "/achievements", label: "Prestasi Nilai 100", icon: Trophy, roles: ALL },
  { to: "/bills", label: "Tagihan SPP", icon: Receipt, roles: ALL },
  { to: "/referrals", label: "Komisi Referral", icon: Gift, roles: [...STAFF, "siswa", "ortu"] },
  { to: "/products", label: "Katalog & Order", icon: ShoppingBag, roles: ALL },
  { to: "/payroll", label: "Payroll Tutor", icon: Banknote, roles: [...STAFF, "tutor"] },
  { to: "/expenses", label: "Pengeluaran", icon: Wallet, roles: STAFF },
  { to: "/leaves", label: "Izin & Cuti", icon: CalendarOff, roles: ALL },
  { to: "/complaints", label: "Komplen", icon: MessageSquareWarning, roles: ALL },
  { to: "/announcements", label: "Pusat Informasi", icon: Megaphone, roles: ALL },
  { to: "/users", label: "Manajemen Users", icon: UserCog, roles: STAFF },
  { to: "/branches", label: "Cabang", icon: Building2, roles: STAFF },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3.5 rounded-xl px-4 py-3 text-base font-semibold transition-all ${
      isActive
        ? "bg-brand text-white shadow-sm shadow-brand/25"
        : "text-slate-700 hover:bg-slate-100 hover:text-brand-dark"
    }`;

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-100">
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="ADLS" className="h-11 w-11 rounded-xl object-contain" />
            <div>
              <div className="text-base font-extrabold leading-tight text-brand-dark">ADLS English</div>
              <div className="text-xs font-medium text-slate-400">Course Management</div>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-4" onClick={() => setOpen(false)}>
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 px-3.5 py-2.5">
            <div className="truncate text-sm font-bold text-slate-800">{user.name}</div>
            <div className="mt-0.5 text-xs font-semibold text-brand">
              {ROLE_LABELS[user.role] || user.role}
              {user.branch_name ? ` · ${user.branch_name}` : ""}
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3.5 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>
            <span className="text-base font-extrabold text-brand-dark sm:text-lg">ADLS English Course</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-sm font-semibold text-slate-700">{user.name}</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand">
                {ROLE_LABELS[user.role] || user.role}
                {user.branch_name ? ` · ${user.branch_name}` : ""}
              </span>
            </div>
            <button
              onClick={logout}
              aria-label="Keluar"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
