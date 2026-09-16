// src/pages/DeckBuilder.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { ArrowLeft, Trash2, Plus, Minus, Save, BookOpen, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import GameCard from '@/components/tcg/GameCard';
import CardPreviewer from '@/components/tcg/CardPreviewer';
import { ArcaneParticles, ArcaneSignil, ArcaneFrame, MagicalButton } from '@/components/tcg/ArcaneEffects';

// Services (your new canonical layer)
import { cardService } from '@/services/cardService';
import { deckService } from '@/services/deckService';
import { userService } from '@/services/userService';

// Rules (shared deck logic)
import {
  buildOwnedMap,
  addCardToDeck,
  removeCardFromDeck,
  canAddToDeck,
  validateDeck,
  serializeDeck,
  hydrateDeck
} from '@/services/deckRules';

const ELEMENT_OPTIONS = [
  { value: 'all', label: '🌟 All' },
  { value: 'fire', label: '🔥 Fire' },
  { value: 'water', label: '💧 Water' },
  { value: 'earth', label: '🌿 Earth' },
  { value: 'wind', label: '💨 Wind' },
  { value: 'blood', label: '🩸 Blood' },
  { value: 'light', label: '☀️ Light' },
  { value: 'shadow', label: '🌑 Shadow' },
  { value: 'electric', label: '⚡ Electric' },
  { value: 'cryo', label: '❄️ Cryo' }
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'controller', label: 'Controllers' },
  { value: 'creature', label: 'Creatures' },
  { value: 'spell', label: 'Spells' },
  { value: 'artifact', label: 'Artifacts' }
];

