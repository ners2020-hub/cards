import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sword, Shield, Zap, Snowflake, Flame, Droplet, Mountain, Wind, Moon, Sun, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient'; // Assuming this is your Supabase client setup

const elementConfig = {
  blood: { color: 'from-red-600 to-rose-700', icon: Heart, accent: '#ef4444' },
  wind: { color: 'from-cyan-500 to-teal-600', icon: Wind, accent: '#06b6d4' },
  light: { color: 'from-amber-400 to-yellow-500', icon: Sun, accent: '#fbbf24' },
  fire: { color: 'from-orange-500 to-red-600', icon: Flame, accent: '#f97316' },
  shadow: { color: 'from-purple-900 to-indigo-900', icon: Moon, accent: '#a855f7' },
  electric: { color: 'from-yellow-400 to-blue-500', icon: Zap, accent: '#eab308' },
  cryo: { color: 'from-blue-400 to-cyan-500', icon: Snowflake, accent: '#60a5fa' },
  earth: { color: 'from-amber-700 to-stone-800', icon: Mountain, accent: '#d97706' },
  water: { color: 'from-blue-500 to-indigo-600', icon: Droplet, accent: '#3b82f6' },
  universal: { color: 'from-slate-400 to-slate-600', icon: Star, accent: '#94a3b8' }
};

const typeConfig = {
  controller: { border: 'border-amber-500/50', glow: 'shadow-amber-500/30' },
  creature: { border: 'border-slate-600/50', glow: 'shadow-slate-500/20' },
  spell: { border: 'border-purple-500/50', glow: 'shadow-purple-500/30' },
  artifact: { border: 'border-cyan-500/50', glow: 'shadow-cyan-500/30' }
};

