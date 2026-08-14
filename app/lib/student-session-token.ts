import { SignJWT, jwtVerify } from "jose";

export const STUDENT_SESSION_COOKIE = "student_session";
export const STUDENT_SESSION_MAX_AGE = 60 * 60 * 4;

export interface StudentSession { studentId:string; academicYear:number; issuedAt:number; expiration:number }

function secretKey(secret:string) {
  if (secret.length < 32) throw new Error("STUDENT_SESSION_SECRET은 32자 이상이어야 합니다.");
  return new TextEncoder().encode(secret);
}

export async function signStudentSession(studentId:string, academicYear:number, secret:string) {
  return new SignJWT({ academicYear }).setProtectedHeader({ alg:"HS256", typ:"JWT" }).setSubject(studentId).setIssuedAt().setExpirationTime(`${STUDENT_SESSION_MAX_AGE}s`).sign(secretKey(secret));
}

export async function verifyStudentSessionToken(token:string, secret:string):Promise<StudentSession|null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), { algorithms:["HS256"] });
    if (!payload.sub || typeof payload.academicYear!=="number" || !payload.iat || !payload.exp) return null;
    return { studentId:payload.sub, academicYear:payload.academicYear, issuedAt:payload.iat, expiration:payload.exp };
  } catch { return null; }
}
