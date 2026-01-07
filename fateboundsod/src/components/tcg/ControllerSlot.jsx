import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Shield } from 'lucide-react';
import GameCard from './GameCard';

export default function ControllerSlot({ controller, isEmpty, isOpponent, onClick, onView }) {
  if (isEmpty) {
    return (
      <div className="w-20 h-28 rounded-lg border-2 border-dashed border-slate-600/70 bg-slate-800/40 flex items-center justify-center">
        <Heart className="w-6 h-6 text-slate-500/70" />
      </div>
    );
  }

  return (
    <div className="relative" onClick={onClick}>
      <GameCard 
        card={controller.card}
        modifiedStats={{ ch: controller.currentCH }}
        disabled={isOpponent && !onClick}
        onView={onView}
      />
      
      {/* Active indicator */}
      {controller.isActive && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -inset-1 rounded-lg border-2 border-amber-400 pointer-events-none"
        />
      )}

      {/* CH bar */}
      <div className="absolute -bottom-2 left-0 right-0 h-1 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${(controller.currentCH / controller.maxCH) * 100}%` }}
          className="h-full bg-gradient-to-r from-red-500 to-rose-600"
        />
      </div>
    </div>
  );
}