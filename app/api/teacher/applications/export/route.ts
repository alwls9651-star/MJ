import { NextResponse } from "next/server";
import { CURRENT_ACADEMIC_YEAR } from "../../../../lib/academic-year";
import { getCurrentStaff } from "../../../../lib/staff-auth";
import { getTeacherCourseRoster, TeacherCourseForbiddenError } from "../../../../lib/teacher-applications";
import {
  createTeacherRosterWorkbook,
  excelContentDisposition,
  sanitizeExcelFilename,
} from "../../../../lib/teacher-roster-workbook";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const staff = await getCurrentStaff();
    if (!staff) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
    if (staff.role !== "teacher" && staff.role !== "admin") {
      return NextResponse.json({ message: "접근 권한이 없습니다." }, { status: 403 });
    }

    const courseId = new URL(request.url).searchParams.get("courseId");
    if (!courseId || !UUID_PATTERN.test(courseId)) {
      return NextResponse.json({ message: "올바른 강좌를 선택해주세요." }, { status: 400 });
    }
    const { roster } = await getTeacherCourseRoster(staff, courseId, true);
    if (!roster) return NextResponse.json({ message: "강좌를 찾을 수 없습니다." }, { status: 404 });

    const buffer = await createTeacherRosterWorkbook(roster, CURRENT_ACADEMIC_YEAR);
    const filename = sanitizeExcelFilename(roster.course.subject, CURRENT_ACADEMIC_YEAR);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": excelContentDisposition(filename, CURRENT_ACADEMIC_YEAR),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof TeacherCourseForbiddenError) {
      return NextResponse.json({ message: "담당 강좌만 다운로드할 수 있습니다." }, { status: 403 });
    }
    return NextResponse.json({ message: "신청자 명단을 생성하지 못했습니다." }, { status: 500 });
  }
}
