// src/pages/AdminCardCreator.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

import GameCard from '@/components/tcg/GameCard';
import { normalizeCardData } from '@/components/tcg/CardPreviewer';

import {
  ArcaneFrame,
  MagicalButton,
  ArcaneParticles,
  ArcaneSignil
} from '@/components/tcg/ArcaneEffects';

import StrictAbilityBuilder from '@/components/admin/StrictAbilityBuilder';

/* =======================
   CONSTANTS
======================= */

const CARD_TYPES = ['controller', 'creature', 'spell', 'artifact', 'token'];
const ELEMENTS = ['blood','fire','water','earth','wind','light','shadow','electric','cryo','neutral','universal','hybrid'];
const RARITIES = ['common','uncommon','rare','epic','legendary'];

/* =======================
   HELPERS
======================= */

function safeParseJson(maybeJson) {
  try {
    return JSON.parse(maybeJson);
  } catch {
    return null;
  }
}

// Matches StrictAbilityBuilder shape: { trigger, action, target:{type}, cost:{shards,ch}, params:{}, condition }
function sanitizeAbilitiesForSave(abilities) {
  if (!Array.isArray(abilities)) return [];
  for (const a of abilities) {
    if (!a || typeof a !== 'object') throw new Error('Invalid ability entry');
    if (!a.trigger) throw new Error('Each ability requires a trigger');
    if (!a.action) throw new Error('Each ability requires an action');
    if (!a.target?.type) throw new Error('Each ability requires a target type');
    // cost/params can be defaulted by builder, but we normalize just in case
  }
  return abilities.map((a) => ({
    trigger: a.trigger,
    action: a.action,
    target: { type: a.target?.type ?? 'enemy_creature' },
    cost: {
      shards: Number(a.cost?.shards ?? 0) || 0,
      ch: Number(a.cost?.ch ?? 0) || 0,
    },
    params: a.params && typeof a.params === 'object' ? a.params : {},
    condition: a.condition ?? null,
  }));
}

/* =======================
   DEFAULT FORM
======================= */

const defaultForm = {
  code: '',
  name: '',
  card_type: 'creature',
  element: 'neutral',
  rarity: 'common',
  cost: 0,
  ap: 0,
  ch: 0,
  description: '',
  art_url: '',
is_token: false,
  keywords: [],
  abilities: []
};

