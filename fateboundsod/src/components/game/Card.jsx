import React from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Sparkles, Zap, Heart, Flame, Snowflake, Wind } from 'lucide-react';

const typeConfig = {
  attack: {
    gradient: 'from-rose-500 to-red-600',
    glow: 'shadow-rose-500/50',
    icon: Sword,
    bgPattern: 'bg-gradient-to-br from-rose-900/20 to-red-900/30'
  },
  defense: {
    gradient: 'from-blue-500 to-cyan-600',
    glow: 'shadow-blue-500/50',
    icon: Shield,
    bgPattern: 'bg-gradient-to-br from-blue-900/20 to-cyan-900/30'
  },
  magic: {
    gradient: 'from-purple-500 to-indigo-600',
    glow: 'shadow-purple-500/50',
    icon: Sparkles,
    bgPattern: 'bg-gradient-to-br from-purple-900/20 to-indigo-900/30'
  },
  special: {
    gradient: 'from-amber-500 to-yellow-600',
    glow: 'shadow-amber-500/50',
    icon: Zap,
    bgPattern: 'bg-gradient-to-br from-amber-900/20 to-yellow-900/30'
  },
  heal: {
    gradient: 'from-emerald-500 to-green-600',
    glow: 'shadow-emerald-500/50',
    icon: Heart,
    bgPattern: 'bg-gradient-to-br from-emerald-900/20 to-green-900/30'
  },
  fire: {
    gradient: 'from-orange-500 to-red-600',
    glow: 'shadow-orange-500/50',
    icon: Flame,
    bgPattern: 'bg-gradient-to-br from-orange-900/20 to-red-900/30'
  },
  ice: {
    gradient: 'from-cyan-400 to-blue-500',
    glow: 'shadow-cyan-400/50',
    icon: Snowflake,
    bgPattern: 'bg-gradient-to-br from-cyan-900/20 to-blue-900/30'
  },
  wind: {
    gradient: 'from-teal-400 to-emerald-500',
    glow: 'shadow-teal-400/50',
    icon: Wind,
    bgPattern: 'bg-gradient-to-br from-teal-900/20 to-emerald-900/30'
  }
};

export default function Card({ card, onClick, disabled, isInHand = true, index = 0 }) {
  const config = typeConfig[card.type] || typeConfig.attack;
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, rotateY: 180 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        rotateY: 0,
        rotate: isInHand ? (index - 2) * 5 : 0
      }}
      exit={{ opacity: 0, scale: 0.8, y: -100 }}
      whileHover={isInHand && !disabled ? { 
        y: -20, 
        scale: 1.1, 
        rotate: 0,
        zIndex: 50,
        transition: { type: "spring", stiffness: 400 }
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={() => !disabled && onClick?.(card)}
      className={`
        relative w-32 h-44 rounded-xl cursor-pointer select-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isInHand ? '-ml-4 first:ml-0' : ''}
      `}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* Card border glow */}
      <div className={`
        absolute inset-0 rounded-xl bg-gradient-to-br ${config.gradient}
        shadow-lg ${config.glow} shadow-2xl
      `} />
      
      {/* Card inner */}
      <div className={`
        absolute inset-[2px] rounded-xl bg-slate-900 overflow-hidden
        ${config.bgPattern}
      `}>
        {/* Mana cost */}
        <div className={`
          absolute top-2 left-2 w-7 h-7 rounded-full
          bg-gradient-to-br ${config.gradient}
          flex items-center justify-center
          text-white font-bold text-sm shadow-lg
        `}>
          {card.cost}
        </div>

        {/* Card icon */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`
            w-16 h-16 rounded-full bg-gradient-to-br ${config.gradient}
            flex items-center justify-center opacity-90
            shadow-lg ${config.glow}
          `}>
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Card name */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
          <span className="text-white font-semibold text-xs px-2 tracking-wide">
            {card.name}
          </span>
        </div>

        {/* Card value */}
        <div className={`
          absolute bottom-2 left-1/2 -translate-x-1/2
          px-3 py-1 rounded-full
          bg-gradient-to-r ${config.gradient}
          text-white font-bold text-sm
        `}>
          {card.value > 0 ? `+${card.value}` : card.value}
        </div>

        {/* Decorative corners */}
        <div className={`absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 rounded-tr-lg border-white/20`} />
        <div className={`absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 rounded-bl-lg border-white/20`} />
      </div>
    </motion.div>
  );
}