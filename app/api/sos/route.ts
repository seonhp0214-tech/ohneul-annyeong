// POST /api/sos : 로그인한 사용자 이름으로 SOS 를 만들고, 수락한 지킴이들에게 푸시를 보내요.
// 요청마다 쿠키를 읽으므로 캐시되지 않아요.
import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers, sosPayload } from "@/lib/push";
import { friendlyDbError, isSameOrigin, jsonError, notConfigured } from "@/lib/api-utils";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return notConfigured();
  if (!isSameOrigin(request)) return jsonError("요청을 확인할 수 없어요.", 403);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return jsonError("로그인이 필요해요.", 401);

  const { data, error } = await supabase.rpc("send_sos");
  if (error) return jsonError(friendlyDbError(error), 400);

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return jsonError("잠시 후 다시 시도해 주세요.", 500);

  // 새로 만든 SOS 일 때만 푸시 (같은 SOS 를 다시 눌러도 알림이 반복되지 않게)
  let pushed = 0;
  const admin = getAdminClient();
  if (row.is_new && admin) {
    try {
      const [{ data: owner }, { data: links }] = await Promise.all([
        admin.from("profiles").select("nickname, dong").eq("id", user.id).maybeSingle(),
        admin.from("guardians").select("guardian_id").eq("owner_id", user.id).eq("status", "accepted"),
      ]);
      if (owner && links) {
        const result = await sendPushToUsers(
          links.map((l: { guardian_id: string }) => l.guardian_id),
          sosPayload(owner.nickname, owner.dong),
        );
        pushed = result.sent;
      }
    } catch {
      // 푸시가 실패해도 SOS 기록은 이미 남았어요. 지킴이 화면에서도 확인돼요.
    }
  }

  return Response.json({ ok: true, alertId: row.alert_id, acceptedCount: row.accepted_count, pushed });
}
