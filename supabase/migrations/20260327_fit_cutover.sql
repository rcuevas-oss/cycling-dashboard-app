create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.seconds_to_hhmmss(total_seconds numeric)
returns text
language sql
immutable
as $$
  select case
    when total_seconds is null then null
    else lpad(floor(total_seconds / 3600)::text, 2, '0')
      || ':' ||
      lpad(floor(mod(total_seconds, 3600) / 60)::text, 2, '0')
      || ':' ||
      lpad(floor(mod(total_seconds, 60))::text, 2, '0')
  end;
$$;

create table if not exists public.activity_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_hash text not null,
  bucket_name text not null default 'fit-files',
  storage_path text not null,
  original_filename text not null,
  file_size_bytes bigint not null default 0,
  source_type text not null default 'fit',
  parse_status text not null default 'pending' check (parse_status in ('pending', 'parsed', 'failed')),
  parse_error text,
  uploaded_at timestamptz not null default now(),
  parsed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, file_hash),
  unique (bucket_name, storage_path)
);

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid not null references public.activity_files(id) on delete cascade,
  title text,
  sport text,
  sub_sport text,
  start_time timestamptz not null,
  distance_m numeric(12,2),
  moving_time_seconds numeric(12,2),
  elapsed_time_seconds numeric(12,2),
  ascenso_total numeric(10,2),
  descenso_total numeric(10,2),
  altura_min numeric(10,2),
  altura_max numeric(10,2),
  average_speed_mps numeric(10,4),
  max_speed_mps numeric(10,4),
  average_heartrate integer,
  max_heartrate integer,
  training_stress_score numeric(10,2),
  intensity_factor numeric(10,4),
  normalized_power integer,
  average_power integer,
  max_power integer,
  best_20min_power integer,
  average_cadence numeric(10,2),
  max_cadence numeric(10,2),
  total_cycles integer,
  calories integer,
  aerobic_training_effect numeric(10,2),
  anaerobic_training_effect numeric(10,2),
  temperature_min numeric(10,2),
  temperature_max numeric(10,2),
  respiration_rate_avg numeric(10,2),
  respiration_rate_min numeric(10,2),
  respiration_rate_max numeric(10,2),
  is_indoor boolean not null default false,
  raw_session jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_laps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.activity_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  lap_index integer not null,
  title text,
  start_time timestamptz,
  total_elapsed_time_seconds numeric(12,2),
  total_timer_time_seconds numeric(12,2),
  total_distance_m numeric(12,2),
  total_ascent numeric(10,2),
  total_descent numeric(10,2),
  avg_power integer,
  max_power integer,
  normalized_power integer,
  avg_heart_rate integer,
  max_heart_rate integer,
  avg_cadence numeric(10,2),
  max_cadence numeric(10,2),
  total_calories integer,
  intensity text,
  raw_lap jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, lap_index)
);

create table if not exists public.activity_workout_steps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.activity_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  step_index integer not null,
  step_type text,
  step_name text,
  intensity text,
  duration_type text,
  duration_value numeric(12,2),
  target_type text,
  target_value numeric(12,2),
  custom_target_low numeric(12,2),
  custom_target_high numeric(12,2),
  notes text,
  raw_step jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, step_index)
);

create table if not exists public.user_ingestion_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requires_fit_resync boolean not null default false,
  first_fit_synced_at timestamptz,
  migration_notice_dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_activity_files_updated_at on public.activity_files;
create trigger set_activity_files_updated_at
before update on public.activity_files
for each row execute function public.set_updated_at();

drop trigger if exists set_activity_sessions_updated_at on public.activity_sessions;
create trigger set_activity_sessions_updated_at
before update on public.activity_sessions
for each row execute function public.set_updated_at();

create unique index if not exists activity_sessions_dedupe_idx
on public.activity_sessions (
  user_id,
  start_time,
  coalesce(elapsed_time_seconds, 0),
  coalesce(distance_m, 0)
);

drop trigger if exists set_activity_laps_updated_at on public.activity_laps;
create trigger set_activity_laps_updated_at
before update on public.activity_laps
for each row execute function public.set_updated_at();

drop trigger if exists set_activity_workout_steps_updated_at on public.activity_workout_steps;
create trigger set_activity_workout_steps_updated_at
before update on public.activity_workout_steps
for each row execute function public.set_updated_at();

