// /api/cron/due-alerts : 24시간/48시간 동안 체크인이 없는 사람을 찾아 푸시를 보내요.
// 호출하는 곳: Supabase pg_cron (10분마다, supabase/cron.sql) + Vercel Cron (하루 한 번, vercel.json).
// 둘 다 "Authorization: Bearer <CRON_SECRET>" 헤더를 보내요. 맞지 않으면 아무 일도 하지 않고 401.
import { getAdminClient } from "@/lib/supabase/admin";
import { missedPayload, pushConfigured, reminderPayload, sendPushToUsers } from "@/lib/push";
import { jsonError, notConfigured, safeEqual } from "@/lib/api-utils";

type DueRow = {
  alert_id: string;
  kind: "reminder" | "missed";
  owner_id: string;
  owner_name: string;
  dong: string;
  recipient_id: string | null;
};

async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return notConfigured();

  // 1) 가장 먼저 비밀 문자열 확인
  const header = request.headers.get("authorization") ?? "";
  if (!safeEqual(header, `Bearer ${secret}`)) return jsonError("권한이 없어요.", 401);

  // 2) 필요한 설정 확인 (푸시를 못 보낼 상태면 알림을 "처리한 것"으로 만들지 않도록 시작 전에 막아요)
  const admin = getAdminClient();
  if (!admin || !pushConfigured()) return notConfigured();

  // 3) 점검 + 알림 기록 (한 번의 트랜잭션)
  const { data, error } = await admin.rpc("claim_due_alerts");
  if (error) return jsonError("잠시 후 다시 시도해 주세요.", 500);
  const rows = (data ?? []) as DueRow[];

  // 4) 알림별로 받을 사람 모으기
  const alerts = new Map<string, { kind: DueRow["kind"]; ownerName: string; recipients: string[] }>();
  for (const row of rows) {
    const entry = alerts.get(row.alert_id) ?? { kind: row.kind, ownerName: row.owner_name, recipients: [] };
    if (row.recipient_id) entry.recipients.push(row.recipient_id);
    alerts.set(row.alert_id, entry);
  }

  // 5) 푸시 보내기 (지킴이에게는 닉네임만, 동/연락처는 보내지 않아요)
  const doneIds: string[] = [];
  let sent = 0;
  for (const [alertId, entry] of alerts) {
    try {
      const payload = entry.kind === "reminder" ? reminderPayload() : missedPayload(entry.ownerName);
      const result = await sendPushToUsers(entry.recipients, payload);
      sent += result.sent;
      doneIds.push(alertId); // 받을 사람이 없어도 처리 완료로 표시
    } catch {
      // 이 알림은 pushed_at 을 비워 두어 다음 점검 때 다시 시도해요.
    }
  }

  // 6) 보낸 알림에 표시
  if (doneIds.length > 0) {
    await admin.from("alerts").update({ pushed_at: new Date().toISOString() }).in("id", doneIds);
  }

  return Response.json({ ok: true, alerts: alerts.size, sent });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
