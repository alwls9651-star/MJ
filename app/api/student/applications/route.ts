import { NextResponse } from "next/server";
import { CURRENT_ACADEMIC_YEAR } from "../../../lib/academic-year";
import {
  COURSE_APPLICATION_MESSAGES,
  isCourseApplicationCode,
  type CourseApplicationCode,
} from "../../../lib/course-application";
import {
  COURSE_CANCELLATION_MESSAGES,
  isCourseCancellationCode,
  type CourseCancellationCode,
} from "../../../lib/course-cancellation";
import { getStudentSession } from "../../../lib/student-session";
import { getSupabaseServerClient } from "../../../lib/supabase-server";
import type { Student } from "../../../types/database";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RpcRow = {
  success: boolean;
  code: string;
  application_id: string | null;
  applied_at: string | null;
};

function statusFor(code: CourseApplicationCode) {
  if (code === "APPLIED") return 200;
  if (code === "FULL" || code === "ALREADY_APPLIED") return 409;
  if (code === "NOT_ELIGIBLE" || code === "PASSWORD_CHANGE_REQUIRED") return 403;
  return 400;
}

export async function POST(request: Request) {
  try {
    const session = await getStudentSession();
    if (!session) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const body = (await request.json()) as Record<string, unknown>;
    if ("studentId" in body || typeof body.courseId !== "string" || !UUID_PATTERN.test(body.courseId)) {
      return NextResponse.json({ message: "올바른 강좌를 선택해주세요." }, { status: 400 });
    }

    const service = getSupabaseServerClient();
    const { data: student, error: studentError } = await service
      .from("students")
      .select("id, academic_year, must_change_password, password_updated_at")
      .eq("id", session.studentId)
      .eq("academic_year", session.academicYear)
      .returns<Array<Pick<Student, "id" | "academic_year" | "must_change_password" | "password_updated_at">>>()
      .maybeSingle();

    if (studentError || !student || session.academicYear !== CURRENT_ACADEMIC_YEAR) {
      return NextResponse.json({ message: "학생 정보를 확인할 수 없습니다." }, { status: 401 });
    }
    if (student.must_change_password || !student.password_updated_at) {
      return NextResponse.json({ message: COURSE_APPLICATION_MESSAGES.PASSWORD_CHANGE_REQUIRED }, { status: 403 });
    }

    const { data, error } = await service.rpc("apply_for_course", {
      p_student_id: student.id,
      p_course_id: body.courseId,
      p_academic_year: CURRENT_ACADEMIC_YEAR,
    });
    if (error) throw error;

    const row = (data?.[0] ?? null) as RpcRow | null;
    if (!row || !isCourseApplicationCode(row.code)) throw new Error("INVALID_APPLICATION_RESULT");
    const code = row.code;
    return NextResponse.json(
      {
        success: row.success,
        code,
        message: COURSE_APPLICATION_MESSAGES[code],
        ...(row.success ? { applicationId: row.application_id, appliedAt: row.applied_at } : {}),
      },
      { status: statusFor(code) },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "수강신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}

function cancellationStatusFor(code: CourseCancellationCode) {
  if (code === "CANCELLED") return 200;
  if (code === "NO_ACTIVE_APPLICATION") return 409;
  if (code === "PASSWORD_CHANGE_REQUIRED") return 403;
  return 400;
}

export async function DELETE() {
  try {
    const session = await getStudentSession();
    if (!session) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });

    const service = getSupabaseServerClient();
    const { data: student, error: studentError } = await service
      .from("students")
      .select("id, academic_year, must_change_password, password_updated_at")
      .eq("id", session.studentId)
      .eq("academic_year", session.academicYear)
      .returns<Array<Pick<Student, "id" | "academic_year" | "must_change_password" | "password_updated_at">>>()
      .maybeSingle();

    if (studentError || !student || session.academicYear !== CURRENT_ACADEMIC_YEAR) {
      return NextResponse.json({ message: "학생 정보를 확인할 수 없습니다." }, { status: 401 });
    }
    if (student.must_change_password || !student.password_updated_at) {
      return NextResponse.json({ message: COURSE_CANCELLATION_MESSAGES.PASSWORD_CHANGE_REQUIRED }, { status: 403 });
    }

    const { data, error } = await service.rpc("cancel_course_application", {
      p_student_id: student.id,
      p_academic_year: CURRENT_ACADEMIC_YEAR,
    });
    if (error) throw error;

    const row = (data?.[0] ?? null) as { success: boolean; code: string; application_id: string | null; cancelled_at: string | null } | null;
    if (!row || !isCourseCancellationCode(row.code)) throw new Error("INVALID_CANCELLATION_RESULT");
    const code = row.code;
    return NextResponse.json(
      {
        success: row.success,
        code,
        message: COURSE_CANCELLATION_MESSAGES[code],
        ...(row.success ? { applicationId: row.application_id, cancelledAt: row.cancelled_at } : {}),
      },
      { status: cancellationStatusFor(code) },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "수강신청 취소 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
