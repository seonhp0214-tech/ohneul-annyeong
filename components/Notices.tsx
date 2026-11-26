"use client";
import { useState } from "react";
import { formatAgo, type Notice, type State } from "@/lib/store";
import { Icon, type IconName } from "./Icons";

// 알림 소식: 24시간(주의)·48시간(도움 필요) 알림과 SOS 기록. (디자인시스템 NoticeCard)
// 단계 색은 위쪽 띠에만 쓰고, 아래 내용은 모두 흰 카드 + 같은 글자색이에요.
const LOOK: Record<Notice["kind"], { band: string; border: string; icon: IconName; label: string; title: string }> = {
  reminder: { band: "bg-sun text-on-sun", border: "border-sun", icon: "warn", label: "주의", title: "안부가 하루 지났어요" },
  missed: { band: "bg-sos text-on-sos", border: "border-sos", icon: "alert", label: "도움 필요", title: "이틀째 안부가 없어요" },
  sos: { band: "bg-info text-on-info", border: "border-info", icon: "siren", label: "도움 요청", title: "도움 요청을 보냈어요" },
  info: { band: "bg-brand-soft text-ink", border: "border-line-strong", icon: "bell", label: "알림", title: "알림" },
};

export default function Notices({ state }: { state: State }) {
  const [now] = useState(() => Date.now());
  return (
    <section className="flex flex-col gap-4">
      {state.notices.length === 0 ? (
        <p className="t-body text-ink-muted">아직 알림이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {state.notices.map((n) => {
            const look = LOOK[n.kind];
            return (
              <li key={n.id} className={`overflow-hidden rounded-lg border-[3px] bg-surface-raised shadow-card ${look.border}`}>
                <div className={`flex items-center gap-3 px-6 py-3 ${look.band}`}>
                  <Icon name={look.icon} size={34} className="shrink-0" />
                  <span className="text-[28px] font-bold leading-10">{look.label}</span>
                </div>
                <div className="flex flex-col gap-2 p-6">
                  <p className="t-heading">{look.title}</p>
                  <p className="t-body">{n.text}</p>
                  <p className="t-caption text-ink-muted">{formatAgo(now - n.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