export default function AdminCardCreator() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState(defaultForm);
  const [editingCode, setEditingCode] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(data?.user ?? null);
      setAuthLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ['is-admin', user?.email],
    enabled: !!user?.email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('userprofile')
        .select('role')
        .eq('user_email', user.email)
        .maybeSingle();

      if (error) throw error;
      return data?.role === 'admin';
    },
  });

  const { data: allCards = [] } = useQuery({
    queryKey: ['all-cards'],
    enabled: !!user && !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: searchCards = [], isFetching: searchFetching } = useQuery({
    queryKey: ['card-search', debouncedSearch],
    enabled: !!user && !!isAdmin,
    queryFn: async () => {
      const term = (debouncedSearch || '').trim();

      // If no term (or too short), just return the first chunk ordered by name
      if (!term || term.length < 2) {
        const { data, error } = await supabase
          .from('card')
          .select('*')
          .order('name', { ascending: true })
          .limit(50);

        if (error) throw error;
        return data ?? [];
      }

      const { data, error } = await supabase
        .from('card')
        .select('*')
        .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
        .order('name', { ascending: true })
        .limit(25);

      if (error) throw error;
      return data ?? [];
    }
  });

  const displayedCards = useMemo(() => {
    // If user is searching, show search results; otherwise show the "browse" set
    const term = (debouncedSearch || '').trim();
    if (term.length >= 2) return searchCards ?? [];
    // Prefer searchCards even when empty term (it returns the first 50 by name)
    return searchCards ?? [];
  }, [debouncedSearch, searchCards]);

  // ✅ Used by StrictAbilityBuilder for summonTokens dropdown
  const tokenCards = useMemo(() => {
    return (allCards ?? []).filter((c) => c.card_type === 'token' || c.is_token === true);
  }, [allCards]);

  // Debounce search to avoid spamming Supabase
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const resetForm = () => {
    setFormData(defaultForm);
    setEditingCode(null);
  };

  const generateCardCode = () => {
    const type = (formData.card_type || 'creature').toUpperCase();
    const ele = (formData.element || 'neutral').toUpperCase().slice(0, 3);
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${type}_${ele}_${num}`;
  };

  const keywordOptions = useMemo(() => ([
    'swift', 'shielded', 'flying', 'vigilant', 'taunt', 'lifesteal', 'poison'
  ]), []);

  const handleKeywordToggle = (kw) => {
    setFormData((prev) => {
      const cur = Array.isArray(prev.keywords) ? prev.keywords : [];
      if (cur.includes(kw)) return { ...prev, keywords: cur.filter((k) => k !== kw) };
      return { ...prev, keywords: [...cur, kw] };
    });
  };

  // ✅ Normalizes keywords/abilities so existing ones always show up for editing
  const loadCard = (card) => {
    // abilities can arrive as array, json string, object, or null
    let abilities = [];
    try {
      if (Array.isArray(card.abilities)) {
        abilities = card.abilities;
      } else if (typeof card.abilities === 'string' && card.abilities.trim()) {
        const parsed = safeParseJson(card.abilities);
        abilities = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      } else if (card.abilities && typeof card.abilities === 'object') {
        abilities = [card.abilities];
      }
    } catch {
      abilities = [];
    }

    let keywords = [];
    try {
      if (Array.isArray(card.keywords)) {
        keywords = card.keywords;
      } else if (typeof card.keywords === 'string' && card.keywords.trim()) {
        const parsed = safeParseJson(card.keywords);
        keywords = Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      keywords = [];
    }

    setFormData({
      ...defaultForm,
      ...card,
      // Ensure arrays hydrate correctly from TEXT JSON
      keywords,
      abilities,
    });

    setEditingCode(card.code);
    window.scrollTo({ top: 0 });
  };

  const upsertMutation = useMutation({
    mutationFn: async (cardData) => {
      console.log('🚀 calling adminUpsertCard', cardData?.code, cardData?.name);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const token = sessionData?.session?.access_token;
      if (!token) throw new Error('No active session');

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/adminUpsertCard`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ cardData }),
      });

      const text = await res.text();
      let json = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

      if (!res.ok) {
        console.error('❌ adminUpsertCard failed', res.status, json);
        throw new Error(json?.details || json?.error || json?.message || `Failed to save card (${res.status})`);
      }

      return json?.card ?? json;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['all-cards'] });
      await queryClient.invalidateQueries({ queryKey: ['card-search'] });
      resetForm();
      alert('Card saved');
    },
    onError: (err) => {
      alert(err?.message || 'Failed to save card');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (code) => {
      const { error } = await supabase.from('card').delete().eq('code', code);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-search'] });
      resetForm();
    },
    onError: (err) => {
      alert(err?.message || 'Failed to delete card');
    }
  });

  const handleSubmit = () => {
    console.log('🔥 handleSubmit fired');

    if (!formData.name?.trim()) {
      alert('Name required');
      return;
    }

    let abilitiesSafe;
    try {
      abilitiesSafe = sanitizeAbilitiesForSave(formData.abilities);
    } catch (e) {
      alert(e?.message || 'Abilities are invalid');
      return;
    }

    const costNum = Number(formData.cost);
    const apNum = Number(formData.ap);
    const chNum = Number(formData.ch);

    const payload = {
      ...formData,
      code: formData.code || generateCardCode(),
      cost: Number.isFinite(costNum) ? costNum : 0,
      ap: (formData.card_type === 'spell' || formData.card_type === 'token') ? null : (Number.isFinite(apNum) ? apNum : 0),
      ch: (formData.card_type === 'spell') ? null : (Number.isFinite(chNum) ? chNum : 0),
      is_token: formData.card_type === 'token' || formData.is_token,
      keywords: Array.isArray(formData.keywords) ? formData.keywords : [],
      abilities: abilitiesSafe
    };

    upsertMutation.mutate(payload);
  };

  if (authLoading || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-red-400">Access Denied</h1>
          <Link to={createPageUrl('TCGMainMenu')}>
            <Button className="mt-4">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-slate-950 text-white">
      <ArcaneParticles />
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <ArcaneSignil />
      </div>

      <div className="max-w-[1600px] mx-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <Link to={createPageUrl('TCGMainMenu')}>
            <Button variant="secondary" className="gap-2">
              <ArrowLeft size={16} /> Back
            </Button>
          </Link>

          <div className="text-white font-semibold text-xl">Admin Card Creator</div>

          {/* ✅ Dark so label stays visible */}
          <Button
            variant="secondary"
            className="bg-slate-900/70 text-white border border-slate-600 hover:bg-slate-800"
            onClick={resetForm}
          >
            New
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ArcaneFrame className="lg:col-span-2 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-white mb-1 text-sm">Code</div>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Auto-generated if empty"
                  readOnly={!!editingCode}
                />
                {editingCode && (
                  <div className="text-xs text-slate-400 mt-1">Edit Mode: code is locked.</div>
                )}
              </div>

              <div>
                <div className="text-white mb-1 text-sm">Name</div>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div>
                <div className="text-white mb-1 text-sm">Type</div>
                <Select value={formData.card_type} onValueChange={(v) => setFormData({ ...formData, card_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARD_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-white mb-1 text-sm">Element</div>
                <Select value={formData.element} onValueChange={(v) => setFormData({ ...formData, element: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ELEMENTS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-white mb-1 text-sm">Rarity</div>
                <Select value={formData.rarity} onValueChange={(v) => setFormData({ ...formData, rarity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RARITIES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="text-white mb-1 text-sm">Cost</div>
                <Input type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} />
              </div>

              <div>
                <div className="text-white mb-1 text-sm">AP</div>
                <Input
                  type="number"
                  value={formData.ap ?? ''}
                  onChange={(e) => setFormData({ ...formData, ap: e.target.value })}
                  disabled={formData.card_type === 'spell' || formData.card_type === 'token'}
                />
              </div>

              <div>
                <div className="text-white mb-1 text-sm">CH</div>
                <Input
                  type="number"
                  value={formData.ch ?? ''}
                  onChange={(e) => setFormData({ ...formData, ch: e.target.value })}
                  disabled={formData.card_type === 'spell'}
                />
              </div>

              <div className="md:col-span-2">
                <div className="text-white mb-1 text-sm">Description</div>
                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <div className="text-white mb-1 text-sm">Art URL</div>
                <Input value={formData.art_url} onChange={(e) => setFormData({ ...formData, art_url: e.target.value })} />
              </div>

              <div className="md:col-span-2">
                <div className="text-white mb-2 text-sm">Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {keywordOptions.map((kw) => (
                    <MagicalButton
                      key={kw}
                      type="button"
                      active={formData.keywords?.includes(kw)}
                      onClick={() => handleKeywordToggle(kw)}
                    >
                      {kw}
                    </MagicalButton>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <StrictAbilityBuilder
                  abilities={Array.isArray(formData.abilities) ? formData.abilities : []}
                  onChange={(abilities) => setFormData({ ...formData, abilities })}
                  tokenCards={tokenCards}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleSubmit} disabled={upsertMutation.isPending}>
                {editingCode ? "Update Card" : "Create Card"}
              </Button>

              {editingCode && (
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(editingCode)}
                  disabled={deleteMutation.isPending}
                  className="gap-2"
                >
                  <Trash2 size={16} /> Delete
                </Button>
              )}
            </div>
          </ArcaneFrame>

          <div className="space-y-6">
            <ArcaneFrame className="p-4">
              <div className="text-white font-semibold mb-3">Preview</div>
              <div className="flex justify-center">
                <GameCard card={normalizeCardData(formData)} inHand />
              </div>
            </ArcaneFrame>

            <ArcaneFrame className="p-4">
              <div className="text-white font-semibold mb-3">Search / Load Card</div>
              <div className="mb-3">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or code..."
                  className="bg-slate-900/60 border border-slate-700"
                />
                <div className="text-xs text-slate-400 mt-1">
                  {searchFetching
                    ? 'Searching...'
                    : (debouncedSearch && debouncedSearch.length >= 2
                      ? `Results for "${debouncedSearch}"`
                      : 'Showing first 50 cards (type to search)')}
                </div>
              </div>

              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2">
                {!displayedCards?.length && (
                  <div className="text-sm text-slate-400">No cards found.</div>
                )}

                {displayedCards.map((c) => (
                  <motion.div
                    key={c.code}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg border border-slate-700 bg-slate-950/30 hover:bg-slate-950/50 cursor-pointer flex justify-between items-center"
                    onClick={() => loadCard(c)}
                  >
                    <div>
                      <div className="text-slate-100 font-medium">{c.name}</div>
                      <div className="text-slate-300 text-xs">{c.code}</div>
                      <div className="text-slate-300 text-xs">{c.card_type} | {c.element} | {c.rarity}</div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-slate-900/60 text-slate-200 hover:text-white hover:bg-slate-800/80 border border-slate-700"
                        onClick={(e) => { e.stopPropagation(); loadCard(c); }}
                        aria-label="Edit card"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ArcaneFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
