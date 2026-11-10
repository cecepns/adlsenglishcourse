import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getErrorMessage } from "@/utils/request";
import ProductImage from "./ProductImage";

export default function ImageUploadField({ value, onChange, allowPdf = false, buttonLabel }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const resolved = resolveAssetUrl(value);
  const isPdf = resolved && /\.pdf(\?|$)/i.test(resolved);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const { data } = await api.post(API_ENDPOINTS.UPLOAD, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.data.url);
      toast.success(allowPdf ? "File berhasil diunggah" : "Gambar berhasil diunggah");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      {isPdf ? (
        <a
          href={resolved}
          target="_blank"
          rel="noreferrer"
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
        >
          <FileText size={26} />
          <span className="mt-1 text-[10px] font-bold">Lihat PDF</span>
        </a>
      ) : (
        <ProductImage src={value} alt="Preview" size="lg" />
      )}
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={allowPdf ? "image/png,image/jpeg,image/webp,application/pdf" : "image/png,image/jpeg,image/webp"}
            className="hidden"
            onChange={handleFile}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="btn-ghost !px-3 !py-1.5 text-xs"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? "Mengunggah..." : (buttonLabel || (allowPdf ? "Upload Bukti (Gambar/PDF)" : "Upload Gambar"))}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              <Trash2 size={13} /> Hapus
            </button>
          )}
        </div>
        <input
          type="text"
          className="input !py-1.5 text-xs"
          placeholder={allowPdf ? "Atau tempel URL bukti (gambar/pdf)" : "Atau tempel URL gambar (png/jpg/webp)"}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

