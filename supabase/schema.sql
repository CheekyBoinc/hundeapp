-- Hundeapp – Datenbankschema
-- Einmal komplett im Supabase SQL Editor ausführen.

create table if not exists public.commands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  beschreibung text,
  tipp text,
  created_at timestamptz not null default now(),
  constraint commands_name_unique unique (lower(name))
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  ort text,
  was_gemacht text,
  uebungsaufgaben text,
  tipps text,
  erledigt boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.entry_commands (
  entry_id uuid not null references public.entries (id) on delete cascade,
  command_id uuid not null references public.commands (id) on delete cascade,
  primary key (entry_id, command_id)
);

create index if not exists entries_date_idx on public.entries (date desc);

-- Echtzeit-Sync zwischen den Geräten aktivieren
alter publication supabase_realtime add table public.entries;
alter publication supabase_realtime add table public.entry_commands;
alter publication supabase_realtime add table public.commands;

-- Sicherheit: nur angemeldete Nutzer; alle teilen sich die Daten (Familienmodus)
alter table public.commands enable row level security;
alter table public.entries enable row level security;
alter table public.entry_commands enable row level security;

create policy "family_all" on public.commands for all to authenticated using (true) with check (true);
create policy "family_all" on public.entries for all to authenticated using (true) with check (true);
create policy "family_all" on public.entry_commands for all to authenticated using (true) with check (true);
