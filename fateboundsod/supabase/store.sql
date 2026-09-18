begin;
-- Freeze legacy browser-written balances before importing them into the server-owned store.
revoke all on public.playerprogress from anon,authenticated;
grant select on public.playerprogress to authenticated;
alter table public.promocode_redemption enable row level security;
revoke all on public.promocode_redemption from public,anon,authenticated;
grant all on public.promocode_redemption to service_role;
revoke execute on function public.redeem_promocode(text) from public,anon,authenticated;
create table if not exists public.store_catalog (
 id text primary key, name text not null, element text not null, card_type text not null,
 rarity text not null default 'common' check(rarity in ('common','uncommon','rare','epic','legendary'))
);
create table if not exists public.store_legacy_cards (legacy_id text primary key, card_id text not null references public.store_catalog);
create table if not exists public.store_accounts (
 user_id uuid primary key references auth.users on delete cascade, tokens integer not null check(tokens>=0),
 owned jsonb not null default '{}', unlocked jsonb not null default '["fire","water","earth","wind"]',
 legacy_wins integer not null default 0, legacy_deck_wins jsonb not null default '{}',
 unmapped_legacy jsonb not null default '[]', created_at timestamptz not null default now()
);
create table if not exists public.store_receipts (
 user_id uuid not null references public.store_accounts on delete cascade, request_id uuid not null,
 operation text not null, item text not null, cards jsonb not null, cost integer not null,
 created_at timestamptz not null default now(), primary key(user_id,request_id)
);
create table if not exists public.store_redemptions (
 user_id uuid not null references public.store_accounts on delete cascade, code text not null,
 primary key(user_id,code)
);
alter table public.store_catalog enable row level security;
alter table public.store_legacy_cards enable row level security;
alter table public.store_accounts enable row level security;
alter table public.store_receipts enable row level security;
alter table public.store_redemptions enable row level security;
revoke all on public.store_catalog,public.store_legacy_cards,public.store_accounts,public.store_receipts,public.store_redemptions from public,anon,authenticated;
grant all on public.store_catalog,public.store_legacy_cards,public.store_accounts,public.store_receipts,public.store_redemptions to service_role;

