import { useEffect, useState, type ReactNode } from "react";

export function PageHeader({
  tag,
  title,
  description,
  actions,
}: {
  tag?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {tag && <span className="category-tag">{tag}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active: ["ok", "Hoạt động"],
    approved: ["ok", "Đã duyệt"],
    pending: ["warn", "Chờ duyệt"],
    maintenance: ["warn", "Bảo trì"],
    rejected: ["danger", "Từ chối"],
    cancelled: ["neutral", "Đã hủy"],
  };
  const [tone, label] = map[status] || ["neutral", status];
  return <span className={`status ${tone}`}>{label}</span>;
}

export function LoadingState() {
  return (
    <div className="state-box">
      <span className="loader" />
      Đang tải dữ liệu từ máy chủ...
    </div>
  );
}

export function EmptyState({ text = "Hiện không có dữ liệu phù hợp." }: { text?: string }) {
  return <div className="state-box">{text}</div>;
}

export function ErrorState({ text = "Không thể tải dữ liệu. Vui lòng thử lại sau." }: { text?: string }) {
  return <div className="alert danger">{text}</div>;
}

export function Toast({
  message,
  tone = "ok",
  onClose,
}: {
  message: string;
  tone?: "ok" | "danger";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`toast ${tone}`}>
      <span>{message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Đóng">
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "danger" } | null>(null);
  return {
    showToast: (message: string, tone: "ok" | "danger" = "ok") => setToast({ message, tone }),
    toastNode: toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null,
  };
}

export function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>
        {label}
        {required && <b style={{ color: "#ef4444" }}> *</b>}
      </span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
