"use client";
import { useEffect, useState } from "react";
import { formatLast, type Actions, type State } from "@/lib/store";
import { Icon } from "./Icons";
import { Ar, AlertLevel, ErrorMsg } from "./Ui";

// 홈: 안부 버튼 하나(연두), 카드 둘(지킴이 이웃, 알림 소식)만 둬요. (디자인시스템 HomeScreen + CheckInHero)
export default function Home({
  state,
  actions,
  go,
}: {
  state: State;
  actions: Actions;
  go: (v: "neighbors" | "notices" | "me") => void;
}) {
  const me = state.me!;
  // 현재 시각은 따로 보관하고 30초마다 새로 읽어요. ("몇 시간 전"이 저절로 바뀌게)
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const hours = (now - me.lastCheckinAt) / 3600000;
  const accepted = state.guardians.filter((g) => g.status === "accepted");
  const pendingRequests = state.watching.filter((w) => w.status === "pending").length;
  const checkedToday = new Date(me.lastCheckinAt).toDateString() === new Date(now).toDateString();
  const dateText = new Date(now).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  const timeText = new Date(me.lastCheckinAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

  const neighborSub =
    state.guardians.length === 0
      ? "아직 등록한 이웃이 없어요"
      : accepted.length === 0
        ? "이웃이 수락하면 지켜 줘요"
        : `${accepted.length}명이 지켜 주고 있어요`;
  const noticeSub = state.notices.length === 0 ? "새 알림이 없어요" : `알림 ${state.notices.length}건`;

  return (
    <div className="flex flex-col gap-4 px-4 pb-48 pt-5">
      <div className="flex h-[72px] items-center justify-between">
        <button onClick={() => go("me")} aria-label="내 정보 보기" className="round-btn">
          <Icon name="person" size={30} />
        </button>
        <span className="t-button">오늘도 안녕</span>
        <button onClick={() => go("notices")} aria-label="알림 소식 보기" className="round-btn">
          <Icon name="bell" size={30} />
        </button>
      </div>

      <section className="hero">
        <span aria-hidden="true" className="hero-c1" />
        <span aria-hidden="true" className="hero-c2" />
        <span className="tag self-start">{dateText}</span>
        {checkedToday ? (
          <>
            <h1 className="t-title">
              오늘도 <mark>안녕</mark>하셨네요
            </h1>
            <div className="done-band">
              <span className="spark">
                <Icon name="check" size={34} />
              </span>
              <div>
                <b className="t-heading block">안부를 보냈어요</b>
                <span className="t-caption text-ink-muted">{timeText} · 내일 또 만나요</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="t-title">
              {me.nickname} 님,
              <br />
              오늘도 <mark>안녕</mark>하신가요?
            </h1>
            <button
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                setError(null);
                const err = await actions.checkin();
                setBusy(false);
                setError(err);
                setNow(Date.now());
              }}
              className="btn btn-primary"
              style={{ fontSize: 28, lineHeight: "36px" }}
            >
              저 괜찮아요
              <Ar icon="check" />
            </button>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <p className="t-caption text-ink-muted">마지막 안부 {formatLast(me.lastCheckinAt, now)}</p>
            <p className="t-caption text-ink-muted">누르면 지킴이 이웃에게 알림 없이 기록만 남아요.</p>
          </>
        )}
      </section>

      {/* 안부 상태: 글자와 아이콘을 함께 (색만으로 알리지 않아요) */}
      {hours >= 48 ? (
        <AlertLevel
          level={3}
          title="도움 필요 · 이틀째 무응답"
          text={accepted.length > 0 ? `지킴이 이웃 ${accepted.length}명에게 알렸어요.` : "알림을 받을 지킴이 이웃이 없어요."}
        />
      ) : hours >= 24 ? (
        <AlertLevel level={2} title="주의 · 하루 지남" text="내일까지 없으면 지킴이 이웃에게 알려요." />
      ) : (
        <div>
          <span className="chip chip-ok">
            <Icon name="check" size={22} />
            안부 확인됨
          </span>
        </div>
      )}

      <button onClick={() => go("neighbors")} className="home-card bg-info-soft">
        <span>
          <span className="t-heading block">지킴이 이웃</span>
          <span className="t-caption block text-ink-muted">
            {neighborSub}
            {pendingRequests > 0 ? ` · 받은 요청 ${pendingRequests}건` : ""}
          </span>
        </span>
        <span className="go" aria-hidden="true">
          <Icon name="arrow" size={28} />
        </span>
      </button>
      <button onClick={() => go("notices")} className="home-card bg-sun-soft">
        <span>
          <span className="t-heading block">알림 소식</span>
          <span className="t-caption block text-ink-muted">{noticeSub}</span>
        </span>
        <span className="go" aria-hidden="true">
          <Icon name="arrow" size={28} />
        </span>
      </button>
    </div>
  );
}
