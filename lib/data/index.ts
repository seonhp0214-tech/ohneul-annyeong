// 어떤 저장소를 쓸지 앱이 시작될 때 딱 한 번만 정해요. (훅 순서가 바뀌면 안 되기 때문이에요)
import type { UseApp } from "./types";
import { useMockApp } from "./mock";
import { useSupabaseApp } from "./supabase";

// process.env.NEXT_PUBLIC_... 를 직접 써야 Next가 빌드할 때 값을 넣어 줘요.
const CONFIGURED = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const useApp: UseApp = CONFIGURED ? useSupabaseApp : useMockApp;

export * from "./types";
