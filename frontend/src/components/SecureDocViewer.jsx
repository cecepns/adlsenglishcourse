import { useEffect } from "react";
import { X, Lock, ShieldAlert, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function SecureDocViewer({ fileUrl, title, fileType = "pdf", onClose }) {
  const { user } = useAuth();
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

  // Siapkan URL viewer
  const isPdf = /pdf/i.test(fileType) || /\.pdf$/i.test(fileUrl || "");
  const viewerSrc = isPdf ? `${fileUrl}#toolbar=0&navpanes=0&scrollbar=1` : fileUrl;

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
            <span className="hidden items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-[11px] font-semibold text-amber-200 sm:inline-flex">
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

          {/* Document Content */}
          <iframe
            src={viewerSrc}
            title={title}
            className="relative z-10 h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Footer Notice */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <span>PT. ADLS Solusi Indonesia · Sistem Materi Pembelajaran Resmi</span>
          <span className="font-semibold text-brand-dark">Akses: {user?.name}</span>
        </div>
      </div>
    </div>
  );
}

