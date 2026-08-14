import { redirect } from "next/navigation";
import { AppShell, Badge, Button, Card, PageHeader } from "../components/ui";
import { CourseApplicationProvider, CourseApplyButton } from "../components/CourseApplicationProvider";
import { CourseCancelButton } from "../components/CourseCancelButton";
import {
  formatSeoulDateTime,
  getApplicationWindow,
  type ApplicationWindowStatus,
} from "../lib/application-window";
import {
  formatCourseDateRange,
  getStudentCourses,
  type StudentCourseData,
} from "../lib/student-courses";
import {
  getStudentCourseActionState,
  isStudentEligible,
  type StudentCourseActionState,
} from "../lib/student-course-rules";
import { getStudentSession } from "../lib/student-session";
import { getSupabaseServerClient } from "../lib/supabase-server";
import type { Student } from "../types/database";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statusContent: Record<
  ApplicationWindowStatus,
  { badge: string; tone: "gray" | "blue" | "mint" | "red"; message: string }
> = {
  NOT_CONFIGURED: { badge: "일정 미정", tone: "gray", message: "수강신청 일정이 아직 등록되지 않았습니다." },
  BEFORE: { badge: "신청 전", tone: "blue", message: "아직 수강신청 시간이 아닙니다." },
  OPEN: { badge: "신청 중", tone: "mint", message: "현재 수강신청이 진행 중입니다. 선착순으로 마감됩니다." },
  CLOSED: { badge: "신청 종료", tone: "red", message: "수강신청이 종료되었습니다." },
};

const actionContent: Record<StudentCourseActionState, { label: string; badge: string; tone: "gray" | "blue" | "mint" | "red" }> = {
  APPLY: { label: "신청하기", badge: "신청 가능", tone: "mint" },
  FULL: { label: "마감", badge: "마감", tone: "red" },
  BEFORE: { label: "신청 전", badge: "신청 전", tone: "blue" },
  CLOSED: { label: "신청 종료", badge: "신청 종료", tone: "gray" },
  NOT_CONFIGURED: { label: "일정 미정", badge: "일정 미정", tone: "gray" },
  ALREADY_APPLIED: { label: "신청 완료", badge: "신청 완료", tone: "mint" },
  OTHER_COURSE_APPLIED: { label: "신청 불가", badge: "다른 강좌 신청 완료", tone: "gray" },
  NOT_ELIGIBLE: { label: "신청 조건 미충족", badge: "조건 미충족", tone: "red" },
};