drop trigger if exists set_user_ingestion_state_updated_at on public.user_ingestion_state;
create trigger set_user_ingestion_state_updated_at
before update on public.user_ingestion_state
for each row execute function public.set_updated_at();

alter table public.activity_files enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.activity_laps enable row level security;
alter table public.activity_workout_steps enable row level security;
alter table public.user_ingestion_state enable row level security;

drop policy if exists "activity_files_select_own" on public.activity_files;
create policy "activity_files_select_own"
on public.activity_files
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "activity_sessions_select_own" on public.activity_sessions;
create policy "activity_sessions_select_own"
on public.activity_sessions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "activity_sessions_update_own" on public.activity_sessions;
create policy "activity_sessions_update_own"
on public.activity_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "activity_laps_select_own" on public.activity_laps;
create policy "activity_laps_select_own"
on public.activity_laps
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "activity_workout_steps_select_own" on public.activity_workout_steps;
create policy "activity_workout_steps_select_own"
on public.activity_workout_steps
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_ingestion_state_select_own" on public.user_ingestion_state;
create policy "user_ingestion_state_select_own"
on public.user_ingestion_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_ingestion_state_update_own" on public.user_ingestion_state;
create policy "user_ingestion_state_update_own"
on public.user_ingestion_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fit-files',
  'fit-files',
  false,
  26214400,
  array['application/octet-stream', 'application/vnd.ant.fit']
)
on conflict (id) do nothing;

drop policy if exists "fit-files_upload_own" on storage.objects;
create policy "fit-files_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "fit-files_select_own" on storage.objects;
create policy "fit-files_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "fit-files_delete_own" on storage.objects;
create policy "fit-files_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'fit-files'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace view public.activity_summaries
with (security_invoker = true)
as
select
  s.id,
  s.user_id,
  s.file_id,
  coalesce(s.title, af.original_filename) as title,
  coalesce(s.title, af.original_filename) as name,
  coalesce(s.title, af.original_filename) as titulo,
  coalesce(s.sport, 'cycling') as type,
  s.start_time as activity_date,
  s.start_time as start_date,
  s.start_time as date,
  round(coalesce(s.distance_m, 0) / 1000.0, 2) as distance_km,
  coalesce(s.distance_m, 0) as distance,
  round(coalesce(s.elapsed_time_seconds, 0) / 60.0, 0) as duration_minutes,
  coalesce(s.moving_time_seconds, 0) as moving_time,
  coalesce(s.elapsed_time_seconds, 0) as elapsed_time,
  public.seconds_to_hhmmss(s.elapsed_time_seconds) as tiempo,
  public.seconds_to_hhmmss(s.moving_time_seconds) as tiempo_movimiento,
  public.seconds_to_hhmmss(s.elapsed_time_seconds) as tiempo_transcurrido,
  s.ascenso_total as total_elevation_gain,
  s.ascenso_total,
  s.descenso_total,
  s.altura_min,
  s.altura_max,
  coalesce(s.average_speed_mps, 0) as average_speed,
  round(coalesce(s.average_speed_mps, 0) * 3.6, 2) as velocidad_media,
  coalesce(s.max_speed_mps, 0) as max_speed,
  round(coalesce(s.max_speed_mps, 0) * 3.6, 2) as velocidad_maxima,
  coalesce(s.average_heartrate, 0) as average_heartrate,
  coalesce(s.average_heartrate, 0) as fc_media,
  coalesce(s.max_heartrate, 0) as max_heartrate,
  coalesce(s.max_heartrate, 0) as fc_maxima,
  coalesce(s.training_stress_score, 0) as training_stress_score,
  coalesce(s.training_stress_score, 0) as tss,
  coalesce(s.normalized_power, 0) as normalized_power,
  coalesce(s.normalized_power, 0) as np,
  coalesce(s.intensity_factor, 0) as "if",
  coalesce(s.average_power, 0) as average_power,
  coalesce(s.average_power, 0) as potencia_media,
  coalesce(s.max_power, 0) as potencia_maxima,
  s.best_20min_power as potencia_20min,
  coalesce(s.average_cadence, 0) as cadencia_media,
  coalesce(s.max_cadence, 0) as cadencia_maxima,
  coalesce(s.total_cycles, 0) as pedaladas_totales,
  coalesce(s.calories, 0) as calorias,
  s.aerobic_training_effect as te_aerobico,
  s.anaerobic_training_effect as te_anaerobico,
  s.temperature_min as temperatura_min,
  s.temperature_max as temperatura_max,
  s.respiration_rate_avg as resp_media,
  s.respiration_rate_min as resp_min,
  s.respiration_rate_max as resp_max,
  coalesce(lc.lap_count, 0) as numero_vueltas,
  s.is_indoor,
  af.original_filename as file_name,
  s.raw_session as raw_data
