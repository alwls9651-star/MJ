import type { ApplicationWindowStatus } from "./application-window-utils";

export const SUPPORTED_ELIGIBILITY = ["전학년", "1학년", "2학년", "3학년", "1~2학년", "2~3학년"] as const;

export function calculateRemainingSeats(capacity: number, applicantCount: number) {
  return Math.max(capacity - applicantCount, 0);
}

export function isStudentEligible(grade: number, eligibility: string) {
  const grades: Record<string, readonly number[]> = {
    전학년: [1, 2, 3],
    "1학년": [1],
    "2학년": [2],
    "3학년": [3],
    "1~2학년": [1, 2],
    "2~3학년": [2, 3],
  };
  return grades[eligibility]?.includes(grade) ?? false;
}

export type StudentCourseActionState =
  | "APPLY"
  | "FULL"
  | "BEFORE"
  | "CLOSED"
  | "NOT_CONFIGURED"
  | "ALREADY_APPLIED"
  | "OTHER_COURSE_APPLIED"
  | "NOT_ELIGIBLE";

export function getStudentCourseActionState(input: {
  courseId: string;
  myAppliedCourseId: string | null;
  remainingSeats: number;
  eligible: boolean;
  windowStatus: ApplicationWindowStatus;
}): StudentCourseActionState {
  if (input.myAppliedCourseId === input.courseId) return "ALREADY_APPLIED";
  if (input.myAppliedCourseId) return "OTHER_COURSE_APPLIED";
  if (!input.eligible) return "NOT_ELIGIBLE";
  if (input.remainingSeats <= 0) return "FULL";
  if (input.windowStatus === "NOT_CONFIGURED") return "NOT_CONFIGURED";
  if (input.windowStatus === "BEFORE") return "BEFORE";
  if (input.windowStatus === "CLOSED") return "CLOSED";
  return "APPLY";
}
