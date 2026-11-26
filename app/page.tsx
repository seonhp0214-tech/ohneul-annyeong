"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import Onboarding from "@/components/Onboarding";
import Login from "@/components/Login";
import Home from "@/components/Home";
import Guardians from "@/components/Guardians";
import Notices from "@/components/Notices";
import MyInfo from "@/components/MyInfo";
import Watching from "@/components/Watching";
import SosScreen from "@/components/SosScreen";
import { Icon } from "@/components/Icons";
import { ScreenBar } from "@/components/Ui";

// 화면 이름. 탭은 home / me 와 가운데 도움(sos) 셋뿐이고,
// neighbors(이웃)·notices(알림 소식)는 홈의 카드에서 들어가는 안쪽 화면이에요.
type View = "home" | "neighbors" | "notices" | "me" | "sos";

export default function Page() {
  const { state, actions } = useApp();
  const [view, setView] = useState<View>("home");

  // 앱 화면으로 다시 돌아오면 최신 내용을 한 번 새로 가져와요. (연습용에서는 아무 일도 안 해요)
  const { refresh } = actions;
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  if (!state || state.auth === "loading") return <p className="t-body p-8 text-center text-ink-muted">불러오는 중…</p>;
  if (state.auth === "signedOut" || state.auth === "otpSent") return <Login state={state} actions={actions} />;
  if (state.auth === "needsProfile" || !state.me) return <Onboarding actions={actions} />;

  // 아래 탭에서 켜져 있는 칸: 홈 아래의 안쪽 화면(이웃·알림 소식)에서는 홈이 켜져 있어요.
  const highlight: "home" | "me" | null = view === "me" ? "me" : view === "sos" ? null : "home";
  const incoming = state.incomingSos.length;
  const goHome = () => setView("home");

  return (
    <div className="mx-auto min-h-screen max-w-md">
      {incoming > 0 && view !== "neighbors" && (
        <button
          onClick={() => setView("neighbors")}
          className="sticky top-0 z-10 flex min-h-16 w-full items-center gap-3 bg-sos px-4 py-3 text-left text-on-sos"
        >
          <Icon name="siren" size={30} className="shrink-0" />
          <span className="t-body-strong">이웃이 도움을 요청했어요 ({incoming}건) · 눌러서 확인해요</span>
        </button>
      )}
      <main>
        {view === "home" && <Home state={state} actions={actions} go={setView} />}
        {view !== "home" && (
          <div className="px-4 pb-48 pt-3">
            {view === "neighbors" && (
              <>
                <ScreenBar title="이웃" onBack={goHome} />
                <div className="mt-4 flex flex-col gap-8">
                  <Watching state={state} actions={actions} />
                  <Guardians state={state} actions={actions} />
                </div>
              </>
            )}
            {view === "notices" && (
              <>
                <ScreenBar title="알림 소식" onBack={goHome} />
                <div className="mt-4">
                  <Notices state={state} />
                </div>
              </>
            )}
            {view === "me" && (
              <>
                <ScreenBar title="내 정보" />
                <div className="mt-4">
                  <MyInfo state={state} actions={actions} />
                </div>
              </>
            )}
            {view === "sos" && (
              <>
                <ScreenBar title="도움 요청" onBack={goHome} />
                <div className="mt-4">
                  <SosScreen state={state} actions={actions} onClose={goHome} />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* 아래 탭: 홈 | 도움(가운데, 모든 화면에서 같은 자리) | 내 정보 */}
      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <div className="tabbar">
          <button
            onClick={goHome}
            aria-current={highlight === "home" ? "page" : undefined}
            className={`tab ${highlight === "home" ? "tab-on" : ""}`}
          >
            <Icon name="home" size={30} />홈
          </button>
          <button onClick={() => setView("sos")} aria-current={view === "sos" ? "page" : undefined} className="tab-sos">
            <span className="disc">
              <Icon name="siren" size={48} />
            </span>
            도움
          </button>
          <button
            onClick={() => setView("me")}
            aria-current={highlight === "me" ? "page" : undefined}
            className={`tab ${highlight === "me" ? "tab-on" : ""}`}
          >
            <Icon name="person" size={30} />내 정보
          </button>
        </div>
      </nav>
    </div>
  );
}
