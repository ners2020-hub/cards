import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Target, Swords, Heart, Flame, Wind, Edit2, Save, X, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPageUrl } from '../utils';
import { Link } from 'react-router-dom';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [error, setError] = useState('');
  const [adminMode, setAdminMode] = useState(false);
  const [tokenAmount, setTokenAmount] = useState(100);
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



  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
      if (profiles.length > 0) return profiles[0];
      
      // Create default profile
      return await base44.entities.UserProfile.create({
        user_email: user.email,
        username: user.full_name || user.email.split('@')[0],
        wins: 0,
        losses: 0,
        games_played: 0,
        deck_usage: { blood: 0, fire: 0, wind: 0, light: 0, shadow: 0, electric: 0, cryo: 0, earth: 0, water: 0 },
        card_stats: {}
      });
    },
    enabled: !!user
  });

  const { data: progress } = useQuery({
    queryKey: ['player-progress', user?.email],
    queryFn: async () => {
      const progs = await base44.entities.PlayerProgress.filter({ user_email: user.email });
      return progs.length > 0 ? progs[0] : null;
    },
    enabled: !!user
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-profile']);
      setEditing(false);
      setError('');
    }
  });

  const toggleAdminModeMutation = useMutation({
    mutationFn: async (enable) => {
      if (!progress) return;
      
      if (enable) {
        // Enable admin mode: unlock all decks and all cards
        const allCards = await base44.entities.Card.list();
        const allCardIds = allCards.map(card => ({ card_id: card.id, quantity: 3 }));
        
        await base44.entities.PlayerProgress.update(progress.id, {
          unlocked_decks: ['blood', 'fire', 'wind', 'light', 'shadow', 'electric', 'cryo', 'earth', 'water'],
          owned_cards: allCardIds,
          admin_mode_active: true
        });
      } else {
        // Disable admin mode: reset account
        await base44.entities.PlayerProgress.update(progress.id, {
          tokens: 100,
          unlocked_decks: ['fire', 'water', 'earth', 'wind'],
          owned_cards: [],
          total_wins: 0,
          ai_wins: 0,
          pvp_wins: 0,
          admin_mode_active: false
        });
        
        // Reset profile stats
        await base44.entities.UserProfile.update(profile.id, {
          wins: 0,
          losses: 0,
          games_played: 0,
          deck_usage: { blood: 0, fire: 0, wind: 0, light: 0, shadow: 0, electric: 0, cryo: 0, earth: 0, water: 0 }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player-progress']);
      queryClient.invalidateQueries(['user-profile']);
    }
  });

  const addTokensMutation = useMutation({
    mutationFn: async (amount) => {
      if (!progress || !adminMode) return;
      await base44.entities.PlayerProgress.update(progress.id, {
        tokens: progress.tokens + amount
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['player-progress']);
    }
  });

  const handleSaveUsername = () => {
    if (!newUsername.trim()) {
      setError('Username cannot be empty');
      return;
    }

    // Basic offensive word filter
    const offensive = ['fuck', 'shit', 'ass', 'damn', 'bitch', 'crap'];
    if (offensive.some(word => newUsername.toLowerCase().includes(word))) {
      setError('Username contains inappropriate language');
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      setError('Username must be 3-20 characters');
      return;
    }

    updateProfileMutation.mutate({ username: newUsername });
  };

  const deckIcons = {
    blood: { icon: Heart, color: 'text-red-500' },
    fire: { icon: Flame, color: 'text-orange-500' },
    wind: { icon: Wind, color: 'text-cyan-500' },
    light: { icon: Flame, color: 'text-yellow-400' },
    shadow: { icon: Heart, color: 'text-purple-500' },
    electric: { icon: Zap, color: 'text-yellow-300' },
    cryo: { icon: Wind, color: 'text-blue-400' },
    earth: { icon: Heart, color: 'text-green-500' },
    water: { icon: Wind, color: 'text-blue-500' }
  };

  useEffect(() => {
    if (progress?.admin_mode_active) {
      setAdminMode(true);
    }
  }, [progress]);

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  const winRate = profile?.games_played > 0 
    ? ((profile.wins / profile.games_played) * 100).toFixed(1) 
    : 0;

  const mostUsedDeck = profile?.deck_usage 
    ? Object.entries(profile.deck_usage).sort((a, b) => b[1] - a[1])[0]?.[0] 
    : 'blood';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl('TCG')}>
            <Button variant="outline" className="border-slate-700">
              <X className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
        </div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/80 backdrop-blur rounded-2xl border-2 border-purple-500 p-8 mb-6"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-3xl font-bold text-white">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                {editing ? (
                  <div className="space-y-2">
                    <Input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter username"
                      className="bg-slate-800 border-slate-700 text-white"
                      maxLength={20}
                    />
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex gap-2">
                      <Button onClick={handleSaveUsername} size="sm" className="bg-green-600">
                        <Save className="w-3 h-3 mr-1" />
                        Save
                      </Button>
                      <Button onClick={() => { setEditing(false); setError(''); }} size="sm" variant="outline">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold text-white">{profile?.username}</h1>
                    <Button
                      onClick={() => {
                        setEditing(true);
                        setNewUsername(profile?.username || '');
                      }}
                      size="icon"
                      variant="ghost"
                      className="text-slate-400 hover:text-white"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <p className="text-slate-400">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  Games Played
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-white">{profile?.games_played || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-500" />
                  Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-400">{profile?.wins || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
                  <Target className="w-4 h-4 text-red-500" />
                  Losses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-400">{profile?.losses || 0}</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400">Win Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-purple-400">{winRate}%</p>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Deck Usage */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-slate-900/80 backdrop-blur border-2 border-purple-500">
            <CardHeader>
              <CardTitle className="text-white">Deck Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(() => {
                  const allDecks = { blood: 0, fire: 0, wind: 0, light: 0, shadow: 0, electric: 0, cryo: 0, earth: 0, water: 0 };
                  const deckUsage = { ...allDecks, ...(profile?.deck_usage || {}) };
                  const total = Object.values(deckUsage).reduce((a, b) => a + b, 0);
                  
                  return Object.entries(deckUsage).map(([deck, count]) => {
                  const DeckIcon = deckIcons[deck]?.icon || Heart;
                  const percentage = total > 0 ? (count / total) * 100 : 0;

                  return (
                    <div key={deck} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DeckIcon className={`w-5 h-5 ${deckIcons[deck]?.color}`} />
                          <span className="text-white capitalize font-semibold">{deck} Deck</span>
                        </div>
                        <span className="text-slate-400">{count} games ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                         initial={{ width: 0 }}
                         animate={{ width: `${percentage}%` }}
                         transition={{ duration: 0.5, delay: 0.2 }}
                         className={`h-full bg-gradient-to-r ${
                           deck === 'blood' ? 'from-red-600 to-rose-800' :
                           deck === 'fire' ? 'from-orange-600 to-red-600' :
                           deck === 'water' ? 'from-blue-600 to-cyan-600' :
                           deck === 'earth' ? 'from-green-600 to-emerald-700' :
                           deck === 'wind' ? 'from-teal-600 to-cyan-600' :
                           deck === 'light' ? 'from-amber-400 to-yellow-600' :
                           deck === 'shadow' ? 'from-purple-900 to-indigo-950' :
                           deck === 'electric' ? 'from-yellow-500 to-amber-600' :
                           deck === 'cryo' ? 'from-cyan-400 to-blue-500' :
                           'from-cyan-600 to-blue-600'
                         }`}
                        />
                      </div>
                    </div>
                  );
                });
                })()}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Admin Mode - Only for Admin Users */}
        {user?.role === 'admin' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6"
          >
            <Card className={`bg-slate-900/80 backdrop-blur border-2 ${adminMode ? 'border-red-500' : 'border-slate-700'}`}>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <span className="text-2xl">🛠️</span>
                  Admin Testing Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <p className="text-white font-bold">Admin Mode {adminMode ? 'Active' : 'Inactive'}</p>
                    <p className="text-slate-400 text-sm">
                      {adminMode ? 'All cards unlocked, all decks available' : 'Enable to unlock everything'}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const enable = !adminMode;
                      setAdminMode(enable);
                      toggleAdminModeMutation.mutate(enable);
                    }}
                    className={adminMode ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                  >
                    {adminMode ? 'Deactivate & Reset' : 'Activate'}
                  </Button>
                </div>

                {adminMode && (
                  <div className="p-4 bg-slate-800/50 rounded-lg space-y-3">
                    <p className="text-white font-bold">Add Tokens</p>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        value={tokenAmount}
                        onChange={(e) => setTokenAmount(parseInt(e.target.value) || 0)}
                        className="bg-slate-900 border-slate-700 text-white"
                        placeholder="Amount"
                      />
                      <Button
                        onClick={() => addTokensMutation.mutate(tokenAmount)}
                        className="bg-amber-600 hover:bg-amber-700"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Add
                      </Button>
                    </div>
                    {progress && (
                      <p className="text-slate-400 text-sm">Current: {progress.tokens} tokens</p>
                    )}
                  </div>
                )}

                <div className="p-3 bg-red-950/30 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">
                    ⚠️ Warning: Deactivating admin mode will reset your entire account including stats, cards, and progress.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}