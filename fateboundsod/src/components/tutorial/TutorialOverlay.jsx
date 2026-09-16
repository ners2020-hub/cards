import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, X, Lightbulb, Target } from 'lucide-react';

const TUTORIAL_STEPS = {
  basic_gameplay: [
    {
      id: 'welcome',
      title: '⚔️ Welcome to FATEBOUND: Shards of Dominion!',
      description: 'You\'re about to enter an epic strategic battle! Your goal: destroy all 3 enemy Controllers. Let\'s learn how to play.',
      highlight: null,
      position: 'center',
      tips: '💡 This battle teaches you the fundamentals of the game.'
    },
    {
      id: 'controllers',
      title: '👑 Controllers - Your Leaders',
      description: '🚨 CRITICAL: You have 3 controllers in your resting zone (bottom left). You MUST activate one immediately on your first turn or you lose instantly! Click one now to begin.',
      highlight: 'resting-controllers',
      position: 'left',
      action: 'activate_controller',
      tips: '⚠️ Controllers are your life force. When all 3 are destroyed, you lose!'
    },
    {
      id: 'shards',
      title: '💎 Shard System - Your Mana',
      description: 'You start with 10 Shards and gain +1 each turn. Spend Shards to play cards, use abilities, and execute powerful strategies. Manage them wisely!',
      highlight: 'shards',
      position: 'center',
      tips: '💡 Run out of Shards? You\'ll have to wait for your next turn!'
    },
    {
      id: 'hand',
      title: '🃏 Your Hand - Cards at Your Command',
      description: 'These are your cards ready to play. RIGHT-CLICK any card to view full details. LEFT-CLICK to play when you have Shards and an active Controller.',
      highlight: 'hand',
      position: 'bottom',
      action: 'view_card',
      tips: '✨ Different card colors = different card types (Creatures, Spells, Artifacts)'
    },
    {
      id: 'play_card',
      title: '🎯 Playing Cards - Build Your Army',
      description: 'Click a card in your hand and play it to the board. Creatures need an empty slot. Spells resolve instantly. Artifacts stay on the field!',
      highlight: 'hand',
      position: 'bottom',
      action: 'play_creature',
      tips: '🔥 Playing cards uses Shards - check the cost in the top-right of each card!'
    },
    {
      id: 'phases',
      title: '🔄 Turn Phases - The Game Flow',
      description: 'DRAW → ENERGY (+1 Shard) → MAIN (play cards) → COMBAT (attack) → END TURN. Master this cycle to dominate!',
      highlight: 'phase-indicator',
      position: 'right',
      tips: '📋 The phase indicator (top right) tells you exactly where in your turn you are.'
    },
    {
      id: 'combat',
      title: '⚔️ Combat Phase - Time to Attack!',
      description: 'Click your creature/controller to select it, then click an enemy to attack. Each unit attacks once per turn (unless special effects allow more).',
      highlight: 'creatures',
      position: 'center',
      action: 'attack',
      tips: '🎮 A confirmation popup will appear - check the damage before attacking!'
    },
    {
      id: 'recoil',
      title: '💥 Combat Damage - The Exchange',
      description: 'When creatures fight, both deal damage simultaneously! If your Controller attacks, it takes recoil damage from the defending creature\'s AP.',
      highlight: 'creatures',
      position: 'center',
      tips: '⚠️ Be careful! Your Controller can take heavy damage in combat!'
    },
    {
      id: 'guardian',
      title: '🛡️ Guardian Keyword - The Defender',
      description: 'Creatures with Guardian MUST be destroyed before you can attack other creatures or Controllers. Plan your attacks carefully around these defenders!',
      highlight: 'creatures',
      position: 'center',
      tips: '🎯 Look for the "GUARD" label on creature cards.'
    },
    {
      id: 'abilities',
      title: '⚡ Controller Abilities - Special Powers',
      description: 'Active Controllers have Passive abilities (always active) and Active abilities (click "Controller Ability" button during Combat to use them). They cost Shards!',
      highlight: 'player-controllers',
      position: 'bottom',
      tips: '💪 Abilities can heal, damage enemies, boost creatures, and more!'
    },
    {
      id: 'victory',
      title: '🏆 Victory Condition - The Goal',
      description: 'Destroy all 3 enemy Controllers to achieve VICTORY! Remember: activate a Controller on turn 1 or you lose instantly.',
      highlight: 'opponent-controllers',
      position: 'top',
      tips: '🎉 You\'re ready! Let\'s play!'
    }
  ],
  advanced_mechanics: [
    {
      id: 'keywords_intro',
      title: '✨ Special Keywords - Card Powers',
      description: 'Cards have special keywords that grant unique abilities. Master these to unlock powerful strategies!',
      highlight: null,
      position: 'center'
    },
    {
      id: 'keywords',
      title: '🔑 Keyword Examples',
      description: '🛡️ Guardian (must destroy first) • ⚡ Charge (attack immediately when played) • 👻 Stealth (blocks enemy attacks) • 💨 Haste (attack turn played).',
      highlight: null,
      position: 'center',
      tips: '📖 Check card descriptions to see all keywords!'
    },
    {
      id: 'controller_abilities',
      title: '👑 Advanced Controller Abilities',
      description: 'Controllers can activate special abilities during Combat. These cost Shards but provide powerful effects: healing, damage, stat boosts, and board control!',
      highlight: 'ability-button',
      position: 'right',
      tips: '🎯 Use abilities strategically to turn the tide of battle!'
    },
    {
      id: 'artifacts',
      title: '🎨 Artifacts & Persistent Spells',
      description: 'Artifacts stay on the battlefield providing ongoing effects each turn. Persistent Spells work similarly. Regular Spells resolve instantly and go to the graveyard.',
      highlight: 'artifacts',
      position: 'center',
      tips: '⚙️ Some artifacts attach to creatures for equipment bonuses!'
    },
    {
      id: 'element_synergy',
      title: '🌟 Element Synergies - Power Combos',
      description: 'Cards of the same element work better together! Fire creatures boost each other, Water creatures protect allies, etc. Build decks around element synergies!',
      highlight: null,
      position: 'center',
      tips: '🔥💧 Same-element creatures on board = bonus stats!'
    },
    {
      id: 'synergy',
      title: '🎭 Card Synergies - Create Combos',
      description: 'Many cards trigger special effects when other specific cards are in play. Controllers can boost creatures, combo cards chain effects, and unique interactions unlock hidden power!',
      highlight: null,
      position: 'center',
      tips: '💡 Read card descriptions carefully - powerful combos await!'
    }
  ]
};

