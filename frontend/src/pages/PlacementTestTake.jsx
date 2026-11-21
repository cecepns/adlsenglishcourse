import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  GraduationCap,
  HelpCircle,
  Home,
  Loader2,
  Play,
  Send,
  Sparkles,
  Upload,
  User,
  Video,
  XCircle,
} from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { useAuth } from "@/context/AuthContext";
import ImageUploadField from "@/components/ImageUploadField";

export default function PlacementTestTake() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("form"); // "form" | "test" | "result"
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Candidate Data Form
  const [candidate, setCandidate] = useState({
    candidate_name: user?.name || "",
    candidate_phone: user?.phone || "",
    candidate_email: user?.email || "",
    branch_id: user?.branch_id || "",
    school_origin: "",
    school_grade: "",
    age_or_level: "",
    student_id: user?.role === "siswa" ? user?.student_id : null,
  });

  // Questions and Answers
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: selected_option }
  const [speakingVideoUrl, setSpeakingVideoUrl] = useState("");
  const [testResult, setTestResult] = useState(null);

  // Load public branches and questions
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [bRes, qRes] = await Promise.all([
          api.get(API_ENDPOINTS.PUBLIC_BRANCHES).catch(() => ({ data: { data: [] } })),
          api.get(API_ENDPOINTS.PLACEMENT_TEST.PUBLIC_QUESTIONS),
        ]);
        setBranches(bRes.data.data || []);
        const loadedQuestions = qRes.data.data || [];
        setQuestions(loadedQuestions);

        // Pre-fill branch if only 1 branch or candidate already has one
        if (!candidate.branch_id && bRes.data.data?.length > 0) {
          setCandidate((prev) => ({ ...prev, branch_id: bRes.data.data[0].id }));
        }
      } catch (err) {
        toast.error("Gagal memuat data placement test");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const handleStartTest = (e) => {
    e.preventDefault();
    if (!candidate.candidate_name.trim()) {
      toast.error("Silakan isi nama lengkap");
      return;
    }
    if (!candidate.candidate_phone.trim()) {
      toast.error("Silakan isi nomor WhatsApp");
      return;
    }
    if (questions.length === 0) {
      toast.error("Soal placement test belum tersedia");
      return;
    }
    setStep("test");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectOption = (questionId, optionLetter) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionLetter }));
  };

  const currentQ = questions[currentIndex];
  const isSpeakingQuestion = currentQ?.question_type === "speaking";

  // Calculate answered count
  const answeredCount = Object.keys(answers).length + (speakingVideoUrl ? 1 : 0);
  const totalCount = questions.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const handleSubmitTest = async () => {
    const unAnsweredPg = questions.filter(
      (q) => q.question_type !== "speaking" && !answers[q.id]
    ).length;

    if (unAnsweredPg > 0) {
      const confirmSubmit = window.confirm(
        `Masih ada ${unAnsweredPg} soal pilihan ganda yang belum dijawab. Yakin ingin mengumpulkan test sekarang?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, opt]) => {
        const qObj = questions.find((q) => Number(q.id) === Number(qId));
        return {
          question_id: Number(qId),
          question_number: qObj?.question_number,
          selected_option: opt,
        };
      });

      const payload = {
        ...candidate,
        answers: formattedAnswers,
        speaking_video_url: speakingVideoUrl || null,
      };

      const res = await api.post(API_ENDPOINTS.PLACEMENT_TEST.SUBMIT, payload);
      setTestResult(res.data.data);
      setStep("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Placement test berhasil dikirim!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal mengumpulkan test");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-slate-500">
        <Loader2 size={36} className="animate-spin text-brand mb-3" />
        <p className="text-sm font-semibold">Memuat Placement Test...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Navbar */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white font-black text-lg shadow-sm shadow-brand/30">
              A
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-brand-dark sm:text-base">
                ADLS Placement Test CBT
              </h1>
              <p className="text-[11px] text-slate-500">PT. Adls Solusi Indonesia</p>
            </div>
          </div>
          {user ? (
            <Link to="/" className="btn-ghost !px-3 !py-1.5 text-xs">
              <Home size={14} /> Beranda
            </Link>
          ) : (
            <Link to="/login" className="btn-ghost !px-3 !py-1.5 text-xs">
              Login Siswa / Ortu
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-6">
        {/* STEP 1: FORMULIR DATA DIRI CALON SISWA */}
        {step === "form" && (
          <div className="card p-6 sm:p-8">
            <div className="mb-6 text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-extrabold text-brand">
                <Sparkles size={14} /> Tes Penempatan Kemampuan Bahasa Inggris
              </span>
              <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">
                Placement Test &amp; Speaking Assessment
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-xs text-slate-600 sm:text-sm">
                Tes ini terdiri dari <b>20 soal pilihan ganda</b> dan <b>1 tugas speaking video</b> untuk menentukan level kelas terbaik bagi calon murid baru.
              </p>
            </div>

            <form onSubmit={handleStartTest} className="mx-auto max-w-xl space-y-4">
              <div className="rounded-2xl border border-brand-light/30 bg-gradient-to-r from-brand-50/60 to-white p-4 text-xs text-slate-700">
                <div className="font-bold text-brand-dark mb-1 flex items-center gap-1.5">
                  <BookOpen size={15} /> Petunjuk Singkat:
                </div>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                  <li>Pilihlah satu jawaban yang paling tepat pada soal pilihan ganda.</li>
                  <li>Pada soal speaking (terakhir), unggah video singkat perkenalan diri Anda dalam bahasa Inggris.</li>
                  <li>Hasil tes dan skor PG akan langsung ditampilkan setelah tes selesai.</li>
                </ul>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Nama Lengkap *</label>
                <input
                  required
                  className="input !py-2.5 text-sm"
                  placeholder="mis. Muhammad Guntur Pratama"
                  value={candidate.candidate_name}
                  onChange={(e) => setCandidate({ ...candidate, candidate_name: e.target.value })}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">No. WhatsApp / HP *</label>
                  <input
                    required
                    type="tel"
                    className="input !py-2.5 text-sm"
                    placeholder="mis. 081234567890"
                    value={candidate.candidate_phone}
                    onChange={(e) => setCandidate({ ...candidate, candidate_phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Email (Opsional)</label>
                  <input
                    type="email"
                    className="input !py-2.5 text-sm"
                    placeholder="mis. nama@email.com"
                    value={candidate.candidate_email}
                    onChange={(e) => setCandidate({ ...candidate, candidate_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Cabang ADLS Dituju *</label>
                  <select
                    required
                    className="input !py-2.5 text-sm"
                    value={candidate.branch_id}
                    onChange={(e) => setCandidate({ ...candidate, branch_id: e.target.value })}
                  >
                    <option value="">-- Pilih Cabang --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">Usia / Kelas / Jenjang</label>
                  <input
                    className="input !py-2.5 text-sm"
                    placeholder="mis. Kelas 5 SD / Mahasiswa / Karyawan"
                    value={candidate.age_or_level}
                    onChange={(e) => setCandidate({ ...candidate, age_or_level: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Asal Sekolah / Universitas / Kantor</label>
                <input
                  className="input !py-2.5 text-sm"
                  placeholder="mis. SDN Sukadami 05 / PT Solusi Jaya"
                  value={candidate.school_origin}
                  onChange={(e) => setCandidate({ ...candidate, school_origin: e.target.value })}
                />
              </div>

              <div className="pt-3">
                <button type="submit" className="btn-primary w-full !py-3 text-sm font-extrabold shadow-md">
                  Mulai Placement Test ({questions.length} Soal) →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: HALAMAN PENGERJAAN CBT */}
        {step === "test" && currentQ && (
          <div className="space-y-5">
            {/* Progress Bar & Quick Info */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900">
                    Soal {currentIndex + 1} dari {totalCount}
                  </span>
                  <span className="ml-2 text-slate-400">· {currentQ.level || "General"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600">
                    Terjawab: <b className="text-brand">{answeredCount}</b> / {totalCount}
                  </span>
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-extrabold text-brand">
                    {progressPercent}%
                  </span>
                </div>
              </div>
              <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-gradient-to-r from-brand to-sky-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Stepper / Grid Nomor Soal */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <div className="mb-2 text-xs font-bold text-slate-600">Navigasi Nomor Soal:</div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {questions.map((q, idx) => {
                  const isSpeaking = q.question_type === "speaking";
                  const isAnswered = isSpeaking ? Boolean(speakingVideoUrl) : Boolean(answers[q.id]);
                  const isCurrent = idx === currentIndex;

                  return (
                    <button
                      key={q.id || idx}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 text-xs font-bold transition ${
                        isCurrent
                          ? "bg-brand text-white shadow-xs ring-2 ring-brand/40"
                          : isAnswered
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title={`Soal ${idx + 1}${isSpeaking ? " (Speaking Video)" : ""}`}
                    >
                      {isSpeaking ? `🎬 ${idx + 1}` : idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Area Konten Soal Aktif */}
            <div className="card p-5 sm:p-7">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-white text-xs font-black">
                    {currentIndex + 1}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-brand-dark">
                    {isSpeakingQuestion ? "Speaking Task (Video Upload)" : "Pilihan Ganda"}
                  </span>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {currentQ.level || "General"}
                </span>
              </div>

              {/* Teks Pertanyaan */}
              <div className="mt-4">
                <p className="text-base font-bold text-slate-800 sm:text-lg leading-relaxed whitespace-pre-line">
                  {currentQ.question_text}
                </p>

                {/* Gambar Soal (Jika Ada) */}
                {currentQ.image_url && (
                  <div className="mt-3.5 max-w-md overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={resolveAssetUrl(currentQ.image_url)}
                      alt="Gambar Soal"
                      className="max-h-72 w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* PILIHAN GANDA (Jika type === multiple_choice) */}
              {!isSpeakingQuestion && (
                <div className="mt-6 space-y-3">
                  {[
                    { key: "A", text: currentQ.option_a },
                    { key: "B", text: currentQ.option_b },
                    { key: "C", text: currentQ.option_c },
                    { key: "D", text: currentQ.option_d },
                  ]
                    .filter((opt) => Boolean(opt.text))
                    .map((opt) => {
                      const isSelected = answers[currentQ.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleSelectOption(currentQ.id, opt.key)}
                          className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition ${
                            isSelected
                              ? "border-brand bg-brand-50/70 shadow-xs ring-1 ring-brand"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black transition ${
                              isSelected
                                ? "bg-brand text-white shadow-2xs"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {opt.key}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 leading-snug">
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* SPEAKING TASK (Jika type === speaking) */}
              {isSpeakingQuestion && (
                <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-sky-900">
                    <Video size={18} className="text-brand" /> Instruksi Perekaman / Unggah Video Speaking:
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Silakan rekam video perkenalan diri Anda menggunakan HP atau kamera (1 - 2 menit) dalam bahasa Inggris. Kemudian unggah file video tersebut di bawah ini (format didukung: MP4, WebM, MOV maks 100MB). Video ini akan menjadi <b>Video Before</b> Anda!
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">Unggah File Video Speaking Anda *</label>
                    <ImageUploadField
                      allowVideo={true}
                      value={speakingVideoUrl}
                      onChange={(url) => setSpeakingVideoUrl(url)}
                    />
                  </div>

                  {speakingVideoUrl && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span>Video speaking berhasil diunggah! Anda dapat memutar ulang video di atas sebelum mengirim tes.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Navigasi Bawah */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="btn-ghost !px-4 !py-2 text-xs font-bold disabled:opacity-30"
                >
                  <ChevronLeft size={16} /> Sebelumnya
                </button>

                <div className="flex items-center gap-2">
                  {currentIndex < totalCount - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
                      className="btn-primary !px-5 !py-2 text-xs font-bold shadow-xs"
                    >
                      Selanjutnya <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitTest}
                      disabled={submitting}
                      className="btn-primary !bg-emerald-600 hover:!bg-emerald-700 !px-6 !py-2.5 text-xs font-extrabold shadow-md"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin mr-1" /> Mengirim Test...
                        </>
                      ) : (
                        <>
                          <Send size={15} className="mr-1" /> Selesai &amp; Kumpulkan Test
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: HASIL PLACEMENT TEST */}
        {step === "result" && testResult && (
          <div className="card mx-auto max-w-xl p-6 sm:p-8 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
              <Award size={36} />
            </div>

            <div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                Placement Test Berhasil Diselesaikan!
              </span>
              <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
                Terima Kasih, {testResult.candidate_name}!
              </h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Jawaban pilihan ganda dan video speaking Anda telah berhasil tersimpan di sistem ADLS.
              </p>
            </div>

            {/* Score Cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-brand/20 bg-brand-50/50 p-4">
                <div className="text-xs font-bold text-slate-500">Skor Pilihan Ganda (PG)</div>
                <div className="mt-1 font-black text-3xl text-brand-dark">
                  {testResult.pg_score}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 font-medium">
                  {testResult.total_correct} dari {testResult.total_pg} soal benar
                </div>
              </div>

              <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
                <div className="text-xs font-bold text-slate-500">Rekomendasi Level Awal</div>
                <div className="mt-1 font-black text-lg text-sky-900">
                  {testResult.recommended_level}
                </div>
                <div className="mt-0.5 text-xs text-slate-500 font-medium">
                  Berdasarkan performa test CBT
                </div>
              </div>
            </div>

            {/* Speaking Video Note */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-left text-xs space-y-1.5 text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Video size={16} className="text-brand" /> Status Video Speaking:
              </div>
              <p>
                {testResult.has_speaking_video ? (
                  <span className="text-emerald-700 font-semibold">
                    ✓ Video speaking Anda telah tersimpan dan akan dievaluasi oleh Tim Akademik &amp; Tutor ADLS. Video ini tersimpan sebagai rekaman <b>Before</b> awal masuk Anda!
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Video speaking belum diunggah saat tes. Tim admin/tutor dapat merekam video speaking saat Anda hadir di cabang.
                  </span>
                )}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row justify-center gap-2.5">
              {user ? (
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn-primary !py-2.5 text-xs font-extrabold"
                >
                  <Home size={15} /> Kembali ke Dashboard
                </button>
              ) : (
                <Link to="/login" className="btn-primary !py-2.5 text-xs font-extrabold">
                  Masuk ke Portal ADLS →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
