import React from 'react';
import { motion } from 'framer-motion';

export const ArcaneParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(40)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: `${2 + Math.random() * 4}px`,
          height: `${2 + Math.random() * 4}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: ['rgba(34, 211, 238, 0.5)', 'rgba(251, 146, 60, 0.5)', 'rgba(168, 85, 247, 0.5)'][i % 3],
          boxShadow: ['0 0 15px rgba(34, 211, 238, 0.8)', '0 0 15px rgba(251, 146, 60, 0.8)', '0 0 15px rgba(168, 85, 247, 0.8)'][i % 3],
        }}
        animate={{
          y: [0, -60, 0],
          x: [0, Math.sin(i) * 30, 0],
          opacity: [0.2, 0.6, 0.2],
          scale: [0.8, 1.3, 0.8],
        }}
        transition={{
          duration: 6 + Math.random() * 4,
          repeat: Infinity,
          delay: Math.random() * 4,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

export const ArcaneSignil = () => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
    animate={{ rotate: [0, 360] }}
    transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
  >
    <svg viewBox="0 0 400 400" className="w-full h-full opacity-5 text-purple-400" style={{ maxWidth: '80vh', maxHeight: '80vh' }}>
      {/* Outer rings */}
      <circle cx="200" cy="200" r="190" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="200" cy="200" r="160" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <circle cx="200" cy="200" r="130" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      
      {/* Geometric points */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = 200 + Math.cos(angle) * 180;
        const y = 200 + Math.sin(angle) * 180;
        return (
          <circle key={i} cx={x} cy={y} r="4" fill="currentColor" opacity="0.3" />
        );
      })}
      
      {/* Inner star pattern */}
      {[...Array(5)].map((_, i) => {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const x1 = 200 + Math.cos(angle) * 80;
        const y1 = 200 + Math.sin(angle) * 80;
        const nextAngle = ((i + 1) / 5) * Math.PI * 2 - Math.PI / 2;
        const x2 = 200 + Math.cos(nextAngle) * 80;
        const y2 = 200 + Math.sin(nextAngle) * 80;
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="1" opacity="0.4" />
        );
      })}
    </svg>
  </motion.div>
);

export const ArcaneFrame = ({ children, className = '' }) => (
  <div className={`relative ${className}`}>
    {/* Glow aura */}
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-600/10 via-transparent to-orange-600/10 blur-xl pointer-events-none" />
    
    {/* Outer glow border */}
    <div className="absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br from-purple-500/30 via-transparent to-orange-500/30 p-[2px] pointer-events-none">
      {/* Inner border */}
      <div className="absolute inset-0 rounded-2xl border border-purple-400/40 m-[2px]" />
    </div>
    
    {/* Content */}
    <div className="relative z-10">
      {children}
    </div>
  </div>
);

// NOTE: Avoid passing unknown props (like `active`) to the DOM.
// Use data-* attributes instead so React doesn't warn.
export const MagicalButton = ({ children, onClick, variant = 'primary', className = '', active, ...props }) => {
  const isPrimary = variant === 'primary';
  
  return (
    <motion.button
      onClick={onClick}
      className={`relative font-semibold tracking-wider text-sm px-6 py-3 rounded-lg overflow-hidden group transition-all duration-300 ${className}`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      data-active={active ? 'true' : undefined}
      {...props}
    >
      {/* Glow effect */}
      <div className={`absolute inset-0 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
        isPrimary 
          ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500' 
          : 'bg-gradient-to-r from-purple-500 to-pink-500'
      }`} style={{ zIndex: -1 }} />
      
      {/* Moving border glow */}
      <motion.div
        className={`absolute inset-0 rounded-lg border-2 opacity-0 group-hover:opacity-100 transition-opacity ${
          isPrimary
            ? 'border-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-orange-400 bg-clip-border'
            : 'border-purple-400/60'
        }`}
        initial={{ backgroundPosition: '0% 50%' }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      
      {/* Content */}
      <div className={`relative z-10 flex items-center justify-center gap-2 ${
        isPrimary
          ? 'bg-gradient-to-b from-slate-800 to-slate-900 text-transparent bg-clip-text'
          : 'text-slate-200'
      }`}>
        {children}
      </div>
    </motion.button>
  );
};