export default function TutorialOverlay({ lessonType, currentStep, onNext, onPrev, onSkip, onComplete, actionCompleted }) {
  const steps = TUTORIAL_STEPS[lessonType] || [];
  const step = steps[currentStep];

  if (!step) return null;

  const canProceed = !step.action || actionCompleted;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] pointer-events-none"
      >
        {/* Dimmed overlay with highlight */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-auto" onClick={onSkip} />
        
        {/* Tutorial Card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300 }}
          className={`absolute pointer-events-auto ${
            step.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
            step.position === 'top' ? 'top-20 left-1/2 -translate-x-1/2' :
            step.position === 'bottom' ? 'bottom-20 left-1/2 -translate-x-1/2' :
            step.position === 'left' ? 'left-20 top-1/2 -translate-y-1/2' :
            'right-20 top-1/2 -translate-y-1/2'
          } max-w-md w-full mx-4`}
        >
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 rounded-2xl border-2 border-purple-400 shadow-2xl shadow-purple-500/50 p-6">
            <div className="flex items-start gap-3 mb-4">
              <motion.div 
                className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Lightbulb className="w-6 h-6 text-white" />
              </motion.div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-purple-100 mb-2">{step.title}</h3>
                <p className="text-purple-100/90 text-sm leading-relaxed">{step.description}</p>
                {step.tips && (
                  <p className="text-xs text-purple-200/60 mt-2 italic">{step.tips}</p>
                )}
              </div>
            </div>

            {step.action && !actionCompleted && (
              <motion.div 
                className="mb-4 p-3 bg-amber-600/30 border-2 border-amber-400/60 rounded-lg"
                animate={{ boxShadow: ['0 0 10px rgba(217, 119, 6, 0.3)', '0 0 20px rgba(217, 119, 6, 0.6)', '0 0 10px rgba(217, 119, 6, 0.3)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="flex items-center gap-2 text-amber-200 text-sm font-semibold">
                  <Target className="w-4 h-4 animate-pulse" />
                  <span>⚡ Action Required: Complete to continue</span>
                </div>
              </motion.div>
            )}

            <div className="flex items-center justify-between gap-3 mt-4">
              <div className="text-purple-300 text-xs font-bold">
                STEP {currentStep + 1}/{steps.length}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onPrev}
                      size="sm"
                      variant="outline"
                      className="border-purple-400 text-purple-200 hover:bg-purple-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </motion.div>
                )}
                {currentStep < steps.length - 1 ? (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onNext}
                      size="sm"
                      disabled={!canProceed}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 font-bold disabled:opacity-50"
                    >
                      Next <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={onComplete}
                      size="sm"
                      disabled={!canProceed}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold disabled:opacity-50"
                    >
                      ✓ Complete
                    </Button>
                  </motion.div>
                )}
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={onSkip}
                    size="sm"
                    variant="ghost"
                    className="text-purple-300 hover:text-purple-100 hover:bg-purple-700/50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </motion.div>
              </div>
            </div>

            <motion.div className="mt-4 flex gap-1">
              {steps.map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    i < currentStep ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    i === currentStep ? 'bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg shadow-purple-400/50' :
                    'bg-purple-800/40'
                  }`}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>

        {/* Highlight specific areas */}
        {step.highlight === 'resting-controllers' && (
          <div className="absolute bottom-4 left-4 pointer-events-none">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-64 border-4 border-purple-400 rounded-xl shadow-lg shadow-purple-500/50"
            />
          </div>
        )}
        
        {step.highlight === 'hand' && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none w-full max-w-4xl">
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-32 border-4 border-purple-400 rounded-t-xl shadow-lg shadow-purple-500/50"
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}