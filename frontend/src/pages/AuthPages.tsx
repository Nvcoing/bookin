import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api, ApiError } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { Field } from "../components/ui";
import { BookInLogo } from "../components/Logo";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail.includes("@") || password.length < 6) {
      setError("Vui lòng nhập email trường và mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.login(trimmedEmail, password);
      signIn(result.token, result.user);
      navigate(result.user.role === "admin" ? "/bao-cao" : "/phong");
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Đăng nhập không thành công. Vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-intro">
        <BookInLogo variant="light" size={44} />
        <div>
          <span className="eyebrow">ĐẠI HỌC QUỐC GIA HÀ NỘI · TRƯỜNG QUỐC TẾ (VNU-IS)</span>
          <h1>Quản lý không gian học tập & nghiên cứu hiện đại.</h1>
          <p>
            Hệ thống hỗ trợ tra cứu tình trạng phòng học, đặt phòng thông minh với thuật toán gợi ý tối ưu và theo dõi lịch sử phê duyệt minh bạch.
          </p>
        </div>
        <small>© 2026 Trường Quốc tế - ĐHQGHN · Phòng Quản trị thiết bị</small>
      </section>

      <main className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <div>
            <span className="category-tag">Cổng thông tin</span>
            <h2>Đăng nhập</h2>
            <p>Sử dụng tài khoản email được cấp để tiếp tục.</p>
          </div>
          {error && <div className="alert danger">{error}</div>}
          <Field label="Email trường (@vnu.edu.vn)" required>
            <input
              type="email"
              placeholder="ten@vnu.edu.vn"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Mật khẩu" required>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <button type="submit" className="button primary full" disabled={loading}>
            {loading ? "Đang xác thực..." : "Đăng nhập"}
          </button>
          <p className="auth-link">
            Chưa có tài khoản sinh viên? <Link to="/dang-ky">Đăng ký ngay</Link>
          </p>
        </form>
      </main>
    </div>
  );
}

export function RegisterPage() {
  const [form, setForm] = useState({ name: "", code: "", email: "", password: "", injury: false });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const trimmedEmail = form.email.trim().toLowerCase();
    if (!form.name.trim() || !form.code.trim() || !trimmedEmail || form.password.length < 6) {
      setError("Vui lòng nhập đầy đủ thông tin; mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    // BUG-001: Yêu cầu bắt buộc phải dùng email (@vnu.edu.vn)
    if (!trimmedEmail.endsWith("@vnu.edu.vn")) {
      setError("Tài khoản đăng ký bắt buộc phải sử dụng email VNU-IS có đuôi @vnu.edu.vn.");
      return;
    }

    setLoading(true);
    try {
      await api.register({
        name: form.name.trim(),
        code: form.code.trim(),
        email: trimmedEmail,
        password: form.password,
        special_needs: form.injury ? ["leg_injury"] : [],
      });
      setDone(true);
      setTimeout(() => navigate("/dang-nhap"), 1500);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Đăng ký không thành công.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page simple">
      <main className="register-wrap">
        <div style={{ marginBottom: 24, textAlign: "center", display: "flex", justifyContent: "center" }}>
          <BookInLogo variant="dark" size={42} />
        </div>
        <form className="auth-form wide" onSubmit={submit}>
          <div>
            <span className="category-tag">Đăng ký người dùng</span>
            <h2>Đăng ký tài khoản</h2>
            <p>Hệ thống tự động cấp quyền Sinh viên cho tài khoản đăng ký mới.</p>
          </div>
          {done && <div className="alert ok">Đăng ký thành công! Đang chuyển hướng sang trang đăng nhập...</div>}
          {error && <div className="alert danger">{error}</div>}
          <div className="form-grid">
            <Field label="Họ và tên" required>
              <input
                placeholder="Ví dụ: Nguyễn Văn An"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Mã sinh viên" required>
              <input
                placeholder="Ví dụ: 22010189"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </Field>
            <Field label="Email trường (@vnu.edu.vn)" required>
              <input
                type="email"
                placeholder="annv@vnu.edu.vn"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Mật khẩu" required>
              <input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
          </div>
          <label className="check-row boxed">
            <input
              type="checkbox"
              checked={form.injury}
              onChange={(e) => setForm({ ...form, injury: e.target.checked })}
            />
            <span>
              <strong>Tôi đang có chấn thương vận động / Cần ưu tiên phòng tầng thấp</strong>
              <small>Hệ thống sẽ tự động ưu tiên gợi ý và cho phép chọn các phòng tầng 1–2 có thang máy.</small>
            </span>
          </label>
          <div className="button-row">
            <Link className="button secondary" to="/dang-nhap">
              Quay lại đăng nhập
            </Link>
            <button type="submit" className="button primary" disabled={loading}>
              {loading ? "Đang xử lý..." : "Tạo tài khoản"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
