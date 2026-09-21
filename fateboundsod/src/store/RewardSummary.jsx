import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
export async function rewardRequest(body) {
  const { data, error } = await supabase.functions.invoke('rewards', { body });
  if (error) throw new Error('Could not confirm rewards. Retry safely without earning twice.');
  return data;
}
export default function RewardSummary({ matchId, solo }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true); setError('');
    try {
      let next;
      if (solo) {
        const body = { op: 'finish', id: solo.id, actions: solo.actions };
        localStorage.setItem(`fatebound.pendingReward.${solo.userId}`, JSON.stringify(body));
        next = await rewardRequest(body);
        localStorage.removeItem(`fatebound.pendingReward.${solo.userId}`);
      } else {
        next = await rewardRequest({ op: 'match', id: matchId });
      }
      setData(next);
    } catch { setError('Rewards have not been confirmed yet. Retry here or check Rewards in the store.'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [matchId]);
  const reward = data?.reward || data?.rewards?.recent?.find(r => r.match_id === matchId);
  return <section className="match-reward" aria-live="polite"><h3>Match rewards</h3>
    {data ? <><p>{reward ? `+${reward.tokens} tokens · Match recorded` : 'This match predates match rewards.'}</p>{data.rewards?.addedXp > 0 && <p>Quest completed · +{data.rewards.addedXp} XP</p>}<p>Wallet: {data.tokens} tokens</p></> : <p>{error || 'Confirming your match and rewards…'}</p>}
    {error && <button disabled={busy} onClick={refresh}>{busy ? 'Checking…' : 'Retry rewards'}</button>}<a href="/store?tab=rewards">View quests & rewards →</a>
  </section>;
}
