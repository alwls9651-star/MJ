import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  COURSE_CANCELLATION_MESSAGES,
  isCourseCancellationCode,
} from "../app/lib/course-cancellation.ts";

test("cancellation result codes have safe student-facing messages", () => {
  assert.equal(COURSE_CANCELLATION_MESSAGES.CANCELLED, "수강신청이 취소되었습니다.");
  assert.equal(COURSE_CANCELLATION_MESSAGES.NO_ACTIVE_APPLICATION, "취소할 신청 내역이 없습니다.");
  assert.equal(COURSE_CANCELLATION_MESSAGES.NOT_OPEN, "현재는 수강신청을 취소할 수 없습니다.");
  assert.equal(isCourseCancellationCode("CANCELLED"), true);
  assert.equal(isCourseCancellationCode("DATABASE_ERROR"), false);
});

test("cancel RPC keeps student-to-course lock order and preserves the row", async () => {
  const sql = await readFile(new URL("../supabase/migrations/007_cancel_course_application.sql", import.meta.url), "utf8");
  const studentLock = sql.indexOf("from public.students s");
  const courseLock = sql.indexOf("from public.courses c");
  const update = sql.indexOf("update public.applications a");
  assert.ok(studentLock >= 0 && courseLock > studentLock && update > courseLock);
  assert.match(sql, /where a\.student_id = p_student_id and a\.status = 'applied'/);
  assert.match(sql, /set status = 'cancelled', cancelled_at = now\(\)/);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.applications/i);
});

test("cancel RPC checks year and DB application window boundaries", async () => {
  const sql = await readFile(new URL("../supabase/migrations/007_cancel_course_application.sql", import.meta.url), "utf8");
  assert.match(sql, /v_student_year <> p_academic_year/);
  assert.match(sql, /v_course_year <> p_academic_year/);
  assert.match(sql, /now\(\) < v_setting_start/);
  assert.match(sql, /now\(\) >= v_setting_end/);
  assert.match(sql, /'NO_ACTIVE_APPLICATION'/);
});

test("cancel RPC and direct UPDATE are unavailable to browser roles", async () => {
  const sql = await readFile(new URL("../supabase/migrations/007_cancel_course_application.sql", import.meta.url), "utf8");
  assert.match(sql, /revoke all on function public\.cancel_course_application\(uuid, integer\) from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.cancel_course_application\(uuid, integer\) to service_role/);
  assert.match(sql, /revoke all on table public\.applications from public, anon, authenticated/);
});

test("bodyless DELETE derives the student from the signed session", async () => {
  const route = await readFile(new URL("../app/api/student/applications/route.ts", import.meta.url), "utf8");
  const deleteHandler = route.slice(route.indexOf("export async function DELETE"));
  assert.match(deleteHandler, /getStudentSession\(\)/);
  assert.match(deleteHandler, /p_student_id: student\.id/);
  assert.doesNotMatch(deleteHandler, /request\.json|body\.studentId|body\.applicationId/);
});

test("cancellation UI confirms intent and prevents duplicate clicks", async () => {
  const component = await readFile(new URL("../app/components/CourseCancelButton.tsx", import.meta.url), "utf8");
  assert.match(component, /수강신청 취소 확인/);
  assert.match(component, /취소 중\.\.\./);
  assert.match(component, /disabled=\{pending\}/);
  assert.match(component, /method: "DELETE"/);
  assert.match(component, /router\.refresh\(\)/);
});
