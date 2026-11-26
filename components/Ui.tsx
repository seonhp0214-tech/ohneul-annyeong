import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icons";

// 여러 화면이 함께 쓰는 작은 부품들 (디자인시스템 Avatar / Button 칩 / 오류 문구 / 화면 위 바 / AlertLevel)

/** 버튼 오른쪽의 동그란 칩 (화살표 또는 체크). 버튼 안에서만 써요. */
export function Ar({ icon = "arrow", size = 30 }: { icon?: IconName; size?: number }) {
  return (
    <span className="ar" aria-hidden="true">
      <Icon name={icon} size={size} />
    </span>
  );
}

/** 이름 첫 글자 원. link: connected(파란 고리 + 체크), pending(회색 고리) */
export function Avatar({
  name,
  size = 56,
  link,
}: {
  name: string;
  size?: number;
  link?: "connected" | "pending";
}) {
  const ring =
    link === "connected"
      ? "0 0 0 3px var(--surface-raised), 0 0 0 6px var(--info)"
      : link === "pending"
        ? "0 0 0 3px var(--surface-raised), 0 0 0 5px var(--line-strong)"
        : undefined;
  const badge = Math.max(22, Math.round(size * 0.36));
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        aria-hidden="true"
        className="flex items-center justify-center rounded-full bg-brand-soft font-bold leading-none text-ink"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.4), boxShadow: ring }}
      >
        {name.slice(0, 1)}
      </span>
      {link === "connected" && (
        <span
          aria-hidden="true"
          className="absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border-[3px] border-surface-raised bg-info text-on-info"
          style={{ width: badge, height: badge }}
        >
          <Icon name="check" size={Math.round(badge * 0.55)} />
        </span>
      )}
    </span>
  );
}

export function ErrorMsg({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="t-body-strong flex items-start gap-2 text-sos-ink">
      <Icon name="alert" size={24} className="mt-1 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** 화면 위 바: 왼쪽 "이전"(안쪽 화면일 때), 가운데 제목 */
export function ScreenBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="screen-bar">
      {onBack ? (
        <button type="button" onClick={onBack} className="screen-back">
          <Icon name="back" size={28} />
          이전
        </button>
      ) : (
        <span />
      )}
      <h1 className="screen-title">{title}</h1>
      <span />
    </div>
  );
}

/** 안부 단계 카드: 칸 수 + 글자로 구분 (level 2 = 주의, 3 = 도움 필요) */
export function AlertLevel({ level, title, text }: { level: 2 | 3; title: string; text: string }) {
  return (
    <section className={`al ${level === 3 ? "al-bad" : "al-warn"}`} aria-label="지금 안부 상태">
      <p className="t-caption font-bold">지금 안부 상태</p>
      <div className="al-track" aria-hidden="true">
        <span className="on" />
        <span className={level >= 2 ? "on" : ""} />
        <span className={level >= 3 ? "on" : ""} />
      </div>
      <div className="al-lab" aria-hidden="true">
        <span>확인됨</span>
        <span>하루</span>
        <span>이틀</span>
      </div>
      <p className="t-heading flex items-center gap-2">
        <Icon name={level === 3 ? "alert" : "warn"} size={28} className="shrink-0" />
        {title}
      </p>
      <p className="t-body">{text}</p>
    </section>
  );
}
