"use client";
import { useState } from "react";
import { DEMO_CODES, type Actions } from "@/lib/store";
import { Icon } from "./Icons";
import { ErrorMsg, ScreenBar } from "./Ui";

const STEPS = 4; // 1 초대 코드 → 2 부르는 이름 → 3 사는 동 → 4 동의
const TITLES = ["초대 코드를\n입력해 주세요", "부르는 이름을\n알려 주세요", "사는 동을\n알려 주세요", "받는 정보를\n확인해 주세요"];

// 가입 화면: 한 화면에 질문 하나씩, "이전 / 다음"으로 이동해요. 6자리 초대 코드가 있어야만 가입할 수 있어요.
// (디자인시스템 StepForm / InviteCodeField)
export default function Onboarding({ actions }: { actions: Actions }) {
  const [step, setStep] = useState(0);
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [nickname, setNickname] = useState("");
  const [dong, setDong] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const last = step === STEPS - 1;
  const codeError = step === 0 && !!error;

  // 서버가 돌려준 오류 문구가 어느 단계의 일인지 찾아서 그 단계로 돌아가요.
  function stepOfError(msg: string): number {
    if (msg.includes("동의")) return 3;
    if (msg.includes("코드")) return 0;
    if (msg.includes("이름") || msg.includes("닉네임")) return 1;
    if (msg.includes("동")) return 2;
    return STEPS - 1;
  }

  async function next() {
    if (busy) return;
    setError(null);
    if (step === 0 && code.length !== 6) return setError("초대 코드 6자리를 모두 적어 주세요.");
    if (step === 1 && !nickname.trim()) return setError("부르는 이름을 적어 주세요.");
    if (step === 2 && !dong.trim()) return setError("사는 동을 적어 주세요. (호수는 적지 않아도 돼요)");
    if (!last) return setStep(step + 1);

    setBusy(true);
    const err = await actions.register(code, nickname, dong, consent);
    setBusy(false);
    if (err) {
      setStep(stepOfError(err));
      setError(err);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-6 pt-3">
      <ScreenBar title="가입하기" />
      <div className="mt-1">
        <div className="track" aria-hidden="true">
          {Array.from({ length: STEPS }).map((_, i) => (
            <i key={i} className={i <= step ? "on" : ""} />
          ))}
        </div>
        <p className="t-caption mt-2 font-bold text-info-ink">
          {step + 1} / {STEPS} 단계
        </p>
      </div>

      <form
        className="mt-4 flex flex-1 flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
      >
        <h2 className="t-title whitespace-pre-line">{TITLES[step]}</h2>

        {step === 0 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="invite-code" className="t-heading">
              초대 코드 6자리
            </label>
            <p className="t-caption text-ink-muted">우리 앱을 알려 준 분께 받은 6자리 코드예요.</p>
            <div className="relative mt-1">
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
                autoFocus
                className="absolute inset-0 h-full w-full opacity-0 outline-none"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="nickname" className="t-heading">
              부르는 이름
            </label>
            <input
              id="nickname"
              className={`field ${error ? "field-err" : ""}`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="예: 민지"
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="dong" className="t-heading">
              사는 동
            </label>
            <p className="t-caption text-ink-muted">호수는 적지 않아요.</p>
            <input
              id="dong"
              className={`field ${error ? "field-err" : ""}`}
              value={dong}
              onChange={(e) => setDong(e.target.value)}
              placeholder="예: 행복동"
              autoFocus
            />
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="t-body text-ink-muted">
              부르는 이름, 사는 동, 안부를 보낸 시각만 받아요. 안부가 오래 없을 때 지킴이 이웃에게 알리는 데만 써요.
              주민등록번호·계좌번호·비밀번호는 받지 않아요.
            </p>
            <label className={`opt ${consent ? "opt-sel" : ""}`}>
              <input
                type="checkbox"
                className="sr-only"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="t-body-strong">위 내용에 동의해요</span>
              <span className="ck" aria-hidden="true">
                {consent && <Icon name="check" size={20} />}
              </span>
            </label>
          </div>
        )}

        {error && <ErrorMsg>{error}</ErrorMsg>}

        {actions.demo && step === 0 && (
          <p className="demo-note">
            연습용 안내: 지금은 연습 화면이에요. 아래 코드 중 하나를 넣어 보세요.
            <br />
            {DEMO_CODES.join(" / ")}
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-4">
          {step > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
              className="btn btn-secondary btn-center btn-sm"
              style={{ flex: 1, width: "auto" }}
            >
              이전
            </button>
          )}
          <button disabled={busy} className="btn btn-primary btn-center btn-sm" style={{ flex: 2, width: "auto" }}>
            {last ? "가입하기" : "다음"}
          </button>
        </div>
      </form>
    </main>
  );
}
