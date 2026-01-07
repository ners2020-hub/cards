import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Swords, Shield, Zap } from 'lucide-react';
import GameCard from './GameCard';
import ControllerSlot from './ControllerSlot';
import TargetingLine from './TargetingLine';
import { Button } from '@/components/ui/button';
import TooltipHelper from '../tutorial/TooltipHelper';

const elementConfig = {
  blood: { color: '#ef4444', gradient: 'from-red-600 to-rose-700', icon: '🩸' },
  wind: { color: '#06b6d4', gradient: 'from-cyan-500 to-teal-600', icon: '💨' },
  light: { color: '#fbbf24', gradient: 'from-amber-400 to-yellow-500', icon: '☀️' },
  fire: { color: '#f97316', gradient: 'from-orange-500 to-red-600', icon: '🔥' },
  shadow: { color: '#a855f7', gradient: 'from-purple-900 to-indigo-900', icon: '🌑' },
  electric: { color: '#eab308', gradient: 'from-yellow-400 to-blue-500', icon: '⚡' },
  cryo: { color: '#60a5fa', gradient: 'from-blue-400 to-cyan-500', icon: '❄️' },
  earth: { color: '#d97706', gradient: 'from-amber-700 to-stone-800', icon: '🌿' },
  water: { color: '#3b82f6', gradient: 'from-blue-500 to-indigo-600', icon: '💧' }
};

const getElementColor = (element) => elementConfig[element]?.color || '#f97316';
const getElementGradient = (element) => elementConfig[element]?.gradient || 'from-orange-500 to-red-600';
const getElementIcon = (element) => elementConfig[element]?.icon || '🔥';

