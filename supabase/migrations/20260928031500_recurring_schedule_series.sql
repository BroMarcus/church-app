-- Scheduling + Ministry Operations: recurring series that materialize canonical schedule_items.

create table if not exists public.schedule_series(
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null,
  church_id uuid not null references public.churches(id) on delete cascade,
  title text not null check(length(btrim(title)) between 1 and 160),
  frequency text not null check(frequency in ('weekly','monthly')),
  interval_count integer not null default 1 check(interval_count between 1 and 12),
  weekday smallint check(weekday between 0 and 6),
  month_day smallint check(month_day between 1 and 31),
  start_date date not null,
  end_date date,
  local_start_time time not null,
  duration_minutes integer check(duration_minutes between 1 and 1440),
  location text,
  notes text,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_series_schedule_church_fkey foreign key(schedule_id,church_id)
    references public.church_schedules(id,church_id) on delete cascade,
  constraint schedule_series_end_check check(end_date is null or end_date>=start_date),
  constraint schedule_series_pattern_check check(
    (frequency='weekly' and weekday is not null and month_day is null)
    or (frequency='monthly' and month_day is not null and weekday is null)
  )
);

create index if not exists schedule_series_schedule_active_idx on public.schedule_series(schedule_id,active,start_date);

alter table public.schedule_items
  add column if not exists series_id uuid references public.schedule_series(id) on delete set null,
  add column if not exists series_occurrence_date date,
  add column if not exists series_detached boolean not null default false;

create unique index if not exists schedule_items_series_occurrence_uidx
  on public.schedule_items(series_id,series_occurrence_date)
  where series_id is not null and series_occurrence_date is not null;

create or replace function private.guard_schedule_series_item()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_series public.schedule_series%rowtype;
begin
  if new.series_id is null then
    new.series_occurrence_date=null;
    new.series_detached=false;
    return new;
  end if;

  select * into v_series from public.schedule_series where id=new.series_id;
  if not found then raise exception 'Schedule series not found'; end if;
  if v_series.schedule_id<>new.schedule_id or v_series.church_id<>new.church_id then
    raise exception 'Recurring occurrence must belong to the same schedule and church';
  end if;
  if new.series_occurrence_date is null then raise exception 'Recurring occurrence date is required'; end if;
  return new;
end $$;

drop trigger if exists schedule_items_series_guard on public.schedule_items;
create trigger schedule_items_series_guard
before insert or update of series_id,series_occurrence_date,schedule_id,church_id
on public.schedule_items
for each row execute function private.guard_schedule_series_item();

alter table public.schedule_series enable row level security;

drop policy if exists schedule_series_read on public.schedule_series;
create policy schedule_series_read on public.schedule_series
for select to authenticated
using(
  exists(
    select 1 from public.church_schedules s
    where s.id=schedule_series.schedule_id
      and s.church_id=schedule_series.church_id
  )
);

drop policy if exists schedule_series_manage on public.schedule_series;
create policy schedule_series_manage on public.schedule_series
for all to authenticated
using(private.can_manage_church_schedule(schedule_id,church_id))
with check(private.can_manage_church_schedule(schedule_id,church_id));

create or replace function public.generate_schedule_series(p_series_id uuid,p_through_date date)
returns integer
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
declare
  v_user uuid:=auth.uid();
  v_series public.schedule_series%rowtype;
  v_timezone text;
  v_day date;
  v_last date;
  v_match boolean;
  v_start timestamptz;
  v_month_delta integer;
  v_created integer:=0;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select * into v_series from public.schedule_series where id=p_series_id and active;
  if not found then raise exception 'Active schedule series not found'; end if;
  if not private.can_manage_church_schedule(v_series.schedule_id,v_series.church_id) then raise exception 'Schedule management permission required'; end if;
  if p_through_date is null or p_through_date<v_series.start_date then raise exception 'Invalid recurrence end date'; end if;

  v_last=least(
    p_through_date,
    coalesce(v_series.end_date,p_through_date),
    v_series.start_date+interval '2 years'
  )::date;
  select coalesce(c.timezone,'UTC') into v_timezone from public.churches c where c.id=v_series.church_id;

  v_day=v_series.start_date;
  while v_day<=v_last loop
    v_match=false;

    if v_series.frequency='weekly' then
      v_match=extract(dow from v_day)::integer=v_series.weekday
        and mod(((v_day-v_series.start_date)/7),v_series.interval_count)=0;
    elsif v_series.frequency='monthly' then
      v_month_delta=(extract(year from v_day)::integer-extract(year from v_series.start_date)::integer)*12
        +(extract(month from v_day)::integer-extract(month from v_series.start_date)::integer);
      v_match=extract(day from v_day)::integer=v_series.month_day
        and mod(v_month_delta,v_series.interval_count)=0;
    end if;

    if v_match then
      v_start=((v_day+v_series.local_start_time) at time zone v_timezone);
      insert into public.schedule_items(
        schedule_id,church_id,title,starts_at,ends_at,location,notes,status,created_by,
        series_id,series_occurrence_date,series_detached
      ) values(
        v_series.schedule_id,v_series.church_id,v_series.title,v_start,
        case when v_series.duration_minutes is null then null else v_start+make_interval(mins=>v_series.duration_minutes) end,
        v_series.location,v_series.notes,'scheduled',v_series.created_by,
        v_series.id,v_day,false
      )
      on conflict(series_id,series_occurrence_date)
      where series_id is not null and series_occurrence_date is not null
      do nothing;
      if found then v_created=v_created+1; end if;
    end if;

    v_day=v_day+1;
  end loop;

  return v_created;
end $$;

revoke all on function public.generate_schedule_series(uuid,date) from public,anon;
grant execute on function public.generate_schedule_series(uuid,date) to authenticated;

revoke all on public.schedule_series from anon;
grant select,insert,update on public.schedule_series to authenticated;
