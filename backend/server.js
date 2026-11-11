require("dotenv").config();
const express = require("express"), cors = require("cors"), mysql = require("mysql2/promise"), multer = require("multer");
const bcrypt = require("bcryptjs"), jwt = require("jsonwebtoken"), path = require("path"), fs = require("fs");

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "2mb" }));
const UPLOAD_DIR = path.join(__dirname, "uploads-adls-english-course");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

const pool = mysql.createPool({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, connectionLimit: 10, dateStrings: ["DATE"] });
const STAFF = ["owner", "admin_pusat", "admin_cabang"], ALL = [...STAFF, "tutor", "siswa", "ortu"], HQ = ["owner", "admin_pusat"];
const BRANCH_USER_ROLES = ["tutor", "siswa", "ortu"];
const BANK_INFO = {
  company: "PT ADLS English Course",
  accounts: [
    { bank: "BCA", number: "1234-567-890", holder: "PT ADLS English Course" },
    { bank: "Mandiri", number: "130-00-9876543-2", holder: "PT ADLS English Course" },
  ],
};

// Resource config: kolom di-whitelist (anti SQL injection), semua query pakai placeholder.
const RESOURCES = {
  branches: { fields: ["name", "city", "address", "phone", "status"], search: ["t.name", "t.city"], select: "t.*", join: "", r: [...STAFF, "tutor"], c: HQ, u: HQ },
  classes: { fields: ["name", "class_type", "level", "schedule", "tutor_id", "branch_id", "type", "meeting_url"], search: ["t.name", "t.class_type", "t.level", "b.name", "u.name"], select: "t.*, COALESCE(t.class_type, t.name) AS class_type, b.name AS branch_name, u.name AS tutor_name", join: "LEFT JOIN branches b ON b.id=t.branch_id LEFT JOIN users u ON u.id=t.tutor_id", scoped: true, tutorOwned: true, r: ALL, c: STAFF, u: [...STAFF, "tutor"] },
  students: { fields: ["name", "parent_name", "parent_phone", "class_id", "class_type", "level", "branch_id", "user_id", "parent_user_id", "joined_at", "left_at", "status", "course_completed", "completed_at", "certificate_delivery", "certificate_url", "certificate_code"], search: ["t.name", "t.parent_name", "b.name", "c.name", "t.class_type", "t.level"], select: "t.*, b.name AS branch_name, COALESCE(c.class_type, c.name) AS class_name, su.name AS student_account_name, pu.name AS parent_account_name", join: "LEFT JOIN branches b ON b.id=t.branch_id LEFT JOIN classes c ON c.id=t.class_id LEFT JOIN users su ON su.id=t.user_id LEFT JOIN users pu ON pu.id=t.parent_user_id", scoped: true, tutorClassStudentScoped: true, r: [...STAFF, "tutor"], c: STAFF, u: STAFF },
  products: { fields: ["name", "category", "age_group", "price", "stock", "image", "description"], search: ["t.name", "t.category", "t.age_group"], select: "t.*", join: "", r: ALL, c: STAFF, u: STAFF },
  bills: { fields: ["student_id", "title", "month", "amount", "discount", "due_date", "status", "payment_method", "proof", "paid_at", "notes", "branch_id"], search: ["t.title", "t.month", "s.name", "b.name"], select: "t.*, s.name AS student_name, s.parent_phone, b.name AS branch_name", join: "LEFT JOIN students s ON s.id=t.student_id LEFT JOIN branches b ON b.id=t.branch_id", scoped: true, studentLinkScoped: true, r: ALL, c: STAFF, u: STAFF },
  attendance: { fields: ["student_id", "class_id", "date", "status", "branch_id"], search: ["t.status", "s.name", "c.name", "b.name"], select: "t.*, s.name AS student_name, COALESCE(c.class_type, c.name) AS class_name, b.name AS branch_name", join: "LEFT JOIN students s ON s.id=t.student_id LEFT JOIN classes c ON c.id=t.class_id LEFT JOIN branches b ON b.id=t.branch_id", scoped: true, studentLinkScoped: true, tutorClassScoped: true, r: ALL, c: [...STAFF, "tutor"], u: STAFF },
  tutor_attendance: { fields: ["tutor_id", "class_id", "branch_id", "date", "check_in", "late_minutes", "status", "notes"], search: ["u.name", "c.name", "b.name", "t.status", "t.notes"], select: "t.*, u.name AS tutor_name, COALESCE(c.class_type, c.name) AS class_name, b.name AS branch_name", join: "LEFT JOIN users u ON u.id=t.tutor_id LEFT JOIN classes c ON c.id=t.class_id LEFT JOIN branches b ON b.id=t.branch_id", scoped: true, tutorScoped: true, r: [...STAFF, "tutor"], c: [...STAFF, "tutor"], u: STAFF },
  expenses: { fields: ["title", "category", "amount", "expense_date", "branch_id", "notes"], search: ["t.title", "t.category", "b.name", "t.notes"], select: "t.*, b.name AS branch_name", join: "LEFT JOIN branches b ON b.id=t.branch_id", scoped: true, r: STAFF, c: STAFF, u: STAFF },
  learning_reports: { fields: ["student_id", "class_id", "tutor_id", "branch_id", "report_month", "report_date", "material", "homework", "formative_score", "summative_score", "speaking_score", "notes"], search: ["s.name", "c.name", "u.name", "t.material", "t.homework", "t.report_month"], select: "t.*, s.name AS student_name, COALESCE(c.class_type, c.name) AS class_name, u.name AS tutor_name, b.name AS branch_name", join: "LEFT JOIN students s ON s.id=t.student_id LEFT JOIN classes c ON c.id=t.class_id LEFT JOIN users u ON u.id=t.tutor_id LEFT JOIN branches b ON b.id=t.branch_id", scoped: true, tutorAutoId: true, tutorReportScoped: true, studentLinkScoped: true, r: ALL, c: [...STAFF, "tutor"], u: [...STAFF, "tutor"] },
  audio_materials: { fields: ["title", "level", "module_name", "audio_url", "description", "branch_id"], search: ["t.title", "t.level", "t.module_name", "t.description"], select: "t.*, b.name AS branch_name, u.name AS author_name", join: "LEFT JOIN branches b ON b.id=t.branch_id LEFT JOIN users u ON u.id=t.created_by", setCreatedBy: true, r: ALL, c: [...STAFF, "tutor"], u: [...STAFF, "tutor"] },
  video_projects: { fields: ["student_id", "class_id", "branch_id", "month", "title", "video_url", "description", "score", "feedback", "status"], search: ["t.title", "t.month", "s.name", "c.name", "b.name"], select: "t.*, s.name AS student_name, COALESCE(c.class_type, c.name) AS class_name, b.name AS branch_name", join: "LEFT JOIN students s ON s.id=t.student_id LEFT JOIN classes c ON c.id=t.class_id LEFT JOIN branches b ON b.id=t.branch_id", scoped: true, studentLinkOrUserScoped: true, tutorVideoScoped: true, setUserIdOnCreate: true, reviewByStaffTutor: true, r: ALL, c: ALL, u: [...STAFF, "tutor"] },
  referrals: { fields: ["referrer_name", "referred_student_name", "referred_phone", "branch_id", "commission_amount", "status", "applied_bill_id", "notes"], search: ["t.referrer_name", "t.referred_student_name", "b.name"], select: "t.*, b.name AS branch_name, bl.title AS applied_bill_title", join: "LEFT JOIN branches b ON b.id=t.branch_id LEFT JOIN bills bl ON bl.id=t.applied_bill_id", scoped: true, referrerScoped: true, setReferrerUserId: true, approve: STAFF, r: ALL, c: ALL, u: STAFF },
  leaves: { fields: ["type", "requester_name", "reason", "start_date", "end_date", "status", "branch_id"], search: ["t.requester_name", "t.reason", "b.name"], select: "t.*, b.name AS branch_name", join: "LEFT JOIN branches b ON b.id=t.branch_id", scoped: true, approve: HQ, ownUserScoped: true, setUserIdOnCreate: true, r: ALL, c: ALL, u: STAFF },
  complaints: { fields: ["from_name", "subject", "message", "status", "branch_id"], search: ["t.from_name", "t.subject", "b.name"], select: "t.*, b.name AS branch_name", join: "LEFT JOIN branches b ON b.id=t.branch_id", complaintsScoped: true, setUserIdOnCreate: true, r: ALL, c: ALL, u: STAFF },
  announcements: { fields: ["info_type", "letter_no", "title", "body", "event_date", "branch_id"], search: ["t.title", "t.info_type", "t.letter_no", "b.name"], select: "t.*, b.name AS branch_name", join: "LEFT JOIN branches b ON b.id=t.branch_id", r: ALL, c: STAFF, u: STAFF },
};

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch((e) => { console.error(e); res.status(e.status || 500).json({ success: false, message: e.status ? e.message : "Terjadi kesalahan server" }); });
const fail = (res, code, message) => res.status(code).json({ success: false, message });
const clean = (v) => (typeof v === "string" ? v.replace(/<[^>]*>/g, "").trim() || null : v === "" ? null : v);

const auth = (req, res, next) => {
  try { req.user = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), process.env.JWT_SECRET); next(); }
  catch { fail(res, 401, "Sesi berakhir, silakan login ulang"); }
};
const can = (roles) => (req, res, next) => (roles.includes(req.user.role) ? next() : fail(res, 403, "Akses ditolak"));
// Multi-branch tutor: admin_cabang di-scope ke cabangnya, sedangkan tutor di-scope ke kelasnya sendiri (bukan dikunci ke 1 cabang)
const isScoped = (cfg, u) => cfg.scoped && u.role === "admin_cabang";

function getServerNowParts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    minutes: d.getHours() * 60 + d.getMinutes(),
  };
}

function parseScheduleStartMinutes(schedule) {
  const m = String(schedule || "").match(/(?:^|\D)(\d{1,2})[:.](\d{2})(?:\D|$)/);
  if (!m) return null;
  const hh = Number(m[1]), mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

async function computeServerCheckIn(classId, tutorId, fallbackBranchId) {
  const now = getServerNowParts();
  let branchId = fallbackBranchId || null;
  let lateMinutes = 0;

  if (classId) {
    const [[cls]] = await pool.query("SELECT id, tutor_id, branch_id, schedule FROM classes WHERE id=?", [classId]);
    if (!cls) {
      const err = new Error("Kelas tidak ditemukan");
      err.status = 404;
      throw err;
    }
    if (cls.tutor_id && Number(cls.tutor_id) !== Number(tutorId)) {
      const err = new Error("Anda hanya dapat melakukan absensi untuk kelas yang Anda ajar");
      err.status = 403;
      throw err;
    }
    branchId = cls.branch_id || branchId;
    const startMins = parseScheduleStartMinutes(cls.schedule);
    if (startMins !== null) {
      lateMinutes = Math.max(0, now.minutes - startMins);
    }
  }

  return {
    date: now.date,
    check_in: now.time,
    late_minutes: lateMinutes,
    status: lateMinutes > 0 ? "terlambat" : "hadir",
    branch_id: branchId,
  };
}

function pickData(cfg, body, user, isNew) {
  const d = {};
  cfg.fields.forEach((f) => body[f] !== undefined && (d[f] = clean(body[f])));
  if (cfg.approve && !cfg.approve.includes(user.role)) { delete d.status; if (isNew) d.status = "pending"; }
  if (cfg.reviewByStaffTutor && !["owner", "admin_pusat", "admin_cabang", "tutor"].includes(user.role)) {
    delete d.score; delete d.feedback;
    if (isNew) d.status = "submitted"; else delete d.status;
  }
  if (cfg.setReferrerUserId && !STAFF.includes(user.role)) {
    delete d.commission_amount; delete d.applied_bill_id;
    if (isNew) { d.referrer_user_id = user.id; d.status = "pending"; }
  }
  if (isScoped(cfg, user)) d.branch_id = user.branch_id;
  if (cfg.tutorScoped && user.role === "tutor") d.tutor_id = user.id;
  if (cfg.tutorAutoId && user.role === "tutor") d.tutor_id = user.id;
  if (cfg.setUserIdOnCreate && isNew) d.user_id = user.id;
  if (cfg.setCreatedBy && isNew) d.created_by = user.id;
  return d;
}

// Public & Auth
app.get("/api/public/branches", wrap(async (req, res) => {
  const where = ["status='active'"], args = [];
  if (req.query.id) { where.push("id=?"); args.push(req.query.id); }
  if (req.query.search) { where.push("(name LIKE ? OR city LIKE ?)"); args.push(`%${req.query.search}%`, `%${req.query.search}%`); }
  const [rows] = await pool.query(`SELECT id, name, city FROM branches WHERE ${where.join(" AND ")} ORDER BY name ASC`, args);
  res.json({ success: true, data: rows });
}));

app.post("/api/auth/register", wrap(async (req, res) => {
  const name = clean(req.body.name), email = clean(req.body.email)?.toLowerCase(), password = String(req.body.password || "");
  const role = req.body.role === "siswa" ? "siswa" : "ortu";
  const phone = clean(req.body.phone);
  const defaultClassType = clean(req.body.class_type) || "Regular";
  const defaultLevel = clean(req.body.level) || "Preschool (Pre A1)";
  const defaultBranchId = req.body.branch_id ? Number(req.body.branch_id) : null;
  const today = getServerNowParts().date;

  if (!name || !email || !password) return fail(res, 400, "Nama, email, dan password wajib diisi");
  const [[dup]] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
  if (dup) return fail(res, 400, "Email sudah terdaftar");

  const hash = await bcrypt.hash(password, 10);
  const [ur] = await pool.query(
    "INSERT INTO users(name,email,password,role,branch_id,phone,status) VALUES(?,?,?,?,?,?, 'active')",
    [name, email, hash, role, defaultBranchId, phone]
  );
  const userId = ur.insertId;

  if (role === "ortu" && Array.isArray(req.body.children) && req.body.children.length > 0) {
    for (const ch of req.body.children) {
      const childName = clean(ch?.name);
      if (!childName) continue;
      await pool.query(
        "INSERT INTO students(name,parent_name,parent_phone,class_type,level,branch_id,parent_user_id,joined_at,status) VALUES(?,?,?,?,?,?,?,?, 'active')",
        [
          childName,
          name,
          phone,
          clean(ch?.class_type) || defaultClassType,
          clean(ch?.level) || defaultLevel,
          ch?.branch_id ? Number(ch.branch_id) : defaultBranchId,
          userId,
          today,
        ]
      );
    }
  } else {
    const studentName = clean(req.body.student_name) || name;
    await pool.query(
      "INSERT INTO students(name,parent_name,parent_phone,class_type,level,branch_id,user_id,parent_user_id,joined_at,status) VALUES(?,?,?,?,?,?,?,?,?, 'active')",
      [studentName, role === "ortu" ? name : null, phone, defaultClassType, defaultLevel, defaultBranchId, role === "siswa" ? userId : null, role === "ortu" ? userId : null, today]
    );
  }

  const [[u]] = await pool.query("SELECT u.*, b.name AS branch_name FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.id=?", [userId]);
  const user = { id: u.id, name: u.name, email: u.email, role: u.role, branch_id: u.branch_id, branch_name: u.branch_name || null };
  res.status(201).json({ success: true, data: { token: jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "12h" }), user } });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
  const [[u]] = await pool.query("SELECT u.*, b.name AS branch_name FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.email=?", [String(req.body.email || "").trim()]);
  if (!u || !(await bcrypt.compare(String(req.body.password || ""), u.password))) return fail(res, 401, "Email atau password salah");
  if (u.status === "inactive") return fail(res, 403, "Akun Anda sedang dinonaktifkan");
  const user = { id: u.id, name: u.name, email: u.email, role: u.role, branch_id: u.branch_id, branch_name: u.branch_name || null };
  res.json({ success: true, data: { token: jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "12h" }), user } });
}));
app.get("/api/auth/profile", auth, (req, res) => res.json({ success: true, data: req.user }));

