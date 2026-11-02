import { useEffect, useState, type ReactNode } from "react";

export function PageHeader({ module, title, description, actions }: { module: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-header"><div><span className="module-label">{module}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    active: ["ok", "Hoạt động"], approved: ["ok", "Đã duyệt"],
    pending: ["warn", "Chờ duyệt"], maintenance: ["warn", "Bảo trì"],
    rejected: ["danger", "Từ chối"], cancelled: ["neutral", "Đã hủy"],
  };
  const [tone, label] = map[status] || ["neutral", status];
  return <span className={`status ${tone}`}>{label}</span>;
}

export function LoadingState() { return <div className="state-box"><span className="loader" />Đang tải dữ liệu...</div>; }
export function EmptyState({ text = "Không có dữ liệu phù hợp." }: { text?: string }) { return <div className="state-box">{text}</div>; }
export function ErrorState({ text = "Không thể tải dữ liệu. Vui lòng thử lại." }: { text?: string }) { return <div className="alert danger">{text}</div>; }

export function Toast({ message, tone = "ok", onClose }: { message: string; tone?: "ok" | "danger"; onClose: () => void }) {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return <div className={`toast ${tone}`}>{message}<button className="toast-close" onClick={onClose} aria-label="Đóng">Đóng</button></div>;
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: "ok" | "danger" } | null>(null);
  return { showToast: (message: string, tone: "ok" | "danger" = "ok") => setToast({ message, tone }), toastNode: toast ? <Toast {...toast} onClose={() => setToast(null)} /> : null };
}

export function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: ReactNode }) {
  return <label className="field"><span>{label}{required && <b> *</b>}</span>{children}{error && <small className="field-error">{error}</small>}</label>;
}
