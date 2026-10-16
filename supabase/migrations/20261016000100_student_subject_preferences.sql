alter table public.profiles
  add column preferred_subjects text[] not null default '{}';

grant update (preferred_subjects) on public.profiles to authenticated;
