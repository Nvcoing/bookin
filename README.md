# BookIn - Room Booking System

Hệ thống quản lý và đặt phòng học / phòng họp.

## Cấu trúc dự án

Dự án được phân chia thành 2 phần độc lập:

- **`backend/`**: Hệ thống backend REST API xây dựng bằng **FastAPI**, **SQLAlchemy** (SQLite) và Pydantic.
  - Xem hướng dẫn chi tiết tại [`backend/README.md`](backend/README.md).
  - Khởi chạy server: `uvicorn app.main:app --reload` (port 8000).
- **`frontend/`**: Giao diện người dùng xây dựng bằng **React 19**, **Vite**, **Tailwind CSS v4** và **TypeScript**.
  - Xem hướng dẫn chi tiết tại [`frontend/AGENTS.md`](frontend/AGENTS.md).
  - Khởi chạy dev server: `npm run dev` hoặc `pnpm dev`.
