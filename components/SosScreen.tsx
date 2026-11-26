"use client";
import { useState } from "react";
import type { Actions, State } from "@/lib/store";
import { Icon } from "./Icons";

// SOS 화면: 119 안내 → 큰 도움 요청 버튼 → "정말 알릴까요?" 확인 → 보낸 뒤 "가는 중" 표시. (디자인시스템 SosButton)
export default function SosScreen({ state, actions, onClose }: { state: State; actions: Actions; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accepted = state.guardians.filter((g) => g.status === "accepted");
  const sos = state.sos;

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-md bg-sos-soft p-4 text-sos-ink">
        <p className="t-heading">생명이 위급하면 119 먼저</p>
        <a href="tel:119" className="btn btn-secondary mt-3 w-full">
          <Icon name="phone" size={24} />
          119 전화하기
        </a>
      </div>

      {sos ? (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex size-44 flex-col items-center justify-center gap-1 rounded-full border-[3px] border-brand bg-brand-soft p-4 text-ink">
              <Icon name="check" size={48} />
              <span className="text-[24px] font-extrabold leading-[30px]">이웃에게 알렸어요</span>
            </div>
            <p className="t-body">지킴이 이웃 {accepted.length}명에게 동시에 알렸어요.</p>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="t-heading">가는 중인 이웃</h2>
            {sos.enRoute.length === 0 ? (
              <p className="t-body text-ink-muted">
                아직 응답한 이웃이 없어요. 기다리지 말고, 위급하면 119에 전화해 주세요.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {sos.enRoute.map((n) => (
                  <li key={n} className="t-body-strong rounded-md bg-brand-soft p-4 text-ink">
                    {n}님이 가는 중이에요
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={actions.demoEnRoute} className="btn btn-dashed w-full">
            연습용: 이웃이 ‘가는 중’을 눌렀다고 가정
          </button>
          <button
            onClick={() => {
              actions.endSos();
              onClose();
            }}
            className="btn btn-secondary w-full"
          >
            해결됐어요 (닫기)
          </button>
        </>
      ) : confirming ? (
        <div className="card-lg flex flex-col gap-3">
          <p className="t-title">정말 이웃에게 알릴까요?</p>
          <p className="t-body">
            수락한 지킴이 이웃 {accepted.length}명에게 동시에 알려요. 이웃에게는 {state.me!.dong}에서 온 요청이라는
            것만 알려요. 호수는 알리지 않아요.
          </p>
          {error && (
            <p role="alert" className="t-body-strong flex items-center gap-2 text-sos-ink">
              <Icon name="alert" size={22} className="shrink-0" />
              {error}
            </p>
          )}
          <button onClick={() => setError(actions.sendSos())} className="btn btn-sos btn-xl w-full">
            <Icon name="siren" size={28} />
            알려요
          </button>
          <button
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            className="btn btn-secondary w-full"
          >
            취소
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-3 text-center">
            <button
              onClick={() => setConfirming(true)}
              className="flex size-44 flex-col items-center justify-center gap-1 rounded-full bg-sos text-[28px] font-extrabold leading-9 text-on-sos shadow-card"
            >
              <Icon name="siren" size={48} />
              도움 요청
            </button>
            <p className="t-caption text-ink-muted">누르면 한 번 더 물어봐요.</p>
          </div>
          <p className="t-body">
            수락한 지킴이 이웃 {accepted.length}명에게 동시에 알려요. 이웃에게는 {state.me!.dong}에서 온 요청이라는
            것만 알려요.
          </p>
          <button onClick={onClose} className="btn btn-secondary w-full">
            돌아가기
          </button>
        </>
      )}
    </section>
  );
}
