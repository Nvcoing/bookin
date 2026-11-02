import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api, ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Field } from "../components/ui";

export function LoginPage() {
  const [email, setEmail] = useState("admin@bookin.edu.vn");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    if (!email.includes("@") || password.length < 6) { setError("Email hoặc mật khẩu chưa hợp lệ."); return; }
    setLoading(true);
    try { const result = await api.login(email, password); signIn(result.token, result.user); navigate(result.user.role === "admin" ? "/bao-cao" : "/phong"); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Đăng nhập không thành công."); }
    finally { setLoading(false); }
  };
  return <div className="auth-page"><section className="auth-intro"><div className="brand large"><span className="brand-mark">BI</span><div><strong>BookIn</strong><small>Hệ thống đặt phòng</small></div></div><div><span className="eyebrow">TRƯỜNG ĐẠI HỌC</span><h1>Quản lý không gian học tập hiệu quả.</h1><p>Đặt phòng học, phòng họp và theo dõi yêu cầu trong một hệ thống thống nhất.</p></div><small>Phòng Quản trị thiết bị · Phiên bản 1.0</small></section>
    <main className="auth-panel"><form className="auth-form" onSubmit={submit}><div><span className="module-label">Module 1</span><h2>Đăng nhập</h2><p>Sử dụng tài khoản trường để tiếp tục.</p></div>{error && <div className="alert danger">{error}</div>}<Field label="Email trường" required><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field><Field label="Mật khẩu" required><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field><button className="button primary full" disabled={loading}>{loading ? "Đang xác thực..." : "Đăng nhập"}</button><div className="demo-box"><strong>Tài khoản dùng thử</strong><button type="button" onClick={() => setEmail("admin@bookin.edu.vn")}>Quản trị viên</button><button type="button" onClick={() => setEmail("giangvien@bookin.edu.vn")}>Giảng viên</button><button type="button" onClick={() => setEmail("sinhvien@bookin.edu.vn")}>Sinh viên</button></div><p className="auth-link">Chưa có tài khoản? <Link to="/dang-ky">Đăng ký</Link></p></form></main></div>;
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", code: "", email: "", password: "", injury: false });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name || !form.code || !form.email.includes("@") || form.password.length < 6) { setError("Vui lòng nhập đủ thông tin; mật khẩu tối thiểu 6 ký tự."); return; }
    await api.register({ name: form.name, code: form.code, email: form.email, password: form.password, special_needs: form.injury ? ["leg_injury"] : [] });
    setDone(true); setTimeout(() => navigate("/dang-nhap"), 1000);
  };
  return <div className="auth-page simple"><main className="register-wrap"><form className="auth-form wide" onSubmit={submit}><div><span className="module-label">Module 1</span><h2>Đăng ký tài khoản</h2><p>Tài khoản mới được cấp vai trò Sinh viên.</p></div>{done && <div className="alert ok">Đăng ký thành công. Đang chuyển tới trang đăng nhập.</div>}{error && <div className="alert danger">{error}</div>}<div className="form-grid"><Field label="Họ và tên" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field><Field label="Mã sinh viên" required><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field><Field label="Email trường" required><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Mật khẩu" required><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field></div><label className="check-row"><input type="checkbox" checked={form.injury} onChange={(e) => setForm({ ...form, injury: e.target.checked })} /><span><strong>Tôi đang chấn thương chân / cần ưu tiên tầng thấp</strong><small>Hệ thống sẽ ưu tiên phòng tầng 1–2 có thang máy.</small></span></label><div className="button-row"><Link className="button secondary" to="/dang-nhap">Quay lại</Link><button className="button primary">Tạo tài khoản</button></div></form></main></div>;
}
