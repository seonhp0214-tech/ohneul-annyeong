"use client";
// 실제 Supabase(데이터베이스)에 연결하는 구현입니다. lib/data/types.ts 의 약속(UseApp)을 그대로 지켜요.
// - 연결은 "부를 때" 만들어요 (키가 없어도 앱이 멈추지 않아요).
// - 데이터를 바꾸는 일은 DB 함수(rpc)로만 해요. SOS 는 푸시를 보내야 해서 서버 라우트(/api/sos)를 거쳐요.
// - 30초마다, 그리고 화면이 다시 보일 때마다 새로고침해요.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase/client";
import type {
  AppActions,
  AuthPhase,
  Guardian,
  IncomingSos,
  LinkStatus,
  Me,
  Notice,
  Result,
  State,
  UseApp,
  Watched,
} from "./types";

const POLL_MS = 30_000;

const MSG_GENERIC = "잠시 후 다시 시도해 주세요.";
const MSG_NOT_CONFIGURED = "서버 설정이 아직 끝나지 않았어요.";
const MSG_OFFLINE = "인터넷 연결을 확인하고 다시 시도해 주세요.";

type Data = Pick<State, "me" | "guardians" | "watching" | "incomingSos" | "notices" | "sos">;
type Phase = "loading" | "signedOut" | "needsProfile" | "ready";

const EMPTY: Data = { me: null, guardians: [], watching: [], incomingSos: [], notices: [], sos: null };

// ---- DB 가 돌려주는 줄의 모양 ----
type ProfileRow = {
  nickname: string;
  dong: string;
  neighbor_code: string;
  consented_at: string;
  last_checkin_at: string;
  reminded_at: string | null;
  guardian_alerted_at: string | null;
};
type GuardianRow = { id: string; name: string; dong: string; status: LinkStatus };
type WatchedRow = GuardianRow & { last_checkin_at: string | null };
type AlertRow = {
  alert_id: string;
  kind: "reminder" | "missed" | "sos";
  created_at: string;
  owner_name: string;
  dong: string;
  resolved_at: string | null;
  is_mine: boolean;
};
type OpenSosRow = { alert_id: string; created_at: string; responders: string[] | null };
type IncomingRow = { alert_id: string; owner_name: string; dong: string; created_at: string; i_responded: boolean };

type DbError = { code?: string; message?: string };

/** DB 오류를 한국어로. SQL 함수가 직접 낸 오류(P0001)는 이미 한국어라 그대로, 나머지는 일반 문구. */
function friendly(error: DbError | null | undefined): string {
  if (error && error.code === "P0001" && error.message) return error.message;
  return MSG_GENERIC;
}

const ms = (iso: string) => new Date(iso).getTime();
const msOrNull = (iso: string | null) => (iso ? ms(iso) : null);

function toNotices(rows: AlertRow[]): Notice[] {
  return rows.map((a): Notice => {
    const at = ms(a.created_at);
    if (a.is_mine) {
      if (a.kind === "reminder") return { id: a.alert_id, at, kind: "reminder", text: "오늘 아직 안부를 전하지 않았어요." };
      if (a.kind === "missed")
        return { id: a.alert_id, at, kind: "missed", text: "이틀 동안 안부가 없어 지킴이에게 알렸어요." };
      return { id: a.alert_id, at, kind: "sos", text: a.resolved_at ? "보냈던 SOS를 끝냈어요." : "SOS를 보냈어요." };
    }
    if (a.kind === "missed")
      return {
        id: a.alert_id,
        at,
        kind: "missed",
        text: `${a.owner_name}님(${a.dong})의 안부가 오래 확인되지 않았어요. 전화로 먼저 확인해 주세요.`,
      };
    return {
      id: a.alert_id,
      at,
      kind: "sos",
      text: a.resolved_at ? `${a.owner_name}님의 도움 요청이 끝났어요.` : `${a.dong}의 ${a.owner_name}님이 도움을 요청했어요.`,
    };
  });
}

