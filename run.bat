@echo off
chcp 65001 >nul
title BookIn VNU-IS - Local Development Server

echo ==================================================================
echo     BOOKIN (VNU-IS) - HỆ THỐNG QUẢN LÝ VÀ ĐẶT PHÒNG HỌC          
echo     Khởi động môi trường phát triển cục bộ trên Windows...        
echo ==================================================================

cd /d "%~dp0"

echo [1/5] Kiểm tra môi trường...
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Không tìm thấy Python. Vui lòng cài đặt Python 3.10+ từ https://www.python.org/
    pause
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Không tìm thấy Node.js. Vui lòng cài đặt Node.js 18+ từ https://nodejs.org/
    pause
    exit /b 1
)

echo [2/5] Thiết lập môi trường ảo Backend...
if not exist "backend\venv" (
    echo   - Đang tạo Python Virtual Environment...
    python -m venv backend\venv
)

echo   - Cài đặt / cập nhật thư viện backend...
backend\venv\Scripts\pip install -q --upgrade pip
backend\venv\Scripts\pip install -q -r backend\requirements.txt

if not exist "backend\.env" (
    echo   - Đang tạo file backend\.env mặc định...
    (
        echo DATABASE_URL=sqlite:///./roombook.db
        echo SECRET_KEY=vnu-is-local-dev-secret-key-2026-production
        echo ACCESS_TOKEN_EXPIRE_MINUTES=120
        echo CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
        echo PENDING_EXPIRE_HOURS=48
    ) > backend\.env
)

echo   - Đồng bộ cơ sở dữ liệu và seed dữ liệu ban đầu...
cd backend
venv\Scripts\python scripts\seed.py >nul 2>nul
cd ..

echo [3/5] Thiết lập môi trường Frontend...
if not exist "frontend\node_modules" (
    echo   - Đang cài đặt node modules...
    cd frontend
    call npm.cmd install
    cd ..
)

echo [4/5] Khởi chạy song song Backend (cổng 8000) và Frontend (cổng 5173)...
start "BookIn Backend (FastAPI)" cmd /k "cd backend && venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
start "BookIn Frontend (Vite)" cmd /k "cd frontend && call npm.cmd run dev -- --host 0.0.0.0 --port 5173"

echo ==================================================================
echo     HỆ THỐNG BOOKIN VNU-IS ĐÃ ĐƯỢC KHỞI CHẠY!                   
echo ==================================================================
echo   * Web Frontend:    http://localhost:5173
echo   * Đăng nhập:       http://localhost:5173/dang-nhap
echo   * API Docs:        http://localhost:8000/docs
echo.
echo   TÀI KHOẢN MẪU:
echo   - Admin:     admin@vnu.edu.vn    / Admin@123
echo   - Giảng viên: lecturer@vnu.edu.vn / Lecturer@123
echo   - Sinh viên:  student@vnu.edu.vn  / Student@123
echo ==================================================================
echo [Bạn có thể đóng cửa sổ này, 2 server đang chạy ở 2 cửa sổ riêng]
pause

