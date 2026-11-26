"use client";
// 가짜 저장소: 지금은 이 브라우저(localStorage) 안에만 저장돼요.
// 나중에 Supabase를 붙일 때, 아래 "actions" 안의 내용만 서버 호출로 바꾸면 화면은 그대로 쓸 수 있어요.

import { useEffect, useState } from "react";

const HOUR = 3600 * 1000;
const KEY = "ohneul-mock-v1";
export const MAX_GUARDIANS = 3;

// 시연용 초대 코드와 이웃 (진짜 서비스에서는 운영자가 만든 코드가 DB에 들어 있어요)
export const DEMO_CODES = ["AN2611", "AN2612", "AN2613"]; // 6자리 (디자인시스템 입력 칸과 같은 길이)
export const NEIGHBORS = [
  { id: "n1", name: "김이웃", dong: "행복동" },
  { id: "n2", name: "박이웃", dong: "행복동" },
  { id: "n3", name: "이이웃", dong: "사랑동" },
  { id: "n4", name: "최이웃", dong: "사랑동" },
];

export type Guardian = { id: string; name: string; dong: string; status: "pending" | "accepted" };
export type Notice = { id: string; at: number; kind: "reminder" | "missed" | "sos" | "info"; text: string };
export type State = {
  me: null | {
    nickname: string;
    dong: string;
    consentedAt: number;
    lastCheckinAt: number;
    remindedAt: number | null; // 24시간 재알림을 보낸 시각
    missedAt: number | null; // 48시간 지킴이 알림을 보낸 시각
  };
  usedCodes: string[];
  guardians: Guardian[];
  notices: Notice[];
  sos: null | { at: number; enRoute: string[] };
};

const EMPTY: State = { me: null, usedCodes: [], guardians: [], notices: [], sos: null };
const uid = () => Math.random().toString(36).slice(2, 9);

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

// 마지막 안부로부터 24시간/48시간이 지났는지 확인하고, 지났으면 알림 기록을 한 번만 남겨요.
function evaluate(s: State): State {
  if (!s.me) return s;
  const now = Date.now();
  const hours = (now - s.me.lastCheckinAt) / HOUR;
  let me = s.me;
  let notices = s.notices;
  if (hours >= 24 && !me.remindedAt) {
    me = { ...me, remindedAt: now };
    notices = [{ id: uid(), at: now, kind: "reminder", text: "오늘 안부를 아직 보내지 않았어요. ‘저 괜찮아요’를 눌러 주세요." }, ...notices];
  }
  if (hours >= 48 && !me.missedAt) {
    const n = s.guardians.filter((g) => g.status === "accepted").length;
    me = { ...me, missedAt: now };
    notices = [
      {
        id: uid(),
        at: now,
        kind: "missed",
        text:
          n > 0
            ? `안부가 이틀째 없어서 지킴이 이웃 ${n}명에게 알림을 보냈어요.`
            : "안부가 이틀째 없지만 알림을 받을 지킴이가 없어요. 지킴이를 등록해 주세요.",
      },
      ...notices,
    ];
  }
  return me === s.me && notices === s.notices ? s : { ...s, me, notices };
}

