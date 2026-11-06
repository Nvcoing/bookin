export function BookInIcon({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="logoPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logoPrimary)" />
      {/* Arch / Room Door Frame */}
      <path
        d="M18 16C18 13.7909 19.7909 12 22 12H42C44.2091 12 46 13.7909 46 16V52H18V16Z"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.95"
      />
      {/* Open Door 3D Perspective */}
      <path
        d="M22 16L39 21V47L22 48V16Z"
        fill="white"
        fillOpacity="0.22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Door Handle & Marker */}
      <circle cx="34" cy="33" r="2.8" fill="url(#logoGold)" />
      <path d="M30 18H34" stroke="url(#logoGold)" strokeWidth="3" strokeLinecap="round" />
      <path d="M26 52H38" stroke="url(#logoGold)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 52H50" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BookInLogo({
  variant = "light",
  compact = false,
  size = 38,
}: {
  variant?: "light" | "dark";
  compact?: boolean;
  size?: number;
}) {
  const isLight = variant === "light";
  return (
    <div className={`brand-container ${compact ? "compact" : ""}`} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <BookInIcon size={size} />
      {!compact && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: size >= 40 ? 22 : 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
                color: isLight ? "#ffffff" : "#0f172a",
              }}
            >
              Book<span style={{ color: isLight ? "#38bdf8" : "#2563eb" }}>In</span>
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 5px",
                borderRadius: 4,
                letterSpacing: "0.5px",
                background: isLight ? "rgba(56, 189, 248, 0.2)" : "#eff6ff",
                color: isLight ? "#7dd3fc" : "#1d4ed8",
                border: isLight ? "1px solid rgba(56, 189, 248, 0.4)" : "1px solid #bfdbfe",
              }}
            >
              VNU-IS
            </span>
          </div>
          <small
            style={{
              fontSize: 11,
              marginTop: 2,
              color: isLight ? "#cbd5e1" : "#64748b",
              fontWeight: 500,
            }}
          >
            Hệ thống Quản lý & Đặt phòng
          </small>
        </div>
      )}
    </div>
  );
}
