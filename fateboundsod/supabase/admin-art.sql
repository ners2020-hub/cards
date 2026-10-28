begin;
create table if not exists public.admin_art_jobs (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null,
 status text not null default 'processing' check(status in ('processing','ready','failed')),
 path text,
 error text,
 created_at timestamptz not null default now()
);
create index if not exists admin_art_jobs_user_created on public.admin_art_jobs(user_id,created_at);
create index if not exists admin_art_jobs_created on public.admin_art_jobs(created_at);
alter table public.admin_art_jobs enable row level security;
revoke all on public.admin_art_jobs from public,anon,authenticated;
grant all on public.admin_art_jobs to service_role;

create or replace function public.admin_art_reserve(p_actor uuid,p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare job public.admin_art_jobs;
begin
 if not exists(select 1 from public.game_admins where user_id=p_actor) then raise exception 'Admin access required.'; end if;
 if jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>12000 then raise exception 'Invalid artwork request.'; end if;
 -- Serialize quota checks and reservation across workers, before any paid request.
 perform pg_advisory_xact_lock(781234911);
 select * into job from public.admin_art_jobs where id=p_id;
 if found then
  if job.user_id<>p_actor or job.payload<>p_payload then raise exception 'Artwork request ID conflict.'; end if;
  return jsonb_build_object('run',false,'job',to_jsonb(job));
 end if;
 if exists(select 1 from public.admin_art_jobs where user_id=p_actor and status='processing' and created_at>now()-interval '10 minutes') then raise exception 'An image is already generating. Check its status first.'; end if;
 if (select count(*) from public.admin_art_jobs where user_id=p_actor and created_at>now()-interval '24 hours')>=10 then raise exception 'Your 10 image attempts per 24 hours have been used.'; end if;
 if (select count(*) from public.admin_art_jobs where created_at>now()-interval '24 hours')>=30 then raise exception 'The site image limit has been reached. Try again later.'; end if;
 insert into public.admin_art_jobs(id,user_id,payload) values(p_id,p_actor,p_payload) returning * into job;
 return jsonb_build_object('run',true,'job',to_jsonb(job));
end $$;

create or replace function public.admin_art_status(p_actor uuid,p_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare job public.admin_art_jobs;
begin
 if not exists(select 1 from public.game_admins where user_id=p_actor) then raise exception 'Admin access required.'; end if;
 update public.admin_art_jobs set status='failed',error='Generation did not finish. It may have been billed. Starting again creates a new paid attempt.'
 where id=p_id and user_id=p_actor and status='processing' and created_at<now()-interval '10 minutes';
 select * into job from public.admin_art_jobs where id=p_id and user_id=p_actor;
 if not found then raise exception 'Artwork request not found.'; end if;
 return to_jsonb(job);
end $$;
revoke all on function public.admin_art_reserve(uuid,uuid,jsonb),public.admin_art_status(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_art_reserve(uuid,uuid,jsonb),public.admin_art_status(uuid,uuid) to service_role;
commit;
