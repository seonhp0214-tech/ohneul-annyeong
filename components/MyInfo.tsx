"use client";
import { useState } from "react";
import type { Actions, State } from "@/lib/store";
import DemoPanel from "./DemoPanel";
import { Ar, Avatar, ErrorMsg } from "./Ui";

// 내 정보 화면: 내가 낸 정보(이름·동), 내 이웃 코드, (실제 모드) 알림 받기·로그아웃, (연습용) 연습용 도구
// 프로필 사진은 아직 없어서 이름 첫 글자 원(Avatar)으로 보여 줘요.
export default function MyInfo({ state, actions }: { state: State; actions: Actions }) {
  const me = state.me!;
  const isSupabase = state.mode === "supabase";
  const [busy, setBusy] = useState<"push" | "out" | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushDone, setPushDone] = useState(false);

  async function push() {
    if (busy) return;
    setBusy("push");
    setPushError(null);
    const err = await actions.enablePush();
    setBusy(null);
    setPushError(err);
    if (!err) setPushDone(true);
  }

  async function out() {
    if (busy) return;
    setBusy("out");
    await actions.signOut();
    setBusy(null);
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="hero items-center text-center">
        <span aria-hidden="true" className="hero-c1" />
        <Avatar name={me.nickname} size={96} />
        <div>
          <p className="t-title">{me.nickname}님</p>
          <p className="t-caption text-ink-muted">{me.dong}</p>
        </div>
      </div>

      <div className="card-lg flex flex-col gap-1">
        <p className="t-caption text-ink-muted">내 이웃 코드</p>
        <p className="text-[36px] font-bold leading-[46px] tracking-[0.2em] text-ink">{me.neighborCode}</p>
        <p className="t-caption text-ink-muted">지킴이 요청을 받으려면 이웃에게 알려 주세요</p>
      </div>

      <p className="t-caption text-ink-muted">
        부르는 이름, 사는 동, 안부를 보낸 시각만 저장해요. 호수와 전화번호는 받지 않아요.
      </p>

      {isSupabase && (
        <div className="flex flex-col gap-3">
          <button disabled={busy !== null || pushDone} onClick={push} className="btn btn-primary">
            {pushDone ? "알림을 켰어요" : "알림 받기"}
            <Ar icon={pushDone ? "check" : "bell"} />
          </button>
          {pushError && <ErrorMsg>{pushError}</ErrorMsg>}
          <button disabled={busy !== null} onClick={out} className="btn btn-secondary">
            로그아웃
            <Ar />
          </button>
        </div>
      )}

      <DemoPanel state={state} actions={actions} />
    </section>
  );
}
