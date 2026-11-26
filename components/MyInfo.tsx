"use client";
import type { Actions, State } from "@/lib/store";
import DemoPanel from "./DemoPanel";

// 내 정보 화면: 내가 낸 정보(이름·동)와 연습용 도구
export default function MyInfo({ state, actions }: { state: State; actions: Actions }) {
  const me = state.me!;
  return (
    <section className="flex flex-col gap-4">
      <h1 className="t-heading">내 정보</h1>
      <div className="card flex items-center gap-3">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[22px] font-extrabold leading-none text-ink">
          {me.nickname.slice(0, 1)}
        </span>
        <div>
          <p className="t-body-strong">{me.nickname}님</p>
          <p className="t-caption text-ink-muted">{me.dong}</p>
        </div>
      </div>
      <p className="t-caption text-ink-muted">
        부르는 이름, 사는 동, 안부를 보낸 시각만 저장해요. 호수와 전화번호는 받지 않아요.
      </p>
      <DemoPanel state={state} actions={actions} />
    </section>
  );
}
