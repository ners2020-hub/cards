import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Sparkles, Trophy, Lock, ArrowLeft, Gift, CheckCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import GrimoirePackOpening from "@/components/tcg/GrimoirePackOpening";
import { useAuth } from "@/lib/AuthContext";
import { fetchAllCards } from "@/services/cardService";

const BOOSTER_PACKS = [
  { id: "starter", name: "Starter Pack", cost: 50, cards: 5 },
  { id: "premium", name: "Premium Pack", cost: 150, cards: 5 },
  { id: "elite", name: "Elite Pack", cost: 300, cards: 5 },
];

const DECK_UNLOCK_COSTS = [
  { element: "blood", name: "Blood Deck", cost: 500, winsRequired: 5, requiresDeck: null, description: "5 total wins" },
  { element: "light", name: "Light Deck", cost: 500, winsRequired: 5, requiresDeck: "fire", description: "5 wins with Fire" },
  { element: "cryo", name: "Cryo Deck", cost: 500, winsRequired: 5, requiresDeck: "water", description: "5 wins with Water" },
  { element: "electric", name: "Electric Deck", cost: 500, winsRequired: 5, requiresDeck: "earth", description: "5 wins with Earth" },
  { element: "shadow", name: "Shadow Deck", cost: 500, winsRequired: 5, requiresDeck: "wind", description: "5 wins with Wind" },
];

const RARITY_POOL = {
  starter: { common: 0.7, uncommon: 0.25, rare: 0.05, epic: 0, legendary: 0 },
  premium: { common: 0.4, uncommon: 0.35, rare: 0.2, epic: 0.05, legendary: 0 },
  elite: { common: 0.2, uncommon: 0.3, rare: 0.3, epic: 0.15, legendary: 0.05 },
};

function pickRarity(rarities) {
  const rand = Math.random();
  let cumulative = 0;
  for (const [rarity, chance] of Object.entries(rarities)) {
    cumulative += chance;
    if (rand <= cumulative) return rarity;
  }
  return "common";
}

