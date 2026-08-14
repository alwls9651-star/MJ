export type ApplicationWindowStatus = "NOT_CONFIGURED" | "BEFORE" | "OPEN" | "CLOSED";

export function classifyApplicationWindow(
  setting: { applicationStart: string; applicationEnd: string; isOpen: boolean } | null,
  now: string,
): ApplicationWindowStatus {
  if (!setting) return "NOT_CONFIGURED";
  if (!setting.isOpen) return "CLOSED";
  const currentTime = new Date(now).getTime();
  if (currentTime < new Date(setting.applicationStart).getTime()) return "BEFORE";
  if (currentTime >= new Date(setting.applicationEnd).getTime()) return "CLOSED";
  return "OPEN";
}

export function toSeoulInputValue(iso: string | null) {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function parseSeoulDateTime(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+09:00`);
  if (Number.isNaN(date.getTime())) return null;
  const utc = date.toISOString();
  return toSeoulInputValue(utc) === value ? utc : null;
}

export function formatSeoulDateTime(iso: string | null) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}
