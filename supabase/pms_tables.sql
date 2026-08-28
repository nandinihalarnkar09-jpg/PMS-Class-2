-- Helix PMS tables for Supabase Postgres
-- Run in: Dashboard → SQL Editor → New query
-- Requires gen_random_uuid() (on by default in Supabase)

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pms_role') then
    create type pms_role as enum ('employee', 'manager', 'hr_admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'cycle_status') then
    create type cycle_status as enum ('draft', 'open', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'goal_status') then
    create type goal_status as enum ('draft', 'submitted', 'approved', 'sent_back');
  end if;
  if not exists (select 1 from pg_type where typname = 'review_status') then
    create type review_status as enum (
      'not_started',
      'self_appraisal_submitted',
      'manager_reviewed',
      'completed'
    );
  end if;
end $$;

-- People. A manager is another row in this table, not a separate managers table.
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  full_name text not null,
  email text not null unique,
  designation text not null,
  department text not null,
  date_of_joining date not null,
  manager_id uuid,
  role pms_role not null default 'employee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint employees_manager_fk
    foreign key (manager_id) references employees (id)
    on update cascade
    on delete set null
);

-- Appraisal window (FY cycle).
create table if not exists review_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status cycle_status not null default 'draft',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  constraint review_cycles_dates_chk check (end_date >= start_date),
  constraint review_cycles_created_by_fk
    foreign key (created_by) references employees (id)
    on update cascade
    on delete restrict
);

-- Plan only: title, description, weight, dates, approval state. No scores here.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null,
  cycle_id uuid not null,
  title text not null,
  description text,
  weightage numeric(5, 2) not null,
  target_date date,
  status goal_status not null default 'draft',
  manager_comment text,
  created_at timestamptz not null default now(),
  constraint goals_weightage_chk check (weightage > 0 and weightage <= 100),
  constraint goals_employee_fk
    foreign key (employee_id) references employees (id)
    on update cascade
    on delete cascade,
  constraint goals_cycle_fk
    foreign key (cycle_id) references review_cycles (id)
    on update cascade
    on delete restrict
);

-- Outcome packet for one person in one cycle.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null,
  manager_id uuid not null,
  cycle_id uuid not null,
  status review_status not null default 'not_started',
  overall_self_rating numeric(3, 2),
  overall_manager_rating numeric(3, 2),
  manager_summary text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reviews_self_rating_chk check (
    overall_self_rating is null or (overall_self_rating >= 1 and overall_self_rating <= 5)
  ),
  constraint reviews_manager_rating_chk check (
    overall_manager_rating is null or (overall_manager_rating >= 1 and overall_manager_rating <= 5)
  ),
  constraint reviews_one_per_employee_cycle unique (employee_id, cycle_id),
  constraint reviews_employee_fk
    foreign key (employee_id) references employees (id)
    on update cascade
    on delete cascade,
  constraint reviews_manager_fk
    foreign key (manager_id) references employees (id)
    on update cascade
    on delete restrict,
  constraint reviews_cycle_fk
    foreign key (cycle_id) references review_cycles (id)
    on update cascade
    on delete restrict
);

-- Outcome per goal, attached to a review (not to the goal row itself).
create table if not exists goal_ratings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  goal_id uuid not null,
  self_comment text,
  self_rating numeric(3, 2),
  manager_comment text,
  manager_rating numeric(3, 2),
  created_at timestamptz not null default now(),
  constraint goal_ratings_self_chk check (
    self_rating is null or (self_rating >= 1 and self_rating <= 5)
  ),
  constraint goal_ratings_manager_chk check (
    manager_rating is null or (manager_rating >= 1 and manager_rating <= 5)
  ),
  constraint goal_ratings_one_per_goal_review unique (review_id, goal_id),
  constraint goal_ratings_review_fk
    foreign key (review_id) references reviews (id)
    on update cascade
    on delete cascade,
  constraint goal_ratings_goal_fk
    foreign key (goal_id) references goals (id)
    on update cascade
    on delete restrict
);

create index if not exists employees_manager_id_idx on employees (manager_id);
create index if not exists employees_role_idx on employees (role);
create index if not exists review_cycles_created_by_idx on review_cycles (created_by);
create index if not exists goals_employee_id_idx on goals (employee_id);
create index if not exists goals_cycle_id_idx on goals (cycle_id);
create index if not exists reviews_employee_id_idx on reviews (employee_id);
create index if not exists reviews_manager_id_idx on reviews (manager_id);
create index if not exists reviews_cycle_id_idx on reviews (cycle_id);
create index if not exists goal_ratings_review_id_idx on goal_ratings (review_id);
create index if not exists goal_ratings_goal_id_idx on goal_ratings (goal_id);

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table employees, review_cycles, goals, reviews, goal_ratings
  to anon, authenticated, service_role;

notify pgrst, 'reload schema';

insert into employees (full_name, email, designation, department, date_of_joining, role)
values
  ('Asha Rao', 'employee@helix.consulting', 'Consultant', 'Delivery', '2023-04-01', 'employee'),
  ('Vikram Shah', 'manager@helix.consulting', 'Engagement Manager', 'Delivery', '2019-08-12', 'manager'),
  ('Meera Iyer', 'hr@helix.consulting', 'HR Business Partner', 'People', '2018-01-15', 'hr_admin')
on conflict (email) do nothing;

update employees e
set manager_id = m.id
from employees m
where e.email = 'employee@helix.consulting'
  and m.email = 'manager@helix.consulting'
  and e.manager_id is null;
