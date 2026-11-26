import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { RESOURCES } from "@/config/resources";
import Layout from "@/components/Layout";
import ResourcePage from "@/components/ResourcePage";
import Achievements from "@/pages/Achievements";
import AcademicCalendarPage from "@/pages/AcademicCalendarPage";
import AudioListening from "@/pages/AudioListening";
import BillsPage from "@/pages/BillsPage";
import CatalogShop from "@/pages/CatalogShop";
import Dashboard from "@/pages/Dashboard";
import LessonMaterials from "@/pages/LessonMaterials";
import EmployeeAttendancePage from "@/pages/EmployeeAttendancePage";
import Login from "@/pages/Login";
import Meetings from "@/pages/Meetings";
import MonthlyEvaluations from "@/pages/MonthlyEvaluations";
import Payroll from "@/pages/Payroll";
import PlacementTestAdmin from "@/pages/PlacementTestAdmin";
import PlacementTestTake from "@/pages/PlacementTestTake";
import PortalDashboard from "@/pages/PortalDashboard";
import Referrals from "@/pages/Referrals";
import SpeakingProgressPage from "@/pages/SpeakingProgressPage";
import StudentsDatabase from "@/pages/StudentsDatabase";
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
  const isPayrollAllowed = ["owner", "admin_pusat"].includes(user?.role);
  const isReferralAllowed = [...STAFF, "siswa", "ortu"].includes(user?.role);

  const home = isStaff ? (
    <Dashboard />
  ) : user?.role === "tutor" ? (
    <TutorDashboard />
  ) : (
    <PortalDashboard />
  );

  const genericResources = Object.entries(RESOURCES).filter(([key]) => !["bills", "products", "lesson_materials"].includes(key));

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/placement-test" element={<PlacementTestTake />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={home} />
        <Route path="portal" element={<PortalDashboard />} />
        <Route path="academic-calendar" element={<AcademicCalendarPage />} />
        <Route path="employee-attendance" element={[...STAFF, "tutor"].includes(user?.role) ? <EmployeeAttendancePage /> : <Navigate to="/" replace />} />
        <Route path="placement-test-admin" element={[...STAFF, "tutor"].includes(user?.role) ? <PlacementTestAdmin /> : <Navigate to="/" replace />} />
        <Route path="speaking-progress" element={[...STAFF, "tutor"].includes(user?.role) ? <SpeakingProgressPage /> : <Navigate to="/" replace />} />
        <Route path="tutor-portal" element={user?.role === "tutor" ? <TutorDashboard /> : <Navigate to="/" replace />} />
        <Route path="meetings" element={user?.role === "ortu" ? <Navigate to="/" replace /> : <Meetings />} />
        <Route path="audio" element={<AudioListening />} />
        <Route path="lesson_materials" element={<LessonMaterials />} />
        <Route path="students-database" element={isStaff ? <StudentsDatabase /> : <Navigate to="/" replace />} />
        <Route path="videos" element={<VideoProjects />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="bills" element={user?.role === "tutor" ? <Navigate to="/" replace /> : <BillsPage />} />
        <Route path="products" element={<CatalogShop />} />
        <Route path="shop" element={<CatalogShop />} />
        <Route path="monthly-evaluations" element={<MonthlyEvaluations />} />
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