import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../types/database";
let browserClient:ReturnType<typeof createBrowserClient<Database>>|undefined;
export function getSupabaseBrowserClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)throw new Error("Supabase 공개 환경변수를 설정하세요.");browserClient??=createBrowserClient<Database>(url,key);return browserClient}
