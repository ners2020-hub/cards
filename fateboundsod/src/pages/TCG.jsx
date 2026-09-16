import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

import GameBoard from '@/components/tcg/GameBoard';
import TutorialOverlay from '@/components/tutorial/TutorialOverlay';

import * as GameEngine from '@/components/tcg/gameEngine';
import { runAITurn } from '@/components/tcg/aiEngine';
import {
  createPvPGameDb,
  joinPvPGameDb,
  startPvPPolling,
  syncPvPStates,
  completePvPGameDb
} from '@/components/tcg/pvpEngine';

import { createPageUrl } from '../utils';

function expandDeckCards(deckCards, cardMap) {
  const expanded = [];
  for (const entry of deckCards || []) {
    // DB uses `code` (canonical). Keep a fallback for older shapes.
    const code = entry.code || entry.card_id || entry.id;
    const qty = Number(entry.quantity) || 0;
    const card = cardMap.get(code);
    if (!card || qty <= 0) continue;
    for (let i = 0; i < qty; i++) expanded.push(card);
  }
  return expanded;
}

function parseJsonbMaybeString(value, fallback) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export default function TCG() {
  const location = useLocation();
  const navigate = useNavigate();

  const navState = location.state || {};
  const requestedMode = navState.mode || null;
  const requestedDeckKey = navState.deckKey || 'fire';

  const [currentUser, setCurrentUser] = useState(null);

  const [allCards, setAllCards] = useState([]);
  const cardMap = useMemo(() => {
    const m = new Map();
    for (const c of allCards) {
      const key = c.code || c.id;
      if (key) m.set(key, c);
    }
    return m;
  }, [allCards]);

  // Engine stays pure; provide a DB-driven card resolver from the already-loaded card table.
  const engineContext = useMemo(() => {
    return {
      resolveCardByCode: (code) => cardMap.get(code)
    };
  }, [cardMap]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [gameState, setGameState] = useState(null);
  const [winner, setWinner] = useState(null);

  // Duel menu (pause menu)
  const [isDuelMenuOpen, setIsDuelMenuOpen] = useState(false);
  const [showBugPrompt, setShowBugPrompt] = useState(false);
  const [bugText, setBugText] = useState('');

  const [tutorialMode, setTutorialMode] = useState(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialActionCompleted, setTutorialActionCompleted] = useState(false);

  const [battleLog, setBattleLog] = useState([]);
  const [aiActionLog, setAiActionLog] = useState([]);
  const [pendingPlayTarget, setPendingPlayTarget] = useState(null);

  const [lobbyMode, setLobbyMode] = useState(null); // 'host' | 'join' | 'seek'
  const [inviteCode, setInviteCode] = useState('');
  const [hostInviteCode, setHostInviteCode] = useState('');
  const [openGames, setOpenGames] = useState([]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowBugPrompt(false);
        setIsDuelMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const goToMainMenu = useCallback(() => {
    navigate(createPageUrl('TCGMainMenu'));
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore sign out errors
    } finally {
      navigate(createPageUrl('TCGMainMenu'));
    }
  }, [navigate]);

  const sendBugReportEmail = useCallback(() => {
    const to = 'support@arcaneduels.com';
    const subject = encodeURIComponent('Fatebound Bug Report');
    const context = {
      user: currentUser?.email || 'unknown',
      requestedMode,
      requestedDeckKey,
      gameMode: gameState?.gameMode || null,
      gameId: gameState?.gameId || null,
      turn: gameState?.turnNumber || null,
      phase: gameState?.phase || null
    };

    const body = encodeURIComponent(
      `Describe the bug:\n\n${bugText || ''}\n\n---\nContext:\n${JSON.stringify(context, null, 2)}\n\nURL: ${window.location.href}`
    );

    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  }, [bugText, currentUser?.email, requestedMode, requestedDeckKey, gameState]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data?.user || null);
    });
  }, []);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const { data, error } = await supabase.from('card').select('*');
        if (error) throw error;

        const normalized = (data || []).map(c => ({
          ...c,
          id: c.code,
          code: c.code
        }));

        setAllCards(normalized);
      } catch (e) {
        setLoadError(e?.message || 'Failed to load cards');
      }
    };

    loadCards();
  }, []);

  const loadPresetDeckByElementKey = useCallback(async (elementKey) => {
    const { data, error } = await supabase
      .from('presetdeck')
      .select('*')
      .eq('element_key', elementKey)
      .single();

    if (error) throw error;
    return data;
  }, []);

  const startAIGame = useCallback(async (deckKey) => {
    const preset = await loadPresetDeckByElementKey(deckKey);

    const deckEntries = parseJsonbMaybeString(preset.cards, []);
    const deckCards = expandDeckCards(deckEntries, cardMap);

    const controllerCodes = parseJsonbMaybeString(preset.controllers, []);
    const controllers = controllerCodes.map(code => cardMap.get(code)).filter(Boolean);

    const playerState = GameEngine.createInitialPlayerState(deckCards, controllers);
    const opponentState = GameEngine.createInitialPlayerState(deckCards, controllers);

    setGameState({
      gameMode: 'ai',
      isMyTurn: true,
      phase: 'setup',
      turnNumber: 1,
      playerState,
      opponentState
    });
  }, [cardMap, loadPresetDeckByElementKey]);

