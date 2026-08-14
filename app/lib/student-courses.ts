import "server-only";
import { CURRENT_ACADEMIC_YEAR } from "./academic-year";
import { calculateRemainingSeats } from "./student-course-rules";
import { getSupabaseServerClient } from "./supabase-server";
import type { Application, Course } from "../types/database";

export interface StudentCourse {
  id: string;
  sequence: number;
  subject: string;
  lectureStartDate: string;
  lectureEndDate: string;
  lectureDays: string | null;
  eligibility: string;
  capacity: number;
  applicantCount: number;
  remainingSeats: number;
}

export interface StudentCourseData {
  courses: StudentCourse[];
  myAppliedCourseId: string | null;
}

type PublicCourseRow = Pick<
  Course,
  "id" | "sequence" | "subject" | "lecture_start_date" | "lecture_end_date" | "lecture_days" | "eligibility" | "capacity"
>;

export async function getStudentCourses(studentId: string): Promise<StudentCourseData> {
  const service = getSupabaseServerClient();
  const { data: courseRows, error: courseError } = await service
    .from("courses")
    .select("id, sequence, subject, lecture_start_date, lecture_end_date, lecture_days, eligibility, capacity")
    .eq("academic_year", CURRENT_ACADEMIC_YEAR)
    .eq("is_active", true)
    .order("sequence", { ascending: true })
    .returns<PublicCourseRow[]>();

  if (courseError) throw new Error("STUDENT_COURSES_READ_FAILED");
  const courseIds = (courseRows ?? []).map((course) => course.id);

  const appliedCountsPromise = courseIds.length
    ? service
        .from("applications")
        .select("course_id")
        .eq("status", "applied")
        .in("course_id", courseIds)
        .returns<Array<Pick<Application, "course_id">>>()
    : Promise.resolve({ data: [] as Array<Pick<Application, "course_id">>, error: null });
  const myApplicationPromise = service
    .from("applications")
    .select("course_id")
    .eq("student_id", studentId)
    .eq("status", "applied")
    .limit(1)
    .returns<Array<Pick<Application, "course_id">>>()
    .maybeSingle();

  const [appliedCountsResult, myApplicationResult] = await Promise.all([appliedCountsPromise, myApplicationPromise]);
  if (appliedCountsResult.error || myApplicationResult.error) throw new Error("STUDENT_APPLICATIONS_READ_FAILED");

  const counts = new Map<string, number>();
  for (const application of appliedCountsResult.data ?? []) {
    counts.set(application.course_id, (counts.get(application.course_id) ?? 0) + 1);
  }

  return {
    courses: (courseRows ?? []).map((course) => {
      const applicantCount = counts.get(course.id) ?? 0;
      return {
        id: course.id,
        sequence: course.sequence,
        subject: course.subject,
        lectureStartDate: course.lecture_start_date,
        lectureEndDate: course.lecture_end_date,
        lectureDays: course.lecture_days,
        eligibility: course.eligibility,
        capacity: course.capacity,
        applicantCount,
        remainingSeats: calculateRemainingSeats(course.capacity, applicantCount),
      };
    }),
    myAppliedCourseId: myApplicationResult.data?.course_id ?? null,
  };
}

export function formatCourseDateRange(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00+09:00`);
  const endDate = new Date(`${end}T00:00:00+09:00`);
  const format = (date: Date, includeYear: boolean) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      ...(includeYear ? { year: "numeric" as const } : {}),
      month: "numeric",
      day: "numeric",
    }).format(date);
  return `${format(startDate, true)} ~ ${format(endDate, start.slice(0, 4) !== end.slice(0, 4))}`;
}