export default async function Page() {
  const session = await getStudentSession();
  if (!session) redirect("/");

  const { data: student, error } = await getSupabaseServerClient()
    .from("students")
    .select("grade, department, student_number, name, must_change_password, password_updated_at")
    .eq("id", session.studentId)
    .eq("academic_year", session.academicYear)
    .returns<
      Array<Pick<Student, "grade" | "department" | "student_number" | "name" | "must_change_password" | "password_updated_at">>
    >()
    .maybeSingle();

  if (error || !student) redirect("/");
  if (student.must_change_password || !student.password_updated_at) redirect("/student/change-password");

  let courseData: StudentCourseData | null = null;
  let courseReadFailed = false;
  const applicationWindowPromise = getApplicationWindow();
  try {
    courseData = await getStudentCourses(session.studentId);
  } catch {
    courseReadFailed = true;
  }
  const applicationWindow = await applicationWindowPromise;
  const content = statusContent[applicationWindow.status];
  const hasSchedule = applicationWindow.applicationStart && applicationWindow.applicationEnd;
  const myCourse = courseData?.courses.find((course) => course.id === courseData?.myAppliedCourseId) ?? null;

  return (
    <AppShell role="student">
      <PageHeader
        eyebrow={`${student.grade}학년 ${student.department} ${student.student_number}번`}
        title={`${student.name} 학생의 신청 가능한 강좌`}
        description="강좌 정보를 확인하고 원하는 방과후 수업을 선택하세요."
        action={<form action="/api/student/logout" method="post"><Button type="submit" variant="secondary">학생 변경</Button></form>}
      />

      <div className="grid-2 mb-6">
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-blue-700">수강신청 기간</p>
              {hasSchedule ? <p className="mt-2 font-extrabold text-slate-900">{formatSeoulDateTime(applicationWindow.applicationStart)}<span className="mx-2 text-slate-400">~</span>{formatSeoulDateTime(applicationWindow.applicationEnd)}</p> : null}
            </div>
            <Badge tone={content.tone}>{content.badge}</Badge>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">{content.message}</p>
          {applicationWindow.status === "BEFORE" ? <p className="mt-1 text-sm text-slate-500">{formatSeoulDateTime(applicationWindow.applicationStart)}부터 신청할 수 있습니다.</p> : null}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-500"><span>접수 방식 · 선착순</span><span>1인 1과목만 신청할 수 있습니다.</span></div>
        </Card>

        <Card className="p-6">
          <p className="text-sm font-bold text-blue-700">내 신청 현황</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div><p className="text-sm text-slate-500">신청 강좌 수</p><p className="text-2xl font-black text-slate-900">{courseData?.myAppliedCourseId ? "1 / 1" : "0 / 1"}</p></div>
            {courseData?.myAppliedCourseId ? <Badge tone="mint">신청 완료</Badge> : <Badge tone="gray">신청 없음</Badge>}
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">{courseData?.myAppliedCourseId ? myCourse?.subject ?? "신청한 강좌" : "아직 신청한 강좌가 없습니다."}</p>
          {myCourse ? <p className="mt-1 text-sm text-slate-500">{formatCourseDateRange(myCourse.lectureStartDate, myCourse.lectureEndDate)} · {myCourse.lectureDays ?? "요일 미정"}</p> : null}
          {courseData?.myAppliedCourseId ? <p className="mt-3 text-xs text-slate-500">1인 1과목만 신청할 수 있어 다른 강좌는 신청할 수 없습니다.</p> : null}
          {courseData?.myAppliedCourseId ? <CourseCancelButton subject={myCourse?.subject ?? "신청한 강좌"} disabledReason={applicationWindow.status === "OPEN" ? undefined : applicationWindow.status === "CLOSED" ? "신청기간이 종료되어 취소할 수 없습니다." : "현재는 수강신청을 취소할 수 없습니다."} /> : null}
        </Card>
      </div>

      {courseReadFailed ? (
        <Card className="p-8 text-center"><h2 className="font-extrabold text-slate-900">강좌 정보를 불러오지 못했습니다.</h2><p className="mt-2 text-sm text-slate-500">잠시 후 다시 시도해주세요.</p></Card>
      ) : courseData?.courses.length ? (
        <CourseApplicationProvider>
        <div className="grid-3">
          {courseData.courses.map((course) => {
            const eligible = isStudentEligible(student.grade, course.eligibility);
            const action = getStudentCourseActionState({ courseId: course.id, myAppliedCourseId: courseData?.myAppliedCourseId ?? null, remainingSeats: course.remainingSeats, eligible, windowStatus: applicationWindow.status });
            const actionView = actionContent[action];
            return (
              <Card className="p-5" key={course.id}>
                <div className="flex items-start justify-between gap-3"><Badge tone={actionView.tone}>{actionView.badge}</Badge><b className="text-sm text-slate-500">#{course.sequence}</b></div>
                <h2 className="mt-5 text-lg font-extrabold">{course.subject}</h2>
                <div className="mt-4 space-y-2 text-sm text-slate-500">
                  <p>강의 일자 · {formatCourseDateRange(course.lectureStartDate, course.lectureEndDate)}</p>
                  <p>강의 요일 · {course.lectureDays ?? "요일 미정"}</p>
                  <p>신청 조건 · {course.eligibility}</p>
                  <p>신청 인원 · {course.applicantCount} / {course.capacity}명</p>
                </div>
                <div className="mt-4"><Badge tone={course.remainingSeats > 0 ? "blue" : "red"}>{course.remainingSeats > 0 ? `잔여 ${course.remainingSeats}명` : "마감"}</Badge></div>
                {action === "APPLY" ? <CourseApplyButton courseId={course.id} /> : <Button type="button" className="mt-6 w-full" disabled variant="secondary">{actionView.label}</Button>}
              </Card>
            );
          })}
        </div>
        </CourseApplicationProvider>
      ) : (
        <Card className="p-8 text-center"><h2 className="font-extrabold text-slate-900">현재 신청 가능한 방과후 강좌가 없습니다.</h2><p className="mt-2 text-sm text-slate-500">강좌가 등록되면 이 화면에서 확인할 수 있습니다.</p></Card>
      )}
      <p className="mt-6 text-center text-sm text-slate-400">표시된 잔여석은 실시간으로 달라질 수 있으며, 최종 신청 결과는 서버에서 확정됩니다.</p>
    </AppShell>
  );
}
