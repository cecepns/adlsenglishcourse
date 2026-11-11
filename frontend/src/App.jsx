import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { RESOURCES } from "@/config/resources";
import Layout from "@/components/Layout";
import ResourcePage from "@/components/ResourcePage";
import Achievements from "@/pages/Achievements";
import AudioListening from "@/pages/AudioListening";
import BillsPage from "@/pages/BillsPage";
import CatalogShop from "@/pages/CatalogShop";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Meetings from "@/pages/Meetings";
import Payroll from "@/pages/Payroll";
import PortalDashboard from "@/pages/PortalDashboard";
import Referrals from "@/pages/Referrals";
import TutorDashboard from "@/pages/TutorDashboard";
import VideoProjects from "@/pages/VideoProjects";

const STAFF = ["owner", "admin_pusat", "admin_cabang"];

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user } = useAuth();
  const isStaff = STAFF.includes(user?.role);
  const isPayrollAllowed = [...STAFF, "tutor"].includes(user?.role);
  const isReferralAllowed = [...STAFF, "siswa", "ortu"].includes(user?.role);

  const home = isStaff ? (
    <Dashboard />
  ) : user?.role === "tutor" ? (
    <TutorDashboard />
  ) : (
    <PortalDashboard />
  );

  const genericResources = Object.entries(RESOURCES).filter(([key]) => !["bills", "products"].includes(key));

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={home} />
        <Route path="portal" element={<PortalDashboard />} />
        <Route path="tutor-portal" element={user?.role === "tutor" ? <TutorDashboard /> : <Navigate to="/" replace />} />
        <Route path="meetings" element={user?.role === "ortu" ? <Navigate to="/" replace /> : <Meetings />} />
        <Route path="audio" element={<AudioListening />} />
        <Route path="videos" element={<VideoProjects />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="products" element={<CatalogShop />} />
        <Route path="shop" element={<CatalogShop />} />
        <Route path="payroll" element={isPayrollAllowed ? <Payroll /> : <Navigate to="/" replace />} />
        <Route path="referrals" element={isReferralAllowed ? <Referrals /> : <Navigate to="/" replace />} />
        {genericResources.map(([key, cfg]) => (
          <Route
            key={key}
            path={key}
            element={cfg.r.includes(user?.role) ? <ResourcePage key={key} resource={cfg} /> : <Navigate to="/" replace />}
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}