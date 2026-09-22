create or replace function public.record_multiplayer_reward() returns trigger language plpgsql security invoker set search_path='' as $$
declare seat text; actor uuid; won boolean;
begin
 if new.status='finished' and old.status<>'finished' and new.guest_id is not null then
  foreach seat in array array['playerState','opponentState'] loop
   actor:=case seat when 'playerState' then new.host_id else new.guest_id end;
   won:=coalesce(new.state->'finished'->>'winner'=seat,false);
   insert into public.match_rewards(user_id,match_id,mode,result,element,perfect,tokens)
   values(actor,new.id,'pvp',case when won then 'Victory' when new.state->'finished'->>'winner' is null then 'Draw' else 'Defeat' end,
    case seat when 'playerState' then new.host_deck->>'element' else new.guest_deck->>'element' end,
    won and new.state->'finished'->>'reason'='controllers defeated' and coalesce((new.state->seat->>'controllersLost')::integer,(select count(*)::integer from jsonb_array_elements(new.state->seat->'graveyard') c where c->>'card_type'='controller'))=0,
    case when won then 30 when new.state->'finished'->>'winner' is not null then 5 else 0 end) on conflict do nothing;
  end loop;
 end if;
 return new;
end $$;

create or replace function public.solo_reward_finish(p_id uuid,p_actor uuid,p_result text,p_perfect boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.solo_reward_sessions;
begin
 select * into r from public.solo_reward_sessions where id=p_id and user_id=p_actor for update;
 if not found then raise exception 'Match unavailable.'; end if;
 insert into public.match_rewards(user_id,match_id,mode,result,element,perfect,tokens)
 values(p_actor,p_id,'ai',p_result,r.config->'mine'->>'element',p_perfect,case when p_result='Victory' then 10 when p_result='Defeat' then 3 else 0 end) on conflict do nothing;
end $$;
