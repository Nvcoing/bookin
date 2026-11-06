# Hướng Dẫn Cài Đặt, Cấu Hình & Triển Khai BookIn (VNU-IS)
> **Tài liệu Kỹ thuật Dành cho Lập trình viên & Quản trị Hệ thống**  
> Dự án: Hệ thống Quản lý và Đặt phòng BookIn VNU-IS  
> Phiên bản: 1.0.0 Production Ready

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

Trước khi tiến hành cài đặt, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

1. **Python**: Phiên bản `3.10` trở lên (Khuyến nghị Python 3.11 hoặc 3.12).
   * Kiểm tra: `python --version` hoặc `python3 --version`.
2. **Node.js**: Phiên bản `18.0.0` trở lên (Khuyến nghị Node.js 20 LTS hoặc mới hơn).
   * Kiểm tra: `node -v`.
3. **Trình quản lý gói**: `npm` (đi kèm Node.js) hoặc `pnpm`.
   * Kiểm tra: `npm -v`.
4. **Git**: Phiên bản `2.30` trở lên.
   * Kiểm tra: `git --version`.

---

## 2. Khởi Động Nhanh Bằng 1 Lệnh (Quick Start)

Dự án đã tích hợp sẵn script tự động hóa [`run.sh`](run.sh). Script này sẽ tự động:
* Khởi tạo Python Virtual Environment (`venv`).
* Cài đặt toàn bộ thư viện backend và frontend.
* Tự động sinh file `.env` mẫu và seed dữ liệu CSDL ban đầu nếu chưa có.
* Chạy song song cả Backend FastAPI (`port 8000`) và Frontend Vite (`port 5173`).

### Cách thực hiện:
Mở Terminal (Linux / macOS / Git Bash hoặc WSL trên Windows) và chạy:

```bash
chmod +x run.sh
./run.sh
```

