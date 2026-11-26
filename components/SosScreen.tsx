"use client";
import { useState } from "react";
import type { Actions, State } from "@/lib/store";
import { Icon } from "./Icons";
import { Ar, Avatar, ErrorMsg } from "./Ui";

const NONE_TEXT = "아직 수락한 지킴이 이웃이 없어서 알릴 수 없어요. 급하면 119에 먼저 전화해 주세요.";

// 도움 화면: 119 먼저 → 큰 원 버튼 → "정말 이웃에게 알릴까요?" 확인 시트 → 보낸 뒤 "가는 중" 표시.
// (디자인시스템 SosFlow / SosButton)
export default function SosScreen({ state, actions, onClose }: { state: State; actions: Actions; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const accepted = state.guardians.filter((g) => g.status === "accepted");
  const sos = state.sos;

  const call119 = (
    <a href="tel:119" className="btn btn-em">
      119 전화하기
      <Ar icon="phone" />
    </a>
  );

  // ---- 보낸 뒤 ----
  if (sos) {
    return (
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2 rounded-xl bg-sos-soft p-6 text-sos-ink">
          <h2 className="t-title flex items-center gap-3">
            <Icon name="check" size={36} className="shrink-0" />
            이웃에게 알렸어요
          </h2>
          <p className="t-body">지킴이 이웃 {accepted.length}명에게 동시에 알렸어요.</p>
        </div>

        {call119}

        <div className="flex flex-col gap-3">
          <h2 className="t-heading">가는 중인 이웃</h2>
          {sos.enRoute.length === 0 ? (
            <p className="t-body text-ink-muted">아직 응답한 이웃이 없어요. 기다리지 말고, 위급하면 119에 전화해 주세요.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {sos.enRoute.map((n) => (
                <li key={n} className="card flex items-center gap-4">
                  <Avatar name={n} size={56} link="connected" />
                  <span className="t-body-strong">{n}님이 가는 중이에요</span>
                  <span className="chip chip-info chip-sm ml-auto">가는 중</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {actions.demo && (
          <button onClick={actions.demo.enRoute} className="btn btn-dashed">
            연습용: 이웃이 ‘가는 중’을 눌렀다고 가정
          </button>
        )}
        {error && <ErrorMsg>{error}</ErrorMsg>}
        <button
          disabled={busy}
          onClick={async () => {
            if (busy) return;
            setBusy(true);
            const err = await actions.endSos();
            setBusy(false);
            setError(err);
            if (!err) onClose();
          }}
          className="btn btn-secondary"
        >
          해결됐어요 (닫기)
          <Ar icon="check" />
        </button>
      </section>
    );
  }

  // ---- 보내기 전: 큰 원 버튼 (누르면 확인 시트가 올라와요) ----
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg bg-sos-soft p-5 text-sos-ink">
        <p className="t-heading">생명이 위급하면 119 먼저</p>
        {call119}
      </div>

      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <button
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className="sos-disc"
        >
          <Icon name="siren" size={56} />
          도움 요청
        </button>
        <p className="t-caption text-ink-muted">누르면 한 번 더 물어봐요.</p>
      </div>

      <p className="t-body">
        {accepted.length === 0
          ? NONE_TEXT
          : `수락한 지킴이 이웃 ${accepted.length}명에게 동시에 알려요. 이웃에게는 ${state.me!.dong}에서 온 요청이라는 것만 알려요.`}
      </p>

      {confirming && (
        <div className="fixed inset-0 z-30 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="도움 요청 확인">
          <div className="absolute inset-0 bg-ink opacity-45" aria-hidden="true" onClick={() => setConfirming(false)} />
          <div className="sheet relative max-w-md">
            <h2 className="t-title">정말 이웃에게 알릴까요?</h2>
            <p className="t-body">
              {accepted.length === 0
                ? NONE_TEXT
                : `수락한 지킴이 이웃 ${accepted.length}명에게 동시에 알려요. 이웃에게는 ${state.me!.dong}에서 온 요청이라는 것만 알려요. 호수는 알리지 않아요.`}
            </p>
            <p className="t-caption text-ink-muted">생명이 위급하면 119 먼저.</p>
            {error && <ErrorMsg>{error}</ErrorMsg>}
            <button
              disabled={busy || accepted.length === 0}
              onClick={async () => {
                if (busy || accepted.length === 0) return;
                setBusy(true);
                setError(null);
                const err = await actions.sendSos();
                setBusy(false);
                setError(err);
              }}
              className="btn btn-sos"
              style={{ fontSize: 28, lineHeight: "36px" }}
            >
              알려요
              <Ar />
            </button>
            <button
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="btn btn-secondary"
            >
              취소
              <Ar icon="check" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
