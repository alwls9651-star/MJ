export type CourseCancellationCode =
  | "CANCELLED"
  | "NO_ACTIVE_APPLICATION"
  | "NOT_OPEN"
  | "INVALID_YEAR"
  | "STUDENT_NOT_FOUND"
  | "PASSWORD_CHANGE_REQUIRED";

export const COURSE_CANCELLATION_MESSAGES: Record<CourseCancellationCode, string> = {
  CANCELLED: "수강신청이 취소되었습니다.",
  NO_ACTIVE_APPLICATION: "취소할 신청 내역이 없습니다.",
  NOT_OPEN: "현재는 수강신청을 취소할 수 없습니다.",
  INVALID_YEAR: "취소할 신청 내역을 확인할 수 없습니다.",
  STUDENT_NOT_FOUND: "학생 정보를 확인할 수 없습니다.",
  PASSWORD_CHANGE_REQUIRED: "비밀번호를 먼저 변경해주세요.",
};

export function isCourseCancellationCode(value: unknown): value is CourseCancellationCode {
  return typeof value === "string" && value in COURSE_CANCELLATION_MESSAGES;
}
