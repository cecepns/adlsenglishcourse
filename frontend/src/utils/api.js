import axios from "axios";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "https://api.kingcreativestudio.my.id/adls/api" });

export function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(url)) return url;
  const base = (import.meta.env.VITE_API_URL || "https://api.kingcreativestudio.my.id/adls/api").replace(/\/api\/?$/, "");
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !e.config.url.includes("/auth/login")) {
    localStorage.clear();
    window.location.href = "/login";
  }
  return Promise.reject(e);
});
