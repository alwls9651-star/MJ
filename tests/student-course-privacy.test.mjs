import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("student course query and page do not select or render teacher fields", async () => {
  const [helper, page] = await Promise.all([
    readFile(new URL("../app/lib/student-courses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/courses/page.tsx", import.meta.url), "utf8"),
  ]);
  const studentSurface = `${helper}\n${page}`;
  assert.doesNotMatch(studentSurface, /teacher_id|auth_user_id|teacher email|teacher name|teachers\s*\(/i);
  assert.match(helper, /select\("id, sequence, subject, lecture_start_date, lecture_end_date, lecture_days, eligibility, capacity"\)/);
  assert.match(helper, /select\("course_id"\)/);
});
