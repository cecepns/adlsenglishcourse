import {
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CalendarOff,
  Clock,
  GraduationCap,
  Megaphone,
  MessageSquareWarning,
  Receipt,
  School,
  ShoppingBag,
  UserCog,
  Wallet,
} from "lucide-react";
import { API_ENDPOINTS as E } from "@/utils/endpoints";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const ALL = [...STAFF, "tutor", "siswa", "ortu"];
const HQ = ["owner", "admin_pusat"];
const rp = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const status = ["active", "inactive"];

const studentField = (onSelect) => ({
  key: "student_id",
  label: "Siswa",
  labelKey: "student_name",
  type: "async-select",
  endpoint: E.STUDENTS.LIST,
  placeholder: "Cari nama siswa...",
  required: true,
  formatOption: (s) => ({
    value: s.id,
    label: [s.name, s.level, s.branch_name].filter(Boolean).join(" · "),
    raw: s,
  }),
  onSelect,
});

const classField = (required = false, onSelect) => ({
  key: "class_id",
  label: "Kelas",
  labelKey: "class_name",
  type: "async-select",
  endpoint: E.CLASSES.LIST,
  placeholder: "Cari nama kelas...",
  required,
  formatOption: (c) => ({
    value: c.id,
    label: [c.name, c.level, c.schedule].filter(Boolean).join(" · "),
    raw: c,
  }),
  onSelect,
});

const branchField = (label = "Cabang", required = false) => ({
  key: "branch_id",
  label,
  labelKey: "branch_name",
  type: "async-select",
  endpoint: E.BRANCHES.LIST,
  placeholder: "Cari nama cabang...",
  required,
  formatOption: (b) => ({
    value: b.id,
    label: b.city ? `${b.name} (${b.city})` : b.name,
    raw: b,
  }),
});

const tutorField = (required = false, onSelect) => ({
  key: "tutor_id",
  label: "Tutor",
  labelKey: "tutor_name",
  type: "async-select",
  endpoint: E.TUTORS,
  placeholder: "Cari nama tutor...",
  required,
  formatOption: (t) => ({
    value: t.id,
    label: t.email ? `${t.name} (${t.email})` : t.name,
    raw: t,
  }),
  onSelect,
});

const accountField = (key, label, labelKey, role) => ({
  key,
  label,
  labelKey,
  type: "async-select",
  endpoint: E.USERS.LIST,
  extraParams: { role },
  placeholder: `Cari akun ${role}...`,
  formatOption: (u) => ({
    value: u.id,
    label: [u.name, u.email, u.branch_name].filter(Boolean).join(" · "),
    raw: u,
  }),
});

