import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ExcelJS from "exceljs";
import { canStaffAccessCourse } from "../app/lib/teacher-application-rules.ts";
import {
  createTeacherRosterWorkbook,
  excelContentDisposition,
  sanitizeExcelFilename,
  TEACHER_ROSTER_COLUMNS,
} from "../app/lib/teacher-roster-workbook.ts";

const roster = {
  course: { id: "course-a", sequence: 1, subject: "회계 기초", lectureStartDate: "2026-08-24", lectureEndDate: "2026-12-10", capacity: 20, isActive: true, teacherName: "홍길동" },
  applicants: [
    { grade: 1, department: "유통경영과", studentNumber: 15, name: "김하늘", appliedAt: "2026-08-20T10:00:01.000Z" },
    { grade: 2, department: "회계금융과", studentNumber: 7, name: "이준호", appliedAt: "2026-08-20T10:00:02.000Z" },
  ],
  appliedCount: 2,
  remainingSeats: 18,
  isFull: false,
};

test("teacher sees own course, another teacher is denied, and admin is allowed", () => {
  assert.equal(canStaffAccessCourse({ id: "teacher-a", role: "teacher" }, "teacher-a"), true);
  assert.equal(canStaffAccessCourse({ id: "teacher-a", role: "teacher" }, "teacher-b"), false);
  assert.equal(canStaffAccessCourse({ id: "admin", role: "admin" }, "teacher-b"), true);
});

test("teacher roster query authorizes course ownership and includes applied only", async () => {
  const helper = await readFile(new URL("../app/lib/teacher-applications.ts", import.meta.url), "utf8");
  assert.match(helper, /query = query\.eq\("teacher_id", staff\.id\)/);
  assert.match(helper, /rejectForbidden\) throw new TeacherCourseForbiddenError/);
  assert.match(helper, /\.eq\("status", "applied"\)/);
  assert.match(helper, /\.order\("applied_at", \{ ascending: true \}\)[\s\S]*\.order\("id", \{ ascending: true \}\)/);
  assert.doesNotMatch(helper, /password_hash|must_change_password|password_updated_at|student_session/i);
});

test("inactive staff is rejected by the shared staff authentication lookup", async () => {
  const auth = await readFile(new URL("../app/lib/staff-auth.ts", import.meta.url), "utf8");
  assert.match(auth, /\.eq\("is_active",true\)/);
});

test("Excel workbook reopens with exact columns, Korean rows, and application times", async () => {
  const buffer = await createTeacherRosterWorkbook(roster, 2026);
  assert.equal(Buffer.from(buffer).subarray(0, 2).toString(), "PK");
  const reopened = new ExcelJS.Workbook();
  await reopened.xlsx.load(buffer);
  const sheet = reopened.getWorksheet("신청자 명단");
  assert.ok(sheet);
  assert.deepEqual(sheet.getRow(7).values.slice(1), [...TEACHER_ROSTER_COLUMNS]);
  assert.equal(sheet.getRow(8).getCell(5).value, "김하늘");
  assert.equal(sheet.getRow(9).getCell(5).value, "이준호");
  assert.ok(sheet.getRow(8).getCell(7).value instanceof Date);
  assert.equal(sheet.rowCount, 9);
});

test("Excel filename and response headers support safe Korean downloads", () => {
  const filename = sanitizeExcelFilename('회계/기초:*?"<>|', 2026);
  assert.match(filename, /^2026_방과후_회계_기초_+신청자명단\.xlsx$/);
  const disposition = excelContentDisposition(filename, 2026);
  assert.match(disposition, /^attachment;/);
  assert.match(disposition, /filename\*=UTF-8''/);
  assert.doesNotMatch(filename, /[\\/:*?"<>|]/);
});

test("Excel export route repeats authentication and strict course authorization", async () => {
  const route = await readFile(new URL("../app/api/teacher/applications/export/route.ts", import.meta.url), "utf8");
  assert.match(route, /getCurrentStaff\(\)/);
  assert.match(route, /getTeacherCourseRoster\(staff, courseId, true\)/);
  assert.match(route, /TeacherCourseForbiddenError/);
  assert.match(route, /status: 403/);
  assert.match(route, /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
});

test("Excel schema excludes internal identifiers, cancelled history, and authentication data", () => {
  const columns = TEACHER_ROSTER_COLUMNS.join("|");
  assert.doesNotMatch(columns, /UUID|application|password|session|auth|취소/i);
  assert.deepEqual([...TEACHER_ROSTER_COLUMNS], ["연번", "학년", "학과", "번호", "이름", "신청과목", "신청시각"]);
});
