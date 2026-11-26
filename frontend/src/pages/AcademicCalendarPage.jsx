import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { request } from "@/utils/request";
import { useAuth } from "@/context/AuthContext";
import Modal from "@/components/Modal";
import DatePickerInput from "@/components/DatePickerInput";

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Palet warna Nude / Pastel lembut (tidak mencolok)
export const CALENDAR_CATEGORIES = [
  {
    key: "libur",
    label: "Libur & Cuti",
    badge: "bg-[#F4E3E1] text-[#844B47] border-[#E6C7C3]",
    pill: "bg-[#F7EAE8] text-[#7D4743] border-[#EAD0CC]",
    cellTint: "bg-[#FBF3F2]",
    dot: "bg-[#C98A84]",
  },
  {
    key: "ujian",
    label: "Ujian / Assessment",
    badge: "bg-[#F5EBD9] text-[#7E5E32] border-[#E5D3B3]",
    pill: "bg-[#F8F0E1] text-[#78592F] border-[#E9D9BB]",
    cellTint: "bg-[#FCF8F0]",
    dot: "bg-[#C8A56E]",
  },
  {
    key: "tugas",
    label: "Video Project / Tugas",
    badge: "bg-[#E4EDE7] text-[#416551] border-[#C9DBD0]",
    pill: "bg-[#EAF2ED] text-[#3F614E] border-[#CFE0D5]",
    cellTint: "bg-[#F4F9F6]",
    dot: "bg-[#7FA68F]",
  },
  {
    key: "lomba",
    label: "Lomba / Kompetisi",
    badge: "bg-[#ECE6F0] text-[#5B4870] border-[#D8CEE0]",
    pill: "bg-[#F1ECF5] text-[#57456B] border-[#DFD6E6]",
    cellTint: "bg-[#F8F5FA]",
    dot: "bg-[#9D88B5]",
  },
  {
    key: "kuis",
    label: "Kuis / Mini Test",
    badge: "bg-[#E3EBF1] text-[#3F5970] border-[#C8D7E4]",
    pill: "bg-[#EAF0F5] text-[#3D566B] border-[#D1DEE9]",
    cellTint: "bg-[#F4F8FB]",
    dot: "bg-[#7D9BB5]",
  },
  {
    key: "event",
    label: "Event / Kegiatan",
    badge: "bg-[#F6E6DC] text-[#845238] border-[#E6CBB9]",
    pill: "bg-[#F9EDE5] text-[#7E4E35] border-[#EAD3C3]",
    cellTint: "bg-[#FCF6F2]",
    dot: "bg-[#C79376]",
  },
];

const CAT_MAP = Object.fromEntries(CALENDAR_CATEGORIES.map((c) => [c.key, c]));

const getCategoryStyle = (key) => CAT_MAP[key] || CAT_MAP.event;

const pad2 = (n) => String(n).padStart(2, "0");

function formatHumanDateRange(startStr, endStr) {
  if (!startStr) return "-";
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const [ey, em, ed] = (endStr || startStr).split("-").map(Number);
  if (startStr === (endStr || startStr)) {
    return `${sd} ${MONTHS_ID[sm - 1]} ${sy}`;
  }
  if (sy === ey && sm === em) {
    return `${sd}–${ed} ${MONTHS_ID[sm - 1]} ${sy}`;
  }
  return `${sd} ${SHORT_MONTHS[sm - 1]} – ${ed} ${SHORT_MONTHS[em - 1]} ${ey}`;
}

