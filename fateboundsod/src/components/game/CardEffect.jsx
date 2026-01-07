import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Sparkles, Zap, Heart, Flame, Snowflake, Wind } from 'lucide-react';

const effectConfig = {
  attack: {
    color: 'text-rose-500',
    bg: 'bg-rose-500',
    particles: ['💥', '⚔️', '💢'],
    message: 'ATTACK!'
  },
  defense: {
    color: 'text-blue-400',
    bg: 'bg-blue-500',
    particles: ['🛡️', '✨', '💎'],
    message: 'SHIELD UP!'
  },
  magic: {
    color: 'text-purple-400',
    bg: 'bg-purple-500',
    particles: ['✨', '🔮', '⭐'],
    message: 'MAGIC!'
  },
  special: {
    color: 'text-amber-400',
    bg: 'bg-amber-500',
    particles: ['⚡', '💫', '🌟'],
    message: 'SPECIAL!'
  },
  heal: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500',
    particles: ['💚', '✨', '🌿'],
    message: 'HEAL!'
  },
  fire: {
    color: 'text-orange-500',
    bg: 'bg-orange-500',
    particles: ['🔥', '💥', '☄️'],
    message: 'BURN!'
  },
  ice: {
    color: 'text-cyan-400',
    bg: 'bg-cyan-400',
    particles: ['❄️', '💠', '🧊'],
    message: 'FREEZE!'
  },
  wind: {
    color: 'text-teal-400',
    bg: 'bg-teal-400',
    particles: ['💨', '🍃', '🌪️'],
    message: 'GUST!'
  }
};

function Particle({ emoji, delay, x, y }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0, 1.5, 1, 0],
        x: x,
        y: y,
        rotate: [0, 180, 360]
      }}
      transition={{ 
        duration: 1.2,
        delay: delay,
        ease: "easeOut"
      }}
      className="absolute text-3xl pointer-events-none"
    >
      {emoji}
    </motion.div>
  );
}

export default function CardEffect({ type, isActive, onComplete }) {
  const config = effectConfig[type] || effectConfig.attack;

  React.useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          {/* Flash overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.5 }}
            className={`absolute inset-0 ${config.bg}`}
          />

          {/* Central burst */}
          <motion.div
            initial={{ scale: 0, rotate: 0 }}
            animate={{ scale: [0, 2, 0], rotate: [0, 180] }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`w-40 h-40 rounded-full ${config.bg} opacity-30 blur-xl`}
          />

          {/* Particles */}
          {config.particles.map((emoji, i) => (
            <React.Fragment key={i}>
              <Particle emoji={emoji} delay={i * 0.1} x={-100 + Math.random() * 50} y={-100 - Math.random() * 50} />
              <Particle emoji={emoji} delay={i * 0.1 + 0.05} x={100 - Math.random() * 50} y={-100 - Math.random() * 50} />
              <Particle emoji={emoji} delay={i * 0.1 + 0.1} x={-80 + Math.random() * 40} y={100 + Math.random() * 50} />
              <Particle emoji={emoji} delay={i * 0.1 + 0.15} x={80 - Math.random() * 40} y={100 + Math.random() * 50} />
            </React.Fragment>
          ))}

          {/* Effect text */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.5, 1.2],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute text-5xl font-black ${config.color} drop-shadow-2xl tracking-wider`}
            style={{ textShadow: '0 0 40px currentColor' }}
          >
            {config.message}
          </motion.div>

          {/* Ring effect */}
          <motion.div
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`absolute w-32 h-32 rounded-full border-4 ${config.color.replace('text-', 'border-')}`}
          />
          <motion.div
            initial={{ scale: 0.5, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
            className={`absolute w-32 h-32 rounded-full border-4 ${config.color.replace('text-', 'border-')}`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}