// Satu config = satu halaman CRUD lengkap (tabel, search, pagination, modal create/edit, delete confirm)
export const RESOURCES = {
  users: {
    title: "Manajemen Users",
    icon: UserCog,
    endpoint: E.USERS,
    r: STAFF,
    c: STAFF,
    u: STAFF,
    branchFilter: true,
    columns: [
      { key: "name", label: "Nama", bold: true },
      { key: "email", label: "Email" },
      {
        key: "role",
        label: "Role",
        type: "badge",
        badgeMap: {
          owner: "bg-amber-100 text-amber-800",
          admin_pusat: "bg-indigo-100 text-indigo-700",
          admin_cabang: "bg-sky-100 text-sky-700",
          tutor: "bg-emerald-100 text-emerald-700",
          siswa: "bg-purple-100 text-purple-700",
          ortu: "bg-rose-100 text-rose-700",
        },
      },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "Pusat / Semua") },
      { key: "phone", label: "No. HP / WA" },
      { key: "status", label: "Status", type: "badge", badgeMap: { active: "bg-emerald-100 text-emerald-700", inactive: "bg-slate-200 text-slate-600" } },
    ],
    getFields: (user, row) => {
      const isBranchAdmin = user?.role === "admin_cabang";
      const roleOptions = isBranchAdmin
        ? ["tutor", "siswa", "ortu"]
        : ["owner", "admin_pusat", "admin_cabang", "tutor", "siswa", "ortu"];
      return [
        { key: "name", label: "Nama Lengkap", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        {
          key: "password",
          label: row ? "Password Baru (kosongkan jika tetap)" : "Password",
          type: "password",
          required: !row,
        },
        { key: "role", label: "Role", type: "select", options: roleOptions, required: true },
        ...(isBranchAdmin ? [] : [branchField("Cabang (wajib untuk Admin Cabang / Tutor)", false)]),
        { key: "phone", label: "No. HP / WhatsApp" },
        { key: "hourly_rate", label: "Tarif Honor / Sesi (khusus Tutor, opsional)", type: "number" },
        { key: "status", label: "Status", type: "select", options: status },
      ];
    },
  },
  branches: {
    title: "Cabang",
    icon: Building2,
    endpoint: E.BRANCHES,
    r: STAFF,
    c: HQ,
    u: HQ,
    columns: [
      { key: "name", label: "Cabang", bold: true },
      { key: "city", label: "Kota" },
      { key: "phone", label: "Telepon" },
      { key: "status", label: "Status", type: "badge", badgeMap: { active: "bg-emerald-100 text-emerald-700", inactive: "bg-slate-200 text-slate-600" } },
    ],
    fields: [
      { key: "name", label: "Nama Cabang", required: true },
      { key: "city", label: "Kota" },
      { key: "address", label: "Alamat" },
      { key: "phone", label: "Telepon" },
      { key: "status", label: "Status", type: "select", options: status },
    ],
  },
  students: {
    title: "Siswa",
    icon: GraduationCap,
    endpoint: E.STUDENTS,
    r: [...STAFF, "tutor"],
    c: STAFF,
    u: STAFF,
    branchFilter: true,
    defaultDateKey: "joined_at",
    columns: [
      { key: "name", label: "Nama", bold: true },
      { key: "parent_name", label: "Orang Tua" },
      { key: "parent_phone", label: "WhatsApp" },
      { key: "class_name", label: "Kelas", render: (v, r) => v || (r.class_id ? `#${r.class_id}` : "-") },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      { key: "level", label: "Level" },
      { key: "student_account_name", label: "Akun Siswa", render: (v, r) => v || r.parent_account_name || "-" },
      { key: "status", label: "Status", type: "badge", badgeMap: { active: "bg-emerald-100 text-emerald-700", inactive: "bg-slate-200 text-slate-600" } },
    ],
    fields: [
      { key: "name", label: "Nama Siswa", required: true },
      { key: "parent_name", label: "Nama Orang Tua" },
      { key: "parent_phone", label: "No. WhatsApp Orang Tua / Siswa" },
      { key: "level", label: "Level (mis. Kids, Teens, Kelas Karyawan)" },
      classField(false, (opt, prev) =>
        opt?.raw?.branch_id && !prev.branch_id
          ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
          : {}
      ),
      branchField("Cabang", false),
      accountField("user_id", "Akun Login Siswa (mandiri / Kelas Karyawan)", "student_account_name", "siswa"),
      accountField("parent_user_id", "Akun Login Orang Tua", "parent_account_name", "ortu"),
      { key: "joined_at", label: "Tanggal Bergabung", type: "date" },
      { key: "left_at", label: "Tanggal Keluar (jika nonaktif)", type: "date" },
      { key: "status", label: "Status", type: "select", options: status },
    ],
  },
  classes: {
    title: "Kelas",
    icon: School,
    endpoint: E.CLASSES,
    r: ALL,
    c: STAFF,
    u: STAFF,
    branchFilter: true,
    columns: [
      { key: "name", label: "Kelas", bold: true },
      { key: "level", label: "Level" },
      { key: "schedule", label: "Jadwal" },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      { key: "tutor_name", label: "Tutor", render: (v, r) => v || (r.tutor_id ? `#${r.tutor_id}` : "-") },
      { key: "type", label: "Tipe", type: "badge", badgeMap: { online: "bg-sky-100 text-sky-700", offline: "bg-indigo-100 text-indigo-700" } },
      { key: "meeting_url", label: "Link Meeting" },
    ],
    fields: [
      { key: "name", label: "Nama Kelas", required: true },
      { key: "level", label: "Level" },
      { key: "schedule", label: "Jadwal" },
      { key: "type", label: "Tipe", type: "select", options: ["offline", "online"] },
      { key: "meeting_url", label: "Link Meeting Online" },
      tutorField(false, (opt, prev) =>
        opt?.raw?.branch_id && !prev.branch_id
          ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
          : {}
      ),
      branchField("Cabang", false),
    ],
  },
  attendance: {
    title: "Absensi Siswa",
    icon: CalendarCheck,
    endpoint: E.ATTENDANCE,
    r: ALL,
    c: [...STAFF, "tutor"],
    u: STAFF,
    branchFilter: true,
    defaultDateKey: "date",
    columns: [
      { key: "date", label: "Tanggal", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "student_name", label: "Siswa", bold: true, render: (v, r) => v || (r.student_id ? `#${r.student_id}` : "-") },
      { key: "class_name", label: "Kelas", render: (v, r) => v || (r.class_id ? `#${r.class_id}` : "-") },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      { key: "status", label: "Status", type: "badge", badgeMap: { hadir: "bg-emerald-100 text-emerald-700", izin: "bg-amber-100 text-amber-700", sakit: "bg-sky-100 text-sky-700", alpha: "bg-red-100 text-red-700" } },
    ],
    fields: [
      studentField((opt) => {
        if (!opt?.raw) return {};
        const patch = {};
        if (opt.raw.class_id) { patch.class_id = opt.raw.class_id; patch.class_name = opt.raw.class_name || ""; }
        if (opt.raw.branch_id) { patch.branch_id = opt.raw.branch_id; patch.branch_name = opt.raw.branch_name || ""; }
        return patch;
      }),
      classField(false, (opt, prev) =>
        opt?.raw?.branch_id && !prev.branch_id
          ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
          : {}
      ),
      { key: "date", label: "Tanggal", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: ["hadir", "izin", "sakit", "alpha"] },
      branchField("Cabang", false),
    ],
  },
  tutor_attendance: {
    title: "Absensi Tutor",
    icon: Clock,
    endpoint: E.TUTOR_ATTENDANCE,
    r: [...STAFF, "tutor"],
    c: [...STAFF, "tutor"],
    u: STAFF,
    branchFilter: true,
    defaultDateKey: "date",
    columns: [
      { key: "date", label: "Tanggal", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "tutor_name", label: "Tutor", bold: true, render: (v, r) => v || (r.tutor_id ? `#${r.tutor_id}` : "-") },
      { key: "class_name", label: "Kelas", render: (v, r) => v || (r.class_id ? `#${r.class_id}` : "-") },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      { key: "check_in", label: "Jam Masuk", render: (v) => v || "-" },
      { key: "late_minutes", label: "Terlambat", render: (v) => (Number(v) > 0 ? `${v} mnt` : "Tepat waktu") },
      {
        key: "status",
        label: "Status",
        type: "badge",
        badgeMap: {
          hadir: "bg-emerald-100 text-emerald-700",
          terlambat: "bg-amber-100 text-amber-700",
          izin: "bg-sky-100 text-sky-700",
          cuti: "bg-indigo-100 text-indigo-700",
          alpha: "bg-red-100 text-red-700",
        },
      },
    ],
    getFields: (user) => {
      const isTutor = user?.role === "tutor";
      return [
        ...(isTutor
          ? []
          : [
              tutorField(true, (opt) =>
                opt?.raw?.branch_id
                  ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
                  : {}
              ),
            ]),
        classField(false, (opt, prev) =>
          opt?.raw?.branch_id && !prev.branch_id
            ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
            : {}
        ),
        { key: "date", label: "Tanggal", type: "date", required: true },
        { key: "check_in", label: "Jam Masuk", type: "time" },
        { key: "late_minutes", label: "Keterlambatan (menit)", type: "number" },
        { key: "status", label: "Status", type: "select", options: ["hadir", "terlambat", "izin", "cuti", "alpha"], required: true },
        ...(isTutor ? [] : [branchField("Cabang", false)]),
        { key: "notes", label: "Catatan", type: "textarea" },
      ];
    },
  },
  learning_reports: {
    title: "Laporan Belajar & Nilai",
    icon: BookOpenCheck,
    endpoint: E.LEARNING_REPORTS,
    r: ALL,
    c: [...STAFF, "tutor"],
    u: [...STAFF, "tutor"],
    branchFilter: true,
    defaultDateKey: "report_date",
    getDefaultValues: () => ({
      report_month: new Date().toISOString().slice(0, 7),
    }),
    columns: [
      { key: "report_month", label: "Bulan" },
      { key: "student_name", label: "Siswa", bold: true, render: (v, r) => v || (r.student_id ? `#${r.student_id}` : "-") },
      { key: "class_name", label: "Kelas", render: (v) => v || "-" },
      { key: "material", label: "Materi Pertemuan" },
      { key: "homework", label: "PR Anak", render: (v) => v || "-" },
      { key: "formative_score", label: "Formatif", render: (v) => (v !== null && v !== undefined ? `${v}` : "-") },
      {
        key: "summative_score",
        label: "Sumatif / UAS",
        bold: true,
        render: (v) => (v === null || v === undefined ? "-" : Number(v) >= 100 ? `${v} ★` : `${v}`),
      },
      { key: "speaking_score", label: "Speaking", render: (v) => (v !== null && v !== undefined ? `${v}` : "-") },
      { key: "tutor_name", label: "Tutor", render: (v) => v || "-" },
    ],
    getFields: (user) => {
      const isTutor = user?.role === "tutor";
      return [
        studentField((opt) => {
          if (!opt?.raw) return {};
          const patch = {};
          if (opt.raw.class_id) { patch.class_id = opt.raw.class_id; patch.class_name = opt.raw.class_name || ""; }
          if (opt.raw.branch_id) { patch.branch_id = opt.raw.branch_id; patch.branch_name = opt.raw.branch_name || ""; }
          return patch;
        }),
        classField(false, (opt, prev) =>
          opt?.raw?.branch_id && !prev.branch_id
            ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
            : {}
        ),
        ...(isTutor ? [] : [tutorField(false)]),
        { key: "report_month", label: "Bulan Laporan (YYYY-MM)", required: true },
        { key: "report_date", label: "Tanggal Pertemuan", type: "date", required: true },
        { key: "material", label: "Materi yang Dipelajari", required: true },
        { key: "homework", label: "PR Anak (Pekerjaan Rumah)" },
        { key: "formative_score", label: "Nilai Ujian Formatif (0-100)", type: "number" },
        { key: "summative_score", label: "Nilai Ujian Sumatif / UAS (0-100)", type: "number" },
        { key: "speaking_score", label: "Nilai Speaking Progress (0-100)", type: "number" },
        { key: "notes", label: "Catatan Perkembangan Siswa", type: "textarea" },
        ...(isTutor ? [] : [branchField("Cabang", false)]),
      ];
    },
  },
  bills: {
    title: "Tagihan SPP",
    icon: Receipt,
    endpoint: E.BILLS,
    r: ALL,
    c: STAFF,
    u: STAFF,
    branchFilter: true,
    columns: [
      { key: "title", label: "Tagihan", bold: true },
      { key: "student_name", label: "Siswa", render: (v, r) => v || (r.student_id ? `#${r.student_id}` : "-") },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      { key: "amount", label: "Jumlah", bold: true, render: rp },
      { key: "due_date", label: "Jatuh Tempo", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "status", label: "Status", type: "badge", badgeMap: { paid: "bg-emerald-100 text-emerald-700", verifikasi: "bg-sky-100 text-sky-700", unpaid: "bg-amber-100 text-amber-700", overdue: "bg-red-100 text-red-700" } },
    ],
    fields: [
      studentField((opt) =>
        opt?.raw?.branch_id
          ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
          : {}
      ),
      { key: "title", label: "Judul Tagihan", required: true },
      { key: "month", label: "Periode Bulan (YYYY-MM)" },
      { key: "amount", label: "Jumlah", type: "number", required: true },
      { key: "discount", label: "Potongan / Diskon", type: "number" },
      { key: "due_date", label: "Jatuh Tempo", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["unpaid", "verifikasi", "paid", "overdue"] },
      branchField("Cabang", false),
    ],
  },
  expenses: {
    title: "Pengeluaran",
    icon: Wallet,
    endpoint: E.EXPENSES,
    r: STAFF,
    c: STAFF,
    u: STAFF,
    branchFilter: true,
    defaultDateKey: "expense_date",
    columns: [
      { key: "expense_date", label: "Tanggal", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "title", label: "Keterangan", bold: true },
      {
        key: "category",
        label: "Kategori",
        type: "badge",
        badgeMap: {
          Operasional: "bg-sky-100 text-sky-700",
          "Gaji Tutor": "bg-indigo-100 text-indigo-700",
          "Sewa Tempat": "bg-amber-100 text-amber-700",
          Marketing: "bg-purple-100 text-purple-700",
          Perlengkapan: "bg-emerald-100 text-emerald-700",
        },
      },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "Pusat") },
      { key: "amount", label: "Jumlah", bold: true, render: rp },
    ],
    fields: [
      { key: "title", label: "Keterangan Pengeluaran", required: true },
      {
        key: "category",
        label: "Kategori",
        type: "select",
        options: ["Operasional", "Gaji Tutor", "Sewa Tempat", "Marketing", "Perlengkapan", "Lainnya"],
        required: true,
      },
      { key: "amount", label: "Jumlah (Rp)", type: "number", required: true },
      { key: "expense_date", label: "Tanggal", type: "date", required: true },
      branchField("Cabang", false),
      { key: "notes", label: "Catatan", type: "textarea" },
    ],
  },
  products: {
    title: "Katalog & Order",
    icon: ShoppingBag,
    endpoint: E.PRODUCTS,
    r: ALL,
    c: STAFF,
    u: STAFF,
    columns: [
      { key: "image", label: "Gambar", type: "image" },
      { key: "name", label: "Produk", bold: true },
      { key: "category", label: "Kategori" },
      { key: "age_group", label: "Usia" },
      { key: "price", label: "Harga", bold: true, render: rp },
      { key: "stock", label: "Stok" },
    ],
    fields: [
      { key: "name", label: "Nama Produk", required: true },
      { key: "image", label: "Gambar Produk", type: "image" },
      { key: "category", label: "Kategori (Buku/Merchandise)" },
      { key: "age_group", label: "Kelompok Usia", type: "select", options: ["Semua", "Anak", "Remaja", "Dewasa"] },
      { key: "price", label: "Harga", type: "number", required: true },
      { key: "stock", label: "Stok", type: "number" },
      { key: "description", label: "Deskripsi", type: "textarea" },
    ],
  },
  leaves: {
    title: "Izin & Cuti",
    icon: CalendarOff,
    endpoint: E.LEAVES,
    r: ALL,
    c: ALL,
    u: HQ,
    branchFilter: true,
    defaultDateKey: "start_date",
    getDefaultValues: (user) => ({
      requester_name: user?.name || "",
      type: user?.role === "tutor" ? "cuti_tutor" : "izin_siswa",
    }),
    columns: [
      {
        key: "type",
        label: "Jenis",
        type: "badge",
        badgeMap: {
          izin_siswa: "bg-sky-100 text-sky-700",
          sakit_siswa: "bg-rose-100 text-rose-700",
          cuti_tutor: "bg-indigo-100 text-indigo-700",
        },
      },
      { key: "requester_name", label: "Pemohon", bold: true },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      { key: "reason", label: "Alasan" },
      { key: "start_date", label: "Mulai", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "end_date", label: "Selesai", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "status", label: "Status", type: "badge", badgeMap: { approved: "bg-emerald-100 text-emerald-700", pending: "bg-amber-100 text-amber-700", rejected: "bg-red-100 text-red-700" } },
    ],
    getFields: (user) => {
      const isStudentSide = ["siswa", "ortu"].includes(user?.role);
      const isTutor = user?.role === "tutor";
      const typeOptions = isStudentSide
        ? ["izin_siswa", "sakit_siswa"]
        : isTutor
          ? ["cuti_tutor", "izin_siswa"]
          : ["izin_siswa", "sakit_siswa", "cuti_tutor"];
      return [
        { key: "type", label: "Jenis Pengajuan", type: "select", options: typeOptions, required: true },
        { key: "requester_name", label: isStudentSide ? "Nama Siswa" : "Nama Pemohon", required: true },
        { key: "reason", label: "Alasan / Keterangan Sakit", required: true },
        { key: "start_date", label: "Tanggal Mulai", type: "date", required: true },
        { key: "end_date", label: "Tanggal Selesai", type: "date" },
        { key: "status", label: "Keputusan Admin Pusat / Owner", type: "select", options: ["pending", "approved", "rejected"], approveOnly: true },
        ...(isStudentSide || isTutor ? [] : [branchField("Cabang", false)]),
      ];
    },
  },
  complaints: {
    title: "Komplen",
    icon: MessageSquareWarning,
    endpoint: E.COMPLAINTS,
    r: ALL,
    c: ALL,
    u: HQ,
    getDefaultValues: (user) => ({
      from_name: user?.name || "",
    }),
    columns: [
      { key: "from_name", label: "Pengirim", bold: true },
      { key: "subject", label: "Subjek" },
      { key: "message", label: "Isi Komplen" },
      { key: "status", label: "Status", type: "badge", badgeMap: { resolved: "bg-emerald-100 text-emerald-700", open: "bg-amber-100 text-amber-700" } },
      { key: "created_at", label: "Tanggal", render: (v) => (v ? new Date(v).toLocaleDateString("id-ID") : "-") },
    ],
    getFields: () => [
      { key: "from_name", label: "Nama Pengirim", required: true },
      { key: "subject", label: "Subjek", required: true },
      { key: "message", label: "Isi Komplen / Masukan", type: "textarea", required: true },
      { key: "status", label: "Status Penanganan (Admin Pusat)", type: "select", options: ["open", "resolved"], approveOnly: true },
    ],
  },
  announcements: {
    title: "Pusat Informasi",
    icon: Megaphone,
    endpoint: E.ANNOUNCEMENTS,
    r: ALL,
    c: STAFF,
    u: STAFF,
    branchFilter: true,
    columns: [
      {
        key: "info_type",
        label: "Kategori",
        type: "badge",
        badgeMap: {
          Pengumuman: "bg-sky-100 text-sky-700",
          "Surat Resmi": "bg-indigo-100 text-indigo-700",
          Libur: "bg-rose-100 text-rose-700",
          Agenda: "bg-emerald-100 text-emerald-700",
        },
      },
      { key: "title", label: "Judul", bold: true },
      { key: "letter_no", label: "No. Surat", render: (v) => v || "-" },
      { key: "event_date", label: "Tanggal Agenda", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "body", label: "Isi" },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "Semua Cabang") },
    ],
    fields: [
      { key: "info_type", label: "Jenis Informasi", type: "select", options: ["Pengumuman", "Surat Resmi", "Libur", "Agenda"], required: true },
      { key: "title", label: "Judul", required: true },
      { key: "letter_no", label: "Nomor Surat (jika Surat Resmi)" },
      { key: "event_date", label: "Tanggal Agenda / Hari Libur", type: "date" },
      { key: "body", label: "Isi Pengumuman", type: "textarea", required: true },
      branchField("Cabang (kosong = semua)", false),
    ],
  },
};
