import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming this is your Supabase client setup
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Trophy, Star, Gift, Clock, CheckCircle, Lock, ArrowLeft, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArcaneFrame, MagicalButton, ArcaneParticles } from '@/components/tcg/ArcaneEffects';

const LEVEL_THRESHOLDS = [
  { level: 1, xp: 0, rank: "Fatebound Initiate", reward: null },
  { level: 2, xp: 100, rank: "Fatebound Initiate", reward: { tokens: 50 } },
  { level: 3, xp: 250, rank: "Fatebound Initiate", reward: { tokens: 75 } },
  { level: 4, xp: 500, rank: "Fatebound Initiate", reward: { tokens: 100 } },
  { level: 5, xp: 800, rank: "Shard Seeker", reward: { tokens: 150, pack: "Starter Pack" } },
  { level: 10, xp: 2000, rank: "Shard Seeker", reward: { tokens: 200, pack: "Elemental Pack" } },
  { level: 15, xp: 4000, rank: "Destiny Weaver", reward: { tokens: 300, pack: "Rare Pack" } },
  { level: 20, xp: 7000, rank: "Fate Champion", reward: { tokens: 500, pack: "Epic Pack" } },
  { level: 25, xp: 12000, rank: "Legend of Dominion", reward: { tokens: 1000, pack: "Legendary Pack" } }
];

const QUEST_TEMPLATES = {
  daily: [
    { id: 'daily_win_1', title: 'First Victory', description: 'Win 1 game', type: 'wins', target: 1, rewards: { tokens: 50, xp: 25 } },
    { id: 'daily_win_3', title: 'Triple Threat', description: 'Win 3 games', type: 'wins', target: 3, rewards: { tokens: 100, xp: 50 } },
    { id: 'daily_play_5', title: 'Devoted Player', description: 'Play 5 games', type: 'games', target: 5, rewards: { tokens: 75, xp: 40 } },
    { id: 'daily_element', title: 'Elemental Master', description: 'Win with 3 different elements', type: 'elements', target: 3, rewards: { tokens: 125, xp: 60 } }
  ],
  weekly: [
    { id: 'weekly_win_10', title: 'Conquest', description: 'Win 10 games', type: 'wins', target: 10, rewards: { tokens: 300, xp: 150 } },
    { id: 'weekly_pvp_5', title: 'Duelist', description: 'Win 5 PvP matches', type: 'pvp_wins', target: 5, rewards: { tokens: 400, xp: 200 } },
    { id: 'weekly_perfect', title: 'Flawless Victory', description: 'Win without losing a controller', type: 'perfect_wins', target: 3, rewards: { tokens: 500, xp: 250 } }
  ]
};

