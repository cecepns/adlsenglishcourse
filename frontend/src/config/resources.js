import {
  BookOpenCheck,
  Building2,
  CalendarCheck,
  CalendarOff,
  Clock,
  FileText,
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

export const CLASS_TYPES = ["Private", "Intensive", "Regular"];
export const COURSE_LEVELS = [
  "Preschool (Pre A1)",
  "Super Basic (Pre A1 - A1)",
  "Basic (A1)",
  "Intermediate (A2)",
  "Advance (B1 - B2)",
  "Umum / Karyawan",
];
export const DAYS_OF_WEEK = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
export const MARKETING_SOURCES = [
  "WhatsApp",
  "Teman",
  "Facebook",
  "TikTok",
  "Instagram",
  "Banner",
  "Google Maps",
  "Iklan",
  "Lainnya",
];
export const STOP_REASONS = [
  "Pindah tempat tinggal",
  "Kendala biaya",
  "Jadwal tidak sesuai",
  "Tidak melanjutkan",
  "Alasan lainnya",
];

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
  placeholder: "Cari type kelas / level...",
  required,
  formatOption: (c) => ({
    value: c.id,
    label: [c.class_type || c.name, c.level, c.schedule, c.branch_name].filter(Boolean).join(" · "),
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

export const RESOURCES = {
  users: {
    title: "Manajemen Users",
    icon: UserCog,
    endpoint: E.USERS,
    r: STAFF,
    c: STAFF,
    u: STAFF,
    branchFilter: true,
    userSortFilters: true,
    columns: [
      { key: "name", label: "Nama", bold: true, sortable: true },
      { key: "email", label: "Email" },
      {
        key: "role",
        label: "Role",
        sortable: true,
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
      {
        key: "branch_name",
        label: "Cabang",
        type: "branch-badges",
      },
      { key: "phone", label: "No. HP / WA", nowrap: true },
      {
        key: "status",
        label: "Status",
        sortable: true,
        type: "badge",
        badgeMap: { active: "bg-emerald-100 text-emerald-700", inactive: "bg-slate-200 text-slate-600" },
      },
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
        {
          key: "role",
          label: "Role",
          type: "select",
          options: roleOptions,
          required: true,
          onChange: (nextRole, prev) => {
            if (nextRole === "tutor" && prev.branch_id && (!prev.branch_ids || !prev.branch_ids.length)) {
              return { branch_ids: [prev.branch_id] };
            }
            if (nextRole !== "tutor" && !prev.branch_id && prev.branch_ids?.length) {
              return { branch_id: prev.branch_ids[0] };
            }
            return {};
          },
        },
        ...(isBranchAdmin
          ? []
          : [
              {
                key: "branch_ids",
                label: "Cabang Mengajar Tutor (Bisa Pilih Banyak Cabang)",
                type: "async-select",
                isMulti: true,
                endpoint: E.BRANCHES.LIST,
                placeholder: "Pilih 1 atau lebih cabang...",
                formatOption: (b) => ({
                  value: b.id,
                  label: b.city ? `${b.name} (${b.city})` : b.name,
                  raw: b,
                }),
                showWhen: (v) => v.role === "tutor",
              },
              {
                ...branchField("Cabang", false),
                showWhen: (v) => v.role !== "tutor",
              },
            ]),
        { key: "phone", label: "No. HP / WhatsApp" },
        {
          key: "hourly_rate",
          label: "Tarif Honor / Sesi (opsional)",
          type: "number",
          showWhen: (v) => v.role === "tutor",
        },
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
      { key: "name", label: "Nama Siswa", bold: true },
      { key: "nickname", label: "Panggilan" },
      { key: "parent_name", label: "Orang Tua" },
      { key: "parent_phone", label: "WhatsApp" },
      { key: "class_name", label: "Type Kelas", render: (v, r) => v || r.class_type || (r.class_id ? `#${r.class_id}` : "-") },
      { key: "level", label: "Level" },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      {
        key: "course_completed",
        label: "Sertifikat / Kelulusan",
        render: (v, r) => {
          if (!Number(v) && !r.certificate_url && !r.certificate_code) return "Berjalan";
          if (r.certificate_delivery === "pickup_pusat") return "Selesai · Ambil Dedaun";
          if (r.certificate_delivery === "download") return "Selesai · E-Sertifikat";
          return "Selesai Course";
        },
      },
      { key: "status", label: "Status", type: "badge", badgeMap: { active: "bg-emerald-100 text-emerald-700", inactive: "bg-slate-200 text-slate-600" } },
    ],
    fields: [
      { key: "name", label: "Nama Lengkap Siswa", required: true },
      { key: "nickname", label: "Nama Panggilan" },
      { key: "gender", label: "Jenis Kelamin", type: "select", options: ["Laki-laki", "Perempuan"] },
      { key: "birth_place", label: "Tempat Lahir" },
      { key: "birth_date", label: "Tanggal Lahir", type: "date" },
      { key: "school_origin", label: "Asal Sekolah" },
      { key: "school_grade", label: "Kelas di Sekolah" },
      { key: "religion", label: "Agama" },
      { key: "housing_complex", label: "Asal Perumahan / Wilayah" },
      { key: "address", label: "Alamat Lengkap", type: "textarea" },
      { key: "student_wa", label: "No. WhatsApp Siswa" },
      { key: "parent_name", label: "Nama Orang Tua / Wali" },
      { key: "parent_phone", label: "No. WhatsApp Orang Tua" },
      { key: "parent_father_name", label: "Nama Ayah" },
      { key: "parent_father_job", label: "Pekerjaan Ayah" },
      { key: "parent_mother_name", label: "Nama Ibu" },
      { key: "parent_mother_job", label: "Pekerjaan Ibu" },
      { key: "marketing_source", label: "Mengetahui ADLS Dari Mana", type: "select", options: MARKETING_SOURCES },
      { key: "reason_choosing", label: "Alasan Memilih ADLS", type: "textarea" },
      { key: "class_type", label: "Type Kelas", type: "select", options: CLASS_TYPES },
      { key: "level", label: "Level", type: "select", options: COURSE_LEVELS, required: true },
      classField(false, (opt, prev) => {
        if (!opt?.raw) return {};
        const patch = {};
        if (opt.raw.branch_id && !prev.branch_id) {
          patch.branch_id = opt.raw.branch_id;
          patch.branch_name = opt.raw.branch_name || "";
        }
        if (opt.raw.class_type || opt.raw.name) patch.class_type = opt.raw.class_type || opt.raw.name;
        if (opt.raw.level) patch.level = opt.raw.level;
        return patch;
      }),
      branchField("Cabang", false),
      accountField("user_id", "Akun Login Siswa (mandiri / Kelas Karyawan)", "student_account_name", "siswa"),
      accountField("parent_user_id", "Akun Login Orang Tua (1 email bisa untuk 3+ anak)", "parent_account_name", "ortu"),
      { key: "joined_at", label: "Tanggal Bergabung", type: "date" },
      { key: "left_at", label: "Tanggal Keluar (jika berhenti/out)", type: "date" },
      { key: "stop_reason", label: "Alasan Berhenti / Out (wajib diisi jika keluar)", type: "select", options: STOP_REASONS },
      {
        key: "course_completed",
        label: "Kelulusan Course (Aktifkan Menu Sertifikat)",
        type: "select",
        options: [
          { value: "0", label: "Sedang Berjalan" },
          { value: "1", label: "Selesai Course (Buka Pilihan E-Sertifikat / Ambil di Dedaun)" },
        ],
      },
      { key: "completed_at", label: "Tanggal Selesai Course", type: "date" },
      { key: "certificate_url", label: "Upload File E-Sertifikat Khusus (opsional PDF/Gambar)", type: "pdf-or-image" },
      { key: "status", label: "Status Siswa", type: "select", options: status },
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
    getColumns: (user) => {
      const isParent = user?.role === "ortu";
      return [
        { key: "name", label: "Type Kelas", bold: true, render: (v, r) => r.class_type || v || "-" },
        { key: "level", label: "Level" },
        { key: "day_1", label: "Hari 1", render: (v) => v || "-" },
        { key: "day_2", label: "Hari 2", render: (v) => v || "-" },
        { key: "time_start", label: "Waktu", render: (_, r) => r.time_start && r.time_end ? `${r.time_start} - ${r.time_end}` : r.schedule || "-" },
        { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
        ...(isParent ? [] : [{ key: "tutor_name", label: "Tutor", render: (v, r) => v || (r.tutor_id ? `#${r.tutor_id}` : "-") }]),
        { key: "type", label: "Tipe", type: "badge", badgeMap: { online: "bg-sky-100 text-sky-700", offline: "bg-indigo-100 text-indigo-700" } },
        ...(isParent ? [] : [{ key: "meeting_url", label: "Link Meeting", render: (v) => v || "-" }]),
      ];
    },
    fields: [
      { key: "name", label: "Type Kelas", type: "select", options: CLASS_TYPES, required: true },
      { key: "level", label: "Level", type: "select", options: COURSE_LEVELS, required: true },
      { key: "day_1", label: "Jadwal Hari Ke-1", type: "select", options: DAYS_OF_WEEK, required: true },
      { key: "day_2", label: "Jadwal Hari Ke-2 (opsional)", type: "select", options: ["", ...DAYS_OF_WEEK] },
      { key: "day_3", label: "Jadwal Hari Ke-3 (opsional)", type: "select", options: ["", ...DAYS_OF_WEEK] },
      { key: "time_start", label: "Jam Mulai (mis. 17:00 atau 5:00 PM)", required: true },
      { key: "time_end", label: "Jam Selesai (mis. 18:30 atau 6:30 PM)", required: true },
      { key: "schedule", label: "Jadwal Lengkap (otomatis tersinkron)" },
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
      { key: "class_name", label: "Type Kelas", render: (v, r) => v || (r.class_id ? `#${r.class_id}` : "-") },
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
    title: "Riwayat Absensi Tutor",
    icon: Clock,
    endpoint: E.TUTOR_ATTENDANCE,
    r: [...STAFF, "tutor"],
    c: STAFF, // #9 Tutor absen masuk melalui Portal Tutor dengan jam server otomatis
    u: STAFF,
    branchFilter: true,
    defaultDateKey: "date",
    tutorClockNotice: true,
    columns: [
      { key: "date", label: "Tanggal", render: (v) => String(v || "").slice(0, 10) || "-" },
      { key: "tutor_name", label: "Tutor", bold: true, render: (v, r) => v || (r.tutor_id ? `#${r.tutor_id}` : "-") },
      { key: "class_name", label: "Type Kelas", render: (v, r) => v || (r.class_id ? `#${r.class_id}` : "-") },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "-") },
      { key: "check_in", label: "Jam Masuk (Server)", render: (v) => v || "-" },
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
    getFields: () => [
      tutorField(true, (opt, prev) =>
        opt?.raw?.branch_id && !prev.branch_id
          ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
          : {}
      ),
      classField(false, (opt) =>
        opt?.raw?.branch_id
          ? { branch_id: opt.raw.branch_id, branch_name: opt.raw.branch_name || "" }
          : {}
      ),
      { key: "date", label: "Tanggal", type: "date", required: true },
      { key: "check_in", label: "Jam Masuk", type: "time" },
      { key: "late_minutes", label: "Keterlambatan (menit)", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["hadir", "terlambat", "izin", "cuti", "alpha"], required: true },
      branchField("Cabang", false),
      { key: "notes", label: "Catatan", type: "textarea" },
    ],
  },
  learning_reports: {
    title: "Laporan Belajar & Nilai",
    icon: BookOpenCheck,
    endpoint: E.LEARNING_REPORTS,
    r: ALL,
    c: [...STAFF, "tutor"],
    u: [...STAFF, "tutor"],
    branchFilter: true,
    initClassAction: true,
    defaultDateKey: "report_date",
    getDefaultValues: () => ({
      report_month: new Date().toISOString().slice(0, 7),
    }),
    getColumns: (user) => [
      { key: "report_month", label: "Bulan" },
      { key: "student_name", label: "Siswa", bold: true, render: (v, r) => v || (r.student_id ? `#${r.student_id}` : "-") },
      { key: "class_name", label: "Type Kelas", render: (v) => v || "-" },
      { key: "material", label: "Materi Pertemuan", render: (v) => v || "Menunggu input tutor" },
      { key: "homework", label: "PR Anak", render: (v) => v || "-" },
      { key: "formative_score", label: "Formatif", render: (v) => (v !== null && v !== undefined ? `${v}` : "-") },
      {
        key: "summative_score",
        label: "Sumatif / UAS",
        bold: true,
        render: (v) => (v === null || v === undefined ? "-" : Number(v) >= 100 ? `${v} ★` : `${v}`),
      },
      { key: "speaking_score", label: "Speaking", render: (v) => (v !== null && v !== undefined ? `${v}` : "-") },
      ...(user?.role === "ortu" ? [] : [{ key: "tutor_name", label: "Tutor", render: (v) => v || "-" }]),
    ],
    getFields: (user) => {
      const isTutor = user?.role === "tutor";
      const isStaff = STAFF.includes(user?.role);
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
        { key: "material", label: isStaff ? "Materi (opsional - dapat diisi Tutor)" : "Materi yang Dipelajari", required: !isStaff },
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
    quickApprove: true,
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
      { key: "approval_notes", label: "Catatan Keputusan (ACC/Tolak)", render: (v) => v || "-" },
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
        { key: "approval_notes", label: "Keterangan / Alasan Keputusan (Wajib jika Tolak / ACC)", type: "textarea", approveOnly: true },
        { key: "status", label: "Keputusan Admin Pusat / Owner", type: "select", options: ["pending", "approved", "rejected"], approveOnly: true },
        ...(isStudentSide || isTutor ? [] : [branchField("Cabang", false)]),
      ];
    },
  },
  lesson_materials: {
    title: "Materi Pembelajaran",
    icon: FileText,
    endpoint: E.LESSON_MATERIALS,
    r: [...STAFF, "tutor"],
    c: ["owner"], // #5 HANYA Owner yang boleh mengunggah materi pembelajaran
    u: ["owner"],
    branchFilter: true,
    columns: [
      { key: "title", label: "Judul Materi", bold: true },
      {
        key: "category",
        label: "Kategori",
        type: "badge",
        badgeMap: {
          "Lesson Plan": "bg-indigo-100 text-indigo-700",
          "Modul Belajar (PDF)": "bg-sky-100 text-sky-700",
          "Slide Presentasi (PPT)": "bg-amber-100 text-amber-700",
          Worksheet: "bg-emerald-100 text-emerald-700",
        },
      },
      { key: "level", label: "Level" },
      { key: "file_type", label: "Format", render: (v) => String(v || "pdf").toUpperCase() },
      { key: "author_name", label: "Uploader", render: (v) => v || "Owner ADLS" },
      { key: "branch_name", label: "Cabang", render: (v, r) => v || (r.branch_id ? `#${r.branch_id}` : "Semua Cabang") },
      { key: "created_at", label: "Tanggal", render: (v) => String(v || "").slice(0, 10) || "-" },
    ],
    fields: [
      { key: "title", label: "Judul Materi / Lesson Plan", required: true },
      {
        key: "category",
        label: "Kategori Materi",
        type: "select",
        options: ["Lesson Plan", "Modul Belajar (PDF)", "Slide Presentasi (PPT)", "Worksheet"],
        required: true,
      },
      { key: "level", label: "Level Kelas", type: "select", options: COURSE_LEVELS, required: true },
      { key: "file_type", label: "Tipe File", type: "select", options: ["pdf", "ppt", "pptx", "doc"], required: true },
      { key: "file_url", label: "File Dokumen (PDF / PPT / PPTX)", type: "pdf-or-image", required: true },
      { key: "description", label: "Petunjuk Belajar / Deskripsi Materi", type: "textarea" },
      branchField("Cabang (Kosongkan jika berlaku umum)", false),
    ],
  },
  complaints: {
    title: "Komplen",
    icon: MessageSquareWarning,
    endpoint: E.COMPLAINTS,
    r: ALL,
    c: ALL,
    u: STAFF,
    staffApproves: true,
    getDefaultValues: (user) => ({
      from_name: user?.name || "",
    }),
    columns: [
      { key: "from_name", label: "Pengirim", bold: true },
      {
        key: "sender_role",
        label: "Dari",
        type: "badge",
        badgeMap: {
          tutor: "bg-emerald-100 text-emerald-700",
          ortu: "bg-rose-100 text-rose-700",
          siswa: "bg-purple-100 text-purple-700",
        },
      },
      { key: "branch_name", label: "Cabang", render: (v) => v || "Pusat / Umum" },
      { key: "subject", label: "Subjek" },
      { key: "message", label: "Isi Komplen" },
      { key: "status", label: "Status", type: "badge", badgeMap: { resolved: "bg-emerald-100 text-emerald-700", open: "bg-amber-100 text-amber-700" } },
      { key: "created_at", label: "Tanggal", render: (v) => (v ? new Date(v).toLocaleDateString("id-ID") : "-") },
    ],
    getFields: (user, row) => [
      { key: "from_name", label: "Nama Pengirim", required: true },
      { key: "subject", label: "Subjek", required: true },
      { key: "message", label: "Isi Komplen / Masukan", type: "textarea", required: true },
      ...(user?.role === "tutor" && !row
        ? [branchField("Cabang Tujuan (opsional - masuk ke Admin Cabang & Admin Pusat)", false)]
        : []),
      { key: "status", label: "Status Penanganan (Admin Cabang / Admin Pusat)", type: "select", options: ["open", "resolved"], approveOnly: true },
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
