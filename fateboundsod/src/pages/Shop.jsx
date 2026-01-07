import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Sparkles, Trophy, Lock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { 
  BLOOD_DECK, FIRE_DECK, LIGHT_DECK, WIND_DECK, 
  SHADOW_DECK, ELECTRIC_DECK, CRYO_DECK, EARTH_DECK, WATER_DECK 
} from './TCG';

const BOOSTER_PACKS = [
  { id: 'starter', name: 'Starter Pack', cost: 50, cards: 5, rarity: 'common' },
  { id: 'premium', name: 'Premium Pack', cost: 150, cards: 5, rarity: 'rare' },
  { id: 'elite', name: 'Elite Pack', cost: 300, cards: 5, rarity: 'epic' }
];

const DECK_UNLOCK_COSTS = [
  { element: 'shadow', name: 'Shadow Deck', cost: 500, winsRequired: 5 },
  { element: 'electric', name: 'Electric Deck', cost: 500, winsRequired: 5 },
  { element: 'cryo', name: 'Cryo Deck', cost: 500, winsRequired: 5 },
  { element: 'earth', name: 'Earth Deck', cost: 500, winsRequired: 5 },
  { element: 'water', name: 'Water Deck', cost: 500, winsRequired: 5 }
];

const ALL_CARD_POOLS = [
  ...BLOOD_DECK, ...FIRE_DECK, ...LIGHT_DECK, ...WIND_DECK,
  ...SHADOW_DECK, ...ELECTRIC_DECK, ...CRYO_DECK, ...EARTH_DECK, ...WATER_DECK
];

