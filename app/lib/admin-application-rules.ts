export type ApplicationStatusValue = "applied" | "cancelled";

export function countApplied<T extends { status: ApplicationStatusValue }>(applications: readonly T[]) {
  return applications.filter((application) => application.status === "applied").length;
}

export function getAdminCourseState(isActive: boolean, capacity: number, appliedCount: number) {
  if (!isActive) return "inactive" as const;
  return appliedCount >= capacity ? ("full" as const) : ("available" as const);
}

export function sortByApplicationOrder<T extends { applied_at: string; id: string }>(applications: readonly T[]) {
  return [...applications].sort((left, right) =>
    left.applied_at.localeCompare(right.applied_at) || left.id.localeCompare(right.id),
  );
}

export function findUnappliedStudentIds(
  studentIds: readonly string[],
  applications: readonly { student_id: string; status: ApplicationStatusValue }[],
) {
  const appliedStudentIds = new Set(
    applications.filter((application) => application.status === "applied").map((application) => application.student_id),
  );
  return studentIds.filter((studentId) => !appliedStudentIds.has(studentId));
}
