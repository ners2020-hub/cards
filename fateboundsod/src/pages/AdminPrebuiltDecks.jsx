import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';

const ELEMENTS = [
  'blood',
  'fire',
  'water',
  'earth',
  'wind',
  'light',
  'shadow',
  'electric',
  'cryo'
];

export default function AdminPrebuiltDecks() {
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedElement, setSelectedElement] = useState('fire');
  const [deckCards, setDeckCards] = useState([]);
  const [availableCards, setAvailableCards] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  /* =======================
     AUTH + ADMIN CHECK
  ======================= */

  useEffect(() => {
    const initUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) return;

      setUser(data.user);

      const { data: profile } = await supabase
        .from('userprofile')
        .select('role, admin_mode_active')
        .eq('user_email', data.user.email)
        .single();

      setIsAdmin(profile?.role === 'admin' && profile?.admin_mode_active);
    };

    initUser();
  }, []);

  /* =======================
     DATA FETCHING
  ======================= */

  const { data: allCards = [], isLoading: loadingCards } = useQuery({
    queryKey: ['all-cards'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('card').select('*');
      if (error) throw error;
      return data.map(c => ({
        ...c,
        id: c.code,
        abilities: c.abilities || [],
        keywords: c.keywords || []
      }));
    }
  });

  const { data: presetDecks = [], isLoading: loadingDecks } = useQuery({
    queryKey: ['preset-decks'],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from('presetdeck').select('*');
      if (error) throw error;
      return data;
    }
  });

  /* =======================
     DERIVED STATE
  ======================= */

  useEffect(() => {
    if (!allCards.length || !presetDecks.length) return;

    const currentPreset = presetDecks.find(d => d.element_key === selectedElement);
    let nextDeckCards = [];

    if (currentPreset?.cards) {
      nextDeckCards = currentPreset.cards
        .map(entry => {
          const card = allCards.find(c => c.code === entry.card_id);
          return card ? { ...card, quantity: entry.quantity } : null;
        })
        .filter(Boolean);
    }

    setDeckCards(nextDeckCards);

    const deckCodes = nextDeckCards.map(c => c.code);
    setAvailableCards(
      allCards.filter(c =>
        !deckCodes.includes(c.code) &&
        (c.element === selectedElement || c.element === 'universal') &&
        c.card_type !== 'token'
      )
    );
  }, [selectedElement, allCards, presetDecks]);

  /* =======================
     ACTIONS
  ======================= */

  const addCardToDeck = useCallback((card) => {
    setDeckCards(prev => {
      const existing = prev.find(c => c.code === card.code);

      if (existing) {
        if (card.card_type === 'controller' && existing.quantity >= 1) return prev;
        if (existing.quantity >= 2) return prev;
        return prev.map(c =>
          c.code === card.code ? { ...c, quantity: c.quantity + 1 } : c
        );
      }

      return [...prev, { ...card, quantity: 1 }];
    });

    setAvailableCards(prev => prev.filter(c => c.code !== card.code));
  }, []);

  const removeCardFromDeck = useCallback((card) => {
    setDeckCards(prev => {
      const existing = prev.find(c => c.code === card.code);
      if (!existing) return prev;

      if (existing.quantity > 1) {
        return prev.map(c =>
          c.code === card.code ? { ...c, quantity: c.quantity - 1 } : c
        );
      }

      return prev.filter(c => c.code !== card.code);
    });

    if (card.element === selectedElement || card.element === 'universal') {
      setAvailableCards(prev =>
        prev.some(c => c.code === card.code) ? prev : [...prev, card]
      );
    }
  }, [selectedElement]);

  const handleSave = async () => {
    if (!confirm(`Save changes to ${selectedElement} deck?`)) return;

    const currentPreset = presetDecks.find(d => d.element_key === selectedElement);
    const formattedCards = deckCards.map(c => ({
      card_id: c.code,
      quantity: c.quantity
    }));

    const totalCards = formattedCards.reduce((sum, c) => sum + c.quantity, 0);
    if (totalCards < 30 || totalCards > 40) {
      alert('Deck must contain 30–40 cards.');
      return;
    }

    const controllerCount = deckCards
      .filter(c => c.card_type === 'controller')
      .reduce((sum, c) => sum + c.quantity, 0);

    if (controllerCount !== 3) {
      alert('Deck must contain exactly 3 controllers.');
      return;
    }

    if (currentPreset) {
      await supabase
        .from('presetdeck')
        .update({ cards: formattedCards })
        .eq('id', currentPreset.id);
    } else {
      await supabase.from('presetdeck').insert({
        name: selectedElement.charAt(0).toUpperCase() + selectedElement.slice(1),
        element_key: selectedElement,
        element: selectedElement,
        cards: formattedCards,
        controllers: deckCards
          .filter(c => c.card_type === 'controller')
          .map(c => c.code),
        is_active: true
      });
    }

    queryClient.invalidateQueries({ queryKey: ['preset-decks'] });
    alert('✅ Preset deck saved');
  };

  /* =======================
     GUARDS
  ======================= */

  if (!user || loadingCards || loadingDecks) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold text-red-400">Access Denied</h1>
          <Link to={createPageUrl('TCGMainMenu')}>
            <Button className="mt-4">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  /* =======================
     RENDER
  ======================= */

  const filteredAvailable = availableCards.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <Link to={createPageUrl('TCGMainMenu')}>
            <Button variant="outline"><ArrowLeft /> Back</Button>
          </Link>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Prebuilt Deck Editor
          </h1>
          <Button onClick={handleSave} className="bg-green-600">
            <Save /> Save Deck
          </Button>
        </div>

        <Select value={selectedElement} onValueChange={setSelectedElement}>
          <SelectTrigger className="w-64 mb-6">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ELEMENTS.map(e => (
              <SelectItem key={e} value={e}>{e} Deck</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CURRENT DECK */}
          <Card>
            <CardHeader>
              <CardTitle>
                Current Deck ({deckCards.reduce((s,c)=>s+c.quantity,0)})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {deckCards.map(card => (
                <div key={card.code} className="flex justify-between bg-slate-800 p-3 rounded">
                  <div>
                    <div className="font-bold">{card.quantity}x {card.name}</div>
                    <div className="text-xs text-slate-400">{card.card_type}</div>
                  </div>
                  <Button size="sm" onClick={() => removeCardFromDeck(card)}>
                    <X />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AVAILABLE */}
          <Card>
            <CardHeader>
              <CardTitle>Available Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="mb-4"
              />
              <div className="space-y-2 max-h-[550px] overflow-y-auto">
                {filteredAvailable.map(card => (
                  <div key={card.code} className="flex justify-between bg-slate-800 p-3 rounded">
                    <div>
                      <div className="font-bold">{card.name}</div>
                      <div className="text-xs text-slate-400">{card.card_type}</div>
                    </div>
                    <Button size="sm" onClick={() => addCardToDeck(card)}>
                      <Plus />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
