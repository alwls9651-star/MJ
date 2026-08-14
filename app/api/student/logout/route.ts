import { NextResponse } from "next/server";
import { STUDENT_SESSION_COOKIE } from "../../../lib/student-session-token";
export async function POST(request:Request){const response=NextResponse.redirect(new URL("/",request.url),303);response.cookies.set(STUDENT_SESSION_COOKIE,"",{httpOnly:true,sameSite:"lax",path:"/",secure:process.env.NODE_ENV==="production",maxAge:0});return response}