export default function GameBoard({ 
  gameState, 
  isPlayer, 
  onCardPlay, 
  onCardClick,
  onAttack,
  onEndPhase,
  onControllerAbility,
  onControllerActivate,
  aiActionLog = []
}) {
  const [selectedCreature, setSelectedCreature] = React.useState(null);
  const [abilityMode, setAbilityMode] = React.useState(false);
  const [viewingCard, setViewingCard] = React.useState(null);
  const [mousePosition, setMousePosition] = React.useState(null);
  const [attackAnimation, setAttackAnimation] = React.useState(null);
  const [attackConfirm, setAttackConfirm] = React.useState(null);
  const [showGraveyard, setShowGraveyard] = React.useState(null);
  const [combatLog, setCombatLog] = React.useState([]);
  const [destroyingCards, setDestroyingCards] = React.useState([]);
  const creatureRefs = React.useRef({});
  const castingSpell = gameState?.castingSpell;
  const playerState = isPlayer ? gameState.playerState : gameState.opponentState;
  const opponentState = isPlayer ? gameState.opponentState : gameState.playerState;
  const isMyTurn = gameState.isMyTurn;

  // Track mouse position for targeting line
  React.useEffect(() => {
    if (!selectedCreature) {
      setMousePosition(null);
      return;
    }

    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [selectedCreature]);

  // Get targeting element from refs
  const targetingElement = selectedCreature ? creatureRefs.current[`player-${selectedCreature.index}`] : null;

  const handleDragEnd = (result) => {
    // Disable drag and drop - use click-based menu instead
    return;
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden flex flex-col relative">
        {/* Logo Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f8062dfb3_Fateboundlogo.png"
            alt="Fatebound"
            className="w-full h-full object-contain opacity-50"
          />
        </div>
        
        {/* Opponent Area */}
        <div className="p-3 border-b border-slate-800 bg-rose-950/10 relative">
          {/* Opponent Label - Left Side */}
          <div className="absolute left-2 top-2 md:left-4 md:top-4 z-10">
            <span className="px-2 py-1 md:px-4 md:py-2 bg-rose-900/80 text-rose-200 text-xs md:text-sm font-bold rounded-lg border-2 border-rose-700 shadow-lg">
              OPPONENT
            </span>
          </div>
          
          {/* Opponent Controllers */}
          <div className="flex justify-center gap-2 mb-3">
            {opponentState.controllers.map((ctrl, i) => (
            <div 
              key={i} 
              className="scale-75 sm:scale-90 md:scale-100 relative cursor-pointer"
              onClick={() => {
                // Allow direct controller attack if no creatures on field
                if (selectedCreature && isMyTurn && gameState.phase === 'combat' && !opponentState.creatures.some(c => c !== null)) {
                  const attacker = selectedCreature.type === 'controller'
                    ? playerState.controllers[selectedCreature.index]
                    : playerState.creatures[selectedCreature.index];
                  
                  setAttackConfirm({
                    attacker,
                    target: ctrl,
                    attackerIndex: selectedCreature.index,
                    targetIndex: -1,
                    attackerType: selectedCreature.type
                  });
                }
              }}
            >
              <ControllerSlot 
                controller={ctrl}
                isEmpty={!ctrl}
                isOpponent={true}
                onView={() => ctrl && setViewingCard(ctrl)}
              />
              {selectedCreature && gameState.phase === 'combat' && !opponentState.creatures.some(c => c !== null) && ctrl && (
                <div className="absolute -inset-2 rounded-lg border-4 border-rose-500 animate-pulse pointer-events-none bg-rose-500/20">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-2 bg-rose-500 text-white text-sm font-bold rounded-lg shadow-lg whitespace-nowrap">
                    TAP TO ATTACK
                  </div>
                </div>
              )}
            </div>
            ))}
          </div>

          {/* Opponent Stats */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-white font-bold">{opponentState.shards}</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded">
              <span className="text-xs text-slate-400">Hand:</span>
              <span className="text-xs text-white font-bold">{opponentState.hand.length}</span>
            </div>
          </div>

          {/* Opponent Spell/Artifact Slots */}
          <Droppable droppableId="opponent-artifacts" direction="horizontal">
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex justify-center gap-1 mb-2 min-h-[3.5rem]"
              >
                {opponentState.artifacts.map((card, i) => (
                  <div key={i} className="scale-75 sm:scale-90 md:scale-100">
                    {card ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="relative"
                        >
                          <GameCard card={card} disabled={true} onView={() => setViewingCard(card)} />
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full animate-pulse" />
                        </motion.div>
                      ) : (
                        <div className="w-16 h-12 rounded-lg border-2 border-dashed border-slate-600/70 bg-slate-800/40" />
                      )}
                  </div>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Opponent Creature Slots */}
          <Droppable droppableId="opponent-creatures" direction="horizontal">
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex justify-center gap-1"
              >
                {opponentState.creatures.map((creature, i) => (
                    <div 
                     key={i} 
                     className="relative scale-75 sm:scale-90 md:scale-100"
                     ref={(el) => { creatureRefs.current[`opponent-${i}`] = el; }}
                    >
                     {creature ? (
                       <motion.div 
                         className="relative cursor-pointer"
                         animate={destroyingCards.includes(`opponent-${i}`) ? {
                           scale: [1, 1.2, 0],
                           rotate: [0, 10, -10, 0],
                           opacity: [1, 1, 0]
                         } : {}}
                         transition={{ duration: 0.8 }}
                         onClick={() => {
                           if (selectedCreature && isMyTurn && gameState.phase === 'combat') {
                             // Show attack confirmation
                             const attacker = selectedCreature.type === 'controller'
                               ? playerState.controllers[selectedCreature.index]
                               : playerState.creatures[selectedCreature.index];
                             const target = creature;

                             setAttackConfirm({
                               attacker,
                               target,
                               attackerIndex: selectedCreature.index,
                               targetIndex: i,
                               attackerType: selectedCreature.type
                             });
                           } else if (abilityMode && isMyTurn && gameState.phase === 'combat') {
                             onControllerAbility?.(i);
                             setAbilityMode(false);
                           }
                         }}
                       >
                         <GameCard 
                           card={creature.card}
                           modifiedStats={{ ap: creature.currentAP, ch: creature.currentCH }}
                           statusEffects={creature.statusEffects || []}
                           isZombified={creature.isZombified}
                           disabled={false}
                           onView={gameState.phase === 'combat' ? null : () => setViewingCard(creature.card)}
                         />
                         {selectedCreature && gameState.phase === 'combat' && (
                           <div className="absolute -inset-2 rounded-lg border-4 border-rose-500 animate-pulse pointer-events-none bg-rose-500/20">
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-2 bg-rose-500 text-white text-sm font-bold rounded-lg shadow-lg whitespace-nowrap">
                               TAP TO ATTACK
                             </div>
                           </div>
                         )}
                          {abilityMode && gameState.phase === 'combat' && (
                            <div>
                              {playerState.controllers.find(c => c && c.isActive)?.card.name === 'Supreme Fire Spirit' && creature.currentCH <= 4 && (
                                <div className="absolute inset-0 rounded-lg border-4 border-purple-500 animate-pulse pointer-events-none">
                                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-purple-500 text-white text-xs rounded shadow-lg">
                                    Valid Target
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <div className="w-20 h-28 rounded-lg border-2 border-dashed border-slate-600/70 bg-slate-800/40" />
                      )}
                    </div>
                  ))}
                {provided.placeholder}
                </div>
                )}
                </Droppable>

        </div>

        {/* Opponent Deck & Graveyard - Top Right */}
        <div className="absolute top-2 right-2 md:top-4 md:right-4 z-10 flex flex-col gap-1 md:gap-2">
          {/* Deck */}
          <div className="relative">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/235e4469e_00Draco_Alec_back.png" 
              alt="Opponent Deck"
              className="w-12 h-16 md:w-20 md:h-28 rounded-lg shadow-xl border-2 border-rose-500/50 opacity-80"
            />
            <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 bg-rose-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
              <span className="text-xs md:text-sm font-bold text-white">{opponentState.deckSize}</span>
            </div>
          </div>

          {/* Graveyard */}
          <button 
            className="relative group hover:scale-105 transition-transform"
            onClick={() => setShowGraveyard('opponent')}
          >
            <div className="w-12 h-16 md:w-20 md:h-28 rounded-lg shadow-xl border-2 border-purple-500/50 bg-slate-900/80 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-purple-400 text-xl md:text-2xl">💀</span>
            </div>
            <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 bg-purple-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
              <span className="text-xs md:text-sm font-bold text-white">{opponentState.graveyard.length}</span>
            </div>
          </button>
        </div>

        {/* Opponent Resting Controllers - Top Left */}
        <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10">
        <div className="text-[10px] md:text-xs text-rose-300 mb-1 md:mb-2 font-bold">RESTING</div>
        <div className="flex flex-col gap-1 md:gap-2">
          {opponentState.restingControllers.map((ctrl, i) => (
            <div key={i} className="opacity-80 scale-75 sm:scale-90 md:scale-100">
              <GameCard 
                card={ctrl}
                disabled={true}
                onView={() => setViewingCard(ctrl)}
              />
            </div>
          ))}
        </div>
        </div>

        {/* Player Deck & Graveyard - Bottom Right */}
        <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 z-10 flex flex-col gap-1 md:gap-2">
          {/* Graveyard */}
          <button 
            className="relative group hover:scale-105 transition-transform"
            onClick={() => setShowGraveyard('player')}
          >
            <div className="w-12 h-16 md:w-20 md:h-28 rounded-lg shadow-xl border-2 border-purple-500/50 bg-slate-900/80 flex items-center justify-center hover:opacity-100 transition-opacity">
              <span className="text-purple-400 text-xl md:text-2xl">💀</span>
            </div>
            <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 bg-purple-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
              <span className="text-xs md:text-sm font-bold text-white">{playerState.graveyard.length}</span>
            </div>
          </button>

          {/* Deck */}
          <div className="relative">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/235e4469e_00Draco_Alec_back.png" 
              alt="Player Deck"
              className="w-12 h-16 md:w-20 md:h-28 rounded-lg shadow-xl border-2 border-cyan-500/50"
            />
            <div className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-6 h-6 md:w-8 md:h-8 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
              <span className="text-xs md:text-sm font-bold text-slate-900">{playerState.deckSize}</span>
            </div>
          </div>
        </div>

        {/* Player Resting Controllers - Bottom Left */}
        <div className="absolute bottom-2 left-2 md:bottom-4 md:left-4 z-10">
        <div className="text-[10px] md:text-xs text-cyan-300 mb-1 md:mb-2 font-bold">RESTING</div>
        <div className="flex flex-col gap-1 md:gap-2">
          {playerState.restingControllers.map((ctrl, i) => (
            <div key={i} className="relative scale-75 sm:scale-90 md:scale-100">
              <GameCard 
                card={ctrl}
                canPlay={isMyTurn && gameState.phase === 'main' && playerState.shards >= ctrl.cost}
                onPlay={() => onControllerActivate?.(i)}
                onView={gameState.phase === 'combat' ? null : () => setViewingCard(ctrl)}
                disabled={!isMyTurn || gameState.phase !== 'main' || playerState.shards < ctrl.cost}
              />
            </div>
          ))}
        </div>
        </div>

        {/* Turn Counter & Phase Controls - Right Side */}
        <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-4 z-20 flex flex-col gap-2 md:gap-3 items-end">
          <div className="px-2 py-1 md:px-4 md:py-2 rounded-lg bg-slate-900/80 border border-slate-700 backdrop-blur">
            <div className="text-[10px] md:text-xs text-slate-400 text-center mb-0.5 md:mb-1">Turn</div>
            <div className="text-lg md:text-2xl font-bold text-cyan-400 text-center">{gameState.turnNumber}</div>
          </div>

          {/* Phase indicator and action buttons */}
          {isMyTurn && (
            <>
              <TooltipHelper keyword={`phase_${gameState.phase}`}>
                <div className="px-3 py-2 md:px-6 md:py-3 rounded-xl bg-slate-900/95 border-2 border-cyan-500 backdrop-blur-sm shadow-lg shadow-cyan-500/20">
                  <div className="text-xs md:text-sm text-cyan-300 mb-0.5 md:mb-1 text-center font-semibold">Phase</div>
                  <div className="text-base md:text-2xl font-bold text-cyan-400 uppercase text-center">{gameState.phase}</div>
                </div>
              </TooltipHelper>

              {/* Controller Ability Button */}
              {playerState.controllers.find(c => c && c.isActive) && gameState.phase === 'combat' && (
                <Button
                  onClick={() => {
                    setAbilityMode(!abilityMode);
                    setSelectedCreature(null);
                  }}
                  size="sm"
                  variant={abilityMode ? "default" : "outline"}
                  className={`w-full text-xs md:text-base ${abilityMode ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-500 text-purple-400'}`}
                >
                  {abilityMode ? 'Cancel' : 'Ability'}
                </Button>
              )}

              <div className="flex flex-col gap-1 md:gap-2">
                {gameState.phase === 'combat' && selectedCreature && (
                  <Button
                    onClick={() => setSelectedCreature(null)}
                    size="sm"
                    variant="outline"
                    className="border-slate-600 w-full text-xs md:text-base"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  onClick={onEndPhase}
                  size="sm"
                  className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-lg text-xs md:text-base px-3 md:px-6 w-full"
                >
                  {gameState.phase === 'draw' ? 'Draw Card →' :
                   gameState.phase === 'energy' ? 'Gain Shard →' :
                   gameState.phase === 'main' ? 'To Combat →' :
                   gameState.phase === 'combat' ? 'End Phase →' :
                   'End Turn →'}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Center Battle Area */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <Swords className="w-32 h-32 text-slate-500" />
            </div>
          </div>

          {/* Turn Status in Center */}
          <div className="relative z-[60] text-center">
            <motion.div
              key={gameState.turnNumber}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <div className={`text-3xl sm:text-4xl md:text-5xl font-bold mb-2 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${isMyTurn ? 'text-cyan-400' : 'text-rose-400'}`}>
                {isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
              </div>
              {isMyTurn && !playerState.controllers.some(c => c && c.isActive) && gameState.phase === 'main' && (
                <div className="text-lg sm:text-xl md:text-2xl text-amber-400 animate-pulse mt-2 drop-shadow-[0_0_10px_rgba(0,0,0,0.8)]">
                  ⚠️ Activate a Controller First
                </div>
              )}
              
              {/* Combat Log */}
              <AnimatePresence>
                {combatLog.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="mt-4 max-w-md mx-auto px-4"
                  >
                    <div className="bg-slate-900/95 border-2 border-cyan-500 rounded-lg p-3 sm:p-4 backdrop-blur-sm shadow-2xl">
                      <div className="space-y-2">
                        {combatLog.map((log, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="text-white text-base sm:text-lg md:text-xl font-medium flex items-center gap-2"
                          >
                            <span className="text-cyan-400">▸</span>
                            {log}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* AI Action Log */}
              {!isMyTurn && aiActionLog.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 max-w-md mx-auto px-4"
                >
                  <div className="bg-rose-950/90 border-2 border-rose-500 rounded-lg p-3 backdrop-blur-sm">
                    <div className="text-rose-300 text-sm sm:text-base font-bold mb-2 uppercase tracking-wide">AI Actions:</div>
                    <div className="space-y-1">
                      {aiActionLog.map((action, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="text-white text-base sm:text-lg font-medium flex items-center gap-2"
                        >
                          <span className="text-rose-400">▸</span>
                          {action}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Player Area */}
        <div className="p-3 border-t border-slate-800 bg-cyan-950/10 relative">
          {/* Player Label - Left Side */}
          <div className="absolute left-2 bottom-2 md:left-4 md:bottom-4 z-10">
            <span className="px-2 py-1 md:px-4 md:py-2 bg-cyan-900/80 text-cyan-200 text-xs md:text-sm font-bold rounded-lg border-2 border-cyan-700 shadow-lg">
              YOU
            </span>
          </div>
          
          {/* Player Creature Slots */}
          <Droppable droppableId="board-creature" direction="horizontal">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex justify-center gap-1 mb-2 transition-colors ${
                  snapshot.isDraggingOver ? 'bg-cyan-900/20' : ''
                }`}
              >
                {playerState.creatures.map((creature, i) => (
                  <div 
                    key={i} 
                    className="relative scale-75 sm:scale-90 md:scale-100"
                    ref={(el) => { 
                      creatureRefs.current[`player-${i}`] = el; 
                      if (creature) creatureRefs.current[`opponent-${i}`] = null;
                    }}
                  >
                    {creature ? (
                      <motion.div 
                        className="relative"
                        animate={destroyingCards.includes(`player-${i}`) ? {
                          scale: [1, 1.2, 0],
                          rotate: [0, -10, 10, 0],
                          opacity: [1, 1, 0]
                        } : {}}
                        transition={{ duration: 0.8 }}
                      >
                        <GameCard 
                          card={creature.card}
                          modifiedStats={{ ap: creature.currentAP, ch: creature.currentCH }}
                          statusEffects={creature.statusEffects || []}
                          isZombified={creature.isZombified}
                          canAttack={isMyTurn && gameState.phase === 'combat' && creature.canAttack && !creature.hasAttacked && !gameState.firstTurnNoCombat && !creature.card.keywords?.includes('Guardian')}
                          onAttack={() => {
                            if (isMyTurn && gameState.phase === 'combat' && creature.canAttack && !creature.hasAttacked && !gameState.firstTurnNoCombat && !creature.card.keywords?.includes('Guardian')) {
                              setSelectedCreature({ type: 'creature', creature, index: i });
                            }
                          }}
                          onClick={() => {
                            if (abilityMode && isMyTurn && gameState.phase === 'combat') {
                              const activeCtrl = playerState.controllers.find(c => c && c.isActive);
                              if (activeCtrl?.card.name === 'Draco Alec' && creature.card.element === 'fire') {
                                onControllerAbility?.(i);
                                setAbilityMode(false);
                              }
                            }
                          }}
                          canPlay={creature.markedForDestruction}
                          onView={gameState.phase === 'combat' ? null : () => setViewingCard(creature.card)}
                        />
                        {selectedCreature?.type === 'creature' && selectedCreature?.index === i && (
                          <div className="absolute inset-0 rounded-lg border-4 border-cyan-500 pointer-events-none">
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-cyan-500 text-white text-xs rounded-full animate-pulse shadow-lg">
                              Selected
                            </div>
                          </div>
                        )}
                        {abilityMode && gameState.phase === 'combat' && playerState.controllers.find(c => c && c.isActive)?.card.name === 'Draco Alec' && creature.card.element === 'fire' && (
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-purple-500 text-white text-xs rounded shadow-lg pointer-events-none">
                            Valid Target
                          </div>
                        )}
                        {creature.markedForDestruction && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-orange-500 text-white text-xs rounded shadow-lg pointer-events-none">
                            2x Attack
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <div className="w-20 h-28 rounded-lg border-2 border-dashed border-slate-600/70 bg-slate-800/40 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Player Spell/Artifact Slots */}
          <Droppable droppableId="board-artifact" direction="horizontal">
            {(provided, snapshot) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex justify-center gap-1 mb-2 min-h-[3.5rem] transition-colors ${
                  snapshot.isDraggingOver ? 'bg-purple-900/20' : ''
                }`}
              >
                {playerState.artifacts.map((card, i) => (
                  <div key={i} className="scale-75 sm:scale-90 md:scale-100">
                    {card ? (
                      <motion.div
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        className="relative"
                      >
                        <GameCard 
                          card={card} 
                          onView={gameState.phase === 'combat' ? null : () => setViewingCard(card)}
                          onClick={() => onCardClick?.(card, 'artifact', i)} 
                        />
                        <motion.div 
                          className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full"
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </motion.div>
                    ) : (
                      <div className="w-16 h-12 rounded-lg border-2 border-dashed border-slate-600/70 bg-slate-800/40" />
                    )}
                  </div>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Player Stats */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-white font-bold">{playerState.shards}/10</span>
            </div>
          </div>

          {/* Player Controllers */}
          <div className="flex justify-center gap-2 mb-3">
            {playerState.controllers.map((controller, i) => (
              <div 
                key={i} 
                className="scale-75 sm:scale-90 md:scale-100 relative cursor-pointer"
                ref={(el) => { creatureRefs.current[`player-controller-${i}`] = el; }}
                onClick={() => {
                  // Controllers can attack during combat phase
                  if (isMyTurn && gameState.phase === 'combat' && controller?.isActive && controller.card.ap > 0) {
                    setSelectedCreature({ type: 'controller', index: i, controller });
                  }
                }}
              >
                <TooltipHelper keyword="controller">
                  <ControllerSlot
                    controller={controller}
                    isEmpty={!controller}
                    isActive={controller?.isActive}
                    onView={() => controller && setViewingCard(controller.card)}
                  />
                </TooltipHelper>
                {selectedCreature?.type === 'controller' && selectedCreature?.index === i && (
                  <div className="absolute -inset-2 rounded-lg border-4 border-cyan-500 pointer-events-none bg-cyan-500/20">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-2 bg-cyan-500 text-white text-sm font-bold rounded-lg shadow-lg whitespace-nowrap">
                      SELECTED
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Player Hand */}
        <Droppable droppableId="hand" direction="horizontal">
          {(provided) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="p-2 bg-slate-950/80 border-t border-slate-800 overflow-x-auto"
            >
              <div className="flex justify-center gap-0 sm:gap-1 min-w-max px-2">
                {playerState.hand.map((card, i) => (
                  <div key={i} className="scale-50 sm:scale-75 md:scale-90 lg:scale-100">
                    <GameCard 
                      card={card}
                      inHand={true}
                      canPlay={isMyTurn && gameState.phase === 'main' && playerState.shards >= card.cost && playerState.controllers.some(c => c && c.isActive)}
                      onPlay={() => onCardPlay?.(card, 'auto')}
                      onView={gameState.phase === 'combat' ? null : () => setViewingCard(card)}
                      disabled={!isMyTurn || gameState.phase !== 'main' || playerState.shards < card.cost || !playerState.controllers.some(c => c && c.isActive)}
                    />
                  </div>
                ))}
                {provided.placeholder}
              </div>
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
    
    {/* Attack Confirmation Modal */}
    <AnimatePresence>
      {attackConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setAttackConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl border-2 border-red-500 p-4 sm:p-6 max-w-md mx-4 shadow-2xl"
          >
            <h3 className="text-xl sm:text-2xl font-bold text-red-400 mb-3 sm:mb-4 text-center">Confirm Attack</h3>
            
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="text-center flex-1">
                <div className="text-white font-bold text-sm sm:text-base mb-1">
                  {attackConfirm.attackerType === 'controller' 
                    ? attackConfirm.attacker.card.name 
                    : attackConfirm.attacker.card.name}
                </div>
                <div className="text-xs sm:text-sm text-slate-400">
                  {attackConfirm.attackerType === 'controller' 
                    ? attackConfirm.attacker.card.ap 
                    : attackConfirm.attacker.currentAP} AP
                </div>
              </div>
              
              <div className="text-2xl sm:text-3xl text-red-500">⚔️</div>
              
              <div className="text-center flex-1">
                <div className="text-white font-bold text-sm sm:text-base mb-1">
                  {attackConfirm.target.card ? attackConfirm.target.card.name : attackConfirm.target.name}
                </div>
                <div className="text-xs sm:text-sm text-slate-400">
                  {attackConfirm.target.card 
                    ? `${attackConfirm.target.currentAP} AP / ${attackConfirm.target.currentCH} CH`
                    : `${attackConfirm.target.card.ap} AP / ${attackConfirm.target.currentCH} CH`}
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <Button
                onClick={() => {
                  const attackerEl = attackConfirm.attackerType === 'controller' 
                    ? creatureRefs.current[`player-controller-${attackConfirm.attackerIndex}`]
                    : creatureRefs.current[`player-${attackConfirm.attackerIndex}`];
                  const targetEl = attackConfirm.targetIndex === -1 
                    ? null 
                    : creatureRefs.current[`opponent-${attackConfirm.targetIndex}`];
                    
                  // Execute attack and capture result
                  const beforeAttacker = attackConfirm.attackerType === 'controller' 
                    ? { ...gameState.playerState.controllers[attackConfirm.attackerIndex] }
                    : { ...gameState.playerState.creatures[attackConfirm.attackerIndex] };
                  const beforeTarget = attackConfirm.targetIndex === -1 
                    ? { ...gameState.opponentState.controllers.find(c => c && c.isActive) }
                    : { ...gameState.opponentState.creatures[attackConfirm.targetIndex] };
                    
                  onAttack?.(attackConfirm.attackerIndex, attackConfirm.targetIndex, attackConfirm.attackerType);
                  
                  // Trigger animation and combat log
                  if (attackerEl && targetEl) {
                    const attackerRect = attackerEl.getBoundingClientRect();
                    const targetRect = targetEl.getBoundingClientRect();
                    setAttackAnimation({
                      from: { x: attackerRect.left + attackerRect.width / 2, y: attackerRect.top + attackerRect.height / 2 },
                      to: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 }
                    });
                    setTimeout(() => setAttackAnimation(null), 600);
                  }
                  
                  // Add to combat log after a delay for animations
                  setTimeout(() => {
                    const attackerName = attackConfirm.attackerType === 'controller' 
                      ? attackConfirm.attacker.card.name 
                      : attackConfirm.attacker.card.name;
                    const targetName = attackConfirm.target.card ? attackConfirm.target.card.name : attackConfirm.target.name;
                    const attackerAP = attackConfirm.attackerType === 'controller' 
                      ? attackConfirm.attacker.card.ap 
                      : attackConfirm.attacker.currentAP;
                    const defenderAP = attackConfirm.target.card 
                      ? attackConfirm.target.currentAP 
                      : attackConfirm.target.card.ap;
                    
                    const logs = [`${attackerName} attacks ${targetName}!`];
                    
                    // Check for recoil
                    if (attackConfirm.attackerType !== 'controller' && attackConfirm.target.card) {
                      const recoilDamage = defenderAP;
                      if (recoilDamage > 0) {
                        logs.push(`${attackerName} takes ${recoilDamage} recoil damage!`);
                      }
                    }
                    
                    // Check for destruction
                    if (beforeTarget.currentCH <= attackerAP) {
                      logs.push(`💀 ${targetName} was destroyed!`);
                      const targetKey = attackConfirm.targetIndex === -1 
                        ? null 
                        : `opponent-${attackConfirm.targetIndex}`;
                      if (targetKey) {
                        setDestroyingCards([targetKey]);
                        setTimeout(() => setDestroyingCards([]), 1000);
                      }
                    }
                    
                    setCombatLog([...logs]);
                    setTimeout(() => setCombatLog([]), 3000);
                  }, 700);
                  
                  setAttackConfirm(null);
                  setSelectedCreature(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-sm sm:text-base py-4 sm:py-3"
              >
                ✓ Attack
              </Button>
              <Button
                onClick={() => setAttackConfirm(null)}
                variant="outline"
                className="flex-1 text-sm sm:text-base py-4 sm:py-3"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Card Preview Modal */}
    <AnimatePresence>
      {viewingCard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setViewingCard(null)}
        >
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1.25, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl"
          >
            <div className="bg-slate-950 rounded-2xl border-4 shadow-2xl overflow-hidden" style={{ borderColor: getElementColor(viewingCard.element) }}>
              {/* Header */}
              <div className={`h-24 bg-gradient-to-r ${getElementGradient(viewingCard.element)} flex items-center justify-between px-8`}>
                <div className="text-white text-xl">{getElementIcon(viewingCard.element)}</div>
                <div className="w-20 h-20 rounded-full bg-slate-900 border-4 flex items-center justify-center" style={{ borderColor: getElementColor(viewingCard.element) }}>
                  <span className="text-white font-bold text-3xl">{viewingCard.cost}</span>
                </div>
              </div>

              {/* Card Name */}
              <div className="mt-8 px-8 text-center">
                <h2 className="text-white font-bold text-4xl mb-4">{viewingCard.name}</h2>
                <div className="px-6 py-3 rounded-full bg-slate-900/80 border-2 inline-block text-base font-bold uppercase tracking-wide" style={{ borderColor: getElementColor(viewingCard.element), color: getElementColor(viewingCard.element) }}>
                  {viewingCard.element} {viewingCard.card_type}
                </div>
              </div>

              {/* Keywords */}
              {viewingCard.keywords && viewingCard.keywords.length > 0 && (
                <div className="flex justify-center gap-3 mt-6 px-8 flex-wrap">
                  {viewingCard.keywords.map((kw, i) => (
                    <span key={i} className="px-4 py-2 rounded-full text-sm font-bold bg-amber-600/80 text-white border-2 border-amber-400">
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Stats */}
              {(viewingCard.card_type === 'creature' || viewingCard.card_type === 'controller') && (
                <div className="flex justify-center gap-8 mt-8">
                  {viewingCard.ap !== undefined && (
                    <div className="flex items-center gap-4 px-8 py-4 rounded-xl bg-slate-900/90 border-2 shadow-lg" style={{ borderColor: getElementColor(viewingCard.element) }}>
                      <Swords className="w-8 h-8 text-red-400" />
                      <span className="text-white font-bold text-4xl">{viewingCard.ap}</span>
                    </div>
                  )}
                  {viewingCard.ch !== undefined && (
                    <div className="flex items-center gap-4 px-8 py-4 rounded-xl bg-slate-900/90 border-2 shadow-lg" style={{ borderColor: getElementColor(viewingCard.element) }}>
                      <Shield className="w-8 h-8 text-blue-400" />
                      <span className="text-white font-bold text-4xl">{viewingCard.ch}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="mt-8 mx-8 mb-8 p-8 bg-slate-900/95 rounded-xl border-2" style={{ borderColor: getElementColor(viewingCard.element) }}>
                <div className="text-base uppercase tracking-wider mb-4 font-bold" style={{ color: getElementColor(viewingCard.element) }}>
                  Card Effect
                </div>
                <p className="text-slate-100 text-xl leading-relaxed">{viewingCard.description || 'No effect text available.'}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Attack Animation */}
    <AnimatePresence>
      {attackAnimation && (
        <>
          {/* Sword projectile */}
          <motion.div
            initial={{ 
              left: attackAnimation.from.x, 
              top: attackAnimation.from.y,
              scale: 1,
              opacity: 1
            }}
            animate={{ 
              left: attackAnimation.to.x, 
              top: attackAnimation.to.y,
              scale: [1, 1.5, 0.8],
              opacity: [1, 1, 0]
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed z-[200] pointer-events-none"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div className="relative">
              <Swords className="w-16 h-16 text-red-500 drop-shadow-2xl" />
              <motion.div
                className="absolute inset-0 bg-red-500/50 rounded-full blur-xl"
                animate={{ scale: [1, 2.5, 1] }}
                transition={{ duration: 0.25, repeat: 2 }}
              />
            </div>
          </motion.div>
          
          {/* Impact explosion */}
          <motion.div
            initial={{ 
              left: attackAnimation.to.x, 
              top: attackAnimation.to.y,
              scale: 0,
              opacity: 0
            }}
            animate={{ 
              scale: [0, 2, 0],
              opacity: [0, 1, 0]
            }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="fixed z-[201] pointer-events-none"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div className="w-32 h-32 rounded-full bg-gradient-radial from-red-500 via-orange-500 to-transparent" />
          </motion.div>
        </>
      )}
    </AnimatePresence>

    {/* Targeting Line */}
    {selectedCreature && targetingElement && mousePosition && (
      <TargetingLine 
        startElement={targetingElement}
        mousePosition={mousePosition}
        color="#06b6d4"
      />
    )}

    {/* Spell Casting Animation */}
    <AnimatePresence>
      {castingSpell && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.5, rotate: -180, opacity: 0 }}
            animate={{ 
              scale: [0.5, 1.2, 1],
              rotate: [180, 0, 0],
              opacity: [0, 1, 1]
            }}
            exit={{ 
              scale: [1, 1.5, 0],
              opacity: [1, 1, 0]
            }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="scale-150">
              <GameCard card={castingSpell} onView={() => {}} />
            </div>
            <motion.div
              className="absolute inset-0 rounded-xl"
              animate={{
                boxShadow: [
                  '0 0 20px rgba(249, 115, 22, 0.5)',
                  '0 0 60px rgba(249, 115, 22, 0.8)',
                  '0 0 20px rgba(249, 115, 22, 0.5)'
                ]
              }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-full blur-2xl"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          </motion.div>
          <div className="absolute bottom-1/4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-bold text-orange-400"
            >
              ✨ {castingSpell.name} ✨
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* Graveyard Viewer Modal */}
    <AnimatePresence>
      {showGraveyard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setShowGraveyard(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 rounded-2xl border-2 border-purple-500 p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-purple-400">
                {showGraveyard === 'player' ? 'Your' : "Opponent's"} Discard Pile
              </h2>
              <Button
                onClick={() => setShowGraveyard(null)}
                variant="outline"
                className="border-slate-700"
              >
                Close
              </Button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {(showGraveyard === 'player' ? playerState.graveyard : opponentState.graveyard)?.map((card, i) => (
                <div key={i}>
                  <GameCard card={card} onView={() => {}} />
                </div>
              ))}
              {(!((showGraveyard === 'player' ? playerState.graveyard : opponentState.graveyard)?.length)) && (
                <div className="col-span-full text-center text-slate-400 py-8">
                  No cards in discard pile
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
    );
    }