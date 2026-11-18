import { useEffect, useState } from "react";
import { X, Lock, ShieldAlert, FileText, ExternalLink, RefreshCw, Eye } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { resolveAssetUrl } from "@/utils/api";

export default function SecureDocViewer({ fileUrl, title, fileType = "pdf", onClose }) {
  const { user } = useAuth();
  const [useGoogleFallback, setUseGoogleFallback] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const watermarkText = `ADLS CONFIDENTIAL · ${user?.name || "User"} (${user?.role || "Tutor"}) · ${today}`;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cegah Ctrl+S, Ctrl+P, Ctrl+U, Cmd+S, Cmd+P, F12
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "s" || e.key === "S" || e.key === "p" || e.key === "P" || e.key === "u" || e.key === "U")
      ) {
        e.preventDefault();
      }
      if (e.key === "Escape" && onClose) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Siapkan URL viewer absolut yang mengarah ke host backend
  const resolvedUrl = resolveAssetUrl(fileUrl);
  const isPdf = /pdf/i.test(fileType) || /\.pdf$/i.test(fileUrl || "");

  // URL Dokumen untuk iframe:
  // 1. Standar: URL absolut PDF dengan parameter anti-toolbar bawaan browser
  // 2. Google Docs Viewer: Digunakan jika browser/device tidak mendukung embed PDF langsung
  const nativeSrc = isPdf ? `${resolvedUrl}#toolbar=0&navpanes=0&scrollbar=1` : resolvedUrl;
  const googleViewerSrc = `https://docs.google.com/viewer?url=${encodeURIComponent(resolvedUrl)}&embedded=true`;
  const currentViewerSrc = useGoogleFallback ? googleViewerSrc : nativeSrc;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-2 sm:p-4 backdrop-blur-sm select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      <style>{`
        @media print {
          body * {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative flex h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
          <div className="flex items-center gap-2.5 truncate">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/20 text-sky-300">
              <FileText size={18} />
            </span>
            <div className="truncate">
              <div className="truncate text-sm font-bold text-white">{title || "Materi Pembelajaran ADLS"}</div>
              <div className="flex items-center gap-2 text-xs text-sky-300">
                <Lock size={11} />
                <span>Protected Viewer · Download & Print Disabled</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPdf && (
              <button
                type="button"
                onClick={() => setUseGoogleFallback(!useGoogleFallback)}
                className="hidden items-center gap-1.5 rounded-lg border border-sky-400/40 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-sky-200 hover:bg-white/20 sm:inline-flex"
                title="Ganti mode viewer jika PDF tidak tampil di browser Anda"
              >
                <RefreshCw size={11} />
                <span>{useGoogleFallback ? "Viewer Bawaan" : "Mode Google Docs"}</span>
              </button>
            )}

            <span className="hidden items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 md:inline-flex">
              <ShieldAlert size={12} /> Confidential View Only
            </span>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Tutup (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewer Area with Watermark Overlay */}
        <div className="relative flex-1 overflow-hidden bg-slate-100">
          {/* Watermark Pattern */}
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-wrap items-center justify-around gap-16 overflow-hidden p-8 opacity-[0.14]">
            {Array.from({ length: 18 }).map((_, i) => (
              <div
                key={i}
                className="rotate-[-28deg] whitespace-nowrap text-sm font-black tracking-widest text-slate-900"
              >
                {watermarkText}
              </div>
            ))}
          </div>

          {/* Document Content - tanpa restrictive sandbox agar plugin PDF browser aktif */}
          <iframe
            src={currentViewerSrc}
            title={title}
            className="relative z-10 h-full w-full border-0 bg-white"
          />
        </div>

        {/* Footer Notice */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <span>PT. ADLS Solusi Indonesia · Sistem Materi Pembelajaran Resmi</span>
          <div className="flex items-center gap-3">
            {resolvedUrl && (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-brand hover:underline"
                title="Buka dokumen di tab baru jika browser memblokir iframe"
              >
                <ExternalLink size={12} /> Buka Tab Baru
              </a>
            )}
            <span className="font-semibold text-brand-dark">Akses: {user?.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