// User management (Multi-Branch RBAC + Sorting Role/Status)
const USER_SORT_MAP = {
  id: "u.id",
  name: "u.name",
  email: "u.email",
  role: "u.role",
  status: "COALESCE(u.status,'active')",
  branch_name: "b.name",
  created_at: "u.created_at",
};

app.get("/api/users", auth, can(STAFF), wrap(async (req, res) => {
  const q = req.query, page = Math.max(+q.page || 1, 1), limit = [10, 25, 50, 100].includes(+q.limit) ? +q.limit : 10;
  const where = [], args = [];
  if (q.search) { where.push("(u.name LIKE ? OR u.email LIKE ? OR b.name LIKE ?)"); args.push(`%${q.search}%`, `%${q.search}%`, `%${q.search}%`); }
  if (q.id !== undefined && q.id !== "") { where.push("u.id=?"); args.push(q.id); }
  if (q.role) { where.push("u.role=?"); args.push(q.role); }
  if (q.status) { where.push("COALESCE(u.status,'active')=?"); args.push(q.status); }
  if (q.branch_id) {
    where.push("(u.branch_id=? OR EXISTS (SELECT 1 FROM classes tc WHERE tc.tutor_id=u.id AND tc.branch_id=?))");
    args.push(q.branch_id, q.branch_id);
  }
  if (req.user.role === "admin_cabang") {
    where.push("(u.branch_id=? OR (u.role='tutor' AND EXISTS (SELECT 1 FROM classes tc WHERE tc.tutor_id=u.id AND tc.branch_id=?))) AND u.role IN ('tutor','siswa','ortu')");
    args.push(req.user.branch_id, req.user.branch_id);
  }
  const sortExpr = USER_SORT_MAP[q.sort] || "u.id";
  const sortOrder = q.order === "asc" ? "ASC" : "DESC";
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM users u LEFT JOIN branches b ON b.id=u.branch_id ${w}`, args);
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.branch_id, u.phone, u.hourly_rate, COALESCE(u.status,'active') AS status, u.created_at,
      b.name AS branch_name,
      (SELECT GROUP_CONCAT(DISTINCT cb.name ORDER BY cb.name SEPARATOR ', ') FROM classes tc INNER JOIN branches cb ON cb.id=tc.branch_id WHERE tc.tutor_id=u.id) AS teaching_branches
     FROM users u
     LEFT JOIN branches b ON b.id=u.branch_id
     ${w}
     ORDER BY ${sortExpr} ${sortOrder}, u.id DESC
     LIMIT ? OFFSET ?`,
    [...args, limit, (page - 1) * limit]
  );
  res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

app.post("/api/users", auth, can(STAFF), wrap(async (req, res) => {
  const name = clean(req.body.name), email = clean(req.body.email)?.toLowerCase(), password = String(req.body.password || "");
  const role = clean(req.body.role), phone = clean(req.body.phone), status = clean(req.body.status) || "active";
  const hourly_rate = req.body.hourly_rate ? Number(req.body.hourly_rate) : null;
  let branch_id = req.body.branch_id ? Number(req.body.branch_id) : null;
  if (!name || !email || !password || !role) return fail(res, 400, "Nama, email, password, dan role wajib diisi");
  if (!ALL.includes(role)) return fail(res, 400, "Role tidak valid");
  if (req.user.role === "admin_cabang") {
    if (!BRANCH_USER_ROLES.includes(role)) return fail(res, 403, "Admin cabang hanya dapat membuat akun tutor, siswa, atau ortu");
    branch_id = req.user.branch_id;
  }
  const [[dup]] = await pool.query("SELECT id FROM users WHERE email=?", [email]);
  if (dup) return fail(res, 400, "Email sudah terdaftar");
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query("INSERT INTO users(name,email,password,role,branch_id,phone,hourly_rate,status) VALUES(?,?,?,?,?,?,?,?)", [name, email, hash, role, branch_id, phone, hourly_rate, status]);
  res.status(201).json({ success: true, data: { id: r.insertId } });
}));

app.put("/api/users/:id", auth, can(STAFF), wrap(async (req, res) => {
  const [[target]] = await pool.query("SELECT id, role, branch_id FROM users WHERE id=?", [req.params.id]);
  if (!target) return fail(res, 404, "User tidak ditemukan");
  if (req.user.role === "admin_cabang" && (target.branch_id !== req.user.branch_id || !BRANCH_USER_ROLES.includes(target.role))) {
    return fail(res, 403, "Akses ditolak untuk user cabang lain");
  }
  const name = clean(req.body.name), email = clean(req.body.email)?.toLowerCase(), role = clean(req.body.role);
  const phone = req.body.phone !== undefined ? clean(req.body.phone) : undefined;
  const status = req.body.status !== undefined ? clean(req.body.status) : undefined;
  const hourly_rate = req.body.hourly_rate !== undefined ? (req.body.hourly_rate ? Number(req.body.hourly_rate) : null) : undefined;
  let branch_id = req.body.branch_id !== undefined ? (req.body.branch_id ? Number(req.body.branch_id) : null) : undefined;
  if (!name || !email || !role) return fail(res, 400, "Nama, email, dan role wajib diisi");
  if (!ALL.includes(role)) return fail(res, 400, "Role tidak valid");
  if (req.user.role === "admin_cabang") {
    if (!BRANCH_USER_ROLES.includes(role)) return fail(res, 403, "Admin cabang hanya dapat mengelola tutor, siswa, atau ortu");
    branch_id = req.user.branch_id;
  }
  const [[dup]] = await pool.query("SELECT id FROM users WHERE email=? AND id<>?", [email, req.params.id]);
  if (dup) return fail(res, 400, "Email sudah dipakai user lain");

  const sets = ["name=?", "email=?", "role=?"];
  const args = [name, email, role];
  if (branch_id !== undefined) { sets.push("branch_id=?"); args.push(branch_id); }
  if (phone !== undefined) { sets.push("phone=?"); args.push(phone); }
  if (hourly_rate !== undefined) { sets.push("hourly_rate=?"); args.push(hourly_rate); }
  if (status !== undefined) { sets.push("status=?"); args.push(status || "active"); }
  if (req.body.password && String(req.body.password).trim()) {
    sets.push("password=?");
    args.push(await bcrypt.hash(String(req.body.password), 10));
  }
  await pool.query(`UPDATE users SET ${sets.join(",")} WHERE id=?`, [...args, req.params.id]);
  res.json({ success: true, message: "User berhasil diperbarui" });
}));

app.delete("/api/users/:id", auth, can(STAFF), wrap(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return fail(res, 400, "Tidak dapat menghapus akun sendiri");
  const [[target]] = await pool.query("SELECT id, role, branch_id FROM users WHERE id=?", [req.params.id]);
  if (!target) return fail(res, 404, "User tidak ditemukan");
  if (req.user.role === "admin_cabang" && (target.branch_id !== req.user.branch_id || !BRANCH_USER_ROLES.includes(target.role))) {
    return fail(res, 403, "Akses ditolak untuk user cabang lain");
  }
  await pool.query("DELETE FROM users WHERE id=?", [req.params.id]);
  res.json({ success: true, message: "User berhasil dihapus" });
}));

app.get("/api/my-students", auth, wrap(async (req, res) => {
  const search = String(req.query.search || "").trim(), limit = Math.min(Math.max(+req.query.limit || 25, 1), 100);
  const where = [], args = [];
  if (["siswa", "ortu"].includes(req.user.role)) {
    where.push("(s.user_id=? OR s.parent_user_id=?)");
    args.push(req.user.id, req.user.id);
  } else if (req.user.role === "admin_cabang") {
    where.push("s.branch_id=?");
    args.push(req.user.branch_id);
  } else if (req.user.role === "tutor") {
    where.push("c.tutor_id=?");
    args.push(req.user.id);
  }
  if (search) { where.push("s.name LIKE ?"); args.push(`%${search}%`); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [rows] = await pool.query(
    `SELECT s.*, COALESCE(c.class_type, c.name, s.class_type) AS class_name, b.name AS branch_name
     FROM students s
     LEFT JOIN classes c ON c.id=s.class_id
     LEFT JOIN branches b ON b.id=s.branch_id
     ${w}
     ORDER BY s.name ASC LIMIT ?`,
    [...args, limit]
  );
  res.json({ success: true, data: rows });
}));

// Portal Siswa & Ortu (Multi-anak #19, Pembatasan field Ortu #4, E-Sertifikat #16)
app.get("/api/portal-summary", auth, wrap(async (req, res) => {
  const isPortal = ["siswa", "ortu"].includes(req.user.role);
  const isParent = req.user.role === "ortu";
  const selectedStudentId = req.query.student_id ? Number(req.query.student_id) : null;

  const [rawStudents] = isPortal
    ? await pool.query(
        `SELECT s.*,
          COALESCE(c.class_type, c.name, s.class_type) AS class_type,
          COALESCE(c.class_type, c.name, s.class_type) AS class_name,
          COALESCE(NULLIF(c.level,''), s.level) AS level,
          c.schedule,
          COALESCE(c.type, 'offline') AS class_mode,
          c.meeting_url,
          u.name AS tutor_name,
          b.name AS branch_name
         FROM students s
         LEFT JOIN classes c ON c.id=s.class_id
         LEFT JOIN users u ON u.id=c.tutor_id
         LEFT JOIN branches b ON b.id=s.branch_id
         WHERE s.user_id=? OR s.parent_user_id=?
         ORDER BY s.id ASC`,
        [req.user.id, req.user.id]
      )
    : [[]];

  // #4: Ortu tidak melihat nama tutor & link meeting
  const students = rawStudents.map((s) => (isParent ? { ...s, tutor_name: null, meeting_url: null } : s));

  const activeStuIds = selectedStudentId && students.some((s) => s.id === selectedStudentId)
    ? [selectedStudentId]
    : students.map((s) => s.id);

  let att = { total: 0, hadir: 0, rate: 0 };
  let billSummary = { unpaidCount: 0, verifikasiCount: 0, unpaidAmount: 0, paidCount: 0 };
  let recentReports = [];
  let uas100Count = 0;
  let claimedFreeSpp = 0;
  let videoCount = 0;

  if (activeStuIds.length) {
    const ph = activeStuIds.map(() => "?").join(",");
    const [[attR]] = await pool.query(`SELECT COUNT(*) total, COALESCE(SUM(status='hadir'),0) hadir FROM attendance WHERE student_id IN (${ph})`, activeStuIds);
    att = { total: Number(attR.total || 0), hadir: Number(attR.hadir || 0), rate: attR.total ? Math.round((Number(attR.hadir || 0) * 100) / Number(attR.total)) : 0 };
    const [[billR]] = await pool.query(`SELECT COALESCE(SUM(status IN ('unpaid','overdue')),0) unpaidCount, COALESCE(SUM(status='verifikasi'),0) verifikasiCount, COALESCE(SUM(CASE WHEN status<>'paid' THEN GREATEST(0, amount - COALESCE(discount,0)) ELSE 0 END),0) unpaidAmount, COALESCE(SUM(status='paid'),0) paidCount FROM bills WHERE student_id IN (${ph})`, activeStuIds);
    billSummary = { unpaidCount: Number(billR.unpaidCount || 0), verifikasiCount: Number(billR.verifikasiCount || 0), unpaidAmount: Number(billR.unpaidAmount || 0), paidCount: Number(billR.paidCount || 0) };
    const [reps] = await pool.query(
      `SELECT lr.*, s.name AS student_name, COALESCE(c.class_type, c.name, s.class_type) AS class_name
       FROM learning_reports lr
       LEFT JOIN students s ON s.id=lr.student_id
       LEFT JOIN classes c ON c.id=lr.class_id
       WHERE lr.student_id IN (${ph})
       ORDER BY lr.report_date DESC, lr.id DESC LIMIT 6`,
      activeStuIds
    );
    recentReports = isParent ? reps.map((r) => ({ ...r, tutor_id: null, tutor_name: null })) : reps;
    const [[u100]] = await pool.query(`SELECT COUNT(*) n FROM learning_reports WHERE student_id IN (${ph}) AND summative_score >= 100`, activeStuIds);
    const [[clm]] = await pool.query(`SELECT COUNT(*) n FROM reward_claims WHERE student_id IN (${ph})`, activeStuIds);
    const [[vid]] = await pool.query(
      selectedStudentId ? `SELECT COUNT(*) n FROM video_projects WHERE student_id IN (${ph})` : `SELECT COUNT(*) n FROM video_projects WHERE student_id IN (${ph}) OR user_id=?`,
      selectedStudentId ? activeStuIds : [...activeStuIds, req.user.id]
    );
    uas100Count = Number(u100.n || 0);
    claimedFreeSpp = Number(clm.n || 0);
    videoCount = Number(vid.n || 0);
  }
  const [announcements] = await pool.query("SELECT t.*, b.name AS branch_name FROM announcements t LEFT JOIN branches b ON b.id=t.branch_id ORDER BY t.id DESC LIMIT 4");
  res.json({
    success: true,
    data: {
      students,
      selectedStudentId,
      attendance: att,
      bills: billSummary,
      recentReports,
      achievements: { uas100Count, freeSppEarned: Math.floor(uas100Count / 20), claimedFreeSpp, progressToNext: uas100Count % 20 },
      videoCount,
      announcements,
      bankInfo: BANK_INFO,
    },
  });
}));

// #19 Tambah anak dalam 1 akun ortu (1 email untuk beberapa anak)
app.post("/api/portal/add-child", auth, can(["ortu"]), wrap(async (req, res) => {
  const childName = clean(req.body.name);
  const classType = clean(req.body.class_type) || "Regular";
  const level = clean(req.body.level) || "Preschool (Pre A1)";
  const branchId = req.body.branch_id ? Number(req.body.branch_id) : (req.user.branch_id || null);
  if (!childName) return fail(res, 400, "Nama anak wajib diisi");

  const [[parent]] = await pool.query("SELECT name, phone FROM users WHERE id=?", [req.user.id]);
  const [r] = await pool.query(
    "INSERT INTO students(name,parent_name,parent_phone,class_type,level,branch_id,parent_user_id,joined_at,status) VALUES(?,?,?,?,?,?,?,?, 'active')",
    [childName, parent?.name || req.user.name, parent?.phone || null, classType, level, branchId, req.user.id, getServerNowParts().date]
  );
  res.status(201).json({ success: true, data: { id: r.insertId }, message: `Data anak "${childName}" berhasil ditambahkan ke akun Anda!` });
}));

// #16 Pilihan E-Sertifikat atau Ambil di Admin Pusat (Dedaun)
app.post("/api/portal/certificate-choice", auth, can(["siswa", "ortu"]), wrap(async (req, res) => {
  const studentId = Number(req.body.student_id);
  const choice = req.body.choice === "pickup_pusat" ? "pickup_pusat" : req.body.choice === "download" ? "download" : null;
  if (!studentId || !choice) return fail(res, 400, "Siswa dan pilihan sertifikat wajib valid");

  const [[stu]] = await pool.query("SELECT * FROM students WHERE id=?", [studentId]);
  if (!stu) return fail(res, 404, "Data siswa tidak ditemukan");
  if (stu.user_id !== req.user.id && stu.parent_user_id !== req.user.id) return fail(res, 403, "Akses ditolak");
  if (!Number(stu.course_completed)) return fail(res, 400, "Course siswa ini belum ditandai selesai oleh Admin");

  const certCode = stu.certificate_code || `ADLS-CERT-${new Date().getFullYear()}-${String(stu.id).padStart(4, "0")}`;
  await pool.query("UPDATE students SET certificate_delivery=?, certificate_code=? WHERE id=?", [choice, certCode, studentId]);
  res.json({
    success: true,
    data: { certificate_delivery: choice, certificate_code: certCode },
    message: choice === "pickup_pusat"
      ? "Pilihan pengambilan sertifikat di Admin Pusat (Dedaun) berhasil dicatat."
      : "E-Sertifikat siap diunduh!",
  });
}));

app.get("/api/portal/certificate/:studentId", auth, can([...STAFF, "siswa", "ortu"]), wrap(async (req, res) => {
  const studentId = Number(req.params.studentId);
  const [[stu]] = await pool.query(
    `SELECT s.*, b.name AS branch_name, COALESCE(c.class_type, c.name, s.class_type) AS class_type, COALESCE(NULLIF(c.level,''), s.level) AS course_level
     FROM students s
     LEFT JOIN branches b ON b.id=s.branch_id
     LEFT JOIN classes c ON c.id=s.class_id
     WHERE s.id=?`,
    [studentId]
  );
  if (!stu) return fail(res, 404, "Siswa tidak ditemukan");
  if (["siswa", "ortu"].includes(req.user.role) && stu.user_id !== req.user.id && stu.parent_user_id !== req.user.id) {
    return fail(res, 403, "Akses ditolak");
  }
  if (!Number(stu.course_completed)) return fail(res, 400, "Course siswa belum selesai");

  const certCode = stu.certificate_code || `ADLS-CERT-${new Date().getFullYear()}-${String(stu.id).padStart(4, "0")}`;
  if (!stu.certificate_code) {
    await pool.query("UPDATE students SET certificate_code=? WHERE id=?", [certCode, stu.id]);
  }
  res.json({
    success: true,
    data: {
      student_id: stu.id,
      student_name: stu.name,
      class_type: stu.class_type || "Regular",
      level: stu.course_level || stu.level || "-",
      branch_name: stu.branch_name || "ADLS Pusat (Dedaun)",
      completed_at: stu.completed_at || getServerNowParts().date,
      certificate_code: certCode,
      certificate_url: stu.certificate_url || null,
      certificate_delivery: stu.certificate_delivery || "download",
    },
  });
}));

// Tutor Portal Endpoints (#7 Isolasi Tutor, #8 Laporan Belajar Auto, #9 Absen Real-Time)
app.get("/api/tutor-portal/overview", auth, can(["tutor"]), wrap(async (req, res) => {
  const now = getServerNowParts();
  const [classes] = await pool.query(
    `SELECT c.*,
      COALESCE(c.class_type, c.name) AS class_type,
      b.name AS branch_name,
      b.city AS branch_city,
      (SELECT COUNT(*) FROM students s WHERE s.class_id=c.id AND s.status='active') AS student_count,
      ta.id AS today_att_id,
      ta.check_in AS today_check_in,
      ta.late_minutes AS today_late_minutes,
      ta.status AS today_status
     FROM classes c
     LEFT JOIN branches b ON b.id=c.branch_id
     LEFT JOIN tutor_attendance ta ON ta.tutor_id=? AND ta.class_id=c.id AND ta.date=?
     WHERE c.tutor_id=?
     ORDER BY b.name ASC, c.schedule ASC, c.id ASC`,
    [req.user.id, now.date, req.user.id]
  );

  const branchMap = new Map();
  classes.forEach((c) => {
    const key = c.branch_id || 0;
    if (!branchMap.has(key)) {
      branchMap.set(key, { branch_id: c.branch_id, branch_name: c.branch_name || "Pusat / Umum", class_count: 0 });
    }
    branchMap.get(key).class_count += 1;
  });

  res.json({
    success: true,
    data: {
      server_date: now.date,
      server_time: now.time,
      branches: Array.from(branchMap.values()),
      classes,
    },
  });
}));

app.post("/api/tutor-portal/check-in", auth, can(["tutor"]), wrap(async (req, res) => {
  const classId = Number(req.body.class_id);
  if (!classId) return fail(res, 400, "Kelas wajib dipilih untuk absensi masuk");
  const serverAtt = await computeServerCheckIn(classId, req.user.id, req.user.branch_id);

  const [[existing]] = await pool.query(
    "SELECT id, check_in, late_minutes, status FROM tutor_attendance WHERE tutor_id=? AND class_id=? AND date=? ORDER BY id DESC LIMIT 1",
    [req.user.id, classId, serverAtt.date]
  );
  if (existing) {
    return res.json({
      success: true,
      alreadyCheckedIn: true,
      data: { ...existing, date: serverAtt.date },
      message: `Sudah absen masuk untuk kelas ini hari ini pukul ${existing.check_in}`,
    });
  }

  const [r] = await pool.query(
    "INSERT INTO tutor_attendance(tutor_id,class_id,branch_id,date,check_in,late_minutes,status,notes) VALUES(?,?,?,?,?,?,?,?)",
    [req.user.id, classId, serverAtt.branch_id, serverAtt.date, serverAtt.check_in, serverAtt.late_minutes, serverAtt.status, clean(req.body.notes)]
  );
  res.status(201).json({
    success: true,
    alreadyCheckedIn: false,
    data: { id: r.insertId, ...serverAtt },
    message: serverAtt.late_minutes > 0
      ? `Absensi masuk tercatat pukul ${serverAtt.check_in} WIB (Terlambat ${serverAtt.late_minutes} menit)`
      : `Absensi masuk tepat waktu tercatat pukul ${serverAtt.check_in} WIB`,
  });
}));

app.get("/api/tutor-portal/class/:id", auth, can(["tutor"]), wrap(async (req, res) => {
  const classId = Number(req.params.id);
  const now = getServerNowParts();
  const date = clean(req.query.date) || now.date;
  const month = clean(req.query.month) || date.slice(0, 7);

  const [[cls]] = await pool.query(
    `SELECT c.*, COALESCE(c.class_type, c.name) AS class_type, b.name AS branch_name
     FROM classes c
     LEFT JOIN branches b ON b.id=c.branch_id
     WHERE c.id=?`,
    [classId]
  );
  if (!cls) return fail(res, 404, "Kelas tidak ditemukan");
  if (Number(cls.tutor_id) !== req.user.id) return fail(res, 403, "Anda hanya dapat mengakses kelas Anda sendiri");

  const [[todayAtt]] = await pool.query(
    "SELECT * FROM tutor_attendance WHERE tutor_id=? AND class_id=? AND date=? ORDER BY id DESC LIMIT 1",
    [req.user.id, classId, date]
  );

  const [students] = await pool.query(
    `SELECT s.id, s.name, s.level, s.class_type, s.parent_name, s.parent_phone
     FROM students s
     WHERE s.class_id=? AND s.status='active'
     ORDER BY s.name ASC`,
    [classId]
  );

  const [attRows] = await pool.query(
    "SELECT student_id, status FROM attendance WHERE class_id=? AND date=?",
    [classId, date]
  );
  const attMap = Object.fromEntries(attRows.map((r) => [r.student_id, r.status]));

  const [repRows] = await pool.query(
    `SELECT * FROM learning_reports
     WHERE class_id=? AND report_month=?
     ORDER BY CASE WHEN report_date=? THEN 0 ELSE 1 END, id DESC`,
    [classId, month, date]
  );
  const repMap = new Map();
  repRows.forEach((r) => {
    if (!repMap.has(r.student_id)) repMap.set(r.student_id, r);
  });

  const hydratedStudents = students.map((s) => {
    const rep = repMap.get(s.id) || null;
    return {
      student_id: s.id,
      name: s.name,
      level: s.level || cls.level,
      class_type: s.class_type || cls.class_type,
      attendance_status: attMap[s.id] || "",
      report_id: rep?.id || null,
      material: rep?.material || "",
      homework: rep?.homework || "",
      formative_score: rep?.formative_score ?? "",
      summative_score: rep?.summative_score ?? "",
      speaking_score: rep?.speaking_score ?? "",
      notes: rep?.notes || "",
    };
  });

  res.json({
    success: true,
    data: {
      server_date: now.date,
      server_time: now.time,
      class: cls,
      today_attendance: todayAtt || null,
      students: hydratedStudents,
    },
  });
}));

app.post("/api/tutor-portal/class/:id/save-session", auth, can(["tutor"]), wrap(async (req, res) => {
  const classId = Number(req.params.id);
  const [[cls]] = await pool.query("SELECT * FROM classes WHERE id=?", [classId]);
  if (!cls) return fail(res, 404, "Kelas tidak ditemukan");
  if (Number(cls.tutor_id) !== req.user.id) return fail(res, 403, "Anda hanya dapat mengelola kelas Anda sendiri");

  const now = getServerNowParts();
  const date = clean(req.body.date) || now.date;
  const reportMonth = clean(req.body.report_month) || date.slice(0, 7);
  const sharedMaterial = clean(req.body.material);
  const sharedHomework = clean(req.body.homework);
  const entries = Array.isArray(req.body.entries) ? req.body.entries : [];
  if (!entries.length) return fail(res, 400, "Tidak ada data siswa untuk disimpan");

  const [validStudents] = await pool.query("SELECT id FROM students WHERE class_id=?", [classId]);
  const validSet = new Set(validStudents.map((s) => s.id));

  let attendanceSaved = 0;
  let reportsSaved = 0;

  for (const item of entries) {
    const sid = Number(item.student_id);
    if (!validSet.has(sid)) continue;

    if (item.attendance_status && ["hadir", "izin", "sakit", "alpha"].includes(item.attendance_status)) {
      const [[existingAtt]] = await pool.query(
        "SELECT id FROM attendance WHERE student_id=? AND class_id=? AND date=? LIMIT 1",
        [sid, classId, date]
      );
      if (existingAtt) {
        await pool.query("UPDATE attendance SET status=?, branch_id=? WHERE id=?", [item.attendance_status, cls.branch_id, existingAtt.id]);
      } else {
        await pool.query("INSERT INTO attendance(student_id,class_id,date,status,branch_id) VALUES(?,?,?,?,?)", [sid, classId, date, item.attendance_status, cls.branch_id]);
      }
      attendanceSaved++;
    }

    const material = clean(item.material) ?? sharedMaterial;
    const homework = clean(item.homework) ?? sharedHomework;
    const fScore = item.formative_score !== "" && item.formative_score !== null && item.formative_score !== undefined ? Number(item.formative_score) : null;
    const sScore = item.summative_score !== "" && item.summative_score !== null && item.summative_score !== undefined ? Number(item.summative_score) : null;
    const spScore = item.speaking_score !== "" && item.speaking_score !== null && item.speaking_score !== undefined ? Number(item.speaking_score) : null;
    const notes = clean(item.notes);

    const hasReportInput = Boolean(item.report_id || material || homework || fScore !== null || sScore !== null || spScore !== null || notes);
    if (hasReportInput) {
      let repId = item.report_id ? Number(item.report_id) : null;
      if (repId) {
        const [[existingRep]] = await pool.query("SELECT id FROM learning_reports WHERE id=? AND student_id=? AND class_id=?", [repId, sid, classId]);
        if (!existingRep) repId = null;
      }
      if (!repId) {
        const [[existingRep]] = await pool.query(
          "SELECT id FROM learning_reports WHERE student_id=? AND class_id=? AND report_month=? ORDER BY CASE WHEN report_date=? THEN 0 ELSE 1 END, id DESC LIMIT 1",
          [sid, classId, reportMonth, date]
        );
        if (existingRep) repId = existingRep.id;
      }

      if (repId) {
        await pool.query(
          "UPDATE learning_reports SET tutor_id=?, branch_id=?, report_date=?, material=COALESCE(?, material), homework=COALESCE(?, homework), formative_score=?, summative_score=?, speaking_score=?, notes=? WHERE id=?",
          [req.user.id, cls.branch_id, date, material, homework, fScore, sScore, spScore, notes, repId]
        );
      } else {
        await pool.query(
          "INSERT INTO learning_reports(student_id,class_id,tutor_id,branch_id,report_month,report_date,material,homework,formative_score,summative_score,speaking_score,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
          [sid, classId, req.user.id, cls.branch_id, reportMonth, date, material || "Materi Pertemuan Harian", homework, fScore, sScore, spScore, notes]
        );
      }
      reportsSaved++;
    }
  }

  res.json({
    success: true,
    data: { attendanceSaved, reportsSaved },
    message: `Berhasil menyimpan ${attendanceSaved} absensi siswa & ${reportsSaved} laporan/nilai belajar`,
  });
}));

// #8 Admin Cabang / HQ siapkan slot laporan belajar kelas agar langsung muncul di portal tutor
app.post("/api/learning_reports/init-class", auth, can(STAFF), wrap(async (req, res) => {
  const classId = Number(req.body.class_id);
  const reportMonth = clean(req.body.report_month) || getServerNowParts().date.slice(0, 7);
  const reportDate = clean(req.body.report_date) || getServerNowParts().date;
  const material = clean(req.body.material);
  const homework = clean(req.body.homework);

  if (!classId) return fail(res, 400, "Kelas wajib dipilih");
  const [[cls]] = await pool.query("SELECT * FROM classes WHERE id=?", [classId]);
  if (!cls) return fail(res, 404, "Kelas tidak ditemukan");
  if (req.user.role === "admin_cabang" && cls.branch_id !== req.user.branch_id) {
    return fail(res, 403, "Akses ditolak untuk kelas cabang lain");
  }

  const [students] = await pool.query("SELECT id FROM students WHERE class_id=? AND status='active'", [classId]);
  if (!students.length) return fail(res, 400, "Belum ada siswa aktif di kelas ini");

  let created = 0;
  for (const s of students) {
    const [[dup]] = await pool.query(
      "SELECT id FROM learning_reports WHERE student_id=? AND class_id=? AND report_month=?",
      [s.id, classId, reportMonth]
    );
    if (!dup) {
      await pool.query(
        "INSERT INTO learning_reports(student_id,class_id,tutor_id,branch_id,report_month,report_date,material,homework) VALUES(?,?,?,?,?,?,?,?)",
        [s.id, classId, cls.tutor_id || null, cls.branch_id || null, reportMonth, reportDate, material, homework]
      );
      created++;
    }
  }
  res.status(201).json({
    success: true,
    data: { created, totalStudents: students.length },
    message: created
      ? `${created} kolom laporan/nilai siswa disiapkan & otomatis tampil di Portal Tutor!`
      : `Seluruh (${students.length}) siswa di kelas ini sudah memiliki kolom laporan untuk periode ${reportMonth}.`,
  });
}));

// Achievements 20x UAS 100 = Free 1x SPP
app.get("/api/achievements", auth, wrap(async (req, res) => {
  const search = String(req.query.search || "").trim();
  const branchFilter = req.user.role === "admin_cabang"
    ? req.user.branch_id
    : (req.query.branch_id ? Number(req.query.branch_id) || null : null);
  const where = [], args = [];
  if (["siswa", "ortu"].includes(req.user.role)) {
    where.push("(s.user_id=? OR s.parent_user_id=?)");
    args.push(req.user.id, req.user.id);
  } else if (req.user.role === "tutor") {
    where.push("c.tutor_id=?");
    args.push(req.user.id);
  } else if (branchFilter) {
    where.push("s.branch_id=?");
    args.push(branchFilter);
  }
  if (search) { where.push("(s.name LIKE ? OR b.name LIKE ? OR c.name LIKE ?)"); args.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [rows] = await pool.query(
    `SELECT s.id AS student_id, s.name AS student_name, s.level, b.name AS branch_name, COALESCE(c.class_type, c.name) AS class_name,
      COUNT(DISTINCT CASE WHEN lr.summative_score >= 100 THEN lr.id END) AS uas_100_count,
      COUNT(DISTINCT CASE WHEN lr.formative_score >= 100 THEN lr.id END) AS formatif_100_count,
      COUNT(DISTINCT rc.id) AS claimed_free_spp
     FROM students s
     LEFT JOIN branches b ON b.id=s.branch_id
     LEFT JOIN classes c ON c.id=s.class_id
     LEFT JOIN learning_reports lr ON lr.student_id=s.id
     LEFT JOIN reward_claims rc ON rc.student_id=s.id
     ${w}
     GROUP BY s.id, s.name, s.level, b.name, c.name, c.class_type
     ORDER BY uas_100_count DESC, formatif_100_count DESC, s.name ASC`,
    args
  );
  const data = rows.map((r) => {
    const uas100 = Number(r.uas_100_count || 0);
    const claimed = Number(r.claimed_free_spp || 0);
    const earned = Math.floor(uas100 / 20);
    return {
      student_id: r.student_id,
      student_name: r.student_name,
      level: r.level || "-",
      branch_name: r.branch_name || "-",
      class_name: r.class_name || "-",
      uas_100_count: uas100,
      formatif_100_count: Number(r.formatif_100_count || 0),
      free_spp_earned: earned,
      claimed_free_spp: claimed,
      available_free_spp: Math.max(0, earned - claimed),
      progress_to_next: uas100 % 20,
    };
  });
  res.json({ success: true, data });
}));

app.post("/api/achievements/claim", auth, can(STAFF), wrap(async (req, res) => {
  const studentId = Number(req.body.student_id);
  if (!studentId) return fail(res, 400, "Siswa wajib dipilih");
  const [[stu]] = await pool.query("SELECT id, name, branch_id FROM students WHERE id=?", [studentId]);
  if (!stu) return fail(res, 404, "Siswa tidak ditemukan");
  if (req.user.role === "admin_cabang" && stu.branch_id !== req.user.branch_id) return fail(res, 403, "Akses ditolak untuk cabang lain");
  const [[cnt]] = await pool.query("SELECT COUNT(*) n FROM learning_reports WHERE student_id=? AND summative_score >= 100", [studentId]);
  const [[clm]] = await pool.query("SELECT COUNT(*) n FROM reward_claims WHERE student_id=?", [studentId]);
  const earned = Math.floor(Number(cnt.n || 0) / 20);
  if (earned <= Number(clm.n || 0)) return fail(res, 400, "Belum memenuhi kelipatan 20x nilai UAS 100 untuk klaim Free 1x SPP");
  await pool.query("INSERT INTO reward_claims(student_id,reward_type,notes,claimed_by) VALUES(?,?,?,?)", [studentId, "free_spp_20x100", clean(req.body.notes) || "Gratis 1x SPP (20x UAS Nilai 100)", req.user.id]);
  res.status(201).json({ success: true, message: `Reward Gratis 1x SPP untuk ${stu.name} berhasil diklaim` });
}));

// Billing Actions (Generate, Pay to PT ADLS, Verify) & Referral Apply
app.get("/api/bills/bank-info", auth, (_, res) => res.json({ success: true, data: BANK_INFO }));

app.post("/api/bills/generate", auth, can(STAFF), wrap(async (req, res) => {
  const month = clean(req.body.month) || getServerNowParts().date.slice(0, 7);
  const amount = Number(req.body.amount) || 400000;
  const dueDate = clean(req.body.due_date) || `${month}-10`;
  const title = clean(req.body.title) || `SPP Bulan ${month}`;
  const branchId = req.user.role === "admin_cabang" ? req.user.branch_id : (req.body.branch_id ? Number(req.body.branch_id) : null);

  const where = ["status='active'"], args = [];
  if (branchId) { where.push("branch_id=?"); args.push(branchId); }
  const [students] = await pool.query(`SELECT id, branch_id FROM students WHERE ${where.join(" AND ")}`, args);

  let created = 0;
  for (const s of students) {
    const [[exists]] = await pool.query("SELECT id FROM bills WHERE student_id=? AND (month=? OR title=?)", [s.id, month, title]);
    if (!exists) {
      await pool.query("INSERT INTO bills(student_id,title,month,amount,due_date,status,branch_id) VALUES(?,?,?,?,?,'unpaid',?)", [s.id, title, month, amount, dueDate, s.branch_id]);
      created++;
    }
  }
  res.status(201).json({ success: true, message: `${created} tagihan SPP berhasil dibuat untuk periode ${month}`, data: { created } });
}));

app.post("/api/bills/:id/pay", auth, wrap(async (req, res) => {
  const [[bill]] = await pool.query("SELECT b.*, s.user_id, s.parent_user_id FROM bills b LEFT JOIN students s ON s.id=b.student_id WHERE b.id=?", [req.params.id]);
  if (!bill) return fail(res, 404, "Tagihan tidak ditemukan");
  if (["siswa", "ortu"].includes(req.user.role) && bill.user_id !== req.user.id && bill.parent_user_id !== req.user.id) {
    return fail(res, 403, "Akses ditolak untuk tagihan siswa lain");
  }
  const proof = clean(req.body.proof);
  const method = clean(req.body.payment_method) || "Transfer PT ADLS";
  const notes = clean(req.body.notes);
  if (!proof) return fail(res, 400, "Bukti transfer wajib diunggah");
  await pool.query("UPDATE bills SET status='verifikasi', payment_method=?, proof=?, notes=? WHERE id=?", [method, proof, notes, req.params.id]);
  res.json({ success: true, message: "Bukti pembayaran dikirim ke rekening PT ADLS, menunggu verifikasi admin" });
}));

app.post("/api/bills/:id/verify", auth, can(STAFF), wrap(async (req, res) => {
  const [[bill]] = await pool.query("SELECT id, branch_id FROM bills WHERE id=?", [req.params.id]);
  if (!bill) return fail(res, 404, "Tagihan tidak ditemukan");
  if (req.user.role === "admin_cabang" && bill.branch_id !== req.user.branch_id) return fail(res, 403, "Akses ditolak");
  const approve = req.body.action !== "reject";
  if (approve) {
    await pool.query("UPDATE bills SET status='paid', paid_at=CURDATE() WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Pembayaran disetujui (Lunas)" });
  } else {
    await pool.query("UPDATE bills SET status='unpaid' WHERE id=?", [req.params.id]);
    res.json({ success: true, message: "Pembayaran ditolak, status kembali belum lunas" });
  }
}));

app.post("/api/referrals/:id/apply", auth, can(STAFF), wrap(async (req, res) => {
  const billId = Number(req.body.bill_id);
  if (!billId) return fail(res, 400, "Tagihan SPP tujuan wajib dipilih");
  const [[ref]] = await pool.query("SELECT * FROM referrals WHERE id=?", [req.params.id]);
  if (!ref) return fail(res, 404, "Data referral tidak ditemukan");
  if (ref.status === "applied") return fail(res, 400, "Komisi referral ini sudah digunakan");
  const [[bill]] = await pool.query("SELECT * FROM bills WHERE id=?", [billId]);
  if (!bill) return fail(res, 404, "Tagihan tidak ditemukan");
  if (bill.status === "paid") return fail(res, 400, "Tagihan sudah lunas");
  if (req.user.role === "admin_cabang" && bill.branch_id !== req.user.branch_id) return fail(res, 403, "Akses ditolak");

  await pool.query("UPDATE bills SET discount = COALESCE(discount,0) + ? WHERE id=?", [ref.commission_amount, billId]);
  await pool.query("UPDATE referrals SET status='applied', applied_bill_id=? WHERE id=?", [billId, req.params.id]);
  res.json({ success: true, message: "Komisi referral berhasil diterapkan sebagai potongan SPP" });
}));

// Product Categories (#21) & Product Orders
app.get("/api/product_categories", auth, can(ALL), wrap(async (_, res) => {
  const [rows] = await pool.query("SELECT id, name FROM product_categories ORDER BY name ASC");
  res.json({ success: true, data: rows });
}));

app.post("/api/product_categories", auth, can(STAFF), wrap(async (req, res) => {
  const name = clean(req.body.name);
  if (!name) return fail(res, 400, "Nama kategori wajib diisi");
  const [[dup]] = await pool.query("SELECT id FROM product_categories WHERE LOWER(name)=LOWER(?)", [name]);
  if (dup) return fail(res, 400, `Kategori "${name}" sudah ada`);
  const [r] = await pool.query("INSERT INTO product_categories(name) VALUES(?)", [name]);
  res.status(201).json({ success: true, data: { id: r.insertId, name }, message: `Kategori "${name}" berhasil ditambahkan` });
}));

app.delete("/api/product_categories/:id", auth, can(STAFF), wrap(async (req, res) => {
  await pool.query("DELETE FROM product_categories WHERE id=?", [req.params.id]);
  res.json({ success: true, message: "Kategori berhasil dihapus" });
}));

app.get("/api/product_orders", auth, wrap(async (req, res) => {
  const q = req.query, page = Math.max(+q.page || 1, 1), limit = [10, 25, 50, 100].includes(+q.limit) ? +q.limit : 10;
  const where = [], args = [];
  if (q.search) { where.push("(o.buyer_name LIKE ? OR p.name LIKE ? OR b.name LIKE ?)"); args.push(`%${q.search}%`, `%${q.search}%`, `%${q.search}%`); }
  if (q.status) { where.push("o.status=?"); args.push(q.status); }
  if (!STAFF.includes(req.user.role)) {
    where.push("o.user_id=?");
    args.push(req.user.id);
  } else if (req.user.role === "admin_cabang") {
    where.push("o.branch_id=?");
    args.push(req.user.branch_id);
  } else if (q.branch_id) {
    where.push("o.branch_id=?");
    args.push(q.branch_id);
  }
  const w = where.length ? "WHERE " + where.join(" AND ") : "";
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM product_orders o LEFT JOIN products p ON p.id=o.product_id LEFT JOIN branches b ON b.id=o.branch_id ${w}`, args);
  const [rows] = await pool.query(`SELECT o.*, p.name AS product_name, p.image AS product_image, p.category AS product_category, b.name AS branch_name FROM product_orders o LEFT JOIN products p ON p.id=o.product_id LEFT JOIN branches b ON b.id=o.branch_id ${w} ORDER BY o.id DESC LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);
  res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}));

app.post("/api/product_orders", auth, wrap(async (req, res) => {
  const productId = Number(req.body.product_id), qty = Math.max(1, Number(req.body.qty || 1));
  const buyerName = clean(req.body.buyer_name) || req.user.name;
  const buyerPhone = clean(req.body.buyer_phone);
  const paymentProof = clean(req.body.payment_proof);
  const notes = clean(req.body.notes);
  const branchId = req.body.branch_id ? Number(req.body.branch_id) : (req.user.branch_id || null);

  if (!productId) return fail(res, 400, "Produk wajib dipilih");
  const [[prod]] = await pool.query("SELECT * FROM products WHERE id=?", [productId]);
  if (!prod) return fail(res, 404, "Produk tidak ditemukan");
  if (Number(prod.stock || 0) < qty) return fail(res, 400, `Stok tidak mencukupi (tersisa ${prod.stock || 0})`);

  const unitPrice = Number(prod.price || 0);
  const totalPrice = unitPrice * qty;
  const [r] = await pool.query(
    "INSERT INTO product_orders(user_id,buyer_name,buyer_phone,branch_id,product_id,qty,unit_price,total_price,payment_proof,status,notes) VALUES(?,?,?,?,?,?,?,?,?, 'pending', ?)",
    [req.user.id, buyerName, buyerPhone, branchId, productId, qty, unitPrice, totalPrice, paymentProof, notes]
  );
  await pool.query("UPDATE products SET stock = GREATEST(0, COALESCE(stock,0) - ?) WHERE id=?", [qty, productId]);
  res.status(201).json({ success: true, data: { id: r.insertId, total_price: totalPrice }, message: "Pesanan produk berhasil dibuat!" });
}));

app.put("/api/product_orders/:id", auth, can(STAFF), wrap(async (req, res) => {
  const [[ord]] = await pool.query("SELECT * FROM product_orders WHERE id=?", [req.params.id]);
  if (!ord) return fail(res, 404, "Pesanan tidak ditemukan");
  if (req.user.role === "admin_cabang" && ord.branch_id !== req.user.branch_id) return fail(res, 403, "Akses ditolak");
  const nextStatus = clean(req.body.status) || ord.status;
  const notes = req.body.notes !== undefined ? clean(req.body.notes) : ord.notes;
  if (ord.status !== "cancelled" && nextStatus === "cancelled") {
    await pool.query("UPDATE products SET stock = COALESCE(stock,0) + ? WHERE id=?", [ord.qty, ord.product_id]);
  }
  await pool.query("UPDATE product_orders SET status=?, notes=? WHERE id=?", [nextStatus, notes, req.params.id]);
  res.json({ success: true, message: "Status pesanan diperbarui" });
}));

// Payroll Tutor (Module 6 - Multi-Branch Aware)
app.get("/api/payroll/rules", auth, can([...STAFF, "tutor"]), wrap(async (_, res) => {
  const [[rule]] = await pool.query("SELECT * FROM payroll_rules ORDER BY id ASC LIMIT 1");
  res.json({ success: true, data: rule || { base_rate: 100000, transport_allowance: 15000, late_penalty: 10000, ontime_bonus: 150000 } });
}));

app.put("/api/payroll/rules", auth, can(HQ), wrap(async (req, res) => {
  const base = Number(req.body.base_rate || 100000);
  const tr = Number(req.body.transport_allowance || 0);
  const pen = Number(req.body.late_penalty || 0);
  const bonus = Number(req.body.ontime_bonus || 0);
  const [[rule]] = await pool.query("SELECT id FROM payroll_rules ORDER BY id ASC LIMIT 1");
  if (rule) {
    await pool.query("UPDATE payroll_rules SET base_rate=?, transport_allowance=?, late_penalty=?, ontime_bonus=? WHERE id=?", [base, tr, pen, bonus, rule.id]);
  } else {
    await pool.query("INSERT INTO payroll_rules(base_rate,transport_allowance,late_penalty,ontime_bonus) VALUES(?,?,?,?)", [base, tr, pen, bonus]);
  }
  res.json({ success: true, message: "Aturan payroll diperbarui" });
}));

app.get("/api/payroll", auth, can([...STAFF, "tutor"]), wrap(async (req, res) => {
  const month = clean(req.query.month) || getServerNowParts().date.slice(0, 7);
  const branchId = req.user.role === "admin_cabang" ? req.user.branch_id : (req.query.branch_id ? Number(req.query.branch_id) || null : null);
  const [[ruleRow]] = await pool.query("SELECT * FROM payroll_rules ORDER BY id ASC LIMIT 1");
  const rule = ruleRow || { base_rate: 100000, transport_allowance: 15000, late_penalty: 10000, ontime_bonus: 150000 };

  const where = ["u.role='tutor'", "COALESCE(u.status,'active')='active'"], args = [];
  if (req.user.role === "tutor") { where.push("u.id=?"); args.push(req.user.id); }
  else if (branchId) {
    where.push("(u.branch_id=? OR EXISTS (SELECT 1 FROM classes tc WHERE tc.tutor_id=u.id AND tc.branch_id=?))");
    args.push(branchId, branchId);
  }

  const [tutors] = await pool.query(
    `SELECT u.id, u.name, u.email, u.branch_id, u.hourly_rate, b.name AS branch_name,
      (SELECT GROUP_CONCAT(DISTINCT cb.name ORDER BY cb.name SEPARATOR ', ') FROM classes tc INNER JOIN branches cb ON cb.id=tc.branch_id WHERE tc.tutor_id=u.id) AS teaching_branches
     FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE ${where.join(" AND ")} ORDER BY u.name ASC`,
    args
  );

  const data = [];
  for (const t of tutors) {
    const attWhere = ["tutor_id=?", "DATE_FORMAT(date, '%Y-%m')=?"];
    const attArgs = [t.id, month];
    if (req.user.role === "admin_cabang" && branchId) {
      attWhere.push("(branch_id=? OR branch_id IS NULL)");
      attArgs.push(branchId);
    }
    const [[att]] = await pool.query(
      `SELECT COUNT(*) total, COALESCE(SUM(status IN ('hadir','terlambat')),0) present, COALESCE(SUM(status='hadir' AND COALESCE(late_minutes,0)=0),0) ontime, COALESCE(SUM(status='terlambat' OR COALESCE(late_minutes,0)>0),0) late, COALESCE(SUM(status IN ('izin','cuti','alpha')),0) absent FROM tutor_attendance WHERE ${attWhere.join(" AND ")}`,
      attArgs
    );
    const sessions = Number(att.present || 0);
    const ontime = Number(att.ontime || 0);
    const late = Number(att.late || 0);
    const absent = Number(att.absent || 0);
    const rate = Number(t.hourly_rate || rule.base_rate || 100000);
    const basePay = sessions * rate;
    const transportPay = sessions * Number(rule.transport_allowance || 0);
    const penaltyAmount = late * Number(rule.late_penalty || 0);
    const bonusAmount = sessions > 0 && late === 0 && absent === 0 ? Number(rule.ontime_bonus || 0) : 0;
    const totalAmount = Math.max(0, basePay + transportPay - penaltyAmount + bonusAmount);

    const [[paid]] = await pool.query("SELECT * FROM payroll_payments WHERE tutor_id=? AND month=? ORDER BY id DESC LIMIT 1", [t.id, month]);
    data.push({
      tutor_id: t.id,
      tutor_name: t.name,
      email: t.email,
      branch_id: t.branch_id,
      branch_name: t.teaching_branches || t.branch_name || "Multi-Cabang",
      month,
      rate,
      sessions_count: sessions,
      ontime_count: ontime,
      late_count: late,
      absent_count: absent,
      base_pay: basePay,
      transport_pay: transportPay,
      penalty_amount: penaltyAmount,
      bonus_amount: bonusAmount,
      total_amount: totalAmount,
      payment_status: paid ? paid.status : "unpaid",
      paid_at: paid ? paid.paid_at : null,
    });
  }
  res.json({ success: true, data, rule });
}));

app.post("/api/payroll/pay", auth, can(STAFF), wrap(async (req, res) => {
  const tutorId = Number(req.body.tutor_id), month = clean(req.body.month);
  if (!tutorId || !month) return fail(res, 400, "Tutor dan bulan wajib diisi");
  const [[tut]] = await pool.query("SELECT id, name, branch_id FROM users WHERE id=? AND role='tutor'", [tutorId]);
  if (!tut) return fail(res, 404, "Tutor tidak ditemukan");
  if (req.user.role === "admin_cabang") {
    const [[teachesHere]] = await pool.query("SELECT id FROM classes WHERE tutor_id=? AND branch_id=? LIMIT 1", [tutorId, req.user.branch_id]);
    if (tut.branch_id !== req.user.branch_id && !teachesHere) return fail(res, 403, "Akses ditolak");
  }

  const [[existing]] = await pool.query("SELECT id FROM payroll_payments WHERE tutor_id=? AND month=?", [tutorId, month]);
  if (existing) return fail(res, 400, "Honor tutor bulan ini sudah dibayarkan");

  await pool.query(
    "INSERT INTO payroll_payments(tutor_id,month,branch_id,sessions_count,ontime_count,late_count,base_pay,transport_pay,penalty_amount,bonus_amount,total_amount,status,paid_at,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,'paid',CURDATE(),?)",
    [
      tutorId, month, req.user.role === "admin_cabang" ? req.user.branch_id : tut.branch_id,
      Number(req.body.sessions_count || 0), Number(req.body.ontime_count || 0), Number(req.body.late_count || 0),
      Number(req.body.base_pay || 0), Number(req.body.transport_pay || 0), Number(req.body.penalty_amount || 0),
      Number(req.body.bonus_amount || 0), Number(req.body.total_amount || 0), clean(req.body.notes),
    ]
  );
  res.status(201).json({ success: true, message: `Payroll ${tut.name} periode ${month} tercatat lunas` });
}));

app.get("/api/stats", auth, can(STAFF), wrap(async (req, res) => {
  const isOwner = req.user.role === "owner";
  const branchId = req.user.role === "admin_cabang" ? req.user.branch_id : (req.query.branch_id ? Number(req.query.branch_id) || null : null);
  const bWhere = branchId ? " AND branch_id=?" : "", bArgs = branchId ? [branchId] : [];
  const [[stuRow]] = await pool.query(`SELECT COUNT(*) total, COALESCE(SUM(status='active'),0) active, COALESCE(SUM(status<>'active'),0) inactive FROM students WHERE 1=1${bWhere}`, bArgs);
  const [[clsRow]] = await pool.query(`SELECT COUNT(*) total, COALESCE(SUM(type='online'),0) online, COALESCE(SUM(type<>'online' OR type IS NULL),0) offline FROM classes WHERE 1=1${bWhere}`, bArgs);
  const [[billRow]] = await pool.query(`SELECT COALESCE(SUM(status<>'paid'),0) unpaidCount, COALESCE(SUM(CASE WHEN status<>'paid' THEN GREATEST(0, amount - COALESCE(discount,0)) ELSE 0 END),0) unpaidAmount, COALESCE(SUM(status='paid'),0) paidCount, COALESCE(SUM(CASE WHEN status='paid' THEN GREATEST(0, amount - COALESCE(discount,0)) ELSE 0 END),0) paidAmount, COALESCE(SUM(status='overdue' OR (status='unpaid' AND due_date < CURDATE())),0) overdueCount, COALESCE(SUM(status='verifikasi'),0) verifikasiCount FROM bills WHERE 1=1${bWhere}`, bArgs);
  const [[leaveRow]] = await pool.query(`SELECT COUNT(*) pending FROM leaves WHERE status='pending'${bWhere}`, bArgs);
  const tutorFilter = branchId
    ? "AND (u.branch_id=? OR EXISTS (SELECT 1 FROM classes tc WHERE tc.tutor_id=u.id AND tc.branch_id=?))"
    : "";
  const tutorFilterArgs = branchId ? [branchId, branchId] : [];
  const [[tutorRow]] = await pool.query(`SELECT COUNT(*) total FROM users u WHERE u.role='tutor' AND COALESCE(u.status,'active')='active' ${tutorFilter}`, tutorFilterArgs);
  const [[branchRow]] = await pool.query(`SELECT COUNT(*) total FROM branches WHERE status='active'${branchId ? " AND id=?" : ""}`, bArgs);
  const [[prodRow]] = await pool.query("SELECT COUNT(*) total FROM products");

  let openComplaints = 0;
  if (req.user.role === "admin_pusat") {
    openComplaints = (await pool.query("SELECT COUNT(*) n FROM complaints WHERE status='open'"))[0][0].n;
  } else if (req.user.role === "owner") {
    openComplaints = (await pool.query("SELECT COUNT(*) n FROM complaints WHERE status='open' AND COALESCE(sender_role,'')<>'tutor'"))[0][0].n;
  } else if (req.user.role === "admin_cabang") {
    openComplaints = (await pool.query("SELECT COUNT(*) n FROM complaints WHERE status='open' AND sender_role='tutor' AND (branch_id=? OR branch_id IS NULL)", [req.user.branch_id]))[0][0].n;
  }

  const [attStatusRows] = await pool.query(`SELECT status, COUNT(*) total FROM attendance WHERE 1=1${bWhere} GROUP BY status`, bArgs);
  const attBreakdown = { hadir: 0, izin: 0, sakit: 0, alpha: 0 };
  attStatusRows.forEach((r) => { attBreakdown[r.status] = Number(r.total || 0); });
  const attTotal = Object.values(attBreakdown).reduce((a, b) => a + b, 0);
  const attRate = attTotal ? Math.round((attBreakdown.hadir * 100) / attTotal) : 0;

  const [[tutAttRow]] = await pool.query(`SELECT COUNT(*) total, COALESCE(SUM(status='hadir' AND COALESCE(late_minutes,0)=0),0) onTime, COALESCE(SUM(status='terlambat' OR COALESCE(late_minutes,0)>0),0) lateCount, COALESCE(SUM(status IN ('hadir','terlambat')),0) present FROM tutor_attendance WHERE 1=1${bWhere}`, bArgs);
  const tutorAttTotal = Number(tutAttRow.total || 0);
  const tutorAttRate = tutorAttTotal ? Math.round((Number(tutAttRow.present || 0) * 100) / tutorAttTotal) : 0;

  const [topTutorRows] = await pool.query(
    `SELECT u.id, u.name,
      COALESCE(GROUP_CONCAT(DISTINCT cb.name ORDER BY cb.name SEPARATOR ', '), b.name, 'Multi-Cabang') AS branch_name,
      COUNT(DISTINCT c.id) AS classes_count,
      COUNT(ta.id) AS total_sessions,
      COALESCE(SUM(ta.status='hadir' AND COALESCE(ta.late_minutes,0)=0),0) AS on_time_sessions,
      COALESCE(SUM(ta.status='terlambat' OR COALESCE(ta.late_minutes,0)>0),0) AS late_sessions
     FROM users u
     LEFT JOIN branches b ON b.id=u.branch_id
     LEFT JOIN classes c ON c.tutor_id=u.id
     LEFT JOIN branches cb ON cb.id=c.branch_id
     LEFT JOIN tutor_attendance ta ON ta.tutor_id=u.id
     WHERE u.role='tutor' AND COALESCE(u.status,'active')='active' ${tutorFilter}
     GROUP BY u.id, u.name, b.name
     ORDER BY on_time_sessions DESC, classes_count DESC, u.id ASC LIMIT 5`,
    tutorFilterArgs
  );
  const topTutors = topTutorRows.map((r) => {
    const tot = Number(r.total_sessions || 0), onTime = Number(r.on_time_sessions || 0);
    return {
      id: r.id,
      name: r.name,
      branch_name: r.branch_name || "-",
      classes_count: Number(r.classes_count || 0),
      total_sessions: tot,
      on_time_sessions: onTime,
      late_sessions: Number(r.late_sessions || 0),
      on_time_rate: tot ? Math.round((onTime * 100) / tot) : 0,
    };
  });

  const [topExpensesRows] = await pool.query(`SELECT category, COALESCE(SUM(amount),0) AS total, COUNT(*) AS items FROM expenses WHERE 1=1${bWhere} GROUP BY category ORDER BY total DESC LIMIT 4`, bArgs);
  const [[expTotalRow]] = await pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE 1=1${bWhere}`, bArgs);

  const now = new Date(), months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const firstMonthStart = `${months[0]}-01`;
  const [[baseStu]] = await pool.query(`SELECT COUNT(*) n FROM students WHERE COALESCE(joined_at, DATE(created_at)) < ?${bWhere}`, [firstMonthStart, ...bArgs]);
  const [stuMonthRows] = await pool.query(`SELECT DATE_FORMAT(COALESCE(joined_at, DATE(created_at)), '%Y-%m') m, COUNT(*) cnt FROM students WHERE COALESCE(joined_at, DATE(created_at)) >= ?${bWhere} GROUP BY DATE_FORMAT(COALESCE(joined_at, DATE(created_at)), '%Y-%m') ORDER BY m ASC`, [firstMonthStart, ...bArgs]);
  const [leftMonthRows] = await pool.query(`SELECT DATE_FORMAT(left_at, '%Y-%m') m, COUNT(*) cnt FROM students WHERE left_at IS NOT NULL AND left_at >= ?${bWhere} GROUP BY DATE_FORMAT(left_at, '%Y-%m') ORDER BY m ASC`, [firstMonthStart, ...bArgs]);
  const stuMap = Object.fromEntries(stuMonthRows.map((r) => [r.m, Number(r.cnt || 0)]));
  const leftMap = Object.fromEntries(leftMonthRows.map((r) => [r.m, Number(r.cnt || 0)]));
  let running = Number(baseStu.n || 0);
  const studentsByMonth = months.map((m) => { const added = stuMap[m] || 0; const left = leftMap[m] || 0; running = Math.max(0, running + added - left); return { month: m, added, left, total: running }; });

  let billsByMonth = [];
  if (!isOwner) {
    const [billMonthRows] = await pool.query(`SELECT DATE_FORMAT(COALESCE(due_date, created_at), '%Y-%m') m, COALESCE(SUM(CASE WHEN status='paid' THEN GREATEST(0, amount - COALESCE(discount,0)) ELSE 0 END),0) paid, COALESCE(SUM(CASE WHEN status<>'paid' THEN GREATEST(0, amount - COALESCE(discount,0)) ELSE 0 END),0) unpaid FROM bills WHERE COALESCE(due_date, created_at) >= ?${bWhere} GROUP BY DATE_FORMAT(COALESCE(due_date, created_at), '%Y-%m') ORDER BY m ASC`, [firstMonthStart, ...bArgs]);
    const billMap = Object.fromEntries(billMonthRows.map((r) => [r.m, { paid: Number(r.paid || 0), unpaid: Number(r.unpaid || 0) }]));
    billsByMonth = months.map((m) => ({ month: m, paid: billMap[m]?.paid || 0, unpaid: billMap[m]?.unpaid || 0 }));
  }

  const [studentsByBranch] = await pool.query(`SELECT b.id, b.name, b.city, COUNT(s.id) count FROM branches b LEFT JOIN students s ON s.branch_id=b.id AND s.status='active' ${branchId ? "WHERE b.id=?" : ""} GROUP BY b.id, b.name, b.city ORDER BY count DESC, b.id ASC`, bArgs);
  const [classSummary] = await pool.query(`SELECT c.id, COALESCE(c.class_type, c.name) AS name, c.level, c.schedule, c.type, b.name AS branch_name, COUNT(s.id) AS student_count FROM classes c LEFT JOIN branches b ON b.id=c.branch_id LEFT JOIN students s ON s.class_id=c.id AND s.status='active' ${branchId ? "WHERE c.branch_id=?" : ""} GROUP BY c.id, c.name, c.class_type, c.level, c.schedule, c.type, b.name ORDER BY student_count DESC, c.id DESC LIMIT 6`, bArgs);
  const [branchOptions] = HQ.includes(req.user.role) ? await pool.query("SELECT id, name FROM branches ORDER BY name ASC") : [[]];

  res.json({ success: true, data: {
    students: Number(stuRow.active || 0),
    totalStudents: Number(stuRow.total || 0),
    inactiveStudents: Number(stuRow.inactive || 0),
    classes: Number(clsRow.total || 0),
    onlineClasses: Number(clsRow.online || 0),
    offlineClasses: Number(clsRow.offline || 0),
    unpaidBills: Number(billRow.unpaidCount || 0),
    verifikasiBills: Number(billRow.verifikasiCount || 0),
    unpaidAmount: isOwner ? null : Number(billRow.unpaidAmount || 0),
    paidBills: Number(billRow.paidCount || 0),
    paidAmount: isOwner ? null : Number(billRow.paidAmount || 0),
    overdueBills: Number(billRow.overdueCount || 0),
    pendingLeaves: Number(leaveRow.pending || 0),
    tutors: Number(tutorRow.total || 0),
    branches: Number(branchRow.total || 0),
    products: Number(prodRow.total || 0),
    openComplaints: Number(openComplaints || 0),
    attendanceRate: attRate,
    attendanceTotal: attTotal,
    attendanceBreakdown: attBreakdown,
    tutorAttendanceRate: tutorAttRate,
    tutorAttendanceTotal: tutorAttTotal,
    tutorLateCount: Number(tutAttRow.lateCount || 0),
    topTutors,
    topExpenses: topExpensesRows.map((r) => ({ category: r.category, total: Number(r.total || 0), items: Number(r.items || 0) })),
    totalExpenses: Number(expTotalRow.total || 0),
    studentsByMonth,
    billsByMonth,
    studentsByBranch: studentsByBranch.map((r) => ({ ...r, count: Number(r.count || 0) })),
    classSummary: classSummary.map((r) => ({ ...r, student_count: Number(r.student_count || 0) })),
    branchOptions,
  } });
}));

// Active Tutors List: lintas cabang untuk mendukung 1 akun tutor mengajar multi cabang
app.get("/api/tutors", auth, can([...STAFF, "tutor"]), wrap(async (req, res) => {
  const search = String(req.query.search || "").trim(), limit = Math.min(Math.max(+req.query.limit || 25, 1), 100);
  const where = ["u.role='tutor'", "COALESCE(u.status,'active')='active'"], args = [];
  if (search) { where.push("(u.name LIKE ? OR u.email LIKE ?)"); args.push(`%${search}%`, `%${search}%`); }
  if (req.query.id) { where.push("u.id=?"); args.push(req.query.id); }
  if (req.user.role === "tutor") { where.push("u.id=?"); args.push(req.user.id); }
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.branch_id, COALESCE(b.name, 'Multi-Cabang') AS branch_name
     FROM users u
     LEFT JOIN branches b ON b.id=u.branch_id
     WHERE ${where.join(" AND ")}
     ORDER BY u.name ASC LIMIT ?`,
    [...args, limit]
  );
  res.json({ success: true, data: rows });
}));