async function generateStarterCardsFromDb() {
  // No hardcoded card codes. Starter set is derived from DB content.
  // We seed players with a small pool of non-spell cards from the base unlocked elements.
  const starterElements = ["fire", "water", "earth", "wind"];

  const { data, error } = await supabase
    .from("card")
    .select("code, element, card_type, rarity")
    .in("element", starterElements)
    .in("card_type", ["controller", "creature"])
    .order("code", { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);

  const picked = (data || []).slice(0, 14);
  return picked.map((c) => ({ card_id: c.code, quantity: 2 }));
}

export default function Shop() {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const [openedCards, setOpenedCards] = useState([]);
  const [showPack, setShowPack] = useState(false);

  const [promoCode, setPromoCode] = useState("");
  const [redeemError, setRedeemError] = useState("");
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  const email = user?.email || null;

  const { data: allCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["all-cards"],
    queryFn: fetchAllCards,
    staleTime: 300000,
    enabled: !!email && !authLoading,
  });

  const cardByCode = useMemo(() => {
    const m = new Map();
    for (const c of allCards || []) m.set(c.code, c);
    return m;
  }, [allCards]);

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["player-progress", email],
    enabled: !!email && !authLoading,
    queryFn: async () => {
      // Load existing progress
      const { data, error } = await supabase
        .from("playerprogress")
        .select("*")
        .eq("user_email", email)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (data) return data;

      // Create default progress (starter cards)
      const starterCards = await generateStarterCardsFromDb();

      const insertPayload = {
        user_email: email,
        tokens: 100,
        unlocked_decks: ["fire", "water", "earth", "wind"], // keep sane starter set
        owned_cards: starterCards,
        total_wins: 0,
        ai_wins: 0,
        pvp_wins: 0,
        deck_wins: {},
        xp: 0,
        level: 1,
        fate_rank: "Unranked",
        admin_mode_active: false,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };

      const { data: created, error: createErr } = await supabase
        .from("playerprogress")
        .insert(insertPayload)
        .select("*")
        .maybeSingle();

      if (createErr) throw new Error(createErr.message);
      return created;
    },
  });

  const buyPackMutation = useMutation({
    mutationFn: async (packType) => {
      if (!progress || !email) throw new Error("Progress not loaded");

      const pack = BOOSTER_PACKS.find((p) => p.id === packType);
      if (!pack) throw new Error("Unknown pack");

      if (!progress.admin_mode_active && (progress.tokens ?? 0) < pack.cost) {
        throw new Error("Not enough tokens");
      }

      // Pull cards from Supabase "card" table
      const { data: allCards, error } = await supabase
        .from("card")
        .select("code, name, rarity, element, cost, ap, ch, description, art_url, card_type, abilities, keywords, is_unique, is_persistent, is_attachment, is_token, flavor_text")
        .limit(5000);

      if (error) throw new Error(error.message);

      const rarities = RARITY_POOL[pack.id] || RARITY_POOL.starter;
      const updatedOwnedCards = Array.isArray(progress.owned_cards) ? [...progress.owned_cards] : [];
      const newCards = [];

      for (let i = 0; i < pack.cards; i++) {
        const selectedRarity = pickRarity(rarities);
        const pool = (allCards || []).filter((c) => String(c.rarity || "").toLowerCase() === selectedRarity);

        if (pool.length === 0) continue;

        const randomCard = pool[Math.floor(Math.random() * pool.length)];
        // Back-compat: some UI paths still read image_url
        newCards.push({
          ...randomCard,
          image_url: randomCard.art_url || randomCard.image_url || null
        });

        const existing = updatedOwnedCards.find((c) => c.card_id === randomCard.code);
        if (existing) existing.quantity += 1;
        else updatedOwnedCards.push({ card_id: randomCard.code, quantity: 1 });
      }

      const newTokenValue = progress.admin_mode_active ? progress.tokens : (progress.tokens ?? 0) - pack.cost;

      const { error: updateErr } = await supabase
        .from("playerprogress")
        .update({
          tokens: newTokenValue,
          owned_cards: updatedOwnedCards,
          updated_date: new Date().toISOString(),
        })
        .eq("user_email", email);

      if (updateErr) throw new Error(updateErr.message);

      return newCards;
    },
    onSuccess: (cards) => {
      setOpenedCards(cards);
      setShowPack(true);
      queryClient.invalidateQueries({ queryKey: ["player-progress", email] });
    },
    onError: (err) => {
      setRedeemError(err.message || "Failed to buy pack");
      setTimeout(() => setRedeemError(""), 3000);
    },
  });

  const unlockDeckMutation = useMutation({
    mutationFn: async (element) => {
      if (!progress || !email) throw new Error("Progress not loaded");

      const deck = DECK_UNLOCK_COSTS.find((d) => d.element === element);
      if (!deck) throw new Error("Unknown deck");

      const deckWins = progress.deck_wins && typeof progress.deck_wins === "object" ? progress.deck_wins : {};
      const requiredDeckWins = deck.requiresDeck ? Number(deckWins[deck.requiresDeck] || 0) : Number(progress.total_wins || 0);

      if (!progress.admin_mode_active && (progress.tokens ?? 0) < deck.cost) {
        throw new Error("Not enough tokens");
      }
      if (!progress.admin_mode_active && requiredDeckWins < deck.winsRequired) {
        throw new Error("Not enough wins");
      }

      const unlocked = Array.isArray(progress.unlocked_decks) ? progress.unlocked_decks : [];
      if (!unlocked.includes(element)) {
        unlocked.push(element);
      }

      const newTokenValue = progress.admin_mode_active ? progress.tokens : (progress.tokens ?? 0) - deck.cost;

      const { error } = await supabase
        .from("playerprogress")
        .update({
          tokens: newTokenValue,
          unlocked_decks: unlocked,
          updated_date: new Date().toISOString(),
        })
        .eq("user_email", email);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["player-progress", email] }),
    onError: (err) => {
      setRedeemError(err.message || "Failed to unlock deck");
      setTimeout(() => setRedeemError(""), 3000);
    },
  });

  const redeemPromoMutation = useMutation({
    mutationFn: async (rawCode) => {
      if (!progress || !email) throw new Error("Player progress not loaded yet.");

      const code = (rawCode || "").trim().toUpperCase();
      if (!code) throw new Error("Please enter a promo code.");

      // Redeem via Edge Function (server-side). This enforces:
      // - active / expiry / max uses
      // - per-user redemption
      // - atomic token + card grants
      const { data, error } = await supabase.functions.invoke("redeem-promocode", {
        body: { code },
      });

      if (error) throw new Error(error.message || "Failed to redeem promo code.");

      const payload = data?.data;
      if (!payload) throw new Error("Unexpected promo redemption response.");

      const tokensAward = Number(payload.tokens_awarded || 0);
      const rewardEntries = Array.isArray(payload.card_rewards) ? payload.card_rewards : [];

      // Expand codes by quantity for animation
      const rewardCodesExpanded = [];
      for (const entry of rewardEntries) {
        const cardCode = entry?.card_code;
        const qty = Math.max(1, Number(entry?.quantity || 1));
        if (!cardCode) continue;
        for (let i = 0; i < qty; i++) rewardCodesExpanded.push(cardCode);
      }

      // Resolve to full card objects from DB-loaded map
      const cardsForAnim = rewardCodesExpanded
        .map((c) => cardByCode.get(c))
        .filter(Boolean);

      return {
        cards: cardsForAnim,
        tokens: tokensAward,
      };
    },
    onSuccess: (result) => {
      const cards = Array.isArray(result?.cards) ? result.cards : [];
      if (cards.length > 0) {
        setOpenedCards(cards);
        setShowPack(true);
      }

      setPromoCode("");
      setRedeemError("");
      setRedeemSuccess(true);
      setTimeout(() => setRedeemSuccess(false), 3000);
      queryClient.invalidateQueries({ queryKey: ["player-progress", email] });
    },
    onError: (error) => {
      setRedeemError(error.message);
      setTimeout(() => setRedeemError(""), 3000);
    },
  });

  const tokensDisplay = progress?.admin_mode_active ? "∞" : String(progress?.tokens ?? 0);

  const deckUnlockCards = useMemo(() => {
    const unlocked = Array.isArray(progress?.unlocked_decks) ? progress.unlocked_decks : [];
    const deckWins = progress?.deck_wins && typeof progress.deck_wins === "object" ? progress.deck_wins : {};
    const totalWins = Number(progress?.total_wins || 0);

    return DECK_UNLOCK_COSTS.map((deck) => {
      const isUnlocked = unlocked.includes(deck.element) || !!progress?.admin_mode_active;
      const requiredDeckWins = deck.requiresDeck ? Number(deckWins[deck.requiresDeck] || 0) : totalWins;
      const canUnlock =
        !!progress?.admin_mode_active || ((progress?.tokens ?? 0) >= deck.cost && requiredDeckWins >= deck.winsRequired);

      return { deck, isUnlocked, requiredDeckWins, canUnlock };
    });
  }, [progress]);

  if (authLoading || !user || progressLoading || cardsLoading || !progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl("TCGMainMenu")}>
            <Button variant="outline" className="border-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <div className="flex items-center gap-6">
            <div className="px-6 py-3 bg-amber-600/20 rounded-lg border-2 border-amber-500">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span className="text-2xl font-bold text-amber-400">{tokensDisplay}</span>
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-purple-400" />
                <span className="text-white">{progress.total_wins ?? 0} Wins</span>
              </div>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
          Shop
        </h1>

        {/* Promo Code Redemption */}
        <Card className="bg-slate-900/80 border-2 border-amber-500 mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gift className="w-6 h-6 text-amber-400" />
              Redeem Promo Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Enter promo code"
                className="bg-slate-800 border-slate-700 text-white uppercase font-mono"
              />
              <Button
                onClick={() => redeemPromoMutation.mutate(promoCode)}
                disabled={!promoCode || redeemPromoMutation.isPending}
                className="bg-gradient-to-r from-amber-600 to-orange-600"
              >
                {redeemPromoMutation.isPending ? "Redeeming..." : "Redeem"}
              </Button>
            </div>
            {redeemError && <p className="text-red-400 text-sm mt-2">❌ {redeemError}</p>}
            {redeemSuccess && (
              <p className="text-green-400 text-sm mt-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Promo code redeemed successfully!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Booster Packs */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-4">Booster Packs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BOOSTER_PACKS.map((pack) => (
              <Card
                key={pack.id}
                className="bg-slate-900/80 border-2 border-purple-500 hover:border-purple-400 transition-colors"
              >
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
                    disabled={!progress.admin_mode_active && (progress.tokens ?? 0) < pack.cost}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {progress.admin_mode_active ? "FREE" : `${pack.cost} Tokens`}
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
            {deckUnlockCards.map(({ deck, isUnlocked, requiredDeckWins, canUnlock }) => (
              <Card
                key={deck.element}
                className={`bg-slate-900/80 border-2 ${isUnlocked ? "border-green-500" : "border-slate-700"}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    {isUnlocked ? (
                      <Trophy className="w-6 h-6 text-green-400" />
                    ) : (
                      <Lock className="w-6 h-6 text-slate-400" />
                    )}
                    {deck.name}
                    {progress.admin_mode_active && !((progress.unlocked_decks || []).includes(deck.element)) && (
                      <span className="text-xs text-amber-400">ADMIN</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isUnlocked ? (
                    <p className="text-green-400 font-bold">Unlocked!</p>
                  ) : (
                    <>
                      <p className="text-slate-300 mb-2">Required: {deck.description}</p>
                      <p className="text-slate-400 text-sm mb-4">
                        Progress: {requiredDeckWins}/{deck.winsRequired}
                      </p>
                      <Button
                        onClick={() => unlockDeckMutation.mutate(deck.element)}
                        disabled={!canUnlock}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {progress.admin_mode_active ? "FREE" : `${deck.cost} Tokens`}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Grimoire Pack Opening Animation */}
      <AnimatePresence>
        {showPack && <GrimoirePackOpening cards={openedCards} onComplete={() => setShowPack(false)} />}
      </AnimatePresence>
    </div>
  );
}
