import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, X, Lightbulb, Target } from 'lucide-react';

const TUTORIAL_STEPS = {
  basic_gameplay: [
    {
      id: 'welcome',
      title: 'Welcome to FATEBOUND: Shards of Dominion!',
      description: 'Learn the basics of this strategic card game. Your goal is to destroy all 3 enemy Controllers to win!',
      highlight: null,
      position: 'center'
    },
    {
      id: 'controllers',
      title: 'Controllers - Your Leaders',
      description: 'CRITICAL: You have 3 controllers in your resting zone (bottom left). You MUST activate one on your first turn or you instantly lose! Click one now to activate it.',
      highlight: 'resting-controllers',
      position: 'left',
      action: 'activate_controller'
    },
    {
      id: 'shards',
      title: 'Shard System - No Cap!',
      description: 'You start with 10 Shards and gain +1 each turn. Shards can now exceed 10! Save them for powerful plays.',
      highlight: 'shards',
      position: 'center'
    },
    {
      id: 'controller_health',
      title: 'Controller Health',
      description: 'Controller Health (CH) can exceed maximum! Cards like Fire Paladin heal your controller when destroying enemies.',
      highlight: 'player-controllers',
      position: 'bottom'
    },
    {
      id: 'hand',
      title: 'Your Hand',
      description: 'These are your cards. Click any card to see options: Play (if you have enough Shards) or View for details.',
      highlight: 'hand',
      position: 'bottom',
      action: 'view_card'
    },
    {
      id: 'play_card',
      title: 'Playing Cards',
      description: 'Click a card and select "Play" to summon it to the battlefield. Try playing a creature now!',
      highlight: 'hand',
      position: 'bottom',
      action: 'play_creature'
    },
    {
      id: 'phases',
      title: 'Turn Phases',
      description: 'Each turn has phases: Draw → Energy (+1 Shard) → Main (play cards) → Combat → End Turn.',
      highlight: 'phase-indicator',
      position: 'right'
    },
    {
      id: 'combat',
      title: 'Combat Basics',
      description: 'During Combat phase, click your creatures to attack. Target enemy creatures or their Controller directly if they have no creatures!',
      highlight: 'creatures',
      position: 'center',
      action: 'attack'
    },
    {
      id: 'stats',
      title: 'Card Stats',
      description: 'Cards have AP (Attack Power) ⚔️ and CH (Constitution/Health) 🛡️. When creatures fight, they deal their AP as damage to each other.',
      highlight: 'creatures',
      position: 'center'
    },
    {
      id: 'abilities',
      title: 'Controller Abilities',
      description: 'Active Controllers have Passive (always on) and Active (costs Shards) abilities. Use them strategically!',
      highlight: 'player-controllers',
      position: 'bottom'
    },
    {
      id: 'victory',
      title: 'Victory Condition',
      description: 'Destroy all 3 enemy Controllers to win! Only the active Controller can be attacked.',
      highlight: 'opponent-controllers',
      position: 'top'
    }
  ],
  advanced_mechanics: [
    {
      id: 'keywords',
      title: 'Keywords',
      description: 'Cards have special keywords: Guardian (must be attacked first), Charge (attack immediately), Stealth (bypass blockers), and more!',
      highlight: null,
      position: 'center'
    },
    {
      id: 'abilities',
      title: 'Controller Abilities',
      description: 'Active Controllers have special abilities. Click "Ability" button during Attack phase to use them. Each costs Shards.',
      highlight: 'ability-button',
      position: 'right'
    },
    {
      id: 'artifacts',
      title: 'Artifacts & Spells',
      description: 'Artifacts stay on the field and provide ongoing effects. Spells have instant effects and go to the graveyard.',
      highlight: 'artifacts',
      position: 'center'
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
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className={`absolute pointer-events-auto ${
            step.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
            step.position === 'top' ? 'top-20 left-1/2 -translate-x-1/2' :
            step.position === 'bottom' ? 'bottom-20 left-1/2 -translate-x-1/2' :
            step.position === 'left' ? 'left-20 top-1/2 -translate-y-1/2' :
            'right-20 top-1/2 -translate-y-1/2'
          } max-w-md w-full mx-4`}
        >
          <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl border-2 border-purple-400 shadow-2xl p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-purple-500/30 rounded-lg">
                <Lightbulb className="w-6 h-6 text-purple-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-purple-200 mb-2">{step.title}</h3>
                <p className="text-purple-100 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>

            {step.action && !actionCompleted && (
              <div className="mb-4 p-3 bg-amber-600/20 border border-amber-500/50 rounded-lg">
                <div className="flex items-center gap-2 text-amber-300 text-sm">
                  <Target className="w-4 h-4" />
                  <span className="font-semibold">Action Required: Complete the step to continue</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <div className="text-purple-300 text-sm">
                Step {currentStep + 1} of {steps.length}
              </div>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button
                    onClick={onPrev}
                    size="sm"
                    variant="outline"
                    className="border-purple-400 text-purple-200"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                )}
                {currentStep < steps.length - 1 ? (
                  <Button
                    onClick={onNext}
                    size="sm"
                    disabled={!canProceed}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Next <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button
                    onClick={onComplete}
                    size="sm"
                    disabled={!canProceed}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Complete
                  </Button>
                )}
                <Button
                  onClick={onSkip}
                  size="sm"
                  variant="ghost"
                  className="text-purple-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="mt-4 flex gap-1">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i <= currentStep ? 'bg-purple-400' : 'bg-purple-800/50'
                  }`}
                />
              ))}
            </div>
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