import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { api } from "../api/client";
import { EmptyState, Field, PageHeader, useToast } from "../components/ui";
import { useAuth } from "../hooks/useAuth";

export default function BookingPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms"], queryFn: api.rooms });
  const [form, setForm] = useState({ date: "2025-06-24", start: "08:00", end: "10:00", attendees: 18, purpose: "", room: params.get("room") || "auto", projector: true, temporary: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Awaited<ReturnType<typeof api.recommend>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [conflict, setConflict] = useState(false);
  const { showToast, toastNode } = useToast();
  const needsAccess = form.temporary || user?.special_needs.includes("leg_injury") || false;
  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.date) next.date = "Chọn ngày sử dụng.";
    if (form.start >= form.end) next.time = "Giờ kết thúc phải sau giờ bắt đầu.";
    if (form.attendees < 1) next.attendees = "Số người phải lớn hơn 0.";
    if (!form.purpose.trim()) next.purpose = "Nhập mục đích sử dụng.";
    const room = rooms.find((item) => item.id === form.room);
    if (needsAccess && room && room.floor > 2 && !room.has_elevator) next.room = "Phòng không phù hợp điều kiện di chuyển. Vui lòng chọn tầng 1–2 có thang máy.";
    setErrors(next); return !Object.keys(next).length;
  };
  const recommend = async () => { if (!validate()) return; setLoading(true); setResult(await api.recommend(form.attendees, form.projector, needsAccess)); setLoading(false); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (!validate()) return; if (form.room === "A.203" && form.start === "08:00") { setConflict(true); return; } setConflict(false); showToast("Đã gửi yêu cầu đặt phòng. Trạng thái: Chờ duyệt."); };
  return <><PageHeader module="Module 3" title="Đặt phòng" description="Gửi yêu cầu hoặc nhận gợi ý theo nhu cầu sử dụng." />
    <form className="panel booking-form" onSubmit={submit}><div className="section-title"><span>01</span><div><h2>Thời gian và nhu cầu</h2><p>Cung cấp thông tin để hệ thống kiểm tra điều kiện.</p></div></div><div className="form-grid three"><Field label="Ngày sử dụng" required error={errors.date}><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Giờ bắt đầu" required error={errors.time}><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field><Field label="Giờ kết thúc" required><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field><Field label="Số người" required error={errors.attendees}><input type="number" min="1" value={form.attendees} onChange={(e) => setForm({ ...form, attendees: Number(e.target.value) })} /></Field><Field label="Phòng" error={errors.room}><select value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}><option value="auto">Tự động gợi ý</option>{rooms.map((room) => <option key={room.id} value={room.id} disabled={room.status === "maintenance"}>{room.id} · {room.building}</option>)}</select></Field><Field label="Mục đích sử dụng" required error={errors.purpose}><input placeholder="Ví dụ: Họp nhóm đồ án" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></Field></div><div className="check-grid"><label className="check-row boxed"><input type="checkbox" checked={form.projector} onChange={(e) => setForm({ ...form, projector: e.target.checked })} /><span><strong>Cần máy chiếu</strong><small>Ưu tiên phòng có thiết bị phù hợp.</small></span></label><label className="check-row boxed"><input type="checkbox" checked={form.temporary} onChange={(e) => setForm({ ...form, temporary: e.target.checked })} /><span><strong>Tạm thời đi lại khó khăn</strong><small>Chỉ áp dụng cho yêu cầu này.</small></span></label></div><div className="button-row end"><button type="button" className="button secondary" onClick={recommend}>{loading ? "Đang tính điểm..." : "Gợi ý phòng"}</button><button className="button primary">Gửi yêu cầu</button></div></form>
    {errors.room && <div className="alert danger prominent"><strong>Không đáp ứng điều kiện an toàn</strong><span>Hệ thống đã chặn phòng tầng cao. Hãy chọn phòng tầng 1–2 có thang máy.</span></div>}
    {conflict && <section className="panel conflict"><div className="panel-heading"><div><span className="status danger">Trùng lịch · 409</span><h2>Khung giờ đã được sử dụng</h2><p>Chọn một phương án thay thế dưới đây.</p></div></div><div className="alternative-grid"><div><strong>Phòng khác cùng giờ</strong><button type="button">A.101 · 08:00–10:00</button><button type="button">C.202 · 08:00–10:00</button></div><div><strong>Giờ khác cùng phòng</strong><button type="button">A.203 · 10:15–12:15</button><button type="button">A.203 · 13:30–15:30</button></div></div></section>}
    {result && <section className="panel table-panel recommendation"><div className="panel-heading"><div><span className="module-label">Kết quả xếp hạng</span><h2>Phòng phù hợp nhất</h2><p>Điểm được tính theo thể trạng, thiết bị, sức chứa và vị trí.</p></div></div>{!result.recommendations.length ? <EmptyState text="Không tìm thấy phòng đáp ứng điều kiện cứng." /> : <div className="table-wrap"><table><thead><tr><th>Phòng</th><th>Sức khỏe /40</th><th>Thiết bị /30</th><th>Sức chứa /20</th><th>Vị trí /10</th><th>Tổng điểm</th><th></th></tr></thead><tbody>{result.recommendations.map((item, index) => <tr key={item.room.id}><td data-label="Phòng"><strong>{index + 1}. {item.room.id}</strong><small>{item.room.building} · Tầng {item.room.floor}</small></td><td data-label="Sức khỏe">{item.health}</td><td data-label="Thiết bị">{item.equipment}</td><td data-label="Sức chứa">{item.capacity}</td><td data-label="Vị trí">{item.location}</td><td data-label="Tổng điểm"><strong className="score">{item.total}/100</strong></td><td data-label="Chọn"><button className="button small" onClick={() => setForm({ ...form, room: item.room.id })}>Chọn</button></td></tr>)}</tbody></table></div>}<div className="excluded"><strong>Phòng bị loại bởi điều kiện cứng</strong>{result.excluded.map((item) => <span key={item.room}><b>{item.room}</b>{item.reason}</span>)}</div></section>}{toastNode}</>;
}
