begin;
create table public.game_admins(user_id uuid primary key references auth.users on delete cascade,created_at timestamptz not null default now());
create table public.admin_owner_unlock(singleton boolean primary key default true check(singleton),secret_hash text not null,claimed_by uuid references auth.users,claimed_at timestamptz);
create table public.admin_card_drafts(code text primary key,data jsonb not null,version integer not null default 1,archived boolean not null default false,updated_by uuid not null references auth.users,updated_at timestamptz not null default now());
create table public.admin_requests(user_id uuid not null references auth.users on delete cascade,request_id uuid not null,body jsonb not null,response jsonb not null,created_at timestamptz not null default now(),primary key(user_id,request_id));
create table public.store_promo_rewards(code text not null references public.promocode(code) on delete cascade,card_id text not null references public.store_catalog(id),quantity integer not null check(quantity between 1 and 100),primary key(code,card_id));
create index store_promo_rewards_card on public.store_promo_rewards(card_id);
create index admin_card_drafts_author on public.admin_card_drafts(updated_by);
create index admin_owner_unlock_claimant on public.admin_owner_unlock(claimed_by);
alter table public.promocode add column admin_version integer not null default 0;
alter table public.game_admins enable row level security;
alter table public.admin_owner_unlock enable row level security;
alter table public.admin_card_drafts enable row level security;
alter table public.admin_requests enable row level security;
alter table public.store_promo_rewards enable row level security;
revoke all on public.game_admins,public.admin_owner_unlock,public.admin_card_drafts,public.admin_requests,public.store_promo_rewards from public,anon,authenticated;
grant all on public.game_admins,public.admin_owner_unlock,public.admin_card_drafts,public.admin_requests,public.store_promo_rewards to service_role;
-- Old profile roles must not be a path to editing the economy or cards.
revoke all on public.promocode,public.promocode_reward from public,anon,authenticated;
revoke insert,update,delete on public.card,public.userprofile from public,anon,authenticated;
grant all on public.promocode,public.promocode_reward to service_role;

create function public.admin_unlock(p_actor uuid,p_code text) returns boolean language plpgsql security invoker set search_path='' as $$
declare config public.admin_owner_unlock;
begin
 select * into config from public.admin_owner_unlock where singleton;
 if not found or extensions.crypt(upper(trim(p_code)),config.secret_hash)<>config.secret_hash then return false;end if;
 select * into config from public.admin_owner_unlock where singleton for update;
 if config.claimed_by is not null and config.claimed_by<>p_actor then raise exception 'This owner unlock has already been used.';end if;
 insert into public.game_admins(user_id) values(p_actor) on conflict do nothing;
 update public.admin_owner_unlock set claimed_by=p_actor,claimed_at=coalesce(claimed_at,now()) where singleton;
 return true;
end $$;

