import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Swords, Shield, Zap } from 'lucide-react';
import GameCard from './GameCard';
import ControllerSlot from './ControllerSlot';
import TargetingLine from './TargetingLine';
import ActionLog from './ActionLog';
import BattleLog from './BattleLog';
import CardPreviewer from './CardPreviewer';
import StatChangeIndicator from './StatChangeIndicator';
import { Button } from '@/components/ui/button';
import TooltipHelper from '../tutorial/TooltipHelper';

// NOTE: These were imported but unused in your pasted file. Safe to remove.
// import { useQuery } from '@tanstack/react-query';
// import { supabase } from '@/lib/supabaseClient';

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
  onActivateAbility,
  aiActionLog = [],
  battleLog = [],
  onAddToBattleLog
}) {
  const [selectedCreature, setSelectedCreature] = React.useState(null);
  const [abilityMode, setAbilityMode] = React.useState(false);
  const [viewingCard, setViewingCard] = React.useState(null);
  const [mousePosition, setMousePosition] = React.useState(null);
  const [attackAnimation, setAttackAnimation] = React.useState(null);
  const [attackConfirm, setAttackConfirm] = React.useState(null);
  const [showGraveyard, setShowGraveyard] = React.useState(null);
  const [showBattleLog, setShowBattleLog] = React.useState(false);
  const [showActionLog, setShowActionLog] = React.useState(false);

  // Fit-to-viewport scaling (design size 1920x1080)
  const [boardScale, setBoardScale] = React.useState(1);
  React.useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth || 1920;
      const vh = window.innerHeight || 1080;
      const scale = Math.min(vw / 1920, vh / 1080, 1);
      setBoardScale(scale);
    };
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, []);

  // Click-to-play flow: click a hand card, then click a valid empty slot. Press Escape to cancel.
  const [pendingPlayCard, setPendingPlayCard] = React.useState(null);
  // Equip flow for attachment cards (artifacts / persistent spells)
  // Step 1: choose an empty artifact slot
  // Step 2: choose a valid friendly target (creature or active controller)
  const [pendingEquip, setPendingEquip] = React.useState(null); // { card, artifactSlotIndex }
  const [pendingEquipTargets, setPendingEquipTargets] = React.useState(null); // { creature: bool, controller: bool }
  React.useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPendingPlayCard(null);
        setPendingEquip(null);
        setPendingEquipTargets(null);
        setFieldNotification(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const [destroyingCards, setDestroyingCards] = React.useState([]);
  const [fieldNotification, setFieldNotification] = React.useState(null);
  const [statChanges, setStatChanges] = React.useState([]);
  const creatureRefs = React.useRef({});

  const castingSpell = gameState?.castingSpell;
  const playerState = isPlayer ? gameState.playerState : gameState.opponentState;
  const opponentState = isPlayer ? gameState.opponentState : gameState.playerState;
  const isMyTurn = gameState.isMyTurn;

  const getAttachmentTargetsFromAbilities = React.useCallback((card) => {
    // Prefer DB fields, fallback to abilities targets.
    // If a card is marked is_attachment but has no explicit target info, default to creatures.
    const out = { creature: false, controller: false };
    if (!card) return out;

    const abilities = Array.isArray(card.abilities) ? card.abilities : [];
    for (const ab of abilities) {
      if (!ab) continue;
      const t = ab.target;
      if (typeof t !== 'string') continue;
      const low = t.toLowerCase();
      if (low.includes('creature')) out.creature = true;
      if (low.includes('controller')) out.controller = true;
    }

    // If no target info, default to creature attachments.
    if (!out.creature && !out.controller && card.is_attachment) out.creature = true;
    return out;
  }, []);

  const finishEquipToTarget = React.useCallback((attachTargetIndex) => {
    if (!pendingEquip?.card || pendingEquip.artifactSlotIndex == null) return;
    onCardPlay?.(pendingEquip.card, 'artifact', pendingEquip.artifactSlotIndex, null, attachTargetIndex);
    setPendingEquip(null);
    setPendingEquipTargets(null);
    setFieldNotification(null);
  }, [pendingEquip, onCardPlay]);

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

  const targetingElement = selectedCreature ? creatureRefs.current[`player-${selectedCreature.index}`] : null;

  const handleDragEnd = () => {
    // Drag is disabled; click-to-play is used.
    return;
  };

  // ✅ Controller activation rules
  // Setup: allow selecting first controller (commander selection)
  // Main: allow normal controller activation (your turn only)
  const canActivateRestingController = (ctrl) => {
    if (!ctrl) return false;

    const activeCount = playerState.controllers.filter((c) => c && c.isActive).length;

    const inSetup = gameState.phase === 'setup';
    const inMain = gameState.phase === 'main';

    if (inSetup) {
      // During setup, allow selection even if isMyTurn is false (PvP join case).
      return playerState.shards >= ctrl.cost && activeCount < 3;
    }

    if (inMain) {
      return isMyTurn && playerState.shards >= ctrl.cost && activeCount < 3;
    }

    return false;
  };

  return (
    <>
      {/* Desktop: Always visible logs */}
      <div className="hidden lg:block">
        <BattleLog logs={battleLog} />
        {aiActionLog && aiActionLog.length > 0 && (
          <ActionLog actions={aiActionLog} title="Opponent Actions" />
        )}
      </div>

      {/* Mobile: Collapsible battle log */}
      <AnimatePresence>
        {showBattleLog && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-slate-900/95 backdrop-blur-sm border-r border-slate-700 shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-slate-950/90 p-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-400">⚔️ Battle Log</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowBattleLog(false)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="p-3 space-y-1">
              {battleLog.map((log, i) => (
                <div key={i} className="text-xs text-slate-300 py-1 border-b border-slate-800/50">
                  {log}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile: Collapsible action log */}
      <AnimatePresence>
        {showActionLog && aiActionLog && aiActionLog.length > 0 && (
          <motion.div
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="lg:hidden fixed right-0 top-0 bottom-0 z-50 w-72 bg-slate-900/95 backdrop-blur-sm border-l border-slate-700 shadow-2xl overflow-y-auto"
          >
            <div className="sticky top-0 bg-slate-950/90 p-3 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-sm font-bold text-rose-400">🤖 Opponent Actions</h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowActionLog(false)}
                className="h-6 w-6 p-0"
              >
                ✕
              </Button>
            </div>
            <div className="p-3 space-y-1">
              {aiActionLog.map((action, i) => (
                <div key={i} className="text-xs text-slate-300 py-1 border-b border-slate-800/50">
                  {action}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="h-screen w-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center overflow-hidden relative">
          {/* Background overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
            <Swords className="w-64 h-64 text-slate-500" />
          </div>

          {/* Desktop */}
          <div
            className="hidden lg:flex w-[1920px] h-[1080px] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex-col relative"
            style={{ transform: `scale(${boardScale})`, transformOrigin: 'center' }}
          >
            {/* Logo Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f8062dfb3_Fateboundlogo.png"
                alt="Fatebound"
                className="w-full h-full object-contain opacity-50"
              />
            </div>

            {pendingPlayCard && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-xl bg-slate-950/90 border border-cyan-500/40 backdrop-blur-sm shadow-lg">
                <div className="text-sm text-cyan-200 font-bold text-center">
                  Select a slot for <span className="text-white">{pendingPlayCard.name}</span>
                </div>
                <div className="text-xs text-slate-300 text-center">Press Esc to cancel</div>
              </div>
            )}

            {/* Opponent Area */}
            <div className="p-3 border-b border-slate-800 bg-rose-950/10 relative">
              <div className="absolute left-40 top-2 md:left-48 md:top-4 z-10">
                <span className="px-2 py-1 md:px-4 md:py-2 bg-rose-900/80 text-rose-200 text-xs md:text-sm font-bold rounded-lg border-2 border-rose-700 shadow-lg">
                  OPPONENT
                </span>
              </div>

              {/* Opponent Controllers */}
              <div className="flex justify-center gap-1 sm:gap-2 mb-3">
                {(opponentState.controllers || []).map((ctrl, i) => (
                  <div
                    key={i}
                    className={
                      "relative cursor-pointer " +
                      (pendingEquip && pendingEquipTargets?.controller && ctrl?.isActive
                        ? "ring-2 ring-yellow-400 rounded-lg"
                        : "")
                    }
                    ref={(el) => {
                      creatureRefs.current[`opponent-controller-${i}`] = el;
                    }}
                    onClick={() => {
                      if (
                        selectedCreature &&
                        isMyTurn &&
                        gameState.phase === 'combat' &&
                        !opponentState.creatures.some((c) => c !== null)
                      ) {
                        const attacker =
                          selectedCreature.type === 'controller'
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
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (ctrl) setViewingCard(ctrl.card);
                    }}
                  >
                    <div className="scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100">
                      <TooltipHelper keyword="controller">
                      <ControllerSlot controller={ctrl} isEmpty={!ctrl} isOpponent={true} isActive={ctrl?.isActive} />
                    </TooltipHelper>
                    </div>

                    {selectedCreature &&
                      gameState.phase === 'combat' &&
                      !opponentState.creatures.some((c) => c !== null) &&
                      ctrl && (
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
                    className="flex justify-center gap-1 mb-2 min-h-[7rem]"
                  >
                    {(opponentState.artifacts || []).map((card, i) => (
                      <div
                        key={i}
                        className="w-20 h-28 relative overflow-hidden rounded-lg border transition-colors border-purple-500/30 hover:border-purple-500"
                        onClick={() => card && setViewingCard(card.card)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          card && setViewingCard(card.card);
                        }}
                      >
                        {card ? (
                          <div
                            style={{
                              width: '160px',
                              height: '224px',
                              transform: 'scale(0.5)',
                              transformOrigin: 'top left'
                            }}
                          >
                            <GameCard card={card.card} disabled={true} onView={() => setViewingCard(card.card)} />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg border border-dashed border-slate-600/70 bg-slate-800/40" />
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
                  <div ref={provided.innerRef} {...provided.droppableProps} className="flex justify-center gap-1">
                    {(opponentState.creatures || []).map((creature, i) => (
                      <div
                        key={i}
                        // IMPORTANT: You can never "place" a creature into the opponent's slots.
                        // These highlights/clicks are only for combat targeting.
                        className="w-20 h-28 relative overflow-hidden rounded-lg border border-slate-600/70 transition-colors hover:border-slate-500"
                        ref={(el) => {
                          creatureRefs.current[`opponent-${i}`] = el;
                        }}
                        onClick={() => {
                          if (selectedCreature && isMyTurn && gameState.phase === 'combat') {
                            const attacker =
                              selectedCreature.type === 'controller'
                                ? playerState.controllers[selectedCreature.index]
                                : playerState.creatures[selectedCreature.index];

                            setAttackConfirm({
                              attacker,
                              target: creature,
                              attackerIndex: selectedCreature.index,
                              targetIndex: i,
                              attackerType: selectedCreature.type
                            });
                          } else if (abilityMode && isMyTurn && gameState.phase === 'combat') {
                            onControllerAbility?.(i);
                            setAbilityMode(false);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          creature && setViewingCard(creature.card);
                        }}
                      >
                        {creature ? (
                          <div style={{ width: '160px', height: '224px', transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                            <GameCard
                              card={creature.card}
                              modifiedStats={{ ap: creature.currentAP, ch: creature.currentCH }}
                              statusEffects={creature.statusEffects || []}
                              isZombified={creature.isZombified}
                              disabled={false}
                              onView={() => setViewingCard(creature.card)}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg border border-dashed border-slate-600/70 bg-slate-800/40" />
                        )}
                        {selectedCreature && gameState.phase === 'combat' && (
                          <div className="absolute -inset-1 rounded border-2 border-rose-500 animate-pulse pointer-events-none bg-rose-500/10" />
                        )}
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Opponent Deck & Graveyard */}
            <div className="absolute top-12 right-2 md:top-20 md:right-4 z-10 flex flex-col gap-1 md:gap-2">
              <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setViewingCard(null)}>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/235e4469e_00Draco_Alec_back.png"
                  alt="Opponent Deck"
                  className="w-16 h-24 md:w-28 md:h-40 rounded-lg shadow-xl border-2 border-rose-500/50 opacity-80"
                />
                <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 w-7 h-7 md:w-10 md:h-10 bg-rose-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                  <span className="text-xs md:text-base font-bold text-white">{(opponentState.deck?.length ?? opponentState.deckSize ?? 0)}</span>
                </div>
              </div>

              <button className="relative group hover:scale-105 transition-transform" onClick={() => setShowGraveyard('opponent')}>
                <div className="w-16 h-24 md:w-28 md:h-40 rounded-lg shadow-xl border-2 border-purple-500/50 bg-slate-900/80 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
                  <span className="text-purple-400 text-3xl md:text-5xl">💀</span>
                </div>
                <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 w-7 h-7 md:w-10 md:h-10 bg-purple-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                  <span className="text-xs md:text-base font-bold text-white">{opponentState.graveyard.length}</span>
                </div>
              </button>
            </div>

            {/* Opponent Resting Controllers */}
            <div className="absolute left-2 top-12 md:left-4 md:top-20 z-10">
              <div className="text-[10px] md:text-xs text-rose-300 mb-1 md:mb-2 font-bold">RESTING</div>

              <div className="flex flex-col gap-1">
                {(opponentState.restingControllers || []).slice(0, 3).map((ctrl, i) => (
                  <div
                    key={i}
                    className="w-20 h-28 md:w-24 md:h-32 relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/30 cursor-pointer"
                    onClick={() => ctrl && setViewingCard(ctrl)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      ctrl && setViewingCard(ctrl);
                    }}
                  >
                    {ctrl ? (
                      <div style={{ width: '160px', height: '224px', transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                        <GameCard card={ctrl} disabled={true} onView={() => setViewingCard(ctrl)} />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-lg border border-dashed border-slate-600/70 bg-slate-800/40" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Player Deck & Graveyard */}
            <div className="absolute bottom-12 right-2 md:bottom-20 md:right-4 z-10 flex flex-col gap-1 md:gap-2">
              <button className="relative group hover:scale-105 transition-transform" onClick={() => setShowGraveyard('player')}>
                <div className="w-16 h-24 md:w-28 md:h-40 rounded-lg shadow-xl border-2 border-purple-500/50 bg-slate-900/80 flex items-center justify-center hover:opacity-100 transition-opacity">
                  <span className="text-purple-400 text-3xl md:text-5xl">💀</span>
                </div>
                <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 w-7 h-7 md:w-10 md:h-10 bg-purple-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                  <span className="text-xs md:text-base font-bold text-white">{playerState.graveyard.length}</span>
                </div>
              </button>

              <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setViewingCard(null)}>
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/235e4469e_00Draco_Alec_back.png"
                  alt="Player Deck"
                  className="w-16 h-24 md:w-28 md:h-40 rounded-lg shadow-xl border-2 border-cyan-500/50"
                />
                <div className="absolute -bottom-3 -right-3 md:-bottom-4 md:-right-4 w-7 h-7 md:w-10 md:h-10 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg">
                  <span className="text-xs md:text-base font-bold text-slate-900">{(playerState.deck?.length ?? playerState.deckSize ?? 0)}</span>
                </div>
              </div>
            </div>

            {/* Player Resting Controllers */}
            <div className="absolute left-2 bottom-12 md:left-4 md:bottom-20 z-10">
              <div className="text-[10px] md:text-xs text-cyan-300 mb-1 md:mb-2 font-bold">RESTING</div>

              <div className="flex flex-col gap-1">
                {(playerState.restingControllers || []).slice(0, 3).map((ctrl, i) => {
                  const canActivate = canActivateRestingController(ctrl);

                  return (
                    <div
                      key={i}
                      className="w-20 h-28 md:w-24 md:h-32 relative overflow-hidden rounded-lg border border-slate-700/60 bg-slate-900/30 cursor-pointer"
                      onClick={() => {
                        if (canActivate) onControllerActivate?.(i);
                        else if (ctrl) setViewingCard(ctrl);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        ctrl && setViewingCard(ctrl);
                      }}
                    >
                      {ctrl ? (
                        <>
                          <div style={{ width: '160px', height: '224px', transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                            <GameCard
                              card={ctrl}
                              canPlay={canActivate}
                              onPlay={() => onControllerActivate?.(i)}
                              onView={() => setViewingCard(ctrl)}
                              disabled={!canActivate}
                            />
                          </div>

                          {canActivate && (
                            <div className="absolute inset-0 rounded-lg border-2 border-amber-500 animate-pulse pointer-events-none bg-amber-500/10" />
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full rounded-lg border border-dashed border-slate-600/70 bg-slate-800/40" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Turn Counter & Phase Controls */}
            <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-4 z-20 flex flex-col gap-2 md:gap-3 items-end">
              <div className="px-2 py-1 md:px-4 md:py-2 rounded-lg bg-slate-900/80 border border-slate-700 backdrop-blur">
                <div className="text-[10px] md:text-xs text-slate-400 text-center mb-0.5 md:mb-1">Turn</div>
                <div className="text-lg md:text-2xl font-bold text-cyan-400 text-center">{gameState.turnNumber}</div>
              </div>

              {playerState.controllers.find((c) => c && c.isActive) && gameState.phase === 'combat' && (
                <Button
                  onClick={() => {
                    setAbilityMode(!abilityMode);
                    setSelectedCreature(null);
                  }}
                  size="sm"
                  variant={abilityMode ? 'default' : 'outline'}
                  className={`w-full text-xs md:text-base ${abilityMode ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-500 text-purple-400'}`}
                >
                  {abilityMode ? 'Cancel' : 'Controller Ability'}
                </Button>
              )}

              <TooltipHelper keyword={`phase_${gameState.phase}`}>
                <div
                  className={`px-3 py-2 md:px-6 md:py-3 rounded-xl backdrop-blur-sm shadow-lg ${
                    isMyTurn ? 'bg-cyan-900/95 border-2 border-cyan-500 shadow-cyan-500/20' : 'bg-rose-900/95 border-2 border-rose-500 shadow-rose-500/20'
                  }`}
                >
                  <div className={`text-xs md:text-sm mb-0.5 md:mb-1 text-center font-semibold ${isMyTurn ? 'text-cyan-300' : 'text-rose-300'}`}>
                    {isMyTurn ? 'YOUR TURN' : "OPPONENT'S TURN"}
                  </div>
                  <div className={`text-base md:text-2xl font-bold uppercase text-center ${isMyTurn ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {gameState.phase}
                  </div>

                  {/* Updated hint: show in setup or main if no active controller */}
                  {isMyTurn &&
                    !playerState.controllers.some((c) => c && c.isActive) &&
                    (gameState.phase === 'main' || gameState.phase === 'setup') && (
                      <div className="text-xs text-amber-300 text-center mt-1 animate-pulse">⚠️ Activate Controller</div>
                    )}
                </div>
              </TooltipHelper>

              {isMyTurn && (
                <div className="flex flex-col gap-1 md:gap-2">
                  {gameState.phase === 'combat' && selectedCreature && (
                    <Button onClick={() => setSelectedCreature(null)} size="sm" variant="outline" className="border-slate-600 w-full text-xs md:text-base">
                      Cancel
                    </Button>
                  )}

                  <Button
                    onClick={onEndPhase}
                    size="sm"
                    className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-lg text-xs md:text-base px-3 md:px-6 w-full"
                  >
                    {gameState.phase === 'setup'
                      ? 'Start Duel'
                      : gameState.phase === 'draw'
                      ? 'Draw Card →'
                      : gameState.phase === 'energy'
                      ? 'Gain Shard →'
                      : gameState.phase === 'main'
                      ? 'To Combat →'
                      : gameState.phase === 'combat'
                      ? 'End Turn →'
                      : 'End Turn →'}
                  </Button>
                </div>
              )}
            </div>

            {/* Center Battle Area */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              <AnimatePresence>
                {fieldNotification && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -20 }}
                    className="absolute top-1/4 z-[70] max-w-2xl mx-auto px-4"
                  >
                    <div className="bg-gradient-to-r from-amber-900/95 to-orange-900/95 border-3 border-amber-500 rounded-xl p-6 backdrop-blur-sm shadow-2xl">
                      <div className="text-center">
                        <div className="text-sm text-amber-300 font-bold uppercase tracking-wider mb-2">⚠️ Field Effect</div>
                        <div className="text-white text-xl font-bold mb-2">{fieldNotification.title}</div>
                        <div className="text-amber-100 text-sm">{fieldNotification.description}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Player Area */}
            <div className="p-3 border-t border-slate-800 bg-cyan-950/10 relative">
              <div className="absolute left-40 bottom-2 md:left-48 md:bottom-4 z-10">
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
                    className={`flex justify-center gap-1 mb-2 transition-colors ${snapshot.isDraggingOver ? 'bg-cyan-900/20' : ''}`}
                  >
                    {(playerState.creatures || []).map((creature, i) => (
                      <div
                        key={i}
                        className={`w-20 h-28 relative overflow-hidden rounded-lg border transition-colors ${
                          // Equip target selection highlight
                          pendingEquip && creature && pendingEquipTargets?.creature
                            ? 'border-purple-400 bg-purple-900/20 cursor-pointer'
                            : pendingPlayCard &&
                                pendingPlayCard.card_type === 'creature' &&
                                !creature &&
                                isMyTurn &&
                                gameState.phase === 'main'
                              ? 'border-cyan-400 bg-cyan-900/20 cursor-pointer'
                              : 'border-slate-600/70 hover:border-slate-500'
                        }`}
                        ref={(el) => {
                          creatureRefs.current[`player-${i}`] = el;
                        }}
                        onClick={() => {
                          // Equip flow: choose the target creature first
                          if (pendingEquip && creature && pendingEquipTargets?.creature) {
                            finishEquipToTarget(i);
                            return;
                          }
                          // Place creature ONLY on the player's side (never on opponent slots)
                          // and only during your Main phase.
                          if (
                            pendingPlayCard &&
                            pendingPlayCard.card_type === 'creature' &&
                            !creature &&
                            isMyTurn &&
                            gameState.phase === 'main'
                          ) {
                            onCardPlay?.(pendingPlayCard, 'creature', i);
                            setPendingPlayCard(null);
                            return;
                          }
                          if (
                            isMyTurn &&
                            gameState.phase === 'combat' &&
                            creature?.canAttack &&
                            !creature?.hasAttacked &&
                            gameState.turnNumber > 2 &&
                            !creature?.card.keywords?.includes('Guardian')
                          ) {
                            setSelectedCreature({ type: 'creature', creature, index: i });
                          } else if (abilityMode && isMyTurn && gameState.phase === 'combat') {
                            const activeCtrl = playerState.controllers.find((c) => c && c.isActive);
                            if (activeCtrl?.card.abilities?.some((a) => a.trigger === 'active')) {
                              onControllerAbility?.(i);
                              setAbilityMode(false);
                            }
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          creature && setViewingCard(creature.card);
                        }}
                      >
                        {creature ? (
                          <div style={{ width: '160px', height: '224px', transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                            <GameCard
                              card={creature.card}
                              modifiedStats={{ ap: creature.currentAP, ch: creature.currentCH }}
                              statusEffects={creature.statusEffects || []}
                              isZombified={creature.isZombified}
                              onView={() => setViewingCard(creature.card)}
                              hasActiveAbility={creature.card.abilities?.some((a) => a.trigger === 'active')}
                              onActivateAbility={() => onActivateAbility?.(creature.card, 'creature', i)}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg border border-dashed border-slate-600/70 bg-slate-800/40 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-slate-600" />
                          </div>
                        )}
                        {selectedCreature?.type === 'creature' && selectedCreature?.index === i && (
                          <div className="absolute -inset-1 rounded border-2 border-cyan-500 pointer-events-none" />
                        )}
                        {abilityMode &&
                          gameState.phase === 'combat' &&
                          playerState.controllers.find((c) => c && c.isActive)?.card.abilities?.some((a) => a.trigger === 'active') && (
                            <div className="absolute -inset-1 rounded border-2 border-purple-500 animate-pulse pointer-events-none" />
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
                    className={`flex justify-center gap-1 mb-2 min-h-[7rem] transition-colors ${snapshot.isDraggingOver ? 'bg-purple-900/20' : ''}`}
                  >
                    {(playerState.artifacts || []).map((card, i) => (
                      <div
                        key={i}
                        className={
                          "w-20 h-28 relative overflow-hidden rounded-lg border border-purple-500/30 hover:border-purple-500 transition-colors cursor-pointer " +
                          (!card && pendingPlayCard && (
                            pendingPlayCard.card_type === 'artifact' ||
                            (pendingPlayCard.card_type === 'spell')
                          )
                            ? 'ring-2 ring-amber-400'
                            : '')
                        }
                        onClick={() => {
                          const isPlaceable = pendingPlayCard && (
                            pendingPlayCard.card_type === 'artifact' ||
                            (pendingPlayCard.card_type === 'spell')
                          );

                          if (isPlaceable && !card) {
                            // Attachment flow: pick slot first, then pick a friendly target
                            if (pendingPlayCard.is_attachment) {
                              setPendingEquip({ card: pendingPlayCard, artifactSlotIndex: i });
                              setPendingEquipTargets(getAttachmentTargetsFromAbilities(pendingPlayCard));
                              setPendingPlayCard(null);
                              setFieldNotification('Choose a friendly target to equip this to.');
                              return;
                            }

                            onCardPlay?.(pendingPlayCard, 'artifact', i);
                            setPendingPlayCard(null);
                            return;
                          }

                          if (card) setViewingCard(card.card);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          card && setViewingCard(card.card);
                        }}
                      >
                        {card ? (
                          <div style={{ width: '160px', height: '224px', transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                            <GameCard
                              card={card.card}
                              disabled={!isMyTurn}
                              onView={() => setViewingCard(card.card)}
                              hasActiveAbility={card.card.abilities?.some((a) => a.trigger === 'active')}
                              onActivateAbility={isMyTurn ? () => onActivateAbility?.(card.card, 'artifact', i) : undefined}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full rounded-lg border border-dashed border-slate-600/70 bg-slate-800/40" />
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
                  {/* ✅ no cap display */}
                  <span className="text-xs text-white font-bold">{playerState.shards}</span>
                </div>
              </div>

              {/* Player Controllers */}
              <div className="flex justify-center gap-1 sm:gap-2 mb-3">
                {(playerState.controllers || []).map((controller, i) => (
                  <div
                    key={i}
                    className={
                      "relative cursor-pointer " +
                      (pendingEquip && pendingEquipTargets?.controller && controller?.isActive
                        ? "ring-2 ring-yellow-400 rounded-lg"
                        : "")
                    }
                    ref={(el) => {
                      creatureRefs.current[`player-controller-${i}`] = el;
                    }}
                    onClick={() => {
                      if (pendingEquip && pendingEquipTargets?.controller && controller?.isActive) {
                        finishEquipToTarget(-1);
                        return;
                      }
                      if (pendingPlayCard && pendingPlayCard.card_type === 'controller' && !controller) {
                        onCardPlay?.(pendingPlayCard, 'controller', i);
                        setPendingPlayCard(null);
                        return;
                      }
                      if (
                        isMyTurn &&
                        gameState.phase === 'combat' &&
                        controller &&
                        controller.card.ap > 0 &&
                        !controller?.hasAttacked &&
                        gameState.turnNumber > 2
                      ) {
                        setSelectedCreature({ type: 'controller', index: i, controller });
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (controller) setViewingCard(controller.card);
                    }}
                  >
                    <div className="scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100">
                      <TooltipHelper keyword="controller">
                        <ControllerSlot controller={controller} isEmpty={!controller} isActive={controller?.isActive} />
                      </TooltipHelper>
                    </div>

                    {selectedCreature?.type === 'controller' && selectedCreature?.index === i && (
                      <div className="absolute -inset-2 rounded-lg border-4 border-cyan-500 pointer-events-none bg-cyan-500/20">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-2 bg-cyan-500 text-white text-sm font-bold rounded-lg shadow-lg whitespace-nowrap">
                          SELECTED
                        </div>
                      </div>
                    )}

                    {isMyTurn &&
                      gameState.phase === 'combat' &&
                      controller &&
                      controller.card.ap > 0 &&
                      !controller?.hasAttacked &&
                      gameState.turnNumber > 2 && (
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-500 text-white text-xs rounded shadow-lg pointer-events-none animate-pulse">
                          Can Attack
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
                  className="p-2 bg-slate-950/80 border-t border-slate-800 transition-transform hover:-translate-y-16"
                >
                  <div className="flex justify-center gap-1 px-2 flex-wrap">
                    {(playerState.hand || []).map((card, i) => (
                      <motion.div key={i} className="w-24" whileHover={{ scale: 1.15 }} transition={{ duration: 0.2 }}>
                        <GameCard
                          card={card}
                          inHand={true}
                          canPlay={isMyTurn && gameState.phase === 'main' && playerState.shards >= card.cost && playerState.controllers.some((c) => c && c.isActive)}
                          onPlay={() => {
                            const canPlayNow = isMyTurn && gameState.phase === 'main' && playerState.shards >= card.cost && playerState.controllers.some((c) => c && c.isActive);
                            if (canPlayNow) setPendingPlayCard(card);
                            else setViewingCard(card);
                          }}
                          onView={() => setViewingCard(card)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setViewingCard(card);
                          }}
                          disabled={!isMyTurn || gameState.phase !== 'main' || playerState.shards < card.cost || !playerState.controllers.some((c) => c && c.isActive)}
                        />
                      </motion.div>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          </div>

          {/* Mobile Layout (unchanged except shard display and controller activation) */}
          <div className="lg:hidden w-full h-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col relative">
            {/* Logo Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f8062dfb3_Fateboundlogo.png"
                alt="Fatebound"
                className="w-full h-full object-contain opacity-30"
              />
            </div>

            {/* Mobile Turn & Phase indicator */}
            <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setShowBattleLog(true)} className="h-7 w-7 p-0 relative">
                    <span className="text-base">⚔️</span>
                    {battleLog.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full text-[8px] flex items-center justify-center text-white">
                        {battleLog.length > 9 ? '9+' : battleLog.length}
                      </span>
                    )}
                  </Button>

                  <div className={`px-3 py-1.5 rounded-lg ${isMyTurn ? 'bg-cyan-900/95 border border-cyan-500' : 'bg-rose-900/95 border border-rose-500'}`}>
                    <div className={`text-xs font-semibold ${isMyTurn ? 'text-cyan-300' : 'text-rose-300'}`}>{isMyTurn ? 'YOUR TURN' : "OPPONENT'S"}</div>
                    <div className={`text-sm font-bold uppercase ${isMyTurn ? 'text-cyan-400' : 'text-rose-400'}`}>{gameState.phase}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
                    <div className="text-[10px] text-slate-400">Turn</div>
                    <div className="text-base font-bold text-cyan-400 text-center">{gameState.turnNumber}</div>
                  </div>

                  {aiActionLog && aiActionLog.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setShowActionLog(true)} className="h-7 w-7 p-0 relative">
                      <span className="text-base">🤖</span>
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full text-[8px] flex items-center justify-center text-white">
                        {aiActionLog.length > 9 ? '9+' : aiActionLog.length}
                      </span>
                    </Button>
                  )}

                  {isMyTurn && (
                    <Button
                      onClick={onEndPhase}
                      size="sm"
                      className="bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-xs px-3 py-2"
                    >
                      {gameState.phase === 'setup' ? '▶' : gameState.phase === 'draw' ? '📥' : gameState.phase === 'energy' ? '💎' : gameState.phase === 'main' ? '⚔️' : gameState.phase === 'combat' ? '✓' : '→'}
                    </Button>
                  )}
                </div>
              </div>

              {(!playerState.controllers.some((c) => c && c.isActive) && (gameState.phase === 'main' || gameState.phase === 'setup')) && (
                <div className="text-xs text-amber-300 text-center mt-1 animate-pulse">⚠️ Activate a Controller first!</div>
              )}
            </div>

            {/* Opponent Area - Mobile */}
            <div className="p-2 border-b border-slate-800 bg-rose-950/10 relative flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 bg-rose-900/80 text-rose-200 text-[10px] font-bold rounded border border-rose-700">OPPONENT</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span className="text-xs text-white font-bold">{opponentState.shards}</span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-slate-800/60 rounded">
                    <span className="text-[10px] text-slate-400">Hand:</span>
                    <span className="text-xs text-white font-bold">{opponentState.hand.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-1 mb-2">
                {(opponentState.controllers || []).map((ctrl, i) => (
                  <div
                    key={i}
                    className="scale-[0.55]"
                    ref={(el) => {
                      creatureRefs.current[`opponent-controller-${i}`] = el;
                    }}
                    onClick={() => {
                      if (selectedCreature && isMyTurn && gameState.phase === 'combat' && !opponentState.creatures.some((c) => c !== null)) {
                        const attacker =
                          selectedCreature.type === 'controller'
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
                    <TooltipHelper keyword="controller">
                      <ControllerSlot controller={ctrl} isEmpty={!ctrl} isOpponent={true} isActive={ctrl?.isActive} />
                    </TooltipHelper>
                    {selectedCreature && gameState.phase === 'combat' && !opponentState.creatures.some((c) => c !== null) && ctrl && (
                      <div className="absolute -inset-1 rounded border-2 border-rose-500 animate-pulse pointer-events-none bg-rose-500/20" />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-1 overflow-x-auto pb-1 touch-pan-x">
                {(opponentState.creatures || []).map((creature, i) => (
                  <div
                    key={i}
                    className="scale-[0.55] flex-shrink-0 relative"
                    onClick={() => {
                      if (pendingPlayCard && pendingPlayCard.card_type === 'creature' && !creature) {
                        onCardPlay?.(pendingPlayCard, 'creature', i);
                        setPendingPlayCard(null);
                      }
                    }}
                  >
                    {creature ? (
                      <div
                        onClick={() => {
                          if (selectedCreature && isMyTurn && gameState.phase === 'combat') {
                            const attacker =
                              selectedCreature.type === 'controller'
                                ? playerState.controllers[selectedCreature.index]
                                : playerState.creatures[selectedCreature.index];
                            setAttackConfirm({
                              attacker,
                              target: creature,
                              attackerIndex: selectedCreature.index,
                              targetIndex: i,
                              attackerType: selectedCreature.type
                            });
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setViewingCard(creature.card);
                        }}
                      >
                        <GameCard card={creature.card} modifiedStats={{ ap: creature.currentAP, ch: creature.currentCH }} statusEffects={creature.statusEffects || []} disabled={false} onView={() => setViewingCard(creature.card)} />
                        {selectedCreature && gameState.phase === 'combat' && <div className="absolute -inset-1 rounded border-2 border-rose-500 animate-pulse pointer-events-none" />}
                      </div>
                    ) : (
                      <div className="w-32 h-44 rounded border border-dashed border-slate-600/50 bg-slate-800/30" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Player Area - Mobile */}
            <div className="p-2 border-t border-slate-800 bg-cyan-950/10 relative flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 bg-cyan-900/80 text-cyan-200 text-[10px] font-bold rounded border border-cyan-700">YOU</span>
                <div className="flex items-center gap-2 px-2 py-1 bg-slate-800/60 rounded">
                  <Zap className="w-3 h-3 text-amber-400" />
                  {/* ✅ no cap display */}
                  <span className="text-xs text-white font-bold">{playerState.shards}</span>
                </div>
              </div>

              <div className="flex justify-center gap-1 overflow-x-auto pb-2 touch-pan-x">
                {(playerState.creatures || []).map((creature, i) => (
                  <div key={i} className="scale-[0.55] flex-shrink-0 relative">
                    {creature ? (
                      <div
                        onClick={() => {
                          if (isMyTurn && gameState.phase === 'combat' && creature.canAttack && !creature.hasAttacked && gameState.turnNumber > 2 && !creature.card.keywords?.includes('guardian')) {
                            setSelectedCreature({ type: 'creature', creature, index: i });
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setViewingCard(creature.card);
                        }}
                      >
                        <GameCard card={creature.card} modifiedStats={{ ap: creature.currentAP, ch: creature.currentCH }} statusEffects={creature.statusEffects || []} canAttack={isMyTurn && gameState.phase === 'combat' && creature.canAttack && !creature.hasAttacked && gameState.turnNumber > 2} onView={() => setViewingCard(creature.card)} />
                        {selectedCreature?.type === 'creature' && selectedCreature?.index === i && <div className="absolute -inset-1 rounded border-2 border-cyan-500 pointer-events-none bg-cyan-500/20" />}
                      </div>
                    ) : (
                      <div className="w-32 h-44 rounded border border-dashed border-slate-600/50 bg-slate-800/30 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-1 mb-2">
                {(playerState.controllers || []).map((controller, i) => (
                  <div
                    key={i}
                    className={`scale-[0.55] relative ${pendingPlayCard && pendingPlayCard.card_type === 'controller' && !controller ? 'ring-2 ring-cyan-500/30 rounded-lg' : ''}`}
                    ref={(el) => {
                      creatureRefs.current[`player-controller-${i}`] = el;
                    }}
                    onClick={() => {
                      if (pendingPlayCard && pendingPlayCard.card_type === 'controller' && !controller) {
                        onCardPlay?.(pendingPlayCard, 'controller', i);
                        setPendingPlayCard(null);
                        return;
                      }

                      if (isMyTurn && gameState.phase === 'combat' && controller && controller.card.ap > 0 && !controller?.hasAttacked && gameState.turnNumber > 2) {
                        setSelectedCreature({ type: 'controller', index: i, controller });
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (controller) setViewingCard(controller.card);
                    }}
                  >
                    <ControllerSlot controller={controller} isEmpty={!controller} isActive={controller?.isActive} />
                    {selectedCreature?.type === 'controller' && selectedCreature?.index === i && <div className="absolute -inset-1 rounded border-2 border-cyan-500 pointer-events-none bg-cyan-500/20" />}
                  </div>
                ))}
              </div>

              {/* Resting Controllers - Mobile */}
              {(playerState.restingControllers || []).length > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] text-cyan-300 mb-1 font-bold text-center">RESTING CONTROLLERS</div>
                  <div className="flex justify-center gap-1 overflow-x-auto touch-pan-x pb-1">
                    {(playerState.restingControllers || []).map((ctrl, i) => {
                      const canActivate = canActivateRestingController(ctrl);

                      return (
                        <div
                          key={i}
                          className="scale-[0.5] flex-shrink-0 relative"
                          onClick={() => {
                            if (canActivate) onControllerActivate?.(i);
                            else if (ctrl) setViewingCard(ctrl);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            ctrl && setViewingCard(ctrl);
                          }}
                        >
                          {ctrl && (
                            <>
                              <GameCard
                                card={ctrl}
                                canPlay={canActivate}
                                onView={() => setViewingCard(ctrl)}
                                disabled={!canActivate}
                              />
                              {canActivate && <div className="absolute -inset-1 rounded border-2 border-amber-500 animate-pulse pointer-events-none bg-amber-500/20" />}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Player Hand - Mobile */}
            <div className="p-2 bg-slate-950/95 backdrop-blur-sm border-t-2 border-slate-800 sticky bottom-0 z-20 flex-shrink-0">
              <div className="text-[10px] text-cyan-300 mb-1 font-bold text-center">YOUR HAND ({playerState.hand.length})</div>
              <div className="flex justify-start gap-1 overflow-x-auto touch-pan-x pb-1">
                {(playerState.hand || []).map((card, i) => (
                  <div
                    key={i}
                    className="scale-[0.5] flex-shrink-0"
                    onClick={() => {
                      const canPlayNow = isMyTurn && gameState.phase === 'main' && playerState.shards >= card.cost && playerState.controllers.some((c) => c && c.isActive);
                      if (canPlayNow) setPendingPlayCard(card);
                      else setViewingCard(card);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setViewingCard(card);
                    }}
                  >
                    <GameCard
                      card={card}
                      inHand={true}
                      canPlay={isMyTurn && gameState.phase === 'main' && playerState.shards >= card.cost && playerState.controllers.some((c) => c && c.isActive)}
                      onView={() => setViewingCard(card)}
                      disabled={!isMyTurn || gameState.phase !== 'main' || playerState.shards < card.cost || !playerState.controllers.some((c) => c && c.isActive)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
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
                  <div className="text-white font-bold text-sm sm:text-base mb-1">{attackConfirm.attacker.card.name}</div>
                  <div className="text-xs sm:text-sm text-slate-400">
                    {attackConfirm.attackerType === 'controller' ? attackConfirm.attacker.card.ap : attackConfirm.attacker.currentAP} AP
                  </div>
                </div>

                <div className="text-2xl sm:text-3xl text-red-500">⚔️</div>

                <div className="text-center flex-1">
                  <div className="text-white font-bold text-sm sm:text-base mb-1">{attackConfirm.target?.card?.name || attackConfirm.target?.name}</div>
                  <div className="text-xs sm:text-sm text-slate-400">
                    {attackConfirm.target?.card
                      ? `${attackConfirm.target.currentAP} AP / ${attackConfirm.target.currentCH} CH`
                      : `${attackConfirm.target?.card?.ap ?? 0} AP / ${attackConfirm.target?.currentCH ?? 0} CH`}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Button
                  onClick={() => {
                    const attackerEl =
                      attackConfirm.attackerType === 'controller'
                        ? creatureRefs.current[`player-controller-${attackConfirm.attackerIndex}`]
                        : creatureRefs.current[`player-${attackConfirm.attackerIndex}`];

                    const targetEl =
                      attackConfirm.targetIndex === -1
                        ? creatureRefs.current[`opponent-controller-0`]
                        : creatureRefs.current[`opponent-${attackConfirm.targetIndex}`];

                    onAttack?.(attackConfirm.attackerIndex, attackConfirm.targetIndex, attackConfirm.attackerType);

                    if (attackerEl && targetEl && attackConfirm.attacker?.card) {
                      const attackerRect = attackerEl.getBoundingClientRect();
                      const targetRect = targetEl.getBoundingClientRect();
                      const attackerCard = attackConfirm.attacker.card;

                      setAttackAnimation({
                        from: { x: attackerRect.left + attackerRect.width / 2, y: attackerRect.top + attackerRect.height / 2 },
                        to: { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 },
                        element: attackerCard.element
                      });
                      setTimeout(() => setAttackAnimation(null), 600);
                    }

                    setAttackConfirm(null);
                    setSelectedCreature(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-sm sm:text-base py-4 sm:py-3 text-white font-bold"
                >
                  ✓ Attack
                </Button>
                <Button
                  onClick={() => setAttackConfirm(null)}
                  variant="outline"
                  className="flex-1 text-sm sm:text-base py-4 sm:py-3 text-black bg-white hover:bg-slate-200 font-bold"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Preview Modal */}
      <CardPreviewer open={!!viewingCard} card={viewingCard} onOpenChange={setViewingCard} />

      {/* Stat Change Indicators */}
      <StatChangeIndicator changes={statChanges} isPlayer={isPlayer} />

      {/* Targeting Line */}
      {selectedCreature && targetingElement && mousePosition && (
        <TargetingLine startElement={targetingElement} mousePosition={mousePosition} color="#06b6d4" />
      )}

      {/* Spell Casting Animation (left unchanged) */}
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
              animate={{ scale: [0.5, 1.2, 1], rotate: [180, 0, 0], opacity: [0, 1, 1] }}
              exit={{ scale: [1, 1.5, 0], opacity: [1, 1, 0] }}
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
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </motion.div>
            <div className="absolute bottom-1/4 text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold text-orange-400">
                ✨ {castingSpell.name} ✨
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Graveyard Viewer Modal (left unchanged) */}
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
                <h2 className="text-2xl font-bold text-purple-400">{showGraveyard === 'player' ? 'Your' : "Opponent's"} Discard Pile</h2>
                <Button onClick={() => setShowGraveyard(null)} variant="outline" className="border-slate-700">
                  Close
                </Button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {((showGraveyard === 'player' ? playerState.graveyard : opponentState.graveyard) || []).map((card, i) => (
                  <div
                    key={i}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setViewingCard(card);
                    }}
                  >
                    <GameCard card={card} onView={() => setViewingCard(card)} />
                  </div>
                ))}
                {!((showGraveyard === 'player' ? playerState.graveyard : opponentState.graveyard)?.length) && (
                  <div className="col-span-full text-center text-slate-400 py-8">No cards in discard pile</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}