import * as GameEngine from '@/components/tcg/gameEngine';

/**
 * Create a PvP game (host)
 */
export async function createPvPGameDb({
  supabase,
  currentUser,
  deckType,
  deckName,
  playerDeck,
  playerControllers,
  visibility = 'open',
  inviteCode = null
}) {
  if (!currentUser) throw new Error('Not authenticated');

  const player1State = GameEngine.createInitialPlayerState(
    playerDeck,
    playerControllers
  );

  const code =
    inviteCode ||
    Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data: game, error } = await supabase
    .from('gamestate')
    .insert({
      player1_id: currentUser.email,
      current_turn_player: currentUser.email,
      turn_number: 1,
      phase: 'draw',
      player1_state: player1State,
      player2_state: null,
      stack: [],
      game_type: 'pvp',
      status: 'waiting',
      invite_code: code,
      game_visibility: visibility,
      player1_deck: deckType,
      player1_deck_name: deckName
    })
    .select()
    .single();

  if (error) throw error;

  return {
    gameId: game.id,
    inviteCode: code,
    playerState: player1State
  };
}

/**
 * Join a PvP game (guest)
 */
export async function joinPvPGameDb({
  supabase,
  currentUser,
  game,
  deckType,
  deckName,
  playerDeck,
  playerControllers
}) {
  if (!currentUser) throw new Error('Not authenticated');

  if (game.player1_id === currentUser.email) {
    throw new Error('Cannot join your own game');
  }

  const player2State = GameEngine.createInitialPlayerState(
    playerDeck,
    playerControllers
  );

  const { error } = await supabase
    .from('gamestate')
    .update({
      player2_id: currentUser.email,
      player2_state: player2State,
      player2_deck: deckType,
      player2_deck_name: deckName,
      status: 'active'
    })
    .eq('id', game.id);

  if (error) throw error;

  return {
    gameId: game.id,
    playerState: player2State,
    opponentState: game.player1_state
  };
}

/**
 * Cancel a PvP game (host leaves lobby)
 */
export async function cancelPvPGameDb({ supabase, gameId }) {
  if (!gameId) return;

  await supabase
    .from('gamestate')
    .delete()
    .eq('id', gameId);
}

/**
 * Sync local PvP state to database after an action
 */
export async function syncPvPStates({
  supabase,
  gameId,
  playerId,
  playerState,
  opponentState
}) {
  const { data: game, error } = await supabase
    .from('gamestate')
    .select('player1_id')
    .eq('id', gameId)
    .single();

  if (error) throw error;

  const isPlayer1 = playerId === game.player1_id;

  await supabase
    .from('gamestate')
    .update({
      player1_state: isPlayer1 ? playerState : opponentState,
      player2_state: isPlayer1 ? opponentState : playerState
    })
    .eq('id', gameId);
}

/**
 * End a PvP turn and pass control to opponent
 */
export async function endPvPTurnDb({
  supabase,
  gameId,
  playerId,
  nextState,
  turnNumber,
  phase
}) {
  const { data: game, error } = await supabase
    .from('gamestate')
    .select('*')
    .eq('id', gameId)
    .single();

  if (error) throw error;

  const isPlayer1 = player.player1_id === playerId;
  const nextPlayer = isPlayer1 ? game.player2_id : game.player1_id;

  await supabase
    .from('gamestate')
    .update({
      player1_state: isPlayer1 ? nextState.playerState : nextState.opponentState,
      player2_state: isPlayer1 ? nextState.opponentState : nextState.playerState,
      current_turn_player: nextPlayer,
      phase,
      turn_number: turnNumber
    })
    .eq('id', gameId);
}

/**
 * Mark a PvP game as completed
 */
export async function completePvPGameDb({
  supabase,
  gameId,
  winnerId
}) {
  await supabase
    .from('gamestate')
    .update({
      winner: winnerId,
      status: 'completed'
    })
    .eq('id', gameId);
}

/**
 * Start polling a PvP game for updates
 * Returns a cleanup function
 */
export function startPvPPolling({
  supabase,
  gameId,
  currentUserEmail,
  onUpdate,
  intervalMs = 1000
}) {
  const interval = setInterval(async () => {
    const { data, error } = await supabase
      .from('gamestate')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !data) return;

    const isPlayer1 = data.player1_id === currentUserEmail;

    onUpdate({
      game: data,
      isMyTurn: data.current_turn_player === currentUserEmail,
      playerState: isPlayer1 ? data.player1_state : data.player2_state,
      opponentState: isPlayer1 ? data.player2_state : data.player1_state
    });
  }, intervalMs);

  return () => clearInterval(interval);
}
