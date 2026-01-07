import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Shield, Zap } from 'lucide-react';

function StatBar({ icon: Icon, value, maxValue, color, label, glowColor }) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  return (
    <div className="flex items-center gap-3">
      <div className={`
        w-10 h-10 rounded-xl bg-slate-800/80 backdrop-blur
        flex items-center justify-center border border-slate-700
        ${glowColor}
      `}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
          <span className={`text-sm font-bold ${color}`}>{value}/{maxValue}</span>
        </div>
        <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden backdrop-blur">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 100 }}
            className={`h-full rounded-full bg-gradient-to-r ${
              color === 'text-rose-400' ? 'from-rose-500 to-red-500' :
              color === 'text-blue-400' ? 'from-blue-500 to-cyan-500' :
              'from-amber-500 to-yellow-500'
            }`}
            style={{ boxShadow: `0 0 20px ${glowColor.includes('rose') ? '#f43f5e' : glowColor.includes('blue') ? '#3b82f6' : '#f59e0b'}40` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PlayerStats({ health, maxHealth, shield, mana, maxMana, isEnemy = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isEnemy ? 50 : -50 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        w-72 p-4 rounded-2xl
        bg-slate-900/60 backdrop-blur-xl
        border border-slate-700/50
        shadow-2xl
      `}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`
          w-12 h-12 rounded-xl
          bg-gradient-to-br ${isEnemy ? 'from-rose-500 to-red-600' : 'from-indigo-500 to-purple-600'}
          flex items-center justify-center
          shadow-lg
        `}>
          <span className="text-xl">
            {isEnemy ? '👹' : '🧙‍♂️'}
          </span>
        </div>
        <div>
          <h3 className="text-white font-bold">{isEnemy ? 'Enemy' : 'You'}</h3>
          <p className="text-slate-400 text-xs">
            {isEnemy ? 'Dark Sorcerer' : 'Light Mage'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <StatBar 
          icon={Heart} 
          value={health} 
          maxValue={maxHealth} 
          color="text-rose-400" 
          label="Health"
          glowColor="shadow-rose-500/20"
        />
        {shield > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <StatBar 
              icon={Shield} 
              value={shield} 
              maxValue={50} 
              color="text-blue-400" 
              label="Shield"
              glowColor="shadow-blue-500/20"
            />
          </motion.div>
        )}
        {!isEnemy && (
          <StatBar 
            icon={Zap} 
            value={mana} 
            maxValue={maxMana} 
            color="text-amber-400" 
            label="Mana"
            glowColor="shadow-amber-500/20"
          />
        )}
      </div>
    </motion.div>
  );
}