/** "https://..." 용 공개 키(base64url)를 브라우저가 쓰는 바이트로 바꿔요. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function postJson(url: string, body?: unknown): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) return null;
    if (res.status === 503) return MSG_NOT_CONFIGURED;
    if (res.status === 401) return "로그인이 필요해요. 다시 로그인해 주세요.";
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    return json?.error || MSG_GENERIC;
  } catch {
    return MSG_OFFLINE;
  }
}

export const useSupabaseApp: UseApp = () => {
  const [phase, setPhase] = useState<Phase>("loading");
  const [otpPending, setOtpPending] = useState(false);
  const [data, setData] = useState<Data>(EMPTY);
  const seq = useRef(0); // 오래된 응답이 최신 화면을 덮어쓰지 않게
  const phaseRef = useRef<Phase>("loading");

  const commit = useCallback((next: Phase, nextData: Data | null) => {
    phaseRef.current = next;
    setPhase(next);
    if (nextData) setData(nextData);
  }, []);

  const load = useCallback(async (): Promise<void> => {
    const mine = ++seq.current;
    const client = getBrowserClient();
    if (!client) {
      commit("signedOut", EMPTY);
      return;
    }
    try {
      const { data: sessionData } = await client.auth.getSession();
      if (mine !== seq.current) return;
      if (!sessionData.session) {
        commit("signedOut", EMPTY);
        return;
      }

      const prof = await client.rpc("my_profile");
      if (mine !== seq.current) return;
      if (prof.error) throw prof.error; // 잠깐의 오류: 이전 화면을 그대로 두고 다음에 다시 시도
      const profileRow = (prof.data as ProfileRow[] | null)?.[0];
      if (!profileRow) {
        commit("needsProfile", EMPTY);
        return;
      }

      const [g, w, a, inc, open] = await Promise.all([
        client.rpc("my_guardians"),
        client.rpc("my_watched"),
        client.rpc("my_alerts", { p_limit: 30 }),
        client.rpc("incoming_sos"),
        client.rpc("my_open_sos"),
      ]);
      if (mine !== seq.current) return;
      const failed = [g, w, a, inc, open].find((r) => r.error);
      if (failed) throw failed.error;

      const me: Me = {
        nickname: profileRow.nickname,
        dong: profileRow.dong,
        neighborCode: profileRow.neighbor_code,
        consentedAt: ms(profileRow.consented_at),
        lastCheckinAt: ms(profileRow.last_checkin_at),
        remindedAt: msOrNull(profileRow.reminded_at),
        missedAt: msOrNull(profileRow.guardian_alerted_at),
      };
      const guardians: Guardian[] = ((g.data as GuardianRow[] | null) ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        dong: r.dong,
        status: r.status,
      }));
      const watching: Watched[] = ((w.data as WatchedRow[] | null) ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        dong: r.dong,
        status: r.status,
        lastCheckinAt: msOrNull(r.last_checkin_at),
      }));
      const incomingSos: IncomingSos[] = ((inc.data as IncomingRow[] | null) ?? []).map((r) => ({
        alertId: r.alert_id,
        ownerName: r.owner_name,
        dong: r.dong,
        at: ms(r.created_at),
        iAmEnRoute: r.i_responded,
      }));
      const openRow = (open.data as OpenSosRow[] | null)?.[0];
      const sos = openRow
        ? { alertId: openRow.alert_id, at: ms(openRow.created_at), enRoute: openRow.responders ?? [] }
        : null;

      commit("ready", {
        me,
        guardians,
        watching,
        incomingSos,
        notices: toNotices((a.data as AlertRow[] | null) ?? []),
        sos,
      });
    } catch {
      // 잠깐의 오류: 이전 화면을 그대로 두어요. 다시 시도는 아래 effect 의 새로고침이 맡아요.
    }
  }, [commit]);

  // 로그인 상태 변화 감지 + 30초 새로고침 + 화면이 다시 보일 때 새로고침
  useEffect(() => {
    const client = getBrowserClient();
    const first = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), POLL_MS);
    // 처음 불러오기가 실패했다면 4초마다 다시 시도해요 (불러오기에 성공하면 멈춰요).
    const retry = setInterval(() => {
      if (phaseRef.current === "loading") void load();
    }, 4000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    // 콜백 안에서 바로 supabase 를 부르면 멈출 수 있어서, 한 박자 늦춰 불러요.
    const sub = client?.auth.onAuthStateChange(() => {
      setTimeout(() => void load(), 0);
    });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      clearInterval(retry);
      document.removeEventListener("visibilitychange", onVisible);
      sub?.data.subscription.unsubscribe();
    };
  }, [load]);

  const actions = useMemo<AppActions>(() => {
    /** DB 함수를 부르고, 성공하면 화면 데이터를 새로고침해요. */
    const rpc = async (
      op: (c: SupabaseClient) => PromiseLike<{ error: DbError | null }>,
    ): Result => {
      const client = getBrowserClient();
      if (!client) return MSG_NOT_CONFIGURED;
      try {
        const { error } = await op(client);
        if (error) return friendly(error);
        await load();
        return null;
      } catch {
        return MSG_OFFLINE;
      }
    };

    return {
      async requestOtp(email) {
        const client = getBrowserClient();
        if (!client) return MSG_NOT_CONFIGURED;
        const address = email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return "이메일 주소를 다시 확인해 주세요.";
        try {
          const { error } = await client.auth.signInWithOtp({
            email: address,
            options: { shouldCreateUser: true },
          });
          if (error) {
            if (error.status === 429) return "너무 자주 요청했어요. 잠시 뒤에 다시 눌러 주세요.";
            return "메일을 보내지 못했어요. 이메일 주소를 확인하고 다시 시도해 주세요.";
          }
          setOtpPending(true);
          return null;
        } catch {
          return MSG_OFFLINE;
        }
      },

      async verifyOtp(email, code) {
        const client = getBrowserClient();
        if (!client) return MSG_NOT_CONFIGURED;
        const token = code.replace(/\s/g, "");
        if (!token) return "메일로 받은 코드를 입력해 주세요.";
        try {
          const { error } = await client.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
          if (error) return "코드가 맞지 않거나 시간이 지났어요. 다시 확인해 주세요.";
          setOtpPending(false);
          await load();
          return null;
        } catch {
          return MSG_OFFLINE;
        }
      },

      async signOut() {
        const client = getBrowserClient();
        setOtpPending(false);
        try {
          await client?.auth.signOut();
        } catch {
          // 로그아웃 요청이 실패해도 화면은 로그아웃 상태로 돌려요.
        }
        seq.current += 1;
        commit("signedOut", EMPTY);
      },

      async register(code, nickname, dong, consent) {
        if (!consent) return "개인정보 수집·이용에 동의해 주세요.";
        if (!nickname.trim() || !dong.trim()) return "닉네임과 동네를 입력해 주세요.";
        return rpc((c) => c.rpc("redeem_invite", { p_code: code, p_nickname: nickname, p_dong: dong }));
      },

      checkin: () => rpc((c) => c.rpc("checkin")),
      addGuardian: (query) => rpc((c) => c.rpc("request_guardian", { p_code: query })),
      removeGuardian: (linkId) => rpc((c) => c.rpc("remove_guardian", { p_link: linkId })),
      acceptGuardian: (linkId) => rpc((c) => c.rpc("accept_guardian", { p_link: linkId })),
      endSos: () => rpc((c) => c.rpc("end_sos")),

      async sendSos() {
        const error = await postJson("/api/sos");
        if (error) return error;
        await load();
        return null;
      },

      async respondEnRoute(alertId) {
        const error = await postJson("/api/sos/respond", { alertId });
        if (error) return error;
        await load();
        return null;
      },

      // 반드시 버튼을 "누른 순간"에 호출해야 해요 (알림 허용 창은 사용자 동작 안에서만 뜰 수 있어요).
      async enablePush() {
        if (
          typeof window === "undefined" ||
          !("serviceWorker" in navigator) ||
          !("PushManager" in window) ||
          !("Notification" in window)
        ) {
          return "이 기기에서는 알림을 쓸 수 없어요. 홈 화면에 앱을 추가한 뒤 다시 시도해 주세요.";
        }
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return "알림 설정이 아직 끝나지 않았어요.";
        const client = getBrowserClient();
        if (!client) return MSG_NOT_CONFIGURED;
        try {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") return "알림이 꺼져 있어요. 기기 설정에서 알림을 허용해 주세요.";

          await navigator.serviceWorker.register("/sw.js");
          const registration = await navigator.serviceWorker.ready;
          const subscription =
            (await registration.pushManager.getSubscription()) ??
            (await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlBase64ToUint8Array(vapidKey),
            }));

          const json = subscription.toJSON();
          const p256dh = json.keys?.p256dh;
          const auth = json.keys?.auth;
          if (!json.endpoint || !p256dh || !auth) return "알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.";

          const { error } = await client.rpc("save_push_subscription", {
            p_endpoint: json.endpoint,
            p_p256dh: p256dh,
            p_auth: auth,
          });
          if (error) return friendly(error);
          return null;
        } catch {
          return "알림을 켜지 못했어요. 잠시 후 다시 시도해 주세요.";
        }
      },

      refresh: () => load(),
      demo: null,
    };
  }, [load, commit]);

  const state = useMemo<State>(() => {
    const auth: AuthPhase = phase === "signedOut" && otpPending ? "otpSent" : phase;
    return { mode: "supabase", auth, ...data };
  }, [phase, otpPending, data]);

  return { state, actions };
};
