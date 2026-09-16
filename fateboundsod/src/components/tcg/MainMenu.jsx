import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Swords,
  Flame,
  Menu as MenuIcon,
  BookOpen,
  DollarSign,
  Bug,
  User,
  Users,
  Zap,
  Heart,
} from "lucide-react";

import { createPageUrl } from "@/utils";
import { ArcaneParticles, ArcaneSignil, ArcaneFrame, MagicalButton } from "@/components/tcg/ArcaneEffects";

// Deck metadata (UI only - cards come from database)
const DECKS = {
  fire: {
    name: "Fire",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/b5102c3fb_02xFlameOrb.png",
    gradient: "from-orange-600 to-red-600",
    emoji: "🔥",
  },
  water: {
    name: "Water",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/3c15b8b15_02xCrownofNeptune.png",
    gradient: "from-blue-600 to-cyan-600",
    emoji: "💧",
  },
  earth: {
    name: "Earth",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/ed4dda5dd_02xEarthStaff.png",
    gradient: "from-green-600 to-emerald-700",
    emoji: "🌿",
  },
  wind: {
    name: "Wind",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f22199c29_Wind_Orb.png",
    gradient: "from-teal-600 to-cyan-600",
    emoji: "💨",
  },
  blood: {
    name: "Blood",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/98f11f3d4_Blood_Pendant.png",
    gradient: "from-red-600 to-rose-800",
    emoji: "🩸",
  },
  light: {
    name: "Light",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a12822863_02xBlessingofLight.png",
    gradient: "from-amber-400 to-yellow-600",
    emoji: "☀️",
  },
  shadow: {
    name: "Shadow",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/a4a46b103_02xDarkOrb.png",
    gradient: "from-purple-900 to-indigo-950",
    emoji: "🌑",
  },
  electric: {
    name: "Electric",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/c93b665d1_01xLightningWielder.png",
    gradient: "from-yellow-500 to-amber-600",
    emoji: "⚡",
  },
  cryo: {
    name: "Cryo",
    icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/6d2dd9a8c_02xEnchantedIceCrystal.png",
    gradient: "from-cyan-400 to-blue-500",
    emoji: "❄️",
  },
};

