import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import { api } from "@/utils/api";

const defaultFormat = (row) => ({ value: row.id, label: row.name, raw: row });

export default function AsyncResourceSelect({
  endpoint,
  value,
  initialLabel,
  extraParams,
  placeholder = "Pilih atau ketik untuk mencari...",
  isClearable = false,
  formatOption = defaultFormat,
  onChange,
}) {
  const cacheRef = useRef(new Map());
  const timerRef = useRef(null);
  const formatRef = useRef(formatOption);
  formatRef.current = formatOption;

  const extraParamsKey = useMemo(() => JSON.stringify(extraParams || {}), [extraParams]);
  const [resolvedOpt, setResolvedOpt] = useState(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (value === undefined || value === null || value === "") {
      setResolvedOpt(null);
      return;
    }
    const key = String(value);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setResolvedOpt(cached);
      return;
    }
    if (initialLabel) {
      const opt = { value: Number(value) || value, label: initialLabel };
      setResolvedOpt(opt);
      return;
    }
    let active = true;
    api
      .get(endpoint, { params: { id: value, limit: 1 } })
      .then(({ data }) => {
        if (!active) return;
        const row = data.data?.[0];
        if (row) {
          const opt = formatRef.current(row);
          cacheRef.current.set(String(opt.value), opt);
          setResolvedOpt(opt);
        } else {
          setResolvedOpt({ value: Number(value) || value, label: `#${value}` });
        }
      })
      .catch(() => {
        if (active) setResolvedOpt({ value: Number(value) || value, label: `#${value}` });
      });
    return () => {
      active = false;
    };
  }, [endpoint, value, initialLabel]);

  const loadOptions = useCallback(
    (inputValue) =>
      new Promise((resolve) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
          try {
            const parsedExtra = JSON.parse(extraParamsKey);
            const { data } = await api.get(endpoint, {
              params: { search: inputValue?.trim() || undefined, limit: 25, ...parsedExtra },
            });
            const opts = (data.data || []).map((r) => formatRef.current(r));
            opts.forEach((o) => cacheRef.current.set(String(o.value), o));
            resolve(opts);
          } catch {
            resolve([]);
          }
        }, inputValue ? 250 : 0);
      }),
    [endpoint, extraParamsKey]
  );

  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 42,
        borderRadius: "0.75rem",
        borderColor: state.isFocused ? "#2a5885" : "#cbd5e1",
        boxShadow: state.isFocused ? "0 0 0 2px rgba(42, 88, 133, 0.2)" : "none",
        fontSize: "0.875rem",
        backgroundColor: "#ffffff",
        "&:hover": { borderColor: state.isFocused ? "#2a5885" : "#94a3b8" },
      }),
      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
      menu: (base) => ({
        ...base,
        borderRadius: "0.75rem",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.15)",
        border: "1px solid #e2e8f0",
      }),
      option: (base, state) => ({
        ...base,
        fontSize: "0.875rem",
        backgroundImage: state.isSelected ? "linear-gradient(90deg, #1e3a5f, #2a5885, #0369a1)" : "none",
        backgroundColor: state.isSelected ? "#2a5885" : state.isFocused ? "#eff6ff" : "#ffffff",
        color: state.isSelected ? "#ffffff" : "#1e293b",
        cursor: "pointer",
      }),
      placeholder: (base) => ({ ...base, color: "#94a3b8" }),
    }),
    []
  );

  return (
    <AsyncSelect
      key={`${endpoint}-${extraParamsKey}`}
      cacheOptions
      defaultOptions
      isClearable={isClearable}
      value={resolvedOpt}
      loadOptions={loadOptions}
      onChange={(opt) => {
        if (opt) cacheRef.current.set(String(opt.value), opt);
        setResolvedOpt(opt || null);
        onChange?.(opt || null);
      }}
      placeholder={placeholder}
      loadingMessage={() => "Mencari data..."}
      noOptionsMessage={() => "Data tidak ditemukan"}
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      menuPosition="fixed"
      styles={selectStyles}
    />
  );
}