from public.activity_sessions s
join public.activity_files af on af.id = s.file_id
left join lateral (
  select count(*)::int as lap_count
  from public.activity_laps l
  where l.session_id = s.id
) lc on true;

create or replace function public.ingest_fit_activity(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (payload ->> 'user_id')::uuid;
  v_file jsonb := payload -> 'file';
  v_session jsonb := payload -> 'session';
  v_laps jsonb := coalesce(payload -> 'laps', '[]'::jsonb);
  v_steps jsonb := coalesce(payload -> 'steps', '[]'::jsonb);
  v_file_id uuid;
  v_session_id uuid;
  v_existing_file record;
  v_existing_session_id uuid;
  v_lap_count integer := 0;
  v_step_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'user_id es requerido';
  end if;

  select f.id, f.parse_status, s.id as session_id
    into v_existing_file
  from public.activity_files f
  left join public.activity_sessions s on s.file_id = f.id
  where f.user_id = v_user_id
    and f.file_hash = (v_file ->> 'file_hash')
  limit 1;

  if found and v_existing_file.parse_status = 'parsed' and v_existing_file.session_id is not null then
    return jsonb_build_object(
      'status', 'duplicate',
      'session_id', v_existing_file.session_id,
      'laps_inserted', 0,
      'steps_inserted', 0
    );
  end if;

  if found then
    update public.activity_files
       set bucket_name = coalesce(v_file ->> 'bucket_name', bucket_name),
           storage_path = coalesce(v_file ->> 'storage_path', storage_path),
           original_filename = coalesce(v_file ->> 'original_filename', original_filename),
           file_size_bytes = coalesce((v_file ->> 'file_size_bytes')::bigint, file_size_bytes),
           parse_status = 'parsed',
           parse_error = null,
           parsed_at = now()
     where id = v_existing_file.id
     returning id into v_file_id;
  else
    insert into public.activity_files (
      user_id,
      file_hash,
      bucket_name,
      storage_path,
      original_filename,
      file_size_bytes,
      source_type,
      parse_status,
      parsed_at
    )
    values (
      v_user_id,
      v_file ->> 'file_hash',
      coalesce(v_file ->> 'bucket_name', 'fit-files'),
      v_file ->> 'storage_path',
      coalesce(v_file ->> 'original_filename', 'activity.fit'),
      coalesce((v_file ->> 'file_size_bytes')::bigint, 0),
      'fit',
      'parsed',
      now()
    )
    returning id into v_file_id;
  end if;

  select id
    into v_existing_session_id
  from public.activity_sessions
  where user_id = v_user_id
    and start_time = (v_session ->> 'start_time')::timestamptz
    and coalesce(elapsed_time_seconds, 0) = coalesce((v_session ->> 'elapsed_time_seconds')::numeric, 0)
    and coalesce(distance_m, 0) = coalesce((v_session ->> 'distance_m')::numeric, 0)
  limit 1;

  if v_existing_session_id is not null then
    update public.activity_sessions
       set file_id = v_file_id,
           title = nullif(v_session ->> 'title', ''),
           sport = nullif(v_session ->> 'sport', ''),
           sub_sport = nullif(v_session ->> 'sub_sport', ''),
           distance_m = (v_session ->> 'distance_m')::numeric,
           moving_time_seconds = (v_session ->> 'moving_time_seconds')::numeric,
           elapsed_time_seconds = (v_session ->> 'elapsed_time_seconds')::numeric,
           ascenso_total = (v_session ->> 'ascenso_total')::numeric,
           descenso_total = (v_session ->> 'descenso_total')::numeric,
           altura_min = (v_session ->> 'altura_min')::numeric,
           altura_max = (v_session ->> 'altura_max')::numeric,
           average_speed_mps = (v_session ->> 'average_speed_mps')::numeric,
           max_speed_mps = (v_session ->> 'max_speed_mps')::numeric,
           average_heartrate = (v_session ->> 'average_heartrate')::integer,
           max_heartrate = (v_session ->> 'max_heartrate')::integer,
           training_stress_score = (v_session ->> 'training_stress_score')::numeric,
           intensity_factor = (v_session ->> 'intensity_factor')::numeric,
           normalized_power = (v_session ->> 'normalized_power')::integer,
           average_power = (v_session ->> 'average_power')::integer,
           max_power = (v_session ->> 'max_power')::integer,
           best_20min_power = (v_session ->> 'best_20min_power')::integer,
           average_cadence = (v_session ->> 'average_cadence')::numeric,
           max_cadence = (v_session ->> 'max_cadence')::numeric,
           total_cycles = (v_session ->> 'total_cycles')::integer,
           calories = (v_session ->> 'calories')::integer,
           aerobic_training_effect = (v_session ->> 'aerobic_training_effect')::numeric,
           anaerobic_training_effect = (v_session ->> 'anaerobic_training_effect')::numeric,
           temperature_min = (v_session ->> 'temperature_min')::numeric,
           temperature_max = (v_session ->> 'temperature_max')::numeric,
           respiration_rate_avg = (v_session ->> 'respiration_rate_avg')::numeric,
           respiration_rate_min = (v_session ->> 'respiration_rate_min')::numeric,
           respiration_rate_max = (v_session ->> 'respiration_rate_max')::numeric,
           is_indoor = coalesce((v_session ->> 'is_indoor')::boolean, false),
           raw_session = coalesce(v_session -> 'raw_session', '{}'::jsonb),
           updated_at = now()
     where id = v_existing_session_id
     returning id into v_session_id;
  else
    insert into public.activity_sessions (
      user_id,
      file_id,
      title,
      sport,
      sub_sport,
      start_time,
      distance_m,
      moving_time_seconds,
      elapsed_time_seconds,
      ascenso_total,
      descenso_total,
      altura_min,
      altura_max,
      average_speed_mps,
      max_speed_mps,
      average_heartrate,
      max_heartrate,
      training_stress_score,
      intensity_factor,
      normalized_power,
      average_power,
      max_power,
      best_20min_power,
      average_cadence,
      max_cadence,
      total_cycles,
      calories,
      aerobic_training_effect,
      anaerobic_training_effect,
      temperature_min,
      temperature_max,
      respiration_rate_avg,
      respiration_rate_min,
      respiration_rate_max,
      is_indoor,
      raw_session
    )
    values (
      v_user_id,
      v_file_id,
      nullif(v_session ->> 'title', ''),
      nullif(v_session ->> 'sport', ''),
      nullif(v_session ->> 'sub_sport', ''),
      (v_session ->> 'start_time')::timestamptz,
      (v_session ->> 'distance_m')::numeric,
      (v_session ->> 'moving_time_seconds')::numeric,
      (v_session ->> 'elapsed_time_seconds')::numeric,
      (v_session ->> 'ascenso_total')::numeric,
      (v_session ->> 'descenso_total')::numeric,
      (v_session ->> 'altura_min')::numeric,
      (v_session ->> 'altura_max')::numeric,
      (v_session ->> 'average_speed_mps')::numeric,
      (v_session ->> 'max_speed_mps')::numeric,
      (v_session ->> 'average_heartrate')::integer,
      (v_session ->> 'max_heartrate')::integer,
      (v_session ->> 'training_stress_score')::numeric,
      (v_session ->> 'intensity_factor')::numeric,
      (v_session ->> 'normalized_power')::integer,
      (v_session ->> 'average_power')::integer,
      (v_session ->> 'max_power')::integer,
      (v_session ->> 'best_20min_power')::integer,
      (v_session ->> 'average_cadence')::numeric,
      (v_session ->> 'max_cadence')::numeric,
      (v_session ->> 'total_cycles')::integer,
      (v_session ->> 'calories')::integer,
      (v_session ->> 'aerobic_training_effect')::numeric,
      (v_session ->> 'anaerobic_training_effect')::numeric,
      (v_session ->> 'temperature_min')::numeric,
      (v_session ->> 'temperature_max')::numeric,
      (v_session ->> 'respiration_rate_avg')::numeric,
      (v_session ->> 'respiration_rate_min')::numeric,
      (v_session ->> 'respiration_rate_max')::numeric,
      coalesce((v_session ->> 'is_indoor')::boolean, false),
      coalesce(v_session -> 'raw_session', '{}'::jsonb)
    )
    returning id into v_session_id;
  end if;

  delete from public.activity_laps where session_id = v_session_id;
  insert into public.activity_laps (
    session_id,
    user_id,
    lap_index,
    title,
    start_time,
    total_elapsed_time_seconds,
    total_timer_time_seconds,
    total_distance_m,
    total_ascent,
    total_descent,
    avg_power,
    max_power,
    normalized_power,
    avg_heart_rate,
    max_heart_rate,
    avg_cadence,
    max_cadence,
    total_calories,
    intensity,
    raw_lap
  )
  select
    v_session_id,
    v_user_id,
    coalesce((lap ->> 'lap_index')::integer, ordinality - 1),
    nullif(lap ->> 'title', ''),
    nullif(lap ->> 'start_time', '')::timestamptz,
    (lap ->> 'total_elapsed_time_seconds')::numeric,
    (lap ->> 'total_timer_time_seconds')::numeric,
    (lap ->> 'total_distance_m')::numeric,
    (lap ->> 'total_ascent')::numeric,
    (lap ->> 'total_descent')::numeric,
    (lap ->> 'avg_power')::integer,
    (lap ->> 'max_power')::integer,
    (lap ->> 'normalized_power')::integer,
    (lap ->> 'avg_heart_rate')::integer,
    (lap ->> 'max_heart_rate')::integer,
    (lap ->> 'avg_cadence')::numeric,
    (lap ->> 'max_cadence')::numeric,
    (lap ->> 'total_calories')::integer,
    nullif(lap ->> 'intensity', ''),
    coalesce(lap -> 'raw_lap', '{}'::jsonb)
  from jsonb_array_elements(v_laps) with ordinality as x(lap, ordinality);
  get diagnostics v_lap_count = row_count;

  delete from public.activity_workout_steps where session_id = v_session_id;
  insert into public.activity_workout_steps (
    session_id,
    user_id,
    step_index,
    step_type,
    step_name,
    intensity,
    duration_type,
    duration_value,
    target_type,
    target_value,
    custom_target_low,
    custom_target_high,
    notes,
    raw_step
  )
  select
    v_session_id,
    v_user_id,
    coalesce((step ->> 'step_index')::integer, ordinality - 1),
    nullif(step ->> 'step_type', ''),
    nullif(step ->> 'step_name', ''),
    nullif(step ->> 'intensity', ''),
    nullif(step ->> 'duration_type', ''),
    (step ->> 'duration_value')::numeric,
    nullif(step ->> 'target_type', ''),
    (step ->> 'target_value')::numeric,
    (step ->> 'custom_target_low')::numeric,
    (step ->> 'custom_target_high')::numeric,
    nullif(step ->> 'notes', ''),
    coalesce(step -> 'raw_step', '{}'::jsonb)
  from jsonb_array_elements(v_steps) with ordinality as x(step, ordinality);
  get diagnostics v_step_count = row_count;

  insert into public.user_ingestion_state (
    user_id,
    requires_fit_resync,
    first_fit_synced_at
  )
  values (
    v_user_id,
    false,
    now()
  )
  on conflict (user_id) do update
    set requires_fit_resync = false,
        first_fit_synced_at = coalesce(public.user_ingestion_state.first_fit_synced_at, excluded.first_fit_synced_at),
        updated_at = now();

  return jsonb_build_object(
    'status', 'inserted',
    'session_id', v_session_id,
    'laps_inserted', v_lap_count,
    'steps_inserted', v_step_count
  );
end;
$$;

grant select on public.activity_summaries to authenticated;
grant execute on function public.ingest_fit_activity(jsonb) to authenticated, service_role;

insert into public.user_ingestion_state (user_id, requires_fit_resync)
select id, true
from auth.users
on conflict (user_id) do update
  set requires_fit_resync = true,
      updated_at = now();

truncate table public.activities;
