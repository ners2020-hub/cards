import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Swords, Sparkles, Shield } from 'lucide-react';

export default function ActionLog({ actions, title = "Opponent Actions" }) {
  const [displayedActions, setDisplayedActions] = useState([]);

  useEffect(() => {
    if (!actions || actions.length === 0) {
      setDisplayedActions([]);
      return;
    }

    // Add new actions one by one with delay
    const newActions = actions.filter(a => !displayedActions.includes(a));
    
    if (newActions.length > 0) {
      newActions.forEach((action, idx) => {
        setTimeout(() => {
          setDisplayedActions(prev => [...prev, action]);
        }, idx * 800); // Slower staggered appearance
      });
    }

    // Clear old actions after they've been displayed for a while
    const timeout = setTimeout(() => {
      setDisplayedActions([]);
    }, 5000 + (newActions.length * 800)); // Keep visible longer

    return () => clearTimeout(timeout);
  }, [actions]);

  if (!displayedActions || displayedActions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      className="fixed left-4 top-20 z-20 bg-slate-900/95 backdrop-blur-sm border-2 border-purple-500/50 rounded-lg p-3 max-w-xs shadow-2xl"
    >
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-500/30">
        <Activity className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-bold text-purple-300">{title}</h3>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayedActions.map((action, idx) => (
            <motion.div
              key={`${action}-${idx}`}
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-start gap-2 text-sm text-slate-200 bg-slate-800/70 rounded px-3 py-2 shadow-lg"
            >
              {action.includes('Activated') && <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />}
              {action.includes('Played') && <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
              {action.includes('→') && <Swords className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
              {action.includes('destroyed') && <span className="text-rose-400 text-base flex-shrink-0 mt-0.5">💀</span>}
              {!action.includes('Activated') && !action.includes('Played') && !action.includes('→') && !action.includes('destroyed') && 
                <div className="w-3 h-3 flex-shrink-0 mt-1 rounded-full bg-purple-500/50" />
              }
              <span className="flex-1 leading-tight">{action}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}