import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, Target, Swords, Edit2, Save, X, LogOut, Sparkles, Layers } from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { userService } from "@/services/userService";
import { fetchPlayerDecks } from "@/services/deckService";
import { createPageUrl } from "@/utils";

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, rank: "Fatebound Initiate" },
  { level: 2, xp: 100, rank: "Fatebound Initiate" },
  { level: 3, xp: 250, rank: "Fatebound Initiate" },
  { level: 4, xp: 500, rank: "Fatebound Initiate" },
  { level: 5, xp: 800, rank: "Shard Seeker" },
  { level: 10, xp: 2000, rank: "Shard Seeker" },
  { level: 15, xp: 4000, rank: "Destiny Weaver" },
  { level: 20, xp: 7000, rank: "Fate Champion" },
  { level: 25, xp: 12000, rank: "Legend of Dominion" },
];

function getRankFromLevel(level) {
  const lvl = Number(level || 1);
  const match = [...LEVEL_THRESHOLDS].reverse().find((t) => lvl >= t.level);
  return match?.rank || "Fatebound Initiate";
}

function getXpWindow(xp) {
  const totalXp = Number(xp || 0);
  const sorted = [...LEVEL_THRESHOLDS].sort((a, b) => a.xp - b.xp);

  let current = sorted[0];
  let next = null;

  for (let i = 0; i < sorted.length; i++) {
    if (totalXp >= sorted[i].xp) current = sorted[i];
    if (totalXp < sorted[i].xp) {
      next = sorted[i];
      break;
    }
  }

  if (!next) {
    return {
      currentXpMin: current.xp,
      nextXp: current.xp,
      pct: 100,
      label: "Max Rank",
    };
  }

  const span = Math.max(1, next.xp - current.xp);
  const within = Math.min(span, Math.max(0, totalXp - current.xp));
  const pct = Math.max(0, Math.min(100, (within / span) * 100));

  return {
    currentXpMin: current.xp,
    nextXp: next.xp,
    pct,
    label: `${totalXp} / ${next.xp} XP`,
  };
}

