import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Swords, Shield, Zap, Crown } from 'lucide-react';

const TOOLTIPS = {
  guardian: {
    title: 'Guardian',
    icon: Shield,
    description: 'This creature must be destroyed before you can attack the Controller or other creatures.',
    color: 'blue'
  },
  charge: {
    title: 'Charge/Haste',
    icon: Zap,
    description: 'This creature can attack on the same turn it is summoned.',
    color: 'yellow'
  },
  stealth: {
    title: 'Stealth',
    icon: Swords,
    description: 'This creature can bypass enemy creatures and attack the Controller directly.',
    color: 'purple'
  },
  first_strike: {
    title: 'First Strike',
    icon: Swords,
    description: 'When attacking with higher AP, this creature takes no recoil damage.',
    color: 'red'
  },
  reaction: {
    title: 'Reaction',
    icon: Zap,
    description: 'Can be played during opponent\'s turn in response to actions.',
    color: 'cyan'
  },
  controller: {
    title: 'Controller',
    icon: Crown,
    description: 'Your leader. Has Passive (always active) and Active (costs Shards) abilities. Destroy all 3 enemy Controllers to win!',
    color: 'purple'
  },
  phase_summon: {
    title: 'Summon Phase',
    icon: Zap,
    description: 'Play cards from your hand. Must have an active Controller first!',
    color: 'green'
  },
  phase_attack: {
    title: 'Attack Phase',
    icon: Swords,
    description: 'Click your creatures to attack enemies. Use Controller abilities here too.',
    color: 'red'
  }
};

export default function TooltipHelper({ keyword, children, enabled = true }) {
  const [show, setShow] = React.useState(false);
  const tooltip = TOOLTIPS[keyword];

  if (!enabled || !tooltip) return children;

  const Icon = tooltip.icon;
  const colorClasses = {
    blue: 'from-blue-600 to-cyan-600 border-blue-400',
    yellow: 'from-yellow-600 to-amber-600 border-yellow-400',
    purple: 'from-purple-600 to-pink-600 border-purple-400',
    red: 'from-red-600 to-rose-600 border-red-400',
    cyan: 'from-cyan-600 to-blue-600 border-cyan-400',
    green: 'from-green-600 to-emerald-600 border-green-400'
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        {children}
      </div>

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[70] pointer-events-none"
          >
            <div className={`bg-gradient-to-br ${colorClasses[tooltip.color]} rounded-xl border-2 shadow-2xl p-4 min-w-[250px] max-w-[300px]`}>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-bold mb-1">{tooltip.title}</h4>
                  <p className="text-white/90 text-xs leading-relaxed">{tooltip.description}</p>
                </div>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                <div className={`w-3 h-3 rotate-45 bg-gradient-to-br ${colorClasses[tooltip.color]}`} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}