export default function DeckBuilder() {
  const queryClient = useQueryClient();

  const [deckName, setDeckName] = useState('');
  const [selectedElement, setSelectedElement] = useState('fire');
  const [filterType, setFilterType] = useState('all');
  const [showOnlyOwned, setShowOnlyOwned] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewCard, setViewCard] = useState(null);

  // Deck state is always rows: [{ card, quantity }]
  const [currentDeck, setCurrentDeck] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(null);

  // -----------------------------
  // User + Progress (owned cards)
  // -----------------------------
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['auth-user'],
    queryFn: () => userService.getCurrentUser(), // should return { email, ... } or null
    staleTime: 0,
    cacheTime: 0
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['player-progress', user?.email],
    queryFn: () => userService.getPlayerProgress(user.email), // expects progress row or null
    enabled: !!user?.email,
    staleTime: 0,
    cacheTime: 0
  });

  // If you store admin mode elsewhere, this keeps the deckbuilder consistent
  const isAdmin = !!progress?.admin_mode_active;

  // -----------------------------
  // Cards
  // -----------------------------
  const { data: allCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ['all-cards'],
    queryFn: () => cardService.getAllCards(), // should return normalized cards with id=code
    staleTime: 0,
    cacheTime: 0
  });

  const allCardsByCode = useMemo(() => {
    const map = new Map();
    for (const c of allCards) map.set(c.code, c);
    return map;
  }, [allCards]);

  // -----------------------------
  // Saved decks
  // -----------------------------
  const { data: savedDecks = [], isLoading: decksLoading } = useQuery({
    queryKey: ['custom-decks', user?.email],
    queryFn: () => deckService.listCustomDecks(user.email),
    enabled: !!user?.email
  });

  // -----------------------------
  // Derived card view model
  // -----------------------------
  const ownedMap = useMemo(() => buildOwnedMap(progress?.owned_cards || []), [progress]);

  const elementAuraColors = useMemo(
    () => ({
      fire: 'rgba(249, 115, 22, 0.4)',
      water: 'rgba(59, 130, 246, 0.4)',
      earth: 'rgba(217, 119, 6, 0.4)',
      wind: 'rgba(34, 211, 238, 0.4)',
      blood: 'rgba(239, 68, 68, 0.4)',
      light: 'rgba(251, 191, 36, 0.4)',
      shadow: 'rgba(168, 85, 247, 0.4)',
      electric: 'rgba(234, 179, 8, 0.4)',
      cryo: 'rgba(96, 165, 250, 0.4)'
    }),
    []
  );

  const availableCards = useMemo(() => {
    // element filter, universal available, tokens excluded for deck building
    const base =
      selectedElement === 'all'
        ? allCards
        : allCards.filter((c) => c.element === selectedElement || c.element === 'universal');

    return base.filter((c) => c.card_type !== 'token' && !c.is_token);
  }, [allCards, selectedElement]);

  const cardsWithOwnership = useMemo(() => {
    return availableCards.map((card) => {
      const qty = isAdmin ? 99 : (ownedMap[card.code] || 0);
      const locked = isAdmin ? false : qty <= 0;

      return {
        ...card,
        owned: qty,
        isLocked: locked,
        auraColor: elementAuraColors[card.element] || 'rgba(168, 85, 247, 0.3)'
      };
    });
  }, [availableCards, ownedMap, isAdmin, elementAuraColors]);

  const filteredCards = useMemo(() => {
    let list = cardsWithOwnership;

    if (filterType !== 'all') list = list.filter((c) => c.card_type === filterType);
    if (searchTerm.trim()) {
      const s = searchTerm.trim().toLowerCase();
      list = list.filter((c) => (c.name || '').toLowerCase().includes(s));
    }
    if (showOnlyOwned) list = list.filter((c) => !c.isLocked);

    return list;
  }, [cardsWithOwnership, filterType, searchTerm, showOnlyOwned]);

  // -----------------------------
  // Mutations (save/delete)
  // -----------------------------
  const saveDeckMutation = useMutation({
    mutationFn: async (payload) => {
      // deckService should decide insert vs update based on payload.id
      return deckService.saveCustomDeck(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-decks'] });
      setDeckName('');
      setCurrentDeck([]);
      setSelectedDeckId(null);
    },
    onError: (err) => {
      alert(`Save failed: ${err?.message || 'Unknown error'}`);
    }
  });

  const deleteDeckMutation = useMutation({
    mutationFn: (id) => deckService.deleteCustomDeck(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-decks'] });
    },
    onError: (err) => {
      alert(`Delete failed: ${err?.message || 'Unknown error'}`);
    }
  });

  // -----------------------------
  // Handlers (now tiny)
  // -----------------------------
  const onAddCard = useCallback(
    (card) => {
      setCurrentDeck((prev) => {
        if (!canAddToDeck(prev, card)) {
          // Optional: deckRules can also return a reason string if you want
          alert('Cannot add more of this card due to deck rules.');
          return prev;
        }
        return addCardToDeck(prev, card);
      });
    },
    [setCurrentDeck]
  );

  const onRemoveCard = useCallback(
    (cardCode) => {
      setCurrentDeck((prev) => removeCardFromDeck(prev, cardCode));
    },
    [setCurrentDeck]
  );

  const totalCards = useMemo(
    () => currentDeck.reduce((sum, row) => sum + (row.quantity || 0), 0),
    [currentDeck]
  );

  const avgCost = useMemo(() => {
    if (!totalCards) return 0;
    const totalCost = currentDeck.reduce((sum, row) => sum + (Number(row.card?.cost || 0) * row.quantity), 0);
    return (totalCost / totalCards).toFixed(1);
  }, [currentDeck, totalCards]);

  const onSaveDeck = useCallback(() => {
    if (!user?.email) return;

    if (!deckName.trim()) {
      alert('Please enter a deck name');
      return;
    }

    const result = validateDeck(currentDeck);
    if (!result.ok) {
      alert(result.reason || 'Deck invalid');
      return;
    }

    const payload = {
      id: selectedDeckId || undefined,
      name: deckName.trim(),
      user_email: user.email,
      element: selectedElement,
      cards: serializeDeck(currentDeck), // [{ card_id: code, quantity }]
      total_cards: totalCards,
      is_valid: true
    };

    saveDeckMutation.mutate(payload);
  }, [user, deckName, currentDeck, selectedDeckId, selectedElement, totalCards, saveDeckMutation]);

  const onLoadDeck = useCallback(
    (deck) => {
      setDeckName(deck.name || '');
      setSelectedElement(deck.element || 'fire');
      setSelectedDeckId(deck.id);

      // deck.cards assumed format: [{ card_id: 'CODE', quantity }]
      const hydrated = hydrateDeck(deck.cards || [], allCardsByCode);
      setCurrentDeck(hydrated);
    },
    [allCardsByCode]
  );

  // Reset deck selection if user logs out
  useEffect(() => {
    if (!user?.email) {
      setDeckName('');
      setCurrentDeck([]);
      setSelectedDeckId(null);
    }
  }, [user?.email]);

  // -----------------------------
  // Loading
  // -----------------------------
  if (userLoading || cardsLoading || progressLoading || decksLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Please sign in.</div>
      </div>
    );
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.2),rgba(139,92,246,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_80%_20%,rgba(34,211,238,0.15),rgba(34,211,238,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.3)_100%)]" />
      <div className="absolute inset-0 opacity-10">
        <ArcaneSignil />
      </div>
      <ArcaneParticles />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            <Link to={createPageUrl('TCGMainMenu')}>
              <MagicalButton variant="secondary" className="text-cyan-300">
                <ArrowLeft className="w-4 h-4" />
                Back
              </MagicalButton>
            </Link>
            <Link to={createPageUrl('Shop')}>
              <MagicalButton variant="secondary" className="text-amber-300">
                <Flame className="w-4 h-4" />
                Shop
              </MagicalButton>
            </Link>
          </div>

          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-400 to-orange-400 tracking-wider drop-shadow-[0_0_30px_rgba(168,85,247,0.6)]">
            Deck Forge
          </h1>

          <div className="w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Collection */}
          <div className="lg:col-span-2 space-y-4">
            <ArcaneFrame className="bg-slate-900/40 mb-4">
              <div className="p-6">
                <div className="space-y-4 mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-cyan-300 tracking-widest uppercase">✦ Grimoire ✦</h2>
                  </div>

                  <Input
                    placeholder="Search by card name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-800/50 border-purple-500/30 text-white placeholder-purple-400/50"
                  />
                </div>

                <div className="flex gap-2 flex-wrap mb-2">
                  <Select value={selectedElement} onValueChange={setSelectedElement}>
                    <SelectTrigger className="w-36 bg-slate-800/50 border-purple-500/30 text-purple-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                      {ELEMENT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-white">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-32 bg-slate-800/50 border-purple-500/30 text-purple-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-purple-500/50 text-white">
                      {TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-white">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <MagicalButton
                    onClick={() => setShowOnlyOwned((v) => !v)}
                    variant={showOnlyOwned ? 'primary' : 'secondary'}
                    className={showOnlyOwned ? 'text-green-300' : 'text-purple-300'}
                  >
                    {showOnlyOwned ? '✓ Owned' : 'All'}
                  </MagicalButton>
                </div>
              </div>
            </ArcaneFrame>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-8 bg-slate-900/40 p-6 rounded-2xl max-h-[600px] overflow-y-auto">
              {filteredCards.map((card) => {
                const inDeck = currentDeck.find((r) => r.card?.code === card.code);
                const canAddMore = !card.isLocked && canAddToDeck(currentDeck, card);

                return (
                  <div key={card.code} className="flex flex-col items-center gap-2">
                    {card.isLocked ? (
                      <div className="relative">
                        <div className="opacity-40 grayscale">
                          <GameCard card={card} onView={() => setViewCard(card)} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                          <div className="text-3xl">🔮</div>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <GameCard card={card} onView={() => setViewCard(card)} />
                        <div className="absolute top-1 right-1 bg-slate-900/90 px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400">
                          {card.owned}
                        </div>
                      </div>
                    )}

                    {!card.isLocked && (
                      <div className="flex items-center justify-center gap-1 w-full">
                        <button
                          onClick={() => onAddCard(card)}
                          disabled={!canAddMore}
                          className="h-6 w-6 p-0 bg-gradient-to-br from-green-500 to-green-700 rounded disabled:opacity-30 hover:shadow-[0_0_12px_rgba(34,197,94,0.6)] disabled:hover:shadow-none transition-shadow flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3 text-white" />
                        </button>

                        {inDeck && (
                          <>
                            <span className="text-xs text-white font-bold">{inDeck.quantity}</span>
                            <button
                              onClick={() => onRemoveCard(card.code)}
                              className="h-6 w-6 p-0 bg-gradient-to-br from-red-500 to-red-700 rounded hover:shadow-[0_0_12px_rgba(239,68,68,0.6)] transition-shadow flex items-center justify-center"
                            >
                              <Minus className="w-3 h-3 text-white" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deck and Saved Decks */}
          <div className="space-y-4">
            <ArcaneFrame className="bg-slate-900/40">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-purple-300 tracking-widest uppercase mb-4">✦ Summoning Altar ✦</h2>

                <div className="space-y-4">
                  <Input
                    placeholder="Deck Name"
                    value={deckName}
                    onChange={(e) => setDeckName(e.target.value)}
                    className="bg-slate-800/50 border-purple-500/30 text-white mb-2 placeholder-purple-400/50"
                  />

                  <MagicalButton
                    onClick={onSaveDeck}
                    variant="primary"
                    className="w-full h-12 text-lg font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.8)]"
                    disabled={saveDeckMutation.isPending}
                  >
                    <Save className="w-5 h-5" />
                    {selectedDeckId ? 'Inscribe Deck' : 'Forge Deck'}
                  </MagicalButton>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mt-4">
                  <div className="bg-slate-800/40 border border-purple-500/30 rounded-lg p-3">
                    <div className="text-xs text-purple-400 uppercase tracking-wider">Cards</div>
                    <div className="text-xl font-bold text-cyan-300">{totalCards}</div>
                  </div>
                  <div className="bg-slate-800/40 border border-purple-500/30 rounded-lg p-3">
                    <div className="text-xs text-purple-400 uppercase tracking-wider">Avg Cost</div>
                    <div className="text-xl font-bold text-purple-300">{avgCost}</div>
                  </div>
                  <div className="bg-slate-800/40 border border-purple-500/30 rounded-lg p-3">
                    <div className="text-xs text-purple-400 uppercase tracking-wider">Unique</div>
                    <div className="text-xl font-bold text-orange-300">{currentDeck.length}</div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 mt-4">
                  {currentDeck.map(({ card, quantity }) => (
                    <div
                      key={card.code}
                      className="flex items-center justify-between rounded-lg p-2 border border-purple-500/20 bg-slate-800/30"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-bold text-cyan-300">{quantity}x</span>
                        <span className="text-sm text-purple-200 truncate">{card.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-400 font-bold">{card.cost}</span>
                        <button
                          onClick={() => onRemoveCard(card.code)}
                          className="h-6 w-6 p-0 bg-gradient-to-br from-red-500 to-red-700 rounded hover:shadow-[0_0_12px_rgba(239,68,68,0.6)] transition-shadow flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {currentDeck.length === 0 && <div className="text-center text-slate-400 py-8">No cards yet</div>}
                </div>
              </div>
            </ArcaneFrame>

            <ArcaneFrame className="bg-slate-900/40">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-purple-300 tracking-widest uppercase mb-4 flex items-center gap-2">
                  <BookOpen className="w-6 h-6" />
                  ✦ Compendium ✦
                </h2>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {savedDecks.map((deck) => (
                    <div
                      key={deck.id}
                      className="flex items-center justify-between rounded-lg p-3 border border-purple-500/20 bg-slate-800/40"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-cyan-300 truncate">{deck.name}</div>
                        <div className="text-xs text-purple-400">{deck.total_cards} cards • {deck.element}</div>
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => onLoadDeck(deck)} size="sm" variant="secondary">
                          Load
                        </Button>
                        <button
                          onClick={() => deleteDeckMutation.mutate(deck.id)}
                          className="h-8 w-8 p-0 bg-gradient-to-br from-red-500 to-red-700 rounded hover:shadow-[0_0_12px_rgba(239,68,68,0.6)] transition-shadow flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {savedDecks.length === 0 && <div className="text-center text-slate-400 py-8">No saved decks yet</div>}
                </div>
              </div>
            </ArcaneFrame>
          </div>
        </div>

        <CardPreviewer open={!!viewCard} card={viewCard} onOpenChange={setViewCard} />
      </div>
    </div>
  );
}