const rarityConfig = {
  common: {
    border: 'border-slate-400/40',
    glow: 'shadow-slate-400/20',
    orb: '#64748B',
    orbGlow: 'rgba(148,163,184,0.35)'
  },
  uncommon: {
    border: 'border-green-500/50',
    glow: 'shadow-green-500/30',
    orb: '#22C55E',
    orbGlow: 'rgba(34,197,94,0.45)'
  },
  rare: {
    border: 'border-blue-500/60',
    glow: 'shadow-blue-500/40',
    orb: '#3B82F6',
    orbGlow: 'rgba(59,130,246,0.6)'
  },
  epic: {
    border: 'border-purple-500/70',
    glow: 'shadow-purple-500/50',
    orb: '#A855F7',
    orbGlow: 'rgba(168,85,247,0.7)'
  },
  legendary: { 
    border: 'border-2',
    borderColor: '#2DE2E6',
    glow: 'shadow-lg',
    glowColor: 'rgba(45, 226, 230, 0.6)',
    accentColor: '#F5C542',
    orb: '#05070C',
    orbGlow: 'rgba(45,226,230,0.85)'
  }
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
  onActivateAbility,
  canAttack = false,
  canPlay = false,
  hasActiveAbility = false
}) {
  const [showActions, setShowActions] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState(false);
  const longPressTimerRef = React.useRef(null);
  
  // Resolve token cards from database using code
  const { data: databaseCards = [] } = useQuery({
    queryKey: ['all-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card')
        .select('*');
      if (error) {
        console.error('Error fetching database cards:', error);
        return [];
      }
      // Ensure 'id' is consistent with 'code' for client-side logic
      // Preserve DB rule: abilities may be NULL.
      return data.map(c => ({
        ...c,
        id: c.code,
        abilities: c.abilities ?? null,
        keywords: c.keywords ?? [],
        art_url: c.art_url ?? null,
        image_url: c.art_url || c.image_url || null
      }));
    },
    staleTime: 300000
  });

  // If card has a code and looks like a token, try to resolve it from database
  let resolvedCard = card;
  if (card.is_token && card.code && databaseCards.length > 0) {
    const dbCard = databaseCards.find(c => c.code === card.code); // Match by 'code'
    if (dbCard) {
      // Merge database card with instance data, preserving modified stats
      resolvedCard = {
        ...dbCard,
        ...card,
        name: dbCard.name,
        ap: card.ap ?? dbCard.ap,
        ch: card.ch ?? dbCard.ch,
        description: dbCard.description,
        abilities: dbCard.abilities,
        keywords: dbCard.keywords,
        art_url: dbCard.art_url,
        image_url: dbCard.art_url || dbCard.image_url
      };
    }
  }

  const element = elementConfig[resolvedCard.element] || elementConfig.fire;
  const type = typeConfig[resolvedCard.card_type] || typeConfig.creature;
  const ElementIcon = element.icon;

  // Canonical card size: 160x224
  const BASE_W = 160;
  const BASE_H = 224;
  const scale = inHand ? 1 : 0.5;
  const shouldScale = !inHand;
  const rarity = card.rarity || 'common';
  const rarityStyle = rarityConfig[rarity] || rarityConfig.common;

  // cardlayout removed - use static default layout
  const defaultLayout = {
    cost: { x: 117, y: 8, w: 32, h: 32 },
    title: { x: 19, y: 45, w: 110, h: 30 },
    type: { x: 3, y: 163, w: 160, h: 26 },
    element: { x: 4, y: 28, w: 36, h: 34 },
    ap: { x: 18, y: 184, w: 30, h: 30 },
    ch: { x: 114, y: 184, w: 30, h: 30 }
  };

  const layoutConfig = defaultLayout;
  
  const displayAP = modifiedStats?.ap ?? resolvedCard.ap;
  const displayCH = modifiedStats?.ch ?? resolvedCard.ch;
  const hasGuardian = resolvedCard.keywords?.includes('guardian');
  const hasStealth = resolvedCard.keywords?.includes('stealth');
  
  // Show attached cards stacked behind
  const hasAttachments = modifiedStats?.equippedArtifacts && modifiedStats.equippedArtifacts.length > 0;

  return (
    <div className="relative">
      {/* Attached cards behind */}
      {hasAttachments && modifiedStats.equippedArtifacts.map((artifact, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            top: `${(idx + 1) * 4}px`,
            left: `${(idx + 1) * 4}px`,
            zIndex: -1
          }}
        >
          <div className="w-20 h-28 rounded-lg border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/40 to-orange-900/40 flex items-center justify-center">
            <span className="text-xs text-amber-400 font-bold">📜</span>
          </div>
        </div>
      ))}
      
      <motion.div
        layout
        onMouseEnter={() => {
          if (window.matchMedia('(hover: hover)').matches) {
            setShowTooltip(true);
          }
        }}
        onMouseLeave={() => {
          setShowTooltip(false);
          if (!canAttack) setShowActions(false);
        }}
        initial={inHand ? false : { opacity: 0, scale: 0.8, y: 20 }}
        animate={inHand ? false : { opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        whileHover={!disabled ? { scale: inHand ? 1.05 : 1.02, y: inHand ? -8 : -2 } : {}}
        whileTap={!disabled ? { scale: 0.98 } : {}}
        onClick={(e) => {
          if (!disabled) {
            if (canAttack && onAttack) {
              onAttack();
            } else if (canPlay && onPlay) {
              onPlay();
            } else if (onClick) {
              onClick();
            }
          }
        }}
        onTouchStart={(e) => {
          if (onView) {
            longPressTimerRef.current = setTimeout(() => {
              onView();
            }, 500);
          }
        }}
        onTouchEnd={(e) => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }}
        onTouchMove={(e) => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (onView) {
            onView();
          }
        }}
        className={`
        relative bg-slate-900 rounded-lg border-2 ${
          rarity === 'legendary' ? '' : type.border
        }
        ${rarity === 'legendary' ? 'shadow-lg' : `shadow-lg ${type.glow}`} overflow-hidden select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
        `}
        style={{
          width: `${BASE_W}px`,
          height: `${BASE_H}px`,
          ...(rarity === 'legendary' && {
            borderColor: rarityStyle.borderColor,
            boxShadow: `0 0 20px ${rarityStyle.glowColor}, inset 0 0 10px ${rarityStyle.glowColor}33`
          }),
          ...(shouldScale && {
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          })
        }}
      >
        {/* Tooltip with card name and description - hidden on touch devices */}
        {showTooltip && resolvedCard.description && !showActions && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[60] pointer-events-none hidden md:block"
          >
            <div className={`bg-gradient-to-br ${element.color} rounded-lg border-2 ${type.border} shadow-2xl p-3 min-w-[200px] max-w-[280px]`}>
              <div className="text-white font-bold text-sm mb-1">{resolvedCard.name}</div>
              <div className="text-white/90 text-xs leading-relaxed">{resolvedCard.description}</div>
              {resolvedCard.keywords && resolvedCard.keywords.length > 0 && (
                <div className="mt-2 flex gap-1 flex-wrap">
                  {resolvedCard.keywords.map((kw, i) => (
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

        {/* Background Art */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
          {(resolvedCard.art_url || resolvedCard.image_url) ? (
            <img src={resolvedCard.art_url || resolvedCard.image_url} alt={resolvedCard.name} className="w-full h-full object-cover opacity-60" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br ${element.color} opacity-20">
              <ElementIcon className="w-8 h-8 opacity-50" />
            </div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(to bottom, ${element.accent}33, ${element.accent}0f)`
          }}
        />

        {/* Element Icon */}
        <div 
          className="absolute flex items-center justify-center bg-slate-900/60 rounded-lg border border-slate-500/50 p-0.5"
          style={{ 
            left: `${layoutConfig.element.x}px`,
            top: `${layoutConfig.element.y}px`,
            width: `${layoutConfig.element.w}px`,
            height: `${layoutConfig.element.h}px`
          }}
        >
          <ElementIcon className="w-full h-full p-1 text-white" />
        </div>

        {/* Card Name */}
        <div 
          className="absolute text-center"
          style={{ 
            left: `${layoutConfig.title.x}px`,
            top: `${layoutConfig.title.y}px`,
            width: `${layoutConfig.title.w}px`,
            height: `${layoutConfig.title.h}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span 
            className="text-white font-bold uppercase drop-shadow-lg"
            style={{ 
              fontSize: '14px',
              lineHeight: '1.2',
              wordWrap: 'break-word',
              overflow: 'hidden'
            }}
          >
            {resolvedCard.name}
          </span>
        </div>

        {/* Card Type */}
        <div 
          className="absolute text-center"
          style={{ 
            left: `${layoutConfig.type.x}px`,
            top: `${layoutConfig.type.y}px`,
            width: `${layoutConfig.type.w}px`,
            height: `${layoutConfig.type.h}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span 
            className="text-slate-200 font-semibold uppercase drop-shadow"
            style={{ 
              fontSize: '11px',
              letterSpacing: '0.025em'
            }}
          >
            {resolvedCard.card_type}
          </span>
        </div>

        {/* Shard Cost */}
        <div 
          className="absolute rounded-full flex items-center justify-center border"
          style={{ 
            left: `${layoutConfig.cost.x}px`,
            top: `${layoutConfig.cost.y}px`,
            width: `${layoutConfig.cost.w}px`,
            height: `${layoutConfig.cost.h}px`,
            backgroundColor: rarityStyle.orb,
            borderColor: rarityStyle.orb,
            boxShadow: `0 0 12px ${rarityStyle.orbGlow}, inset 0 0 8px ${rarityStyle.orbGlow}`
          }}
        >
          <span className="text-white font-bold" style={{ fontSize: '16px' }}>
            {resolvedCard.cost}
          </span>
        </div>

        {/* Stats */}
        {(resolvedCard.card_type === 'creature' || resolvedCard.card_type === 'controller') && (
          <>
            {/* AP Stat */}
            {resolvedCard.ap !== undefined && (
              <div 
                className="absolute flex items-center justify-center bg-red-900/60 rounded border border-red-500/50"
                style={{ 
                  left: `${layoutConfig.ap.x}px`,
                  top: `${layoutConfig.ap.y}px`,
                  width: `${layoutConfig.ap.w}px`,
                  height: `${layoutConfig.ap.h}px`
                }}
              >
                <span 
                  className={`font-bold ${
                    displayAP > resolvedCard.ap ? 'text-green-400' : 
                    displayAP < resolvedCard.ap ? 'text-red-400' : 
                    'text-white'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  {displayAP}
                </span>
              </div>
            )}

            {/* CH Stat */}
            {resolvedCard.ch !== undefined && (
              <div 
                className="absolute flex items-center justify-center bg-blue-900/60 rounded border border-blue-500/50"
                style={{ 
                  left: `${layoutConfig.ch.x}px`,
                  top: `${layoutConfig.ch.y}px`,
                  width: `${layoutConfig.ch.w}px`,
                  height: `${layoutConfig.ch.h}px`
                }}
              >
                <span 
                  className={`font-bold ${
                    displayCH > resolvedCard.ch ? 'text-green-400' : 
                    displayCH < resolvedCard.ch ? 'text-red-400' : 
                    'text-white'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  {displayCH}
                </span>
              </div>
            )}
          </>
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

        {/* Zombified overlay */}
        {isZombified && (
          <div className="absolute inset-0 bg-green-900/20 border-2 border-green-500/50 rounded-lg pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-green-400 text-xl opacity-40">
              ☠️
            </div>
          </div>
        )}

        {/* Active Ability Indicator */}
        {hasActiveAbility && !disabled && onActivateAbility && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute bottom-1 right-1 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center border-2 border-purple-300 shadow-lg cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onActivateAbility?.();
            }}
          >
            <Zap className="w-3 h-3 text-white" />
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
