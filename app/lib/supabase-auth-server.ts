import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../types/database";
export async function createSupabaseAuthServerClient(){const store=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)throw new Error("Supabase 공개 환경변수를 설정하세요.");return createServerClient<Database>(url,key,{cookies:{getAll:()=>store.getAll(),setAll:(values)=>{try{values.forEach(({name,value,options})=>store.set(name,value,options))}catch{}}}})}
