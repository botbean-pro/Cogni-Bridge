-- Cogni Points wallet, reward catalog, subscription entitlements and workshop reservations.
-- Default award: 10 points for a session whose attendance is recorded after its end.
-- Configure workshops by setting sessions.is_cogni_workshop=true and reward_points.

alter table public.sessions
  add column if not exists is_cogni_workshop boolean not null default false,
  add column if not exists reward_points integer check (reward_points is null or reward_points > 0),
  add column if not exists max_attendees integer check (max_attendees is null or max_attendees > 0);

create table public.cogni_reward_settings (
  id boolean primary key default true check (id),
  session_completion_points integer not null default 10 check (session_completion_points >= 0),
  updated_at timestamptz not null default now()
);
insert into public.cogni_reward_settings (id) values (true) on conflict (id) do nothing;

create table public.cogni_rewards (
  id uuid primary key default gen_random_uuid(),
  reward_key text not null unique check (char_length(reward_key) between 1 and 80),
  reward_type text not null check (reward_type = 'subscription'),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  points_cost integer not null check (points_cost > 0),
  duration_days integer not null check (duration_days > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.cogni_rewards (reward_key, reward_type, title, description, points_cost, duration_days)
values
  ('premium-7-days', 'subscription', '7-day Premium access', 'Unlock the existing Premium Flow subscription entitlement for seven days.', 500, 7),
  ('premium-30-days', 'subscription', '30-day Premium access', 'Unlock the existing Premium Flow subscription entitlement for thirty days.', 1500, 30)
on conflict (reward_key) do nothing;

create table public.cogni_wallets (
  student_id uuid primary key references public.profiles(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  total_earned integer not null default 0 check (total_earned >= 0),
  total_redeemed integer not null default 0 check (total_redeemed >= 0),
  updated_at timestamptz not null default now()
);

create table public.cogni_redemptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid references public.cogni_rewards(id) on delete restrict,
  session_id uuid references public.sessions(id) on delete restrict,
  request_id uuid not null,
  points_cost integer not null check (points_cost > 0),
  reward_title text not null,
  status text not null default 'issued' check (status in ('issued', 'enrolled')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  unique (student_id, request_id),
  check ((reward_id is not null) <> (session_id is not null))
);
create unique index cogni_redemptions_workshop_once
  on public.cogni_redemptions(student_id, session_id) where session_id is not null;
create index cogni_redemptions_student_recent on public.cogni_redemptions(student_id, issued_at desc);

create table public.cogni_point_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null check (points <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason text not null check (char_length(reason) between 1 and 180),
  source_key text not null,
  redemption_id uuid references public.cogni_redemptions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (student_id, source_key)
);
create index cogni_point_transactions_student_recent on public.cogni_point_transactions(student_id, created_at desc);

create table public.cogni_entitlements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  redemption_id uuid not null unique references public.cogni_redemptions(id) on delete cascade,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (expires_at > starts_at)
);
create index cogni_entitlements_student_expiry on public.cogni_entitlements(student_id, expires_at desc);

alter table public.cogni_rewards enable row level security;
alter table public.cogni_wallets enable row level security;
alter table public.cogni_redemptions enable row level security;
alter table public.cogni_point_transactions enable row level security;
alter table public.cogni_entitlements enable row level security;

create policy "Students can read enabled Cogni rewards" on public.cogni_rewards
  for select to authenticated using (enabled);
create policy "Students can read own Cogni redemptions" on public.cogni_redemptions
  for select to authenticated using (student_id = (select auth.uid()));
create policy "Students can read own Cogni transactions" on public.cogni_point_transactions
  for select to authenticated using (student_id = (select auth.uid()));
create policy "Students can read own Cogni entitlements" on public.cogni_entitlements
  for select to authenticated using (student_id = (select auth.uid()));

revoke all on public.cogni_reward_settings, public.cogni_wallets from public, anon, authenticated;
revoke insert, update, delete on public.cogni_rewards, public.cogni_redemptions,
  public.cogni_point_transactions, public.cogni_entitlements from public, anon, authenticated;
grant select on public.cogni_rewards, public.cogni_redemptions,
  public.cogni_point_transactions, public.cogni_entitlements to authenticated;

create function public.initialize_cogni_wallet()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'student' then
    insert into public.cogni_wallets(student_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger profiles_initialize_cogni_wallet after insert on public.profiles
  for each row execute function public.initialize_cogni_wallet();
insert into public.cogni_wallets(student_id)
  select id from public.profiles where role = 'student' on conflict do nothing;

-- Carry existing recorded completions into the wallet once, so the migration does
-- not erase progress students already recorded before rewards were introduced.
with existing_completions as (
  select registration.student_id, session.id as session_id, session.title, registration.attended_at,
    settings.session_completion_points as points,
    row_number() over (partition by registration.student_id order by registration.attended_at, session.id)::integer as completion_number
  from public.session_registrations registration
  join public.sessions session on session.id = registration.session_id
  cross join public.cogni_reward_settings settings
  where registration.attended_at is not null and settings.id
)
insert into public.cogni_point_transactions(student_id, points, balance_after, reason, source_key, created_at)
select student_id, points, completion_number * points, left('Completed: ' || title, 180),
  'session:' || session_id::text, attended_at
from existing_completions
where points > 0
on conflict (student_id, source_key) do nothing;

update public.cogni_wallets wallet set
  balance = totals.balance,
  total_earned = totals.earned,
  total_redeemed = totals.redeemed,
  updated_at = now()
from (
  select student_id,
    coalesce(sum(points), 0)::integer as balance,
    coalesce(sum(points) filter (where points > 0), 0)::integer as earned,
    coalesce(-sum(points) filter (where points < 0), 0)::integer as redeemed
  from public.cogni_point_transactions group by student_id
) totals where wallet.student_id = totals.student_id;

-- Apply the same seat limit to normal session registrations and reward bookings.
create or replace function public.register_for_session(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  current_session public.sessions%rowtype;
begin
  if uid is null or not exists (select 1 from public.profiles p where p.id = uid and p.role = 'student') then
    raise exception 'Only students can register for sessions';
  end if;
  select * into current_session from public.sessions where id = p_session_id for update;
  if not found then raise exception 'Session not found'; end if;
  if current_session.max_attendees is not null and current_session.attendees >= current_session.max_attendees then
    raise exception 'This session is full';
  end if;
  insert into public.session_registrations(student_id, session_id)
    values (uid, p_session_id) on conflict (student_id, session_id) do nothing;
  if not found then return false; end if;
  update public.sessions set attendees = attendees + 1 where id = p_session_id;
  return true;
end;
$$;

create function public.get_cogni_wallet()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
  uid uuid := (select auth.uid());
begin
  if uid is null or not exists (select 1 from public.profiles p where p.id = uid and p.role = 'student') then
    raise exception 'A signed-in student account is required';
  end if;
  select jsonb_build_object(
    'balance', w.balance,
    'total_earned', w.total_earned,
    'total_redeemed', w.total_redeemed,
    'transactions', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.id, 'points', t.points, 'balance_after', t.balance_after,
        'reason', t.reason, 'created_at', t.created_at) order by t.created_at desc)
      from (select * from public.cogni_point_transactions where student_id = uid order by created_at desc limit 20) t
    ), '[]'::jsonb),
    'redemptions', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'title', r.reward_title, 'status', r.status,
        'issued_at', r.issued_at, 'expires_at', r.expires_at) order by r.issued_at desc)
      from (select * from public.cogni_redemptions where student_id = uid order by issued_at desc limit 20) r
    ), '[]'::jsonb),
    'premium_expires_at', (select max(e.expires_at) from public.cogni_entitlements e where e.student_id = uid and e.expires_at > now())
  ) into result from public.cogni_wallets w where w.student_id = uid;
  return coalesce(result, jsonb_build_object('balance', 0, 'total_earned', 0, 'total_redeemed', 0,
    'transactions', '[]'::jsonb, 'redemptions', '[]'::jsonb, 'premium_expires_at', null));
