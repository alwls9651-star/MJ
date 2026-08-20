import { AppShell, Card, PageHeader } from "../components/ui";
import { requireStaff } from "../lib/staff-auth";

export const dynamic = "force-dynamic";

export default async function Page() {
  const admin = await requireStaff(["admin"]);
  const stats = [["등록 강좌", "8개"], ["전체 신청", "124명"], ["마감 강좌", "2개"]];
  const links = [["/admin/courses", "강좌 관리"], ["/admin/applications", "신청 현황"], ["/admin/students", "학생 관리"], ["/admin/teachers", "교사 관리"]];

  return (
    <AppShell role="admin">
      <PageHeader eyebrow="관리자" title={`${admin.name} 관리자님, 안녕하세요`} description="강좌와 신청 현황을 확인하고 운영 설정을 관리하세요." />
      <div className="grid-3">
        {stats.map(([label, value]) => <Card className="p-5" key={label}><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></Card>)}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {links.map(([href, label]) => <a className="rounded-xl bg-white p-4 font-bold text-blue-700" href={href} key={href}>{label}</a>)}
      </div>
    </AppShell>
  );
}

