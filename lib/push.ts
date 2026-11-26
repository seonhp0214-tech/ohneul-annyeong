// 서버 전용: 웹 푸시(알림) 보내기. 화면("use client") 파일에서 가져오지 마세요.
// 비밀 키(VAPID_PRIVATE_KEY, VAPID_SUBJECT)는 서버 환경 변수에서만 읽어요.
import * as webpush from "web-push"; // web-push 는 default export 가 없어서 이렇게 불러와요 (빌드에서만 드러나는 문제)
import { getAdminClient } from "@/lib/supabase/admin";

export type PushPayload = { title: string; body: string; url?: string };
export type PushSubscriptionRow = { endpoint: string; p256dh: string; auth_key: string };

let vapidReady = false;

/** 푸시를 보낼 준비(VAPID 키)가 됐는지. 부를 때마다 확인하고, 처음 한 번만 web-push 를 설정해요. */
export function pushConfigured(): boolean {
  if (vapidReady) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

/** 주어진 구독들에 알림을 보내요. 만료(404/410)된 구독은 지워요. 실패해도 예외를 던지지 않아요. */
export async function sendPush(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (subscriptions.length === 0 || !pushConfigured()) return { sent: 0, removed: 0 };

  const body = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? "/" });
  const expired: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          body,
          { TTL: 60 * 60, urgency: "high" },
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(sub.endpoint);
      }
    }),
  );

  let removed = 0;
  if (expired.length > 0) {
    const admin = getAdminClient();
    if (admin) {
      const { error } = await admin.from("push_subscriptions").delete().in("endpoint", expired);
      if (!error) removed = expired.length;
    }
  }
  return { sent, removed };
}

/** 사용자 id 들의 구독을 찾아 알림을 보내요 (관리자 연결 필요). */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  const ids = [...new Set(userIds)].filter(Boolean);
  const admin = getAdminClient();
  if (ids.length === 0 || !admin || !pushConfigured()) return { sent: 0, removed: 0 };

  const { data, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .in("user_id", ids);
  if (error || !data) return { sent: 0, removed: 0 };
  return sendPush(data as PushSubscriptionRow[], payload);
}

// ---- 알림 문구 (개인정보 최소화: 닉네임 + 동까지만, 의학적 판단 표현 없음) ----

export function reminderPayload(): PushPayload {
  return { title: "오늘도 안녕", body: "오늘 아직 안부를 전하지 않았어요. 앱을 열어 버튼을 한 번 눌러 주세요." };
}

/** 지킴이에게: 닉네임만 */
export function missedPayload(nickname: string): PushPayload {
  return { title: "오늘도 안녕", body: `${nickname}님의 안부가 오래 확인되지 않았어요. 전화로 먼저 확인해 주세요.` };
}

/** 지킴이에게: 닉네임 + 동 */
export function sosPayload(nickname: string, dong: string): PushPayload {
  return { title: "도움 요청이 왔어요", body: `${dong}의 ${nickname}님이 도움을 요청했어요.` };
}

/** SOS 보낸 사람에게: 지킴이 닉네임만 */
export function enRoutePayload(guardianNickname: string): PushPayload {
  return { title: "도움이 가고 있어요", body: `${guardianNickname}님이 가고 있다고 알려 왔어요.` };
}
