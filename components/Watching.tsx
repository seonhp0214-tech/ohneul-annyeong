"use client";
import { useState } from "react";
import { formatLast, type Actions, type State } from "@/lib/store";
import { Icon } from "./Icons";
import { Ar, Avatar, ErrorMsg } from "./Ui";

// 내가 지켜 주는 사람들과, 그분들이 보낸 도움 요청. 연습용(mock)에서는 비어 있어서 아무것도 안 보여요.
export default function Watching({ state, actions }: { state: State; actions: Actions }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string[]>([]); // 이번 화면에서 "가는 중"을 알린 요청
  const [now] = useState(() => Date.now());

  if (state.watching.length === 0 && state.incomingSos.length === 0) return null;

  async function run(id: string, f: () => Promise<string | null>, onOk?: () => void) {
    if (busyId) return;
    setBusyId(id);
    setError(null);
    const err = await f();
    setBusyId(null);
    if (err) setError(err);
    else onOk?.();
  }

  return (
    <section className="flex flex-col gap-5">
      {state.incomingSos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="t-heading">도움 요청이 왔어요</h2>
          <p className="t-body-strong rounded-md bg-sos-soft p-4 text-sos-ink">위급하면 119 먼저 전화해 주세요.</p>
          {state.incomingSos.map((s) => {
            const done = s.iAmEnRoute || sent.includes(s.alertId);
            return (
              <div key={s.alertId} className="flex flex-col gap-3 rounded-lg bg-sos-soft p-5 text-sos-ink">
                <p className="t-heading flex items-center gap-2">
                  <Icon name="siren" size={30} className="shrink-0" />
                  {s.ownerName}님이 도움을 요청했어요 · {s.dong}
                </p>
                <p className="t-caption">{formatLast(s.at, now)}</p>
                <button
                  disabled={done || busyId === s.alertId}
                  onClick={() => run(s.alertId, () => actions.respondEnRoute(s.alertId), () => setSent((p) => [...p, s.alertId]))}
                  className="btn btn-primary"
                >
                  {done ? "가는 중으로 알렸어요" : "가는 중이에요"}
                  <Ar icon="check" />
                </button>
                <a href="tel:119" className="btn btn-em">
                  119 전화하기
                  <Ar icon="phone" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {state.watching.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="t-title">내가 지켜 주는 이웃</h2>
          <ul className="flex flex-col gap-4">
            {state.watching.map((w) => (
              <li key={w.id} className="card-lg flex flex-col gap-4 !p-5">
                <div className="flex items-center gap-4">
                  <Avatar name={w.name} size={72} link={w.status === "accepted" ? "connected" : "pending"} />
                  <div className="min-w-0">
                    <p className="t-heading">{w.name}님</p>
                    <p className="t-caption text-ink-muted">
                      {w.status === "accepted"
                        ? `${w.dong}${w.lastCheckinAt !== null ? ` · 마지막 안부 ${formatLast(w.lastCheckinAt, now)}` : ""}`
                        : `${w.dong} · 지킴이 요청이 왔어요`}
                    </p>
                    {w.status === "accepted" && (
                      <span className="chip chip-info chip-sm mt-1">
                        <Icon name="check" size={18} />
                        지켜 주는 중이에요
                      </span>
                    )}
                  </div>
                </div>
                {w.status === "pending" && (
                  <div className="flex flex-col gap-3">
                    <button
                      disabled={busyId !== null}
                      onClick={() => run(w.id, () => actions.acceptGuardian(w.id))}
                      className="btn btn-primary btn-sm"
                    >
                      수락
                      <Ar icon="check" size={26} />
                    </button>
                    <button
                      disabled={busyId !== null}
                      onClick={() => run(w.id, () => actions.removeGuardian(w.id))}
                      className="btn btn-secondary btn-sm"
                    >
                      거절
                      <Ar size={26} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <ErrorMsg>{error}</ErrorMsg>}
    </section>
  );
}