end;
$$;

create function public.redeem_cogni_reward(p_reward_id uuid, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  reward public.cogni_rewards%rowtype;
  workshop public.sessions%rowtype;
  wallet public.cogni_wallets%rowtype;
  redemption public.cogni_redemptions%rowtype;
  cost integer;
  label text;
  starts timestamptz;
  expires timestamptz;
begin
  if uid is null or not exists (select 1 from public.profiles p where p.id = uid and p.role = 'student') then
    raise exception 'A signed-in student account is required';
  end if;
  if p_reward_id is null or p_request_id is null then raise exception 'A reward and request id are required'; end if;

  select * into redemption from public.cogni_redemptions where student_id = uid and request_id = p_request_id;
  if found then return jsonb_build_object('redemption_id', redemption.id, 'status', redemption.status, 'expires_at', redemption.expires_at, 'duplicate_request', true); end if;

  select * into reward from public.cogni_rewards where id = p_reward_id and enabled and reward_type = 'subscription' for share;
  if found then
    cost := reward.points_cost;
    label := reward.title;
  else
    select * into workshop from public.sessions where id = p_reward_id and is_cogni_workshop for update;
    if not found then raise exception 'This reward is unavailable'; end if;
    if ((workshop.session_date + workshop.end_time::time) at time zone 'Asia/Kolkata') <= now() then raise exception 'This workshop has ended'; end if;
    if workshop.reward_points is null or workshop.reward_points <= 0 then raise exception 'This workshop is not configured for points redemption'; end if;
    if workshop.max_attendees is not null and workshop.attendees >= workshop.max_attendees then raise exception 'This workshop is full'; end if;
    if exists (select 1 from public.session_registrations where student_id = uid and session_id = workshop.id) then raise exception 'You are already enrolled in this workshop'; end if;
    cost := workshop.reward_points;
    label := workshop.title;
  end if;

  insert into public.cogni_wallets(student_id) values (uid) on conflict do nothing;
  select * into wallet from public.cogni_wallets where student_id = uid for update;
  if wallet.balance < cost then raise exception 'Insufficient Cogni Points'; end if;

  if reward.id is not null then
    select greatest(now(), coalesce(max(expires_at), now())) into starts
      from public.cogni_entitlements where student_id = uid;
    expires := starts + make_interval(days => reward.duration_days);
    insert into public.cogni_redemptions(student_id, reward_id, request_id, points_cost, reward_title, status, expires_at)
      values (uid, reward.id, p_request_id, cost, label, 'issued', expires) returning * into redemption;
    insert into public.cogni_entitlements(student_id, redemption_id, starts_at, expires_at)
      values (uid, redemption.id, starts, expires);
  else
    insert into public.cogni_redemptions(student_id, session_id, request_id, points_cost, reward_title, status)
      values (uid, workshop.id, p_request_id, cost, label, 'enrolled') returning * into redemption;
    insert into public.session_registrations(student_id, session_id, registered_at)
      values (uid, workshop.id, now());
    update public.sessions set attendees = attendees + 1 where id = workshop.id;
  end if;

  update public.cogni_wallets set balance = balance - cost,
    total_redeemed = total_redeemed + cost, updated_at = now() where student_id = uid returning * into wallet;
  insert into public.cogni_point_transactions(student_id, points, balance_after, reason, source_key, redemption_id)
      values (uid, -cost, wallet.balance, left('Redeemed: ' || label, 180), 'redemption:' || redemption.id::text, redemption.id);
  return jsonb_build_object('redemption_id', redemption.id, 'status', redemption.status,
    'expires_at', redemption.expires_at, 'balance', wallet.balance, 'duplicate_request', false);
end;
$$;

-- Only a server-validated, completed session awards points; repeat attendance cannot award twice.
create or replace function public.mark_session_attended(p_session_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  session_ends_at timestamptz;
  session_title text;
  award integer;
  wallet public.cogni_wallets%rowtype;
begin
  if uid is null or not exists (select 1 from public.profiles p where p.id = uid and p.role = 'student') then
    raise exception 'Only students can record attendance';
  end if;
  select (s.session_date + s.end_time::time) at time zone 'Asia/Kolkata', s.title
    into session_ends_at, session_title from public.sessions s where s.id = p_session_id;
  if session_ends_at is null then raise exception 'Session not found'; end if;
  if session_ends_at > now() then raise exception 'This session has not finished yet'; end if;
  if not exists (select 1 from public.session_registrations registration
    where registration.student_id = uid and registration.session_id = p_session_id
      and registration.registered_at <= session_ends_at) then
    raise exception 'Register for the session before it ends to record completion';
  end if;
  update public.session_registrations set attended_at = now()
    where student_id = uid and session_id = p_session_id and attended_at is null;
  if not found then return false; end if;

  select session_completion_points into award from public.cogni_reward_settings where id;
  award := coalesce(award, 10);
  if award > 0 then
    insert into public.cogni_wallets(student_id) values (uid) on conflict do nothing;
    select * into wallet from public.cogni_wallets where student_id = uid for update;
    update public.cogni_wallets set balance = balance + award, total_earned = total_earned + award, updated_at = now()
      where student_id = uid returning * into wallet;
    insert into public.cogni_point_transactions(student_id, points, balance_after, reason, source_key)
      values (uid, award, wallet.balance, left('Completed: ' || session_title, 180), 'session:' || p_session_id::text);
  end if;
  return true;
end;
$$;

revoke all on function public.initialize_cogni_wallet() from public, anon, authenticated;
revoke all on function public.get_cogni_wallet() from public, anon;
revoke all on function public.redeem_cogni_reward(uuid, uuid) from public, anon;
revoke all on function public.mark_session_attended(uuid) from public, anon;
grant execute on function public.get_cogni_wallet() to authenticated;
grant execute on function public.redeem_cogni_reward(uuid, uuid) to authenticated;
grant execute on function public.mark_session_attended(uuid) to authenticated;
grant execute on function public.register_for_session(uuid) to authenticated;
