import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Check, ChevronRight, Edit3, Loader2, Save, Settings2, Star } from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import Modal from "./Modal";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const ASPECTS = [
  { key: "speaking", label: "Speaking", color: "bg-sky-50 text-sky-800 border-sky-200" },
  { key: "listening", label: "Listening", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { key: "writing", label: "Writing", color: "bg-amber-50 text-amber-800 border-amber-200" },
  { key: "reading", label: "Reading", color: "bg-indigo-50 text-indigo-800 border-indigo-200" },
];

export default function LearningJourneyRoadmap({ studentId, studentName, level, courseCompleted, compact = false, variant = "meetings" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isStaff = STAFF.includes(user?.role);
  const canScore = [...STAFF, "tutor"].includes(user?.role);
  const isMonthlyVariant = variant === "monthly";
  const currentYear = new Date().getFullYear();

  const [meetings, setMeetings] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Admin modal: Edit 12 meeting topics & replace across all accounts
  const [tplModal, setTplModal] = useState(false);
  const [tplDraft, setTplDraft] = useState([]);
  const [savingTpl, setSavingTpl] = useState(false);

  // Admin & Tutor modal: Edit scores for a single meeting
  const [scoreModal, setScoreModal] = useState(null);
  const [scoreDraft, setScoreDraft] = useState({ speaking: "", listening: "", writing: "", reading: "", notes: "" });
  const [savingScore, setSavingScore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.LEARNING_JOURNEY.GET, {
        params: studentId ? { student_id: studentId } : {},
      });
      setMeetings(data.data?.meetings || []);
      setStudentInfo(data.data?.student || null);
    } catch {
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  const effectiveStudentId = studentId || studentInfo?.id;
  const displayLevel = level || studentInfo?.level || "Basic";
  const displayName = studentName || studentInfo?.name || "";
  const isCompleted = courseCompleted ?? Boolean(studentInfo?.course_completed);
  const completedCount = meetings.filter((m) => m.completed).length;

  const openTemplateModal = () => {
    setTplDraft(meetings.map((m) => ({ meeting_number: m.meeting_number, topic: m.topic })));
    setTplModal(true);
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    setSavingTpl(true);
    try {
      await request(() => api.put(API_ENDPOINTS.LEARNING_JOURNEY.TEMPLATE, { meetings: tplDraft }), {
        success: "Roadmap 12 pertemuan berhasil diperbarui & diterapkan ke semua akun (Ortu, Siswa, Tutor)!",
      });
      setTplModal(false);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSavingTpl(false);
    }
  };

  const openScoreModal = (m) => {
    if (!canScore || !effectiveStudentId) return;
    setScoreModal(m);
    setScoreDraft({
      speaking: m.speaking ?? "",
      listening: m.listening ?? "",
      writing: m.writing ?? "",
      reading: m.reading ?? "",
      notes: m.notes || "",
    });
  };

  const saveScore = async (e) => {
    e.preventDefault();
    if (!effectiveStudentId || !scoreModal) return;
    setSavingScore(true);
    try {
      await request(
        () =>
          api.put(API_ENDPOINTS.LEARNING_JOURNEY.SCORES(effectiveStudentId), {
            meeting_number: scoreModal.meeting_number,
            speaking: scoreDraft.speaking,
            listening: scoreDraft.listening,
            writing: scoreDraft.writing,
            reading: scoreDraft.reading,
            notes: scoreDraft.notes,
          }),
        { success: `Nilai Pertemuan ${scoreModal.meeting_number} berhasil disimpan!` }
      );
      setScoreModal(null);
      load();
    } catch {
      /* toast handled */
    } finally {
      setSavingScore(false);
    }
  };

  return (
    <div className={`card overflow-hidden border border-brand/20 bg-gradient-to-br from-white via-sky-50/20 to-brand-50/30 ${compact ? "p-4" : "p-5"}`}>
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 shadow-2xs">
            <Star size={18} className="fill-amber-400 text-amber-500" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Learning Journey Roadmap · {isMonthlyVariant ? "Januari – Desember" : "12x Pertemuan"}
              {displayName ? <span className="ml-1.5 text-brand">({displayName})</span> : null}
            </h3>
            <p className="text-xs text-slate-500">
              {isMonthlyVariant
                ? "Sesuai lesson plan setiap kelas (fokus kemampuan). Klik bulan untuk langsung menuju Laporan Belajar Bulanan"
                : "Fokus kemampuan & teknik penilaian 4 aspek (Speaking, Listening, Writing, Reading) di setiap pertemuan"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-2xs">
            <span>
              Level: <b className="text-brand">{displayLevel}</b>
            </span>
            <span>·</span>
            <span>
              Progres: <b className="text-emerald-700">{completedCount}/12 Pertemuan</b>
            </span>
            {isCompleted && <span>· ⭐ Lulus</span>}
          </div>

          {isStaff && (
            <button
              type="button"
              onClick={openTemplateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-brand-dark"
            >
              <Settings2 size={13} /> Edit Roadmap (Semua Akun)
            </button>
          )}
        </div>
      </div>

      {/* 12-Meeting Roadmap Grid (4 rows x 3 columns) */}
      {loading ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((m, idx) => {
            const isLast = m.meeting_number === 12;
            const clickableScore = canScore && Boolean(effectiveStudentId);
            const monthLabel = SHORT_MONTHS[m.meeting_number - 1] || `Bln ${m.meeting_number}`;
            const monthCode = `${currentYear}-${String(m.meeting_number).padStart(2, "0")}`;

            const handleCardClick = () => {
              if (clickableScore) {
                openScoreModal(m);
              } else {
                navigate(`/monthly-evaluations?month=${monthCode}`);
              }
            };

            if (isMonthlyVariant) {
              return (
                <div key={m.meeting_number} className="relative flex items-stretch">
                  <div
                    onClick={handleCardClick}
                    className={`flex w-full cursor-pointer flex-col justify-between rounded-2xl border p-4 transition hover:border-brand hover:shadow-md group ${
                      m.completed ? "border-brand/30 bg-white shadow-xs" : "border-slate-200/80 bg-white/90"
                    }`}
                    title="Klik untuk menuju Laporan Belajar Bulanan"
                  >
                    {/* Blue Month Pill + Horizontal Line + Orange Topic Pill (PDF Ortu Hal 2) */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex min-w-[54px] items-center justify-center rounded-xl bg-gradient-to-r from-brand-dark via-brand to-sky-600 px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                          {monthLabel}
                        </span>
                        <div className="h-0.5 flex-1 rounded-full bg-slate-200 group-hover:bg-brand/30 transition" />
                        <ChevronRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand" />
                      </div>

                      <div className="mt-2.5 flex items-center justify-center rounded-xl border border-amber-400/80 bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 px-3 py-1.5 text-center shadow-2xs">
                        <span className="text-xs font-extrabold text-amber-950 line-clamp-1" title={m.topic}>
                          {m.topic}
                        </span>
                      </div>
                    </div>

                    {/* 2x2 Score Layout: Speaking / Writing / Listening / Reading */}
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-100 pt-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Speaking</span>
                        <span className={`font-black ${m.speaking != null ? "text-slate-900" : "text-slate-300"}`}>
                          {m.speaking ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Writing</span>
                        <span className={`font-black ${m.writing != null ? "text-slate-900" : "text-slate-300"}`}>
                          {m.writing ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Listening</span>
                        <span className={`font-black ${m.listening != null ? "text-slate-900" : "text-slate-300"}`}>
                          {m.listening ?? "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-600">Reading</span>
                        <span className={`font-black ${m.reading != null ? "text-slate-900" : "text-slate-300"}`}>
                          {m.reading ?? "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.meeting_number} className="relative flex items-stretch">
                <div
                  onClick={handleCardClick}
                  className={`flex w-full flex-col justify-between rounded-2xl border p-3.5 transition cursor-pointer hover:border-brand hover:shadow-md group ${
                    m.completed
                      ? "border-emerald-200/90 bg-white shadow-xs"
                      : "border-slate-200/80 bg-white/85"
                  }`}
                >
                  {/* Top Row: Step Number + Topic + Edit Icon */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black shadow-2xs ${
                            isLast && m.completed
                              ? "bg-amber-400 text-amber-950 ring-2 ring-amber-200"
                              : m.completed
                              ? "bg-emerald-600 text-white"
                              : "bg-brand-50 text-brand-dark border border-brand/20"
                          }`}
                        >
                          {isLast ? (
                            <Star size={14} className={m.completed ? "fill-amber-950" : "text-amber-500"} />
                          ) : m.completed ? (
                            <Check size={14} className="stroke-[2.5]" />
                          ) : (
                            m.meeting_number
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Pertemuan {m.meeting_number}
                          </div>
                          <div className="text-xs font-extrabold text-slate-900 leading-snug line-clamp-2" title={m.topic}>
                            {m.topic}
                          </div>
                        </div>
                      </div>

                      {clickableScore && (
                        <span
                          className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 text-slate-400 transition group-hover:border-brand/40 group-hover:bg-brand-50 group-hover:text-brand"
                          title="Input / Edit Nilai Pertemuan"
                        >
                          <Edit3 size={12} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4 Learning Aspects (Speaking, Listening, Writing, Reading) */}
                  <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-slate-100 pt-2.5">
                    {ASPECTS.map((asp) => {
                      const val = m[asp.key];
                      const hasVal = val !== null && val !== undefined;
                      return (
                        <div
                          key={asp.key}
                          className={`rounded-lg border px-1 py-1.5 text-center ${
                            hasVal ? asp.color : "border-slate-100 bg-slate-50/70 text-slate-400"
                          }`}
                        >
                          <div className="text-[9px] font-bold leading-none truncate">{asp.label}</div>
                          <div className={`mt-1 text-xs font-black leading-none ${hasVal ? "" : "text-slate-300"}`}>
                            {hasVal ? val : "-"}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {m.notes && (
                    <div className="mt-2 truncate text-[10px] italic text-slate-500" title={m.notes}>
                      Catatan: {m.notes}
                    </div>
                  )}
                </div>

                {/* Subtle arrow connector between columns on desktop */}
                {(idx + 1) % 3 !== 0 && idx < meetings.length - 1 && (
                  <div className="pointer-events-none hidden lg:flex items-center justify-center -mr-2.5 ml-0.5 text-brand/30">
                    <ArrowRight size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {canScore && effectiveStudentId && (
        <p className="mt-3 text-[11px] font-medium text-slate-500">
          💡 Klik kartu pertemuan (1–12) untuk mengisi atau memperbarui nilai <b>Speaking, Listening, Writing, dan Reading</b> siswa.
        </p>
      )}

      {/* Modal Admin: Edit Kurikulum 12 Pertemuan & Replace ke Semua Akun */}
      <Modal open={tplModal} title="Edit Kurikulum Learning Journey Roadmap (12 Pertemuan)" onClose={() => setTplModal(false)}>
        <form onSubmit={saveTemplate} className="space-y-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
            Perubahan fokus kemampuan / topik pertemuan di sini akan <b>otomatis menggantikan (replace)</b> tampilan roadmap di seluruh akun <b>Orang Tua, Siswa, dan Tutor</b>.
          </div>
          <div className="max-h-[55vh] space-y-2.5 overflow-y-auto pr-1">
            {tplDraft.map((item, idx) => (
              <div key={item.meeting_number} className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-xs font-black text-brand-dark">
                  {item.meeting_number}
                </span>
                <input
                  required
                  className="input !py-2 text-xs font-semibold"
                  placeholder={`Fokus kemampuan pertemuan ${item.meeting_number}`}
                  value={item.topic}
                  onChange={(e) => {
                    const next = [...tplDraft];
                    next[idx] = { ...next[idx], topic: e.target.value };
                    setTplDraft(next);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setTplModal(false)}>
              Batal
            </button>
            <button type="submit" disabled={savingTpl} className="btn-primary">
              {savingTpl ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Simpan &amp; Replace ke Semua Akun
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Input Nilai 4 Aspek per Pertemuan */}
      <Modal
        open={!!scoreModal}
        title={scoreModal ? `Nilai Pertemuan ${scoreModal.meeting_number}: ${scoreModal.topic}` : ""}
        onClose={() => setScoreModal(null)}
      >
        {scoreModal && (
          <form onSubmit={saveScore} className="space-y-4">
            <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
              Siswa: <b className="text-slate-900">{displayName || `#${effectiveStudentId}`}</b> · Fokus Kemampuan:{" "}
              <b className="text-brand-dark">{scoreModal.topic}</b>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ASPECTS.map((asp) => (
                <div key={asp.key}>
                  <label className="mb-1 block text-xs font-bold text-slate-700">{asp.label} (0–100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="input"
                    placeholder="0 - 100"
                    value={scoreDraft[asp.key]}
                    onChange={(e) => setScoreDraft({ ...scoreDraft, [asp.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Catatan Evaluasi (Opsional)</label>
              <textarea
                rows={2}
                className="input text-xs"
                placeholder="mis. Pengucapan sudah lancar, tingkatkan latihan menulis..."
                value={scoreDraft.notes}
                onChange={(e) => setScoreDraft({ ...scoreDraft, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" className="btn-ghost" onClick={() => setScoreModal(null)}>
                Batal
              </button>
              <button type="submit" disabled={savingScore} className="btn-primary">
                {savingScore ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Simpan Nilai
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