export default function AcademicCalendarPage() {
  const { user } = useAuth();
  const canEdit = ["owner", "admin_pusat"].includes(user?.role);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [categoryFilter, setCategoryFilter] = useState("");
  const [events, setEvents] = useState([]);
  const [monthCounts, setMonthCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const autoSwitchedRef = useRef(false);
  const userChangedYearRef = useRef(false);

  // Add / Edit modal (Owner & Admin Pusat)
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "event",
    start_date: "",
    end_date: "",
    description: "",
  });

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(API_ENDPOINTS.ACADEMIC_CALENDAR.LIST, {
        params: {
          year,
          month,
          ...(categoryFilter ? { category: categoryFilter } : {}),
        },
      });
      const payload = data.data || {};
      // Jika tahun sekarang masih kosong dan user belum memilih tahun manual, otomatis arahkan ke 2027 (draft resmi ADLS)
      if (
        !autoSwitchedRef.current &&
        !userChangedYearRef.current &&
        Number(payload.total_year_events || 0) === 0 &&
        year !== 2027
      ) {
        autoSwitchedRef.current = true;
        setYear(2027);
        setMonth(1);
        return;
      }
      setEvents(payload.events || []);
      setMonthCounts(payload.month_counts || {});
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, categoryFilter]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const handleYearChange = (nextYear) => {
    userChangedYearRef.current = true;
    setYear(Number(nextYear));
    setSelectedDay(null);
  };

  const handlePrevMonth = () => {
    setSelectedDay(null);
    if (month === 1) {
      userChangedYearRef.current = true;
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    if (month === 12) {
      userChangedYearRef.current = true;
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  // Build calendar grid cells for current month (7 columns, Su-Sa)
  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ empty: true, key: `empty-start-${i}` });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
      const dayEvents = events.filter((ev) => ev.start_date <= dateStr && (ev.end_date || ev.start_date) >= dateStr);
      cells.push({
        empty: false,
        key: dateStr,
        day,
        dateStr,
        events: dayEvents,
        isToday:
          year === now.getFullYear() &&
          month === now.getMonth() + 1 &&
          day === now.getDate(),
        isSunday: (firstWeekday + day - 1) % 7 === 0,
      });
    }
    const trailing = (7 - (cells.length % 7)) % 7;
    for (let i = 0; i < trailing; i++) {
      cells.push({ empty: true, key: `empty-end-${i}` });
    }
    return cells;
  }, [year, month, events, now]);

  const openCreateModal = (prefillDate = "") => {
    if (!canEdit) return;
    const defaultDate = prefillDate || `${year}-${pad2(month)}-01`;
    setEditing(null);
    setForm({
      title: "",
      category: "event",
      start_date: defaultDate,
      end_date: defaultDate,
      description: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (ev) => {
    if (!canEdit) return;
    setEditing(ev);
    setForm({
      title: ev.title || "",
      category: ev.category || "event",
      start_date: ev.start_date || "",
      end_date: ev.end_date || ev.start_date || "",
      description: ev.description || "",
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.start_date) {
      return toast.error("Judul agenda dan tanggal mulai wajib diisi");
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        end_date: form.end_date && form.end_date >= form.start_date ? form.end_date : form.start_date,
      };
      if (editing) {
        await request(() => api.put(API_ENDPOINTS.ACADEMIC_CALENDAR.DETAIL(editing.id), payload), {
          success: "Agenda kalender akademik berhasil diperbarui",
        });
      } else {
        await request(() => api.post(API_ENDPOINTS.ACADEMIC_CALENDAR.LIST, payload), {
          success: "Agenda kalender akademik berhasil ditambahkan",
        });
      }
      setModalOpen(false);
      loadCalendar();
    } catch {
      /* toast handled by request */
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ev) => {
    if (!canEdit) return;
    if (!window.confirm(`Hapus agenda "${ev.title}" dari kalender akademik?`)) return;
    try {
      await request(() => api.delete(API_ENDPOINTS.ACADEMIC_CALENDAR.DETAIL(ev.id)), {
        success: "Agenda berhasil dihapus",
      });
      loadCalendar();
    } catch {
      /* toast handled */
    }
  };

  const selectedDateStr = selectedDay ? `${year}-${pad2(month)}-${pad2(selectedDay)}` : null;
  const visibleSidebarEvents = useMemo(() => {
    if (!selectedDateStr) return events;
    return events.filter((ev) => ev.start_date <= selectedDateStr && (ev.end_date || ev.start_date) >= selectedDateStr);
  }, [events, selectedDateStr]);

  const yearOptions = useMemo(() => {
    const base = new Set([2026, 2027, 2028, year]);
    return Array.from(base).sort((a, b) => a - b);
  }, [year]);

  return (
    <div className="space-y-5">
      {/* Header Banner dengan Palet Nude Lembut */}
      <div className="rounded-2xl border border-[#EAE1D6] bg-gradient-to-br from-[#FAF6F1] via-[#FDFBF8] to-[#F4ECE3] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E5D8C8] bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#7A6354]">
              <CalendarDays size={13} className="text-[#9E7B63]" />
              Kalender Akademik ADLS
            </div>
            <h1 className="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-[#3E352F]">
              Agenda &amp; Jadwal Akademik {MONTHS_ID[month - 1]} {year}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#7A6C63]">
              Informasi hari libur, ujian/assessment, pengumpulan tugas video project, lomba, kuis, dan kegiatan resmi ADLS per bulan secara rinci.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Switcher Tahun */}
            <div className="inline-flex items-center rounded-xl border border-[#E2D6C8] bg-white/90 p-1 shadow-2xs">
              {yearOptions.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => handleYearChange(yr)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    year === yr
                      ? "bg-[#8C705F] text-white shadow-xs"
                      : "text-[#6E5F55] hover:bg-[#F5EFE8]"
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={() => openCreateModal()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#7D6252] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6A5244] transition"
              >
                <Plus size={15} />
                Tambah Agenda
              </button>
            )}
          </div>
        </div>

        {/* Bar Navigasi 12 Bulan (1 Screen Per Bulan) */}
        <div className="mt-5 flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2D6C8] bg-white text-[#6D5D52] hover:bg-[#F5EFE8] transition"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex flex-1 items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SHORT_MONTHS.map((label, idx) => {
              const mNum = idx + 1;
              const isActive = month === mNum;
              const count = monthCounts[mNum] || 0;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setMonth(mNum);
                    setSelectedDay(null);
                  }}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    isActive
                      ? "bg-[#7D6252] text-white shadow-sm"
                      : "border border-[#EAE1D6] bg-white/80 text-[#6B5D54] hover:bg-[#F5EFE8]"
                  }`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                        isActive ? "bg-white/25 text-white" : "bg-[#EFE5DA] text-[#7A6252]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#E2D6C8] bg-white text-[#6D5D52] hover:bg-[#F5EFE8] transition"
            title="Bulan Berikutnya"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Filter & Legend Kategori (Nude Tone) */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#EAE1D6] pt-3.5">
          <button
            type="button"
            onClick={() => setCategoryFilter("")}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${
              categoryFilter === ""
                ? "border-[#8C705F] bg-[#8C705F] text-white"
                : "border-[#E3D8CC] bg-white/80 text-[#6D5E54] hover:bg-[#F5EFE8]"
            }`}
          >
            Semua Kategori
          </button>
          {CALENDAR_CATEGORIES.map((cat) => {
            const active = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(active ? "" : cat.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                  active
                    ? `${cat.badge} ring-2 ring-[#8C705F]/30`
                    : "border-[#E3D8CC] bg-white/80 text-[#6D5E54] hover:bg-[#F5EFE8]"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${cat.dot}`} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main 1-Month Screen: Grid Kalender (Kiri) + Rincian Agenda (Kanan) */}
      <div className="grid gap-5 xl:grid-cols-12">
        {/* Kalender Bulanan Rinci */}
        <div className="xl:col-span-8 rounded-2xl border border-[#EAE1D6] bg-white p-4 sm:p-5 shadow-xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#3E352F]">
                {MONTHS_ID[month - 1]} {year}
              </h2>
              <p className="text-[11px] text-[#8B7D74]">
                {canEdit
                  ? "Klik tanggal mana saja untuk memfilter agenda atau menambahkan kegiatan baru pada tanggal tersebut."
                  : "Klik tanggal bertanda warna untuk melihat rincian agenda pada hari tersebut."}
              </p>
            </div>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-lg border border-[#E2D6C8] bg-[#FAF6F1] px-2.5 py-1 text-[11px] font-bold text-[#6E5C50] hover:bg-[#F2E9DF]"
              >
                Tampilkan Semua Agenda Bulan Ini
              </button>
            )}
          </div>

          {/* Nama Hari */}
          <div className="grid grid-cols-7 gap-1.5 text-center mb-1.5">
            {WEEKDAYS.map((wd, i) => (
              <div
                key={wd}
                className={`rounded-lg py-1.5 text-[11px] font-extrabold uppercase tracking-wider ${
                  i === 0 ? "bg-[#F9EFEF] text-[#9A5E5A]" : "bg-[#F7F3EE] text-[#6E5F55]"
                }`}
              >
                {wd}
              </div>
            ))}
          </div>

          {/* Grid Tanggal */}
          {loading ? (
            <div className="flex h-80 items-center justify-center text-sm text-[#8B7D74]">
              <Loader2 size={20} className="mr-2 animate-spin text-[#8C705F]" /> Memuat kalender akademik...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell) => {
                if (cell.empty) {
                  return <div key={cell.key} className="min-h-[82px] sm:min-h-[96px] rounded-xl bg-[#FCFBF9]" />;
                }
                const isSelected = selectedDay === cell.day;
                const primaryCat = cell.events[0] ? getCategoryStyle(cell.events[0].category) : null;
                return (
                  <div
                    key={cell.key}
                    onClick={() => setSelectedDay(isSelected ? null : cell.day)}
                    className={`group relative flex min-h-[82px] sm:min-h-[96px] cursor-pointer flex-col rounded-xl border p-1.5 sm:p-2 transition ${
                      isSelected
                        ? "border-[#8C705F] bg-[#FAF5EF] ring-2 ring-[#8C705F]/25"
                        : primaryCat
                        ? `border-[#E8DFD5] ${primaryCat.cellTint} hover:border-[#CBBBA8]`
                        : "border-[#EFE9E1] bg-white hover:border-[#D9CCC0] hover:bg-[#FCF9F6]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                          cell.isToday
                            ? "bg-[#7D6252] text-white"
                            : cell.isSunday
                            ? "text-[#A05A55]"
                            : "text-[#463C35]"
                        }`}
                      >
                        {cell.day}
                      </span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreateModal(cell.dateStr);
                          }}
                          className="hidden h-5 w-5 items-center justify-center rounded-md bg-white/90 text-[#7D6252] shadow-2xs hover:bg-[#7D6252] hover:text-white group-hover:inline-flex"
                          title={`Tambah agenda tanggal ${cell.day} ${MONTHS_ID[month - 1]}`}
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>

                    <div className="mt-1 space-y-1 overflow-hidden">
                      {cell.events.slice(0, 2).map((ev) => {
                        const st = getCategoryStyle(ev.category);
                        return (
                          <div
                            key={`${cell.key}-${ev.id}`}
                            className={`truncate rounded-md border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${st.pill}`}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {cell.events.length > 2 && (
                        <div className="px-1 text-[10px] font-bold text-[#8B7668]">
                          +{cell.events.length - 2} agenda lagi
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel Rincian Agenda Bulan Terpilih */}
        <div className="xl:col-span-4 rounded-2xl border border-[#EAE1D6] bg-[#FCF9F5] p-4 sm:p-5 shadow-xs flex flex-col">
          <div className="flex items-start justify-between gap-2 border-b border-[#EAE1D6] pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-[#3E352F]">
                {selectedDay
                  ? `Agenda ${selectedDay} ${MONTHS_ID[month - 1]} ${year}`
                  : `Rincian Agenda ${MONTHS_ID[month - 1]} ${year}`}
              </h3>
              <p className="text-[11px] text-[#8B7D74]">
                {visibleSidebarEvents.length} agenda terjadwal
              </p>
            </div>
            {canEdit && selectedDateStr && (
              <button
                type="button"
                onClick={() => openCreateModal(selectedDateStr)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#8C705F] px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#755C4E]"
              >
                <Plus size={12} /> Tgl {selectedDay}
              </button>
            )}
          </div>

          <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto max-h-[540px] pr-0.5">
            {visibleSidebarEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#DFD3C5] bg-white/70 p-6 text-center">
                <Sparkles size={22} className="mx-auto mb-2 text-[#B8A698]" />
                <p className="text-xs font-bold text-[#6E5F55]">
                  Belum ada agenda pada {selectedDay ? "tanggal ini" : "bulan ini"}.
                </p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => openCreateModal(selectedDateStr || `${year}-${pad2(month)}-01`)}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#D8C9B8] bg-white px-3 py-1.5 text-xs font-bold text-[#7D6252] hover:bg-[#F5EFE8]"
                  >
                    <Plus size={13} /> Tambah Agenda
                  </button>
                )}
              </div>
            ) : (
              visibleSidebarEvents.map((ev) => {
                const st = getCategoryStyle(ev.category);
                return (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-[#EAE1D6] bg-white p-3.5 shadow-2xs transition hover:border-[#D4C4B3]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${st.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                        {st.label}
                      </span>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(ev)}
                            className="rounded-lg p-1 text-[#8C705F] hover:bg-[#F4EDE5] hover:text-[#4E3E34]"
                            title="Edit Agenda"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ev)}
                            className="rounded-lg p-1 text-[#A66A65] hover:bg-[#F9EAE8] hover:text-[#844B47]"
                            title="Hapus Agenda"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 text-xs sm:text-sm font-extrabold text-[#3E352F]">
                      {ev.title}
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8A7566]">
                      <CalendarDays size={12} />
                      <span>{formatHumanDateRange(ev.start_date, ev.end_date)}</span>
                    </div>
                    {ev.description && (
                      <p className="mt-1.5 text-[11px] leading-relaxed text-[#7A6C63]">
                        {ev.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 rounded-xl border border-[#EAE1D6] bg-[#F6F0E9] p-3 text-[11px] text-[#7A695E] flex items-start gap-2">
            <Info size={14} className="mt-0.5 shrink-0 text-[#9E7B63]" />
            <span>
              {canEdit
                ? "Jadwal bersifat fleksibel dan dapat diperbarui kapan saja oleh Owner maupun Admin Pusat."
                : "Rolling Enrollment berlaku setiap bulan. Hubungi Admin ADLS jika terdapat pembaruan jadwal khusus cabang."}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Tambah / Edit Agenda (Khusus Owner & Admin Pusat) */}
      <Modal
        open={Boolean(canEdit && modalOpen)}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Edit Agenda Kalender Akademik" : "Tambah Agenda Kalender Akademik"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Judul Agenda / Kegiatan *</label>
            <input
              required
              className="input text-xs"
              placeholder="mis. Libur Hari Raya, Formative Assessment, Lomba Spelling Bee"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Kategori Agenda *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CALENDAR_CATEGORIES.map((cat) => {
                const selected = form.category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat.key })}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition ${
                      selected
                        ? `${cat.badge} ring-2 ring-[#8C705F]/30`
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cat.dot}`} />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tanggal Mulai *</label>
              <DatePickerInput
                required
                mode="date"
                value={form.start_date}
                onChange={(val) =>
                  setForm((prev) => ({
                    ...prev,
                    start_date: val,
                    end_date: !prev.end_date || prev.end_date < val ? val : prev.end_date,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tanggal Selesai</label>
              <DatePickerInput
                mode="date"
                value={form.end_date}
                onChange={(val) => setForm({ ...form, end_date: val })}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">Keterangan Tambahan (Opsional)</label>
            <textarea
              rows={3}
              className="input text-xs"
              placeholder="Catatan detail untuk tutor, siswa, dan orang tua..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-ghost text-xs"
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#7D6252] px-4 py-2 text-xs font-bold text-white hover:bg-[#6A5244] transition"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editing ? "Simpan Perubahan" : "Simpan Agenda"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
