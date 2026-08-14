create or replace function public.get_application_window(p_academic_year integer)
returns table(
  application_start timestamptz,
  application_end timestamptz,
  is_open boolean,
  status text,
  server_now timestamptz
)
language sql security definer
set search_path = pg_catalog, public
as $$
  with current_setting as (
    select s.application_start, s.application_end, s.is_open
    from public.application_settings s
    where s.academic_year = p_academic_year
    order by s.updated_at desc
    limit 1
  ), db_time as (select now() as current_time)
  select s.application_start, s.application_end, s.is_open,
    case
      when not s.is_open then 'CLOSED'
      when t.current_time < s.application_start then 'BEFORE'
      when t.current_time >= s.application_end then 'CLOSED'
      else 'OPEN'
    end,
    t.current_time
  from current_setting s cross join db_time t;
$$;

revoke all on function public.get_application_window(integer) from public, anon, authenticated;
grant execute on function public.get_application_window(integer) to service_role;
