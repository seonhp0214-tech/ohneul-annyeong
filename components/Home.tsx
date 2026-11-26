"use client";
import { useEffect, useState } from "react";
import { formatLast, type Actions, type State } from "@/lib/store";
import { Icon } from "./Icons";

// 홈: 초록 헤더 위에 안부 카드가 걸치고, 아래에 지킴이 이웃과 SOS 띠가 이어져요. (디자인시스템 HomeScreen)
export default function Home({
  state,
  actions,
  onSos,
  goTab,
}: {
  state: State;
  actions: Actions;
  onSos: () => void;
  goTab: (t: "neighbors" | "notices") => void;
}) {
  const me = state.me!;
  // 현재 시각은 따로 보관하고 30초마다 새로 읽어요. ("몇 시간 전"이 저절로 바뀌게)
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const hours = (now - me.lastCheckinAt) / 3600000;
  const accepted = state.guardians.filter((g) => g.status === "accepted");
  const checkedToday = new Date(me.lastCheckinAt).toDateString() === new Date(now).toDateString();
  const dateText = new Date(now).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" });
  const timeText = new Date(me.lastCheckinAt).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });

  // 상태는 색만이 아니라 글자와 아이콘으로도 알려 줘요.
  const status =
    hours >= 48
      ? {
          cls: "chip-bad",
          icon: "alert" as const,
          label: "도움 필요 · 이틀째 무응답",
          note: accepted.length > 0 ? `지킴이 이웃 ${accepted.length}명에게 알렸어요.` : "알림을 받을 지킴이 이웃이 없어요.",
        }
      : hours >= 24
        ? { cls: "chip-warn", icon: "warn" as const, label: "주의 · 하루 지남", note: "내일까지 없으면 지킴이 이웃에게 알려요." }
        : { cls: "chip-ok", icon: "check" as const, label: "안부 확인됨", note: "" };

  return (
    <div>
      <header className="relative overflow-hidden rounded-b-lg bg-brand px-4 pb-24 pt-6 text-on-brand">
        <span aria-hidden="true" className="absolute -right-6 -top-6 size-30 rounded-full bg-brand-deep opacity-55" />
        <span aria-hidden="true" className="absolute right-[92px] top-[76px] size-9 rounded-full bg-sun" />
        <div className="relative mb-6 flex items-center justify-between">
          <span className="text-[22px] font-extrabold leading-[30px]">오늘도 안녕</span>
          <button
            onClick={() => goTab("notices")}
            aria-label="알림 보기"
            className="flex size-14 items-center justify-center rounded-full bg-brand-deep text-on-brand"
          >
            <Icon name="bell" size={26} />
          </button>
        </div>
        <p className="t-caption relative">{dateText}</p>
        <h1 className="relative mt-1 text-[34px] font-extrabold leading-[42px]">
          {me.nickname} 님,
          <br />
          오늘도 안녕하세요
        </h1>
      </header>

      <div className="relative -mt-[72px] flex flex-col gap-4 px-4 pb-32">
        <section className="card-lg flex flex-col gap-2">
          {checkedToday ? (
            <>
              <p className="t-heading">오늘도 안녕하셨네요</p>
              <p className="t-display">{timeText}</p>
              <div className="flex items-center gap-3 rounded-md bg-brand-soft p-4 text-ink">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-sun text-on-sun">
                  <Icon name="check" size={30} />
                </span>
                <div>
                  <b className="t-heading block">안부를 보냈어요</b>
                  <span className="t-caption">내일 또 만나요</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="t-heading">오늘 하루, 안녕하신가요?</p>
              <p className="t-caption text-ink-muted">마지막 안부 {formatLast(me.lastCheckinAt, now)}</p>
              <button
                onClick={() => {
                  actions.checkin();
                  setNow(Date.now());
                }}
                className="btn btn-primary btn-xl mt-2 w-full"
              >
                <Icon name="check" size={28} />
                저 괜찮아요
              </button>
              <p className="t-caption text-ink-muted">누르면 지킴이 이웃에게 알림 없이 기록만 남아요.</p>
            </>
          )}
        </section>

        <div className="flex flex-col items-start gap-1">
          <span className={`chip ${status.cls}`}>
            <Icon name={status.icon} size={22} />
            {status.label}
          </span>
          {status.note && <p className="t-caption text-ink-muted">{status.note}</p>}
        </div>

        <h2 className="t-heading mt-1">지킴이 이웃</h2>
        {state.guardians.length === 0 ? (
          <button onClick={() => goTab("neighbors")} className="btn btn-secondary w-full">
            + 지킴이 이웃 추가
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            {state.guardians.map((g) => (
              <div key={g.id} className="card flex min-h-14 min-w-[140px] flex-1 items-center gap-2 p-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[18px] font-extrabold leading-none text-ink">
                  {g.name.slice(0, 1)}
                </span>
                <div>
                  <p className="t-body-strong">{g.name}님</p>
                  <p className="t-caption text-ink-muted">
                    {g.dong} {g.status === "accepted" ? "✓" : "· 대기 중"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {accepted.length === 0 && state.guardians.length > 0 && (
          <p className="t-caption text-ink-muted">이웃이 수락하면 알림을 받을 수 있어요.</p>
        )}

        <button
          onClick={onSos}
          className="flex w-full items-center gap-3 rounded-md bg-sos-soft px-4 py-3 text-left text-sos-ink"
        >
          <span className="flex size-18 shrink-0 items-center justify-center rounded-full bg-sos text-on-sos">
            <Icon name="siren" size={36} />
          </span>
          <span>
            <span className="t-heading block font-extrabold">급할 땐 도움 요청</span>
            <span className="t-caption">눌러서 이웃에게 알려요</span>
          </span>
        </button>
      </div>
    </div>
  );
}
