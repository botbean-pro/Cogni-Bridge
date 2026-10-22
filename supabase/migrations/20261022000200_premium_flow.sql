-- Premium Flow membership, stored server-side so /api/chat can lift the daily Cogni-Flow
-- token limit. Payments are demo-only: activate_demo_premium() grants the plan without
-- charging anything, so replace it with a payment webhook before taking real money.
-- Safe to run more than once.

create table if not exists public.premium_subscriptions (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  plan_id text not null check (plan_id in ('monthly', 'quarterly', 'yearly')),
  payment_type text not null default 'demo' check (payment_type in ('demo')),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.premium_subscriptions enable row level security;

drop policy if exists "Students can read their own premium subscription" on public.premium_subscriptions;
create policy "Students can read their own premium subscription"
on public.premium_subscriptions for select to authenticated
using (student_id = (select auth.uid()));

-- Writes only go through activate_demo_premium().
revoke all on public.premium_subscriptions from public, anon, authenticated;
grant select on public.premium_subscriptions to authenticated;

create or replace function public.activate_demo_premium(p_plan_id text)
returns public.premium_subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  months integer := case p_plan_id when 'monthly' then 1 when 'quarterly' then 3 when 'yearly' then 12 end;
  result public.premium_subscriptions;
begin
  if not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'student') then
    raise exception 'Only students can buy Premium Flow';
  end if;
  if months is null then
    raise exception 'Unknown plan %', p_plan_id;
  end if;

  insert into public.premium_subscriptions (student_id, plan_id, payment_type, purchased_at, expires_at)
  values ((select auth.uid()), p_plan_id, 'demo', now(), now() + make_interval(months => months))
  on conflict (student_id) do update
    set plan_id = excluded.plan_id, payment_type = excluded.payment_type,
        purchased_at = excluded.purchased_at, expires_at = excluded.expires_at
  returning * into result;
  return result;
end;
$$;

create or replace function public.has_active_premium()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.premium_subscriptions
    where student_id = (select auth.uid()) and expires_at > now()
  );
$$;

revoke all on function public.activate_demo_premium(text) from public, anon;
revoke all on function public.has_active_premium() from public, anon;
grant execute on function public.activate_demo_premium(text) to authenticated;
grant execute on function public.has_active_premium() to authenticated;
