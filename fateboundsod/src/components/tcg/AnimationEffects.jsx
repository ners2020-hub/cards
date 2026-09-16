import React from 'react';
import { motion } from 'framer-motion';

export const AbilityActivationEffect = ({ position, element }) => {
  const elementEmojis = {
    blood: '🩸', fire: '🔥', water: '💧', wind: '💨', 
    earth: '🌿', light: '☀️', shadow: '🌑', electric: '⚡', cryo: '❄️'
  };
  
  return (
    <>
      {/* Center burst */}
      <motion.div
        initial={{ scale: 0, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 rounded-full border-2 border-purple-400"
        style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
      />
      
      {/* Particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: Math.cos((i / 6) * Math.PI * 2) * 60,
            y: Math.sin((i / 6) * Math.PI * 2) * 60,
            opacity: 0
          }}
          transition={{ duration: 0.6 }}
          className="absolute text-2xl"
          style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
        >
          {elementEmojis[element] || '✨'}
        </motion.div>
      ))}
    </>
  );
};

export const ControllerAbilityGlow = () => {
  return (
    <motion.div
      className="absolute inset-0 rounded-lg border-2 border-purple-400"
      animate={{ 
        boxShadow: [
          '0 0 10px rgba(168, 85, 247, 0.3)',
          '0 0 25px rgba(168, 85, 247, 0.6)',
          '0 0 10px rgba(168, 85, 247, 0.3)'
        ]
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
};

export const CreatureSummonEffect = ({ index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.6 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 20,
        delay: index * 0.1
      }}
      className="absolute inset-0"
    >
      <motion.div
        animate={{ boxShadow: ['0 0 0px rgba(168, 85, 247, 0)', '0 0 20px rgba(168, 85, 247, 0.6)', '0 0 0px rgba(168, 85, 247, 0)'] }}
        transition={{ duration: 0.6, times: [0, 0.5, 1] }}
        className="w-full h-full"
      />
    </motion.div>
  );
};

export const AttackPulse = ({ color = '#06b6d4' }) => {
  return (
    <motion.div
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="absolute inset-0 rounded-lg border-2"
      style={{ borderColor: color }}
    />
  );
};