Sau khi khởi động thành công:
* **Giao diện Web**: [http://localhost:5173](http://localhost:5173)
* **Tài liệu Swagger API**: [http://localhost:8000/docs](http://localhost:8000/docs)
* Bấm `Ctrl + C` để dừng an toàn tất cả các dịch vụ.

---

## 3. Cài Đặt & Chạy Thủ Công Từng Bước (Manual Setup)

Nếu bạn muốn cấu hình từng phần độc lập để gỡ lỗi hoặc phát triển tính năng, hãy làm theo các bước dưới đây:

### Bước 3.1: Cấu hình và Chạy Backend (FastAPI)

1. **Mở terminal và di chuyển vào thư mục backend**:
   ```bash
   cd backend
   ```

2. **Tạo môi trường ảo Python (Virtual Environment)**:
   ```bash
   # Trên Linux / macOS:
   python3 -m venv venv
   source venv/bin/activate

   # Trên Windows (Command Prompt hoặc PowerShell):
   python -m venv venv
   .\venv\Scripts\activate
   ```

3. **Cài đặt các gói phụ thuộc (Dependencies)**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Tạo file cấu hình môi trường `.env`**:
   Tạo file `backend/.env` với nội dung mẫu:
   ```env
   # Sử dụng SQLite cục bộ để chạy thử nghiệm nhanh:
   DATABASE_URL=sqlite:///./roombook.db

   # Hoặc kết nối Supabase PostgreSQL Cloud (Xem mục 4 để biết chi tiết):
   # DATABASE_URL=postgres://postgres.sytpztxwzyjvmprueqei:mat_khau@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require

   SECRET_KEY=vnu-is-super-secret-jwt-key-2026-production
   ACCESS_TOKEN_EXPIRE_MINUTES=120
   CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   PENDING_EXPIRE_HOURS=48
   ```

5. **Khởi tạo dữ liệu mẫu ban đầu (Seed Database)**:
   ```bash
   python scripts/seed.py
   ```
   *Lệnh này sẽ tự động khởi tạo bảng, tạo tài khoản Admin (`admin@vnu.edu.vn` / `Admin@123`), Giảng viên, Sinh viên và danh mục các phòng học thuộc tòa A1, A2, B3, C1.*

6. **Khởi chạy Backend Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Kiểm tra API hoạt động tại: `http://localhost:8000/api/health` hoặc xem Swagger UI tại `http://localhost:8000/docs`.*

---

### Bước 3.2: Cấu hình và Chạy Frontend (React 19 + Vite)

Mở một cửa sổ terminal mới:

1. **Di chuyển vào thư mục frontend**:
   ```bash
   cd frontend
   ```

2. **Cài đặt thư viện npm**:
   ```bash
   npm install
   ```

3. **Khởi chạy Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   *Hệ thống sẽ chạy tại [http://localhost:5173](http://localhost:5173). Mọi yêu cầu API `/api/*` sẽ được Vite tự động chuyển tiếp (proxy) ngầm tới `http://127.0.0.1:8000`.*

---

## 4. Chi Tiết Các Biến Môi Trường (Environment Variables)

Bảng giải thích cấu hình trong file `backend/.env` hoặc trên Vercel:

| Biến môi trường | Giá trị mặc định | Giải thích chi tiết |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///./roombook.db` | Chuỗi kết nối CSDL (hỗ trợ SQLite hoặc Supabase PostgreSQL). |
| `POSTGRES_URL` | *(Trống)* | Tự động nhận diện nếu triển khai qua tiện ích mở rộng Vercel Postgres / Supabase. |
| `SECRET_KEY` | *(Chuỗi ngẫu nhiên)* | Khóa bí mật dùng để ký và giải mã JWT Access Token. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Thời gian sống của phiên đăng nhập (phút). |
| `CORS_ORIGINS` | `http://localhost:5173` | Danh sách tên miền được phép gọi API (phân cách bằng dấu phẩy). |
| `PENDING_EXPIRE_HOURS` | `48` | Thời hạn tối đa để duyệt một đơn trước khi tự động hủy. |

### Cấu hình chuỗi kết nối Supabase Pooler chuẩn:
Khi sử dụng Supabase trên môi trường Serverless (Vercel), bạn bắt buộc phải dùng **Connection Pooling (Port 6543 - PgBouncer Transaction Mode)** thay vì Direct Connection (Port 5432):
```
DATABASE_URL=postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

---

## 5. Chạy Kiểm Thử Tự Động (Automated Testing)

Dự án đi kèm bộ 35 kịch bản kiểm thử tự động, kiểm tra từ xác thực phân quyền, nghiệp vụ đặt phòng, thuật toán gợi ý điểm đến xử lý xung đột:

### Chạy Backend Tests:
```bash
# Đảm bảo virtual environment đang được kích hoạt:
cd backend
pytest -v
```
*Kết quả kỳ vọng: `35 passed in X.XXs`.*

### Chạy Frontend Build Check:
```bash
cd frontend
npm run build
```
*Kết quả kỳ vọng: Vite biên dịch TypeScript và tối ưu bundle thành công (`dist/`), không có lỗi cú pháp.*

---

## 6. Hướng Dẫn Triển Khai Lên Vercel + Supabase

Hệ thống đã được thiết kế sẵn sàng cho kiến trúc **Serverless Monorepo** trên Vercel.

```mermaid
flowchart LR
    Dev["Developer Git Push"] -->|Nhánh main| GitHub["GitHub Repository (Nvcoing/bookin)"]
    GitHub -->|Webhook Trigger| VercelBuild["Vercel CI/CD Build Engine"]
    
    subgraph Vercel Pipeline
        VercelBuild --> Step1["1. npm --prefix frontend install && build"]
        VercelBuild --> Step2["2. Build Serverless Function (api/index.py)"]
        VercelBuild --> Step3["3. Route Rewrites theo vercel.json"]
    end
    
    VercelPipeline --> LiveDomain["https://bookin-vnu-is.vercel.app"]
```

### Các bước triển khai:

1. **Khởi tạo cơ sở dữ liệu trên Supabase**:
   * Tạo Project mới tại [Supabase Dashboard](https://supabase.com).
   * Vào **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection Pooling**.
   * Sao chép URI kết nối ở chế độ **Transaction (Port 6543)**.

2. **Cấu hình trên Vercel Dashboard**:
   * Đăng nhập [Vercel](https://vercel.com) và chọn **Add New Project**.
   * Kết nối với repository GitHub của dự án (`bookin`).
   * **Framework Preset**: Chọn `Vite` (hoặc `Other`).
   * **Root Directory**: Để trống (`./`).
   * **Environment Variables**: Thêm các biến sau:
     * `POSTGRES_URL`: Điền URI Pooler port 6543 của Supabase đã lấy ở Bước 1.
     * `SECRET_KEY`: Chuỗi bí mật dài bảo mật (ví dụ: `vnu-is-production-secret-jwt-key`).
     * `CORS_ORIGINS`: `https://bookin-vnu-is.vercel.app`.

3. **Cơ chế Deployment Tự Động**:
   * Theo đúng quy trình vận hành:
     1. Lập trình viên hoàn thiện tính năng và đẩy code lên nhánh `vucn`:  
        `git push origin vucn`
     2. Merge nhánh `vucn` vào nhánh `main`:  
        `git checkout main && git merge vucn && git push origin main`
     3. Vercel sẽ tự động kích hoạt tiến trình build và deploy lên domain chính thức `https://bookin-vnu-is.vercel.app` trong vòng 1-2 phút.

---

## 7. Xử Lý Các Sự Cố Thường Gặp (Troubleshooting)

### 1. Lỗi `sqlalchemy.exc.ProgrammingError: invalid connection option "supa"`
* **Nguyên nhân**: Tiện ích Supabase trên Vercel tự động gắn tham số `&supa=base-pooler.x` hoặc `&pgbouncer=true` vào connection string, gây lỗi cú pháp trên driver `psycopg2`.
* **Cách khắc phục**: Mã nguồn tại `backend/app/config.py` đã tích hợp sẵn cơ chế lọc whitelist `_VALID_LIBPQ_PARAMS` để tự động bóc tách các tham số lạ trước khi nạp vào SQLAlchemy. Đảm bảo bạn đang sử dụng phiên bản code mới nhất trên nhánh `main`.

### 2. Lỗi `PSSecurityException` trên Windows PowerShell
* **Nguyên nhân**: Chính sách Execution Policy của Windows chặn thực thi script `.ps1` khi chạy `npm` hoặc `npx`.
* **Cách khắc phục**:
  * Thay vì gõ `npm`, hãy dùng `npm.cmd` hoặc `npx.cmd`.
  * Hoặc mở PowerShell với quyền Administrator và chạy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`.

### 3. Lỗi Trùng Cổng (Port in use - 8000 hoặc 5173)
* **Nguyên nhân**: Tiến trình cũ chưa được tắt hoàn toàn.
* **Cách khắc phục**:
  * Trên Windows:
    ```powershell
    netstat -ano | findstr :8000
    taskkill /PID <PID_NUMBER> /F
    ```
  * Trên Linux / macOS:
    ```bash
    lsof -ti :8000 | xargs kill -9
    lsof -ti :5173 | xargs kill -9
    ```

### 4. Lỗi CORS khi gọi API từ Frontend
* **Nguyên nhân**: Địa chỉ frontend không nằm trong danh sách `CORS_ORIGINS` của backend.
* **Cách khắc phục**: Mở file `backend/.env` và bổ sung URL frontend vào biến `CORS_ORIGINS`, ví dụ:
  ```env
  CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://bookin-vnu-is.vercel.app
  ```

