// 서버(라우트 핸들러)에서 "지금 로그인한 사용자"로 Supabase 를 쓰는 연결.
// 쿠키에 들어 있는 로그인 정보를 읽어요. (Next.js 16: cookies() 는 비동기라 await 필요)
// 키가 없으면 null.
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createServerSupabase(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cookieStore = await cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 쿠키를 쓸 수 없는 자리(서버 컴포넌트 등)에서는 무시해도 괜찮아요.
        }
      },
    },
  });
}
