"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AdminApplicationOverview,
  AdminApplicationStatus,
  AdminCourseApplicationSummary,
  AdminRosterEntry,
} from "../lib/admin-applications";
import { Badge, Button, Card, Modal, Select, Table } from "./ui";

function formatTime(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function CourseStateBadge({ course }: { course: AdminCourseApplicationSummary }) {
  if (course.state === "inactive") return <Badge tone="gray">비활성</Badge>;
  if (course.state === "full") return <Badge tone="red">마감</Badge>;
  return <Badge tone="mint">모집 가능</Badge>;
}

export function AdminApplicationsView({ overview }: { overview: AdminApplicationOverview }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [selectedCourse, setSelectedCourse] = useState<AdminCourseApplicationSummary | null>(null);
  const [rosterTab, setRosterTab] = useState<AdminApplicationStatus>("applied");
  const [showUnapplied, setShowUnapplied] = useState(false);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("all");
  const [courseId, setCourseId] = useState("all");
  const [status, setStatus] = useState<AdminApplicationStatus>("applied");

  const records = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    return overview.courses.flatMap((course) => {
      const entries = status === "applied" ? course.activeApplicants : course.cancellationHistory;
      return entries
        .filter((entry) => grade === "all" || entry.grade === Number(grade))
        .filter(() => courseId === "all" || course.id === courseId)
        .filter((entry) => !query || entry.name.toLocaleLowerCase("ko-KR").includes(query) || entry.department.toLocaleLowerCase("ko-KR").includes(query) || String(entry.studentNumber).includes(query))
        .map((entry) => ({ course, entry }));
    });
  }, [overview.courses, search, grade, courseId, status]);

  const modalEntries = selectedCourse
    ? rosterTab === "applied"
      ? selectedCourse.activeApplicants
      : selectedCourse.cancellationHistory
    : [];

  return (
    <>
      <div className="mb-5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
          {refreshing ? "새로고침 중..." : "새로고침"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setShowUnapplied(true)}>미신청 학생 보기</Button>
      </div>

      <div className="grid-3 mb-6">
        {[
          ["전체 학생", overview.stats.totalStudents, "명"],
          ["신청 완료", overview.stats.appliedStudents, "명"],
          ["미신청", overview.stats.unappliedStudents, "명"],
          ["활성 강좌", overview.stats.activeCourses, "개"],
          ["마감 강좌", overview.stats.fullCourses, "개"],
        ].map(([label, value, unit]) => (
          <Card className="p-5" key={label}>
            <p className="text-sm font-bold text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}<span className="ml-1 text-base text-slate-400">{unit}</span></p>
          </Card>
        ))}
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="p-5"><h2 className="text-lg font-extrabold">강좌별 신청 현황</h2><p className="mt-1 text-sm text-slate-500">현재 학년도 전체 강좌와 활성 신청 인원을 표시합니다.</p></div>
        <Table headers={["연번", "과목", "담당 교사", "조건", "신청/정원", "잔여석", "상태", "상세"]}>
          {overview.courses.map((course) => (
            <tr key={course.id}>
              <td>{course.sequence}</td>
              <td><b>{course.subject}</b></td>
              <td><span className="block font-semibold">{course.teacherName}</span>{course.teacherEmail ? <span className="block text-xs text-slate-400">{course.teacherEmail}</span> : null}</td>
              <td>{course.eligibility}</td>
              <td><span className="font-bold">{course.appliedCount} / {course.capacity}</span><div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min((course.appliedCount / course.capacity) * 100, 100)}%` }} /></div></td>
              <td>{course.remainingSeats > 0 ? `${course.remainingSeats}명` : "0명"}</td>
              <td><CourseStateBadge course={course} /></td>
              <td><Button type="button" variant="secondary" className="whitespace-nowrap px-3" onClick={() => { setSelectedCourse(course); setRosterTab("applied"); }}>신청자 보기</Button></td>
            </tr>
          ))}
        </Table>
        {!overview.courses.length ? <p className="p-8 text-center text-sm text-slate-500">등록된 강좌가 없습니다.</p> : null}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 p-5"><h2 className="text-lg font-extrabold">학생 신청 검색</h2><p className="mt-1 text-sm text-slate-500">이름, 학과 또는 번호로 현재 신청과 취소 이력을 검색합니다.</p></div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="mb-2 block text-sm font-bold text-slate-700">검색</span><input className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름·학과·번호" /></label>
          <Select label="학년" value={grade} onChange={(event) => setGrade(event.target.value)}><option value="all">전체 학년</option><option value="1">1학년</option><option value="2">2학년</option><option value="3">3학년</option></Select>
          <Select label="강좌" value={courseId} onChange={(event) => setCourseId(event.target.value)}><option value="all">전체 강좌</option>{overview.courses.map((course) => <option value={course.id} key={course.id}>{course.sequence}. {course.subject}</option>)}</Select>
          <Select label="신청 상태" value={status} onChange={(event) => setStatus(event.target.value as AdminApplicationStatus)}><option value="applied">현재 신청</option><option value="cancelled">취소 이력</option></Select>
        </div>
        <Table headers={["학년", "학과", "번호", "이름", "강좌", "신청 시각", status === "applied" ? "상태" : "취소 시각"]}>
          {records.map(({ course, entry }) => <tr key={`${course.id}-${entry.grade}-${entry.department}-${entry.studentNumber}-${entry.appliedAt}`}><td>{entry.grade}학년</td><td>{entry.department}</td><td>{entry.studentNumber}</td><td><b>{entry.name}</b></td><td>{course.subject}</td><td>{formatTime(entry.appliedAt)}</td><td>{status === "applied" ? <Badge tone="mint">신청 완료</Badge> : formatTime(entry.cancelledAt)}</td></tr>)}
        </Table>
        {!records.length ? <p className="p-8 text-center text-sm text-slate-500">{status === "applied" ? "아직 신청한 학생이 없습니다." : "취소 이력이 없습니다."}</p> : null}
      </Card>

      <Modal open={Boolean(selectedCourse)} title={selectedCourse ? `${selectedCourse.subject} 신청자 명단` : "신청자 명단"}>
        <div className="mb-4 flex gap-2"><Button type="button" variant={rosterTab === "applied" ? "primary" : "secondary"} onClick={() => setRosterTab("applied")}>현재 신청자</Button><Button type="button" variant={rosterTab === "cancelled" ? "primary" : "secondary"} onClick={() => setRosterTab("cancelled")}>취소 이력</Button></div>
        <div className="max-h-[55vh] overflow-auto">
          <table className="min-w-[620px]"><thead><tr><th>순번</th><th>학생</th><th>학과·번호</th><th>{rosterTab === "applied" ? "신청 시각" : "취소 시각"}</th><th>상태</th></tr></thead><tbody>{modalEntries.map((entry: AdminRosterEntry, index) => <tr key={`${entry.grade}-${entry.department}-${entry.studentNumber}-${entry.appliedAt}`}><td>{index + 1}</td><td>{entry.grade}학년 {entry.name}</td><td>{entry.department} {entry.studentNumber}번</td><td>{formatTime(rosterTab === "applied" ? entry.appliedAt : entry.cancelledAt)}</td><td><Badge tone={rosterTab === "applied" ? "mint" : "gray"}>{rosterTab === "applied" ? "신청 완료" : "취소"}</Badge></td></tr>)}</tbody></table>
          {!modalEntries.length ? <p className="py-8 text-center text-sm text-slate-500">{rosterTab === "applied" ? "아직 신청한 학생이 없습니다." : "취소 이력이 없습니다."}</p> : null}
        </div>
        <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={() => setSelectedCourse(null)}>닫기</Button></div>
      </Modal>

      <Modal open={showUnapplied} title="미신청 학생">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-[520px]"><thead><tr><th>학년</th><th>학과</th><th>번호</th><th>이름</th></tr></thead><tbody>{overview.unappliedStudents.map((student) => <tr key={`${student.grade}-${student.department}-${student.studentNumber}`}><td>{student.grade}학년</td><td>{student.department}</td><td>{student.studentNumber}</td><td><b>{student.name}</b></td></tr>)}</tbody></table>
          {!overview.unappliedStudents.length ? <p className="py-8 text-center text-sm text-slate-500">모든 학생이 신청을 완료했습니다.</p> : null}
        </div>
        <div className="mt-5 flex justify-end"><Button type="button" variant="secondary" onClick={() => setShowUnapplied(false)}>닫기</Button></div>
      </Modal>
    </>
  );
}
