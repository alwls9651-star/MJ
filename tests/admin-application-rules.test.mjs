import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  countApplied,
  findUnappliedStudentIds,
  getAdminCourseState,
  sortByApplicationOrder,
} from "../app/lib/admin-application-rules.ts";
import { calculateRemainingSeats } from "../app/lib/student-course-rules.ts";

test("course capacity summary excludes cancelled history", () => {
  const applications = [
    ...Array.from({ length: 18 }, (_, index) => ({ id: `a${index}`, status: "applied" })),
    ...Array.from({ length: 5 }, (_, index) => ({ id: `c${index}`, status: "cancelled" })),
  ];
  const appliedCount = countApplied(applications);
  assert.equal(appliedCount, 18);
  assert.equal(calculateRemainingSeats(20, appliedCount), 2);
  assert.equal(getAdminCourseState(true, 20, 20), "full");
  assert.equal(getAdminCourseState(false, 20, 0), "inactive");
});

test("students with only cancelled history are unapplied", () => {
  const unapplied = findUnappliedStudentIds(
    ["student-1", "student-2", "student-3"],
    [
      { student_id: "student-1", status: "applied" },
      { student_id: "student-2", status: "cancelled" },
    ],
  );
  assert.deepEqual(unapplied, ["student-2", "student-3"]);
});

test("first-come roster uses applied_at then id for stable ordering", () => {
  const rows = sortByApplicationOrder([
    { id: "b", applied_at: "2026-08-20T10:00:02Z" },
    { id: "c", applied_at: "2026-08-20T10:00:01Z" },
    { id: "a", applied_at: "2026-08-20T10:00:01Z" },
  ]);
  assert.deepEqual(rows.map((row) => row.id), ["a", "c", "b"]);
});

test("admin page is protected and query selects only operational student fields", async () => {
  const [page, helper, studentHelper] = await Promise.all([
    readFile(new URL("../app/admin/applications/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/admin-applications.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/student-courses.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /requireStaff\(\["admin"\]\)/);
  assert.match(helper, /select\("id, grade, department, student_number, name"\)/);
  assert.doesNotMatch(helper, /password_hash|password_updated_at|must_change_password|student_session|service_role/i);
  assert.doesNotMatch(studentHelper, /teacher_id|auth_user_id|teacher email|teacher name|teachers\s*\(/i);
});

test("admin application queries are batched instead of per-course N+1 reads", async () => {
  const helper = await readFile(new URL("../app/lib/admin-applications.ts", import.meta.url), "utf8");
  assert.match(helper, /\.in\("course_id", courseIds\)/);
  assert.match(helper, /\.in\("id", teacherIds\)/);
  assert.doesNotMatch(helper, /for\s*\([^)]*course[^)]*\)[\s\S]{0,160}\.from\("applications"\)/);
});
