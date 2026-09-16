import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import GameCard from '@/components/tcg/GameCard';
import { useQuery } from '@tanstack/react-query'; // Added useQuery import
import { supabase } from '@/lib/supabaseClient'; // Assuming this is your Supabase client setup

function formatAbilityDescription(ability) {
  if (ability.description) return ability.description;
  
  const action = ability.action || '';
  const params = ability.params || {};
  
  const actionDescriptions = {
    modifyStats: () => `${params.stat?.toUpperCase() || 'Stats'} ${params.amount > 0 ? '+' : ''}${params.amount}`,
    draw: () => `Draw ${params.count || 1} card${params.count !== 1 ? 's' : ''}`,
    damage: () => `Deal ${params.amount || 0} damage`,
    heal: () => `Heal ${params.amount || 0} HP`,
    aura: () => `Aura: ${params.element || ''} ${JSON.stringify(params)}`,
    summon: () => `Summon ${params.card_name || 'creature'}`,
    battleImmunity: () => 'Immune to battle damage',
    // Add more action descriptions as needed for your game
  };
  
  return actionDescriptions[action]?.() || `${action} ${JSON.stringify(params)}`;
}

export function normalizeCardData(raw) {
  if (!raw) return null;

  // Convert old ability fields to abilities array if needed
  let abilities = Array.isArray(raw.abilities) ? raw.abilities : [];
  if (abilities.length === 0) {
    // Only add if corresponding raw fields exist and abilities array is empty
    if (raw.on_play) abilities.push({ type: 'on_play', name: 'On Play', description: raw.on_play });
    if (raw.on_death) abilities.push({ type: 'on_death', name: 'On Death', description: raw.on_death });
    if (raw.passive_ability) abilities.push({ type: 'passive', name: 'Passive', description: raw.passive_ability });
    if (raw.active_ability) abilities.push({ type: 'active', name: 'Active', cost: raw.active_cost || 0, description: raw.active_ability });
  }

  return {
    // Crucially, ensure 'id' is always the 'code' for client-side game logic consistency
    id: raw.code ?? raw.id ?? raw.card_id ?? undefined, 
    code: raw.code ?? raw.id ?? raw.card_id ?? undefined, // Keep code explicitly
    name: raw.name ?? 'Unnamed Card',
    card_type: raw.card_type ?? raw.type ?? raw.cardType ?? 'card',
    element: raw.element ?? raw.attribute ?? raw.school ?? 'neutral',
    cost: raw.cost ?? raw.shards ?? 0,
    ap: raw.ap ?? raw.attack ?? undefined,
    ch: raw.ch ?? raw.health ?? undefined,
    description:
      raw.description ??
      raw.effect ??
      raw.text ??
      '',
    abilities: abilities,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    art_url: raw.art_url ?? raw.image_url ?? raw.image ?? raw.imageUrl ?? '',
    // Back-compat for any older components still reading image_url
    image_url: raw.art_url ?? raw.image_url ?? raw.image ?? raw.imageUrl ?? '',
    __raw: raw, // Keep raw data for debugging or specific GameCard usage
  };
}