const restartAIGame = useCallback(async () => {
  // AI-only: start a fresh match using the same requested deck.
  if (!gameState || gameState.gameMode !== 'ai') return;
  try {
    setIsDuelMenuOpen(false);
    setShowBugPrompt(false);
    setBugText('');
    setWinner(null);
    setBattleLog([]);
    setAiActionLog([]);
    setPendingPlayTarget(null);
    setTutorialMode(null);
    setTutorialStep(0);
    setTutorialActionCompleted(false);
    await startAIGame(requestedDeckKey);
  } catch (e) {
    console.error('Failed to restart AI game', e);
    setLoadError(e?.message || 'Failed to restart match');
  }
}, [gameState, requestedDeckKey, startAIGame]);

  const startPvPHost = useCallback(async (deckKey) => {
    if (!currentUser) throw new Error('Not authenticated');

    const preset = await loadPresetDeckByElementKey(deckKey);

    const deckCards = expandDeckCards(preset.cards || [], cardMap);
    const controllerCodes = Array.isArray(preset.controllers) ? preset.controllers : [];
    const controllers = controllerCodes.map(code => cardMap.get(code)).filter(Boolean);

    const created = await createPvPGameDb({
      supabase,
      currentUser,
      deckType: deckKey,
      deckName: preset.name || deckKey,
      playerDeck: deckCards,
      playerControllers: controllers,
      visibility: 'open'
    });

    setHostInviteCode(created.inviteCode);

    setGameState({
      gameMode: 'pvp',
      gameId: created.gameId,
      isMyTurn: true,
      phase: 'setup',
      turnNumber: 1,
      playerState: created.playerState,
      opponentState: null
    });

    setLobbyMode('host');
  }, [cardMap, currentUser, loadPresetDeckByElementKey]);

  const joinPvPByCode = useCallback(async (deckKey, code) => {
    if (!currentUser) throw new Error('Not authenticated');

    const trimmed = String(code || '').trim().toUpperCase();
    if (!trimmed) throw new Error('Invite code is required');

    const { data: game, error } = await supabase
      .from('gamestate')
      .select('*')
      .eq('invite_code', trimmed)
      .single();

    if (error) throw error;
    if (!game) throw new Error('Game not found');

    const preset = await loadPresetDeckByElementKey(deckKey);

    const deckCards = expandDeckCards(preset.cards || [], cardMap);
    const controllerCodes = Array.isArray(preset.controllers) ? preset.controllers : [];
    const controllers = controllerCodes.map(c => cardMap.get(c)).filter(Boolean);

    const joined = await joinPvPGameDb({
      supabase,
      currentUser,
      game,
      deckType: deckKey,
      deckName: preset.name || deckKey,
      playerDeck: deckCards,
      playerControllers: controllers
    });

    setGameState({
      gameMode: 'pvp',
      gameId: joined.gameId,
      isMyTurn: false,
      phase: 'setup',
      turnNumber: 1,
      playerState: joined.playerState,
      opponentState: joined.opponentState
    });

    setLobbyMode(null);
  }, [cardMap, currentUser, loadPresetDeckByElementKey]);

  const loadOpenGames = useCallback(async () => {
    const { data, error } = await supabase
      .from('gamestate')
      .select('*')
      .eq('status', 'waiting')
      .eq('game_visibility', 'open')
      .order('created_at', { ascending: false });

    if (error) throw error;
    setOpenGames(data || []);
  }, []);

  useEffect(() => {
    const boot = async () => {
      if (requestedMode?.startsWith('pvp-')) {
        window.location.replace('/multiplayer');
        return;
      }
      if (!requestedMode) {
        setLoading(false);
        return;
      }

      try {
        // wait for cards map
        if (!cardMap.size) return;

        if (requestedMode === 'ai') {
          await startAIGame(requestedDeckKey);
        } else if (requestedMode === 'pvp-create') {
          await startPvPHost(requestedDeckKey);
        } else if (requestedMode === 'pvp-join') {
          setLobbyMode('join');
        } else if (requestedMode === 'pvp-seek') {
          setLobbyMode('seek');
          await loadOpenGames();
        }

        setLoading(false);
      } catch (e) {
        setLoadError(e?.message || 'Failed to start game');
        setLoading(false);
      }
    };

    boot();
  }, [requestedMode, requestedDeckKey, cardMap, startAIGame, startPvPHost, loadOpenGames]);

  // AI turn
  useEffect(() => {
    if (!gameState) return;
    if (gameState.gameMode !== 'ai') return;
    if (gameState.isMyTurn) return;
    if (winner) return;

    let cancelled = false;

    (async () => {
      try {
        const { nextState, aiActionLog: aiLogAdds, battleLogAdds } = await runAITurn(gameState, {
          delayMs: 600,
          difficulty: 'medium',
          engineContext
        });

        if (cancelled) return;

        if (Array.isArray(aiLogAdds) && aiLogAdds.length) {
          setAiActionLog(aiLogAdds);
        }

        if (Array.isArray(battleLogAdds) && battleLogAdds.length) {
          setBattleLog(prev => [...prev, ...battleLogAdds]);
        }

        setGameState(nextState);

        // Win checks (AI turn just ended)
        if (GameEngine.checkWinCondition(nextState.playerState, gameState.turnNumber ?? 1)) {
          setWinner('opponent');
        } else if (GameEngine.checkWinCondition(nextState.opponentState, gameState.turnNumber ?? 1)) {
          setWinner('player');
        }
      } catch (e) {
        console.error('AI turn failed:', e);
        setAiActionLog([`AI Error: ${e?.message || 'Unknown error'}`]);
        // Fail-safe: give turn back to player so the match isn't soft-locked
        setGameState(prev => (prev ? { ...prev, isMyTurn: true } : prev));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameState, winner, engineContext]);

  // PvP polling
  useEffect(() => {
    if (!gameState?.gameId || gameState.gameMode !== 'pvp' || !currentUser) return;

    const stop = startPvPPolling({
      supabase,
      gameId: gameState.gameId,
      currentUserEmail: currentUser.email,
      onUpdate: ({ game, isMyTurn, playerState, opponentState }) => {
        setGameState(prev => ({
          ...prev,
          isMyTurn,
          phase: game.phase,
          turnNumber: game.turn_number,
          playerState,
          opponentState
        }));

        if (game.winner) {
          setWinner(game.winner === currentUser.email ? 'player' : 'opponent');
        }
      }
    });

    return stop;
  }, [gameState?.gameId, currentUser]);


const handleCardPlay = useCallback(async (card, slotType, slotIndex, attachTargetIndex = null) => {
  if (!gameState || !gameState.isMyTurn) return;
  if (pendingPlayTarget) return; // must resolve target selection first

  const result = GameEngine.playCard(
    gameState.playerState,
    card,
    slotType,
    slotIndex,
    gameState.opponentState,
    attachTargetIndex,
    null,
    gameState.turnNumber ?? 1,
    engineContext
  );

  const newState = {
    ...gameState,
    playerState: result.playerState,
    opponentState: result.opponentState || gameState.opponentState
  };

  setGameState(newState);

  // If the play requires a target, keep the card on the field and wait for target selection.
  if (result.needsTarget && result.pendingPlay) {
    setPendingPlayTarget(result.pendingPlay);
    return;
  }

  setBattleLog(prev => [...prev, {
    player: 'you',
    action: `Played ${card.name}`,
    turn: gameState.turnNumber
  }]);

  if (result.postResolve) {
    // Give the UI a beat to show the spell in the zone, then discard it.
    setTimeout(() => {
      setGameState(prev => {
        if (!prev) return prev;
        return { ...prev, playerState: GameEngine.applyPostResolve(prev.playerState, result.postResolve) };
      });
    }, 350);
  }

  if (gameState.gameMode === 'pvp') {
    await syncPvPStates({
      supabase,
      gameId: gameState.gameId,
      playerId: currentUser.email,
      playerState: newState.playerState,
      opponentState: newState.opponentState
    });
  }

  if (GameEngine.checkWinCondition(newState.opponentState, newState.turnNumber ?? 1)) {
    setWinner('player');
    if (gameState.gameMode === 'pvp') {
      await completePvPGameDb({ supabase, gameId: gameState.gameId, winnerId: currentUser.email });
    }
  }
}, [gameState, currentUser, pendingPlayTarget, engineContext]);


const handleResolvePlayTarget = useCallback(async (targetInfo) => {
  if (!gameState || !gameState.isMyTurn || !pendingPlayTarget) return;

  const result = GameEngine.resolvePendingPlay(
    gameState.playerState,
    gameState.opponentState,
    pendingPlayTarget,
    targetInfo,
    engineContext
  );

  const nextState = {
    ...gameState,
    playerState: result.playerState,
    opponentState: result.opponentState || gameState.opponentState
  };

  setGameState(nextState);
  setPendingPlayTarget(null);

  if (result.postResolve) {
    setTimeout(() => {
      setGameState(prev => {
        if (!prev) return prev;
        return { ...prev, playerState: GameEngine.applyPostResolve(prev.playerState, result.postResolve) };
      });
    }, 350);
  }

  if (gameState.gameMode === 'pvp') {
    await syncPvPStates({
      supabase,
      gameId: gameState.gameId,
      playerId: currentUser.email,
      playerState: nextState.playerState,
      opponentState: nextState.opponentState
    });
  }

  if (GameEngine.checkWinCondition(nextState.opponentState, nextState.turnNumber ?? 1)) {
    setWinner('player');
    if (gameState.gameMode === 'pvp') {
      await completePvPGameDb({ supabase, gameId: gameState.gameId, winnerId: currentUser.email });
    }
  }
}, [gameState, currentUser, pendingPlayTarget, engineContext]);
  const handleAttack = useCallback(async (attackerIndex, targetIndex, attackerType = 'creature') => {
    if (!gameState || !gameState.isMyTurn) return;

    const result = GameEngine.performAttack(
      gameState.playerState,
      gameState.opponentState,
      targetIndex,
      attackerIndex,
      attackerType,
      gameState.turnNumber ?? 1,
      engineContext
    );

    const newState = {
      ...gameState,
      playerState: result.attackerState,
      opponentState: result.defenderState
    };

    setGameState(newState);

    if (GameEngine.checkWinCondition(result.defenderState, gameState.turnNumber ?? 1)) {
      setWinner('player');
      if (gameState.gameMode === 'pvp') {
        await completePvPGameDb({ supabase, gameId: gameState.gameId, winnerId: currentUser.email });
      }
    }
  }, [gameState, currentUser, engineContext]);

  // ✅ FIXED: allow controller activation during setup (commander selection)
  const handleControllerActivate = useCallback(async (restingIndex, targetSlot = null) => {
    if (!gameState) return;

    const phase = gameState.phase || 'draw';

    // Allow selecting the first controller during setup even if it's not "your turn" yet.
    // After setup, only allow during your main phase.
    if (phase !== 'setup' && !gameState.isMyTurn) return;
    if (phase !== 'setup' && phase !== 'main') return;

    const hadActiveBefore = (gameState.playerState.controllers || []).some(c => c && c.isActive);

    const nextPlayerState = GameEngine.activateRestingController(
      gameState.playerState,
      restingIndex,
      targetSlot,
      gameState.turnNumber ?? 1,
      engineContext
    );

    // If nothing changed (insufficient shards or no slot), do nothing
    if (nextPlayerState === gameState.playerState) return;

    const hasActiveAfter = (nextPlayerState.controllers || []).some(c => c && c.isActive);

    const next = {
      ...gameState,
      // Selecting the first controller starts the duel
      phase: (phase === 'setup' && !hadActiveBefore && hasActiveAfter) ? 'draw' : phase,
      playerState: nextPlayerState
    };

    setGameState(next);

    if (gameState.gameMode === 'pvp') {
      await syncPvPStates({
        supabase,
        gameId: gameState.gameId,
        playerId: currentUser.email,
        playerState: next.playerState,
        opponentState: next.opponentState
      });
    }
  }, [gameState, currentUser, supabase, engineContext]);

  const handleEndPhase = useCallback(async () => {
    if (!gameState) return;

    const phase = gameState.phase || 'draw';
    if (phase !== 'setup' && !gameState.isMyTurn) return;

    // SETUP -> DRAW
    // "Start Duel" is a setup action and must NOT consume the player's first turn.
    // We only transition into the normal turn/phase loop here.
    if (phase === 'setup') {
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: 'draw',
          isMyTurn: true,
          turnNumber: Number(prev.turnNumber ?? 1) || 1
        };
      });
      return;
    }

    // Progress phases for the PLAYER only (UI owns gameState, engine owns gameplay state updates)
    if (phase === 'draw') {
      const next = {
        ...gameState,
        phase: 'energy',
        playerState: (() => {
          const drawn = GameEngine.drawCard(gameState.playerState);
          const shards = Number(drawn?.shards ?? 0);
          return { ...drawn, shards: shards + 1 };
        })()
      };
      setGameState(next);

      if (gameState.gameMode === 'pvp') {
        await syncPvPStates({
          supabase,
          gameId: gameState.gameId,
          playerId: currentUser.email,
          playerState: next.playerState,
          opponentState: next.opponentState
        });
      }
      return;
    }

    if (phase === 'energy') {
      const next = {
        ...gameState,
        phase: 'main'
      };
      setGameState(next);

      if (gameState.gameMode === 'pvp') {
        await syncPvPStates({
          supabase,
          gameId: gameState.gameId,
          playerId: currentUser.email,
          playerState: next.playerState,
          opponentState: next.opponentState
        });
      }
      return;
    }

    if (phase === 'main') {
      const next = { ...gameState, phase: 'combat' };
      setGameState(next);

      if (gameState.gameMode === 'pvp') {
        await syncPvPStates({
          supabase,
          gameId: gameState.gameId,
          playerId: currentUser.email,
          playerState: next.playerState,
          opponentState: next.opponentState
        });
      }
      return;
    }

    // COMBAT -> End Turn
    const nextTurnNumber = Number(gameState.turnNumber ?? 1) + 1;

    // Start opponent's new turn (AI or PvP opponent). No swapping identities.
    const out = GameEngine.startNewTurn(gameState.opponentState, gameState.playerState, nextTurnNumber, engineContext);

    const next = {
      ...gameState,
      isMyTurn: false,
      phase: 'draw',
      turnNumber: nextTurnNumber,
      opponentState: out.playerState,
      playerState: out.opponentState ?? gameState.playerState
    };

    setGameState(next);

    if (gameState.gameMode === 'pvp') {
      await syncPvPStates({
        supabase,
        gameId: gameState.gameId,
        playerId: currentUser.email,
        playerState: next.playerState,
        opponentState: next.opponentState
      });
    }

    // If you won on your combat step, end immediately
    if (GameEngine.checkWinCondition(next.opponentState, next.turnNumber ?? gameState.turnNumber ?? 1)) {
      setWinner('player');
      if (gameState.gameMode === 'pvp') {
        await completePvPGameDb({ supabase, gameId: gameState.gameId, winnerId: currentUser.email });
      }
    }
  }, [gameState, currentUser, winner, supabase, engineContext]);

