begin;
do $$
declare actor uuid:=gen_random_uuid(); other_actor uuid:=gen_random_uuid(); req uuid:=gen_random_uuid(); a jsonb; b jsonb; original jsonb; tutorial jsonb; i integer; saved_tokens integer;
begin
 insert into auth.users(id,email,is_anonymous) values(actor,actor::text||'@example.invalid',false),(other_actor,other_actor::text||'@example.invalid',false);
 set local role service_role;
 a:=public.store_pack_request(actor,p_email=>actor::text||'@example.invalid');
 a:=public.store_pack_request(actor,'pack','starter',req,actor::text||'@example.invalid');
 original:=a->'cards'; saved_tokens:=(a->>'tokens')::integer;
 assert jsonb_array_length(a->'unopenedPacks')=1,'Purchase must persist an unopened pack';
 assert jsonb_array_length(original)=5,'Five cards saved';
 b:=public.store_pack_request(actor,p_email=>actor::text||'@example.invalid');
 assert b->'unopenedPacks'=a->'unopenedPacks','Fresh session must recover the pack';
 b:=public.store_pack_request(actor,'pack','starter',req,actor::text||'@example.invalid');
 assert b->'cards'=original and b->'owned'=a->'owned' and (b->>'tokens')::integer=saved_tokens,'Lost purchase response retry cannot charge, duplicate or reroll';
 for i in 1..3 loop
  b:=public.store_pack_request(actor,'open','',req,actor::text||'@example.invalid');
  assert b->'cards'=original and b->'owned'=a->'owned','Reopening preserves cards';
  assert jsonb_array_length(b->'unopenedPacks')=1,'Leaving reveal must not consume pack';
 end loop;
 begin
  perform public.store_pack_request(other_actor,'open','',req,other_actor::text||'@example.invalid');
  raise exception 'FAIL: another account opened pack';
 exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 begin
  perform public.store_pack_request(other_actor,'finish','',req,other_actor::text||'@example.invalid');
  raise exception 'FAIL: another account finished pack';
 exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 b:=public.store_pack_request(actor,'finish','',req,actor::text||'@example.invalid');
 assert jsonb_array_length(b->'unopenedPacks')=0,'Finish acknowledges reveal';
 b:=public.store_pack_request(actor,'finish','',req,actor::text||'@example.invalid');
 assert b->'owned'=a->'owned' and (b->>'tokens')::integer=saved_tokens,'Finish retry must be idempotent';
 tutorial:=public.tutorial_reward_claim(actor,actor::text||'@example.invalid');
 b:=public.store_pack_request(actor,p_email=>actor::text||'@example.invalid');
 assert jsonb_array_length(b->'unopenedPacks')=1,'Tutorial reward must wait in collection';
 assert (b->>'tokens')::integer=saved_tokens,'Tutorial pack must not charge';
 perform public.tutorial_reward_claim(actor,actor::text||'@example.invalid');
 a:=public.store_pack_request(actor,p_email=>actor::text||'@example.invalid');
 assert b->'owned'=a->'owned' and b->'unopenedPacks'=a->'unopenedPacks','Tutorial retry cannot duplicate';
 assert not has_function_privilege('authenticated','public.store_pack_request(uuid,text,text,uuid,text)','EXECUTE'),'Only trusted server may choose actor';
 assert not has_function_privilege('anon','public.store_pack_request(uuid,text,text,uuid,text)','EXECUTE'),'No anonymous RPC';
 assert not has_table_privilege('authenticated','public.store_receipts','UPDATE'),'No client acknowledgment forgery';
end $$;
rollback;
select 'PASS: saved purchase, fresh-session recovery, repeat opens, idempotent purchase/finish, tutorial recovery, unchanged balances, cross-account rejection and client privileges' as result;
