#!/usr/bin/env bash
# ==============================================================================
# BookIn VNU-IS - Local Development Full Setup & Run Script
# ==============================================================================
# Script tự động:
# 1. Kiểm tra môi trường (Python 3.10+, Node.js, npm).
# 2. Khởi tạo Python virtualenv và cài đặt thư viện backend (requirements.txt).
# 3. Tạo file cấu hình backend/.env và seed CSDL ban đầu (admin, phòng học).
# 4. Cài đặt các gói phụ thuộc frontend (npm install).
# 5. Khởi động đồng thời cả Backend FastAPI (port 8000) và Frontend Vite (port 5173).
# ==============================================================================

set -e

# Chuyển thư mục làm việc về thư mục chứa script
cd "$(dirname "$0")"
PROJECT_ROOT="$(pwd)"

echo "=================================================================="
echo "    BOOKIN (VNU-IS) - HỆ THỐNG QUẢN LÝ VÀ ĐẶT PHÒNG HỌC          "
echo "    Bắt đầu thiết lập môi trường và khởi chạy hệ thống cục bộ...  "
echo "=================================================================="

# --- 1. Kiểm tra công cụ cần thiết ---
echo "[1/5] Kiểm tra môi trường phát triển..."

# Tìm Python 3
PYTHON_BIN=""
if command -v python3 &>/dev/null; then
    PYTHON_BIN="python3"
elif command -v python &>/dev/null; then
    PYTHON_BIN="python"
else
    echo "[!] Lỗi: Không tìm thấy Python. Vui lòng cài đặt Python 3.10+ từ https://www.python.org/"
    exit 1
fi

echo "  -> Đã tìm thấy: $($PYTHON_BIN --version)"

# Kiểm tra Node.js & npm
if ! command -v node &>/dev/null; then
    echo "[!] Lỗi: Không tìm thấy Node.js. Vui lòng cài đặt Node.js 18+ từ https://nodejs.org/"
    exit 1
fi
echo "  -> Đã tìm thấy Node.js: $(node -v)"

NPM_CMD="npm"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" || -n "$WINDIR" ]]; then
    if command -v npm.cmd &>/dev/null; then
        NPM_CMD="npm.cmd"
    fi
fi
echo "  -> Đã tìm thấy npm: $($NPM_CMD -v)"

# --- 2. Cài đặt môi trường Backend ---
echo ""
echo "[2/5] Thiết lập môi trường Backend (Python Virtualenv & Dependencies)..."

VENV_DIR="$PROJECT_ROOT/backend/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "  -> Đang tạo môi trường ảo tại $VENV_DIR..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# Xác định đường dẫn thực thi python và pip trong venv
VENV_PYTHON="$VENV_DIR/bin/python"
VENV_PIP="$VENV_DIR/bin/pip"
VENV_UVICORN="$VENV_DIR/bin/uvicorn"

if [ -f "$VENV_DIR/Scripts/python.exe" ]; then
    VENV_PYTHON="$VENV_DIR/Scripts/python.exe"
    VENV_PIP="$VENV_DIR/Scripts/pip.exe"
    VENV_UVICORN="$VENV_DIR/Scripts/uvicorn.exe"
elif [ -f "$VENV_DIR/Scripts/python" ]; then
    VENV_PYTHON="$VENV_DIR/Scripts/python"
    VENV_PIP="$VENV_DIR/Scripts/pip"
    VENV_UVICORN="$VENV_DIR/Scripts/uvicorn"
fi

echo "  -> Cài đặt và cập nhật thư viện từ backend/requirements.txt..."
"$VENV_PIP" install -q --upgrade pip
"$VENV_PIP" install -q -r "$PROJECT_ROOT/backend/requirements.txt"

# Tạo file backend/.env nếu chưa có
ENV_FILE="$PROJECT_ROOT/backend/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "  -> Đang tạo file cấu hình backend/.env mặc định..."
    cat <<EOF > "$ENV_FILE"
DATABASE_URL=sqlite:///./roombook.db
SECRET_KEY=vnu-is-local-dev-secret-key-2026-production
ACCESS_TOKEN_EXPIRE_MINUTES=120
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PENDING_EXPIRE_HOURS=48
EOF
fi

# Khởi tạo CSDL và seed dữ liệu ban đầu nếu cần
echo "  -> Kiểm tra và đồng bộ cơ sở dữ liệu mẫu..."
(cd "$PROJECT_ROOT/backend" && "$VENV_PYTHON" scripts/seed.py > /dev/null 2>&1 || true)
echo "  -> Cơ sở dữ liệu sẵn sàng!"

# --- 3. Cài đặt môi trường Frontend ---
echo ""
echo "[3/5] Thiết lập môi trường Frontend (React 19 + Vite)..."
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
    echo "  -> Đang cài đặt các gói phụ thuộc frontend qua $NPM_CMD install..."
    (cd "$PROJECT_ROOT/frontend" && $NPM_CMD install)
else
    echo "  -> Thư mục node_modules đã tồn tại, bỏ qua bước install."
fi

# --- 4. Chuẩn bị chạy dịch vụ ---
echo ""
echo "[4/5] Chuẩn bị khởi chạy đồng thời Backend và Frontend..."

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "=================================================================="
    echo "    Đang dừng các dịch vụ BookIn VNU-IS an toàn...               "
    echo "=================================================================="
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill "$FRONTEND_PID" 2>/dev/null || true
    fi
    # Tìm diệt các tiến trình con nếu có trên Windows/Git Bash
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
        taskkill //F //IM uvicorn.exe 2>/dev/null || true
    fi
    echo "    Đã dừng toàn bộ dịch vụ. Hẹn gặp lại!"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Khởi chạy Backend FastAPI
echo "  -> Khởi động Backend FastAPI trên cổng 8000..."
(
    cd "$PROJECT_ROOT/backend"
    "$VENV_UVICORN" app.main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

# Đợi 1 giây để backend khởi động
sleep 1.5

# Khởi chạy Frontend Vite
echo "  -> Khởi động Frontend Vite trên cổng 5173..."
(
    cd "$PROJECT_ROOT/frontend"
    $NPM_CMD run dev -- --host 0.0.0.0 --port 5173
) &
FRONTEND_PID=$!

# --- 5. Thông tin truy cập ---
echo ""
echo "=================================================================="
echo "    HỆ THỐNG BOOKIN VNU-IS ĐÃ KHỞI CHẠY THÀNH CÔNG!              "
echo "=================================================================="
echo ""
echo "  * Giao diện Người dùng:  http://localhost:5173"
echo "  * Trang Đăng nhập:       http://localhost:5173/dang-nhap"
echo "  * Swagger API Docs:      http://localhost:8000/docs"
echo "  * Health Check API:      http://localhost:8000/api/health"
echo ""
echo "  --------------------------------------------------------------"
echo "  DANH SÁCH TÀI KHOẢN MẪU ĐỂ KIỂM THỬ TRÊN MÁY:"
echo "  1. Quản trị viên (Admin): admin@vnu.edu.vn    | Mật khẩu: Admin@123"
echo "  2. Giảng viên (Lecturer): lecturer@vnu.edu.vn | Mật khẩu: Lecturer@123"
echo "  3. Sinh viên (Student):   student@vnu.edu.vn  | Mật khẩu: Student@123"
echo "  --------------------------------------------------------------"
echo ""
echo "  [Nhấn Ctrl + C để dừng tất cả dịch vụ bất cứ lúc nào]"
echo "=================================================================="

# Giữ script chạy và đợi tín hiệu ngắt
wait
