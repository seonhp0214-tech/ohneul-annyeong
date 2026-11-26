"use client";
import { useState } from "react";
import { DEMO_CODES, type Actions } from "@/lib/store";
import { Icon } from "./Icons";

// 가입 화면: 6자리 초대 코드가 있어야만 가입할 수 있어요. (디자인시스템 InviteCodeField)
export default function Onboarding({ actions }: { actions: Actions }) {
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [nickname, setNickname] = useState("");
  const [dong, setDong] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeError = !!error && error.includes("코드");

  return (
    <main className="mx-auto max-w-md pb-12">
      <header className="relative overflow-hidden rounded-b-lg bg-brand px-4 pb-10 pt-6 text-on-brand">
        <span aria-hidden="true" className="absolute -right-6 -top-6 size-30 rounded-full bg-brand-deep opacity-55" />
        <span aria-hidden="true" className="absolute bottom-6 right-24 size-9 rounded-full bg-sun" />
        <h1 className="relative text-[34px] font-extrabold leading-[42px]">오늘도 안녕</h1>
        <p className="t-body relative mt-2">같은 동네 이웃과 안부를 나누고, 급할 때 도움을 부르는 서비스예요.</p>
      </header>

      <form
        className="mt-6 flex flex-col gap-6 px-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(actions.register(code, nickname, dong, consent));
        }}
      >
        <div>
          <label htmlFor="invite-code" className="t-heading block">
            초대 코드
          </label>
          <p className="t-caption mb-3 text-ink-muted">우리 앱을 알려 준 분께 받은 6자리 코드예요.</p>
          <div className="relative">
            <div className="flex gap-2" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className={`cell ${focused && i === Math.min(code.length, 5) ? "cell-active" : ""} ${codeError ? "cell-err" : ""}`}
                >
                  {code[i] ?? ""}
                </span>
              ))}
            </div>
            <input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="초대 코드 6자리"
              className="absolute inset-0 h-full w-full opacity-0 outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="nickname" className="t-body-strong">
            부르는 이름
          </label>
          <input id="nickname" className="field" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="예: 선희" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="dong" className="t-body-strong">
            사는 동 (호수는 적지 않아요)
          </label>
          <input id="dong" className="field" value={dong} onChange={(e) => setDong(e.target.value)} placeholder="예: 행복동" />
        </div>

        <div className="card flex flex-col gap-3">
          <p className="t-body-strong">받는 정보와 쓰는 곳</p>
          <p className="t-body text-ink-muted">
            부르는 이름, 사는 동, 안부를 보낸 시각만 받아요. 안부가 오래 없을 때 지킴이 이웃에게 알리는 데만 써요.
            주민등록번호·계좌번호·비밀번호는 받지 않아요.
          </p>
          <label className="t-body-strong flex items-center gap-3">
            <input type="checkbox" className="size-7 accent-brand" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            위 내용에 동의해요
          </label>
        </div>

        {error && (
          <p role="alert" className="t-body-strong flex items-center gap-2 text-sos-ink">
            <Icon name="alert" size={22} className="shrink-0" />
            {error}
          </p>
        )}

        <button className="btn btn-primary btn-xl w-full">가입하기</button>

        <p className="demo-note">
          연습용 안내: 지금은 연습 화면이에요. 아래 코드 중 하나를 넣어 보세요.
          <br />
          {DEMO_CODES.join(" / ")}
        </p>
      </form>
    </main>
  );
}
