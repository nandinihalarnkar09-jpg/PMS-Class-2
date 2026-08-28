-- Helix PMS Row Level Security
-- Run in: Dashboard → SQL Editor → New query
-- Safe to re-run (drops and recreates policies).
--
-- Identity: auth.uid() must equal employees.clerk_user_id.
-- If you use Clerk, configure Supabase third-party Auth / a JWT
-- whose `sub` is the Clerk user id, then send that JWT on PostgREST calls.
-- The Next.js server client that uses SUPABASE_SECRET_KEY bypasses RLS
-- (service role). These policies apply to anon/authenticated keys.

create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.id
  from public.employees e
  where e.clerk_user_id is not null
    and e.clerk_user_id = auth.uid()::text
  limit 1;
$$;

create or replace function public.current_employee_role()
returns public.pms_role
language sql
stable
security definer
set search_path = public
as $$
  select e.role
  from public.employees e
  where e.id = public.current_employee_id();
$$;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_employee_role() = 'hr_admin';
$$;

create or replace function public.my_manager_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.manager_id
  from public.employees e
  where e.id = public.current_employee_id();
$$;

create or replace function public.is_direct_report(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = target_employee_id
      and e.manager_id = public.current_employee_id()
  );
$$;

create or replace function public.can_select_person_data(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_hr_admin()
    or target_employee_id = public.current_employee_id()
    or public.is_direct_report(target_employee_id);
$$;

create or replace function public.can_write_person_data(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_hr_admin()
    or target_employee_id = public.current_employee_id();
$$;

grant execute on function public.current_employee_id() to authenticated;
grant execute on function public.current_employee_role() to authenticated;
grant execute on function public.is_hr_admin() to authenticated;
grant execute on function public.my_manager_id() to authenticated;
grant execute on function public.is_direct_report(uuid) to authenticated;
grant execute on function public.can_select_person_data(uuid) to authenticated;
grant execute on function public.can_write_person_data(uuid) to authenticated;

-- Turn RLS on (no-op if already on).
alter table public.employees enable row level security;
alter table public.review_cycles enable row level security;
alter table public.goals enable row level security;
alter table public.reviews enable row level security;
alter table public.goal_ratings enable row level security;

-- employees
drop policy if exists employees_select on public.employees;
drop policy if exists employees_insert_hr on public.employees;
drop policy if exists employees_update_hr on public.employees;

create policy employees_select
  on public.employees
  for select
  to authenticated
  using (
    public.is_hr_admin()
    or id = public.current_employee_id()
    or id = public.my_manager_id()
  );

create policy employees_insert_hr
  on public.employees
  for insert
  to authenticated
  with check (public.is_hr_admin());

create policy employees_update_hr
  on public.employees
  for update
  to authenticated
  using (public.is_hr_admin())
  with check (public.is_hr_admin());

-- review_cycles
drop policy if exists review_cycles_select on public.review_cycles;
drop policy if exists review_cycles_insert_hr on public.review_cycles;
drop policy if exists review_cycles_update_hr on public.review_cycles;

create policy review_cycles_select
  on public.review_cycles
  for select
  to authenticated
  using (true);

create policy review_cycles_insert_hr
  on public.review_cycles
  for insert
  to authenticated
  with check (public.is_hr_admin());

create policy review_cycles_update_hr
  on public.review_cycles
  for update
  to authenticated
  using (public.is_hr_admin())
  with check (public.is_hr_admin());

-- goals
drop policy if exists goals_select on public.goals;
drop policy if exists goals_insert_own on public.goals;
drop policy if exists goals_update_own on public.goals;

create policy goals_select
  on public.goals
  for select
  to authenticated
  using (public.can_select_person_data(employee_id));

create policy goals_insert_own
  on public.goals
  for insert
  to authenticated
  with check (public.can_write_person_data(employee_id));

create policy goals_update_own
  on public.goals
  for update
  to authenticated
  using (public.can_write_person_data(employee_id))
  with check (public.can_write_person_data(employee_id));

-- reviews
drop policy if exists reviews_select on public.reviews;
drop policy if exists reviews_insert_own on public.reviews;
drop policy if exists reviews_update_own on public.reviews;

create policy reviews_select
  on public.reviews
  for select
  to authenticated
  using (public.can_select_person_data(employee_id));

create policy reviews_insert_own
  on public.reviews
  for insert
  to authenticated
  with check (public.can_write_person_data(employee_id));

create policy reviews_update_own
  on public.reviews
  for update
  to authenticated
  using (public.can_write_person_data(employee_id))
  with check (public.can_write_person_data(employee_id));

-- goal_ratings (no employee_id — join through reviews)
drop policy if exists goal_ratings_select on public.goal_ratings;
drop policy if exists goal_ratings_insert_own on public.goal_ratings;
drop policy if exists goal_ratings_update_own on public.goal_ratings;

create policy goal_ratings_select
  on public.goal_ratings
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.reviews r
      where r.id = goal_ratings.review_id
        and public.can_select_person_data(r.employee_id)
    )
  );

create policy goal_ratings_insert_own
  on public.goal_ratings
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.reviews r
      where r.id = goal_ratings.review_id
        and public.can_write_person_data(r.employee_id)
    )
  );

create policy goal_ratings_update_own
  on public.goal_ratings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.reviews r
      where r.id = goal_ratings.review_id
        and public.can_write_person_data(r.employee_id)
    )
  )
  with check (
    exists (
      select 1
      from public.reviews r
      where r.id = goal_ratings.review_id
        and public.can_write_person_data(r.employee_id)
    )
  );

notify pgrst, 'reload schema';
