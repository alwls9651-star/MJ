import Link from "next/link";
import { AppShell, Button, Card, PageHeader } from "../components/ui";
import { getTeacherDashboardOverview } from "../lib/teacher-applications";
import { requireStaff } from "../lib/staff-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const staff = await requireStaff(["teacher", "admin"]);
  try {
    const overview = await getTeacherDashboardOverview(staff);
    return (
      <AppShell role="teacher">
        <PageHeader eyebrow={staff.role === "admin" ? "관리자 · 교사용 보기" : "교사"} title={`안녕하세요, ${staff.name} 선생님`} description="담당 강좌와 신청 학생 현황을 확인하세요." />
        <div className="grid-3">
          {[["담당 강좌", overview.courseCount, "개"], ["신청 학생", overview.applicantCount, "명"], ["마감 강좌", overview.fullCourseCount, "개"]].map(([label, value, unit]) => <Card className="p-5" key={label}><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}<span className="ml-1 text-base text-slate-400">{unit}</span></p></Card>)}
        </div>
        <Card className="mt-6 p-6"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><h2 className="text-xl font-extrabold">담당 강좌 신청자 명단</h2><p className="mt-2 text-sm text-slate-500">최신 신청 현황을 확인하고 Excel 명단을 내려받을 수 있습니다.</p></div><Link href="/teacher/applications"><Button>신청자 보기</Button></Link></div></Card>
      </AppShell>
    );
  } catch {
    return <AppShell role="teacher"><PageHeader title="교사 화면" description="담당 강좌와 신청 학생 현황을 확인합니다." /><Card className="p-8 text-center"><h2 className="font-extrabold">현황을 불러오지 못했습니다.</h2><p className="mt-2 text-sm text-slate-500">잠시 후 다시 시도해주세요.</p></Card></AppShell>;
  }
}
