export type CourseApplicationCode =
  | "APPLIED"
  | "NOT_OPEN"
  | "COURSE_NOT_FOUND"
  | "COURSE_INACTIVE"
  | "NOT_ELIGIBLE"
  | "ALREADY_APPLIED"
  | "FULL"
  | "STUDENT_NOT_FOUND"
  | "INVALID_YEAR"
  | "PASSWORD_CHANGE_REQUIRED";

export interface CourseApplicationResult {
  success: boolean;
  code: CourseApplicationCode;
  applicationId: string | null;
  appliedAt: string | null;
}

export const COURSE_APPLICATION_MESSAGES: Record<CourseApplicationCode, string> = {
  APPLIED: "수강신청이 완료되었습니다.",
  FULL: "아쉽게도 방금 마감되었습니다.",
  ALREADY_APPLIED: "이미 신청한 과목이 있습니다.",
  NOT_OPEN: "현재 수강신청 시간이 아닙니다.",
  NOT_ELIGIBLE: "신청 조건에 해당하지 않는 강좌입니다.",
  COURSE_INACTIVE: "현재 신청할 수 없는 강좌입니다.",
  COURSE_NOT_FOUND: "현재 신청할 수 없는 강좌입니다.",
  INVALID_YEAR: "현재 신청할 수 없는 강좌입니다.",
  STUDENT_NOT_FOUND: "학생 정보를 확인할 수 없습니다.",
  PASSWORD_CHANGE_REQUIRED: "비밀번호를 먼저 변경해주세요.",
};

export function isCourseApplicationCode(value: unknown): value is CourseApplicationCode {
  return typeof value === "string" && value in COURSE_APPLICATION_MESSAGES;
}
