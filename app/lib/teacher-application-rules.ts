export function canStaffAccessCourse(
  staff: { id: string; role: "teacher" | "admin" },
  courseTeacherId: string,
) {
  return staff.role === "admin" || staff.id === courseTeacherId;
}
