-- CRM users. Run this alone. Do not touch decision_events — that table
-- is not present on the live project.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null,
  role text not null,
  created_at timestamptz default now()
);

alter table users enable row level security;
drop policy if exists "users read" on users;
create policy "users read" on users for select to anon, authenticated using (true);

insert into users (email, name, role) values
  ('lmeriem28@gmail.com', 'Meriem', 'Analyste'),
  ('dlaraki@u-investors.com', 'Driss', 'Managing Director'),
  ('j.lobe@u-investors.com', 'Jonathan', 'Analyste')
on conflict (email) do update set name = excluded.name, role = excluded.role;
