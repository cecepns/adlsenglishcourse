import { useState } from "react";
import { Loader2 } from "lucide-react";
import AsyncResourceSelect from "./AsyncResourceSelect";
import ImageUploadField from "./ImageUploadField";
import MediaUploadField from "./MediaUploadField";

export default function ResourceForm({ fields, initial, onSubmit, onCancel, loading }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    fields.forEach((f) => {
      const val = values[f.key];
      const empty = val === undefined || val === null || String(val).trim() === "";
      if (f.required && empty) errs[f.key] = `${f.label} wajib diisi`;
    });
    setErrors(errs);
    if (!Object.keys(errs).length) {
      const payload = {};
      fields.forEach((f) => {
        if (f.type === "password" && !String(values[f.key] || "").trim()) return;
        if (values[f.key] !== undefined) payload[f.key] = values[f.key];
      });
      onSubmit(payload);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      {fields.map((f) => {
        const normalizedOpts =
          f.type === "select"
            ? (f.options || []).map((o) => (typeof o === "object" ? o : { value: String(o), label: String(o) }))
            : [];
        const rawSelectVal = values[f.key] !== undefined && values[f.key] !== null ? String(values[f.key]) : "";
        const hasMissingOption =
          f.type === "select" && rawSelectVal !== "" && !normalizedOpts.some((o) => o.value === rawSelectVal);

        return (
          <div key={f.key}>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              {f.label}
              {f.required && <span className="ml-0.5 text-red-500">*</span>}
            </label>
            {f.type === "async-select" ? (
              <AsyncResourceSelect
                endpoint={f.endpoint}
                value={values[f.key]}
                initialLabel={f.labelKey ? values[f.labelKey] : undefined}
                extraParams={typeof f.extraParams === "function" ? f.extraParams(values) : f.extraParams}
                placeholder={f.placeholder || `Pilih ${f.label}...`}
                isClearable={!f.required}
                formatOption={f.formatOption}
                onChange={(opt) => {
                  setValues((prev) => {
                    const next = {
                      ...prev,
                      [f.key]: opt ? opt.value : null,
                      ...(f.labelKey ? { [f.labelKey]: opt ? opt.label : "" } : {}),
                    };
                    return f.onSelect ? { ...next, ...f.onSelect(opt, next) } : next;
                  });
                }}
              />
            ) : f.type === "image" || f.type === "pdf-or-image" ? (
              <ImageUploadField
                allowPdf={f.type === "pdf-or-image"}
                value={values[f.key] ?? ""}
                onChange={(url) => setValues((prev) => ({ ...prev, [f.key]: url }))}
              />
            ) : f.type === "audio" || f.type === "video" ? (
              <MediaUploadField
                mode={f.type}
                value={values[f.key] ?? ""}
                onChange={(url) => setValues((prev) => ({ ...prev, [f.key]: url }))}
              />
            ) : f.type === "select" ? (
              <select
                className="input"
                value={rawSelectVal}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              >
                <option value="">-- pilih --</option>
                {hasMissingOption && <option value={rawSelectVal}>{rawSelectVal}</option>}
                {normalizedOpts.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                rows={3}
                className="input"
                value={values[f.key] ?? ""}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            ) : (
              <input
                type={f.type || "text"}
                className="input"
                autoComplete={f.type === "password" ? "new-password" : undefined}
                value={f.type === "date" ? String(values[f.key] ?? "").slice(0, 10) : (values[f.key] ?? "")}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
            {errors[f.key] && <p className="mt-1 text-xs font-medium text-red-600">{errors[f.key]}</p>}
          </div>
        );
      })}
      <div className="flex justify-end gap-2 pt-3">
        <button type="button" className="btn-ghost" onClick={onCancel}>Batal</button>
        <button className="btn-primary" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Simpan
        </button>
      </div>
    </form>
  );
}
