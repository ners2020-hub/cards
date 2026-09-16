import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import GameCard from './GameCard';

const BASE_W = 160;
const BASE_H = 224;

// Controllers in play should be only ~25% larger than other board zones.
// Creatures render at ~0.5 scale (80x112). Controllers target 0.625 (100x140).
const CONTROLLER_SCALE = 0.625;

export default function ControllerSlot({ controller, isEmpty, isOpponent, onClick, onView }) {
  const slotW = Math.round(BASE_W * CONTROLLER_SCALE);
  const slotH = Math.round(BASE_H * CONTROLLER_SCALE);

  if (isEmpty) {
    return (
      <div
        className="rounded-lg border-2 border-dashed border-slate-600/70 bg-slate-800/40 flex items-center justify-center"
        style={{ width: slotW, height: slotH }}
      >
        <Heart className="w-6 h-6 text-slate-500/70" />
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: slotW, height: slotH }} onClick={onClick}>
      {/* 
        We keep GameCard in "hand" mode (no internal auto-scale) and scale it here,
        so the controller size does not blow up layout or push the hand off-board.
      */}
      <div
        className="absolute top-0 left-0"
        style={{ transform: `scale(${CONTROLLER_SCALE})`, transformOrigin: 'top left' }}
      >
        <GameCard
          card={controller.card}
          modifiedStats={{ ch: controller.currentCH }}
          disabled={isOpponent && !onClick}
          onView={onView}
          inHand={true}
        />
      </div>

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
