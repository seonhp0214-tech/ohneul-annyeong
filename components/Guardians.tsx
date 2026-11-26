"use client";
import { useState } from "react";
import { MAX_GUARDIANS, NEIGHBORS, type Actions, type State } from "@/lib/store";
import { Icon } from "./Icons";

// 이웃 화면: 지킴이 이웃을 최대 3명까지 등록해요. 상대가 수락해야 진짜 연결돼요. (디자인시스템 GuardianCard)
export default function Guardians({ state, actions }: { state: State; actions: Actions }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const connected = state.guardians.filter((g) => g.status === "accepted").length;
  const full = state.guardians.length >= MAX_GUARDIANS;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="t-heading">지킴이 이웃</h1>
        <span className="t-caption text-ink-muted">
          {MAX_GUARDIANS}명 중 {connected}명 연결됨
        </span>
      </div>
      <p className="t-body text-ink-muted">
        안부가 이틀 없거나 도움 요청을 보내면 알림을 받는 분들이에요.
      </p>

      <ul className="flex flex-col gap-3">
        {state.guardians.length === 0 && <li className="t-body text-ink-muted">아직 등록한 지킴이 이웃이 없어요.</li>}
        {state.guardians.map((g) => (
          <li key={g.id} className="card flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[22px] font-extrabold leading-none text-ink">
                {g.name.slice(0, 1)}
              </span>
              <div className="min-w-0">
                <p className="t-body-strong">{g.name}님</p>
                <p className="t-caption text-ink-muted">
                  {g.dong} · {g.status === "accepted" ? "안부를 받아요" : "수락을 기다려요"}
                </p>
              </div>
              <span
                className={`t-caption ml-auto whitespace-nowrap rounded-full px-3 py-1 font-bold ${
                  g.status === "accepted" ? "bg-brand-soft text-ink" : "bg-warn-soft text-warn-ink"
                }`}
              >
                {g.status === "accepted" ? "✓ 연결됨" : "대기 중"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.status === "pending" && (
                <button onClick={() => actions.demoAccept(g.id)} className="btn btn-dashed">
                  연습용: 수락했다고 가정
                </button>
              )}
              <button onClick={() => actions.removeGuardian(g.id)} className="btn btn-secondary">
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const err = actions.addGuardian(name);
          setError(err);
          if (!err) setName("");
        }}
      >
        <label htmlFor="neighbor" className="t-heading">
          {full ? "지킴이 이웃이 가득 찼어요" : "+ 지킴이 이웃 추가"}
        </label>
        <input
          id="neighbor"
          className="field"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="이웃의 부르는 이름"
        />
        {error && (
          <p role="alert" className="t-body-strong flex items-center gap-2 text-sos-ink">
            <Icon name="alert" size={22} />
            {error}
          </p>
        )}
        <button className="btn btn-primary w-full">지킴이 요청 보내기</button>
      </form>

      <p className="demo-note">연습용 이웃: {NEIGHBORS.map((n) => n.name).join(", ")}</p>
    </section>
  );
}
