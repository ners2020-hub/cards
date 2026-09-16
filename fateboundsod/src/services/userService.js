import { supabase } from "@/lib/supabaseClient";

/*
|--------------------------------------------------------------------------
| AUTH HELPERS
|--------------------------------------------------------------------------
*/

async function getCurrentUser() {
  // Try verified user first
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData?.user) return userData.user;

  // Fallback to local session (keeps AuthContext + services aligned)
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error("getCurrentUser session fallback error:", sessionError);
    return null;
  }
  return sessionData?.session?.user ?? null;
}

async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("signOut error:", error);
}

/*
|--------------------------------------------------------------------------
| ID GENERATOR
|--------------------------------------------------------------------------
*/

function makeId() {
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/*
|--------------------------------------------------------------------------
| USER PROFILE (public.userprofile)
|--------------------------------------------------------------------------
*/

async function getUserProfileByEmail(email) {
  if (!email) return null;

  const { data, error } = await supabase
    .from("userprofile")
    .select("*")
    .eq("user_email", email)
    .maybeSingle();

  if (error) {
    console.error("getUserProfileByEmail error:", error);
    throw error;
  }

  return data ?? null;
}

async function upsertUserProfile(profileData) {
  const { data, error } = await supabase
    .from("userprofile")
    .upsert(profileData, { onConflict: "user_email" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("upsertUserProfile error:", error);
    throw error;
  }

  return data ?? null;
}

async function ensureUserProfileExists(user) {
  if (!user?.email) return null;

  const existing = await getUserProfileByEmail(user.email);
  if (existing) return existing;

  return await upsertUserProfile({
    user_email: user.email,
    username: user.email.split("@")[0] || "Planeswalker",
    wins: 0,
    losses: 0,
    games_played: 0,
    favorite_deck: null,
    deck_usage: {},
    card_stats: {},
    admin_mode_active: false,
    role: "player",
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  });
}

/*
|--------------------------------------------------------------------------
| PLAYER PROGRESS (public.playerprogress)
|--------------------------------------------------------------------------
*/

async function getPlayerProgressByEmail(email) {
  if (!email) return null;

  const { data, error } = await supabase
    .from("playerprogress")
    .select("*")
    .eq("user_email", email)
    .maybeSingle();

  if (error) {
    console.error("getPlayerProgressByEmail error:", error);
    throw error;
  }

  return data ?? null;
}

async function upsertPlayerProgress(progressData) {
  const { data, error } = await supabase
    .from("playerprogress")
    .upsert(progressData, { onConflict: "user_email" })
    .select()
    .maybeSingle();

  if (error) {
    console.error("upsertPlayerProgress error:", error);
    throw error;
  }

  return data ?? null;
}

async function ensurePlayerProgressExists(email) {
  if (!email) return null;

  const existing = await getPlayerProgressByEmail(email);
  if (existing) return existing;

  return await upsertPlayerProgress({
    user_email: email,
    tokens: 1000,
    unlocked_decks: [],
    owned_cards: [],
    total_wins: 0,
    ai_wins: 0,
    pvp_wins: 0,
    deck_wins: {},
    admin_mode_active: false,
    xp: 0,
    level: 1,
    fate_rank: "Unranked",
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString(),
  });
}

async function updatePlayerProgressByEmail(email, patch) {
  const base = await ensurePlayerProgressExists(email);

  return await upsertPlayerProgress({
    ...base,
    ...patch,
    user_email: email,
    updated_date: new Date().toISOString(),
  });
}

async function addTokens(email, amount) {
  const progress = await ensurePlayerProgressExists(email);
  return await updatePlayerProgressByEmail(email, {
    tokens: (progress.tokens || 0) + amount,
  });
}

async function spendTokens(email, amount) {
  const progress = await ensurePlayerProgressExists(email);

  if ((progress.tokens || 0) < amount) {
    throw new Error("Not enough tokens");
  }

  return await updatePlayerProgressByEmail(email, {
    tokens: progress.tokens - amount,
  });
}

/*
|--------------------------------------------------------------------------
| ADMIN HELPERS
|--------------------------------------------------------------------------
*/

async function searchUsersByEmail(query) {
  const { data, error } = await supabase
    .from("userprofile")
    .select("*")
    .ilike("user_email", `%${query}%`)
    .limit(25);

  if (error) {
    console.error("searchUsersByEmail error:", error);
    throw error;
  }

  return data ?? [];
}

/*
|--------------------------------------------------------------------------
| COMPATIBILITY HELPER
|--------------------------------------------------------------------------
*/

async function getCurrentUserContext() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const profile = await ensureUserProfileExists(user);
  const progress = await ensurePlayerProgressExists(user.email);

  return { user, profile, progress, email: user.email };
}

/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

export const userService = {
  getCurrentUser,
  signOut,

  getUserProfileByEmail,
  upsertUserProfile,
  ensureUserProfileExists,

  getPlayerProgressByEmail,
  ensurePlayerProgressExists,
  updatePlayerProgressByEmail,
  addTokens,
  spendTokens,

  searchUsersByEmail,
  getCurrentUserContext,
};

export { getCurrentUserContext };