export default function Shop() {
  const [user, setUser] = useState(null);
  const [openedCards, setOpenedCards] = useState([]);
  const [showPack, setShowPack] = useState(false);
  const queryClient = useQueryClient();

useEffect(() => {
  if (import.meta.env.DEV) {
    setCurrentUser({ email: 'dev@local.test' });
    return;
  }

  base44.auth.me()
    .then(user => setCurrentUser(user))
    .catch(() => {});
}, []);



  const { data: progress } = useQuery({
    queryKey: ['player-progress', user?.email],
    queryFn: async () => {
      const progs = await base44.entities.PlayerProgress.filter({ user_email: user.email });
      if (progs.length > 0) return progs[0];
      
      // Create default progress with starter cards
      const starterCards = await generateStarterCards();
      return await base44.entities.PlayerProgress.create({
        user_email: user.email,
        tokens: 100,
        unlocked_decks: ['blood', 'fire', 'wind', 'light'],
        owned_cards: starterCards,
        total_wins: 0,
        ai_wins: 0,
        pvp_wins: 0
      });
    },
    enabled: !!user
  });

  const buyPackMutation = useMutation({
    mutationFn: async (packType) => {
      const pack = BOOSTER_PACKS.find(p => p.id === packType);
      if (!progress.admin_mode_active && progress.tokens < pack.cost) throw new Error('Not enough tokens');
      
      const newCards = await generateBoosterCards(pack);
      const updatedOwnedCards = [...progress.owned_cards];
      
      newCards.forEach(card => {
        const existing = updatedOwnedCards.find(c => c.card_id === card.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          updatedOwnedCards.push({ card_id: card.id, quantity: 1 });
        }
      });
      
      await base44.entities.PlayerProgress.update(progress.id, {
        tokens: progress.admin_mode_active ? progress.tokens : progress.tokens - pack.cost,
        owned_cards: updatedOwnedCards
      });
      
      return newCards;
    },
    onSuccess: (cards) => {
      setOpenedCards(cards);
      setShowPack(true);
      queryClient.invalidateQueries(['player-progress']);
    }
  });

  const unlockDeckMutation = useMutation({
    mutationFn: async (element) => {
      const deck = DECK_UNLOCK_COSTS.find(d => d.element === element);
      if (!progress.admin_mode_active && progress.tokens < deck.cost) throw new Error('Not enough tokens');
      if (!progress.admin_mode_active && progress.total_wins < deck.winsRequired) throw new Error('Not enough wins');
      
      await base44.entities.PlayerProgress.update(progress.id, {
        tokens: progress.admin_mode_active ? progress.tokens : progress.tokens - deck.cost,
        unlocked_decks: [...progress.unlocked_decks, element]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player-progress']);
    }
  });

  if (!user || !progress) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl('TCG')}>
            <Button variant="outline" className="border-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-6">
            <div className="px-6 py-3 bg-amber-600/20 rounded-lg border-2 border-amber-500">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{progress.tokens}</span>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                <span className="text-white">{progress.total_wins} Wins</span>
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">Shop</h1>

        {/* Booster Packs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Booster Packs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BOOSTER_PACKS.map(pack => (
              <Card key={pack.id} className="bg-slate-900/80 border-2 border-purple-500 hover:border-purple-400 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Package className="w-6 h-6 text-purple-400" />
                    {pack.name}
                    {progress.admin_mode_active && <span className="text-xs text-amber-400">ADMIN</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 mb-4">{pack.cards} random cards</p>
                  <Button
                    onClick={() => buyPackMutation.mutate(pack.id)}
                    disabled={!progress.admin_mode_active && progress.tokens < pack.cost}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {progress.admin_mode_active ? 'FREE' : `${pack.cost} Tokens`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Deck Unlocks */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Unlock Decks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DECK_UNLOCK_COSTS.map(deck => {
              const isUnlocked = progress.unlocked_decks.includes(deck.element) || progress.admin_mode_active;
              const canUnlock = progress.admin_mode_active || (progress.tokens >= deck.cost && progress.total_wins >= deck.winsRequired);

              return (
                <Card key={deck.element} className={`bg-slate-900/80 border-2 ${isUnlocked ? 'border-green-500' : 'border-slate-700'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      {isUnlocked ? <Trophy className="w-6 h-6 text-green-400" /> : <Lock className="w-6 h-6 text-slate-400" />}
                      {deck.name}
                      {progress.admin_mode_active && !progress.unlocked_decks.includes(deck.element) && <span className="text-xs text-amber-400">ADMIN</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isUnlocked ? (
                      <p className="text-green-400 font-bold">Unlocked!</p>
                    ) : (
                      <>
                        <p className="text-slate-300 mb-2">Required: {deck.winsRequired} wins</p>
                        <p className="text-slate-400 text-sm mb-4">Your wins: {progress.total_wins}</p>
                        <Button
                          onClick={() => unlockDeckMutation.mutate(deck.element)}
                          disabled={!canUnlock}
                          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {progress.admin_mode_active ? 'FREE' : `${deck.cost} Tokens`}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pack Opening Animation */}
      <AnimatePresence>
        {showPack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setShowPack(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 p-8 rounded-2xl border-2 border-purple-500 max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-3xl font-bold text-purple-400 mb-6 text-center">Cards Obtained!</h2>
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {openedCards.map((card, i) => (
                  <motion.div
                    key={i}
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ delay: i * 0.2 }}
                    className="w-32"
                  >
                    <div className="bg-slate-800 rounded-lg border-2 border-purple-500 overflow-hidden">
                      {card.image_url && (
                        <img 
                          src={card.image_url} 
                          alt={card.name}
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-3">
                        <p className="text-white text-xs font-bold text-center mb-1">{card.name}</p>
                        <p className="text-slate-400 text-[10px] text-center capitalize">{card.element}</p>
                        <p className="text-purple-400 text-[10px] text-center capitalize">{card.card_type}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <Button onClick={() => setShowPack(false)} className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                Continue
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function generateStarterCards() {
  // Give 2 copies of each starter deck card for fire/blood
  const starterCards = [...BLOOD_DECK.slice(0, 10), ...FIRE_DECK.slice(0, 10)];
  return starterCards.map(card => ({ card_id: card.id, quantity: 2 }));
}

function generateBoosterCards(pack) {
  const cards = [];
  
  for (let i = 0; i < pack.cards; i++) {
    const randomCard = ALL_CARD_POOLS[Math.floor(Math.random() * ALL_CARD_POOLS.length)];
    cards.push(randomCard);
  }
  
  return cards;
}