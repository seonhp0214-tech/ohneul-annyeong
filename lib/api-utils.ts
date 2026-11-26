// 서버 라우트(app/api/*)가 함께 쓰는 작은 도우미들. 서버 전용 (화면 코드에서 가져오지 마세요).
import { timingSafeEqual, createHash } from "node:crypto";

export const NOT_CONFIGURED_MESSAGE = "서버 설정이 아직 끝나지 않았어요.";
export const GENERIC_ERROR_MESSAGE = "잠시 후 다시 시도해 주세요.";

/** 필요한 환경 변수가 없을 때: 빌드/배포는 통과시키고 요청에만 503 으로 답해요. */
export function notConfigured(): Response {
  return Response.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/**
 * 데이터베이스 오류를 한국어로 바꿔요.
 * SQL 함수에서 직접 낸 오류(코드 P0001)는 이미 한국어라 그대로 보여주고,
 * 그 밖의 오류는 내용을 숨기고 일반 문구로 바꿔요.
 */
export function friendlyDbError(error: { code?: string; message?: string } | null | undefined): string {
  if (error && error.code === "P0001" && error.message) return error.message;
  return GENERIC_ERROR_MESSAGE;
}

/** 다른 사이트에서 몰래 보낸 요청을 막기 위해, 브라우저가 알려 주는 출처(Origin)가 같은 사이트인지 확인해요. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // 브라우저가 아닌 호출 (로그인 쿠키가 없으므로 어차피 거절돼요)
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

/** 비밀 문자열 비교 (걸리는 시간으로 값을 추측하지 못하게). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
