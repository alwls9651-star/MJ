import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Teacher, TeacherRole } from "../types/database";
import { createSupabaseAuthServerClient } from "./supabase-auth-server";
import { getSupabaseServerClient } from "./supabase-server";

export async function linkAndGetStaff(user:User):Promise<Teacher|null>{
  const email=user.email?.trim().toLowerCase();if(!email)return null;
  const service=getSupabaseServerClient();
  const {data}=await service.from("teachers").select("*").eq("email",email).eq("is_active",true).returns<Teacher[]>().maybeSingle();
  if(!data)return null;
  if(data.auth_user_id&&data.auth_user_id!==user.id)return null;
  if(!data.auth_user_id){const {data:linked}=await service.from("teachers").update({auth_user_id:user.id}).eq("id",data.id).is("auth_user_id",null).select("*").returns<Teacher[]>().maybeSingle();if(!linked)return null;return linked}
  return data;
}

export async function getCurrentStaff(){const auth=await createSupabaseAuthServerClient();const {data:{user}}=await auth.auth.getUser();if(!user)return null;return linkAndGetStaff(user)}
export async function requireStaff(roles:TeacherRole[]=["teacher","admin"]){const staff=await getCurrentStaff();if(!staff)redirect("/staff/login");if(!roles.includes(staff.role))redirect(staff.role==="teacher"?"/teacher":"/admin");return staff}
