import { useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import { Field, PageHeader, useToast } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [faculty, setFaculty] = useState(user?.faculty || "CNTT");
  const [injury, setInjury] = useState(user?.special_needs?.includes("leg_injury") || false);
  const [wheelchair, setWheelchair] = useState(user?.special_needs?.includes("wheelchair") || false);
  const [saving, setSaving] = useState(false);
  const { showToast, toastNode } = useToast();

  if (!user) return null;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const needs: string[] = [];
      if (user.role !== "admin") {
        if (injury) needs.push("leg_injury");
        if (wheelchair) needs.push("wheelchair");
      }
      const updated = await api.updateProfile({
        name: name.trim(),
        faculty: faculty.trim(),
        special_needs: needs,
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
    student: [
      "Tra cứu danh mục và tình trạng phòng thời gian thực",
      "Gửi yêu cầu đặt phòng học/họp theo nhu cầu cá nhân",
      "Theo dõi tiến trình duyệt và hủy đơn trước giờ bắt đầu",
      "Nhận gợi ý phòng thông minh dựa trên điều kiện thể trạng",
    ],
    lecturer: [
      "Toàn bộ quyền hạn của Sinh viên",
      "Đơn đặt phòng giảng dạy/hội thảo được xếp ưu tiên cao nhất",
      "Được quyền đặt các phòng chuyên dụng và phòng hội nghị",
    ],
    admin: [
      "Quản lý toàn bộ danh mục, trang thiết bị và trạng thái phòng",
      "Phê duyệt hoặc từ chối các đơn đặt phòng trong toàn trường",
      "Khai thác báo cáo tỷ lệ lấp đầy, giờ cao điểm và thống kê",
      "Chuyển trạng thái bảo trì phòng (tự động thông báo đơn hủy)",
    ],
  }[user.role];

  return (
    <>
      <PageHeader
        tag="Hồ sơ tài khoản"
        title="Thông tin người dùng"
        description="Quản lý thông tin định danh và quyền hạn sử dụng trong hệ thống."
      />
      <div className="two-col">
        <form className="panel" onSubmit={save}>
          <div className="panel-heading">
            <div>
              <h2>Thông tin cá nhân</h2>
              <p>Dữ liệu đồng bộ với cơ sở dữ liệu VNU-IS.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Họ và tên">
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Mã định danh">
              <input value={user.code} disabled />
            </Field>
            <Field label="Khoa / Đơn vị">
              <input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Ví dụ: CNTT, Kinh tế..." />
            </Field>
            <Field label="Email trường (@vnu.edu.vn)">
              <input value={user.email} disabled />
            </Field>
            <Field label="Vai trò">
              <input
                value={{ student: "Sinh viên", lecturer: "Giảng viên", admin: "Quản trị viên" }[user.role]}
                disabled
              />
            </Field>
          </div>

          {/* BUG-003: Hỗ trợ đầy đủ cả nhu cầu chấn thương chân và xe lăn */}
          {user.role !== "admin" && (
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <label className="check-row boxed">
                <input
                  type="checkbox"
                  checked={injury}
                  onChange={(e) => setInjury(e.target.checked)}
                />
                <span>
                  <strong>Cần ưu tiên phòng tầng thấp (Chấn thương chân)</strong>
                  <small>
                    Áp dụng thuật toán an toàn: ưu tiên gợi ý các phòng tầng 1–2 có thang máy cho người có chấn thương vận động.
                  </small>
                </span>
              </label>

              <label className="check-row boxed">
                <input
                  type="checkbox"
                  checked={wheelchair}
                  onChange={(e) => setWheelchair(e.target.checked)}
                />
                <span>
                  <strong>Hỗ trợ xe lăn (Yêu cầu tiếp cận thang máy)</strong>
                  <small>
                    Bắt buộc chọn các phòng có thang máy hoặc lối tiếp cận thuận tiện cho xe lăn.
                  </small>
                </span>
              </label>
            </div>
          )}

          <div className="button-row end">
            <button className="button primary" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>

        <section className="panel rights">
          <div className="panel-heading">
            <div>
              <h2>Quyền hạn hệ thống</h2>
              <p>Phạm vi tác vụ theo vai trò phân quyền.</p>
            </div>
            <span className="role-badge">{user.role}</span>
          </div>
          <ul>
            {rights.map((right) => (
              <li key={right}>{right}</li>
            ))}
          </ul>
          <div className="info-box">
            <strong>Bảo mật thông tin</strong>
            <p>
              Thông tin về nhu cầu sức khỏe và chấn thương được bảo vệ theo tiêu chuẩn riêng tư y tế, chỉ hiển thị với chính chủ tài khoản.
            </p>
          </div>
        </section>
      </div>
      {toastNode}
    </>
  );
}
