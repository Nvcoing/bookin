import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/client";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, useToast } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import type { Booking } from "../types";

export default function ApprovalPage({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["bookings", admin, tab],
    queryFn: () => api.bookings(admin, tab),
  });
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const { showToast, toastNode } = useToast();

  const mutation = useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: Booking["status"]; rejectionReason?: string }) =>
      api.updateBooking(id, status, rejectionReason),
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setRejecting(null);
      setReason("");
      showToast(values.status === "approved" ? "Đã duyệt yêu cầu." : values.status === "cancelled" ? "Đã hủy đơn." : "Đã từ chối yêu cầu.");
    },
    onError: (err: any) => {
      showToast(err instanceof ApiError ? err.message : "Thao tác không thành công.", "danger");
    },
  });

  const reject = (id: string) => {
    if (!reason.trim()) {
      setReasonError("Bắt buộc nhập lý do từ chối.");
      return;
    }
    mutation.mutate({ id, status: "rejected", rejectionReason: reason.trim() });
  };

  const rows = data;

  return (
    <>
      <PageHeader
        tag={admin ? "Quản lý điều phối" : "Lịch sử cá nhân"}
        title={admin ? "Phê duyệt yêu cầu" : "Lịch sử đặt phòng"}
        description={admin ? "Xử lý đơn theo thứ tự ưu tiên: Giảng viên trước, sau đó đến thứ tự nộp đơn." : "Theo dõi trạng thái và quản lý đơn đặt phòng của bạn."}
      />
      {admin && (
        <>
          <div className="button-row" style={{ marginTop: 0, marginBottom: 16 }}>
            <div className="tab-pill-group">
              <button
                type="button"
                className={`tab-pill ${tab === "pending" ? "active" : ""}`}
                onClick={() => setTab("pending")}
              >
                Chờ duyệt
              </button>
              <button
                type="button"
                className={`tab-pill ${tab === "approved" ? "active" : ""}`}
                onClick={() => setTab("approved")}
              >
                Đã phê duyệt
              </button>
              <button
                type="button"
                className={`tab-pill ${tab === "rejected" ? "active" : ""}`}
                onClick={() => setTab("rejected")}
              >
                Đã từ chối
              </button>
              <button
                type="button"
                className={`tab-pill ${tab === "all" ? "active" : ""}`}
                onClick={() => setTab("all")}
              >
                Tất cả lịch sử
              </button>
            </div>
          </div>
          {tab === "pending" && (
            <div className="queue-summary">
              <div>
                <span>Đang chờ xử lý</span>
                <strong>{rows.length}</strong>
              </div>
              <div>
                <span>Đơn ưu tiên</span>
                <strong>{rows.filter((item) => item.requesterRole === "lecturer").length}</strong>
              </div>
              <p>Hệ thống tự động xếp đơn Giảng viên lên đầu hàng đợi.</p>
            </div>
          )}
        </>
      )}
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>
              {admin
                ? tab === "pending"
                  ? "Hàng đợi chờ duyệt"
                  : tab === "approved"
                  ? "Lịch sử phòng đã phê duyệt"
                  : tab === "rejected"
                  ? "Lịch sử yêu cầu đã từ chối"
                  : "Toàn bộ lịch sử phê duyệt"
                : "Danh sách đơn của tôi"}
            </h2>
            <p>
              {admin
                ? tab === "pending"
                  ? "Kiểm tra phòng và nội dung trước khi đưa ra quyết định."
                  : "Theo dõi và tra cứu các đơn đặt phòng theo trạng thái."
                : "Các đơn đặt phòng gần đây của bạn."}
            </p>
          </div>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : !rows.length ? (
          <EmptyState
            text={
              admin
                ? tab === "pending"
                  ? "Hiện không có đơn nào đang chờ duyệt."
                  : tab === "approved"
                  ? "Chưa có đơn nào được phê duyệt."
                  : tab === "rejected"
                  ? "Chưa có đơn nào bị từ chối."
                  : "Chưa có lịch sử đơn đặt phòng nào."
                : "Bạn chưa có đơn đặt phòng nào."
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  {admin && <th>Người yêu cầu</th>}
                  <th>Phòng</th>
                  <th>Thời gian</th>
                  <th>Mục đích</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Mã đơn">
                      <strong>{item.id}</strong>
                      {admin && item.requesterRole === "lecturer" && <span className="priority">Ưu tiên</span>}
                    </td>
                    {admin && (
                      <td data-label="Người yêu cầu">
                        {item.requester}
                        <small>{item.requesterRole === "lecturer" ? "Giảng viên" : "Sinh viên"}</small>
                      </td>
                    )}
                    <td data-label="Phòng">
                      <strong>{item.room}</strong>
                    </td>
                    <td data-label="Thời gian">
                      {item.date}
                      <small>
                        {item.start}–{item.end}
                      </small>
                    </td>
                    <td data-label="Mục đích">{item.purpose}</td>
                    <td data-label="Trạng thái">
                      <StatusBadge status={item.status} />
                      {item.rejectionReason && <small className="reason">Lý do: {item.rejectionReason}</small>}
                    </td>
                    <td data-label="Thao tác">
                      {admin ? (
                        item.status === "pending" ? (
                          <div className="table-actions">
                            <button className="button small" onClick={() => mutation.mutate({ id: item.id, status: "approved" })}>
                              Duyệt
                            </button>
                            <button className="button small danger-outline" onClick={() => setRejecting(item.id)}>
                              Từ chối
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic" }}>
                            {item.status === "approved" ? "Đã duyệt" : item.status === "rejected" ? "Đã từ chối" : "Đã hủy"}
                          </span>
                        )
                      ) : (
                        <button
                          className="button small danger-outline"
                          disabled={item.status === "cancelled" || item.status === "rejected"}
                          onClick={() => mutation.mutate({ id: item.id, status: "cancelled" })}
                        >
                          Hủy đơn
                        </button>
                      )}
                      {rejecting === item.id && (
                        <div className="inline-reject">
                          <textarea
                            placeholder="Nhập lý do từ chối..."
                            value={reason}
                            onChange={(e) => {
                              setReason(e.target.value);
                              setReasonError("");
                            }}
                          />
                          {reasonError && <small className="field-error">{reasonError}</small>}
                          <div>
                            <button className="link-button" onClick={() => setRejecting(null)}>
                              Bỏ qua
                            </button>
                            <button className="button small danger-button" onClick={() => reject(item.id)}>
                              Xác nhận
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {toastNode}
    </>
  );
}