export function useApp() {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    // 브라우저에 저장된 내용을 처음 한 번 불러와요.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(evaluate(load()));
    const t = setInterval(() => setState((p) => (p ? evaluate(p) : p)), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!state) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const update = (f: (s: State) => State) => setState((p) => (p ? evaluate(f(p)) : p));
  const s = state;

  const actions = {
    // 초대 코드로 가입. 문제가 있으면 쉬운 말 오류 문구를, 성공하면 null을 돌려줘요.
    register(code: string, nickname: string, dong: string, consent: boolean): string | null {
      if (!s) return "잠시 후 다시 시도해 주세요.";
      const c = code.trim().toUpperCase();
      if (!DEMO_CODES.includes(c)) return "코드가 맞지 않아요. 다시 확인해 주세요.";
      if (s.usedCodes.includes(c)) return "이미 사용한 코드예요. 새 코드를 받아 주세요.";
      if (!nickname.trim()) return "부르는 이름을 적어 주세요.";
      if (!dong.trim()) return "사는 동을 적어 주세요. (호수는 적지 않아도 돼요)";
      if (!consent) return "개인정보 수집·이용에 동의해야 가입할 수 있어요.";
      const now = Date.now();
      update((p) => ({
        ...p,
        usedCodes: [...p.usedCodes, c],
        me: { nickname: nickname.trim(), dong: dong.trim(), consentedAt: now, lastCheckinAt: now, remindedAt: null, missedAt: null },
      }));
      return null;
    },
    checkin() {
      update((p) =>
        p.me ? { ...p, me: { ...p.me, lastCheckinAt: Date.now(), remindedAt: null, missedAt: null } } : p
      );
    },
    addGuardian(name: string): string | null {
      if (!s) return "잠시 후 다시 시도해 주세요.";
      const found = NEIGHBORS.find((n) => n.name === name.trim());
      if (!found) return "그 이름의 이웃을 찾지 못했어요. 이름을 정확히 적어 주세요.";
      if (s.guardians.some((g) => g.id === found.id)) return "이미 등록한 이웃이에요.";
      if (s.guardians.length >= MAX_GUARDIANS) return `지킴이는 최대 ${MAX_GUARDIANS}명까지 등록할 수 있어요.`;
      update((p) => ({ ...p, guardians: [...p.guardians, { ...found, status: "pending" }] }));
      return null;
    },
    removeGuardian(id: string) {
      update((p) => ({ ...p, guardians: p.guardians.filter((g) => g.id !== id) }));
    },
    // 시연용: 이웃이 수락했다고 가정
    demoAccept(id: string) {
      update((p) => ({ ...p, guardians: p.guardians.map((g) => (g.id === id ? { ...g, status: "accepted" } : g)) }));
    },
    sendSos(): string | null {
      if (!s) return "잠시 후 다시 시도해 주세요.";
      const n = s.guardians.filter((g) => g.status === "accepted").length;
      if (n === 0) return "수락한 지킴이가 아직 없어요. 급하면 119에 먼저 전화해 주세요.";
      const now = Date.now();
      update((p) => ({
        ...p,
        sos: { at: now, enRoute: [] },
        notices: [{ id: uid(), at: now, kind: "sos", text: `SOS를 지킴이 이웃 ${n}명에게 보냈어요.` }, ...p.notices],
      }));
      return null;
    },
    // 시연용: 이웃이 "가는 중"을 눌렀다고 가정
    demoEnRoute() {
      update((p) => {
        if (!p.sos) return p;
        const next = p.guardians.find((g) => g.status === "accepted" && !p.sos!.enRoute.includes(g.name));
        return next ? { ...p, sos: { ...p.sos, enRoute: [...p.sos.enRoute, next.name] } } : p;
      });
    },
    endSos() {
      update((p) => ({ ...p, sos: null }));
    },
    // 시연용: 마지막 안부 시각을 과거로 당겨서 시간이 지난 것처럼 만들어요.
    fastForward(hours: number) {
      update((p) => (p.me ? { ...p, me: { ...p.me, lastCheckinAt: p.me.lastCheckinAt - hours * HOUR } } : p));
    },
    resetAll() {
      setState(EMPTY);
    },
  };

  return { state, actions };
}

export type Actions = ReturnType<typeof useApp>["actions"];

// "오늘 오전 9:12" / "어제 오후 3:05" / "11월 24일 오전 11:51"
export function formatLast(ts: number, now: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === new Date(now).toDateString()) return `오늘 ${time}`;
  if (d.toDateString() === new Date(now - 86400000).toDateString()) return `어제 ${time}`;
  return `${d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })} ${time}`;
}

export function formatAgo(ms: number): string {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 ${h % 24}시간 전`;
}