function elementMeta(element) {
  const key = String(element || "").toLowerCase();
  const map = {
    fire: { emoji: "🔥", label: "Fire" },
    water: { emoji: "💧", label: "Water" },
    earth: { emoji: "🌿", label: "Earth" },
    wind: { emoji: "💨", label: "Wind" },
    blood: { emoji: "🩸", label: "Blood" },
    light: { emoji: "☀️", label: "Light" },
    shadow: { emoji: "🌑", label: "Shadow" },
    electric: { emoji: "⚡", label: "Electric" },
    cryo: { emoji: "❄️", label: "Cryo" },
  };
  return map[key] || { emoji: "🎴", label: element || "Unknown" };
}

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");

  // ✅ Redirect in effect ONLY (never during render)
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, user, navigate]);

  // ✅ Query always declared (hooks must be stable)
  const { data, isLoading } = useQuery({
    queryKey: ["profile-context", user?.email],
    enabled: !!user?.email && !authLoading,
    queryFn: async () => {
      const profile = await userService.ensureUserProfileExists(user);
      const progress = await userService.ensurePlayerProgressExists(user.email);
      const decks = await fetchPlayerDecks(user.email);
      return { profile, progress, decks };
    },
  });

  // ✅ Safe defaults so memos can always run
  const profile = data?.profile ?? null;
  const progress = data?.progress ?? null;
  const decks = data?.decks ?? [];

  const isAdmin = useMemo(() => (profile?.role || "").toLowerCase() === "admin", [profile?.role]);

  const adminMode = useMemo(() => {
    return Boolean(profile?.admin_mode_active ?? progress?.admin_mode_active ?? false);
  }, [profile?.admin_mode_active, progress?.admin_mode_active]);

  // ✅ These useMemos MUST NOT be after a conditional return
  const elementBreakdown = useMemo(() => {
    const list = Array.isArray(decks) ? decks : [];
    const counts = new Map();

    for (const d of list) {
      const k = String(d?.element || "unknown").toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }

    const total = Math.max(1, list.length);
    return Array.from(counts.entries())
      .map(([k, count]) => ({
        key: k,
        count,
        pct: Math.round((count / total) * 100),
        ...elementMeta(k),
      }))
      .sort((a, b) => b.count - a.count);
  }, [decks]);

  const deckUsage = useMemo(() => {
    const list = Array.isArray(decks) ? decks : [];
    const winsMap = progress?.deck_wins && typeof progress.deck_wins === "object" ? progress.deck_wins : {};

    return list
      .map((d) => {
        const idKey = d?.id ? String(d.id) : "";
        const nameKey = d?.name ? String(d.name) : "";
        const wins = Number(winsMap?.[idKey] ?? winsMap?.[nameKey] ?? 0);

        return {
          id: d?.id,
          name: d?.name || "Untitled Deck",
          element: d?.element || "unknown",
          total_cards: d?.total_cards ?? 0,
          updated_date: d?.updated_date,
          wins,
        };
      })
      .sort((a, b) => b.wins - a.wins);
  }, [decks, progress?.deck_wins]);

  const updateUsernameMutation = useMutation({
    mutationFn: async (username) => {
      if (!user?.email) throw new Error("Not signed in");
      if (!profile?.user_email) throw new Error("Profile not initialized");

      const trimmed = String(username || "").trim();
      if (!trimmed) throw new Error("Username cannot be empty");

      await userService.upsertUserProfile({
        user_email: user.email,
        username: trimmed,
        updated_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile-context", user?.email] });
      setEditing(false);
      setError("");
    },
    onError: (err) => setError(err?.message || "Failed to update username"),
  });

  const toggleAdminModeMutation = useMutation({
    mutationFn: async (enabled) => {
      if (!user?.email) throw new Error("Not signed in");
      if (!profile?.user_email) throw new Error("Profile not initialized");

      const email = user.email;

      if (!enabled) {
        await userService.updatePlayerProgressByEmail(email, {
          tokens: 1000,
          unlocked_decks: [],
          owned_cards: [],
          total_wins: 0,
          ai_wins: 0,
          pvp_wins: 0,
          deck_wins: {},
          xp: 0,
          level: 1,
          fate_rank: "Unranked",
          admin_mode_active: false,
        });
      } else {
        await userService.updatePlayerProgressByEmail(email, {
          admin_mode_active: true,
        });
      }

      await userService.upsertUserProfile({
        user_email: email,
        admin_mode_active: Boolean(enabled),
        updated_date: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile-context", user?.email] }),
    onError: (err) => setError(err?.message || "Failed to toggle admin mode"),
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await userService.signOut();
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/login", { replace: true });
    },
    onError: () => {
      navigate("/login", { replace: true });
    },
  });

  // ✅ NOW we can do conditional rendering (after hooks)
  if (authLoading || !user || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile…</div>
      </div>
    );
  }

  const totalWins = Number(progress?.total_wins ?? 0);
  const aiWins = Number(progress?.ai_wins ?? 0);
  const pvpWins = Number(progress?.pvp_wins ?? 0);

  const gamesPlayed = Number(profile?.games_played ?? (aiWins + pvpWins));
  const losses = Math.max(0, gamesPlayed - totalWins);
  const winRate = gamesPlayed > 0 ? ((totalWins / gamesPlayed) * 100).toFixed(1) : "0.0";

  const level = Number(progress?.level ?? 1);
  const xp = Number(progress?.xp ?? 0);
  const fateRank = progress?.fate_rank || getRankFromLevel(level);
  const xpWindow = getXpWindow(xp);

  const decksCount = Array.isArray(decks) ? decks.length : 0;

  const handleSaveUsername = () => {
    const trimmed = newUsername.trim();
    if (!trimmed) {
      setError("Username cannot be empty");
      return;
    }
    updateUsernameMutation.mutate(trimmed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/">
            <Button variant="outline">
              <X className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>

          <Button
            onClick={() => signOutMutation.mutate()}
            className="bg-red-600 hover:bg-red-700"
            disabled={signOutMutation.isPending}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 rounded-2xl border border-purple-500 p-8 mb-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold text-white">
              {(profile?.username || user.email)?.[0]?.toUpperCase() || "U"}
            </div>

            <div className="flex-1">
              {editing ? (
                <>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="mb-2" />
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveUsername} disabled={updateUsernameMutation.isPending}>
                      <Save className="w-3 h-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setError("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-white">{profile?.username || user.email}</h1>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setEditing(true);
                      setNewUsername(profile?.username || "");
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <p className="text-slate-400">{user.email}</p>
              <p className="text-xs text-slate-500 mt-1">
                Level {level} • XP {xp} • Tokens {progress?.tokens ?? 0}
              </p>

              {error && !editing && <p className="text-red-400 text-sm mt-2">{error}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Games" value={gamesPlayed} icon={Swords} />
            <Stat label="Wins" value={totalWins} icon={Trophy} color="text-green-400" />
            <Stat label="Losses" value={losses} icon={Target} color="text-red-400" />
            <Stat label="Win Rate" value={`${winRate}%`} />
          </div>
        </motion.div>

        {/* Rank + XP */}
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Card className="bg-slate-900/70 border-purple-500/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Fate Rank
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-2xl font-bold text-white">{fateRank}</p>
                  <p className="text-sm text-slate-400">Level {level}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-slate-300">{xpWindow.label}</p>
                  {xpWindow.label !== "Max Rank" && (
                    <p className="text-xs text-slate-500">Next milestone: {xpWindow.nextXp} XP</p>
                  )}
                </div>
              </div>

              <Progress value={xpWindow.pct} />
              <p className="text-xs text-slate-500">
                Earn XP by playing matches, completing quests, and progressing through Dominion.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Deck Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Elemental Deck Usage */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-900/70 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Elemental Deck Usage
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {decksCount === 0 ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                    <p className="text-slate-200 font-semibold">No decks yet</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Create your first deck to start tracking elemental usage.
                    </p>

                    <div className="mt-4">
                      <Link to={createPageUrl("DeckBuilder")}>
                        <Button className="bg-purple-600 hover:bg-purple-700">Build your first deck</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-400">Based on your custom decks ({decksCount} total).</p>

                    <div className="space-y-3">
                      {elementBreakdown.map((row) => (
                        <div key={row.key} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-slate-200">
                              {row.emoji} {row.label}
                            </p>
                            <p className="text-xs text-slate-400">
                              {row.count} ({row.pct}%)
                            </p>
                          </div>
                          <Progress value={row.pct} />
                        </div>
                      ))}
                    </div>

                    <div className="pt-2">
                      <Link to={createPageUrl("DeckBuilder")}>
                        <Button variant="outline" className="w-full">
                          Open Deck Builder
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Custom Deck Usage */}
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-slate-900/70 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-white">Custom Deck Usage</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {decksCount === 0 ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                    <p className="text-slate-200 font-semibold">You have no custom decks</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Build a deck to start playing and tracking performance.
                    </p>

                    <div className="mt-4">
                      <Link to={createPageUrl("DeckBuilder")}>
                        <Button className="bg-purple-600 hover:bg-purple-700">Build your first deck</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {deckUsage.slice(0, 6).map((d) => {
                        const meta = elementMeta(d.element);
                        const updated = d.updated_date ? new Date(d.updated_date) : null;

                        return (
                          <div
                            key={d.id || d.name}
                            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/40 p-3"
                          >
                            <div className="min-w-0">
                              <p className="text-slate-200 font-semibold truncate">
                                {meta.emoji} {d.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {d.total_cards} cards
                                {updated ? ` • Updated ${updated.toLocaleDateString()}` : ""}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-slate-200 font-bold">{d.wins}</p>
                              <p className="text-xs text-slate-500">wins</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2">
                      <Link to={createPageUrl("DeckBuilder")}>
                        <Button variant="outline" className="w-full">
                          Manage Decks
                        </Button>
                      </Link>
                    </div>

                    <p className="text-xs text-slate-500">
                      Deck win tracking uses playerprogress.deck_wins. If wins are not updating yet, they will display as 0 until match
                      result writeback is wired.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Admin */}
{isAdmin && (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
    <Card className={`bg-slate-900/70 border ${adminMode ? "border-red-500/70" : "border-slate-700"}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          🛠️ Admin Mode
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-slate-300">
          Toggle Admin Mode for testing. Deactivating will reset account progress to defaults.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => toggleAdminModeMutation.mutate(!adminMode)}
            className={adminMode ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
            disabled={toggleAdminModeMutation.isPending}
          >
            {adminMode ? "Deactivate & Reset" : "Activate"}
          </Button>

          <span
            className={`text-xs px-3 py-1 rounded-full border ${
              adminMode
                ? "text-red-200 border-red-500/50 bg-red-500/10"
                : "text-slate-300 border-slate-600 bg-slate-800/40"
            }`}
          >
            Status: {adminMode ? "Active" : "Off"}
          </span>
        </div>

        {adminMode && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3">
            <p className="text-sm text-red-200">
              ⚠️ Deactivating admin mode will reset account progress.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
)}

      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color = "text-white" }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${color}`}>{value ?? 0}</p>
      </CardContent>
    </Card>
  );
}
