import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COURSE_APPLICATION_MESSAGES,
  isCourseApplicationCode,
} from "../app/lib/course-application.ts";

test("application result codes have safe student-facing messages", () => {
  assert.equal(COURSE_APPLICATION_MESSAGES.APPLIED, "수강신청이 완료되었습니다.");
  assert.equal(COURSE_APPLICATION_MESSAGES.FULL, "아쉽게도 방금 마감되었습니다.");
  assert.equal(COURSE_APPLICATION_MESSAGES.ALREADY_APPLIED, "이미 신청한 과목이 있습니다.");
  assert.equal(COURSE_APPLICATION_MESSAGES.NOT_OPEN, "현재 수강신청 시간이 아닙니다.");
  assert.equal(COURSE_APPLICATION_MESSAGES.NOT_ELIGIBLE, "신청 조건에 해당하지 않는 강좌입니다.");
  assert.equal(isCourseApplicationCode("APPLIED"), true);
  assert.equal(isCourseApplicationCode("INTERNAL_DATABASE_ERROR"), false);
});

test("RPC locks student before course and counts only after the course lock", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/006_apply_course_transaction.sql", import.meta.url),
    "utf8",
  );
  const studentLock = sql.indexOf("from public.students s");
  const courseLock = sql.indexOf("from public.courses c");
  const appliedCount = sql.indexOf("select count(*) into v_applied_count");
  assert.ok(studentLock >= 0 && courseLock > studentLock && appliedCount > courseLock);
  assert.match(sql, /where a\.course_id = p_course_id and a\.status = 'applied'/);
  assert.match(sql, /v_applied_count >= v_course_capacity/);
  assert.match(sql, /applications_one_active_per_student_idx|unique_violation/);
});

test("RPC checks DB time, year, activity, eligibility, and revokes browser access", async () => {
  const sql = await readFile(
    new URL("../supabase/migrations/006_apply_course_transaction.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /now\(\) < v_setting_start/);
  assert.match(sql, /now\(\) >= v_setting_end/);
  assert.match(sql, /v_student_year <> p_academic_year/);
  assert.match(sql, /not v_course_active/);
  assert.match(sql, /public\.is_student_eligible/);
  assert.match(sql, /revoke all on function public\.apply_for_course\(uuid, uuid, integer\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.apply_for_course\(uuid, uuid, integer\) to service_role/);
  assert.match(sql, /revoke all on table public\.applications from public, anon, authenticated/);
});

test("student application API accepts courseId only and derives studentId from session", async () => {
  const route = await readFile(
    new URL("../app/api/student/applications/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /getStudentSession\(\)/);
  assert.match(route, /"studentId" in body/);
  assert.match(route, /p_student_id: student\.id/);
  assert.doesNotMatch(route, /p_student_id:\s*body\./);
});
