import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BookOpenCheck,
  CheckSquare,
  Loader2,
  Plus,
  Printer,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import AsyncResourceSelect from "@/components/AsyncResourceSelect";
import DatePickerInput from "@/components/DatePickerInput";
import MonthlyEvaluationTable from "@/components/MonthlyEvaluationTable";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

export default function MonthlyEvaluations() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const isStaff = STAFF.includes(user?.role);
  const isTutor = user?.role === "tutor";
  const isParentOrStudent = ["ortu", "siswa"].includes(user?.role);

  const initialMonth = searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(initialMonth);
  const [tab, setTab] = useState(isStaff ? "design" : "view"); // "design" | "score" | "view"

  // Selection state
  const [selectedClass, setSelectedClass] = useState(null);
  const [applyAllClasses, setApplyAllClasses] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [myChildren, setMyChildren] = useState([]);

  // Data state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [structure, setStructure] = useState([]);
  const [scores, setScores] = useState({});
  const [notes, setNotes] = useState("");
  const [studentInfo, setStudentInfo] = useState(null);

  useEffect(() => {
    if (user?.role === "ortu") {
      api
        .get(API_ENDPOINTS.MY_STUDENTS)
        .then((r) => {
          const list = r.data.data || [];
          setMyChildren(list);
          if (list.length && !selectedStudent) {
            setSelectedStudent(list[0]);
          }
        })
        .catch(() => setMyChildren([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const loadEvaluation = useCallback(async () => {
    setLoading(true);
    try {
      const params = { month };
      if (isParentOrStudent) {
        if (selectedStudent?.id) params.student_id = selectedStudent.id;
      } else if (tab === "design") {
        params.class_id = applyAllClasses ? 0 : (selectedClass?.id || 0);
      } else {
        if (selectedStudent?.id) params.student_id = selectedStudent.id;
        if (selectedClass?.id) params.class_id = selectedClass.id;
      }
      const { data } = await api.get(API_ENDPOINTS.MONTHLY_EVALUATIONS.GET, { params });
      const d = data.data || {};
      setTitle(d.title || `LEMBAR EVALUASI ${month}`);
      setStructure(d.structure || []);
      setScores(d.scores || {});
      setNotes(d.notes || "");
      setStudentInfo(d.student || null);
    } catch {
      toast.error("Gagal memuat laporan belajar bulanan");
    } finally {
      setLoading(false);
    }
  }, [month, tab, applyAllClasses, selectedClass?.id, selectedStudent?.id, isParentOrStudent]);

  useEffect(() => {
    loadEvaluation();
  }, [loadEvaluation]);

  // Design editing helpers
  const addAspect = () => {
    const idx = structure.length + 1;
    const baseId = `aspect_${Date.now()}_${idx}`;
    setStructure([
      ...structure,
      {
        id: baseId,
        aspect: `Aspect ${idx}`,
        target: "",
        criteria: [
          { id: `${baseId}_1`, label: "1. Summative assessment results." },
          { id: `${baseId}_2`, label: "2. Performance evidence throughout the learning process." },
          { id: `${baseId}_3`, label: "3. Consistency of achievement." },
        ],
      },
    ]);
  };

  const removeAspect = (idx) => {
    if (structure.length <= 1) {
      toast.error("Minimal harus ada 1 aspek penilaian");
      return;
    }
    setStructure(structure.filter((_, i) => i !== idx));
  };

  const updateAspect = (idx, patch) => {
    setStructure(structure.map((blk, i) => (i === idx ? { ...blk, ...patch } : blk)));
  };

  const addCriterion = (aspectIdx) => {
    setStructure(
      structure.map((blk, i) => {
        if (i !== aspectIdx) return blk;
        const nextNum = (blk.criteria?.length || 0) + 1;
        return {
          ...blk,
          criteria: [
            ...(blk.criteria || []),
            { id: `${blk.id}_${Date.now()}_${nextNum}`, label: `${nextNum}. ` },
          ],
        };
      })
    );
  };

  const updateCriterion = (aspectIdx, crIdx, label) => {
    setStructure(
      structure.map((blk, i) => {
        if (i !== aspectIdx) return blk;
        return {
          ...blk,
          criteria: blk.criteria.map((cr, j) => (j === crIdx ? { ...cr, label } : cr)),
        };
      })
    );
  };

  const removeCriterion = (aspectIdx, crIdx) => {
    setStructure(
      structure.map((blk, i) => {
        if (i !== aspectIdx) return blk;
        if (blk.criteria.length <= 1) return blk;
        return { ...blk, criteria: blk.criteria.filter((_, j) => j !== crIdx) };
      })
    );
  };

  const saveDesign = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await request(
        () =>
          api.put(API_ENDPOINTS.MONTHLY_EVALUATIONS.DESIGN, {
            class_id: applyAllClasses ? 0 : (selectedClass?.id || 0),
            apply_all_classes: applyAllClasses,
            month,
            title,
            structure,
          }),
        { success: "Desain Lembar Evaluasi Bulanan berhasil disimpan!" }
      );
      loadEvaluation();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const saveScores = async () => {
    if (!selectedStudent?.id) {
      toast.error("Pilih siswa terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      await request(
        () =>
          api.put(API_ENDPOINTS.MONTHLY_EVALUATIONS.SCORES, {
            student_id: selectedStudent.id,
            class_id: selectedStudent.class_id || selectedClass?.id || 0,
            month,
            scores,
            notes,
          }),
        { success: "Penilaian evaluasi bulanan siswa berhasil disimpan!" }
      );
      loadEvaluation();
    } catch {
      /* toast handled */
    } finally {
      setSaving(false);
    }
  };

  const pageHeading = isStaff
    ? "Design Laporan Belajar Setiap Kelas Bulanan"
    : "Laporan Belajar Bulanan";

  return (
    <div className="space-y-5">
      {/* Header Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">{pageHeading}</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            {isStaff
              ? "Atur desain tabel evaluasi bulanan (aspek, target, & jumlah baris kompetensi) per kelas dan isi penilaian siswa"
              : isTutor
              ? "Isi penilaian lembar evaluasi bulanan siswa berdasarkan desain kurikulum admin"
              : "Lembar evaluasi pencapaian kompetensi belajar bulanan ananda secara terstruktur"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isStaff && (
            <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setTab("design")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === "design"
                    ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Settings2 size={14} /> Design Tabel Evaluasi
              </button>
              <button
                type="button"
                onClick={() => setTab("score")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  tab === "score"
                    ? "bg-gradient-to-r from-brand-dark via-brand to-sky-700 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <CheckSquare size={14} /> Isi Penilaian Siswa
              </button>
            </div>
          )}

          {isParentOrStudent && (
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-ghost !py-2 text-xs font-bold"
            >
              <Printer size={15} /> Cetak Lembar Evaluasi
            </button>
          )}
        </div>
      </div>

      {/* Filter / Selector Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid gap-3 md:grid-cols-3 items-end">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">Periode Bulan &amp; Tahun</label>
            <DatePickerInput
              mode="month"
              value={month}
              onChange={(val) => {
                if (val) setMonth(val);
              }}
              className="!py-2 !text-xs font-bold"
            />
          </div>

          {user?.role === "ortu" && myChildren.length > 1 && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Pilih Anak</label>
              <select
                className="input !py-2 text-xs font-bold"
                value={selectedStudent?.id || ""}
                onChange={(e) => {
                  const found = myChildren.find((c) => String(c.id) === e.target.value);
                  setSelectedStudent(found || null);
                }}
              >
                {myChildren.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level || "-"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {isStaff && tab === "design" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Cakupan Desain Kelas</label>
                <select
                  className="input !py-2 text-xs font-bold"
                  value={applyAllClasses ? "all" : "specific"}
                  onChange={(e) => setApplyAllClasses(e.target.value === "all")}
                >
                  <option value="all">Template Global (Semua Kelas)</option>
                  <option value="specific">Khusus 1 Kelas Tertentu</option>
                </select>
              </div>
              {!applyAllClasses && (
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Pilih Kelas</label>
                  <AsyncResourceSelect
                    endpoint={API_ENDPOINTS.CLASSES.LIST}
                    value={selectedClass?.id || null}
                    initialLabel={selectedClass ? `${selectedClass.class_type || selectedClass.name} · ${selectedClass.level}` : ""}
                    formatOption={(c) => ({
                      value: c.id,
                      label: [c.class_type || c.name, c.level, c.branch_name].filter(Boolean).join(" · "),
                      raw: c,
                    })}
                    onChange={(opt) => setSelectedClass(opt ? opt.raw : null)}
                  />
                </div>
              )}
            </>
          )}

          {((isStaff && tab === "score") || isTutor) && (
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold text-slate-600">Pilih Siswa untuk Dinilai *</label>
              <AsyncResourceSelect
                endpoint={API_ENDPOINTS.STUDENTS.LIST}
                value={selectedStudent?.id || null}
                initialLabel={selectedStudent?.name || ""}
                formatOption={(s) => ({
                  value: s.id,
                  label: [s.name, s.class_name || s.class_type, s.level, s.branch_name].filter(Boolean).join(" · "),
                  raw: s,
                })}
                onChange={(opt) => setSelectedStudent(opt ? opt.raw : null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="card p-12 text-center text-sm text-slate-400">
          <Loader2 size={24} className="mx-auto mb-2 animate-spin text-brand" />
          Memuat data evaluasi bulanan...
        </div>
      ) : isStaff && tab === "design" ? (
        <form onSubmit={saveDesign} className="space-y-5">
          {/* Editor Card */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Pengaturan Kolom &amp; Baris Tabel Evaluasi</h2>
                <p className="text-xs text-slate-500">Tambah atau kurangi aspek belajar &amp; baris pencapaian kompetensi sesuai kebutuhan kelas</p>
              </div>
              <button type="button" onClick={addAspect} className="btn-ghost !py-1.5 text-xs font-bold">
                <Plus size={14} /> Tambah Aspek Baru
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Judul Lembar Evaluasi</label>
              <input
                required
                className="input !py-2 text-xs font-bold uppercase"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="LEMBAR EVALUASI NOVEMBER"
              />
            </div>

            <div className="space-y-4">
              {structure.map((blk, aIdx) => (
                <div key={blk.id || aIdx} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-extrabold text-brand-dark">
                      Aspek #{aIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAspect(aIdx)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 size={13} /> Hapus Aspek
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-600">Learning Aspect *</label>
                      <input
                        required
                        className="input !py-2 text-xs font-bold"
                        value={blk.aspect}
                        onChange={(e) => updateAspect(aIdx, { aspect: e.target.value })}
                        placeholder="mis. Speaking"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-600">Learning Targets *</label>
                      <textarea
                        rows={2}
                        required
                        className="input !py-2 text-xs"
                        value={blk.target}
                        onChange={(e) => updateAspect(aIdx, { target: e.target.value })}
                        placeholder="mis. Students are able to name and identify at least 10 food and drink items."
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-200/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">Baris Competency Achievement ({blk.criteria?.length || 0} baris)</span>
                      <button
                        type="button"
                        onClick={() => addCriterion(aIdx)}
                        className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-brand-50"
                      >
                        <Plus size={12} /> Tambah Baris
                      </button>
                    </div>
                    {(blk.criteria || []).map((cr, crIdx) => (
                      <div key={cr.id || crIdx} className="flex items-center gap-2">
                        <input
                          required
                          className="input !py-1.5 text-xs flex-1"
                          value={cr.label}
                          onChange={(e) => updateCriterion(aIdx, crIdx, e.target.value)}
                          placeholder={`${crIdx + 1}. Kriteria pencapaian...`}
                        />
                        {blk.criteria.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCriterion(aIdx, crIdx)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Hapus baris"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                Simpan Desain Lembar Evaluasi
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800">Pratinjau Tampilan di Akun Orang Tua</h3>
            <MonthlyEvaluationTable title={title} structure={structure} scores={{}} editable={false} />
          </div>
        </form>
      ) : (
        <div className="card p-5 space-y-4">
          {studentInfo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand/20 bg-brand-50/40 px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>Siswa: <b className="text-slate-900">{studentInfo.name}</b></span>
                <span>Kelas: <b className="text-brand-dark">{studentInfo.class_name || "-"}</b></span>
                <span>Level: <b className="text-slate-800">{studentInfo.level || "-"}</b></span>
                <span>Cabang: <b className="text-slate-700">{studentInfo.branch_name || "-"}</b></span>
              </div>
              <span className="rounded-full bg-white px-2.5 py-0.5 font-bold text-brand border border-brand/20">
                Periode: {month}
              </span>
            </div>
          )}

          {((isStaff && tab === "score") || isTutor) && !selectedStudent ? (
            <div className="py-12 text-center text-sm text-slate-400">
              <BookOpenCheck size={36} className="mx-auto mb-2 text-slate-300" />
              Silakan pilih siswa pada kolom di atas untuk mengisi penilaian evaluasi bulanan.
            </div>
          ) : (
            <>
              {((isStaff && tab === "score") || isTutor) && (
                <div className="rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs text-sky-900">
                  Klik kotak pada kolom <b>(1) Needs Stimulation</b>, <b>(2) Beginning to Develop</b>, <b>(3) Developing as Expected</b>, atau <b>(4) Very Good</b> di setiap baris kompetensi untuk memberi tanda centang (✓).
                </div>
              )}

              <MonthlyEvaluationTable
                title={title}
                structure={structure}
                scores={scores}
                editable={Boolean((isStaff && tab === "score") || isTutor)}
                onScoreChange={(crId, val) => setScores((prev) => ({ ...prev, [crId]: val }))}
              />

              {((isStaff && tab === "score") || isTutor) ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-600">Catatan Evaluasi Bulanan (Opsional)</label>
                    <textarea
                      rows={2}
                      className="input text-xs"
                      placeholder="Catatan perkembangan belajar ananda bulan ini..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="button" disabled={saving} onClick={saveScores} className="btn-primary">
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      Simpan Penilaian Evaluasi Bulanan
                    </button>
                  </div>
                </div>
              ) : notes ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
                  <div className="font-bold text-slate-900 mb-1">Catatan Evaluasi Bulan Ini:</div>
                  <p>{notes}</p>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
