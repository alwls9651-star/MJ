import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("student course query and page do not select or render teacher fields", async () => {
  const [helper, page, dataApiLockdown] = await Promise.all([
    readFile(new URL("../app/lib/student-courses.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/courses/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/008_lock_down_data_api.sql", import.meta.url), "utf8"),
  ]);
  const studentSurface = `${helper}\n${page}`;
  assert.doesNotMatch(studentSurface, /teacher_id|auth_user_id|teacher email|teacher name|teachers\s*\(/i);
  assert.match(helper, /select\("id, sequence, subject, lecture_start_date, lecture_end_date, lecture_days, eligibility, capacity"\)/);
  assert.match(helper, /select\("course_id"\)/);
  for (const table of ["students", "teachers", "courses", "application_settings", "applications", "admin_audit_logs"]) {
    assert.match(dataApiLockdown, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(dataApiLockdown, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "i"));
  }
});
