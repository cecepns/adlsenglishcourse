import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { resolveAssetUrl } from "@/utils/api";

export default function ProductImage({ src, alt = "Produk", size = "sm", className = "" }) {
  const [broken, setBroken] = useState(false);
  const resolved = resolveAssetUrl(src);

  useEffect(() => {
    setBroken(false);
  }, [resolved]);

  const boxClass = size === "card" ? "h-44 w-full rounded-xl" : size === "lg" ? "h-20 w-20 rounded-xl" : "h-12 w-12 rounded-lg";
  const iconSize = size === "card" ? 38 : size === "lg" ? 28 : 20;

  if (!resolved || broken) {
    return (
      <div
        title={broken ? "Gambar gagal dimuat" : "Belum ada gambar"}
        className={`flex shrink-0 flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-100 text-slate-400 ${boxClass} ${className}`}
      >
        <ImageOff size={iconSize} strokeWidth={1.75} />
        {(size === "lg" || size === "card") && (
          <span className="mt-1.5 text-xs font-medium">{broken ? "Gambar tidak tersedia" : "Belum ada gambar"}</span>
        )}
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      onError={() => setBroken(true)}
      className={`shrink-0 border border-slate-200 bg-white object-cover ${boxClass} ${className}`}
    />
  );
}

