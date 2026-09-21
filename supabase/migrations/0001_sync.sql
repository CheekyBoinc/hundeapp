-- Sync-Dienst der Hundeapp.
--
-- Eine Zeile je Konto mit dem gesamten Stand als JSON, dazu die Freischaltung.
-- Wird im Supabase-Projekt ausgeführt (SQL-Editor oder `supabase db push`).

-- ===== Tabellen =====

create table if not exists public.sync_state (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb       not null check (octet_length(data::text) <= 1048576),
  revision   bigint      not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlement (
  user_id    uuid primary key references auth.users on delete cascade,
  active     boolean     not null,
  source     text        not null,          -- 'beta', später 'purchase' oder 'gift'
  updated_at timestamptz not null default now()
);

-- ===== Zugriffsschutz =====

alter table public.sync_state enable row level security;
alter table public.entitlement enable row level security;

-- Lesen darf jeder nur seine eigene Zeile, und zwar ohne Prüfung der
-- Freischaltung: Wer nicht mehr freigeschaltet ist, soll seine Daten trotzdem
-- lesen können. Geschrieben wird ausschließlich über die Funktion unten.
drop policy if exists sync_state_select on public.sync_state;
create policy sync_state_select on public.sync_state
  for select using (user_id = auth.uid());

drop policy if exists entitlement_select on public.entitlement;
create policy entitlement_select on public.entitlement
  for select using (user_id = auth.uid());

revoke insert, update, delete on public.sync_state from authenticated, anon;
revoke insert, update, delete on public.entitlement from authenticated, anon;

-- ===== Freischaltung für neue Konten =====
-- In der Einführungsphase ist der Dienst kostenlos: Jedes neue Konto bekommt
-- eine aktive Freischaltung mit der Quelle 'beta'. Mit dem Start des Kaufs wird
-- dieser Auslöser abgeschaltet und die beta-Zeilen werden deaktiviert; Familie
-- und Tester erhalten stattdessen eine Zeile mit der Quelle 'gift'.

create or replace function public.grant_beta_entitlement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.entitlement (user_id, active, source)
  values (new.id, true, 'beta')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_beta on auth.users;
create trigger on_auth_user_created_beta
  after insert on auth.users
  for each row execute function public.grant_beta_entitlement();

-- ===== Revision abfragen =====
-- Nur wenige Bytes: Damit fragt ein Gerät, ob sich etwas geändert hat, ohne
-- den vollständigen Stand zu laden.

create or replace function public.sync_head()
returns bigint
language sql
stable
as $$
  select revision from public.sync_state where user_id = auth.uid();
$$;

-- ===== Schreiben mit Konflikterkennung =====
-- p_expected ist null beim ersten Schreiben, sonst die zuletzt gesehene
-- Revision. Rückgabe ist die neue Revision oder null bei einem Konflikt.

create or replace function public.sync_put(p_expected bigint, p_data jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active boolean;
  v_next bigint;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select active into v_active from public.entitlement where user_id = auth.uid();
  if v_active is not true then
    raise exception 'no_entitlement' using errcode = 'P0001';
  end if;

  if p_expected is null then
    insert into public.sync_state (user_id, data, revision, updated_at)
    values (auth.uid(), p_data, 1, now())
    on conflict (user_id) do nothing
    returning revision into v_next;
  else
    update public.sync_state
       set data = p_data, revision = revision + 1, updated_at = now()
     where user_id = auth.uid() and revision = p_expected
    returning revision into v_next;
  end if;

  return v_next;
end;
$$;

revoke all on function public.sync_put(bigint, jsonb) from public;
revoke all on function public.sync_head() from public;
revoke all on function public.grant_beta_entitlement() from public;
grant execute on function public.sync_put(bigint, jsonb) to authenticated;
grant execute on function public.sync_head() to authenticated;
