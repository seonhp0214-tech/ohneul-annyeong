// 서버 전용: 모든 보호를 건너뛰는 관리자(service role) 연결.
// 절대로 "use client" 파일에서 가져오지 마세요. 키는 SUPABASE_SERVICE_ROLE_KEY (NEXT_PUBLIC_ 아님).
// (참고: `import "server-only"` 패키지가 이 프로젝트에 설치돼 있지 않아 넣지 않았어요.)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}
