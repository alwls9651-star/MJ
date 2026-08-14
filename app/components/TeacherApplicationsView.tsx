"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TeacherCourseOption, TeacherCourseRoster } from "../lib/teacher-applications";
import { Badge, Button, Card, Select, Table } from "./ui";

function formatDateRange(start: string, end: string) {
  const format = (date: string, includeYear: boolean) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", ...(includeYear ? { year: "numeric" } : {}), month: "numeric", day: "numeric" }).format(new Date(`${date}T00:00:00+09:00`));
  return `${format(start, true)} ~ ${format(end, start.slice(0, 4) !== end.slice(0, 4))}`;
}

function formatAppliedAt(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(iso));
}

export function TeacherApplicationsView({ courses, roster }: { courses: TeacherCourseOption[]; roster: TeacherCourseRoster }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [search, setSearch] = useState("");
  const applicants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    return roster.applicants.filter((student) => !query || student.name.toLocaleLowerCase("ko-KR").includes(query) || student.department.toLocaleLowerCase("ko-KR").includes(query) || String(student.studentNumber).includes(query));
  }, [roster.applicants, search]);

  return (
    <>
      <Card className="mb-6 p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <Select label="담당 과목" value={roster.course.id} onChange={(event) => router.push(`/teacher/applications?courseId=${encodeURIComponent(event.target.value)}`)}>
            {courses.map((course) => <option value={course.id} key={course.id}>{course.sequence}. {course.subject} ({formatDateRange(course.lectureStartDate, course.lectureEndDate)}){course.isActive ? "" : " · 비활성"}</option>)}
          </Select>
          <Button type="button" variant="secondary" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>{refreshing ? "새로고침 중..." : "새로고침"}</Button>
          <a className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700" href={`/api/teacher/applications/export?courseId=${encodeURIComponent(roster.course.id)}`}>엑셀 다운로드</a>
        </div>
      </Card>

      <div className="grid-3 mb-6">
        <Card className="p-5"><p className="text-sm font-bold text-slate-500">정원</p><p className="mt-2 text-3xl font-black">{roster.course.capacity}<span className="ml-1 text-base text-slate-400">명</span></p></Card>
        <Card className="p-5"><p className="text-sm font-bold text-slate-500">현재 신청</p><p className="mt-2 text-3xl font-black">{roster.appliedCount}<span className="ml-1 text-base text-slate-400">명</span></p></Card>
        <Card className="p-5"><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-slate-500">잔여석</p><Badge tone={roster.isFull ? "red" : "mint"}>{roster.isFull ? "마감" : "모집 가능"}</Badge></div><p className="mt-2 text-3xl font-black">{roster.remainingSeats}<span className="ml-1 text-base text-slate-400">명</span></p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-lg font-extrabold">{roster.course.subject} 신청자 명단</h2><p className="mt-1 text-sm text-slate-500">담당교사 {roster.course.teacherName} · 신청 시각 순서</p></div>
          <label className="w-full sm:w-72"><span className="mb-2 block text-sm font-bold text-slate-700">학생 검색</span><input className="h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-blue-500" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름·학과·번호" /></label>
        </div>
        <Table headers={["순번", "학년", "학과", "번호", "이름", "신청 과목", "신청 시각", "상태"]}>
          {applicants.map((student) => {
            const firstComeOrder = roster.applicants.indexOf(student) + 1;
            return <tr key={`${student.grade}-${student.department}-${student.studentNumber}`}><td>{firstComeOrder}</td><td>{student.grade}학년</td><td>{student.department}</td><td>{student.studentNumber}</td><td><b>{student.name}</b></td><td>{roster.course.subject}</td><td className="whitespace-nowrap">{formatAppliedAt(student.appliedAt)}</td><td><Badge tone="mint">신청 완료</Badge></td></tr>;
          })}
        </Table>
        {!applicants.length ? <p className="p-8 text-center text-sm text-slate-500">{search ? "검색 결과가 없습니다." : "아직 신청한 학생이 없습니다."}</p> : null}
      </Card>
    </>
  );
}
