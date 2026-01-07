import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, PlayCircle, CheckCircle2, Lock, ArrowLeft, Swords, Zap, Crown, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

const LESSONS = [
  {
    id: 'basic_gameplay',
    title: 'Basic Gameplay',
    description: 'Learn the fundamentals: Controllers, Shards, and playing cards',
    icon: Book,
    difficulty: 'Beginner',
    duration: '5 min',
    reward: 50,
    unlocked: true
  },
  {
    id: 'combat_basics',
    title: 'Combat Basics',
    description: 'Master attacking, defending, and combat mechanics',
    icon: Swords,
    difficulty: 'Beginner',
    duration: '5 min',
    reward: 30,
    unlocked: true
  },
  {
    id: 'advanced_mechanics',
    title: 'Advanced Mechanics',
    description: 'Keywords, abilities, and strategic card interactions',
    icon: Zap,
    difficulty: 'Intermediate',
    duration: '7 min',
    reward: 30,
    requires: ['basic_gameplay', 'combat_basics']
  },
  {
    id: 'controller_mastery',
    title: 'Controller Mastery',
    description: 'Deep dive into Controller abilities and synergies',
    icon: Crown,
    difficulty: 'Advanced',
    duration: '8 min',
    reward: 30,
    requires: ['advanced_mechanics']
  },
  {
    id: 'deck_building',
    title: 'Deck Building Strategy',
    description: 'Learn to build powerful, synergistic decks',
    icon: Layers,
    difficulty: 'Advanced',
    duration: '10 min',
    reward: 30,
    requires: ['controller_mastery']
  }
];

export default function Tutorial() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
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



  const { data: progress } = useQuery({
    queryKey: ['tutorial-progress', user?.email],
    queryFn: async () => {
      const progs = await base44.entities.TutorialProgress.filter({ user_email: user.email });
      if (progs.length > 0) return progs[0];
      
      return await base44.entities.TutorialProgress.create({
        user_email: user.email,
        completed_lessons: [],
        tutorial_completed: false,
        hints_enabled: true
      });
    },
    enabled: !!user
  });

  const startLessonMutation = useMutation({
    mutationFn: async (lessonId) => {
      await base44.entities.TutorialProgress.update(progress.id, {
        current_lesson: lessonId
      });
    },
    onSuccess: (_, lessonId) => {
      queryClient.invalidateQueries(['tutorial-progress']);
      navigate(createPageUrl(`TCG?tutorial=${lessonId}`));
    }
  });

  const isLessonUnlocked = (lesson) => {
    if (lesson.unlocked) return true;
    if (!lesson.requires) return true;
    return lesson.requires.every(req => progress?.completed_lessons?.includes(req));
  };

  if (!user || !progress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const completedCount = progress.completed_lessons?.length || 0;
  const totalLessons = LESSONS.length;
  const progressPercent = (completedCount / totalLessons) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to={createPageUrl('TCG')}>
            <Button variant="outline" className="border-slate-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Game
            </Button>
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
            Tutorial Academy
          </h1>
          <p className="text-slate-400 text-lg">Master Arcane Duels step by step</p>
        </div>

        {/* Progress Overview */}
        <Card className="bg-slate-900/80 border-purple-500/50 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Lessons Completed</span>
                <span className="text-purple-400 font-bold">{completedCount} / {totalLessons}</span>
              </div>
              <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  className="h-full bg-gradient-to-r from-purple-600 to-pink-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {LESSONS.map((lesson, index) => {
            const Icon = lesson.icon;
            const isCompleted = progress.completed_lessons?.includes(lesson.id);
            const isUnlocked = isLessonUnlocked(lesson);
            
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`bg-slate-900/80 border-2 ${
                  isCompleted ? 'border-green-500' :
                  isUnlocked ? 'border-purple-500/50 hover:border-purple-400' :
                  'border-slate-700 opacity-50'
                } transition-all relative overflow-hidden`}>
                  {isCompleted && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className="p-2 bg-green-600 rounded-full">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="absolute top-3 right-3 z-10">
                      <div className="p-2 bg-slate-700 rounded-full">
                        <Lock className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-lg ${
                        isCompleted ? 'bg-green-600/20' :
                        isUnlocked ? 'bg-purple-600/20' :
                        'bg-slate-800'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          isCompleted ? 'text-green-400' :
                          isUnlocked ? 'text-purple-400' :
                          'text-slate-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-white mb-1">{lesson.title}</CardTitle>
                        <p className="text-slate-400 text-sm">{lesson.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex gap-3 text-xs text-slate-400">
                        <span>📊 {lesson.difficulty}</span>
                        <span>⏱️ {lesson.duration}</span>
                      </div>
                      {lesson.reward && !isCompleted && (
                        <div className="px-2 py-1 bg-amber-600/20 border border-amber-500 rounded text-xs font-bold text-amber-400">
                          +{lesson.reward} 🪙
                        </div>
                      )}
                    </div>

                    {!isUnlocked && lesson.requires && (
                      <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <p className="text-xs text-slate-400 mb-1">Required:</p>
                        <div className="flex flex-wrap gap-1">
                          {lesson.requires.map(req => {
                            const reqLesson = LESSONS.find(l => l.id === req);
                            return (
                              <span key={req} className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
                                {reqLesson?.title}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => startLessonMutation.mutate(lesson.id)}
                      disabled={!isUnlocked}
                      className={`w-full ${
                        isCompleted ? 'bg-green-600 hover:bg-green-700' :
                        'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      }`}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {isCompleted ? 'Replay Lesson' : 'Start Lesson'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Rewards Info */}
        <Card className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-500/50 mt-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🎁</div>
              <div className="flex-1">
                <h3 className="text-amber-400 font-bold text-lg mb-1">Tutorial Rewards</h3>
                <p className="text-amber-200/80 text-sm">
                  First lesson: <span className="font-bold">50 tokens</span> • Other lessons: <span className="font-bold">30 tokens each</span>
                </p>
                <p className="text-amber-200/80 text-sm">
                  Complete all 5 lessons for a <span className="font-bold">+100 token bonus!</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="bg-slate-900/80 border-purple-500/50 mt-8">
          <CardHeader>
            <CardTitle className="text-white">Quick Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <h4 className="text-purple-400 font-bold mb-1">🎯 Win Condition</h4>
                <p className="text-slate-300">Destroy all 3 enemy Controllers</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <h4 className="text-purple-400 font-bold mb-1">⚡ Shards</h4>
                <p className="text-slate-300">10 to start, +1 per turn</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <h4 className="text-purple-400 font-bold mb-1">🛡️ Guardian</h4>
                <p className="text-slate-300">Must be destroyed first</p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <h4 className="text-purple-400 font-bold mb-1">⚔️ Combat</h4>
                <p className="text-slate-300">Creatures deal AP as damage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}