// Upload aman: gambar, pdf, audio (mp3/wav/ogg/m4a), video (mp4/webm/mov), maks 25MB
const upload = multer({
  storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (_, f, cb) => cb(null, Date.now() + "-" + Math.round(Math.random() * 1e6) + path.extname(f.originalname).toLowerCase()) }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_, f, cb) => {
    const okMime = /^(image\/(png|jpe?g|webp)|application\/pdf|audio\/(mpeg|mp3|wav|x-wav|ogg|mp4|x-m4a|aac|webm)|video\/(mp4|webm|quicktime))$/i.test(f.mimetype);
    const okExt = /^\.(png|jpe?g|webp|pdf|mp3|wav|ogg|m4a|aac|mp4|webm|mov)$/i.test(path.extname(f.originalname));
    cb(null, okMime || okExt);
  },
});
app.post("/api/upload", auth, upload.single("file"), (req, res) => req.file ? res.json({ success: true, data: { url: "/uploads/" + req.file.filename } }) : fail(res, 400, "File tidak valid (gambar/pdf/audio/video, maks 25MB)"));

// Generic CRUD: pagination, search, limit, sorting, filter
Object.entries(RESOURCES).forEach(([name, cfg]) => {
  const base = `/api/${name}`;
  app.get(base, auth, can(cfg.r), wrap(async (req, res) => {
    const q = req.query, page = Math.max(+q.page || 1, 1), limit = [10, 25, 50, 100].includes(+q.limit) ? +q.limit : 10;
    const where = [], args = [];
    if (q.search) { where.push("(" + cfg.search.map((c) => `${c} LIKE ?`).join(" OR ") + ")"); cfg.search.forEach(() => args.push(`%${q.search}%`)); }
    if (q.id !== undefined && q.id !== "") { where.push("t.id=?"); args.push(q.id); }
    cfg.fields.forEach((f) => { if (q[f] !== undefined && q[f] !== "") { where.push(`t.${f}=?`); args.push(q[f]); } });

    if (isScoped(cfg, req.user)) { where.push("t.branch_id=?"); args.push(req.user.branch_id); }

    // #7 & Multi-Branch Tutor Scoping
    if (cfg.tutorOwned && req.user.role === "tutor") {
      where.push("t.tutor_id=?");
      args.push(req.user.id);
    }
    if (cfg.tutorClassStudentScoped && req.user.role === "tutor") {
      where.push("c.tutor_id=?");
      args.push(req.user.id);
    }
    if (cfg.tutorClassScoped && req.user.role === "tutor") {
      where.push("(c.tutor_id=? OR s.class_id IN (SELECT id FROM classes WHERE tutor_id=?))");
      args.push(req.user.id, req.user.id);
    }
    if (cfg.tutorReportScoped && req.user.role === "tutor") {
      where.push("(t.tutor_id=? OR c.tutor_id=?)");
      args.push(req.user.id, req.user.id);
    }
    if (cfg.tutorVideoScoped && req.user.role === "tutor") {
      where.push("(c.tutor_id=? OR EXISTS (SELECT 1 FROM students st INNER JOIN classes sc ON sc.id=st.class_id WHERE st.id=t.student_id AND sc.tutor_id=?))");
      args.push(req.user.id, req.user.id);
    }
    if (cfg.tutorScoped && req.user.role === "tutor") {
      where.push("t.tutor_id=?");
      args.push(req.user.id);
    }
    if (cfg.studentLinkScoped && ["siswa", "ortu"].includes(req.user.role)) {
      where.push("(s.user_id=? OR s.parent_user_id=?)");
      args.push(req.user.id, req.user.id);
    }
    if (cfg.studentLinkOrUserScoped && ["siswa", "ortu"].includes(req.user.role)) {
      where.push("(t.user_id=? OR s.user_id=? OR s.parent_user_id=?)");
      args.push(req.user.id, req.user.id, req.user.id);
    }
    if (cfg.referrerScoped && !STAFF.includes(req.user.role)) {
      where.push("t.referrer_user_id=?");
      args.push(req.user.id);
    }
    if (cfg.ownUserScoped && ["tutor", "siswa", "ortu"].includes(req.user.role)) {
      where.push("t.user_id=?");
      args.push(req.user.id);
    }
    // #13 Tutor komplen masuk ke admin cabang dan admin pusat saja
    if (cfg.complaintsScoped) {
      if (req.user.role === "admin_pusat") {
        // admin pusat melihat seluruh komplen
      } else if (req.user.role === "owner") {
        where.push("COALESCE(t.sender_role,'')<>'tutor'");
      } else if (req.user.role === "admin_cabang") {
        where.push("(t.sender_role='tutor' AND (t.branch_id=? OR t.branch_id IS NULL OR EXISTS (SELECT 1 FROM classes c WHERE c.tutor_id=t.user_id AND c.branch_id=?))) OR t.user_id=?");
        args.push(req.user.branch_id, req.user.branch_id, req.user.id);
      } else {
        where.push("t.user_id=?");
        args.push(req.user.id);
      }
    }

    const w = where.length ? "WHERE " + where.join(" AND ") : "";
    const sort = [...cfg.fields, "id", "created_at"].includes(q.sort) ? q.sort : "id", order = q.order === "asc" ? "ASC" : "DESC";
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM ${name} t ${cfg.join || ""} ${w}`, args);
    const [rawRows] = await pool.query(`SELECT ${cfg.select || "t.*"} FROM ${name} t ${cfg.join || ""} ${w} ORDER BY t.${sort} ${order} LIMIT ? OFFSET ?`, [...args, limit, (page - 1) * limit]);

    // #4 Sembunyikan nama tutor & link meeting dari Portal Ortu
    let rows = rawRows;
    if (req.user.role === "ortu") {
      if (name === "classes") {
        rows = rawRows.map((r) => ({ ...r, tutor_id: null, tutor_name: null, meeting_url: null }));
      } else if (name === "learning_reports") {
        rows = rawRows.map((r) => ({ ...r, tutor_id: null, tutor_name: null }));
      }
    }

    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }));

  app.post(base, auth, can(cfg.c), wrap(async (req, res) => {
    const d = pickData(cfg, req.body, req.user, true);

    if (name === "classes") {
      if (d.name && !d.class_type) d.class_type = d.name;
      if (d.class_type && !d.name) d.name = d.class_type;
      if (d.tutor_id && d.branch_id) {
        await pool.query("INSERT IGNORE INTO tutor_branches(tutor_id, branch_id) VALUES(?,?)", [d.tutor_id, d.branch_id]);
      }
    }

    if (name === "students" && d.course_completed !== undefined) {
      d.course_completed = Number(d.course_completed) ? 1 : 0;
      if (d.course_completed && !d.completed_at) d.completed_at = getServerNowParts().date;
    }

    // #9 Cegah manipulasi jam absensi tutor
    if (name === "tutor_attendance" && req.user.role === "tutor") {
      const serverAtt = await computeServerCheckIn(d.class_id, req.user.id, req.user.branch_id);
      d.tutor_id = req.user.id;
      d.date = serverAtt.date;
      d.check_in = serverAtt.check_in;
      d.late_minutes = serverAtt.late_minutes;
      d.status = serverAtt.status;
      d.branch_id = serverAtt.branch_id;
    }

    if (name === "attendance" && req.user.role === "tutor") {
      if (d.class_id) {
        const [[cls]] = await pool.query("SELECT tutor_id, branch_id FROM classes WHERE id=?", [d.class_id]);
        if (!cls || Number(cls.tutor_id) !== req.user.id) return fail(res, 403, "Anda hanya dapat mengabsen kelas Anda sendiri");
        if (!d.branch_id && cls.branch_id) d.branch_id = cls.branch_id;
      }
    }

    if (d.student_id && ((!d.branch_id && cfg.fields.includes("branch_id")) || (!d.class_id && cfg.fields.includes("class_id")) || (name === "learning_reports" && !d.tutor_id))) {
      const [[stu]] = await pool.query("SELECT s.branch_id, s.class_id, c.tutor_id FROM students s LEFT JOIN classes c ON c.id=s.class_id WHERE s.id=?", [d.student_id]);
      if (stu) {
        if (!d.branch_id && cfg.fields.includes("branch_id") && stu.branch_id) d.branch_id = stu.branch_id;
        if (!d.class_id && cfg.fields.includes("class_id") && stu.class_id) d.class_id = stu.class_id;
        if (name === "learning_reports" && !d.tutor_id && stu.tutor_id) d.tutor_id = stu.tutor_id;
      }
    }

    if (name === "leaves" && !d.branch_id && ["siswa", "ortu", "tutor"].includes(req.user.role)) {
      if (req.user.branch_id) d.branch_id = req.user.branch_id;
      else if (["siswa", "ortu"].includes(req.user.role)) {
        const [[stu]] = await pool.query("SELECT branch_id FROM students WHERE user_id=? OR parent_user_id=? ORDER BY id ASC LIMIT 1", [req.user.id, req.user.id]);
        if (stu?.branch_id) d.branch_id = stu.branch_id;
      }
    }

    if (name === "complaints") {
      d.sender_role = req.user.role;
      if (!STAFF.includes(req.user.role)) d.status = "open";
      if (!d.branch_id) d.branch_id = req.user.branch_id || null;
      if (!d.branch_id && req.user.role === "tutor") {
        const [[tc]] = await pool.query("SELECT branch_id FROM classes WHERE tutor_id=? AND branch_id IS NOT NULL ORDER BY id ASC LIMIT 1", [req.user.id]);
        if (tc?.branch_id) d.branch_id = tc.branch_id;
      }
    }

    const keys = Object.keys(d);
    if (!keys.length) return fail(res, 400, "Data kosong");
    const [r] = await pool.query(`INSERT INTO ${name}(${keys.join(",")}) VALUES(${keys.map(() => "?").join(",")})`, keys.map((k) => d[k]));

    if (name === "students" && d.course_completed && !d.certificate_code) {
      await pool.query("UPDATE students SET certificate_code=? WHERE id=?", [`ADLS-CERT-${new Date().getFullYear()}-${String(r.insertId).padStart(4, "0")}`, r.insertId]);
    }

    res.status(201).json({ success: true, data: { id: r.insertId } });
  }));

  app.put(`${base}/:id`, auth, can(cfg.u), wrap(async (req, res) => {
    const d = pickData(cfg, req.body, req.user, false);

    if (name === "classes") {
      if (d.name && !d.class_type) d.class_type = d.name;
      if (d.class_type && !d.name) d.name = d.class_type;
      if (req.user.role === "tutor") {
        const [[cls]] = await pool.query("SELECT tutor_id FROM classes WHERE id=?", [req.params.id]);
        if (!cls || Number(cls.tutor_id) !== req.user.id) return fail(res, 403, "Anda hanya dapat mengubah kelas Anda sendiri");
      }
      if (d.tutor_id && d.branch_id) {
        await pool.query("INSERT IGNORE INTO tutor_branches(tutor_id, branch_id) VALUES(?,?)", [d.tutor_id, d.branch_id]);
      }
    }

    if (name === "students" && d.course_completed !== undefined) {
      d.course_completed = Number(d.course_completed) ? 1 : 0;
      if (d.course_completed) {
        if (!d.completed_at) d.completed_at = getServerNowParts().date;
        d.certificate_code = d.certificate_code || `ADLS-CERT-${new Date().getFullYear()}-${String(req.params.id).padStart(4, "0")}`;
      }
    }

    if (name === "learning_reports" && req.user.role === "tutor") {
      const [[rep]] = await pool.query(
        "SELECT lr.id FROM learning_reports lr LEFT JOIN classes c ON c.id=lr.class_id WHERE lr.id=? AND (lr.tutor_id=? OR c.tutor_id=?)",
        [req.params.id, req.user.id, req.user.id]
      );
      if (!rep) return fail(res, 403, "Anda hanya dapat mengubah laporan belajar kelas Anda sendiri");
    }

    if (name === "complaints") {
      const [[comp]] = await pool.query("SELECT * FROM complaints WHERE id=?", [req.params.id]);
      if (!comp) return fail(res, 404, "Data komplen tidak ditemukan");
      if (req.user.role === "admin_cabang") {
        if (comp.sender_role !== "tutor" || (comp.branch_id && comp.branch_id !== req.user.branch_id)) {
          return fail(res, 403, "Admin cabang hanya dapat menindaklanjuti komplen tutor cabangnya");
        }
      } else if (req.user.role === "owner" && comp.sender_role === "tutor") {
        return fail(res, 403, "Komplen tutor hanya ditangani Admin Cabang dan Admin Pusat");
      }
      delete d.branch_id;
    }

    const keys = Object.keys(d);
    if (!keys.length) return fail(res, 400, "Data kosong");
    const scope = isScoped(cfg, req.user) && name !== "complaints" ? " AND branch_id=" + pool.escape(req.user.branch_id) : "";
    await pool.query(`UPDATE ${name} SET ${keys.map((k) => k + "=?").join(",")} WHERE id=?${scope}`, [...keys.map((k) => d[k]), req.params.id]);
    res.json({ success: true, message: "Berhasil diperbarui" });
  }));

  app.delete(`${base}/:id`, auth, can(cfg.u), wrap(async (req, res) => {
    if (name === "classes" && req.user.role === "tutor") {
      return fail(res, 403, "Tutor tidak dapat menghapus kelas");
    }
    if (name === "learning_reports" && req.user.role === "tutor") {
      const [[rep]] = await pool.query(
        "SELECT lr.id FROM learning_reports lr LEFT JOIN classes c ON c.id=lr.class_id WHERE lr.id=? AND (lr.tutor_id=? OR c.tutor_id=?)",
        [req.params.id, req.user.id, req.user.id]
      );
      if (!rep) return fail(res, 403, "Anda hanya dapat menghapus laporan belajar kelas Anda sendiri");
    }
    if (name === "complaints") {
      const [[comp]] = await pool.query("SELECT * FROM complaints WHERE id=?", [req.params.id]);
      if (!comp) return fail(res, 404, "Data komplen tidak ditemukan");
      if (req.user.role === "admin_cabang" && (comp.sender_role !== "tutor" || (comp.branch_id && comp.branch_id !== req.user.branch_id))) {
        return fail(res, 403, "Akses ditolak");
      }
      if (req.user.role === "owner" && comp.sender_role === "tutor") {
        return fail(res, 403, "Komplen tutor hanya ditangani Admin Cabang dan Admin Pusat");
      }
    }
    const scope = isScoped(cfg, req.user) && name !== "complaints" ? " AND branch_id=" + pool.escape(req.user.branch_id) : "";
    await pool.query(`DELETE FROM ${name} WHERE id=?${scope}`, [req.params.id]);
    res.json({ success: true, message: "Berhasil dihapus" });
  }));
});

app.use((err, req, res, next) => fail(res, err.status || 400, err.message || "Request tidak valid"));

async function ensureCol(table, col, def) {
  const [rows] = await pool.query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=?", [process.env.DB_NAME, table, col]);
  if (!rows.length) await pool.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
}

async function ensureSchema() {
  await pool.query("CREATE TABLE IF NOT EXISTS tutor_branches(id INT AUTO_INCREMENT PRIMARY KEY,tutor_id INT NOT NULL,branch_id INT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uniq_tutor_branch(tutor_id,branch_id))");
  await pool.query("CREATE TABLE IF NOT EXISTS product_categories(id INT AUTO_INCREMENT PRIMARY KEY,name VARCHAR(60) UNIQUE NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS tutor_attendance(id INT AUTO_INCREMENT PRIMARY KEY,tutor_id INT NOT NULL,class_id INT NULL,branch_id INT NULL,date DATE NOT NULL,check_in VARCHAR(10) NULL,late_minutes INT DEFAULT 0,status VARCHAR(20) DEFAULT 'hadir',notes VARCHAR(255) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS expenses(id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(150) NOT NULL,category VARCHAR(80) NOT NULL,amount DECIMAL(12,2) NOT NULL DEFAULT 0,expense_date DATE NOT NULL,branch_id INT NULL,notes VARCHAR(255) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS learning_reports(id INT AUTO_INCREMENT PRIMARY KEY,student_id INT NOT NULL,class_id INT NULL,tutor_id INT NULL,branch_id INT NULL,report_month VARCHAR(7) NOT NULL,report_date DATE NOT NULL,material VARCHAR(255) NULL,homework VARCHAR(255) NULL,formative_score INT NULL,summative_score INT NULL,speaking_score INT NULL,notes TEXT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS reward_claims(id INT AUTO_INCREMENT PRIMARY KEY,student_id INT NOT NULL,reward_type VARCHAR(40) DEFAULT 'free_spp_20x100',notes VARCHAR(255) NULL,claimed_by INT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS audio_materials(id INT AUTO_INCREMENT PRIMARY KEY,title VARCHAR(150) NOT NULL,level VARCHAR(60) NULL,module_name VARCHAR(120) NULL,audio_url VARCHAR(255) NOT NULL,description TEXT NULL,branch_id INT NULL,created_by INT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS video_projects(id INT AUTO_INCREMENT PRIMARY KEY,student_id INT NOT NULL,class_id INT NULL,branch_id INT NULL,user_id INT NULL,month VARCHAR(7) NOT NULL,title VARCHAR(150) NOT NULL,video_url VARCHAR(255) NOT NULL,description TEXT NULL,score INT NULL,feedback VARCHAR(255) NULL,status VARCHAR(20) DEFAULT 'submitted',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS referrals(id INT AUTO_INCREMENT PRIMARY KEY,referrer_user_id INT NULL,referrer_name VARCHAR(100) NOT NULL,referred_student_name VARCHAR(100) NOT NULL,referred_phone VARCHAR(30) NULL,branch_id INT NULL,commission_amount DECIMAL(12,2) DEFAULT 50000,status VARCHAR(20) DEFAULT 'pending',applied_bill_id INT NULL,notes VARCHAR(255) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS product_orders(id INT AUTO_INCREMENT PRIMARY KEY,user_id INT NOT NULL,buyer_name VARCHAR(100) NOT NULL,buyer_phone VARCHAR(30) NULL,branch_id INT NULL,product_id INT NOT NULL,qty INT NOT NULL DEFAULT 1,unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,total_price DECIMAL(12,2) NOT NULL DEFAULT 0,payment_proof VARCHAR(255) NULL,status VARCHAR(20) DEFAULT 'pending',notes VARCHAR(255) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS payroll_rules(id INT AUTO_INCREMENT PRIMARY KEY,base_rate DECIMAL(12,2) NOT NULL DEFAULT 100000,transport_allowance DECIMAL(12,2) NOT NULL DEFAULT 15000,late_penalty DECIMAL(12,2) NOT NULL DEFAULT 10000,ontime_bonus DECIMAL(12,2) NOT NULL DEFAULT 150000,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)");
  await pool.query("CREATE TABLE IF NOT EXISTS payroll_payments(id INT AUTO_INCREMENT PRIMARY KEY,tutor_id INT NOT NULL,month VARCHAR(7) NOT NULL,branch_id INT NULL,sessions_count INT DEFAULT 0,ontime_count INT DEFAULT 0,late_count INT DEFAULT 0,base_pay DECIMAL(12,2) DEFAULT 0,transport_pay DECIMAL(12,2) DEFAULT 0,penalty_amount DECIMAL(12,2) DEFAULT 0,bonus_amount DECIMAL(12,2) DEFAULT 0,total_amount DECIMAL(12,2) DEFAULT 0,status VARCHAR(20) DEFAULT 'paid',paid_at DATE NULL,notes VARCHAR(255) NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");

  await ensureCol("users", "phone", "VARCHAR(30) NULL");
  await ensureCol("users", "hourly_rate", "DECIMAL(12,2) NULL");
  await ensureCol("users", "status", "VARCHAR(20) DEFAULT 'active'");
  await ensureCol("classes", "class_type", "VARCHAR(30) NULL");
  await ensureCol("students", "user_id", "INT NULL");
  await ensureCol("students", "parent_user_id", "INT NULL");
  await ensureCol("students", "class_type", "VARCHAR(30) NULL");
  await ensureCol("students", "joined_at", "DATE NULL");
  await ensureCol("students", "left_at", "DATE NULL");
  await ensureCol("students", "course_completed", "TINYINT(1) DEFAULT 0");
  await ensureCol("students", "completed_at", "DATE NULL");
  await ensureCol("students", "certificate_delivery", "VARCHAR(30) NULL");
  await ensureCol("students", "certificate_url", "VARCHAR(255) NULL");
  await ensureCol("students", "certificate_code", "VARCHAR(80) NULL");
  await ensureCol("bills", "month", "VARCHAR(7) NULL");
  await ensureCol("bills", "discount", "DECIMAL(12,2) DEFAULT 0");
  await ensureCol("bills", "payment_method", "VARCHAR(50) NULL");
  await ensureCol("bills", "paid_at", "DATE NULL");
  await ensureCol("bills", "notes", "VARCHAR(255) NULL");
  await ensureCol("leaves", "user_id", "INT NULL");
  await ensureCol("complaints", "user_id", "INT NULL");
  await ensureCol("complaints", "branch_id", "INT NULL");
  await ensureCol("complaints", "sender_role", "VARCHAR(30) NULL");
  await ensureCol("announcements", "info_type", "VARCHAR(30) DEFAULT 'Pengumuman'");
  await ensureCol("announcements", "letter_no", "VARCHAR(80) NULL");
  await ensureCol("announcements", "event_date", "DATE NULL");

  // Izinkan learning_reports.material NULL agar Admin Cabang dapat menyiapkan slot kolom nilai kosong untuk tutor (#8)
  await pool.query("ALTER TABLE learning_reports MODIFY COLUMN material VARCHAR(255) NULL").catch(() => {});
  await pool.query("ALTER TABLE classes MODIFY COLUMN level VARCHAR(60) NULL").catch(() => {});
  await pool.query("ALTER TABLE students MODIFY COLUMN level VARCHAR(60) NULL").catch(() => {});
  await pool.query("ALTER TABLE audio_materials MODIFY COLUMN level VARCHAR(60) NULL").catch(() => {});

  // Seed default categories + sinkronisasi kategori dari produk yang sudah ada
  await pool.query("INSERT IGNORE INTO product_categories(name) VALUES('Buku'),('Merchandise'),('Perlengkapan Belajar')");
  await pool.query("INSERT IGNORE INTO product_categories(name) SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND TRIM(category) <> ''");

  const [[pr]] = await pool.query("SELECT COUNT(*) n FROM payroll_rules");
  if (!pr.n) await pool.query("INSERT INTO payroll_rules(base_rate,transport_allowance,late_penalty,ontime_bonus) VALUES(100000,15000,10000,150000)");
  const [[deo]] = await pool.query("SELECT id FROM products WHERE name='ADLS Deo'");
  const [[prodCnt]] = await pool.query("SELECT COUNT(*) n FROM products");
  if (!deo && Number(prodCnt.n || 0) <= 3) {
    await pool.query("INSERT INTO products(name,category,age_group,price,stock,description) VALUES('ADLS Deo','Merchandise','Remaja',45000,40,'Deodorant eksklusif ADLS')");
  }
}

(async () => {
  await ensureSchema();
  const [[{ n }]] = await pool.query("SELECT COUNT(*) n FROM users");
  if (!n) { // seed akun owner pertama
    await pool.query("INSERT INTO users(name,email,password,role) VALUES(?,?,?, 'owner')", ["Owner ADLS", process.env.OWNER_EMAIL, await bcrypt.hash(process.env.OWNER_PASSWORD, 10)]);
    console.log("Owner dibuat:", process.env.OWNER_EMAIL);
  }
  app.listen(process.env.PORT || 5000, () => console.log("ADLS API ready"));
})();