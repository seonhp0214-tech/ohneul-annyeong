// GET /auth/confirm?token_hash=...&type=email : 이메일 속 링크를 눌렀을 때의 보조 로그인 경로.
// (기본은 앱 안에서 6자리 코드를 입력하는 방식이에요.) 끝나면 항상 같은 사이트의 "/" 로만 보내요.
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

const ALLOWED_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite", "recovery", "email_change"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const home = new URL("/", url.origin); // 다른 주소로는 절대 보내지 않아요 (open redirect 방지)
  const failed = new URL("/?auth=failed", url.origin);

  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) {
    return NextResponse.redirect(failed, 303);
  }

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(failed, 303);

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  return NextResponse.redirect(error ? failed : home, 303);
}
