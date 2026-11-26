"use client";
import { useState } from "react";
import { formatAgo, type Notice, type State } from "@/lib/store";
import { Icon, type IconName } from "./Icons";

// 알림 화면: 24시간(주의)·48시간(도움 필요) 알림과 SOS 기록. (디자인시스템 NoticeCard)
const LOOK: Record<Notice["kind"], { cls: string; icon: IconName; title: string }> = {
  reminder: { cls: "bg-warn-soft text-warn-ink", icon: "warn", title: "주의 · 안부가 하루 지났어요" },
  missed: { cls: "bg-sos-soft text-sos-ink", icon: "alert", title: "도움 필요 · 이틀째 안부가 없어요" },
  sos: { cls: "bg-brand-soft text-ink", icon: "siren", title: "도움 요청을 보냈어요" },
  info: { cls: "bg-surface-raised text-ink", icon: "bell", title: "알림" },
};

export default function Notices({ state }: { state: State }) {
  const [now] = useState(() => Date.now());
  return (
    <section className="flex flex-col gap-4">
      <h1 className="t-heading">알림</h1>
      {state.notices.length === 0 ? (
        <p className="t-body text-ink-muted">아직 알림이 없어요.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {state.notices.map((n) => {
            const look = LOOK[n.kind];
            return (
              <li key={n.id} className={`flex flex-col gap-2 rounded-md p-4 ${look.cls}`}>
                <p className="t-heading flex items-center gap-2">
                  <Icon name={look.icon} size={28} className="shrink-0" />
                  {look.title}
                </p>
                <p className="t-body">{n.text}</p>
                <p className="t-caption">{formatAgo(now - n.at)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
