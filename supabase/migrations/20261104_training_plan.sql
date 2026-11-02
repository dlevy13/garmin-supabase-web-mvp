-- Run once in the Supabase SQL editor before importing a training plan.
create table if not exists public.training_plan_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  file_name text not null,
  rows_count integer not null,
  added_count integer not null,
  updated_count integer not null,
  unchanged_count integer not null,
  -- Parsed entries preserve each submitted version; the raw CSV is not stored.
  entries jsonb not null
);

create table if not exists public.training_plan_days (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  phase text not null,
  week_type text not null,
  duration_hours numeric check (duration_hours >= 0 and duration_hours <= 24),
  tss_target numeric check (tss_target >= 0 and tss_target <= 100000),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.training_plan_days enable row level security;
alter table public.training_plan_imports enable row level security;
drop policy if exists "Read own training days" on public.training_plan_days;
create policy "Read own training days" on public.training_plan_days for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Read own training imports" on public.training_plan_imports;
create policy "Read own training imports" on public.training_plan_imports for select to authenticated using (auth.uid() = user_id);

-- A single transaction: validation, counts, dated upserts and import history.
-- Callable only by the server's service role, with the authenticated user's id.
create or replace function public.import_training_plan(p_user_id uuid, p_file_name text, p_entries jsonb)
returns jsonb language plpgsql set search_path = public as $$
declare
  added integer;
  changed integer;
  same integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) not between 1 and 4000 then
    raise exception 'Invalid plan entries';
  end if;

  with incoming as (
    select * from jsonb_to_recordset(p_entries)
      as x(date date, phase text, week_type text, duration_hours numeric, tss_target numeric)
  )
  select count(*) filter (where d.date is null),
    count(*) filter (where d.date is not null and (d.phase, d.week_type, d.duration_hours, d.tss_target)
      is distinct from (i.phase, i.week_type, i.duration_hours, i.tss_target)),
    count(*) filter (where d.date is not null and (d.phase, d.week_type, d.duration_hours, d.tss_target)
      is not distinct from (i.phase, i.week_type, i.duration_hours, i.tss_target))
  into added, changed, same
  from incoming i left join public.training_plan_days d on d.user_id = p_user_id and d.date = i.date;

  insert into public.training_plan_days(user_id, date, phase, week_type, duration_hours, tss_target)
    select p_user_id, x.date, x.phase, x.week_type, x.duration_hours, x.tss_target
    from jsonb_to_recordset(p_entries) as x(date date, phase text, week_type text, duration_hours numeric, tss_target numeric)
  on conflict (user_id, date) do update set
    phase = excluded.phase, week_type = excluded.week_type,
    duration_hours = excluded.duration_hours, tss_target = excluded.tss_target, updated_at = now()
  where (training_plan_days.phase, training_plan_days.week_type, training_plan_days.duration_hours, training_plan_days.tss_target)
    is distinct from (excluded.phase, excluded.week_type, excluded.duration_hours, excluded.tss_target);

  insert into public.training_plan_imports(user_id, file_name, rows_count, added_count, updated_count, unchanged_count, entries)
  values (p_user_id, p_file_name, jsonb_array_length(p_entries), added, changed, same, p_entries);
  return jsonb_build_object('added', added, 'updated', changed, 'unchanged', same);
end;
$$;
revoke all on function public.import_training_plan(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.import_training_plan(uuid, text, jsonb) to service_role;
