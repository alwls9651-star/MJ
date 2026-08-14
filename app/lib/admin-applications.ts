import "server-only";
import { CURRENT_ACADEMIC_YEAR } from "./academic-year";
import { getAdminCourseState, sortByApplicationOrder } from "./admin-application-rules";
import { calculateRemainingSeats } from "./student-course-rules";
import { getSupabaseServerClient } from "./supabase-server";
import type { Application, Course, Student, Teacher } from "../types/database";

export type AdminApplicationStatus = "applied" | "cancelled";
export type AdminCourseState = "available" | "full" | "inactive";

export interface AdminRosterEntry {
  applicationId: string;
  grade: number;
  department: string;
  studentNumber: number;
  name: string;
  appliedAt: string;
  cancelledAt: string | null;
  status: AdminApplicationStatus;
}

export interface AdminCourseApplicationSummary {
  id: string;
  sequence: number;
  subject: string;
  teacherName: string;
  teacherEmail: string | null;
  eligibility: string;
  capacity: number;
  isActive: boolean;
  appliedCount: number;
  remainingSeats: number;
  state: AdminCourseState;
  activeApplicants: AdminRosterEntry[];
  cancellationHistory: AdminRosterEntry[];
}

export interface UnappliedStudent {
  grade: number;
  department: string;
  studentNumber: number;
  name: string;
}

export interface AdminApplicationOverview {
  stats: {
    totalStudents: number;
    appliedStudents: number;
    unappliedStudents: number;
    activeCourses: number;
    fullCourses: number;
  };
  courses: AdminCourseApplicationSummary[];
  unappliedStudents: UnappliedStudent[];
}

type StudentRow = Pick<Student, "id" | "grade" | "department" | "student_number" | "name">;
type CourseRow = Pick<Course, "id" | "sequence" | "subject" | "teacher_id" | "eligibility" | "capacity" | "is_active">;
type TeacherRow = Pick<Teacher, "id" | "name" | "email">;
type ApplicationRow = Pick<Application, "id" | "student_id" | "course_id" | "status" | "applied_at" | "cancelled_at">;

export async function getAdminApplicationOverview(): Promise<AdminApplicationOverview> {
  const service = getSupabaseServerClient();
  const [studentResult, courseResult] = await Promise.all([
    service
      .from("students")
      .select("id, grade, department, student_number, name")
      .eq("academic_year", CURRENT_ACADEMIC_YEAR)
      .order("grade")
      .order("department")
      .order("student_number")
      .returns<StudentRow[]>(),
    service
      .from("courses")
      .select("id, sequence, subject, teacher_id, eligibility, capacity, is_active")
      .eq("academic_year", CURRENT_ACADEMIC_YEAR)
      .order("sequence")
      .returns<CourseRow[]>(),
  ]);
  if (studentResult.error || courseResult.error) throw new Error("ADMIN_APPLICATIONS_BASE_READ_FAILED");

  const students = studentResult.data ?? [];
  const courses = courseResult.data ?? [];
  const courseIds = courses.map((course) => course.id);
  const teacherIds = [...new Set(courses.map((course) => course.teacher_id))];
  const [applicationResult, teacherResult] = await Promise.all([
    courseIds.length
      ? service
          .from("applications")
          .select("id, student_id, course_id, status, applied_at, cancelled_at")
          .in("course_id", courseIds)
          .order("applied_at")
          .order("id")
          .returns<ApplicationRow[]>()
      : Promise.resolve({ data: [] as ApplicationRow[], error: null }),
    teacherIds.length
      ? service.from("teachers").select("id, name, email").in("id", teacherIds).returns<TeacherRow[]>()
      : Promise.resolve({ data: [] as TeacherRow[], error: null }),
  ]);
  if (applicationResult.error || teacherResult.error) throw new Error("ADMIN_APPLICATIONS_DETAIL_READ_FAILED");

  const studentsById = new Map(students.map((student) => [student.id, student]));
  const teachersById = new Map((teacherResult.data ?? []).map((teacher) => [teacher.id, teacher]));
  const applicationsByCourse = new Map<string, ApplicationRow[]>();
  const appliedStudentIds = new Set<string>();
  for (const application of sortByApplicationOrder(applicationResult.data ?? [])) {
    const list = applicationsByCourse.get(application.course_id) ?? [];
    list.push(application);
    applicationsByCourse.set(application.course_id, list);
    if (application.status === "applied") appliedStudentIds.add(application.student_id);
  }

  const toRosterEntry = (application: ApplicationRow): AdminRosterEntry | null => {
    const student = studentsById.get(application.student_id);
    if (!student) return null;
    return {
      applicationId: application.id,
      grade: student.grade,
      department: student.department,
      studentNumber: student.student_number,
      name: student.name,
      appliedAt: application.applied_at,
      cancelledAt: application.cancelled_at,
      status: application.status,
    };
  };

  const courseSummaries = courses.map((course): AdminCourseApplicationSummary => {
    const applications = applicationsByCourse.get(course.id) ?? [];
    const activeApplicants = applications
      .filter((application) => application.status === "applied")
      .map(toRosterEntry)
      .filter((entry): entry is AdminRosterEntry => entry !== null);
    const cancellationHistory = applications
      .filter((application) => application.status === "cancelled")
      .map(toRosterEntry)
      .filter((entry): entry is AdminRosterEntry => entry !== null);
    const appliedCount = activeApplicants.length;
    const teacher = teachersById.get(course.teacher_id);
    return {
      id: course.id,
      sequence: course.sequence,
      subject: course.subject,
      teacherName: teacher?.name ?? "담당 교사 미확인",
      teacherEmail: teacher?.email ?? null,
      eligibility: course.eligibility,
      capacity: course.capacity,
      isActive: course.is_active,
      appliedCount,
      remainingSeats: calculateRemainingSeats(course.capacity, appliedCount),
      state: getAdminCourseState(course.is_active, course.capacity, appliedCount),
      activeApplicants,
      cancellationHistory,
    };
  });

  const unappliedStudents = students
    .filter((student) => !appliedStudentIds.has(student.id))
    .map((student) => ({
      grade: student.grade,
      department: student.department,
      studentNumber: student.student_number,
      name: student.name,
    }));
  const activeCourses = courseSummaries.filter((course) => course.isActive);

  return {
    stats: {
      totalStudents: students.length,
      appliedStudents: appliedStudentIds.size,
      unappliedStudents: unappliedStudents.length,
      activeCourses: activeCourses.length,
      fullCourses: activeCourses.filter((course) => course.state === "full").length,
    },
    courses: courseSummaries,
    unappliedStudents,
  };
}

export function formatAdminApplicationTime(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
