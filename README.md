# BookIn (VNU-IS) · Hệ Thống Quản Lý & Đặt Phòng Học Trực Tuyến

> **Trường Quốc tế – Đại học Quốc gia Hà Nội (VNU-IS)**  
> 🌐 **Hệ thống Production:** [https://bookin-vnu-is.vercel.app/dang-nhap](https://bookin-vnu-is.vercel.app/dang-nhap)  
> 🏛 **Kiến trúc:** Monorepo (FastAPI + React 19 + Supabase Cloud PostgreSQL)

---

## 📚 Mục Lục Tài Liệu Hệ Thống

Để thuận tiện cho công tác đánh giá, phát triển và vận hành, toàn bộ tài liệu hệ thống đã được phân loại chi tiết thành các tài liệu độc lập:

1. 📘 **[Tài Liệu Kỹ Thuật (TECHNICAL.md)](TECHNICAL.md)**:
   * Tổng quan kiến trúc hệ thống, Tech Stack.
   * Thiết kế cơ sở dữ liệu (ERD), mô tả chi tiết các bảng `users`, `rooms`, `bookings`.
   * **Thuật toán Đề xuất & Chấm điểm phòng thông minh** (Hard Filters + Soft Scoring 100 điểm: Sức khỏe/vận động 40đ, Thiết bị 30đ, Sức chứa 20đ, Khoa 10đ).
   * Danh sách toàn bộ các API Endpoints (Auth, Users, Rooms, Bookings, Approval, Reports).
   * Cơ chế Vercel Serverless Function & Supabase Connection Pooling (Port 6543, lọc tham số libpq).

2. 📗 **[Cẩm Nang Hướng Dẫn Sử Dụng (USER_GUIDE.md)](USER_GUIDE.md)**:
   * Hướng dẫn sử dụng trực tiếp trên website thực tế [https://bookin-vnu-is.vercel.app/dang-nhap](https://bookin-vnu-is.vercel.app/dang-nhap).
   * **Danh sách tài khoản kiểm thử sẵn có**: Quản trị viên (`admin@vnu.edu.vn`), Giảng viên (`lecturer@vnu.edu.vn`), Sinh viên (`student@vnu.edu.vn`).
   * Quy trình dành cho Sinh viên & Giảng viên: Đăng ký (@vnu.edu.vn), Đăng nhập, Tra cứu phòng, Đặt phòng & xem gợi ý AI, Quản lý & Hủy đơn.
   * Quy trình dành cho Quản trị viên: Hàng đợi duyệt ưu tiên, Phát hiện xung đột lịch, Duyệt/Từ chối, Quản lý phòng, Khai thác Báo cáo & Phân tích (Biểu đồ giờ/thứ, đồng hồ công suất, bảng xếp hạng).

3. 📙 **[Hướng Dẫn Cài Đặt & Triển Khai (SETUP.md)](SETUP.md)**:
   * Yêu cầu môi trường (Python 3.10+, Node.js 18+, npm/pnpm).
   * Hướng dẫn chạy nhanh 1 bước qua `run.sh` và hướng dẫn cài đặt thủ công chi tiết.
   * Bảng giải thích chi tiết các biến môi trường (`.env`).
   * Hướng dẫn chạy kiểm thử tự động (35 test cases backend, frontend build).
   * Hướng dẫn triển khai lên Vercel + Supabase và các lỗi thường gặp (Troubleshooting).

4. 🚀 **[Script Khởi Động Nhanh (run.sh)](run.sh)**:
   * Script Bash tự động thiết lập full môi trường (Python venv, dependencies, .env, seed DB, npm install) và khởi chạy song song Backend (`port 8000`) và Frontend (`port 5173`).

---

## ⚡ Khởi Động Nhanh Local (Quick Run)

```bash
# Cấp quyền thực thi và chạy script tự động
chmod +x run.sh
./run.sh
```

Truy cập:
* **Frontend Web:** [http://localhost:5173](http://localhost:5173)
* **Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
