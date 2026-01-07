import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sword, Shield, Zap, Snowflake, Flame, Droplet, Mountain, Wind, Moon, Sun } from 'lucide-react';

const elementConfig = {
  blood: { color: 'from-red-600 to-rose-700', icon: Heart, accent: '#ef4444' },
  wind: { color: 'from-cyan-500 to-teal-600', icon: Wind, accent: '#06b6d4' },
  light: { color: 'from-amber-400 to-yellow-500', icon: Sun, accent: '#fbbf24' },
  fire: { color: 'from-orange-500 to-red-600', icon: Flame, accent: '#f97316' },
  shadow: { color: 'from-purple-900 to-indigo-900', icon: Moon, accent: '#a855f7' },
  electric: { color: 'from-yellow-400 to-blue-500', icon: Zap, accent: '#eab308' },
  cryo: { color: 'from-blue-400 to-cyan-500', icon: Snowflake, accent: '#60a5fa' },
  earth: { color: 'from-amber-700 to-stone-800', icon: Mountain, accent: '#d97706' },
  water: { color: 'from-blue-500 to-indigo-600', icon: Droplet, accent: '#3b82f6' }
};

const typeConfig = {
  controller: { border: 'border-amber-500/50', glow: 'shadow-amber-500/30' },
  creature: { border: 'border-slate-600/50', glow: 'shadow-slate-500/20' },
  spell: { border: 'border-purple-500/50', glow: 'shadow-purple-500/30' },
  artifact: { border: 'border-cyan-500/50', glow: 'shadow-cyan-500/30' }
};

