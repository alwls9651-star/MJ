import { AdminApplicationsView } from "../../components/AdminApplicationsView";
import { AppShell, Badge, Card, PageHeader } from "../../components/ui";
import { CURRENT_ACADEMIC_YEAR } from "../../lib/academic-year";
import { getAdminApplicationOverview } from "../../lib/admin-applications";
import { getApplicationWindow } from "../../lib/application-window";
import { requireStaff } from "../../lib/staff-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const windowLabels = {
  NOT_CONFIGURED: ["일정 미정", "gray"],
  BEFORE: ["신청 전", "blue"],
  OPEN: ["신청 중", "mint"],
  CLOSED: ["신청 종료", "red"],
} as const;

export default async function Page() {
  await requireStaff(["admin"]);
  try {
    const [overview, applicationWindow] = await Promise.all([
      getAdminApplicationOverview(),
      getApplicationWindow(),
    ]);
    const windowLabel = windowLabels[applicationWindow.status];
    return (
      <AppShell role="admin">
        <PageHeader
          eyebrow={`${CURRENT_ACADEMIC_YEAR}학년도`}
          title="전체 신청 현황"
          description="강좌별 신청 인원과 학생 신청·취소 이력을 확인합니다."
          action={<Badge tone={windowLabel[1]}>{windowLabel[0]}</Badge>}
        />
        <AdminApplicationsView overview={overview} />
      </AppShell>
    );
  } catch {
    return (
      <AppShell role="admin">
        <PageHeader title="전체 신청 현황" description="강좌별 신청 인원과 학생 신청·취소 이력을 확인합니다." />
        <Card className="p-8 text-center">
          <h2 className="font-extrabold text-slate-900">신청 현황을 불러오지 못했습니다.</h2>
          <p className="mt-2 text-sm text-slate-500">잠시 후 다시 시도해주세요.</p>
        </Card>
      </AppShell>
    );
  }
}
