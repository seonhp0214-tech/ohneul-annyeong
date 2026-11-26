"use client";
// 연습용 저장소: 이 브라우저(localStorage) 안에만 저장돼요. 서버와는 통신하지 않아요.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_GUARDIANS, type AppActions, type Guardian, type Me, type Notice, type State, type UseApp } from "./types";

const HOUR = 3600 * 1000;
const KEY = "ohneul-mock-v1";

// 시연용 초대 코드와 이웃 (진짜 서비스에서는 운영자가 만든 코드가 DB에 들어 있어요)
export const DEMO_CODES = ["AN2611", "AN2612", "AN2613"]; // 6자리
export const NEIGHBORS = [
  { id: "n1", name: "김이웃", dong: "행복동" },
  { id: "n2", name: "박이웃", dong: "행복동" },
  { id: "n3", name: "이이웃", dong: "사랑동" },
  { id: "n4", name: "최이웃", dong: "사랑동" },
];

type Stored = {
  me: Me | null;
  usedCodes: string[];
  guardians: Guardian[];
  notices: Notice[];
  sos: null | { alertId: string; at: number; enRoute: string[] };
};

const EMPTY: Stored = { me: null, usedCodes: [], guardians: [], notices: [], sos: null };
const uid = () => Math.random().toString(36).slice(2, 9);
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const makeCode = () =>
  Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const WAIT = "잠시 후 다시 시도해 주세요.";

// 저장된 내용을 기본값 위에 덮어 읽고, 예전 저장본에 없던 값은 채워 넣어요.
function load(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const saved = { ...EMPTY, ...JSON.parse(raw) } as Stored;
    if (saved.me) saved.me = { ...saved.me, neighborCode: saved.me.neighborCode || makeCode() };
    if (saved.sos && !saved.sos.alertId) saved.sos = { ...saved.sos, alertId: uid() };
    return saved;
  } catch {
    return EMPTY;
  }
}

