import { cookies } from "next/headers";
import { STUDENT_SESSION_COOKIE, verifyStudentSessionToken } from "./student-session-token";

export async function getStudentSession() {
  const secret = process.env.STUDENT_SESSION_SECRET;
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value;
  if (!secret || !token) return null;
  return verifyStudentSessionToken(token, secret);
}
