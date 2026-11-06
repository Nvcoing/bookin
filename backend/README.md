# RoomBook Backend

API quản lý và đặt phòng học/phòng họp (FastAPI + SQLAlchemy). Backend và Frontend giao tiếp qua REST/JSON.

## Chạy nhanh

Yêu cầu: Python 3.10 trở lên.

```powershell
python -m venv venv
venv\Scripts\activate            # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env           # macOS/Linux: cp .env.example .env
python scripts\seed.py           # nạp dữ liệu mẫu (xóa dữ liệu cũ)
uvicorn app.main:app --reload
```

- Tài liệu API tương tác (Swagger): http://127.0.0.1:8000/docs
- Đặc tả OpenAPI (để sinh type cho Frontend): http://127.0.0.1:8000/openapi.json
- Kiểm tra sống: http://127.0.0.1:8000/api/health

Trong file `.env`, đổi `SECRET_KEY` thành chuỗi ngẫu nhiên:
`python -c "import secrets; print(secrets.token_hex(32))"`

## Tài khoản mẫu (sau khi chạy seed)

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Admin | admin@roombook.test | Admin@123 | |
| Giảng viên | lecturer@roombook.test | Lecturer@123 | Khoa CNTT |
| Giảng viên | lecturer2@roombook.test | Lecturer@123 | Khoa Điện tử |
| Sinh viên | student@roombook.test | Student@123 | Không có nhu cầu đặc biệt |
| Sinh viên | injured@roombook.test | Student@123 | leg_injury |
| Sinh viên | wheelchair@roombook.test | Student@123 | wheelchair |

## Quy ước chung cho Frontend

