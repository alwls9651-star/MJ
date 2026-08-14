import "server-only";
import { CURRENT_ACADEMIC_YEAR } from "./academic-year";
import {
  formatSeoulDateTime,
  parseSeoulDateTime,
  toSeoulInputValue,
  type ApplicationWindowStatus,
} from "./application-window-utils";
import { getSupabaseServerClient } from "./supabase-server";

export type { ApplicationWindowStatus } from "./application-window-utils";
export { formatSeoulDateTime, parseSeoulDateTime, toSeoulInputValue } from "./application-window-utils";

export interface ApplicationWindow {
  applicationStart: string | null;
  applicationEnd: string | null;
  isOpen: boolean;
  status: ApplicationWindowStatus;
  serverNow: string;
}

export async function getApplicationWindow(): Promise<ApplicationWindow> {
  const { data, error } = await getSupabaseServerClient().rpc("get_application_window", {
    p_academic_year: CURRENT_ACADEMIC_YEAR,
  });
  if (error) throw error;
  const row = data?.[0] as
    | {
        application_start: string;
        application_end: string;
        is_open: boolean;
        status: ApplicationWindowStatus;
        server_now: string;
      }
    | undefined;
  if (!row) {
    return {
      applicationStart: null,
      applicationEnd: null,
      isOpen: false,
      status: "NOT_CONFIGURED",
      serverNow: "",
    };
  }
  return {
    applicationStart: row.application_start,
    applicationEnd: row.application_end,
    isOpen: row.is_open,
    status: row.status,
    serverNow: row.server_now,
  };
}
