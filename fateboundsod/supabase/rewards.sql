begin;
create table public.match_rewards (
 user_id uuid not null references auth.users on delete cascade,
 match_id uuid not null, mode text not null check(mode in ('ai','pvp')),
 result text not null check(result in ('Victory','Defeat','Draw')), element text not null,
 perfect boolean not null default false, tokens integer not null check(tokens>=0),
 occurred_at timestamptz not null default now(), credited boolean not null default false,
 primary key(user_id,match_id)
);
create index match_rewards_user_time on public.match_rewards(user_id,occurred_at);
create table public.solo_reward_sessions (
 id uuid primary key, user_id uuid not null references auth.users on delete cascade,
 config jsonb not null, seed bigint not null, balance_version text not null,
 created_at timestamptz not null default now()
);
create index solo_rewards_user_time on public.solo_reward_sessions(user_id,created_at);
create table public.reward_quests (
 user_id uuid not null references auth.users on delete cascade,
 period text not null, starts_at timestamptz not null, ends_at timestamptz not null,
 title text not null, metric text not null, target integer not null, tokens integer not null, xp integer not null,
 credited boolean not null default false, primary key(user_id,period,starts_at)
);
alter table public.store_accounts add column reward_xp integer not null default 0;
alter table public.match_rewards enable row level security;
alter table public.solo_reward_sessions enable row level security;
alter table public.reward_quests enable row level security;
revoke all on public.match_rewards,public.solo_reward_sessions,public.reward_quests from public,anon,authenticated;
grant all on public.match_rewards,public.solo_reward_sessions,public.reward_quests to service_role;

-- Result records are written in the same transaction as the authoritative finish.
create function public.record_multiplayer_reward() returns trigger language plpgsql security invoker set search_path='' as $$
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
    case when won then 30 else 0 end) on conflict do nothing;
  end loop;
 end if;
 return new;
end $$;
create trigger multiplayer_reward_finished after update on public.mp_matches for each row execute function public.record_multiplayer_reward();

create function public.reward_quest_progress(p_actor uuid,p_metric text,p_start timestamptz,p_end timestamptz)
returns integer language sql security invoker set search_path='' as $$
 select case when p_metric='elements' then count(distinct element) filter(where result='Victory')
 else count(*) filter(where p_metric='games' or (result='Victory' and (p_metric='wins' or (p_metric='pvp_wins' and mode='pvp') or (p_metric='perfect_wins' and perfect)))) end::integer
 from public.match_rewards where user_id=p_actor and occurred_at>=p_start and occurred_at<p_end;
$$;
create function public.reward_sync(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare entry record; period_row record; q public.reward_quests; start_time timestamptz; end_time timestamptz;
 idx integer; spec jsonb; total integer:=0; xp_total integer:=0; progress integer; quests jsonb:='[]';
 daily jsonb:='[["First Victory","wins",1,50,25],["Triple Threat","wins",3,100,50],["Devoted Player","games",5,75,40],["Elemental Master","elements",3,125,60]]';
 weekly jsonb:='[["Conquest","wins",10,300,150],["Duelist","pvp_wins",5,400,200],["Flawless Victory","perfect_wins",3,500,250]]';
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 perform 1 from public.store_accounts where user_id=p_actor for update;
 if not found then raise exception 'Open your account first.'; end if;
 -- Recover earned rewards even if the player was offline when their match ended.
 for period_row in select distinct period, date_trunc(period, t at time zone 'UTC') at time zone 'UTC' begins
  from (select occurred_at t from public.match_rewards where user_id=p_actor and not credited union select now()) times
  cross join (values ('day'),('week')) periods(period) loop
  start_time:=period_row.begins;
  end_time:=start_time+case period_row.period when 'day' then interval '1 day' else interval '7 days' end;
  idx:=mod(abs(hashtextextended(p_actor::text||period_row.period||start_time::text,1)::numeric),case period_row.period when 'day' then 4 else 3 end)::integer;
  spec:=case period_row.period when 'day' then daily->idx else weekly->idx end;
  insert into public.reward_quests(user_id,period,starts_at,ends_at,title,metric,target,tokens,xp)
  values(p_actor,period_row.period,start_time,end_time,spec->>0,spec->>1,(spec->>2)::integer,(spec->>3)::integer,(spec->>4)::integer) on conflict do nothing;
 end loop;
 for q in select * from public.reward_quests where user_id=p_actor and not credited loop
  progress:=public.reward_quest_progress(p_actor,q.metric,q.starts_at,q.ends_at);
  if progress>=q.target then
   total:=total+q.tokens; xp_total:=xp_total+q.xp;
   update public.reward_quests set credited=true where user_id=p_actor and period=q.period and starts_at=q.starts_at;
  end if;
 end loop;
 for entry in update public.match_rewards set credited=true where user_id=p_actor and not credited returning tokens loop total:=total+entry.tokens; end loop;
 update public.store_accounts set tokens=tokens+total,reward_xp=reward_xp+xp_total where user_id=p_actor;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]') into quests from (
  select title,metric,period,target,tokens,xp,credited,ends_at,least(target,public.reward_quest_progress(p_actor,metric,starts_at,ends_at)) progress
  from public.reward_quests where user_id=p_actor and starts_at<=now() and ends_at>now() order by period
 ) x;
 return jsonb_build_object('addedTokens',total,'addedXp',xp_total,'xp',(select reward_xp from public.store_accounts where user_id=p_actor),'quests',quests,
  'games',(select count(*) from public.match_rewards where user_id=p_actor),
  'wins',(select count(*) from public.match_rewards where user_id=p_actor and result='Victory'),
  'recent',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from (select match_id,mode,result,tokens,occurred_at from public.match_rewards where user_id=p_actor order by occurred_at desc limit 10)x));
end $$;

create function public.solo_reward_start(p_id uuid,p_actor uuid,p_config jsonb,p_seed bigint,p_balance text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.solo_reward_sessions;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,0));
 select * into r from public.solo_reward_sessions where id=p_id and user_id=p_actor;
 if found then return to_jsonb(r); end if;
 if (select count(*) from public.solo_reward_sessions where user_id=p_actor and created_at>now()-interval '1 hour')>=60 then raise exception 'Please finish an existing game before starting more.'; end if;
 insert into public.solo_reward_sessions(id,user_id,config,seed,balance_version) values(p_id,p_actor,p_config,p_seed,p_balance) returning * into r;
 return to_jsonb(r);
end $$;
create function public.solo_reward_finish(p_id uuid,p_actor uuid,p_result text,p_perfect boolean) returns void
language plpgsql security invoker set search_path='' as $$
declare r public.solo_reward_sessions;
begin
 select * into r from public.solo_reward_sessions where id=p_id and user_id=p_actor for update;
 if not found then raise exception 'Match unavailable.'; end if;
 insert into public.match_rewards(user_id,match_id,mode,result,element,perfect,tokens)
 values(p_actor,p_id,'ai',p_result,r.config->'mine'->>'element',p_perfect,case when p_result='Victory' then 10 else 0 end) on conflict do nothing;
end $$;
revoke all on function public.record_multiplayer_reward(),public.reward_quest_progress(uuid,text,timestamptz,timestamptz),public.reward_sync(uuid),public.solo_reward_start(uuid,uuid,jsonb,bigint,text),public.solo_reward_finish(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.record_multiplayer_reward(),public.reward_quest_progress(uuid,text,timestamptz,timestamptz),public.reward_sync(uuid),public.solo_reward_start(uuid,uuid,jsonb,bigint,text),public.solo_reward_finish(uuid,uuid,text,boolean) to service_role;
commit;
