import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api, ApiError } from "../api/client";
import { EmptyState, ErrorState, Field, LoadingState, PageHeader, StatusBadge, useToast } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import type { Room } from "../types";

const blank: Room = { id: "", building: "A1", floor: 1, has_elevator: true, capacity: 30, facilities: ["Bảng trắng", "Máy chiếu"], status: "active" };

export default function RoomsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["rooms"], queryFn: api.rooms });
  const [filters, setFilters] = useState({ capacity: "0", floor: "all", facility: "all" });
  const [editing, setEditing] = useState<Room | null>(null);
  const { showToast, toastNode } = useToast();

  const saveMutation = useMutation({
    mutationFn: api.saveRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      setEditing(null);
      showToast("Đã lưu thông tin phòng thành công.");
    },
    onError: (err: any) => {
      showToast(err instanceof ApiError ? err.message : "Không thể lưu thông tin phòng.", "danger");
    },
  });

  const filtered = useMemo(
    () =>
      data.filter(
        (room) =>
          room.capacity >= Number(filters.capacity) &&
          (filters.floor === "all" || room.floor === Number(filters.floor)) &&
          (filters.facility === "all" || room.facilities.includes(filters.facility))
      ),
    [data, filters]
  );

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (editing) saveMutation.mutate(editing);
  };

  return (
    <>
      <PageHeader
        tag="Cơ sở vật chất"
        title={user?.role === "admin" ? "Quản lý phòng" : "Danh mục phòng"}
        description="Tra cứu không gian, sức chứa và trạng thái vận hành."
        actions={
          user?.role === "admin" && (
            <button className="button primary" onClick={() => setEditing({ ...blank })}>
              Thêm phòng
            </button>
          )
        }
      />
      <section className="panel filters">
        <div className="filter-title">
          <strong>Bộ lọc</strong>
          <span>{filtered.length} phòng phù hợp</span>
        </div>
        <div className="filter-grid">
          <Field label="Sức chứa tối thiểu">
            <select value={filters.capacity} onChange={(e) => setFilters({ ...filters, capacity: e.target.value })}>
              <option value="0">Tất cả</option>
              <option value="20">20 người trở lên</option>
              <option value="30">30 người trở lên</option>
              <option value="50">50 người trở lên</option>
            </select>
          </Field>
          <Field label="Tầng">
            <select value={filters.floor} onChange={(e) => setFilters({ ...filters, floor: e.target.value })}>
              <option value="all">Tất cả tầng</option>
              <option value="1">Tầng 1</option>
              <option value="2">Tầng 2</option>
              <option value="3">Tầng 3+</option>
            </select>
          </Field>
          <Field label="Thiết bị">
            <select value={filters.facility} onChange={(e) => setFilters({ ...filters, facility: e.target.value })}>
              <option value="all">Tất cả thiết bị</option>
              <option>Máy chiếu</option>
              <option>Bảng trắng</option>
              <option>Micro</option>
              <option>Điều hòa</option>
              <option>Máy tính</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>Danh sách phòng</h2>
            <p>Dữ liệu cập nhật theo thời gian thực từ hệ thống.</p>
          </div>
        </div>
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : !filtered.length ? (
          <EmptyState />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã phòng</th>
                  <th>Tòa</th>
                  <th>Tầng</th>
                  <th>Thang máy</th>
                  <th>Sức chứa</th>
                  <th>Thiết bị</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((room) => (
                  <tr key={room.id}>
                    <td data-label="Phòng">
                      <strong>{room.code || room.id}</strong>
                      {room.name && <small>{room.name}</small>}
                    </td>
                    <td data-label="Tòa">{room.building}</td>
                    <td data-label="Tầng">Tầng {room.floor}</td>
                    <td data-label="Thang máy">{room.has_elevator ? "Có" : "Không"}</td>
                    <td data-label="Sức chứa">{room.capacity} người</td>
                    <td data-label="Thiết bị">
                      <div className="tags">
                        {room.facilities.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Trạng thái">
                      <StatusBadge status={room.status} />
                    </td>
                    <td data-label="Thao tác">
                      <div className="table-actions">
                        {user?.role === "admin" ? (
                          <>
                            <button className="link-button" onClick={() => setEditing({ ...room })}>
                              Sửa
                            </button>
                            <button
                              className="link-button"
                              onClick={() =>
                                saveMutation.mutate({
                                  ...room,
                                  status: room.status === "active" ? "maintenance" : "active",
                                })
                              }
                            >
                              {room.status === "active" ? "Bảo trì" : "Kích hoạt"}
                            </button>
                          </>
                        ) : (
                          <button
                            className="button small"
                            disabled={room.status === "maintenance"}
                            onClick={() => navigate(`/dat-phong?room=${room.code || room.id}`)}
                          >
                            Đặt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={save}>
            <div className="modal-header">
              <div>
                <span className="module-label">Quản trị</span>
                <h2>{editing.rawId ? "Sửa thông tin phòng" : "Thêm phòng mới"}</h2>
              </div>
              <button type="button" className="close-button" onClick={() => setEditing(null)}>
                Đóng
              </button>
            </div>
            <div className="form-grid">
              <Field label="Mã phòng" required>
                <input
                  value={editing.code || editing.id}
                  disabled={Boolean(editing.rawId)}
                  onChange={(e) => setEditing({ ...editing, id: e.target.value.toUpperCase(), code: e.target.value.toUpperCase() })}
                />
              </Field>
              <Field label="Tên phòng">
                <input
                  value={editing.name || ""}
                  placeholder="Ví dụ: Phòng học A1-101"
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <Field label="Tòa nhà">
                <input
                  value={editing.building}
                  placeholder="Ví dụ: A1, A2"
                  onChange={(e) => setEditing({ ...editing, building: e.target.value })}
                />
              </Field>
              <Field label="Tầng">
                <input
                  type="number"
                  min="1"
                  value={editing.floor}
                  onChange={(e) => setEditing({ ...editing, floor: Number(e.target.value) })}
                />
              </Field>
              <Field label="Sức chứa (người)">
                <input
                  type="number"
                  min="1"
                  value={editing.capacity}
                  onChange={(e) => setEditing({ ...editing, capacity: Number(e.target.value) })}
                />
              </Field>
              <Field label="Thiết bị (phân cách bằng dấu phẩy)">
                <input
                  value={editing.facilities.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      facilities: e.target.value
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Trạng thái">
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value as Room["status"] })}
                >
                  <option value="active">Hoạt động</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </Field>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={editing.has_elevator}
                onChange={(e) => setEditing({ ...editing, has_elevator: e.target.checked })}
              />
              <span>
                <strong>Tòa nhà có thang máy hoặc lối tiếp cận thuận tiện</strong>
              </span>
            </label>
            <div className="button-row end">
              <button type="button" className="button secondary" onClick={() => setEditing(null)}>
                Hủy
              </button>
              <button className="button primary" disabled={!editing.id || saveMutation.isPending}>
                {saveMutation.isPending ? "Đang lưu..." : "Lưu phòng"}
              </button>
            </div>
          </form>
        </div>
      )}
      {toastNode}
    </>
  );
}
