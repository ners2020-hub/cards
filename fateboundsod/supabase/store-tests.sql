-- Run after store.sql and store-catalog.sql. All fixtures and transactions roll back.
begin;
create function pg_temp.store_test_request(p_actor uuid,p_operation text default 'get',p_item text default '',p_request uuid default null)
returns jsonb language sql security invoker as $fn$
 select public.store_request(p_actor,p_operation,p_item,p_request,p_actor::text||'@example.invalid');
$fn$;
do $$
declare
 actor uuid:=gen_random_uuid(); other_actor uuid:=gen_random_uuid(); req uuid:=gen_random_uuid();
 a jsonb; b jsonb; before_tokens integer; code text:='STORE_TEST_'||upper(replace(gen_random_uuid()::text,'-',''));
 oldcode text; newid text; n integer;
begin
 insert into auth.users(id,email,is_anonymous) values(actor,actor::text||'@example.invalid',false),(other_actor,other_actor::text||'@example.invalid',false);
 set local role service_role;
 a:=pg_temp.store_test_request(actor);
 assert (a->>'tokens')::integer=100,'New player must receive exactly 100 tokens';
 assert (select sum(value::integer) from jsonb_each_text(a->'owned'))=28,'Starter cards must initialize once';
 assert pg_temp.store_test_request(actor)->'owned'=a->'owned','Account initialization must be idempotent';
 b:=pg_temp.store_test_request(actor,'pack','starter',req);
 assert (b->>'tokens')::integer=50 and jsonb_array_length(b->'cards')=5,'Starter costs 50 and gives five cards';
 assert (select sum(value::integer) from jsonb_each_text(b->'owned'))=33,'All five copies must be saved';
 a:=pg_temp.store_test_request(actor,'pack','starter',req);
 assert a->'cards'=b->'cards' and (a->>'tokens')::integer=50,'Retry must not charge or reroll';
 begin perform pg_temp.store_test_request(actor,'pack','elite',req);raise exception 'FAIL: reused ID accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 begin perform pg_temp.store_test_request(actor,'pack','elite',gen_random_uuid());raise exception 'FAIL: insufficient funds accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 assert (pg_temp.store_test_request(actor)->>'tokens')::integer=50,'Rejected purchase must not charge';
 begin perform pg_temp.store_test_request(actor,'pack','unknown',gen_random_uuid());raise exception 'FAIL: unknown pack accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 begin perform pg_temp.store_test_request(actor,'unlock','blood',gen_random_uuid());raise exception 'FAIL: unearned unlock accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 select legacy_id,card_id into oldcode,newid from public.store_legacy_cards where legacy_id<>card_id limit 1;
 assert oldcode is not null,'Test needs one changed legacy ID';
 reset role;
 insert into public.playerprogress(user_email,tokens,owned_cards,unlocked_decks,total_wins,deck_wins) values(other_actor::text||'@example.invalid',777,jsonb_build_array(jsonb_build_object('card_id',oldcode,'quantity',3)),'["fire"]',5,'{}');
 set local role service_role;
 a:=pg_temp.store_test_request(other_actor);
 assert (a->>'tokens')::integer=777 and (a->'owned'->>newid)::integer=3,'Migration must preserve balance and map by identity';
 a:=pg_temp.store_test_request(other_actor,'unlock','blood',gen_random_uuid());
 assert (a->>'tokens')::integer=277 and a->'unlocked' ? 'blood','Qualified unlock must charge 500 once';
 begin perform pg_temp.store_test_request(other_actor,'unlock','blood',gen_random_uuid());raise exception 'FAIL: duplicate unlock accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 update public.store_accounts set tokens=3000 where user_id=actor;
 foreach code in array array['premium','elite'] loop
  a:=pg_temp.store_test_request(actor,'pack',code,gen_random_uuid());
  assert jsonb_array_length(a->'cards')=5,'Every pack must give exactly five cards';
 end loop;
 code:='STORE_TEST_'||upper(replace(gen_random_uuid()::text,'-',''));
 insert into public.promocode(code,tokens,max_uses,current_uses,is_active,card_ids) values(code,200,1,0,true,'[]');
 insert into public.promocode_reward(code,card_code,quantity) values(code,oldcode,2);
 before_tokens:=(pg_temp.store_test_request(actor)->>'tokens')::integer;
 req:=gen_random_uuid();a:=pg_temp.store_test_request(actor,'promo',code,req);
 assert (a->>'tokens')::integer=before_tokens+200 and jsonb_array_length(a->'cards')=2,'Promo must grant tokens and canonical cards';
 b:=pg_temp.store_test_request(actor,'promo',code,req);
 assert a->'tokens'=b->'tokens','Promo retry must not duplicate rewards';
 begin perform pg_temp.store_test_request(actor,'promo',code,gen_random_uuid());raise exception 'FAIL: repeated promo accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 begin perform pg_temp.store_test_request(other_actor,'promo',code,gen_random_uuid());raise exception 'FAIL: exhausted promo accepted'; exception when raise_exception then if sqlerrm like 'FAIL:%' then raise; end if;end;
 assert not has_function_privilege('authenticated','public.store_request(uuid,text,text,uuid,text)','EXECUTE'),'Clients must not forge actors';
 assert not has_table_privilege('authenticated','public.store_accounts','UPDATE'),'Clients must not edit tokens';
 assert not has_table_privilege('authenticated','public.playerprogress','UPDATE'),'Legacy writes must not bypass store';
 assert not has_function_privilege('anon','public.store_request(uuid,text,text,uuid,text)','EXECUTE'),'Anonymous calls must fail';
 assert (select count(*) from public.store_catalog)=187,'Store must contain the current catalog';
 raise notice 'PASS store initialization, all packs, idempotency, insufficient funds, migration, unlocks, promos and privilege boundaries';
end $$;
rollback;
