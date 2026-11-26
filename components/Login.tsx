"use client";
import { useState } from "react";
import type { Actions, State } from "@/lib/store";
import { Ar, ErrorMsg } from "./Ui";

// 로그인 화면(실제 서비스 모드에서만 나와요): 비밀번호 없이 이메일로 받은 6자리 번호로 들어와요.
export default function Login({ state, actions }: { state: State; actions: Actions }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(false); // "다른 이메일로 하기"를 눌렀을 때
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step2 = state.auth === "otpSent" && !editing;

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!email.trim()) return setError("이메일을 적어 주세요.");
    setBusy(true);
    setError(null);
    const err = await actions.requestOtp(email.trim());
    setBusy(false);
    if (err) return setError(err);
    setCode("");
    setEditing(false);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (code.length !== 6) return setError("메일로 받은 6자리 번호를 모두 적어 주세요.");
    setBusy(true);
    setError(null);
    const err = await actions.verifyOtp(email.trim(), code);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-4 pb-8 pt-5">
      <section className="hero">
        <span aria-hidden="true" className="hero-c1" />
        <span aria-hidden="true" className="hero-c2" />
        <span className="tag self-start">오늘도 안녕</span>
        <h1 className="t-title">
          오늘도 <mark>안녕</mark>하신가요?
        </h1>
        <p className="t-body">같은 동네 이웃과 안부를 나누고, 급할 때 도움을 부르는 서비스예요.</p>
      </section>

      {step2 ? (
        <form className="flex flex-col gap-5" onSubmit={verify}>
          <div className="flex flex-col gap-2">
            <label htmlFor="otp" className="t-heading">
              메일로 받은 6자리 번호
            </label>
            <p className="t-caption text-ink-muted">{email}로 보냈어요. 메일이 안 보이면 스팸함도 확인해 주세요.</p>
            <input
              id="otp"
              className={`field text-center text-[32px] font-bold tracking-[0.4em] ${error ? "field-err" : ""}`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
            />
          </div>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <button disabled={busy} className="btn btn-primary" style={{ fontSize: 28, lineHeight: "36px" }}>
            {busy ? "확인하는 중…" : "들어가기"}
            <Ar icon="check" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setCode("");
              setError(null);
            }}
            className="btn btn-secondary"
          >
            다른 이메일로 하기
            <Ar />
          </button>
        </form>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={sendCode}>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="t-heading">
              이메일
            </label>
            <p className="t-caption text-ink-muted">비밀번호는 필요 없어요. 메일로 6자리 번호를 보내 드려요.</p>
            <input
              id="email"
              type="email"
              className={`field ${error ? "field-err" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="예: minji@example.com"
            />
          </div>
          {error && <ErrorMsg>{error}</ErrorMsg>}
          <button disabled={busy} className="btn btn-primary" style={{ fontSize: 28, lineHeight: "36px" }}>
            {busy ? "보내는 중…" : "번호 받기"}
            <Ar />
          </button>
        </form>
      )}
    </main>
  );
}