const menuButton = (!winner && (
  <button
    type="button"
    onClick={() => {
      setShowBugPrompt(false);
      setIsDuelMenuOpen(true);
    }}
    className="fixed top-3 right-3 z-[100] bg-black/60 hover:bg-black/75 text-white px-3 py-2 rounded-xl border border-purple-500/60 shadow-lg"
  >
    Menu
  </button>
));

const menuModal = (isDuelMenuOpen && !winner && (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70"
    onMouseDown={() => {
      setShowBugPrompt(false);
      setIsDuelMenuOpen(false);
    }}
  >
    <div
      className="bg-[#0c1630] w-[360px] rounded-2xl border-2 border-purple-500 p-6 shadow-2xl text-center"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <h1 className="text-4xl font-extrabold text-purple-400 mb-6 tracking-wide">
        PAUSED
      </h1>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setIsDuelMenuOpen(false)}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition"
        >
          Resume Game
        </button>

        <button
          type="button"
          onClick={restartAIGame}
          disabled={!gameState || gameState.gameMode !== 'ai'}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition disabled:opacity-50"
        >
          Restart Match
        </button>

        <button
          type="button"
          onClick={goToMainMenu}
          className="bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold py-3 rounded-lg transition"
        >
          Exit to Menu
        </button>

        <button
          type="button"
          onClick={() => setShowBugPrompt(v => !v)}
          className="border-2 border-orange-400 text-orange-400 hover:bg-orange-400/10 font-semibold py-3 rounded-lg transition"
        >
          Report Bug
        </button>

        {showBugPrompt && (
          <div className="mt-3 flex flex-col gap-2">
            <textarea
              value={bugText}
              onChange={e => setBugText(e.target.value)}
              placeholder="Describe the bug..."
              className="w-full h-24 rounded-lg p-2 text-black"
            />
            <button
              type="button"
              onClick={sendBugReportEmail}
              className="bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg"
            >
              Email Support
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignOut}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition"
        >
          Sign Out
        </button>
      </div>
    </div>
  </div>
));

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        {menuButton}
        {menuModal}
        Loading match...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-white gap-3">
        {menuButton}
        {menuModal}
        <div className="text-red-300">{loadError}</div>
        <button
          className="px-6 py-3 bg-purple-600 rounded-lg"
          onClick={() => navigate(createPageUrl('TCGMainMenu'))}
        >
          Return to Menu
        </button>
      </div>
    );
  }

  // If no match started, show PvP lobby (join/seek) or bounce back to menu
  if (!gameState && (requestedMode === 'pvp-join' || requestedMode === 'pvp-seek')) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white p-6">
        {menuButton}
        {menuModal}
        <div className="w-full max-w-lg bg-slate-900/70 border border-purple-500/30 rounded-xl p-5 space-y-4">
          <div className="text-xl font-bold">PvP Duels</div>

          {requestedMode === 'pvp-join' && (
            <>
              <div className="text-sm text-slate-300">Enter an invite code to join a duel.</div>
              <input
                className="w-full p-2 rounded bg-slate-950 border border-slate-700"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="INVITE CODE"
              />
              <button
                className="w-full px-4 py-2 bg-purple-600 rounded"
                onClick={() => joinPvPByCode(requestedDeckKey, inviteCode)}
              >
                Join Duel
              </button>
            </>
          )}

          {requestedMode === 'pvp-seek' && (
            <>
              <div className="text-sm text-slate-300">Open duels you can join:</div>
              <button
                className="w-full px-4 py-2 bg-slate-700 rounded"
                onClick={loadOpenGames}
              >
                Refresh
              </button>

              <div className="space-y-2 max-h-64 overflow-auto">
                {(openGames || []).map(g => (
                  <button
                    key={g.id}
                    className="w-full text-left p-3 rounded bg-slate-950 border border-slate-700 hover:border-purple-500/60"
                    onClick={() => joinPvPByCode(requestedDeckKey, g.invite_code)}
                  >
                    <div className="font-semibold">Invite Code: {g.invite_code}</div>
                    <div className="text-xs text-slate-400">
                      Host: {g.player1_deck_name || g.player1_deck || 'Unknown'}
                    </div>
                  </button>
                ))}
                {(!openGames || openGames.length === 0) && (
                  <div className="text-xs text-slate-400">No open duels right now.</div>
                )}
              </div>
            </>
          )}

          <button
            className="w-full px-4 py-2 bg-slate-800 rounded"
            onClick={() => navigate(createPageUrl('TCGMainMenu'))}
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Host lobby: show invite code until opponent joins
  if (gameState?.gameMode === 'pvp' && lobbyMode === 'host' && !gameState.opponentState) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white p-6">
        <div className="w-full max-w-lg bg-slate-900/70 border border-purple-500/30 rounded-xl p-5 space-y-3 text-center">
          <div className="text-xl font-bold">Invite Duel</div>
          <div className="text-sm text-slate-300">Share this invite code with your opponent:</div>
          <div className="text-3xl font-black tracking-widest text-purple-300">{hostInviteCode}</div>
          <div className="text-xs text-slate-400">Waiting for opponent to join...</div>

          <button
            className="w-full px-4 py-2 bg-slate-800 rounded"
            onClick={() => navigate(createPageUrl('TCGMainMenu'))}
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950 overflow-hidden">
      {menuButton}
      {menuModal}
      <div className="h-screen">
        {gameState && (
          <GameBoard
            gameState={gameState}
            isPlayer={true}
            onCardPlay={handleCardPlay}
            onAttack={handleAttack}
            onEndPhase={handleEndPhase}
            onControllerActivate={handleControllerActivate}
            aiActionLog={aiActionLog}
            battleLog={battleLog}
          />
        )}

        <AnimatePresence>
          {tutorialMode && (
            <TutorialOverlay
              lessonType={tutorialMode}
              currentStep={tutorialStep}
              actionCompleted={tutorialActionCompleted}
              onNext={() => setTutorialStep(s => s + 1)}
              onSkip={() => setTutorialMode(null)}
              onComplete={() => setTutorialMode(null)}
            />
          )}
        </AnimatePresence>

        {winner && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 text-white">
            <div className="text-center">
              <h1 className="text-4xl mb-4">
                {winner === 'player' ? 'Victory!' : 'Defeat'}
              </h1>
              <button
                className="px-6 py-3 bg-purple-600 rounded-lg"
                onClick={() => navigate(createPageUrl('TCGMainMenu'))}
              >
                Return to Menu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
