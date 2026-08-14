import { TeacherApplicationsView } from "../../components/TeacherApplicationsView";
import { AppShell, Card, PageHeader } from "../../components/ui";
import { CURRENT_ACADEMIC_YEAR } from "../../lib/academic-year";
import { getTeacherCourseRoster } from "../../lib/teacher-applications";
import { requireStaff } from "../../lib/staff-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page({ searchParams }: { searchParams?: Promise<{ courseId?: string }> }) {
  const staff = await requireStaff(["teacher", "admin"]);
  const requestedCourseId = (await searchParams)?.courseId;
  try {
    const { courses, roster } = await getTeacherCourseRoster(staff, requestedCourseId);
    return (
      <AppShell role="teacher">
        <PageHeader
          eyebrow={`${CURRENT_ACADEMIC_YEAR}학년도 · ${staff.role === "admin" ? "관리자 전체 강좌" : `${staff.name} 선생님 담당 강좌`}`}
          title="신청자 명단"
          description="담당 강좌의 현재 신청자와 선착순 신청 시각을 확인합니다."
        />
        {roster ? (
          <TeacherApplicationsView courses={courses} roster={roster} />
        ) : (
          <Card className="p-8 text-center"><h2 className="font-extrabold text-slate-900">현재 담당 중인 방과후 강좌가 없습니다.</h2><p className="mt-2 text-sm text-slate-500">관리자에게 담당 강좌 배정을 확인해주세요.</p></Card>
        )}
      </AppShell>
    );
  } catch {
    return (
      <AppShell role="teacher">
        <PageHeader title="신청자 명단" description="담당 강좌의 현재 신청자를 확인합니다." />
        <Card className="p-8 text-center"><h2 className="font-extrabold text-slate-900">신청자 명단을 불러오지 못했습니다.</h2><p className="mt-2 text-sm text-slate-500">잠시 후 다시 시도해주세요.</p></Card>
      </AppShell>
    );
  }
}
