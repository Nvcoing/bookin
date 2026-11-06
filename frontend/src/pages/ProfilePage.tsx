import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { Field, PageHeader, useToast } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [injury, setInjury] = useState(user?.special_needs?.includes("leg_injury") || false);
  const [saving, setSaving] = useState(false);
  const { showToast, toastNode } = useToast();

  if (!user) return null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        special_needs: injury ? ["leg_injury"] : [],
      });
      updateUser(updated);
      showToast("Đã cập nhật hồ sơ thành công.");
    } catch (err: any) {
      showToast(err instanceof ApiError ? err.message : "Cập nhật không thành công.", "danger");
    } finally {
      setSaving(false);
    }
  };

  const rights = {
    student: ["Xem danh mục và tình trạng phòng", "Gửi, theo dõi và hủy đơn của bản thân", "Nhận gợi ý phòng theo nhu cầu"],
    lecturer: ["Toàn bộ quyền của sinh viên", "Đơn giảng dạy được xếp mức ưu tiên", "Đặt phòng phục vụ hoạt động chuyên môn"],
    admin: ["Quản lý danh mục và trạng thái phòng", "Duyệt hoặc từ chối yêu cầu", "Xem báo cáo sử dụng toàn trường"],
  }[user.role];

  return (
    <>
      <PageHeader module="Module 1" title="Hồ sơ cá nhân" description="Quản lý thông tin định danh và nhu cầu hỗ trợ." />
      <div className="two-col">
        <form className="panel" onSubmit={save}>
          <div className="panel-heading">
            <div>
              <h2>Thông tin tài khoản</h2>
              <p>Cập nhật thông tin hiển thị trên hệ thống.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Họ và tên">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Mã định danh">
              <input value={user.code} disabled />
            </Field>
            <Field label="Email trường">
              <input value={user.email} disabled />
            </Field>
            <Field label="Vai trò">
              <input value={{ student: "Sinh viên", lecturer: "Giảng viên", admin: "Quản trị viên" }[user.role]} disabled />
            </Field>
          </div>
          <label className="check-row boxed">
            <input type="checkbox" checked={injury} onChange={(e) => setInjury(e.target.checked)} />
            <span>
              <strong>Cần ưu tiên phòng tầng thấp</strong>
              <small>Áp dụng quy tắc an toàn cho người đang chấn thương chân (tầng 1–2 có thang máy).</small>
            </span>
          </label>
          <div className="button-row end">
            <button className="button primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
        <section className="panel rights">
          <div className="panel-heading">
            <div>
              <h2>Quyền hạn hiện tại</h2>
              <p>Phạm vi thao tác theo vai trò.</p>
            </div>
            <span className="role-badge">{user.role}</span>
          </div>
          <ul>
            {rights.map((right) => (
              <li key={right}>{right}</li>
            ))}
          </ul>
          <div className="info-box">
            <strong>Lưu ý phân quyền</strong>
            <p>Các chức năng ngoài phạm vi sẽ bị chặn. Khi API trả về 403, hệ thống hiển thị thông báo không đủ quyền.</p>
          </div>
        </section>
      </div>
      {toastNode}
    </>
  );
}
