// POST /api/sos/respond  { alertId } : 지킴이가 "가는 중이에요" 를 누르면 기록하고 SOS 보낸 사람에게 푸시를 보내요.
import { createServerSupabase } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { enRoutePayload, sendPushToUsers } from "@/lib/push";
import { friendlyDbError, isSameOrigin, isUuid, jsonError, notConfigured } from "@/lib/api-utils";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  if (!supabase) return notConfigured();
  if (!isSameOrigin(request)) return jsonError("요청을 확인할 수 없어요.", 403);

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return jsonError("로그인이 필요해요.", 401);

  let alertId: unknown;
  try {
    const body = (await request.json()) as { alertId?: unknown };
    alertId = body.alertId;
  } catch {
    return jsonError("요청이 올바르지 않아요.", 400);
  }
  if (!isUuid(alertId)) return jsonError("요청이 올바르지 않아요.", 400);

  const { data: isNew, error } = await supabase.rpc("respond_en_route", { p_alert: alertId });
  if (error) return jsonError(friendlyDbError(error), 400);

  let pushed = 0;
  const admin = getAdminClient();
  if (isNew === true && admin) {
    try {
      const [{ data: alert }, { data: me }] = await Promise.all([
        admin.from("alerts").select("owner_id").eq("id", alertId).maybeSingle(),
        admin.from("profiles").select("nickname").eq("id", user.id).maybeSingle(),
      ]);
      if (alert && me) {
        const result = await sendPushToUsers([alert.owner_id], enRoutePayload(me.nickname));
        pushed = result.sent;
      }
    } catch {
      // 푸시 실패는 무시해도 응답 기록은 이미 저장됐어요.
    }
  }

  return Response.json({ ok: true, pushed });
}
