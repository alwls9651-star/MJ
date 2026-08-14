-- All application data is accessed through trusted server routes using the
-- service role. Browser roles use Supabase Auth only and must not query the
-- underlying school data through PostgREST.
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.courses enable row level security;
alter table public.application_settings enable row level security;
alter table public.applications enable row level security;
alter table public.admin_audit_logs enable row level security;

revoke all on table public.students from public, anon, authenticated;
revoke all on table public.teachers from public, anon, authenticated;
revoke all on table public.courses from public, anon, authenticated;
revoke all on table public.application_settings from public, anon, authenticated;
revoke all on table public.applications from public, anon, authenticated;
revoke all on table public.admin_audit_logs from public, anon, authenticated;

grant all on table public.students to service_role;
grant all on table public.teachers to service_role;
grant all on table public.courses to service_role;
grant all on table public.application_settings to service_role;
grant all on table public.applications to service_role;
grant all on table public.admin_audit_logs to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.verify_student_credentials(integer,integer,text,integer,text,text) from public, anon, authenticated;
revoke execute on function public.set_student_temporary_password(uuid,text) from public, anon, authenticated;
revoke execute on function public.change_student_password(uuid,text,text) from public, anon, authenticated;
revoke execute on function public.admin_reset_student_password(uuid,uuid,text) from public, anon, authenticated;
revoke execute on function public.get_application_window(integer) from public, anon, authenticated;
revoke execute on function public.is_student_eligible(integer,text) from public, anon, authenticated;
revoke execute on function public.apply_for_course(uuid,uuid,integer) from public, anon, authenticated;
revoke execute on function public.cancel_course_application(uuid,integer) from public, anon, authenticated;

grant execute on function public.verify_student_credentials(integer,integer,text,integer,text,text) to service_role;
grant execute on function public.set_student_temporary_password(uuid,text) to service_role;
grant execute on function public.change_student_password(uuid,text,text) to service_role;
grant execute on function public.admin_reset_student_password(uuid,uuid,text) to service_role;
grant execute on function public.get_application_window(integer) to service_role;
grant execute on function public.is_student_eligible(integer,text) to service_role;
grant execute on function public.apply_for_course(uuid,uuid,integer) to service_role;
grant execute on function public.cancel_course_application(uuid,integer) to service_role;