// 마지막 안부로부터 24시간/48시간이 지났는지 확인하고, 지났으면 알림 기록을 한 번만 남겨요.
function evaluate(s: Stored): Stored {
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

export const useMockApp: UseApp = () => {
  const [data, setData] = useState<Stored>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  // 항상 최신 값을 담아 두는 곳: 버튼을 빠르게 두 번 눌러도 두 번째는 이미 바뀐 값을 보고 판단해요.
  const ref = useRef<Stored>(EMPTY);
  const readyRef = useRef(false);

  const commit = useCallback((f: (s: Stored) => Stored) => {
    if (!readyRef.current) return;
    const next = evaluate(f(ref.current));
    ref.current = next;
    setData(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  useEffect(() => {
    // 브라우저에 저장된 내용을 처음 한 번 불러와요.
    readyRef.current = true;
    commit(() => load());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoaded(true);
    const t = setInterval(() => commit((s) => s), 30000);
    // 다른 탭이 같은 저장소를 바꾸면 그 내용을 다시 읽어요. (여기서는 저장하지 않아요: 서로 되풀이 방지)
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY && e.key !== null) return;
      const next = load();
      ref.current = next;
      setData(next);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(t);
      window.removeEventListener("storage", onStorage);
    };
  }, [commit]);

  const actions = useMemo<AppActions>(() => {
    const cur = () => ref.current;
    return {
      async requestOtp() {
        return null;
      },
      async verifyOtp() {
        return null;
      },
      async signOut() {},
      async enablePush() {
        return null;
      },
      async acceptGuardian() {
        return null;
      },
      async respondEnRoute() {
        return null;
      },
      async refresh() {},

      // 초대 코드로 가입. 문제가 있으면 쉬운 말 오류 문구를, 성공하면 null을 돌려줘요.
      async register(code, nickname, dong, consent) {
        if (!readyRef.current) return WAIT;
        const s = cur();
        const c = code.trim().toUpperCase();
        if (!DEMO_CODES.includes(c)) return "코드가 맞지 않아요. 다시 확인해 주세요.";
        if (s.usedCodes.includes(c)) return "이미 사용한 코드예요. 새 코드를 받아 주세요.";
        if (!nickname.trim()) return "부르는 이름을 적어 주세요.";
        if (!dong.trim()) return "사는 동을 적어 주세요. (호수는 적지 않아도 돼요)";
        if (!consent) return "개인정보 수집·이용에 동의해야 가입할 수 있어요.";
        const now = Date.now();
        commit((p) => ({
          ...p,
          usedCodes: [...p.usedCodes, c],
          me: {
            nickname: nickname.trim(),
            dong: dong.trim(),
            neighborCode: makeCode(),
            consentedAt: now,
            lastCheckinAt: now,
            remindedAt: null,
            missedAt: null,
          },
        }));
        return null;
      },
      async checkin() {
        commit((p) => (p.me ? { ...p, me: { ...p.me, lastCheckinAt: Date.now(), remindedAt: null, missedAt: null } } : p));
        return null;
      },
      // 연습용에서는 이웃의 "이름"으로 찾아요.
      async addGuardian(name) {
        const s = cur();
        const found = NEIGHBORS.find((n) => n.name === name.trim());
        if (!found) return "그 이름의 이웃을 찾지 못했어요. 이름을 정확히 적어 주세요.";
        if (s.guardians.some((g) => g.id === found.id)) return "이미 등록한 이웃이에요.";
        if (s.guardians.length >= MAX_GUARDIANS) return `지킴이는 최대 ${MAX_GUARDIANS}명까지 등록할 수 있어요.`;
        commit((p) => ({ ...p, guardians: [...p.guardians, { ...found, status: "pending" }] }));
        return null;
      },
      async removeGuardian(id) {
        commit((p) => ({ ...p, guardians: p.guardians.filter((g) => g.id !== id) }));
        return null;
      },
      async sendSos() {
        const s = cur();
        if (s.sos) return null; // 이미 보냈으면 다시 보내지 않아요.
        const n = s.guardians.filter((g) => g.status === "accepted").length;
        if (n === 0) return "수락한 지킴이가 아직 없어요. 급하면 119에 먼저 전화해 주세요.";
        const now = Date.now();
        commit((p) => ({
          ...p,
          sos: { alertId: uid(), at: now, enRoute: [] },
          notices: [{ id: uid(), at: now, kind: "sos", text: `SOS를 지킴이 이웃 ${n}명에게 보냈어요.` }, ...p.notices],
        }));
        return null;
      },
      async endSos() {
        commit((p) => ({ ...p, sos: null }));
        return null;
      },
      demo: {
        // 이웃이 수락했다고 가정
        accept(id) {
          commit((p) => ({ ...p, guardians: p.guardians.map((g) => (g.id === id ? { ...g, status: "accepted" } : g)) }));
        },
        // 이웃이 "가는 중"을 눌렀다고 가정
        enRoute() {
          commit((p) => {
            if (!p.sos) return p;
            const next = p.guardians.find((g) => g.status === "accepted" && !p.sos!.enRoute.includes(g.name));
            return next ? { ...p, sos: { ...p.sos, enRoute: [...p.sos.enRoute, next.name] } } : p;
          });
        },
        // 마지막 안부 시각을 과거로 당겨서 시간이 지난 것처럼 만들어요.
        fastForward(hours) {
          commit((p) => (p.me ? { ...p, me: { ...p.me, lastCheckinAt: p.me.lastCheckinAt - hours * HOUR } } : p));
        },
        resetAll() {
          commit(() => EMPTY);
        },
      },
    };
  }, [commit]);

  const state = useMemo<State>(
    () => ({
      mode: "mock",
      auth: !loaded ? "loading" : data.me ? "ready" : "needsProfile",
      me: data.me,
      guardians: data.guardians,
      watching: [],
      incomingSos: [],
      notices: data.notices,
      sos: data.sos,
    }),
    [data, loaded]
  );

  return { state, actions };
};
