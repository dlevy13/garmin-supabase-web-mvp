create table if not exists public.activities (
  activity_id text primary key,
  date timestamptz not null,
  season int not null,
  week_in_season int not null,
  month_in_season int not null,
  activity_type text,
  title text,
  duration_hours numeric,
  moving_hours numeric,
  elapsed_hours numeric,
  distance_km numeric,
  elevation_m numeric,
  descent_m numeric,
  calories numeric,
  avg_hr numeric,
  max_hr numeric,
  avg_power numeric,
  normalized_power numeric,
  best_20min_power numeric,
  max_power numeric,
  tss_original numeric,
  tss_final numeric,
  tss_source text,
  ftp_used numeric,
  threshold_hr_used numeric,
  intensity_factor numeric,
  data_quality_flag text,
  updated_at timestamptz default now()
);

create table if not exists public.pmc_daily (
  date_day date primary key,
  season int not null,
  week_in_season int not null,
  month_in_season int not null,
  tss numeric not null default 0,
  ctl numeric not null default 0,
  atl numeric not null default 0,
  tsb numeric not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  file_name text,
  activities_in_file int default 0,
  activities_upserted int default 0,
  duplicates_ignored int default 0,
  pmc_status text default 'pending'
);

alter table public.imports add column if not exists duplicates_ignored int default 0;
alter table public.imports add column if not exists pmc_status text default 'pending';

create index if not exists idx_activities_date on public.activities(date);
create index if not exists idx_activities_season_week on public.activities(season, week_in_season);
create index if not exists idx_pmc_daily_season_week on public.pmc_daily(season, week_in_season);
