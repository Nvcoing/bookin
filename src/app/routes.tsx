import { Navigate, Outlet, createBrowserRouter } from "react-router";
import Layout from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { LoginPage, RegisterPage } from "../pages/AuthPages";
import ProfilePage from "../pages/ProfilePage";
import RoomsPage from "../pages/RoomsPage";
import BookingPage from "../pages/BookingPage";
import ApprovalPage from "../pages/ApprovalPage";
import ReportPage from "../pages/ReportPage";
import type { Role } from "../types";

function Guard({ roles }: { roles?: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/dang-nhap" replace />;
  if (roles && !roles.includes(user.role)) return <div className="forbidden"><span>403</span><h1>Không đủ quyền truy cập</h1><p>Tài khoản của bạn không được phép truy cập chức năng này.</p><a href="/phong" className="button primary">Về danh mục phòng</a></div>;
  return <Outlet />;
}

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? user.role === "admin" ? "/bao-cao" : "/phong" : "/dang-nhap"} replace />;
}

export const router = createBrowserRouter([
  { path: "/", Component: Home },
  { path: "/dang-nhap", Component: LoginPage },
  { path: "/dang-ky", Component: RegisterPage },
  {
    Component: Guard,
    children: [{
      Component: Layout,
      children: [
        { path: "/ho-so", Component: ProfilePage },
        { path: "/phong", Component: RoomsPage },
        { Component: () => <Guard roles={["student", "lecturer"]} />, children: [{ path: "/dat-phong", Component: BookingPage }, { path: "/don-dat-phong", Component: ApprovalPage }] },
        { Component: () => <Guard roles={["admin"]} />, children: [{ path: "/phe-duyet", Component: () => <ApprovalPage admin /> }, { path: "/bao-cao", Component: ReportPage }] },
      ],
    }],
  },
  { path: "*", Component: Home },
]);