export default function Progression() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !supabaseUser) {
        console.error('Auth error or no user:', authError?.message);
        setUser(null);
        return;
      }
      setUser(supabaseUser);
    };
    fetchUser();
  }, []);

  const { data: progress, isLoading: isLoadingProgress } = useQuery({
    queryKey: ['player-progress', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      let { data: progs, error } = await supabase
        .from('playerprogress')
        .select('*')
        .eq('user_email', user.email)
        .single();
      
      if (error && error.code === 'PGRST116') { // No rows found, create a new one
        console.log('No player progress found, creating new entry for:', user.email);
        const { data: newProg, error: createError } = await supabase
          .from('playerprogress')
          .insert({ user_email: user.email, xp: 0, level: 1, tokens: 100, unlocked_decks: ['fire', 'water', 'earth', 'wind'], owned_cards: [], total_wins: 0, ai_wins: 0, pvp_wins: 0, deck_wins: {}, admin_mode_active: false, fate_rank: "Fatebound Initiate" })
          .select()
          .single();
        if (createError) {
          console.error('Error creating player progress:', createError);
          throw createError;
        }
        return newProg;
      } else if (error) {
        console.error('Error fetching player progress:', error);
        throw error;
      }
      return progs;
    },
    enabled: !!user?.email,
    staleTime: 0
  });

  const { data: quests, isLoading: isLoadingQuests } = useQuery({
    queryKey: ['quests', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const now = new Date();
      let { data: userQuests, error: fetchError } = await supabase
        .from('quest')
        .select('*')
        .eq('user_email', user.email);
      
      if (fetchError) {
        console.error('Error fetching user quests:', fetchError);
        throw fetchError;
      }

      let activeQuests = (userQuests || []).filter(q => new Date(q.expires_at) > now);
      
      // If no active quests, generate new ones
      if (activeQuests.length === 0) {
        const dailyQuestTemplate = QUEST_TEMPLATES.daily[Math.floor(Math.random() * QUEST_TEMPLATES.daily.length)];
        const weeklyQuestTemplate = QUEST_TEMPLATES.weekly[Math.floor(Math.random() * QUEST_TEMPLATES.weekly.length)];
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Reset to start of day for daily
        
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0); // Reset to start of day for weekly
        
        const newQuestsData = [
          {
            user_email: user.email,
            quest_type: 'daily',
            quest_id: dailyQuestTemplate.id,
            title: dailyQuestTemplate.title,
            description: dailyQuestTemplate.description,
            requirement: { type: dailyQuestTemplate.type, target: dailyQuestTemplate.target, current: 0 },
            rewards: dailyQuestTemplate.rewards,
            expires_at: tomorrow.toISOString(),
            claimed: false // Ensure claimed status is false for new quests
          },
          {
            user_email: user.email,
            quest_type: 'weekly',
            quest_id: weeklyQuestTemplate.id,
            title: weeklyQuestTemplate.title,
            description: weeklyQuestTemplate.description,
            requirement: { type: weeklyQuestTemplate.type, target: weeklyQuestTemplate.target, current: 0 },
            rewards: weeklyQuestTemplate.rewards,
            expires_at: nextWeek.toISOString(),
            claimed: false // Ensure claimed status is false for new quests
          }
        ];
        
        const { data: insertedQuests, error: insertError } = await supabase
          .from('quest')
          .insert(newQuestsData)
          .select();
        
        if (insertError) {
          console.error('Error creating new quests:', insertError);
          throw insertError;
        }
        return insertedQuests;
      }
      
      return activeQuests;
    },
    enabled: !!user?.email,
    staleTime: 0 // Fetch fresh quests often
  });

  const claimQuestMutation = useMutation({
    mutationFn: async (quest) => {
      if (!user?.email) throw new Error("Not signed in");
      if (!progress?.user_email) throw new Error("Player progress not loaded.");

      // Update quest status
      const { error: questUpdateError } = await supabase
        .from('quest')
        .update({ claimed: true })
        .eq('id', quest.id);
      if (questUpdateError) throw questUpdateError;

      // Update player progress (tokens and XP)
      const { error: progressUpdateError } = await supabase
        .from('playerprogress')
        .update({
          tokens: (progress.tokens || 0) + (quest.rewards.tokens || 0),
          xp: (progress.xp || 0) + (quest.rewards.xp || 0)
        })
        .eq('user_email', user.email);
      if (progressUpdateError) throw progressUpdateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['player-progress'] });
      alert('Quest claimed successfully!');
    },
    onError: (error) => {
      alert(`Failed to claim quest: ${error.message}`);
      console.error('Claim quest error:', error);
    }
  });

  if (!user || isLoadingProgress || isLoadingQuests) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  // Safely determine current and next level based on progress.xp
  const currentLevelData = LEVEL_THRESHOLDS.slice().reverse().find(l => (progress?.xp || 0) >= l.xp) || LEVEL_THRESHOLDS[0];
  const nextLevelData = LEVEL_THRESHOLDS.find(l => l.xp > (progress?.xp || 0)) || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  
  const xpProgress = currentLevelData.xp === nextLevelData.xp ? 100 : ((progress.xp - currentLevelData.xp) / (nextLevelData.xp - currentLevelData.xp)) * 100;

  return (
    <div className="min-h-screen bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950" />
      <ArcaneParticles />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl('TCGMainMenu')}>
            <MagicalButton variant="secondary" className="text-cyan-300">
              <ArrowLeft className="w-4 h-4" />
              Back
            </MagicalButton>
          </Link>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-purple-400 to-cyan-400 tracking-wider">
            ✦ Fate's Path ✦
          </h1>
          <div className="w-20" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* XP & Level */}
          <div className="lg:col-span-2">
            <ArcaneFrame className="bg-slate-900/40 mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-purple-300">Level {progress.level}</h2>
                    <p className="text-amber-400 text-lg font-bold">{currentLevelData.rank}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{progress.xp} <Sparkles className="w-5 h-5 inline" /></div>
                    <div className="text-sm text-slate-400">Fate Essence</div>
                  </div>
                </div>

                <div className="relative h-8 bg-slate-800 rounded-full overflow-hidden border-2 border-purple-500/30">
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${xpProgress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                    {progress.xp} / {nextLevelData.xp} XP
                  </div>
                </div>

                <div className="text-center text-slate-400 text-sm mt-2">
                  {nextLevelData.xp - progress.xp} XP until level {nextLevelData.level}
                </div>
              </div>
            </ArcaneFrame>

            {/* Rewards Track */}
            <ArcaneFrame className="bg-slate-900/40">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-purple-300 mb-4">✦ Rewards Track ✦</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {LEVEL_THRESHOLDS.filter(l => l.reward).map((milestone, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                        progress.level >= milestone.level
                          ? 'bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-green-500/50'
                          : progress.xp >= milestone.xp * 0.8 // Changed to check progress.xp
                          ? 'bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-amber-500/50'
                          : 'bg-slate-800/40 border-slate-600/30'
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3">
                        {progress.level >= milestone.level ? (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        ) : (
                          <Lock className="w-6 h-6 text-slate-500" />
                        )}
                        <div>
                          <div className="font-bold text-white">Level {milestone.level}</div>
                          <div className="text-sm text-slate-400">{milestone.rank}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        {milestone.reward.tokens && (
                          <div className="text-amber-400 font-bold">{milestone.reward.tokens} Shards</div>
                        )}
                        {milestone.reward.pack && (
                          <div className="text-purple-400 text-sm">{milestone.reward.pack}</div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </ArcaneFrame>
          </div>

          {/* Quests */}
          <div>
            <ArcaneFrame className="bg-slate-900/40">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-purple-300 mb-4 flex items-center gap-2">
                  <Trophy className="w-6 h-6" />
                  Destiny Trials
                </h3>

                <div className="space-y-4">
                  {quests?.map((quest) => {
                    const currentProgress = quest.requirement?.current || 0;
                    const targetProgress = quest.requirement?.target || 1;
                    const progressPercentage = (currentProgress / targetProgress) * 100;
                    const isComplete = currentProgress >= targetProgress;

                    return (
                      <motion.div
                        key={quest.id}
                        className={`p-4 rounded-lg border-2 ${
                          quest.quest_type === 'daily'
                            ? 'bg-cyan-900/20 border-cyan-500/30'
                            : 'bg-purple-900/20 border-purple-500/30'
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {quest.quest_type === 'daily' ? (
                              <Clock className="w-4 h-4 text-cyan-400" />
                            ) : (
                              <Star className="w-4 h-4 text-purple-400" />
                            )}
                            <span className="text-xs font-bold uppercase text-slate-400">
                              {quest.quest_type}
                            </span>
                          </div>
                          {isComplete && !quest.claimed && (
                            <Gift className="w-5 h-5 text-amber-400 animate-pulse" />
                          )}
                        </div>

                        <h4 className="font-bold text-white mb-1">{quest.title}</h4>
                        <p className="text-sm text-slate-400 mb-3">{quest.description}</p>

                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                          <motion.div
                            className={`absolute inset-y-0 left-0 ${
                              quest.quest_type === 'daily'
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progressPercentage, 100)}%` }} // Use progressPercentage
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            {currentProgress} / {targetProgress}
                          </span>
                          <div className="flex gap-2 text-xs">
                            <span className="text-amber-400 font-bold">
                              {quest.rewards.tokens} Shards
                            </span>
                            <span className="text-cyan-400 font-bold">
                              {quest.rewards.xp} XP
                            </span>
                          </div>
                        </div>

                        {isComplete && !quest.claimed && (
                          <MagicalButton
                            onClick={() => claimQuestMutation.mutate(quest)}
                            className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500"
                          >
                            <Gift className="w-4 h-4" />
                            Claim Reward
                          </MagicalButton>
                        )}
                        {quest.claimed && (
                          <div className="mt-3 text-center text-green-400 text-sm font-bold">
                            ✓ Claimed
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </ArcaneFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