export default function CardPreviewer({ open, card, onOpenChange, layout }) {
  // Normalize the incoming card data for consistent display
  const c = React.useMemo(() => normalizeCardData(card), [card]);

  // Fetch all cards for token resolution (if GameCard still needs it from here)
  const { data: databaseCards = [] } = useQuery({
    queryKey: ['all-cards-for-previewer'], // Unique key to avoid conflicts
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card')
        .select('*');
      if (error) {
        console.error('Error fetching database cards for previewer:', error);
        return [];
      }
      return data.map(dbCard => ({ ...dbCard, id: dbCard.code })); // Normalize for client-side logic
    },
    staleTime: 300000,
    enabled: !!card // Only fetch if there's a card to preview
  });

  // Ensure GameCard receives the normalized card data, especially for token resolution
  // and that the 'id' property is correctly set to 'code'
  const cardForGameCard = React.useMemo(() => {
    if (!c) return null;
    if (c.is_token && c.code && databaseCards.length > 0) {
      const dbCard = databaseCards.find(db => db.code === c.code);
      if (dbCard) {
        return {
          ...dbCard,
          ...c, // Overlay instance-specific data like AP/CH if modified
          id: dbCard.code, // Ensure id is code
          name: dbCard.name,
          description: dbCard.description,
          abilities: dbCard.abilities,
          keywords: dbCard.keywords,
          art_url: dbCard.art_url,
          image_url: dbCard.art_url || dbCard.image_url
        };
      }
    }
    return c;
  }, [c, databaseCards]);


  return (
    <AnimatePresence>
      {open && c && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => onOpenChange(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            onOpenChange(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 30 }}
            className="w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl border-2 border-purple-500 bg-slate-900/95 p-4 sm:p-6">
              {/* Card-left / info-right (no overlap), stacks on small screens */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                <div className="shrink-0 w-[160px]">
                  {/* Pass the potentially resolved card to GameCard */}
                  <GameCard card={cardForGameCard} layout={layout} inHand />
                </div>

                <div className="w-full sm:w-[360px] rounded-xl border border-purple-500/40 bg-slate-900/60 p-4 text-white">
                  <div className="text-purple-300 font-extrabold text-xl leading-tight">
                    {c.name}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded bg-slate-800/70 capitalize">
                      {c.element}
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-800/70 capitalize">
                      {c.card_type}
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-800/70">
                      Cost: {c.cost}
                    </span>
                    {c.ap !== undefined && c.card_type !== 'spell' && (
                      <span className="px-2 py-1 rounded bg-slate-800/70">AP: {c.ap}</span>
                    )}
                    {c.ch !== undefined && c.card_type !== 'spell' && (
                      <span className="px-2 py-1 rounded bg-slate-800/70">CH: {c.ch}</span>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg bg-slate-800/40 p-3 max-h-[160px] overflow-y-auto">
                    <div className="text-[11px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {c.description || 'No description'}
                    </div>
                  </div>

                  {c.abilities.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {c.abilities.map((ability, i) => {
                        const trigger = ability.trigger || ability.type;
                        const triggerMap = {
                          onPlay: { label: 'On Play', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30', text: 'text-cyan-400' },
                          on_play: { label: 'On Play', bg: 'bg-cyan-900/20', border: 'border-cyan-500/30', text: 'text-cyan-400' },
                          onDeath: { label: 'On Death', bg: 'bg-red-900/20', border: 'border-red-500/30', text: 'text-red-400' },
                          on_death: { label: 'On Death', bg: 'bg-red-900/20', border: 'border-red-500/30', text: 'text-red-400' },
                          passive: { label: 'Passive', bg: 'bg-amber-900/20', border: 'border-amber-500/30', text: 'text-amber-400' },
                          active: { label: 'Active', bg: 'bg-green-900/20', border: 'border-green-500/30', text: 'text-green-400' },
                          onKill: { label: 'On Kill', bg: 'bg-purple-900/20', border: 'border-purple-500/30', text: 'text-purple-400' },
                          startOfTurn: { label: 'Start of Turn', bg: 'bg-blue-900/20', border: 'border-blue-500/30', text: 'text-blue-400' }
                        };
                        const style = triggerMap[trigger] || { label: trigger, bg: 'bg-slate-800/20', border: 'border-slate-500/30', text: 'text-slate-400' };
                        const costText = ability.cost && (ability.cost.shards || ability.cost.ch) 
                          ? ` (Cost: ${ability.cost.shards ? ability.cost.shards + ' shards' : ''} ${ability.cost.ch ? ability.cost.ch + ' CH' : ''})`
                          : '';

                        return (
                          <div key={i} className={`rounded p-2 border ${style.bg} ${style.border}`}>
                            <div className={`text-[10px] font-bold uppercase mb-1 ${style.text}`}>
                              {style.label}{costText}
                            </div>
                            <div className="text-[10px] text-slate-200 leading-snug">
                              {formatAbilityDescription(ability)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {c.keywords.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] text-slate-400 font-bold mb-2">
                        KEYWORDS
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.keywords.map((kw, i) => (
                          <span
                            key={`${kw}-${i}`}
                            className="px-2 py-1 rounded bg-cyan-600/20 border border-cyan-500/30 text-xs"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => onOpenChange(false)}
                    variant="default"
                    className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    Close
                  </Button>
                </div>
              </div>

              <div className="mt-3 text-[10px] text-slate-500">
                Tip: Right-click anywhere to close.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
