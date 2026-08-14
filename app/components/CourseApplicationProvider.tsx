"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui";

type ApplicationContextValue = {
  pendingCourseId: string | null;
  apply: (courseId: string) => Promise<void>;
};

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export function CourseApplicationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  async function apply(courseId: string) {
    if (pendingCourseId) return;
    setPendingCourseId(courseId);
    setMessage(null);
    try {
      const response = await fetch("/api/student/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const result = (await response.json()) as { success?: boolean; code?: string; message?: string };
      setMessage({
        text: result.message ?? "수강신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        success: response.ok && result.success === true,
      });
      if (response.ok || result.code === "FULL" || result.code === "ALREADY_APPLIED") router.refresh();
    } catch {
      setMessage({ text: "수강신청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", success: false });
    } finally {
      setPendingCourseId(null);
    }
  }

  return (
    <ApplicationContext.Provider value={{ pendingCourseId, apply }}>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className={`mb-5 rounded-xl p-4 text-sm font-bold ${message.success ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}
        >
          {message.text}
        </p>
      ) : null}
      {children}
    </ApplicationContext.Provider>
  );
}

export function CourseApplyButton({ courseId }: { courseId: string }) {
  const context = useContext(ApplicationContext);
  if (!context) throw new Error("CourseApplyButton must be used inside CourseApplicationProvider");
  const pending = context.pendingCourseId !== null;
  const isCurrent = context.pendingCourseId === courseId;
  return (
    <Button
      type="button"
      className="mt-6 w-full"
      disabled={pending}
      onClick={() => context.apply(courseId)}
    >
      {isCurrent ? "신청 중..." : "신청하기"}
    </Button>
  );
}
