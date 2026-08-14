"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal } from "./ui";

export function CourseCancelButton({
  subject,
  disabledReason,
}: {
  subject: string;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null);

  async function cancel() {
    if (pending) return;
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/student/applications", { method: "DELETE" });
      const result = (await response.json()) as { success?: boolean; code?: string; message?: string };
      const success = response.ok && result.success === true;
      setMessage({
        text: result.message ?? "수강신청 취소 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
        success,
      });
      setOpen(false);
      if (success || result.code === "NOT_OPEN" || result.code === "NO_ACTIVE_APPLICATION") router.refresh();
    } catch {
      setMessage({ text: "수강신청 취소 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", success: false });
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4">
      <Button type="button" variant="danger" className="w-full" disabled={Boolean(disabledReason)} onClick={() => setOpen(true)}>
        신청 취소
      </Button>
      {disabledReason ? <p className="mt-2 text-xs text-slate-500">{disabledReason}</p> : null}
      {message ? (
        <p role="status" aria-live="polite" className={`mt-3 rounded-xl p-3 text-sm font-bold ${message.success ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      ) : null}
      <Modal open={open} title="수강신청 취소 확인">
        <p className="text-sm font-semibold text-slate-700">‘{subject}’ 신청을 취소하시겠습니까?</p>
        <p className="mt-2 text-sm text-slate-500">취소 후 신청기간 내에는 다른 강좌를 다시 신청할 수 있습니다.</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>돌아가기</Button>
          <Button type="button" variant="danger" disabled={pending} onClick={cancel}>{pending ? "취소 중..." : "신청 취소"}</Button>
        </div>
      </Modal>
    </div>
  );
}
