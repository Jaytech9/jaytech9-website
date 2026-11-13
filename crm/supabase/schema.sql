-- JayTech9 CRM database. Run this once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run again: it only creates what is missing.

create extension if not exists pgcrypto;

-- Staff who can sign in to the CRM. Add a row here after inviting someone in Authentication → Users.
create table if not exists staff (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid());
$$;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where id = auth.uid() and role = 'admin');
$$;

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organisation text,
  phone text,
  email text,
  service text,
  source text,
  marketing_opt_in boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);
create unique index if not exists clients_email_key on clients (lower(email)) where email is not null;

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  name text not null,
  organisation text,
  email text,
  phone text,
  service text,
  details text,
  budget text,
  timeline text,
  method text,
  call_at timestamptz,
  source text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'done', 'cancelled', 'no_show')),
  created_at timestamptz not null default now()
);

create table if not exists enquiries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  name text not null,
  email text,
  phone text,
  organisation text,
  needs text,
  message text,
  status text not null default 'new' check (status in ('new', 'replied', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  title text not null,
  service text,
  value numeric(12, 2) not null default 0,
  stage text not null default 'new' check (stage in ('new', 'call', 'quote', 'progress', 'won', 'lost')),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients (id) on delete set null,
  title text not null,
  service text,
  status text not null default 'planning' check (status in ('planning', 'in_progress', 'review', 'delivered', 'on_hold')),
  progress int not null default 0 check (progress between 0 and 100),
  value numeric(12, 2) not null default 0,
  start_date date,
  due_date date,
  show_on_website boolean not null default false,
  website_summary text,
  website_outcome text,
  live_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organisation text,
  role text,
  rating int check (rating between 1 and 5),
  message text not null,
  consent boolean not null default false,
  product text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists site_sections (
  key text primary key,
  label text not null,
  location text,
  enabled boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

insert into site_sections (key, label, location, enabled, sort) values
  ('help_widget', 'Help chat bubble', 'Every page', true, 1),
  ('testimonials', 'What clients say', 'Home and product pages', true, 2),
  ('accept_reviews', 'Accept new reviews', 'Share your experience page', true, 3),
  ('recent_designs', 'Recent designs', 'Home', true, 4),
  ('service_examples', 'Examples of our work', 'Services', true, 5),
  ('urgent_booking', 'Urgent (express) bookings', 'Booking form', true, 7),
  ('blog', 'Blog', 'Footer link', false, 8),
  ('careers', 'Open roles', 'Careers page', true, 9),
  ('donate', 'Donate', 'Footer link', true, 10)
on conflict (key) do nothing;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  kind text not null default 'promotion' check (kind in ('promotion', 'update')),
  audience text not null,
  audience_spec jsonb not null default '{}'::jsonb,
  subject text,
  message text not null,
  recipients int not null default 0,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'sent', 'failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  error text,
  created_by uuid references staff (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_id uuid,
  action text not null,
  detail text,
  actor uuid references staff (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Row-level security: staff can do everything; visitors (anon) can only read what the website shows.
do $$
declare t text;
begin
  foreach t in array array['staff','clients','bookings','enquiries','deals','projects','reviews','site_sections','campaigns','activity'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists staff_all on %I', t);
    execute format('create policy staff_all on %I for all to authenticated using (is_staff()) with check (is_staff())', t);
  end loop;
end $$;

drop policy if exists staff_admin_only on staff;
create policy staff_admin_only on staff for all to authenticated using (is_admin()) with check (is_admin());
drop policy if exists staff_read_self on staff;
create policy staff_read_self on staff for select to authenticated using (id = auth.uid() or is_staff());

drop policy if exists public_sections on site_sections;
create policy public_sections on site_sections for select to anon using (true);
-- The website reads only these two views, which leave out private fields (money, contacts).
drop policy if exists public_reviews on reviews;
drop policy if exists public_projects on projects;
create or replace view website_reviews as
  select id, name, organisation, role, rating, message, product, created_at
  from reviews where status = 'approved' and consent;
create or replace view website_projects as
  select id, title, service, status, website_summary as summary, website_outcome as outcome, live_url, updated_at
  from projects where show_on_website;
revoke all on website_reviews, website_projects from anon, authenticated;
grant select on website_reviews, website_projects to anon, authenticated;

-- Keep updated_at fresh.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists deals_touch on deals;
create trigger deals_touch before update on deals for each row execute function touch_updated_at();
drop trigger if exists projects_touch on projects;
create trigger projects_touch before update on projects for each row execute function touch_updated_at();
drop trigger if exists sections_touch on site_sections;
create trigger sections_touch before update on site_sections for each row execute function touch_updated_at();
