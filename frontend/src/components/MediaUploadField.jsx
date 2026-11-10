import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FileAudio, FileVideo, Loader2, Trash2, Upload } from "lucide-react";
import { api, resolveAssetUrl } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getErrorMessage } from "@/utils/request";

const ACCEPT_MAP = {
  audio: "audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.ogg,.m4a,.aac",
  video: "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov",
  image: "image/png,image/jpeg,image/webp",
};

const LABEL_MAP = {
  audio: { btn: "Upload Audio (.mp3/.wav/.m4a)", placeholder: "Atau tempel URL audio / link QRIS modul (maks 25MB)" },
  video: { btn: "Upload Video (.mp4/.webm/.mov)", placeholder: "Atau tempel URL video (Google Drive / YouTube / link video)" },
  image: { btn: "Upload File (gambar/pdf)", placeholder: "Atau tempel URL gambar / bukti" },
};

export default function MediaUploadField({ mode = "audio", value, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const cfg = LABEL_MAP[mode] || LABEL_MAP.audio;
  const resolved = resolveAssetUrl(value);
  const isDirectVideo = resolved && /\.(mp4|webm|mov)(\?|$)/i.test(resolved);

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
      toast.success("File berhasil diunggah");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_MAP[mode] || "*"}
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
          {uploading ? "Mengunggah..." : cfg.btn}
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
        placeholder={cfg.placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />

      {resolved && mode === "audio" && (
        <div className="flex items-center gap-2 rounded-lg bg-white p-2 border border-slate-200">
          <FileAudio size={18} className="shrink-0 text-brand" />
          <audio controls src={resolved} className="h-9 w-full" />
        </div>
      )}

      {resolved && mode === "video" && (
        isDirectVideo ? (
          <video controls src={resolved} className="max-h-48 w-full rounded-lg border border-slate-200 bg-black" />
        ) : (
          <a
            href={resolved}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
          >
            <FileVideo size={14} /> Buka Tautan Video
          </a>
        )
      )}
    </div>
  );
}