export default function MainMenu({
  // data/state from parent
  deviceMode = "desktop",
  currentUser = null,
  progress = null,
  // Optional: when provided, overrides progress.admin_mode_active (legacy)
  adminModeActive: adminModeActiveProp,
  unlockedDecks = ["fire", "water", "earth", "wind"],
  customDecks = [],

  // state up
  selectedDeck: selectedDeckProp = "fire",
  deckMode: deckModeProp = "preset",
  selectedCustomDeck: selectedCustomDeckProp = null,
  aiDifficulty: aiDifficultyProp = "medium",

  // events/handlers from parent
  onChangeSelectedDeck,
  onChangeDeckMode,
  onChangeSelectedCustomDeck,
  onChangeAiDifficulty,

  onBattleCpu,
  onSeekDuels,
  onInviteDuel,
  onOpenBugReport,
}) {
  // allow controlled OR uncontrolled usage
  const [selectedDeckLocal, setSelectedDeckLocal] = useState(selectedDeckProp);
  const [deckModeLocal, setDeckModeLocal] = useState(deckModeProp);
  const [selectedCustomDeckLocal, setSelectedCustomDeckLocal] = useState(selectedCustomDeckProp);
  const [aiDifficultyLocal, setAiDifficultyLocal] = useState(aiDifficultyProp);

  const selectedDeck = onChangeSelectedDeck ? selectedDeckProp : selectedDeckLocal;
  const deckMode = onChangeDeckMode ? deckModeProp : deckModeLocal;
  const selectedCustomDeck = onChangeSelectedCustomDeck ? selectedCustomDeckProp : selectedCustomDeckLocal;
  const aiDifficulty = onChangeAiDifficulty ? aiDifficultyProp : aiDifficultyLocal;

  const setSelectedDeck = (v) => (onChangeSelectedDeck ? onChangeSelectedDeck(v) : setSelectedDeckLocal(v));
  const setDeckMode = (v) => (onChangeDeckMode ? onChangeDeckMode(v) : setDeckModeLocal(v));
  const setSelectedCustomDeck = (v) =>
    (onChangeSelectedCustomDeck ? onChangeSelectedCustomDeck(v) : setSelectedCustomDeckLocal(v));
  const setAiDifficulty = (v) => (onChangeAiDifficulty ? onChangeAiDifficulty(v) : setAiDifficultyLocal(v));

  // Admin mode can live on either userprofile or playerprogress depending on older flows.
  // If a parent passes adminModeActiveProp, prefer it.
  const adminModeActive = Boolean(adminModeActiveProp ?? progress?.admin_mode_active ?? false);
  const isAdminToolsVisible = currentUser?.role === "admin" && adminModeActive;

  const safeDeckGradient = useMemo(() => {
    if (deckMode === "preset") return DECKS[selectedDeck]?.gradient || "from-cyan-600 to-blue-600";
    return "from-purple-600 to-pink-600";
  }, [deckMode, selectedDeck]);

  return (
    <div className={`h-screen relative flex items-center justify-center ${deviceMode === "mobile" ? "p-2" : "p-4"} overflow-hidden bg-slate-950`}>
      {/* Nebula gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.3),rgba(139,92,246,0))]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_80%_20%,rgba(34,211,238,0.2),rgba(34,211,238,0))]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.4)_100%)]" />

      {/* Logo Background - Slow parallax */}
      <div className="absolute inset-0 opacity-30">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 180, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695863a33c3ceb7422adcfeb/f8062dfb3_Fateboundlogo.png"
            alt="Fatebound Logo"
            className="w-full h-full object-contain"
          />
        </motion.div>
      </div>

      {/* Arcane Sigil Background */}
      <ArcaneSignil />

      {/* Floating arcane particles */}
      <ArcaneParticles />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center relative z-10 max-w-4xl mx-auto px-4"
      >
        <ArcaneFrame className="mb-6 p-8 bg-gradient-to-b from-slate-900/60 to-slate-950/80">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-400 to-orange-400 mb-2 leading-tight drop-shadow-[0_0_30px_rgba(168,85,247,0.8)] tracking-wider">
              FATEBOUND
            </h1>
            <h2 className="text-2xl md:text-3xl text-purple-300 font-bold mb-3 tracking-[0.15em]">Shards of Dominion</h2>
            <div className="h-1 w-24 mx-auto bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 rounded-full mb-3" />
            <p className="text-cyan-300/90 text-xs uppercase tracking-[0.3em] font-semibold">Arcane Card Game</p>
          </div>
        </ArcaneFrame>

        <div className="space-y-4">
          {/* Top nav */}
          <ArcaneFrame className="p-3 bg-slate-900/40">
            <div className="flex gap-2 flex-wrap justify-center">
              <Link to={createPageUrl("Profile")}>
                <MagicalButton variant="secondary" className="h-10 px-3 text-purple-300 text-sm">
                  <User className="w-4 h-4" />
                  Profile
                </MagicalButton>
              </Link>

              <Link to={createPageUrl("Shop")}>
                <MagicalButton variant="secondary" className="h-10 px-3 text-amber-300 text-sm">
                  <Flame className="w-4 h-4" />
                  Shop
                </MagicalButton>
              </Link>

              <Link to={createPageUrl("CardTrades")}>
                <MagicalButton variant="secondary" className="h-10 px-3 text-emerald-300 text-sm">
                  <Swords className="w-4 h-4" />
                  Exchange
                </MagicalButton>
              </Link>

              <Link to={createPageUrl("DeckBuilder")}>
                <MagicalButton variant="secondary" className="h-10 px-3 text-violet-300 text-sm">
                  <MenuIcon className="w-4 h-4" />
                  Deck Forge
                </MagicalButton>
              </Link>

              <Link to={createPageUrl("Tutorial")}>
                <MagicalButton variant="secondary" className="h-10 px-3 text-purple-300 text-sm">
                  <BookOpen className="w-4 h-4" />
                  Initiation
                </MagicalButton>
              </Link>

              <button
                onClick={() => onOpenBugReport?.()}
                className="h-10 px-3 text-amber-300 text-sm flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700 rounded-lg border-2 border-amber-600/50 hover:border-amber-500 transition-all"
              >
                <Bug className="w-4 h-4" />
                Support
              </button>

              {isAdminToolsVisible && (
                <>
                  <Link to={createPageUrl("AdminCardCreator")}>
                    <MagicalButton variant="secondary" className="h-10 px-3 text-orange-300 text-sm">
                      <Flame className="w-4 h-4" />
                      Card Forge
                    </MagicalButton>
                  </Link>
                  <Link to={createPageUrl("AdminPromoCodes")}>
                    <MagicalButton variant="secondary" className="h-10 px-3 text-red-300 text-sm">
                      <DollarSign className="w-4 h-4" />
                      Promos
                    </MagicalButton>
                  </Link>
                </>
              )}
            </div>
          </ArcaneFrame>

          {/* Tribute */}
          <a
            href="https://www.paypal.com/donate/?business=9BX7PPHZK5BGC&no_recurring=0&item_name=Fatebound%3A+Shards+of+Dominion+Development&currency_code=USD"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <MagicalButton variant="secondary" className="w-full h-11 text-emerald-300">
              <Heart className="w-4 h-4" />
              Offer Tribute
            </MagicalButton>
          </a>

          {/* Ritual altar */}
          <ArcaneFrame className="p-4 bg-slate-900/40">
            <div className="text-amber-300 text-xs font-semibold tracking-widest mb-3 text-center uppercase">✦ Ritual Altar ✦</div>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setDeckMode("preset")}
                className={`flex-1 px-3 py-1 rounded text-xs font-bold transition-all ${
                  deckMode === "preset" ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Preset
              </button>
              <button
                onClick={() => setDeckMode("custom")}
                className={`flex-1 px-3 py-1 rounded text-xs font-bold transition-all ${
                  deckMode === "custom" ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Custom
              </button>
            </div>

            {deckMode === "preset" ? (
              <div className="grid grid-cols-9 gap-1">
                {Object.entries(DECKS).map(([key, deck]) => {
                  // When admin mode is enabled, unlock all preset decks for admins.
                  const isLocked = !(isAdminToolsVisible) && !unlockedDecks?.includes(key);

                  return (
                    <motion.button
                      key={key}
                      onClick={() => !isLocked && setSelectedDeck(key)}
                      disabled={isLocked}
                      whileHover={!isLocked ? { scale: 1.1, y: -2 } : {}}
                      className={`h-14 flex flex-col gap-0.5 p-1.5 relative rounded-lg transition-all duration-300 ${
                        isLocked
                          ? "opacity-40 cursor-not-allowed"
                          : selectedDeck === key
                            ? "bg-gradient-to-b from-slate-700 to-slate-900 border-2 border-transparent bg-clip-padding"
                            : "border-slate-700/50 hover:border-slate-600"
                      }`}
                      style={
                        selectedDeck === key
                          ? { borderImage: "linear-gradient(135deg, rgb(34 211 238), rgb(168 85 247), rgb(251 146 60)) 1" }
                          : {}
                      }
                    >
                      {selectedDeck === key && (
                        <motion.div
                          className="absolute inset-0 rounded-lg border-2 border-transparent bg-gradient-to-b from-cyan-500/20 via-transparent to-transparent"
                          animate={{
                            boxShadow: [
                              "0 0 20px rgba(34,211,238,0.3)",
                              "0 0 30px rgba(168,85,247,0.5)",
                              "0 0 20px rgba(34,211,238,0.3)",
                            ],
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      )}

                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-lg backdrop-blur-sm">🔮</div>
                        </div>
                      )}

                      <span className="text-lg">{deck.emoji}</span>
                      <span className="text-[7px] font-bold leading-tight text-slate-200">{deck.name}</span>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {customDecks.length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-4">No custom decks saved</div>
                ) : (
                  customDecks.map((deck) => (
                    <motion.button
                      key={deck.id}
                      onClick={() => setSelectedCustomDeck(deck)}
                      whileHover={{ scale: 1.02 }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-bold transition-all text-left ${
                        selectedCustomDeck?.id === deck.id
                          ? "bg-purple-600 text-white border-2 border-purple-400"
                          : "bg-slate-700 text-slate-200 border-2 border-slate-600 hover:border-purple-500"
                      }`}
                    >
                      <div className="font-bold">{deck.name}</div>
                      <div className="text-[10px] opacity-80">{deck.total_cards} cards</div>
                    </motion.button>
                  ))
                )}
              </div>
            )}
          </ArcaneFrame>

          {/* Rewards */}
          <ArcaneFrame className="p-3 bg-slate-900/40">
            <p className="text-amber-300 text-xs font-semibold text-center">
              ✦ Win Rewards ✦<br />
              <span className="text-amber-200">AI: 10</span> • <span className="text-purple-300">PvP: 30</span> tokens
            </p>
          </ArcaneFrame>

          {/* Actions */}
          <ArcaneFrame className="p-4 bg-slate-900/40">
            {deckMode === "custom" && selectedCustomDeck && (
              <div className="mb-3 p-2 bg-slate-800 rounded text-xs text-purple-300 border border-purple-500">
                Selected: <span className="font-bold">{selectedCustomDeck.name}</span>
              </div>
            )}

            <div className="mb-3">
              <div className="text-cyan-300 text-xs font-semibold mb-2 text-center">⚔️ CPU Difficulty ⚔️</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAiDifficulty("easy")}
                  className={`flex-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                    aiDifficulty === "easy" ? "bg-green-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Easy
                </button>
                <button
                  onClick={() => setAiDifficulty("medium")}
                  className={`flex-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                    aiDifficulty === "medium" ? "bg-amber-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => setAiDifficulty("hard")}
                  className={`flex-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                    aiDifficulty === "hard" ? "bg-red-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Hard
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <MagicalButton
                onClick={() => onBattleCpu?.({ deckMode, selectedDeck, selectedCustomDeck, aiDifficulty })}
                variant="primary"
                className={`w-full h-12 bg-gradient-to-r ${safeDeckGradient}`}
              >
                <Swords className="w-5 h-5" />
                Battle vs CPU
              </MagicalButton>

              <div className="relative">
                <MagicalButton
                  onClick={() => onSeekDuels?.({ deckMode, selectedDeck, selectedCustomDeck })}
                  className="w-full h-12 text-white"
                >
                  <Users className="w-5 h-5" />
                  Seek Duels
                </MagicalButton>
                <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-slate-400">Auto-matching</div>
              </div>

              <div className="relative">
                <MagicalButton
                  onClick={() => onInviteDuel?.({ deckMode, selectedDeck, selectedCustomDeck })}
                  className="w-full h-12 text-white"
                >
                  <Zap className="w-5 h-5" />
                  Invite Duel
                </MagicalButton>
                <div className="absolute -bottom-6 left-0 right-0 text-center text-xs text-slate-400">Code-based</div>
              </div>
            </div>
          </ArcaneFrame>

          {/* Updates block */}
          <ArcaneFrame className="p-4 bg-slate-900/40">
            <h3 className="font-bold mb-2 text-amber-300 tracking-widest text-xs uppercase">✦ Updates ✦</h3>
            <div className="space-y-2 text-[11px] text-purple-100 text-left">
              <p className="font-semibold text-cyan-300 mb-2">Thank you for trying out Fatebound: Shards of Dominion!</p>
              <p>• New features and balance changes coming soon</p>
              <p>
                •{" "}
                <a
                  href="https://discord.gg/6M3UWdyEVy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-300 hover:text-indigo-200 underline"
                >
                  Join our Discord
                </a>{" "}
                to report bugs and be part of the community
              </p>
              <p>• More elements and cards in development</p>
            </div>
          </ArcaneFrame>
        </div>
      </motion.div>
    </div>
  );
}
