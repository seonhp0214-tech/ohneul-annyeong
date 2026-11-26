"use client";
import { useState } from "react";
import { MAX_GUARDIANS, NEIGHBORS, type Actions, type State } from "@/lib/store";
import { Icon } from "./Icons";
import { Ar, Avatar, ErrorMsg } from "./Ui";

// 지킴이 이웃 목록: 최대 3명까지 등록해요. 상대가 수락해야 진짜 연결돼요. (디자인시스템 GuardianCard)
export default function Guardians({ state, actions }: { state: State; actions: Actions }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const demo = actions.demo;
  const isMock = state.mode === "mock";

  // 버튼을 연달아 눌러도 한 번만 실행돼요. 오류 문구(없으면 null)를 돌려줘요.
  async function run(f: () => Promise<string | null>): Promise<string | null> {
    if (busy) return null;
    setBusy(true);
    const err = await f();
    setBusy(false);
    setError(err);
    return err;
  }
  const connected = state.guardians.filter((g) => g.status === "accepted").length;
  const full = state.guardians.length >= MAX_GUARDIANS;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="t-title">지킴이 이웃</h2>
        <p className="t-caption text-ink-muted">
          {MAX_GUARDIANS}명 중 {connected}명이 연결되어 있어요
        </p>
      </div>
      <p className="t-body text-ink-muted">안부가 이틀 없거나 도움 요청을 보내면 알림을 받는 분들이에요.</p>

      <ul className="flex flex-col gap-4">
        {state.guardians.length === 0 && <li className="t-body text-ink-muted">아직 등록한 지킴이 이웃이 없어요.</li>}
        {state.guardians.map((g) => (
          <li key={g.id} className="card-lg flex flex-col gap-4 !p-5">
            <div className="flex items-center gap-4">
              <Avatar name={g.name} size={80} link={g.status === "accepted" ? "connected" : "pending"} />
              <div className="min-w-0">
                <p className="t-heading">{g.name}님</p>
                <p className="t-caption text-ink-muted">{g.dong}</p>
                {g.status === "accepted" ? (
                  <span className="chip chip-info chip-sm mt-1">
                    <Icon name="check" size={18} />
                    연결됨
                  </span>
                ) : (
                  <span className="chip chip-warn chip-sm mt-1">수락 대기</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {g.status === "pending" && demo && (
                <button onClick={() => demo.accept(g.id)} className="btn btn-dashed">
                  연습용: 수락했다고 가정
                </button>
              )}
              <button disabled={busy} onClick={() => run(() => actions.removeGuardian(g.id))} className="btn btn-secondary btn-sm">
                삭제
                <Ar size={26} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const err = await run(() => actions.addGuardian(name));
          if (!err) setName("");
        }}
      >
        <label htmlFor="neighbor" className="t-heading">
          {full ? "지킴이 이웃이 가득 찼어요 (3명 중 3명)" : "이웃 추가하기"}
        </label>
        <input
          id="neighbor"
          className={`field ${error ? "field-err" : ""}`}
          value={name}
          onChange={(e) => setName(isMock ? e.target.value : e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
          maxLength={isMock ? undefined : 6}
          autoCapitalize={isMock ? undefined : "characters"}
          autoComplete="off"
          placeholder={isMock ? "이웃의 부르는 이름" : "이웃 코드 6자리"}
        />
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <button disabled={busy} className="btn btn-secondary">
          지킴이 요청 보내기
          <Ar />
        </button>
      </form>

      {demo && <p className="demo-note">연습용 이웃: {NEIGHBORS.map((n) => n.name).join(", ")}</p>}
    </section>
  );
}
