import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { BookInLogo } from "./Logo";

const common = [
  { to: "/phong", label: "Danh mục phòng", short: "Phòng" },
  { to: "/dat-phong", label: "Đặt phòng", short: "Đặt phòng" },
  { to: "/don-dat-phong", label: "Lịch sử đặt phòng", short: "Đơn của tôi" },
  { to: "/ho-so", label: "Hồ sơ cá nhân", short: "Hồ sơ" },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const nav =
    user.role === "admin"
      ? [
        { to: "/phong", label: "Quản lý phòng", short: "Phòng" },
        { to: "/phe-duyet", label: "Phê duyệt yêu cầu", short: "Phê duyệt" },
        { to: "/bao-cao", label: "Báo cáo sử dụng", short: "Báo cáo" },
        { to: "/ho-so", label: "Hồ sơ cá nhân", short: "Hồ sơ" },
      ]
      : common;

  const roleName = { student: "Sinh viên", lecturer: "Giảng viên", admin: "Quản trị viên" }[user.role];
  const logout = () => {
    signOut();
    navigate("/dang-nhap");
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <BookInLogo variant="light" size={36} />
        <div className="user-area">
          <div>
            <strong>{user.name}</strong>
            <small>{roleName}</small>
          </div>
          <button className="header-button" onClick={logout}>
            Đăng xuất
          </button>
        </div>
      </header>
      <aside className="sidebar">
        <p className="nav-title">HỆ THỐNG QUẢN LÝ</p>
        <nav>
          {nav.map((item, index) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
              <span className="nav-number">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <strong>Hỗ trợ kỹ thuật</strong>
          <p>Phòng Quản trị thiết bị · VNU-IS</p>
          <span>Hotline: (024) 3754 7506</span>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {nav.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
            {item.short}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
