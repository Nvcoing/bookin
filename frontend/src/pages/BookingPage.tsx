import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import { api, ApiError } from "../api/client";
import { EmptyState, Field, PageHeader, useToast } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

export default function BookingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: api.rooms });
  const [form, setForm] = useState({
    date: tomorrow,
    start: "08:00",
    end: "10:00",
    attendees: 18,
    purpose: "",
    room: params.get("room") || "auto",
    projector: true,
    temporary: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.recommend>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState<any[] | null>(null);
  const { showToast, toastNode } = useToast();

  const needsAccess = form.temporary || user?.special_needs?.includes("leg_injury") || false;

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.date) next.date = "Chọn ngày sử dụng.";
    if (form.start >= form.end) next.time = "Giờ kết thúc phải sau giờ bắt đầu.";
    if (form.attendees < 1) next.attendees = "Số người phải lớn hơn 0.";
    if (!form.purpose.trim()) next.purpose = "Nhập mục đích sử dụng.";
    const selected = rooms.find((item) => item.id === form.room || item.code === form.room);
    if (needsAccess && selected && selected.floor > 2 && !selected.has_elevator) {
      next.room = "Phòng không phù hợp điều kiện di chuyển. Vui lòng chọn tầng 1–2 có thang máy.";
    }
    setErrors(next);
    return !Object.keys(next).length;
  };

  const recommend = async () => {
    if (!validate()) return;
    setLoading(true);
    setConflict(null);
    try {
      const res = await api.recommend(form.attendees, form.projector, needsAccess, form.date, form.start, form.end);
      setResult(res);
      if (res.recommendations.length > 0) {
        setForm((prev) => ({ ...prev, room: res.recommendations[0].room.id }));
      }
    } catch (err: any) {
      showToast(err instanceof ApiError ? err.message : "Không thể lấy gợi ý phòng.", "danger");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setConflict(null);

    let targetRoom = rooms.find((r) => r.id === form.room || r.code === form.room);
    if (!targetRoom && form.room === "auto") {
      if (result && result.recommendations.length > 0) {
        targetRoom = result.recommendations[0].room;
      } else {
        setErrors((prev) => ({ ...prev, room: "Vui lòng chọn phòng cụ thể hoặc bấm 'Gợi ý phòng'." }));
        return;
      }
    }

    if (!targetRoom || !targetRoom.rawId) {
      setErrors((prev) => ({ ...prev, room: "Không tìm thấy thông tin phòng." }));
      return;
    }

    setSubmitting(true);
    try {
      await api.createBooking({
        roomId: targetRoom.rawId,
        date: form.date,
        start: form.start,
        end: form.end,
        attendees: form.attendees,
        purpose: form.purpose.trim(),
        needProjector: form.projector,
        needsAccess,
      });
      showToast("Đã gửi yêu cầu đặt phòng. Trạng thái: Chờ duyệt.");
      setTimeout(() => navigate("/don-dat-phong"), 1200);
    } catch (err: any) {
      if (err instanceof ApiError && err.code === "USER_ALREADY_BOOKED") {
        showToast(err.message, "danger");
      } else if (err instanceof ApiError && err.code === "ROOM_CONFLICT") {
        const suggestions = err.details?.suggestions || [];
        setConflict(suggestions);
        showToast(err.message, "danger");
      } else {
        showToast(err instanceof ApiError ? err.message : "Đặt phòng không thành công.", "danger");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader tag="Đăng ký sử dụng phòng" title="Đặt phòng học & họp" description="Gửi yêu cầu hoặc nhận gợi ý phòng học tối ưu theo nhu cầu sử dụng." />
      <form className="panel booking-form" onSubmit={submit}>
        <div className="section-title">
          <span>01</span>
          <div>
            <h2>Thời gian và nhu cầu</h2>
            <p>Cung cấp thông tin để hệ thống kiểm tra điều kiện.</p>
          </div>
        </div>
        <div className="form-grid three">
          <Field label="Ngày sử dụng" required error={errors.date}>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Giờ bắt đầu" required error={errors.time}>
            <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </Field>
          <Field label="Giờ kết thúc" required>
            <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
          </Field>
          <Field label="Số người" required error={errors.attendees}>
            <input type="number" min="1" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: Number(e.target.value) })} />
          </Field>
          <Field label="Phòng" error={errors.room}>
            <select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}>
              <option value="auto">Tự động gợi ý</option>
              {rooms.map((room) => {
                const unsuitable = needsAccess && room.floor > 2 && !room.has_elevator;
                return (
                  <option key={room.id} value={room.id} disabled={room.status === "maintenance"}>
                    {room.id} · {room.building} (Tầng {room.floor}, {room.capacity} chỗ)
                    {unsuitable ? " ⚠️ (Tầng cao không thang máy)" : ""}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label="Mục đích sử dụng" required error={errors.purpose}>
            <input placeholder="Ví dụ: Họp nhóm đồ án" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </Field>
        </div>
        <div className="check-grid">
          <label className="check-row boxed">
            <input type="checkbox" checked={form.projector} onChange={(e) => setForm({ ...form, projector: e.target.checked })} />
            <span>
              <strong>Cần máy chiếu</strong>
              <small>Ưu tiên phòng có thiết bị phù hợp.</small>
            </span>
          </label>
          <label className="check-row boxed">
            <input type="checkbox" checked={form.temporary} onChange={(e) => setForm({ ...form, temporary: e.target.checked })} />
            <span>
              <strong>Tạm thời đi lại khó khăn</strong>
              <small>Hệ thống tự động lọc phòng tầng 1–2 có thang máy.</small>
            </span>
          </label>
        </div>
        <div className="button-row end">
          <button type="button" className="button secondary" onClick={recommend} disabled={loading}>
            {loading ? "Đang tính điểm..." : "Gợi ý phòng"}
          </button>
          <button className="button primary" disabled={submitting}>
            {submitting ? "Đang gửi..." : "Gửi yêu cầu"}
          </button>
        </div>
      </form>

      {errors.room && (
        <div className="alert danger prominent">
          <strong>Không đáp ứng điều kiện an toàn</strong>
          <span>{errors.room}</span>
        </div>
      )}

      {conflict && (
        <section className="panel conflict">
          <div className="panel-heading">
            <div>
              <span className="status danger">Trùng lịch · 409</span>
              <h2>Khung giờ đã có người đặt</h2>
              <p>Hệ thống gợi ý các phương án thay thế khả dụng:</p>
            </div>
          </div>
          <div className="alternative-grid">
            {conflict.length > 0 ? (
              conflict.map((sug: any, idx: number) => {
                const s = new Date(sug.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
                const e = new Date(sug.end_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
                return (
                  <div key={idx}>
                    <strong>Gợi ý {idx + 1}: {sug.room.code} ({sug.room.building} - Tầng {sug.room.floor})</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          room: sug.room.code,
                          start: s,
                          end: e,
                        }));
                        setConflict(null);
                        showToast(`Đã áp dụng phương án: ${sug.room.code} (${s}–${e})`);
                      }}
                    >
                      {sug.room.code} · {s}–{e} (Điểm: {sug.score})
                    </button>
                  </div>
                );
              })
            ) : (
              <p>Không tìm thấy khung giờ thay thế gần nhất. Vui lòng chọn ngày hoặc phòng khác.</p>
            )}
          </div>
        </section>
      )}

      {result && (
        <section className="panel table-panel recommendation">
          <div className="panel-heading">
            <div>
              <span className="category-tag">Thuật toán xếp hạng</span>
              <h2>Phòng phù hợp nhất</h2>
              <p>Điểm được tính theo thể trạng (/40), thiết bị (/30), sức chứa (/20) và vị trí (/10).</p>
            </div>
          </div>
          {!result.recommendations.length ? (
            <EmptyState text="Không tìm thấy phòng nào đáp ứng điều kiện cứng trong khung giờ này." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Phòng</th>
                    <th>Sức khỏe /40</th>
                    <th>Thiết bị /30</th>
                    <th>Sức chứa /20</th>
                    <th>Vị trí /10</th>
                    <th>Tổng điểm</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((item, index) => (
                    <tr key={item.room.id}>
                      <td data-label="Phòng">
                        <strong>
                          {index + 1}. {item.room.id}
                        </strong>
                        <small>
                          {item.room.building} · Tầng {item.room.floor} ({item.room.capacity} chỗ)
                        </small>
                      </td>
                      <td data-label="Sức khỏe">{item.health}</td>
                      <td data-label="Thiết bị">{item.equipment}</td>
                      <td data-label="Sức chứa">{item.capacity}</td>
                      <td data-label="Vị trí">{item.location}</td>
                      <td data-label="Tổng điểm">
                        <strong className="score">{item.total}/100</strong>
                      </td>
                      <td data-label="Chọn">
                        <button
                          className="button small"
                          type="button"
                          onClick={() => {
                            setForm({ ...form, room: item.room.id });
                            showToast(`Đã chọn phòng ${item.room.id}`);
                          }}
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {toastNode}
    </>
  );
}
