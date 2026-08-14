import "server-only";
import { CURRENT_ACADEMIC_YEAR } from "./academic-year";
import { canStaffAccessCourse } from "./teacher-application-rules";
import { calculateRemainingSeats } from "./student-course-rules";
import { getSupabaseServerClient } from "./supabase-server";
import type { Application, Course, Student, Teacher } from "../types/database";

export interface TeacherCourseOption {
  id: string;
  sequence: number;
  subject: string;
  lectureStartDate: string;
  lectureEndDate: string;
  capacity: number;
  isActive: boolean;
  teacherName: string;
}

export interface TeacherRosterStudent {
  grade: number;
  department: string;
  studentNumber: number;
  name: string;
  appliedAt: string;
}

export interface TeacherCourseRoster {
  course: TeacherCourseOption;
  applicants: TeacherRosterStudent[];
  appliedCount: number;
  remainingSeats: number;
  isFull: boolean;
}

type CourseRow = Pick<Course, "id" | "sequence" | "subject" | "lecture_start_date" | "lecture_end_date" | "teacher_id" | "capacity" | "is_active">;
type ApplicationRow = Pick<Application, "id" | "student_id" | "applied_at">;
type StudentRow = Pick<Student, "id" | "grade" | "department" | "student_number" | "name">;

export class TeacherCourseForbiddenError extends Error {}

export async function getTeacherCourseOptions(staff: Pick<Teacher, "id" | "name" | "role">): Promise<TeacherCourseOption[]> {
  const service = getSupabaseServerClient();
  let query = service
    .from("courses")
    .select("id, sequence, subject, lecture_start_date, lecture_end_date, teacher_id, capacity, is_active")
    .eq("academic_year", CURRENT_ACADEMIC_YEAR)
    .order("is_active", { ascending: false })
    .order("sequence", { ascending: true });
  if (staff.role === "teacher") query = query.eq("teacher_id", staff.id);
  const { data, error } = await query.returns<CourseRow[]>();
  if (error) throw new Error("TEACHER_COURSES_READ_FAILED");

  const rows = (data ?? []).filter((course) => canStaffAccessCourse(staff, course.teacher_id));
  if (staff.role === "teacher") {
    return rows.map((course) => ({
      id: course.id,
      sequence: course.sequence,
      subject: course.subject,
      lectureStartDate: course.lecture_start_date,
      lectureEndDate: course.lecture_end_date,
      capacity: course.capacity,
      isActive: course.is_active,
      teacherName: staff.name,
    }));
  }

  const teacherIds = [...new Set(rows.map((course) => course.teacher_id))];
  const teacherResult = teacherIds.length
    ? await service.from("teachers").select("id, name").in("id", teacherIds).returns<Array<Pick<Teacher, "id" | "name">>>()
    : { data: [] as Array<Pick<Teacher, "id" | "name">>, error: null };
  if (teacherResult.error) throw new Error("TEACHER_NAMES_READ_FAILED");
  const names = new Map((teacherResult.data ?? []).map((teacher) => [teacher.id, teacher.name]));
  return rows.map((course) => ({
    id: course.id,
    sequence: course.sequence,
    subject: course.subject,
    lectureStartDate: course.lecture_start_date,
    lectureEndDate: course.lecture_end_date,
    capacity: course.capacity,
    isActive: course.is_active,
    teacherName: names.get(course.teacher_id) ?? "담당 교사 미확인",
  }));
}

export async function getTeacherCourseRoster(
  staff: Pick<Teacher, "id" | "name" | "role">,
  requestedCourseId?: string,
  rejectForbidden = false,
): Promise<{ courses: TeacherCourseOption[]; roster: TeacherCourseRoster | null }> {
  const courses = await getTeacherCourseOptions(staff);
  const requested = requestedCourseId ? courses.find((course) => course.id === requestedCourseId) : undefined;
  if (requestedCourseId && !requested && rejectForbidden) throw new TeacherCourseForbiddenError();
  const course = requested ?? courses[0];
  if (!course) return { courses, roster: null };

  const service = getSupabaseServerClient();
  const { data: applications, error: applicationError } = await service
    .from("applications")
    .select("id, student_id, applied_at")
    .eq("course_id", course.id)
    .eq("status", "applied")
    .order("applied_at", { ascending: true })
    .order("id", { ascending: true })
    .returns<ApplicationRow[]>();
  if (applicationError) throw new Error("TEACHER_APPLICATIONS_READ_FAILED");

  const studentIds = [...new Set((applications ?? []).map((application) => application.student_id))];
  const studentResult = studentIds.length
    ? await service
        .from("students")
        .select("id, grade, department, student_number, name")
        .in("id", studentIds)
        .returns<StudentRow[]>()
    : { data: [] as StudentRow[], error: null };
  if (studentResult.error) throw new Error("TEACHER_STUDENTS_READ_FAILED");
  const students = new Map((studentResult.data ?? []).map((student) => [student.id, student]));
  const applicants = (applications ?? []).flatMap((application) => {
    const student = students.get(application.student_id);
    return student
      ? [{ grade: student.grade, department: student.department, studentNumber: student.student_number, name: student.name, appliedAt: application.applied_at }]
      : [];
  });
  const appliedCount = applicants.length;
  return {
    courses,
    roster: {
      course,
      applicants,
      appliedCount,
      remainingSeats: calculateRemainingSeats(course.capacity, appliedCount),
      isFull: appliedCount >= course.capacity,
    },
  };
}

export async function getTeacherDashboardOverview(staff: Pick<Teacher, "id" | "name" | "role">) {
  const courses = await getTeacherCourseOptions(staff);
  const courseIds = courses.map((course) => course.id);
  const service = getSupabaseServerClient();
  const result = courseIds.length
    ? await service.from("applications").select("course_id").in("course_id", courseIds).eq("status", "applied")
    : { data: [] as Array<{ course_id: string }>, error: null };
  if (result.error) throw new Error("TEACHER_DASHBOARD_READ_FAILED");
  const counts = new Map<string, number>();
  for (const application of result.data ?? []) counts.set(application.course_id, (counts.get(application.course_id) ?? 0) + 1);
  return {
    courseCount: courses.length,
    applicantCount: result.data?.length ?? 0,
    fullCourseCount: courses.filter((course) => (counts.get(course.id) ?? 0) >= course.capacity).length,
  };
}
