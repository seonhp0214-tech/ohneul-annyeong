"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import Onboarding from "@/components/Onboarding";
import Home from "@/components/Home";
import Guardians from "@/components/Guardians";
import Notices from "@/components/Notices";
import MyInfo from "@/components/MyInfo";
import SosScreen from "@/components/SosScreen";
import { Icon, type IconName } from "@/components/Icons";

type Tab = "home" | "neighbors" | "notices" | "me" | "sos";

// 아래 탭 4개 (디자인시스템 TabBar): 아이콘과 글자를 함께 보여요.
const TABS: { id: Exclude<Tab, "sos">; label: string; icon: IconName }[] = [
  { id: "home", label: "홈", icon: "home" },
  { id: "neighbors", label: "이웃", icon: "neighbors" },
  { id: "notices", label: "알림", icon: "bell" },
  { id: "me", label: "내 정보", icon: "person" },
];

export default function Page() {
  const { state, actions } = useApp();
  const [tab, setTab] = useState<Tab>("home");

  if (!state) return <p className="t-body p-8 text-center text-ink-muted">불러오는 중…</p>;
  if (!state.me) return <Onboarding actions={actions} />;

  const highlight: Tab = tab === "sos" ? "home" : tab;

  return (
    <div className="mx-auto min-h-screen max-w-md">
      <main>
        {tab === "home" && <Home state={state} actions={actions} onSos={() => setTab("sos")} goTab={setTab} />}
        {tab !== "home" && (
          <div className="px-4 pb-32 pt-6">
            {tab === "neighbors" && <Guardians state={state} actions={actions} />}
            {tab === "notices" && <Notices state={state} />}
            {tab === "me" && <MyInfo state={state} actions={actions} />}
            {tab === "sos" && <SosScreen state={state} actions={actions} onClose={() => setTab("home")} />}
          </div>
        )}
      </main>

      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <div className="flex rounded-lg bg-surface-raised p-1 shadow-card">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={highlight === t.id ? "page" : undefined}
              className={`flex min-h-16 flex-1 flex-col items-center justify-center rounded-lg text-[15px] font-bold leading-5 ${
                highlight === t.id ? "bg-brand text-on-brand" : "text-ink-muted"
              }`}
            >
              <Icon name={t.icon} size={26} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
