-- Reclassify existing data without changing activity IDs or training loads.
-- UTC matches the application calendar and PMC daily keys.
-- The optional 53rd calendar week is a transition with no season assignment.
begin;

alter table public.activities
  alter column season drop not null,
  alter column week_in_season drop not null,
  alter column month_in_season drop not null;
alter table public.pmc_daily
  alter column season drop not null,
  alter column week_in_season drop not null,
  alter column month_in_season drop not null;

create or replace function pg_temp.season_fields(day date)
returns table (season integer, week_in_season integer, month_in_season integer)
language sql immutable as $$
  with boundary as (
    select extract(year from day)::int as year,
      make_date(extract(year from day)::int, 11, 1) as november_first
  ), current_boundary as (
    select *, november_first + ((8 - extract(isodow from november_first)::int) % 7) as first_monday
    from boundary
  ), assigned as (
    select case when day >= first_monday then year + 1 else year end as season
    from current_boundary
  ), start_date as (
    select season, make_date(season - 1, 11, 1) as november_first from assigned
  ), classified as (
    select season,
      (day - (november_first + ((8 - extract(isodow from november_first)::int) % 7))) / 7 + 1 as week
    from start_date
  )
  select case when week <= 52 then season end,
    case when week <= 52 then week end,
    case when week > 52 then null
      when extract(month from day) = 11 and extract(year from day) = season then 12
      else (extract(month from day)::int + 1) % 12 + 1 end
  from classified;
$$;

with corrected as (
  select a.activity_id, s.*
  from public.activities a
  cross join lateral pg_temp.season_fields((a.date at time zone 'UTC')::date) s
)
update public.activities a
set season = c.season, week_in_season = c.week_in_season, month_in_season = c.month_in_season
from corrected c where a.activity_id = c.activity_id;

with corrected as (
  select p.date_day, s.* from public.pmc_daily p
  cross join lateral pg_temp.season_fields(p.date_day) s
)
update public.pmc_daily p
set season = c.season, week_in_season = c.week_in_season, month_in_season = c.month_in_season
from corrected c where p.date_day = c.date_day;

commit;
