import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ArrowLeft, Gift, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { fetchAllCards } from '@/services/cardService';
import { normalizeCardData } from '@/components/tcg/CardPreviewer';

export default function AdminPromoCodes() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [code, setCode] = useState('');
  const [selectedCardCode, setSelectedCardCode] = useState(''); // card.code
  const [rewardQty, setRewardQty] = useState(1);

  const [tokensAward, setTokensAward] = useState(0);
  const [maxRedemptions, setMaxRedemptions] = useState(1);
  const [filterElement, setFilterElement] = useState('all');
  const [copied, setCopied] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAdminStatus = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setUser(null);
        setIsAdmin(false);
        window.location.href = createPageUrl('TCGMainMenu');
        return;
      }
      setUser(user);

      const { data: userProfile, error: profileError } = await supabase
        .from('userprofile')
        .select('admin_mode_active')
        .eq('user_email', user.email)
        .single();

      if (profileError || !userProfile?.admin_mode_active) {
        setIsAdmin(false);
        window.location.href = createPageUrl('TCGMainMenu');
      } else {
        setIsAdmin(true);
      }
    };
    checkAdminStatus();
  }, []);

  const { data: promoCodes = [], isLoading: isLoadingPromos } = useQuery({
    queryKey: ['promo-codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promocode')
        .select('*')
        .order('created_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user
  });

  const { data: promoRewards = [], isLoading: isLoadingRewards } = useQuery({
    queryKey: ['promo-rewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promocode_reward')
        .select('code, card_code, quantity');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user
  });

  const { data: allCardsRaw = [], isLoading: isLoadingCards } = useQuery({
    queryKey: ['all-cards'],
    queryFn: fetchAllCards,
    staleTime: 300000,
    enabled: !!user
  });

  const allCards = React.useMemo(() => {
    return (allCardsRaw || []).map(card => normalizeCardData(card)).filter(Boolean);
  }, [allCardsRaw]);

  const cardsByCode = React.useMemo(() => {
    const m = new Map();
    for (const c of allCards) {
      // normalizeCardData typically sets id=code, but we prefer code if present
      const code = c.code || c.id;
      if (code) m.set(code, c);
    }
    return m;
  }, [allCards]);

  const filteredCards = React.useMemo(() => {
    if (filterElement === 'all') return allCards;
    return allCards.filter(c => String(c.element || '').toLowerCase() === String(filterElement).toLowerCase());
  }, [allCards, filterElement]);

  const rewardsByPromoCode = React.useMemo(() => {
    const map = new Map();
    for (const r of promoRewards) {
      if (!map.has(r.code)) map.set(r.code, []);
      map.get(r.code).push(r);
    }
    // stable sort
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => String(a.card_code).localeCompare(String(b.card_code)));
      map.set(k, arr);
    }
    return map;
  }, [promoRewards]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const copyCode = (promoCode) => {
    navigator.clipboard.writeText(promoCode);
    setCopied(promoCode);
    setTimeout(() => setCopied(null), 2000);
  };

  const createPromoMutation = useMutation({
    mutationFn: async ({ promoRow, rewardRow }) => {
      // 1) Create promocode
      const { data: newPromo, error: promoErr } = await supabase
        .from('promocode')
        .insert(promoRow)
        .select()
        .single();
      if (promoErr) throw promoErr;

      // 2) Insert reward row (optional)
      if (rewardRow?.card_code) {
        const { error: rewardErr } = await supabase
          .from('promocode_reward')
          .upsert(rewardRow, { onConflict: 'code,card_code' });
        if (rewardErr) throw rewardErr;
      }

      return newPromo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-rewards'] });

      setCode('');
      setSelectedCardCode('');
      setRewardQty(1);
      setTokensAward(0);
      setMaxRedemptions(1);

      alert('Promo code created successfully!');
    },
    onError: (error) => {
      alert(`Failed to create promo code: ${error.message}`);
    }
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (promoCode) => {
      // Rewards have FK cascade? If not, delete rewards first
      await supabase.from('promocode_reward').delete().eq('code', promoCode);

      const { error } = await supabase
        .from('promocode')
        .delete()
        .eq('code', promoCode);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      queryClient.invalidateQueries({ queryKey: ['promo-rewards'] });
      alert('Promo code deleted successfully!');
    },
    onError: (error) => {
      alert(`Failed to delete promo code: ${error.message}`);
    }
  });

  const togglePromoMutation = useMutation({
    mutationFn: async ({ promoCode, isActive }) => {
      const { data, error } = await supabase
        .from('promocode')
        .update({ is_active: !isActive, updated_date: new Date().toISOString() })
        .eq('code', promoCode)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-codes'] });
      alert('Promo code status updated successfully!');
    },
    onError: (error) => {
      alert(`Failed to toggle promo code status: ${error.message}`);
    }
  });

  const addRewardMutation = useMutation({
    mutationFn: async ({ promoCode, card_code, quantity }) => {
      const { error } = await supabase
        .from('promocode_reward')
        .upsert(
          { code: promoCode, card_code, quantity },
          { onConflict: 'code,card_code' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-rewards'] });
      setSelectedCardCode('');
      setRewardQty(1);
    },
    onError: (error) => {
      alert(`Failed to add reward: ${error.message}`);
    }
  });

  const removeRewardMutation = useMutation({
    mutationFn: async ({ promoCode, card_code }) => {
      const { error } = await supabase
        .from('promocode_reward')
        .delete()
        .eq('code', promoCode)
        .eq('card_code', card_code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-rewards'] });
    },
    onError: (error) => {
      alert(`Failed to remove reward: ${error.message}`);
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const promoCode = code.trim().toUpperCase();
    if (!promoCode) {
      alert('Code is required.');
      return;
    }

    // Optional reward: allow tokens-only promo
    const rewardCard = selectedCardCode ? (selectedCardCode.trim()) : null;
    const qty = Math.max(1, Number(rewardQty) || 1);

    if (rewardCard && !cardsByCode.has(rewardCard)) {
      alert('Selected reward card not found in card table.');
      return;
    }

    try {
      await createPromoMutation.mutateAsync({
        promoRow: {
          code: promoCode,
          // keep legacy column but do not use it anymore
          // card_ids: null,
          tokens: Math.max(0, Number(tokensAward) || 0),
          max_uses: Math.max(1, Number(maxRedemptions) || 1),
          current_uses: 0,
          expires_at: null,
          is_active: true,
          description: null,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
          created_by: user?.email ?? null,
          is_sample: false
        },
        rewardRow: rewardCard
          ? { code: promoCode, card_code: rewardCard, quantity: qty }
          : null
      });
    } catch {
      // handled in mutation
    }
  };

  const handleAddRewardToExistingPromo = async (promoCode) => {
    const rewardCard = selectedCardCode ? selectedCardCode.trim() : null;
    if (!rewardCard) {
      alert('Select a card to add as a reward.');
      return;
    }
    if (!cardsByCode.has(rewardCard)) {
      alert('Selected reward card not found in card table.');
      return;
    }
    const qty = Math.max(1, Number(rewardQty) || 1);

    addRewardMutation.mutate({
      promoCode,
      card_code: rewardCard,
      quantity: qty
    });
  };

  if (!user || isLoadingPromos || isLoadingCards || isLoadingRewards) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl('TCGMainMenu')}>
            <Button variant="outline" className="border-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Admin: Promo Codes
          </h1>
          <div className="w-24" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Promo Code */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-900/80 border-purple-500/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  Create Promo Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Code</label>
                    <div className="flex gap-2">
                      <Input
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="PROMO123"
                        className="bg-slate-800 border-slate-700 text-white uppercase"
                      />
                      <Button
                        type="button"
                        onClick={() => setCode(generateCode())}
                        variant="outline"
                        className="border-slate-700"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Reward Card (optional)</label>
                    <Select value={selectedCardCode} onValueChange={setSelectedCardCode}>
                      <SelectTrigger className="bg-slate-800 border-slate-700">
                        <SelectValue placeholder="Select card..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {filteredCards.map(card => {
                          const ccode = card.code || card.id;
                          return (
                            <SelectItem key={ccode} value={ccode}>
                              {card.name} ({card.element})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    <Select value={filterElement} onValueChange={setFilterElement}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 mt-2">
                        <SelectValue placeholder="All Elements" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Elements</SelectItem>
                        <SelectItem value="fire">Fire</SelectItem>
                        <SelectItem value="water">Water</SelectItem>
                        <SelectItem value="earth">Earth</SelectItem>
                        <SelectItem value="wind">Wind</SelectItem>
                        <SelectItem value="blood">Blood</SelectItem>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="shadow">Shadow</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="cryo">Cryo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Reward Quantity (per redemption)</label>
                    <Input
                      type="number"
                      min="1"
                      value={rewardQty}
                      onChange={(e) => setRewardQty(parseInt(e.target.value, 10) || 1)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Tokens Awarded (currency)</label>
                    <Input
                      type="number"
                      min="0"
                      value={tokensAward}
                      onChange={(e) => setTokensAward(parseInt(e.target.value, 10) || 0)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Max Redemptions (global)</label>
                    <Input
                      type="number"
                      min="1"
                      value={maxRedemptions}
                      onChange={(e) => setMaxRedemptions(parseInt(e.target.value, 10) || 1)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Code
                  </Button>

                  <div className="text-xs text-slate-500">
                    Rewards are stored in <b>promocode_reward</b> using <b>card.code</b>. Tokens are currency awarded on redeem.
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Active Promo Codes */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/80 border-cyan-500/50">
              <CardHeader>
                <CardTitle className="text-white">Active Promo Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {promoCodes?.map(promo => {
                    const rewards = rewardsByPromoCode.get(promo.code) || [];
                    const firstReward = rewards[0];
                    const firstCard = firstReward ? cardsByCode.get(firstReward.card_code) : null;

                    return (
                      <div key={promo.code} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-xl font-bold text-purple-400">{promo.code}</code>
                              <Button
                                size="sm"
                                onClick={() => copyCode(promo.code)}
                                className="h-6 w-6 p-0 bg-slate-700 hover:bg-slate-600"
                              >
                                {copied === promo.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              </Button>
                              <span className={`px-2 py-1 rounded text-xs ${promo.is_active ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'}`}>
                                {promo.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </div>

                            <div className="text-sm text-slate-300">
                              <span className="font-bold text-amber-400">
                                Tokens Award: {promo.tokens ?? 0}
                              </span>
                              <span className="text-slate-500"> • </span>
                              <span>
                                Redeemed: {promo.current_uses ?? 0}/{promo.max_uses ?? 0}
                              </span>
                            </div>

                            <div className="mt-2 text-sm text-slate-300">
                              <div className="text-slate-400 mb-1">Rewards</div>

                              {rewards.length === 0 ? (
                                <div className="text-slate-500">No card rewards (tokens-only promo)</div>
                              ) : (
                                <div className="space-y-1">
                                  {rewards.map(r => {
                                    const c = cardsByCode.get(r.card_code);
                                    return (
                                      <div key={`${promo.code}:${r.card_code}`} className="flex items-center gap-2">
                                        <span className="text-slate-200">
                                          <span className="font-semibold text-amber-400">
                                            {c?.name || r.card_code}
                                          </span>
                                          <span className="text-slate-500"> • </span>
                                          <span className="text-slate-300">Qty: {r.quantity}</span>
                                        </span>
                                        <Button
                                          size="sm"
                                          onClick={() => removeRewardMutation.mutate({ promoCode: promo.code, card_code: r.card_code })}
                                          className="h-7 w-7 p-0 bg-slate-700 hover:bg-slate-600 ml-auto"
                                          title="Remove reward"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Add reward row to existing promo (uses the same selection UI state) */}
                              <div className="mt-3 flex items-center gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => handleAddRewardToExistingPromo(promo.code)}
                                  className="h-8 px-3 bg-purple-600 hover:bg-purple-700"
                                  disabled={!selectedCardCode}
                                  title="Add selected card reward to this promo"
                                >
                                  <Plus className="w-4 h-4 mr-1" />
                                  Add Selected Reward
                                </Button>
                                <span className="text-xs text-slate-500">
                                  (Uses the Reward Card + Quantity fields on the left)
                                </span>
                              </div>

                              {/* Optional quick preview line */}
                              {firstCard && (
                                <div className="mt-2 text-xs text-slate-500">
                                  Preview: {firstCard.name} ({firstCard.element})
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => togglePromoMutation.mutate({ promoCode: promo.code, isActive: promo.is_active })}
                              className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                            >
                              {promo.is_active ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => deletePromoMutation.mutate(promo.code)}
                              className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {(!promoCodes || promoCodes.length === 0) && (
                    <div className="text-center text-slate-400 py-12">
                      No promo codes created yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
