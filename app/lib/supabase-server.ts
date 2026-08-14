import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
let serverClient: SupabaseClient | undefined;

export function getSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase 서버 환경변수가 설정되지 않았습니다.");
  serverClient ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return serverClient;
}