drop function if exists public.store_request(uuid,text,text,uuid);
create or replace function public.store_request(p_actor uuid,p_operation text default 'get',p_item text default '',p_request uuid default null,p_email text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 a public.store_accounts; old public.playerprogress; receipt public.store_receipts; promo public.promocode;
 email text; entry jsonb; cid text; qty integer; owned jsonb:='{}'; unknown_cards jsonb:='[]';
 drawn jsonb:='[]'; price integer:=0; r double precision; picked_rarity text; i integer; requirement text;
 wins integer; deck_wins jsonb; winrow record; result jsonb; normalized text:=upper(trim(p_item));
begin
 email:=p_email; -- Supplied only by the Edge Function after auth.getUser verifies the user.
 if email is null then raise exception 'Sign in to visit the store.'; end if;
 if p_operation not in ('get','pack','unlock','promo') then raise exception 'Unknown store operation.'; end if;
 -- Serialize account creation and every purchase, including requests from multiple tabs.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 select * into a from public.store_accounts where user_id=p_actor for update;
 if not found then
  select * into old from public.playerprogress where user_email=email;
  if found then
   for entry in select value from jsonb_array_elements(coalesce(old.owned_cards,'[]')) loop
    select card_id into cid from public.store_legacy_cards where legacy_id=entry->>'card_id';
    qty:=greatest(0,coalesce((entry->>'quantity')::integer,0));
    if cid is null then unknown_cards:=unknown_cards||jsonb_build_array(entry);
    else owned:=jsonb_set(owned,array[cid],to_jsonb(coalesce((owned->>cid)::integer,0)+qty)); end if;
   end loop;
  else
   for cid in select id from public.store_catalog where element in ('fire','water','earth','wind') and card_type in ('creature','controller') order by id limit 14 loop
    owned:=jsonb_set(owned,array[cid],'2');
   end loop;
  end if;
  insert into public.store_accounts(user_id,tokens,owned,unlocked,legacy_wins,legacy_deck_wins,unmapped_legacy)
  values(p_actor,greatest(0,coalesce(old.tokens,100)),owned,coalesce(old.unlocked_decks,'["fire","water","earth","wind"]'),greatest(0,coalesce(old.total_wins,0)),coalesce(old.deck_wins,'{}'),unknown_cards)
  returning * into a;
 end if;
 wins:=a.legacy_wins; deck_wins:=a.legacy_deck_wins;
 for winrow in select case when host_id=p_actor then host_deck->>'element' else guest_deck->>'element' end element,count(*)::integer n
  from public.mp_matches where status='finished' and ((host_id=p_actor and state->'finished'->>'winner'='playerState') or (guest_id=p_actor and state->'finished'->>'winner'='opponentState')) group by 1 loop
  wins:=wins+winrow.n;
  deck_wins:=jsonb_set(deck_wins,array[winrow.element],to_jsonb(coalesce((deck_wins->>winrow.element)::integer,0)+winrow.n));
 end loop;
 if p_operation<>'get' then
  if p_request is null then raise exception 'A purchase ID is required.'; end if;
  select * into receipt from public.store_receipts where user_id=p_actor and request_id=p_request;
  if found then
   if receipt.operation<>p_operation or receipt.item<>p_item then raise exception 'Purchase ID conflict.'; end if;
   drawn:=receipt.cards; price:=receipt.cost;
  else
   if p_operation='pack' then
    price:=case p_item when 'starter' then 50 when 'premium' then 150 when 'elite' then 300 else null end;
    if price is null then raise exception 'Unknown pack.'; end if;
    if a.tokens<price then raise exception 'Not enough tokens.'; end if;
    for i in 1..5 loop
     r:=random();
     picked_rarity:=case p_item
      when 'starter' then case when r<0.7 then 'common' when r<0.95 then 'uncommon' else 'rare' end
      when 'premium' then case when r<0.4 then 'common' when r<0.75 then 'uncommon' when r<0.95 then 'rare' else 'epic' end
      else case when r<0.2 then 'common' when r<0.5 then 'uncommon' when r<0.8 then 'rare' when r<0.95 then 'epic' else 'legendary' end end;
     select id into cid from public.store_catalog where store_catalog.rarity=picked_rarity order by random() limit 1;
     if cid is null then raise exception 'Pack unavailable. No tokens were spent.'; end if;
     drawn:=drawn||jsonb_build_array(cid);
    end loop;
   elsif p_operation='unlock' then
    if p_item not in ('blood','light','cryo','electric','shadow') then raise exception 'Unknown deck.'; end if;
    if a.unlocked ? p_item then raise exception 'Deck already unlocked.'; end if;
    requirement:=case p_item when 'light' then 'fire' when 'cryo' then 'water' when 'electric' then 'earth' when 'shadow' then 'wind' else null end;
    if (case when requirement is null then wins else coalesce((deck_wins->>requirement)::integer,0) end)<5 then raise exception 'Five qualifying wins are required.'; end if;
    price:=500;
    if a.tokens<price then raise exception 'Not enough tokens.'; end if;
    a.unlocked:=a.unlocked||jsonb_build_array(p_item);
   else
    if length(normalized)<1 or length(normalized)>80 then raise exception 'Enter a valid promo code.'; end if;
    select * into promo from public.promocode where code=normalized for update;
    if not found or not coalesce(promo.is_active,false) or (promo.expires_at is not null and promo.expires_at<=now()) or (promo.max_uses is not null and coalesce(promo.current_uses,0)>=promo.max_uses) then raise exception 'Promo code is unavailable.'; end if;
    if exists(select 1 from public.store_redemptions where user_id=p_actor and code=normalized) or exists(select 1 from public.promocode_redemption where code=normalized and user_email=email) then raise exception 'Promo code already redeemed.'; end if;
    for winrow in select card_code,sum(quantity)::integer quantity from (
      select card_code,quantity from public.promocode_reward where code=normalized
      union all select value,1 from jsonb_array_elements_text(coalesce(promo.card_ids,'[]')) where not exists(select 1 from public.promocode_reward where code=normalized)
    ) rewards group by card_code loop
     select card_id into cid from public.store_legacy_cards where legacy_id=winrow.card_code;
     if cid is null or winrow.quantity<1 or winrow.quantity>100 then raise exception 'Promo rewards need updating. No code was consumed.'; end if;
     for i in 1..winrow.quantity loop drawn:=drawn||jsonb_build_array(cid); end loop;
    end loop;
    price:=-greatest(0,coalesce(promo.tokens,0));
    insert into public.store_redemptions values(p_actor,normalized);
    insert into public.promocode_redemption(code,user_email) values(normalized,email);
    update public.promocode set current_uses=coalesce(current_uses,0)+1 where code=normalized;
   end if;
   for cid in select value from jsonb_array_elements_text(drawn) loop
    a.owned:=jsonb_set(a.owned,array[cid],to_jsonb(coalesce((a.owned->>cid)::integer,0)+1));
   end loop;
   update public.store_accounts set tokens=a.tokens-price,owned=a.owned,unlocked=a.unlocked where user_id=p_actor returning * into a;
   insert into public.store_receipts(user_id,request_id,operation,item,cards,cost) values(p_actor,p_request,p_operation,p_item,drawn,price);
  end if;
 end if;
 return jsonb_build_object('tokens',a.tokens,'owned',a.owned,'unlocked',a.unlocked,'wins',wins,'deckWins',deck_wins,'cards',drawn,'cost',price,
  'unmappedLegacyCount',jsonb_array_length(a.unmapped_legacy),
  'rarities',(select jsonb_object_agg(id,store_catalog.rarity) from public.store_catalog),
  'receipts',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select request_id,operation,item,cards,cost,created_at from public.store_receipts where user_id=p_actor order by created_at desc limit 12)x));
end $$;
revoke all on function public.store_request(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.store_request(uuid,text,text,uuid,text) to service_role;
commit;