- **Xác thực:** `POST /api/auth/login` gửi dạng form (`application/x-www-form-urlencoded`) với `username` (là email) và `password`. Các request sau gửi header `Authorization: Bearer <access_token>`. Token sống 60 phút, chưa có refresh token; hết hạn API trả 401 và Frontend đưa người dùng về trang đăng nhập.
- **Thời gian:** ISO 8601 có múi giờ, ví dụ `2026-11-10T08:00:00+07:00`. Thiếu múi giờ sẽ bị 422. Response trả giờ UTC (có offset), Frontend đổi sang giờ Việt Nam khi hiển thị.
- **Phân trang:** `page` (từ 1) và `size` (mặc định 20, tối đa 100). Response: `{ "items": [...], "total": n, "page": 1, "size": 20 }`.
- **Định dạng lỗi thống nhất:** `{ "code": "...", "message": "...", "details": {} }`.
- **CORS:** cho phép các origin trong `CORS_ORIGINS` (mặc định http://localhost:5173).

## Giá trị cố định (enum)

| Trường | Giá trị |
|---|---|
| role | student, lecturer, admin |
| booking.status | pending, approved, rejected, cancelled |
| room.status | active, maintenance |
| special_needs | leg_injury, wheelchair |
| facilities | projector, microphone, whiteboard, air_conditioner, computer, video_conference |

## Danh sách endpoint

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Auth | POST /api/auth/register, POST /api/auth/login | Công khai |
| Users | GET, PATCH /api/users/me | Đăng nhập |
| Rooms | GET /api/rooms, GET /api/rooms/{id} | Đăng nhập |
| Rooms | POST /api/rooms, PATCH /api/rooms/{id}, PATCH /api/rooms/{id}/status | Admin |
| Bookings | POST /api/bookings/recommendations (chỉ gợi ý, không tạo đơn) | Đăng nhập |
| Bookings | POST /api/bookings, GET /api/bookings/me, GET /api/bookings/{id}, POST /api/bookings/{id}/cancel | Đăng nhập (xem đơn người khác: chỉ admin) |
| Approval | GET /api/bookings/pending, POST /api/bookings/{id}/approve, POST /api/bookings/{id}/reject | Admin |
| Reports | GET /api/reports/summary, /occupancy, /peak-hours | Admin |

Luồng đặt phòng gợi ý: gọi `recommendations` để hiện danh sách phòng kèm điểm, người dùng chọn phòng rồi gọi `POST /api/bookings`. Nếu trùng lịch, API trả 409 `ROOM_CONFLICT` kèm `details.suggestions` (tối đa 3 phương án thay thế).

## Mã lỗi

| HTTP | code | Khi nào |
|---|---|---|
| 400 | INVALID_TIME_RANGE | Giờ kết thúc không sau giờ bắt đầu, hoặc đơn dài quá 12 giờ |
| 400 | PAST_TIME | Đặt phòng trong quá khứ |
| 400 | ROOM_NOT_SUITABLE | Phòng không phù hợp; `details.reasons` gồm ROOM_UNAVAILABLE, CAPACITY_TOO_SMALL, ACCESSIBILITY_REQUIRED |
| 400 | INVALID_DATE_RANGE | Báo cáo: khoảng ngày sai hoặc quá 366 ngày |
| 401 | UNAUTHORIZED, TOKEN_EXPIRED, INVALID_CREDENTIALS | Chưa đăng nhập, token hết hạn, sai email/mật khẩu |
| 403 | FORBIDDEN | Không đủ quyền |
| 403 | SPECIAL_ROOM_NOT_ALLOWED | Chưa được cấp quyền đặt phòng đặc biệt |
| 404 | NOT_FOUND | Không tìm thấy |
| 409 | ROOM_CONFLICT | Trùng lịch (kèm `details.suggestions`), hoặc phòng bị chiếm khi duyệt |
| 409 | EMAIL_EXISTS, ROOM_CODE_EXISTS | Trùng email / mã phòng |
| 409 | BOOKING_NOT_CANCELLABLE | Đơn không hủy được (đã hủy, đã từ chối, hoặc đã đến giờ) |
| 409 | BOOKING_NOT_PENDING | Đơn không còn chờ duyệt |
| 409 | ROOM_UNAVAILABLE | Duyệt đơn khi phòng đang bảo trì |
| 422 | VALIDATION_ERROR | Dữ liệu sai; `details.errors` liệt kê từng trường (ví dụ reject thiếu `reason`) |

## Quy tắc nghiệp vụ cần biết

- **Đơn chờ duyệt** tự hủy sau 48 giờ (hoặc khi đến giờ bắt đầu, tùy mốc nào đến trước); đơn đó hiện `cancelled` kèm `reject_reason`.
- **Phòng chuyển bảo trì:** mọi đơn tương lai của phòng (chờ duyệt và đã duyệt) tự chuyển `cancelled` với lý do "Phòng chuyển sang bảo trì.".
- **Hủy đơn:** chủ đơn hoặc admin, chỉ trước giờ bắt đầu.
- **Hàng đợi duyệt** đã sắp xếp sẵn: đơn Giảng viên trước, rồi theo thời điểm tạo.
- **special_needs** là thông tin sức khỏe, chỉ trả về cho chính chủ qua `/api/users/me`, không xuất hiện trong dữ liệu admin hay đơn đặt phòng.
- **Báo cáo:** tính theo giờ Việt Nam; tỷ lệ lấp đầy chỉ tính đơn approved trong khung 07:00-21:00; giờ cao điểm tính đơn approved và pending theo giờ bắt đầu.

## Kiểm thử

```powershell
pytest -q
```

## Cấu trúc thư mục

```text
app/
  main.py  config.py  database.py  models.py  schemas*.py  enums.py
  security.py  deps.py  errors.py  timeutil.py
  routers/   auth, users, rooms, bookings, approval, reports
  services/  needs, scoring, recommend, booking, booking_create, approval, reports
scripts/seed.py   dữ liệu mẫu
tests/            unit test và test API
```

## Lưu ý khi triển khai thật

- Dev dùng SQLite. Production nên dùng PostgreSQL (`DATABASE_URL=postgresql+psycopg2://...` và cài `psycopg2-binary`); khóa chống trùng lịch dùng `SELECT ... FOR UPDATE`.
- Khóa chống trùng lịch trong tiến trình chỉ đủ cho 1 worker; chạy nhiều worker cần PostgreSQL.
- Đổi `SECRET_KEY`, không commit file `.env`.
- Khi đổi cấu trúc bảng trong lúc dev: xóa `roombook.db` rồi chạy lại seed. Có dữ liệu thật thì dùng Alembic.