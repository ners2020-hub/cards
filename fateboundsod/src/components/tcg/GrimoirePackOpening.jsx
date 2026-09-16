import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function GrimoirePackOpening({ cards, onComplete }) {
  const [stage, setStage] = useState('grimoire'); // 'grimoire', 'opening', 'cards'
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (stage === 'opening') {
      const timer = setTimeout(() => setStage('cards'), 1000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-hidden"
    >
      {/* Grimoire Stage */}
      {stage === 'grimoire' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-48 h-64 flex items-center justify-center cursor-pointer"
          onClick={() => setStage('opening')}
        >
          {/* Grimoire Book */}
          <motion.div
            animate={{ rotateY: [0, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative w-full h-full"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg shadow-2xl border-2 border-purple-700 flex flex-col items-center justify-center"
              style={{
                boxShadow: '0 0 40px rgba(168, 85, 247, 0.6), inset 0 0 20px rgba(168, 85, 247, 0.2)'
              }}
            >
              <div className="text-6xl mb-3">📖</div>
              <div className="text-purple-300 font-bold text-sm tracking-widest">GRIMOIRE</div>
              <div className="text-purple-400 text-xs mt-2">Click to open</div>
            </div>
          </motion.div>

          {/* Floating Particles Around Grimoire */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-purple-500"
              animate={{
                x: Math.cos((i / 8) * Math.PI * 2) * 80,
                y: Math.sin((i / 8) * Math.PI * 2) * 80,
                opacity: [0.3, 0.8, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Opening Stage */}
      {stage === 'opening' && (
        <motion.div
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 1.2, opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="relative w-48 h-64"
        >
          {/* Grimoire Breaking */}
          <motion.div
            animate={{ rotateX: 180, opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg"
            style={{
              boxShadow: '0 0 60px rgba(168, 85, 247, 0.8)'
            }}
          />

          {/* Light Explosion */}
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-lg"
              initial={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, transparent 70%)',
                opacity: 1,
                scale: 1
              }}
              animate={{
                opacity: 0,
                scale: 2
              }}
              transition={{
                duration: 0.8,
                delay: i * 0.05
              }}
            />
          ))}

          {/* Light Rays */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`ray-${i}`}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-32 bg-gradient-to-t from-purple-400 to-transparent"
              style={{
                transform: `translate(-50%, -50%) rotate(${(i / 8) * 360}deg)`
              }}
              animate={{
                opacity: [0.8, 0],
                height: [128, 256]
              }}
              transition={{
                duration: 0.8
              }}
            />
          ))}

          {/* Particle Burst */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute left-1/2 top-1/2 w-3 h-3 rounded-full bg-purple-400"
              initial={{
                x: 0,
                y: 0,
                opacity: 1
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                opacity: 0
              }}
              transition={{
                duration: 0.8,
                ease: 'easeOut'
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Cards Stage */}
      {stage === 'cards' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full max-w-4xl"
        >
          <h2 className="text-3xl font-bold text-purple-400 mb-8 text-center">🎁 Cards Revealed!</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-6 mb-8 place-items-center max-h-[400px] overflow-y-auto p-4">
            {cards && cards.length > 0 ? cards.map((card, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  scale: 0,
                  y: -200,
                  rotateZ: (Math.random() - 0.5) * 360
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  rotateZ: 0
                }}
                transition={{
                  type: 'spring',
                  delay: i * 0.1,
                  stiffness: 100,
                  damping: 12
                }}
                onAnimationComplete={() => {
                  if (i === cards.length - 1) {
                    setRevealedCount(cards.length);
                  }
                }}
              >
                <motion.div
                  className="w-32 bg-gradient-to-br from-purple-900 to-indigo-900 rounded-lg border-2 border-purple-500 p-3 text-center shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  style={{
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)'
                  }}
                >
                  {(card.art_url || card.image_url) && (
                    <img 
                      src={card.art_url || card.image_url} 
                      alt={card.name}
                      className="w-full h-40 object-cover rounded mb-2"
                    />
                  )}
                  <p className="text-white text-xs font-bold mb-1 truncate">{card.name}</p>
                  <p className="text-purple-300 text-[10px] capitalize">{card.element}</p>
                  <p className="text-amber-400 text-[10px] capitalize">{card.card_type}</p>
                </motion.div>
              </motion.div>
            )) : (
              <div className="text-white text-center col-span-full">No cards to display</div>
            )}
          </div>

          {revealedCount === cards.length && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center gap-4"
            >
              <Button
                onClick={onComplete}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-[0_0_20px_rgba(168,85,247,0.8)]"
              >
                Continue
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}