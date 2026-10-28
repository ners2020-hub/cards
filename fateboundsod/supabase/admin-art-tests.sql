begin;
do $$
declare actor uuid:=gen_random_uuid(); stranger uuid:=gen_random_uuid(); request_id uuid:=gen_random_uuid(); payload jsonb:='{"code":"TEST","name":"Test","element":"light","card_type":"creature","description":"","direction":""}'; result jsonb;
begin
 insert into auth.users(id,email,is_anonymous) values(actor,actor::text||'@example.invalid',false),(stranger,stranger::text||'@example.invalid',false);
 insert into public.game_admins(user_id) values(actor);
 set local role service_role;
 begin perform public.admin_art_reserve(stranger,request_id,payload);raise exception 'FAIL non-admin';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 result:=public.admin_art_reserve(actor,request_id,payload);assert (result->>'run')::boolean,'First request reserves work';
 result:=public.admin_art_reserve(actor,request_id,payload);assert not (result->>'run')::boolean,'Retry never runs again';
 begin perform public.admin_art_reserve(actor,request_id,payload||'{"name":"Changed"}');raise exception 'FAIL changed request';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin perform public.admin_art_reserve(actor,gen_random_uuid(),payload);raise exception 'FAIL concurrent generation';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 begin perform public.admin_art_status(stranger,request_id);raise exception 'FAIL private status';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 update public.admin_art_jobs set status='ready',path='test.jpg' where id=request_id;
 assert public.admin_art_status(actor,request_id)->>'status'='ready','Completed request recoverable';
 insert into public.admin_art_jobs(id,user_id,payload,status) select gen_random_uuid(),actor,payload,'failed' from generate_series(1,9);
 begin perform public.admin_art_reserve(actor,gen_random_uuid(),payload);raise exception 'FAIL daily cap';exception when raise_exception then if sqlerrm like 'FAIL%' then raise;end if;end;
 reset role;
 assert not has_table_privilege('authenticated','public.admin_art_jobs','SELECT'),'Browser cannot read jobs directly';
 assert not has_table_privilege('authenticated','public.admin_art_jobs','INSERT'),'Browser cannot bypass quota';
 assert not has_function_privilege('authenticated','public.admin_art_reserve(uuid,uuid,jsonb)','EXECUTE'),'Service boundary required';
end $$;
select 'PASS admin authorization, request deduplication, concurrent guard, private status and daily quota; all fixtures rolled back' as result;
rollback;
