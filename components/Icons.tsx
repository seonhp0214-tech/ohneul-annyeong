// 디자인시스템 "오늘도 안녕"의 선 아이콘 (선 두께 2.2, 둥근 끝, 24칸 격자). 글자 색(currentColor)을 따라가요.
const ICONS = {
  home: <path d="M4 11l8-7 8 7v8.5a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1V11z" />,
  neighbors: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14c2.6 0 4.5 1.5 4.5 4" />
    </>
  ),
  bell: <path d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 20.5a2 2 0 004 0" />,
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20c0-4 3.5-6 7.5-6s7.5 2 7.5 6" />
    </>
  ),
  phone: (
    <path d="M6.5 4h3l1.5 4-2 1.3a11 11 0 005.7 5.7L16 13l4 1.5v3a2 2 0 01-2.2 2A15.5 15.5 0 014.5 6.2 2 2 0 016.5 4z" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  warn: <path d="M12 4l9 16H3L12 4zM12 10v4M12 17v.5" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5v.5" />
    </>
  ),
  siren: <path d="M7 18v-6a5 5 0 0110 0v6M4 18h16v3H4zM12 3v2M4.5 6l1.5 1.2M19.5 6L18 7.2" />,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}