create function public.admin_request(p_actor uuid,p_body jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare op text:=p_body->>'op'; payload jsonb:=p_body->'data'; key text; req uuid; prior public.admin_requests; output jsonb;
 draft public.admin_card_drafts; promo public.promocode; reward jsonb; count_rewards integer:=0; expected integer;
begin
 if not exists(select 1 from public.game_admins where user_id=p_actor) then raise exception 'Admin access required.';end if;
 if op='list' then
  return jsonb_build_object('drafts',(select coalesce(jsonb_agg(to_jsonb(d) order by updated_at desc),'[]') from public.admin_card_drafts d),
   'promos',(select coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('rewards',coalesce((select jsonb_agg(jsonb_build_object('card_id',r.card_id,'quantity',r.quantity)) from public.store_promo_rewards r where r.code=p.code),
    (select jsonb_agg(jsonb_build_object('card_id',l.card_id,'quantity',r.quantity)) from (
      select card_code,quantity from public.promocode_reward where code=p.code
      union all select value,1 from jsonb_array_elements_text(coalesce(p.card_ids,'[]')) where not exists(select 1 from public.promocode_reward where code=p.code)
     ) r left join public.store_legacy_cards l on l.legacy_id=r.card_code),'[]')) order by p.created_date desc),'[]') from public.promocode p),
   'catalog',(select coalesce(jsonb_agg(to_jsonb(c) order by name),'[]') from public.store_catalog c));
 end if;
 req:=(p_body->>'requestId')::uuid;
 if req is null then raise exception 'Request ID required.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,2));
 select * into prior from public.admin_requests where user_id=p_actor and request_id=req;
 if found then if prior.body<>p_body then raise exception 'Request ID conflict.';end if;return prior.response;end if;
 key:=upper(trim(payload->>'code'));expected:=(p_body->>'version')::integer;
 if key is null or key!~'^[A-Z0-9_-]{2,64}$' or expected is null then raise exception 'Use a code of 2–64 letters, numbers, underscores or dashes.';end if;
 if op='save_card' then
  if coalesce(length(trim(payload->>'name')),0) not between 1 and 100 or coalesce(payload->>'card_type','') not in ('creature','controller','spell','artifact','token') or coalesce(payload->>'element','') not in ('fire','water','earth','wind','cryo','blood','light','shadow','electric','neutral','universal','hybrid') or coalesce(payload->>'rarity','') not in ('common','uncommon','rare','epic','legendary') then raise exception 'Complete the card name, type, element and rarity.';end if;
  if coalesce((payload->>'cost')::integer,-1) not between 0 and 100 or coalesce((payload->>'ap')::integer,-1) not between 0 and 999 or coalesce((payload->>'ch')::integer,-1) not between 0 and 999 or coalesce(length(payload->>'description'),0)>4000 or coalesce(length(payload->>'art_url'),0)>2000 then raise exception 'Invalid card stats or text.';end if;
  if coalesce(payload->>'art_url','')<>'' and payload->>'art_url'!~'^https://' then raise exception 'Artwork must use an HTTPS URL.';end if;
  if jsonb_typeof(payload->'abilities') is distinct from 'array' or jsonb_array_length(payload->'abilities')>20 or jsonb_typeof(payload->'keywords') is distinct from 'array' then raise exception 'Invalid card abilities.';end if;
  perform pg_advisory_xact_lock(hashtextextended(key,3));
  select * into draft from public.admin_card_drafts where code=key for update;
  if (found and draft.version<>expected) or (not found and expected<>0) then raise exception 'This draft changed. Reload before saving.';end if;
  insert into public.admin_card_drafts(code,data,updated_by) values(key,payload||jsonb_build_object('code',key),p_actor)
  on conflict(code) do update set data=excluded.data,version=admin_card_drafts.version+1,archived=false,updated_by=p_actor,updated_at=now() returning to_jsonb(admin_card_drafts.*) into output;
 elsif op='archive_card' then
  update public.admin_card_drafts set archived=true,version=version+1,updated_by=p_actor,updated_at=now() where code=key and version=expected returning to_jsonb(admin_card_drafts.*) into output;
  if not found then raise exception 'This draft changed. Reload before archiving.';end if;
 elsif op='save_promo' then
  if exists(select 1 from public.admin_owner_unlock where extensions.crypt(key,secret_hash)=secret_hash) then raise exception 'That code is reserved.';end if;
  if coalesce((payload->>'tokens')::integer,-1) not between 0 and 1000000 or coalesce((payload->>'max_uses')::integer,0) not between 1 and 1000000 or jsonb_typeof(payload->'rewards') is distinct from 'array' or jsonb_array_length(payload->'rewards')>50 or coalesce(length(payload->>'description'),0)>1000 or jsonb_typeof(payload->'is_active') is distinct from 'boolean' then raise exception 'Invalid promo values.';end if;
  for reward in select value from jsonb_array_elements(payload->'rewards') loop
   if not exists(select 1 from public.store_catalog where id=reward->>'card_id') or coalesce((reward->>'quantity')::integer,0) not between 1 and 100 then raise exception 'Choose current cards and quantities from 1 to 100.';end if;
   count_rewards:=count_rewards+(reward->>'quantity')::integer;
  end loop;
  if count_rewards>100 or (count_rewards=0 and (payload->>'tokens')::integer=0) then raise exception 'Give 1–100 total cards or a token reward.';end if;
  perform pg_advisory_xact_lock(hashtextextended(key,4));
  select * into promo from public.promocode where code=key for update;
  if (found and promo.admin_version<>expected) or (not found and expected<>-1) then raise exception 'This promo changed or the code is already taken. Reload before saving.';end if;
  if (payload->>'max_uses')::integer<coalesce(promo.current_uses,0) then raise exception 'Maximum uses cannot be below existing redemptions.';end if;
  insert into public.promocode(code,tokens,max_uses,current_uses,is_active,expires_at,description,card_ids,created_date,updated_date,created_by,admin_version)
  values(key,(payload->>'tokens')::integer,(payload->>'max_uses')::integer,0,(payload->>'is_active')::boolean,nullif(payload->>'expires_at','')::timestamptz,payload->>'description','[]',now(),now(),p_actor::text,1)
  on conflict(code) do update set tokens=excluded.tokens,max_uses=excluded.max_uses,is_active=excluded.is_active,expires_at=excluded.expires_at,description=excluded.description,card_ids='[]',updated_date=now(),admin_version=promocode.admin_version+1;
  delete from public.store_promo_rewards where code=key;
  delete from public.promocode_reward where code=key;
  insert into public.store_promo_rewards(code,card_id,quantity) select key,value->>'card_id',sum((value->>'quantity')::integer) from jsonb_array_elements(payload->'rewards') group by value->>'card_id';
  output:=jsonb_build_object('code',key,'saved',true);
 else raise exception 'Unknown admin operation.';
 end if;
 insert into public.admin_requests(user_id,request_id,body,response) values(p_actor,req,p_body,output);
 return output;
end $$;
revoke all on function public.admin_unlock(uuid,text),public.admin_request(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.admin_unlock(uuid,text),public.admin_request(uuid,jsonb) to service_role;
commit;
