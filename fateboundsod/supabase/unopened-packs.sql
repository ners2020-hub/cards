-- Pack contents are secured in owned at purchase/award time. Opening is a durable reveal.
-- Existing receipts remain recoverable once; no balances or card quantities change.
begin;
alter table public.store_receipts add column if not exists opened_at timestamptz;
create index if not exists store_unopened_packs on public.store_receipts(user_id,created_at)
 where operation='pack' and opened_at is null;
create or replace function public.store_pack_request(p_actor uuid,p_operation text default 'get',p_item text default '',p_request uuid default null,p_email text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; receipt public.store_receipts;
begin
 if p_actor is null or p_email is null then raise exception 'Sign in to visit the store.'; end if;
 if p_operation not in ('get','pack','unlock','promo','open','finish') then raise exception 'Unknown store operation.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 if p_operation in ('open','finish') then
  select * into receipt from public.store_receipts where user_id=p_actor and request_id=p_request and operation='pack' for update;
  if not found then raise exception 'Pack not found in your collection.'; end if;
  if p_operation='finish' then
   update public.store_receipts set opened_at=coalesce(opened_at,now()) where user_id=p_actor and request_id=p_request;
  end if;
  result:=public.store_request(p_actor,p_email=>p_email);
  result:=result||jsonb_build_object('cards',receipt.cards,'packId',receipt.request_id,'packType',receipt.item);
 else
  result:=public.store_request(p_actor,p_operation,p_item,p_request,p_email);
  if p_operation='pack' then result:=result||jsonb_build_object('packId',p_request,'packType',p_item); end if;
 end if;
 return result||jsonb_build_object('unopenedPacks',(select coalesce(jsonb_agg(jsonb_build_object(
  'id',r.request_id,'type',r.item,'createdAt',r.created_at,'cardCount',jsonb_array_length(r.cards),'reward',r.cost=0
 ) order by r.created_at,r.request_id),'[]'::jsonb) from public.store_receipts r where r.user_id=p_actor and r.operation='pack' and r.opened_at is null));
end $$;
revoke all on function public.store_pack_request(uuid,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.store_pack_request(uuid,text,text,uuid,text) to service_role;
commit;
