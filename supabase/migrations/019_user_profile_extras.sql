-- =========================================================
-- 019_user_profile_extras.sql — Extended profile fields
-- =========================================================

alter table public.profiles
  add column if not exists phone text,
  add column if not exists job_title text,
  add column if not exists department text;

-- Set last_login_at kalau ada (untuk display)
alter table public.profiles
  add column if not exists last_login_at timestamptz;

-- Trigger: update last_login_at saat user login
create or replace function public.update_last_login()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set last_login_at = now()
  where id = auth.uid();
end $$;

-- Grant execute
grant execute on function public.update_last_login() to authenticated;