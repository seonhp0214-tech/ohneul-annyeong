// 브라우저(화면)에서 쓰는 Supabase 연결. 공개 키(anon)만 사용해요.
// 키가 없으면 null 을 돌려줘요. 부르는 쪽에서 null 을 꼭 확인하세요.
// 모듈이 읽힐 때가 아니라 "부를 때" 만들기 때문에, 키가 없어도 앱이 멈추지 않아요.
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  if (cached) return cached;
  // NEXT_PUBLIC_ 값은 Next.js 가 글자 그대로 찾아 바꿔 넣으므로 아래처럼 직접 적어야 해요.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  cached = createBrowserClient(url, anon);
  return cached;
}
