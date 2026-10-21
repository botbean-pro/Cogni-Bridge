-- Daily Cogni-Flow token usage per user. Written only through record_ai_usage(),
-- which /api/chat calls with the signed-in user's own token.
create table public.ai_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  usage_date date not null default current_date,
  tokens integer not null default 0 check (tokens >= 0),
  primary key (user_id, usage_date)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public, anon, authenticated;

create function public.ai_tokens_used_today()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select tokens from public.ai_usage where user_id = (select auth.uid()) and usage_date = current_date),
    0
  );
$$;

-- Only ever adds usage, so a student calling it directly can't reset their own limit.
create function public.record_ai_usage(p_tokens integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in';
  end if;
  if p_tokens is null or p_tokens <= 0 then
    return public.ai_tokens_used_today();
  end if;

  insert into public.ai_usage (user_id, usage_date, tokens)
  values ((select auth.uid()), current_date, least(p_tokens, 1000000))
  on conflict (user_id, usage_date)
  do update set tokens = public.ai_usage.tokens + excluded.tokens
  returning tokens into total;
  return total;
end;
$$;

revoke all on function public.ai_tokens_used_today() from public, anon;
revoke all on function public.record_ai_usage(integer) from public, anon;
grant execute on function public.ai_tokens_used_today() to authenticated;
grant execute on function public.record_ai_usage(integer) to authenticated;
