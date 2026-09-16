import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BattleLog({ logs, onClose }) {
  const [isMinimized, setIsMinimized] = React.useState(false);

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: isMinimized ? -264 : 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="fixed left-4 top-20 w-80 z-40 bg-slate-900/95 border-2 border-cyan-500/50 rounded-xl shadow-2xl backdrop-blur-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/30">
        <h3 className="text-lg font-bold text-cyan-400">Battle Log</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            {isMinimized ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Log entries */}
      {!isMinimized && (
        <ScrollArea className="h-96 p-4">
        <div className="space-y-3">
          <AnimatePresence>
            {(logs || []).map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
              >
                {/* Player indicator */}
                <div className={`text-xs font-bold mb-1 ${
                  log.player === 'you' ? 'text-cyan-400' : 'text-rose-400'
                }`}>
                  {log.player === 'you' ? '🛡️ YOU' : '⚔️ OPPONENT'}
                </div>

                {/* Action */}
                <div className="text-white text-sm font-semibold mb-1">
                  {log.action}
                </div>

                {/* Card description */}
                {log.cardDescription && (
                  <div className="text-slate-400 text-xs leading-relaxed">
                    {log.cardDescription}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-slate-500 text-[10px] mt-1">
                  Turn {log.turn}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {(logs || []).length === 0 && (
            <div className="text-center text-slate-500 py-8 text-sm">
              No actions yet. The battle begins...
            </div>
          )}
        </div>
      </ScrollArea>
      )}
    </motion.div>
  );
}