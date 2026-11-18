import DatePicker, { registerLocale } from "react-datepicker";
import { id as localeId } from "date-fns/locale/id";
import { Calendar } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("id", localeId);

function parseDateValue(val, mode) {
  if (!val) return null;
  const s = String(val).trim();
  if (mode === "month") {
    const m = s.match(/^(\d{4})-(\d{1,2})/);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateValue(date, mode) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  if (mode === "month") return `${y}-${m}`;
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DatePickerInput({
  value,
  onChange,
  mode = "date",
  placeholder,
  className = "",
  wrapperClassName = "",
  compact = false,
  isClearable = false,
  required = false,
  disabled = false,
  showIcon = true,
  title,
  ariaLabel,
  minDate,
  maxDate,
}) {
  const selected = parseDateValue(value, mode);
  const isMonth = mode === "month";
  const resolvedPlaceholder = placeholder || (isMonth ? "Pilih Bulan" : "dd/mm/yyyy");

  const baseInputClass = compact
    ? `bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer ${showIcon ? "pl-5" : "pl-1"} pr-1 py-0.5 ${isMonth ? "w-[110px]" : "w-[96px]"}`
    : `input cursor-pointer ${showIcon ? "!pl-9" : ""} ${isClearable ? "!pr-8" : ""}`;

  return (
    <div className={`adls-datepicker relative inline-flex items-center ${compact ? "" : "w-full"} ${wrapperClassName}`} title={title}>
      {showIcon && (
        <Calendar
          size={compact ? 12 : 15}
          className={`pointer-events-none absolute z-10 text-slate-400 ${compact ? "left-1" : "left-3"}`}
        />
      )}
      <DatePicker
        selected={selected}
        onChange={(date) => onChange?.(formatDateValue(date, mode))}
        locale="id"
        dateFormat={isMonth ? "MMMM yyyy" : "dd/MM/yyyy"}
        showMonthYearPicker={isMonth}
        showMonthDropdown={!isMonth}
        showYearDropdown={!isMonth}
        dropdownMode="select"
        placeholderText={resolvedPlaceholder}
        className={`${baseInputClass} ${className}`}
        wrapperClassName={compact ? "inline-block" : "w-full"}
        popperClassName="adls-datepicker-popper"
        portalId="adls-datepicker-portal"
        isClearable={isClearable && !compact}
        required={required}
        disabled={disabled}
        ariaLabelledBy={ariaLabel}
        minDate={minDate}
        maxDate={maxDate}
        autoComplete="off"
      />
    </div>
  );
}
