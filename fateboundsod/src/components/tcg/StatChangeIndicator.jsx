import React from 'react';
import { motion } from 'framer-motion';

export default function StatChangeIndicator({ changes = [], isPlayer = true }) {
  return (
    <>
      {changes.map((change, idx) => (
        <motion.div
          key={`${change.creatureIndex}-${change.stat}-${idx}`}
          initial={{ 
            opacity: 1, 
            y: 0,
            x: 0
          }}
          animate={{ 
            opacity: 0, 
            y: -60,
            x: (Math.random() - 0.5) * 30
          }}
          transition={{ 
            duration: 1.2, 
            ease: "easeOut" 
          }}
          className={`fixed font-bold text-lg pointer-events-none z-[120] ${
            change.amount > 0 
              ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]' 
              : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]'
          }`}
          style={{
            left: change.x,
            top: change.y
          }}
        >
          {change.amount > 0 ? '+' : ''}{change.amount} {change.stat.toUpperCase()}
        </motion.div>
      ))}
    </>
  );
}