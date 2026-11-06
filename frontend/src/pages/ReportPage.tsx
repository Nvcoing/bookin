import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "../components/ui";

export default function ReportPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["reports"],
    queryFn: () => api.reports(),
  });

  const summary = data?.summary || { total: 0, by_status: {} };
  const occupancy = data?.occupancy || { overall_occupancy_rate: 0, items: [] };
  const peak = data?.peak || { by_hour: {}, by_weekday: {} };

  const hoursSlots = [
    { label: "07–09", value: (peak.by_hour["7"] || 0) + (peak.by_hour["8"] || 0) },
    { label: "09–11", value: (peak.by_hour["9"] || 0) + (peak.by_hour["10"] || 0) },
    { label: "11–13", value: (peak.by_hour["11"] || 0) + (peak.by_hour["12"] || 0) },
    { label: "13–15", value: (peak.by_hour["13"] || 0) + (peak.by_hour["14"] || 0) },
    { label: "15–17", value: (peak.by_hour["15"] || 0) + (peak.by_hour["16"] || 0) },
    { label: "17–19", value: (peak.by_hour["17"] || 0) + (peak.by_hour["18"] || 0) },
  ];
  const maxSlot = Math.max(...hoursSlots.map((h) => h.value), 1);

  const ranking = [...occupancy.items]
    .sort((a, b) => b.occupancy_rate - a.occupancy_rate)
    .slice(0, 10);

  const totalBookedHours = occupancy.items.reduce((acc, curr) => acc + curr.booked_hours, 0);

  return (
    <>
      <PageHeader
        module="Module 5"
        title="Báo cáo sử dụng"
        description="Tổng hợp tình hình khai thác phòng và công suất sử dụng (Dữ liệu thời gian thực)."
      />
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : (
        <>
          <div className="metrics">
            <div>
              <span>Tổng yêu cầu</span>
              <strong>{summary.total}</strong>
              <small>Tất cả đơn</small>
            </div>
            <div>
              <span>Đã duyệt</span>
              <strong>{summary.by_status.approved || 0}</strong>
              <StatusBadge status="approved" />
            </div>
            <div>
              <span>Chờ duyệt</span>
              <strong>{summary.by_status.pending || 0}</strong>
              <StatusBadge status="pending" />
            </div>
            <div>
              <span>Từ chối / Đã hủy</span>
              <strong>{(summary.by_status.rejected || 0) + (summary.by_status.cancelled || 0)}</strong>
              <StatusBadge status="rejected" />
            </div>
          </div>

          <div className="report-grid">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Khung giờ cao điểm</h2>
                  <p>Số lượt đặt bắt đầu theo khung giờ trong ngày.</p>
                </div>
              </div>
              <div className="bar-chart">
                {hoursSlots.map((hour) => {
                  const percent = Math.round((hour.value / maxSlot) * 100);
                  return (
                    <div className="bar-item" key={hour.label}>
                      <div className="bar-value">{hour.value}</div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ height: `${percent}%` }} />
                      </div>
                      <span>{hour.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel utilization">
              <div className="panel-heading">
                <div>
                  <h2>Hiệu suất chung</h2>
                  <p>Tỷ lệ sử dụng theo công suất mở cửa (07:00 – 21:00).</p>
                </div>
              </div>
              <div className="big-rate">
                <strong>{Math.round(occupancy.overall_occupancy_rate * 100)}%</strong>
                <span>Tỷ lệ lấp đầy trung bình</span>
              </div>
              <dl>
                <div>
                  <dt>Tổng giờ sử dụng</dt>
                  <dd>{Math.round(totalBookedHours)} giờ</dd>
                </div>
                <div>
                  <dt>Tổng số phòng</dt>
                  <dd>{occupancy.items.length} phòng</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>Xếp hạng phòng</h2>
                <p>Sắp xếp theo tỷ lệ lấp đầy trong kỳ báo cáo.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hạng</th>
                    <th>Phòng</th>
                    <th>Tòa</th>
                    <th>Giờ sử dụng</th>
                    <th>Tỷ lệ lấp đầy</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((item, index) => {
                    const rate = Math.round(item.occupancy_rate * 100);
                    return (
                      <tr key={item.room_id}>
                        <td data-label="Hạng">
                          <span className="rank">{index + 1}</span>
                        </td>
                        <td data-label="Phòng">
                          <strong>{item.code}</strong>
                          <small>{item.name}</small>
                        </td>
                        <td data-label="Tòa">{item.building}</td>
                        <td data-label="Giờ sử dụng">{item.booked_hours} giờ</td>
                        <td data-label="Tỷ lệ lấp đầy">
                          <div className="rate-cell">
                            <div>
                              <span style={{ width: `${rate}%` }} />
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
