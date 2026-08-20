import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabase-server";
import { createSupabaseAuthServerClient } from "../../../lib/supabase-auth-server";

export async function POST(request: Request) {
  let stage = "input";

  try {
    const { email: raw } = (await request.json()) as { email?: string };
    const email = raw?.trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "invalid" }, { status: 400 });

    stage = "teacher";
    const { data } = await getSupabaseServerClient()
      .from("teachers")
      .select("id")
      .eq("email", email)
      .eq("is_active", true)
      .maybeSingle();
    if (!data) {
      return NextResponse.json({ error: "not_registered" }, { status: 403 });
    }

    stage = "otp";
    const auth = await createSupabaseAuthServerClient();
    const { error } = await auth.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("staff otp request failed", {
      stage,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }
}

