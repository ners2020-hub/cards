begin;
-- Authoritative state is service-role only, even though the Data API schema is public.
create table public.mp_matches (
  id uuid primary key, host_id uuid not null references auth.users(id), guest_id uuid references auth.users(id),
  invite_hash text not null unique, host_deck jsonb not null, guest_deck jsonb,
  balance_version text not null, version integer not null default 0,
  status text not null default 'waiting' check(status in ('waiting','active','finished')),
  state jsonb, history jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (guest_id is null or guest_id <> host_id)
);
create table public.mp_memberships (
  match_id uuid references public.mp_matches(id) on delete cascade,
  user_id uuid references auth.users(id), primary key(match_id,user_id)
);
create table public.mp_actions (
  match_id uuid references public.mp_matches(id) on delete cascade,
  actor_id uuid not null references auth.users(id), action_id uuid not null,
  fingerprint text not null, version integer not null,
  primary key(match_id,actor_id,action_id)
);
create table public.mp_reports (
  id uuid primary key, match_id uuid not null references public.mp_matches(id),
  actor_id uuid not null references auth.users(id), description text not null check(length(description) between 1 and 2000),
  version integer not null, balance_version text not null, history jsonb not null, created_at timestamptz not null default now()
);
create index mp_matches_host_updated on public.mp_matches(host_id,updated_at desc);
create index mp_matches_guest_updated on public.mp_matches(guest_id,updated_at desc);
create index mp_memberships_user on public.mp_memberships(user_id,match_id);
create index mp_actions_actor on public.mp_actions(actor_id);
create index mp_reports_actor on public.mp_reports(actor_id);
create index mp_reports_match on public.mp_reports(match_id);
alter table public.mp_matches enable row level security;
alter table public.mp_memberships enable row level security;
alter table public.mp_actions enable row level security;
alter table public.mp_reports enable row level security;
revoke all on public.mp_matches, public.mp_memberships, public.mp_actions, public.mp_reports from public, anon, authenticated;
grant all on public.mp_matches, public.mp_memberships, public.mp_actions, public.mp_reports to service_role;
grant select on public.mp_memberships to authenticated;
create policy mp_own_membership on public.mp_memberships for select to authenticated using (user_id = (select auth.uid()));
create policy mp_receive on realtime.messages for select to authenticated using (
  extension in ('broadcast','presence') and exists(select 1 from public.mp_memberships m where m.user_id=(select auth.uid()) and 'match:' || m.match_id::text = (select realtime.topic()))
);
create policy mp_presence on realtime.messages for insert to authenticated with check (
  extension = 'presence' and exists(select 1 from public.mp_memberships m where m.user_id=(select auth.uid()) and 'match:' || m.match_id::text = (select realtime.topic()))
);

create function public.mp_create(p_id uuid, p_actor uuid, p_hash text, p_deck jsonb, p_balance text)
returns uuid language plpgsql security invoker set search_path = '' as $$
begin
  -- Serialize room creation per account and bound abandoned rooms.
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text, 0));
  if exists(select 1 from public.mp_matches where id=p_id and host_id=p_actor) then return p_id; end if;
  if (select count(*) from public.mp_matches where host_id=p_actor and status='waiting' and created_at > now()-interval '24 hours') >= 10 then raise exception 'Room limit reached'; end if;
  insert into public.mp_matches(id,host_id,invite_hash,host_deck,balance_version) values(p_id,p_actor,p_hash,p_deck,p_balance);
  insert into public.mp_memberships values(p_id,p_actor);
  return p_id;
end $$;

create function public.mp_join(p_id uuid, p_actor uuid, p_hash text, p_deck jsonb, p_state jsonb, p_balance text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare r public.mp_matches;
begin
  select * into r from public.mp_matches where id=p_id and invite_hash=p_hash for update;
  if not found then raise exception 'Invite unavailable'; end if;
  if r.guest_id=p_actor then return r.id; end if;
  if r.host_id=p_actor or r.guest_id is not null or r.status<>'waiting' or r.created_at < now()-interval '24 hours' or r.balance_version<>p_balance then raise exception 'Invite unavailable'; end if;
  update public.mp_matches set guest_id=p_actor,guest_deck=p_deck,state=p_state,status='active',version=1,updated_at=now() where id=r.id;
  insert into public.mp_memberships values(r.id,p_actor);
  perform realtime.send(jsonb_build_object('version',1),'changed','match:'||r.id::text,true);
  return r.id;
end $$;

create function public.mp_commit(p_id uuid, p_actor uuid, p_action uuid, p_fingerprint text, p_expected integer, p_state jsonb, p_event jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare r public.mp_matches; prior public.mp_actions; next_version integer;
begin
  select * into r from public.mp_matches where id=p_id for update;
  if not found or (r.host_id<>p_actor and r.guest_id is distinct from p_actor) then raise exception 'Match unavailable'; end if;
  select * into prior from public.mp_actions where match_id=p_id and actor_id=p_actor and action_id=p_action;
  if found then
    if prior.fingerprint<>p_fingerprint then raise exception 'Action ID conflict'; end if;
    return prior.version;
  end if;
  if r.version<>p_expected or r.status<>'active' then raise exception 'Stale match'; end if;
  next_version := r.version+1;
  update public.mp_matches set state=p_state,version=next_version,status=case when p_state ? 'finished' then 'finished' else 'active' end,
    history=r.history || jsonb_build_array(p_event || jsonb_build_object('version',next_version)),updated_at=now() where id=p_id;
  insert into public.mp_actions values(p_id,p_actor,p_action,p_fingerprint,next_version);
  perform realtime.send(jsonb_build_object('version',next_version),'changed','match:'||p_id::text,true);
  return next_version;
end $$;
revoke all on function public.mp_create(uuid,uuid,text,jsonb,text), public.mp_join(uuid,uuid,text,jsonb,jsonb,text), public.mp_commit(uuid,uuid,uuid,text,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.mp_create(uuid,uuid,text,jsonb,text), public.mp_join(uuid,uuid,text,jsonb,jsonb,text), public.mp_commit(uuid,uuid,uuid,text,integer,jsonb,jsonb) to service_role;
commit;