export default function GameCard({ 
  card, 
  onClick, 
  disabled, 
  inHand = false,
  isZombified = false,
  statusEffects = [],
  modifiedStats = null,
  showDetailed = false,
  className = '',
  onPlay,
  onView,
  onAttack,
  onDiscard,
  onEffect,
  canAttack = false,
  canPlay = false
}) {
  const [showActions, setShowActions] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);
  const element = elementConfig[card.element] || elementConfig.fire;
  const type = typeConfig[card.card_type] || typeConfig.creature;
  const ElementIcon = element.icon;
  
  const displayAP = modifiedStats?.ap ?? card.ap;
  const displayCH = modifiedStats?.ch ?? card.ch;
  const hasGuardian = card.keywords?.includes('Guardian');
  const hasStealth = card.keywords?.includes('Stealth');

  return (
    <>
      <motion.div
        layout
        onMouseEnter={() => {
          setShowTooltip(true);
          if (!canAttack) setShowActions(true);
        }}
        onMouseLeave={() => {
          setShowTooltip(false);
          setShowActions(false);
        }}
        whileHover={!disabled ? { scale: inHand ? 1.05 : 1.02, y: inHand ? -8 : -2 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        onClick={(e) => {
          if (!disabled) {
            if (canAttack && onAttack) {
              // Direct attack - no menu
              onAttack();
            } else if (onClick) {
              onClick();
            } else {
              setShowActions(!showActions);
            }
          }
        }}
        className={`
        relative bg-slate-900 rounded-lg border-2 ${type.border}
        shadow-lg ${type.glow} overflow-hidden select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${inHand ? 'w-24 h-32' : 'w-20 h-28'}
        ${isZombified ? 'grayscale border-green-500/50' : ''}
        ${className}
      `}
    >
      {/* Tooltip with card name and description */}
      {showTooltip && card.description && !showActions && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60] pointer-events-none"
        >
          <div className={`bg-gradient-to-br ${element.color} rounded-lg border-2 ${type.border} shadow-2xl p-3 min-w-[200px] max-w-[280px]`}>
            <div className="text-white font-bold text-sm mb-1">{card.name}</div>
            <div className="text-white/90 text-xs leading-relaxed">{card.description}</div>
            {card.keywords && card.keywords.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {card.keywords.map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-white/20 rounded text-[10px] font-bold text-white">
                    {kw}
                  </span>
                ))}
              </div>
            )}
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className={`w-3 h-3 rotate-45 bg-gradient-to-br ${element.color}`} />
            </div>
          </div>
        </motion.div>
      )}
      {/* Action Menu Overlay */}
      <AnimatePresence>
        {showActions && (onPlay || onAttack || onDiscard || onEffect || true) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-1 p-1"
            onClick={(e) => e.stopPropagation()}
          >
            {canPlay && onPlay && (
              <button
                onClick={(e) => { e.stopPropagation(); onPlay(); }}
                className="w-full px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded"
              >
                PLAY
              </button>
            )}
            {!inHand && canAttack && onAttack && (
              <button
                onClick={(e) => { e.stopPropagation(); onAttack(); }}
                className="w-full px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded"
              >
                ATTACK
              </button>
            )}
            {!inHand && onEffect && (
              <button
                onClick={(e) => { e.stopPropagation(); onEffect(); }}
                className="w-full px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded"
              >
                EFFECT
              </button>
            )}
            {onView && (
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded"
              >
                VIEW
              </button>
            )}
            {inHand && onDiscard && (
              <button
                onClick={(e) => { e.stopPropagation(); onDiscard(); }}
                className="w-full px-2 py-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded"
              >
                DISCARD
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {/* Element gradient header */}
      <div className={`h-6 bg-gradient-to-r ${element.color} flex items-center justify-between px-1.5`}>
        <ElementIcon className="w-3 h-3 text-white" />
        <span className="text-white text-[10px] font-bold uppercase tracking-wider truncate px-1">
          {card.name}
        </span>
        <div className="w-4 h-4 rounded-full bg-black/40 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">{card.cost}</span>
        </div>
      </div>

      {/* Card art area */}
      <div className="relative h-14 bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover opacity-70" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${element.color} opacity-20`}>
            <ElementIcon className="w-8 h-8 opacity-50" />
          </div>
        )}
        
        {/* Status effect badges */}
        {statusEffects.length > 0 && (
          <div className="absolute top-0 right-0 flex gap-0.5 p-0.5">
            {statusEffects.map((effect, i) => (
              <div key={i} className="w-3 h-3 rounded-full bg-black/60 flex items-center justify-center">
                <span className="text-[8px]">{effect[0]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Keywords */}
        {hasGuardian && (
          <div className="absolute bottom-0 left-0 px-1 bg-blue-600/80 text-white text-[8px] font-bold">
            GUARD
          </div>
        )}
        {hasStealth && (
          <div className="absolute bottom-0 right-0 px-1 bg-purple-600/80 text-white text-[8px] font-bold">
            STEALTH
          </div>
        )}
      </div>

      {/* Stats bar */}
      {(card.card_type === 'creature' || card.card_type === 'controller') && (
        <div className="h-8 bg-slate-950/80 flex items-center justify-around px-1 border-t border-slate-700/50">
          {card.ap !== undefined && (
            <div className="flex items-center gap-0.5">
              <Sword className="w-3 h-3 text-red-400" />
              <span className={`text-xs font-bold ${
                displayAP > card.ap ? 'text-green-400' : 
                displayAP < card.ap ? 'text-red-400' : 
                'text-white'
              }`}>
                {displayAP}
              </span>
            </div>
          )}
          {card.ch !== undefined && (
            <div className="flex items-center gap-0.5">
              <Shield className="w-3 h-3 text-blue-400" />
              <span className={`text-xs font-bold ${
                displayCH > card.ch ? 'text-green-400' : 
                displayCH < card.ch ? 'text-red-400' : 
                'text-white'
              }`}>
                {displayCH}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Type indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1">
        <div className={`h-full bg-gradient-to-r ${element.color} opacity-60`} />
      </div>

      {/* Zombified overlay */}
      {isZombified && (
        <div className="absolute inset-0 bg-green-900/20 border-2 border-green-500/50 rounded-lg pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-400 text-xl opacity-40">
            ☠️
          </div>
        </div>
      )}
      </motion.div>
    </>
  );
}