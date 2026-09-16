import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, X } from 'lucide-react';

function getShardCost(ability) {
  const cost = ability?.cost;

  // Supports: cost: 2
  if (typeof cost === 'number') return cost;

  // Supports: cost: { shards: 2 }
  if (cost && typeof cost === 'object' && typeof cost.shards === 'number') return cost.shards;

  // Default
  return 0;
}

export default function AbilityMenu({ card, cardType, onActivate, onCancel, availableShards }) {
  const abilities = Array.isArray(card?.abilities) ? card.abilities : [];

  // Preserve original index from card.abilities
  const activeAbilities = abilities
    .map((ability, originalIndex) => ({ ability, originalIndex }))
    .filter(({ ability }) => ability?.trigger === 'active' || ability?.type === 'active');

  if (activeAbilities.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900/95 rounded-2xl border-2 border-purple-500 p-6 max-w-md mx-4 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-purple-400">Activate Ability</h3>
            <button onClick={onCancel} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
            <div className="text-white font-bold mb-1">{card?.name || 'Unknown Card'}</div>
            <div className="text-xs text-slate-400">{cardType}</div>
          </div>

          <div className="space-y-2">
            {activeAbilities.map(({ ability, originalIndex }) => {
              const cost = getShardCost(ability);
              const canAfford = (availableShards ?? 0) >= cost;

              return (
                <div
                  key={originalIndex}
                  className={`p-3 rounded-lg border ${
                    canAfford
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-slate-700 bg-slate-800/40 opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-purple-300">
                      {ability?.name || 'Unnamed Ability'}
                    </span>
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-white font-bold">{cost}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">
                    {ability?.description || 'No description.'}
                  </p>

                  <Button
                    onClick={() => onActivate(ability, originalIndex)}
                    disabled={!canAfford}
                    className={`w-full ${
                      canAfford ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-700 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Activate' : 'Not enough Shards'}
                  </Button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}