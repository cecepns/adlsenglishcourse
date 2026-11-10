import { createContext, useContext, useState } from "react";
import toast from "react-hot-toast";
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { getLogoutGreeting, getOpeningGreeting } from "@/utils/greetings";
import { request } from "@/utils/request";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));

  const applySession = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);
    toast.success(getOpeningGreeting(data.user), { duration: 4500 });
  };

  const login = async (form) => {
    const { data } = await request(() => api.post(API_ENDPOINTS.AUTH.LOGIN, form));
    applySession(data);
  };

  const register = async (form) => {
    const { data } = await request(() => api.post(API_ENDPOINTS.AUTH.REGISTER, form));
    applySession(data);
  };

  const logout = () => {
    const current = user;
    localStorage.clear();
    setUser(null);
    if (current) toast.success(getLogoutGreeting(current), { duration: 4000 });
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}
