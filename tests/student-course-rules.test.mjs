import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateRemainingSeats,
  getStudentCourseActionState,
  isStudentEligible,
} from "../app/lib/student-course-rules.ts";

test("remaining seats never become negative", () => {
  assert.equal(calculateRemainingSeats(20, 13), 7);
  assert.equal(calculateRemainingSeats(20, 20), 0);
  assert.equal(calculateRemainingSeats(20, 21), 0);
});

test("supported eligibility values match student grade", () => {
  assert.equal(isStudentEligible(1, "전학년"), true);
  assert.equal(isStudentEligible(1, "1학년"), true);
  assert.equal(isStudentEligible(1, "2학년"), false);
  assert.equal(isStudentEligible(2, "1~2학년"), true);
  assert.equal(isStudentEligible(3, "2~3학년"), true);
  assert.equal(isStudentEligible(1, "지원하지 않는 값"), false);
});

const base = {
  courseId: "course-1",
  myAppliedCourseId: null,
  remainingSeats: 1,
  eligible: true,
  windowStatus: "OPEN",
};

test("course action follows the documented priority", () => {
  assert.equal(getStudentCourseActionState(base), "APPLY");
  assert.equal(getStudentCourseActionState({ ...base, remainingSeats: 0 }), "FULL");
  assert.equal(getStudentCourseActionState({ ...base, windowStatus: "BEFORE" }), "BEFORE");
  assert.equal(getStudentCourseActionState({ ...base, windowStatus: "CLOSED" }), "CLOSED");
  assert.equal(getStudentCourseActionState({ ...base, myAppliedCourseId: "course-1" }), "ALREADY_APPLIED");
  assert.equal(getStudentCourseActionState({ ...base, myAppliedCourseId: "course-2" }), "OTHER_COURSE_APPLIED");
  assert.equal(getStudentCourseActionState({ ...base, eligible: false }), "NOT_ELIGIBLE");
});
