import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "../components/ui";

const WEEKDAY_NAMES: Record<string, string> = {
  "1": "Thứ 2",
  "2": "Thứ 3",
  "3": "Thứ 4",
  "4": "Thứ 5",
  "5": "Thứ 6",
  "6": "Thứ 7",
  "7": "Chủ nhật",
};

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<"hours" | "weekdays">("hours");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterDates, setFilterDates] = useState<{ from?: string; to?: string }>({});

  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports", filterDates.from, filterDates.to],
    queryFn: () => api.reports(filterDates.from, filterDates.to),
  });

  const applyDateFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setFilterDates({ from: dateFrom || undefined, to: dateTo || undefined });
  };

  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setFilterDates({});
  };

  const summary = data?.summary || { total: 0, by_status: {} };
  const occupancy = data?.occupancy || { overall_occupancy_rate: 0, items: [] };
  const peak = data?.peak || { by_hour: [], by_weekday: [] };

  const hourMap: Record<number, number> = {};
  if (Array.isArray(peak.by_hour)) {
    peak.by_hour.forEach((item) => {
      hourMap[item.hour] = item.count;
    });
  }

  const weekdayMap: Record<number, number> = {};
  if (Array.isArray(peak.by_weekday)) {
    peak.by_weekday.forEach((item) => {
      weekdayMap[item.weekday] = item.count;
    });
  }

  const hoursSlots = [
    { label: "07–09h", value: (hourMap[7] || 0) + (hourMap[8] || 0) },
    { label: "09–11h", value: (hourMap[9] || 0) + (hourMap[10] || 0) },
    { label: "11–13h", value: (hourMap[11] || 0) + (hourMap[12] || 0) },
    { label: "13–15h", value: (hourMap[13] || 0) + (hourMap[14] || 0) },
    { label: "15–17h", value: (hourMap[15] || 0) + (hourMap[16] || 0) },
    { label: "17–19h", value: (hourMap[17] || 0) + (hourMap[18] || 0) },
    { label: "19–21h", value: (hourMap[19] || 0) + (hourMap[20] || 0) },
  ];
  const maxHourValue = Math.max(...hoursSlots.map((h) => h.value), 1);

  const weekdaySlots = [1, 2, 3, 4, 5, 6, 7].map((key) => ({
    label: WEEKDAY_NAMES[String(key)] || `Thứ ${key + 1}`,
    value: weekdayMap[key] || 0,
  }));
  const maxWeekdayValue = Math.max(...weekdaySlots.map((w) => w.value), 1);

  const displaySlots = activeTab === "hours" ? hoursSlots : weekdaySlots;
  const currentMax = activeTab === "hours" ? maxHourValue : maxWeekdayValue;

  const ranking = [...occupancy.items]
    .sort((a, b) => b.occupancy_rate - a.occupancy_rate)
    .slice(0, 10);

  const totalBookedHours = occupancy.items.reduce((acc, curr) => acc + curr.booked_hours, 0);
  const occupancyPercent = Math.round(occupancy.overall_occupancy_rate * 100);

  return (
    <>
      <PageHeader
        tag="Báo cáo & Phân tích"
        title="Hiệu suất khai thác không gian"
        description="Số liệu thống kê thời gian thực từ hệ thống cơ sở dữ liệu VNU-IS."
      />

      {/* BUG-028: Thanh bộ lọc thời gian */}
      <form className="panel" onSubmit={applyDateFilter} style={{ marginBottom: 18, padding: "12px 18px" }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475467", display: "block", marginBottom: 4 }}>
              Từ ngày:
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475467", display: "block", marginBottom: 4 }}>
              Đến ngày:
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d0d5dd", fontSize: 13 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="button primary small">
              Lọc ngày
            </button>
            {(filterDates.from || filterDates.to) && (
              <button type="button" className="button secondary small" onClick={clearDateFilter}>
                Xóa lọc
              </button>
            )}
          </div>
          {filterDates.from && filterDates.to && (
            <span style={{ fontSize: 12, color: "#667085", alignSelf: "center" }}>
              Đang lọc từ <strong>{filterDates.from}</strong> đến <strong>{filterDates.to}</strong>
            </span>
          )}
        </div>
      </form>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : (
        <>
          {/* BUG-002: Hiển thị chuẩn xác từng trạng thái đơn */}
          <div className="metrics pro-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div className="metric-card">
              <div className="metric-header">
                <span>Tổng đơn đặt phòng</span>
                <span className="badge-pill">{filterDates.from ? "Khoảng lọc" : "Tất cả"}</span>
              </div>
              <strong className="metric-num">{summary.total}</strong>
              <small className="metric-note">Toàn bộ đơn phát sinh</small>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span>Đã phê duyệt</span>
                <StatusBadge status="approved" />
              </div>
              <strong className="metric-num" style={{ color: "#166534" }}>
                {summary.by_status.approved || 0}
              </strong>
              <small className="metric-note">Được cấp quyền sử dụng phòng</small>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span>Đang chờ duyệt</span>
                <StatusBadge status="pending" />
              </div>
              <strong className="metric-num" style={{ color: "#b45309" }}>
                {summary.by_status.pending || 0}
              </strong>
              <small className="metric-note">Cần hội đồng xử lý</small>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span>Đã từ chối</span>
                <StatusBadge status="rejected" />
              </div>
              <strong className="metric-num" style={{ color: "#991b1b" }}>
                {summary.by_status.rejected || 0}
              </strong>
              <small className="metric-note">Hội đồng không phê duyệt</small>
            </div>
            <div className="metric-card">
              <div className="metric-header">
                <span>Đã hủy đơn</span>
                <StatusBadge status="cancelled" />
              </div>
              <strong className="metric-num" style={{ color: "#64748b" }}>
                {summary.by_status.cancelled || 0}
              </strong>
              <small className="metric-note">Người đặt hoặc bảo trì hủy</small>
            </div>
          </div>

          {/* Charts & Efficiency Section */}
          <div className="report-grid">
            <section className="panel chart-panel">
              <div className="panel-heading" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
                <div>
                  <h2>Phân bổ tần suất đặt phòng</h2>
                  <p>Nhận diện khung giờ và các ngày cao điểm trong tuần.</p>
                </div>
                <div className="tab-pill-group">
                  <button
                    type="button"
                    className={`tab-pill ${activeTab === "hours" ? "active" : ""}`}
                    onClick={() => setActiveTab("hours")}
                  >
                    Khung giờ
                  </button>
                  <button
                    type="button"
                    className={`tab-pill ${activeTab === "weekdays" ? "active" : ""}`}
                    onClick={() => setActiveTab("weekdays")}
                  >
                    Ngày trong tuần
                  </button>
                </div>
              </div>

              <div className="pro-chart-container">
                <div className="chart-y-axis">
                  <span>{currentMax}</span>
                  <span>{Math.round(currentMax / 2)}</span>
                  <span>0</span>
                </div>
                <div className="bar-chart pro-bar-chart">
                  {displaySlots.map((slot) => {
                    const percent = Math.max(Math.round((slot.value / currentMax) * 100), slot.value > 0 ? 8 : 2);
                    return (
                      <div className="bar-item" key={slot.label}>
                        <div className="bar-tooltip">
                          <strong>{slot.value}</strong> lượt
                        </div>
                        <div className="bar-track">
                          <div
                            className={`bar-fill ${slot.value > 0 ? "has-data" : "zero"}`}
                            style={{ height: `${percent}%` }}
                          />
                        </div>
                        <span className="bar-label">{slot.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="panel utilization">
              <div className="panel-heading" style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: 14 }}>
                <div>
                  <h2>Hiệu suất tổng thể</h2>
                  <p>Công suất hoạt động (07:00 – 21:00).</p>
                </div>
              </div>

              <div className="pro-gauge-box">
                <div className="gauge-circle">
                  <span className="gauge-num">{occupancyPercent}%</span>
                  <span className="gauge-lbl">Tỷ lệ lấp đầy</span>
                </div>
                <div className="gauge-progress-bar">
                  <div
                    className="gauge-fill"
                    style={{
                      width: `${Math.min(occupancyPercent, 100)}%`,
                      background:
                        occupancyPercent > 70
                          ? "linear-gradient(90deg, #10b981, #059669)"
                          : occupancyPercent > 30
                            ? "linear-gradient(90deg, #3b82f6, #1d4ed8)"
                            : "linear-gradient(90deg, #f59e0b, #d97706)",
                    }}
                  />
                </div>
              </div>

              <dl className="util-stats-list">
                <div>
                  <dt>Tổng giờ sử dụng thực tế</dt>
                  <dd>{Math.round(totalBookedHours)} giờ</dd>
                </div>
                <div>
                  <dt>Tổng số phòng quản lý</dt>
                  <dd>{occupancy.items.length} phòng</dd>
                </div>
                <div>
                  <dt>Khung giờ vận hành chuẩn</dt>
                  <dd>14 giờ / ngày</dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Leaderboard Table */}
          <section className="panel table-panel">
            <div className="panel-heading" style={{ padding: "18px 20px 14px", borderBottom: "1px solid #e2e8f0" }}>
              <div>
                <h2>Bảng xếp hạng hiệu suất từng phòng (Top 10 phòng cao nhất)</h2>
                <p>Sắp xếp theo tỷ lệ lấp đầy và tổng thời lượng khai thác thực tế.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Xếp hạng</th>
                    <th>Mã phòng</th>
                    <th>Tòa nhà</th>
                    <th>Tổng thời lượng</th>
                    <th>Tỷ lệ lấp đầy</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item, index) => {
                    const rate = Math.round(item.occupancy_rate * 100);
                    return (
                      <tr key={item.room_id}>
                        <td data-label="Xếp hạng">
                          <span className={`rank-badge ${index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "bronze" : ""}`}>
                            {index + 1}
                          </span>
                        </td>
                        <td data-label="Phòng">
                          <strong style={{ color: "#1e293b", fontSize: 13 }}>{item.code}</strong>
                          <small style={{ color: "#64748b" }}>{item.name}</small>
                        </td>
                        <td data-label="Tòa">{item.building}</td>
                        <td data-label="Thời lượng">{item.booked_hours} giờ</td>
                        <td data-label="Tỷ lệ lấp đầy">
                          <div className="rate-cell">
                            <div className="rate-track">
                              <span
                                className="rate-fill"
                                style={{
                                  width: `${rate}%`,
                                  background: rate > 70 ? "#10b981" : rate > 30 ? "#3b82f6" : "#f59e0b",
                                }}
                              />
                            </div>
                            <strong>{rate}%</strong>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
