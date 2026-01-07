import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Card from './Card';
import CardEffect from './CardEffect';
import PlayerStats from './PlayerStats';

const INITIAL_DECK = [
  { id: 1, name: 'Slash', type: 'attack', cost: 1, value: -8, effect: 'Deal 8 damage' },
  { id: 2, name: 'Fireball', type: 'fire', cost: 2, value: -15, effect: 'Deal 15 fire damage' },
  { id: 3, name: 'Ice Shard', type: 'ice', cost: 2, value: -10, effect: 'Deal 10 ice damage' },
  { id: 4, name: 'Wind Blade', type: 'wind', cost: 1, value: -6, effect: 'Deal 6 damage' },
  { id: 5, name: 'Shield Wall', type: 'defense', cost: 2, value: 15, effect: 'Gain 15 shield' },
  { id: 6, name: 'Heal', type: 'heal', cost: 2, value: 12, effect: 'Restore 12 health' },
  { id: 7, name: 'Arcane Bolt', type: 'magic', cost: 1, value: -7, effect: 'Deal 7 magic damage' },
  { id: 8, name: 'Thunder', type: 'special', cost: 3, value: -20, effect: 'Deal 20 damage' },
  { id: 9, name: 'Barrier', type: 'defense', cost: 1, value: 8, effect: 'Gain 8 shield' },
  { id: 10, name: 'Inferno', type: 'fire', cost: 3, value: -25, effect: 'Deal 25 fire damage' },
  { id: 11, name: 'Blizzard', type: 'ice', cost: 3, value: -18, effect: 'Deal 18 ice damage' },
  { id: 12, name: 'Restoration', type: 'heal', cost: 3, value: 20, effect: 'Restore 20 health' },
];

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function GameBoard() {
  const [deck, setDeck] = useState(() => shuffleArray(INITIAL_DECK));
  const [hand, setHand] = useState([]);
  const [playedCard, setPlayedCard] = useState(null);
  const [activeEffect, setActiveEffect] = useState(null);
  const [playerStats, setPlayerStats] = useState({ health: 100, maxHealth: 100, shield: 0, mana: 5, maxMana: 5 });
  const [enemyStats, setEnemyStats] = useState({ health: 100, maxHealth: 100, shield: 0 });
  const [turn, setTurn] = useState(1);
  const [gameOver, setGameOver] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const drawCard = useCallback(() => {
    if (deck.length === 0 || hand.length >= 7) return;
    
    const [drawnCard, ...remainingDeck] = deck;
    setDeck(remainingDeck);
    setHand(prev => [...prev, { ...drawnCard, uniqueId: `${drawnCard.id}-${Date.now()}` }]);
  }, [deck, hand.length]);

  const startGame = useCallback(() => {
    const shuffled = shuffleArray(INITIAL_DECK);
    setDeck(shuffled.slice(5));
    setHand(shuffled.slice(0, 5).map((card, i) => ({ ...card, uniqueId: `${card.id}-${i}` })));
    setPlayerStats({ health: 100, maxHealth: 100, shield: 0, mana: 5, maxMana: 5 });
    setEnemyStats({ health: 100, maxHealth: 100, shield: 0 });
    setTurn(1);
    setGameOver(null);
    setPlayedCard(null);
  }, []);

  const playCard = useCallback((card) => {
    if (isAnimating || playerStats.mana < card.cost) return;

    setIsAnimating(true);
    setHand(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
    setPlayedCard(card);
    setActiveEffect(card.type);
    setPlayerStats(prev => ({ ...prev, mana: prev.mana - card.cost }));

    // Apply card effect
    setTimeout(() => {
      if (card.type === 'attack' || card.type === 'fire' || card.type === 'ice' || 
          card.type === 'wind' || card.type === 'magic' || card.type === 'special') {
        // Damage card
        const damage = Math.abs(card.value);
        setEnemyStats(prev => {
          const newShield = Math.max(0, prev.shield - damage);
          const remainingDamage = Math.max(0, damage - prev.shield);
          const newHealth = Math.max(0, prev.health - remainingDamage);
          
          if (newHealth <= 0) {
            setGameOver('win');
          }
          
          return { ...prev, health: newHealth, shield: newShield };
        });
      } else if (card.type === 'defense') {
        // Shield card
        setPlayerStats(prev => ({ ...prev, shield: prev.shield + card.value }));
      } else if (card.type === 'heal') {
        // Heal card
        setPlayerStats(prev => ({ 
          ...prev, 
          health: Math.min(prev.maxHealth, prev.health + card.value) 
        }));
      }
    }, 500);
  }, [isAnimating, playerStats.mana]);

  const handleEffectComplete = useCallback(() => {
    setActiveEffect(null);
    setPlayedCard(null);
    setIsAnimating(false);
    
    // Enemy turn - simple AI
    if (!gameOver) {
      setTimeout(() => {
        const enemyDamage = 5 + Math.floor(Math.random() * 10);
        setPlayerStats(prev => {
          const newShield = Math.max(0, prev.shield - enemyDamage);
          const remainingDamage = Math.max(0, enemyDamage - prev.shield);
          const newHealth = Math.max(0, prev.health - remainingDamage);
          
          if (newHealth <= 0) {
            setGameOver('lose');
          }
          
          return { ...prev, health: newHealth, shield: newShield };
        });
      }, 500);
    }
  }, [gameOver]);

  const endTurn = useCallback(() => {
    setTurn(prev => prev + 1);
    setPlayerStats(prev => ({ ...prev, mana: prev.maxMana }));
    drawCard();
  }, [drawCard]);

  // Initialize game
  React.useEffect(() => {
    startGame();
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Game content */}
      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Arcane Duels</h1>
              <p className="text-slate-400 text-sm">Turn {turn}</p>
            </div>
          </div>
          <Button 
            onClick={startGame}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            New Game
          </Button>
        </div>

        {/* Stats row */}
        <div className="flex justify-between mb-8">
          <PlayerStats {...playerStats} />
          <PlayerStats {...enemyStats} isEnemy />
        </div>

        {/* Play area */}
        <div className="relative min-h-[200px] mb-8 rounded-2xl bg-slate-900/40 backdrop-blur border border-slate-800/50 p-6">
          <div className="absolute top-2 left-4 text-slate-500 text-xs uppercase tracking-wider">
            Battle Arena
          </div>
          
          <div className="flex justify-center items-center min-h-[150px]">
            <AnimatePresence mode="wait">
              {playedCard && (
                <motion.div
                  key={playedCard.uniqueId}
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -100, opacity: 0, scale: 0.5 }}
                  className="absolute"
                >
                  <Card card={playedCard} isInHand={false} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Hand area */}
        <div className="relative">
          <div className="absolute -top-6 left-4 text-slate-500 text-xs uppercase tracking-wider">
            Your Hand ({hand.length}/7)
          </div>
          
          <div className="flex justify-center items-end py-4 px-8 min-h-[200px] rounded-2xl bg-slate-900/40 backdrop-blur border border-slate-800/50">
            <AnimatePresence>
              {hand.map((card, index) => (
                <Card 
                  key={card.uniqueId}
                  card={card}
                  onClick={playCard}
                  disabled={isAnimating || playerStats.mana < card.cost}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Deck info */}
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            <div className="w-8 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center">
              <span className="text-slate-400 text-xs font-bold">{deck.length}</span>
            </div>
            <span className="text-slate-500 text-xs">Cards</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <Button
            onClick={drawCard}
            disabled={deck.length === 0 || hand.length >= 7 || isAnimating}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            Draw Card
          </Button>
          <Button
            onClick={endTurn}
            disabled={isAnimating}
            variant="outline"
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            End Turn
          </Button>
        </div>
      </div>

      {/* Card effect overlay */}
      <CardEffect 
        type={activeEffect} 
        isActive={!!activeEffect}
        onComplete={handleEffectComplete}
      />

      {/* Game over overlay */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              className="text-center p-8 rounded-2xl bg-slate-900/90 border border-slate-700"
            >
              <div className="text-6xl mb-4">
                {gameOver === 'win' ? '🏆' : '💀'}
              </div>
              <h2 className={`text-3xl font-bold mb-2 ${gameOver === 'win' ? 'text-amber-400' : 'text-rose-400'}`}>
                {gameOver === 'win' ? 'Victory!' : 'Defeat'}
              </h2>
              <p className="text-slate-400 mb-6">
                {gameOver === 'win' 
                  ? 'You have defeated the Dark Sorcerer!' 
                  : 'The Dark Sorcerer has bested you...'}
              </p>
              <Button
                onClick={startGame}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}