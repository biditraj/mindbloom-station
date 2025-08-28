import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Heart,
  Brain,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import useMoodHistory, { type MoodHistoryStats } from '@/hooks/useMoodHistory';

interface ExtendedStats extends MoodHistoryStats {
  improvementTrend: 'improving' | 'stable' | 'declining';
  streakCount: number;
  wellnessScore: number;
  topRecommendationType: string;
}

const MoodStatistics = () => {
  const { user, logout } = useAuth();
  const { moodLogs, statistics, loading: historyLoading } = useMoodHistory();
  const [extendedStats, setExtendedStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!historyLoading && statistics && moodLogs.length > 0) {
      calculateExtendedStats();
    } else if (!historyLoading) {
      setLoading(false);
    }
  }, [historyLoading, statistics, moodLogs]);

  const calculateExtendedStats = async () => {
    try {
      if (moodLogs.length === 0) {
        setExtendedStats({
          ...statistics,
          improvementTrend: 'stable',
          streakCount: 0,
          wellnessScore: 0,
          topRecommendationType: 'mindfulness'
        });
        setLoading(false);
        return;
      }

      // Calculate improvement trend based on recent vs older logs
      const recentLogs = moodLogs.slice(0, Math.min(10, Math.floor(moodLogs.length / 2)));
      const olderLogs = moodLogs.slice(-Math.min(10, Math.floor(moodLogs.length / 2)));
      
      const recentAvg = recentLogs.reduce((sum, log) => sum + parseInt(log.mood_level), 0) / recentLogs.length;
      const olderAvg = olderLogs.reduce((sum, log) => sum + parseInt(log.mood_level), 0) / olderLogs.length;
      
      let improvementTrend: 'improving' | 'stable' | 'declining' = 'stable';
      if (recentAvg > olderAvg + 0.3) improvementTrend = 'improving';
      else if (recentAvg < olderAvg - 0.3) improvementTrend = 'declining';

      // Calculate streak (consecutive days with mood >= 3)
      let streakCount = 0;
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayLogs = moodLogs.filter(log => log.created_at.startsWith(dateStr));
        
        if (dayLogs.length > 0) {
          const dayAvg = dayLogs.reduce((sum, log) => sum + parseInt(log.mood_level), 0) / dayLogs.length;
          if (dayAvg >= 3) {
            streakCount++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      // Calculate wellness score (0-100) - only from real data
      const moodComponent = (statistics.averageMood / 5) * 40;
      const stressComponent = statistics.averageStress > 0 ? (1 - (statistics.averageStress / 5)) * 30 : 15;
      const consistencyComponent = Math.min(statistics.totalEntries / 30, 1) * 20;
      const streakComponent = Math.min(streakCount / 7, 1) * 10;
      const wellnessScore = Math.round(moodComponent + stressComponent + consistencyComponent + streakComponent);

      // Get top recommendation type from real user data only
      const { data: recommendations } = await supabase
        .from('recommendations')
        .select('type')
        .in('mood_log_id', moodLogs.map(log => log.id));
      
      let topRecommendationType = 'mindfulness'; // default
      if (recommendations && recommendations.length > 0) {
        const typeCounts: Record<string, number> = {};
        recommendations.forEach(rec => {
          typeCounts[rec.type] = (typeCounts[rec.type] || 0) + 1;
        });
        
        topRecommendationType = Object.entries(typeCounts)
          .reduce((a, b) => a[1] > b[1] ? a : b)[0];
      }

      setExtendedStats({
        ...statistics,
        improvementTrend,
        streakCount,
        wellnessScore,
        topRecommendationType
      });
    } catch (error) {
      console.error('Error calculating extended stats:', error);
      setExtendedStats({
        ...statistics,
        improvementTrend: 'stable',
        streakCount: 0,
        wellnessScore: Math.round((statistics.averageMood / 5) * 100),
        topRecommendationType: 'mindfulness'
      });
    } finally {
      setLoading(false);
    }
  };

  if (historyLoading || loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-100 to-pink-100">
        <div className="flex h-full">
          <div className="w-80 p-4">
            <Skeleton className="h-full w-full rounded-3xl" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-full w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white/80 backdrop-blur-sm overflow-hidden h-full">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200/60">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Your Mood Statistics</h1>
          <p className="text-slate-600 text-sm">
            {moodLogs.length > 0 
              ? `Real insights from your ${statistics?.totalEntries || 0} mood check-ins` 
              : 'Start tracking your mood to see personalized insights here'
            }
          </p>
        </div>
        {extendedStats?.wellnessScore && (
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{extendedStats.wellnessScore}%</div>
              <div className="text-xs text-slate-600 font-medium">Wellness Score</div>
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mt-1 mx-auto">
                <div 
                  className="h-1.5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000"
                  style={{ width: `${extendedStats.wellnessScore}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
          {moodLogs.length === 0 ? (
            /* Compact Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-full p-8 mb-4">
                <Heart className="h-12 w-12 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">No mood data yet</h3>
              <p className="text-slate-600 mb-4 max-w-sm text-sm">Start logging your daily mood to see personalized statistics and insights.</p>
              <Button className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white">
                <Heart className="h-4 w-4 mr-2" />
                Log Your First Mood
              </Button>
            </div>
          ) : (
            /* Unified Single Screen Layout */
            <div className="flex-1 space-y-6 overflow-hidden">
              
              {/* Compact 4-Column Metrics */}
              <div className="grid grid-cols-4 gap-4">
                
                {/* Metric 1 - Average Mood */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Heart className="h-4 w-4 text-white" />
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 text-xs">Mood</Badge>
                  </div>
                  <div className="text-xl font-bold text-slate-800">{statistics?.averageMood.toFixed(1) || '0.0'}/5.0</div>
                  <div className="text-xs text-slate-600 font-medium mb-2">Average Mood</div>
                  <div className="w-full bg-blue-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${((statistics?.averageMood || 0) / 5) * 100}%` }}
                    />
                  </div>
                </motion.div>

                {/* Metric 2 - Total Check-ins */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <Activity className="h-4 w-4 text-white" />
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-xs">Activity</Badge>
                  </div>
                  <div className="text-xl font-bold text-slate-800">{statistics?.totalEntries || 0}</div>
                  <div className="text-xs text-slate-600 font-medium">Total Check-ins</div>
                  <div className="text-xs text-green-600 font-medium">{extendedStats?.streakCount || 0} day streak</div>
                </motion.div>

                {/* Metric 3 - Stress Level */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <Brain className="h-4 w-4 text-white" />
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">Stress</Badge>
                  </div>
                  <div className="text-xl font-bold text-slate-800">{statistics?.averageStress?.toFixed(1) || '0.0'}/5.0</div>
                  <div className="text-xs text-slate-600 font-medium mb-2">Average Stress</div>
                  <div className="w-full bg-purple-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-purple-400 to-purple-600 h-1.5 rounded-full transition-all duration-1000"
                      style={{ width: `${((statistics?.averageStress || 0) / 5) * 100}%` }}
                    />
                  </div>
                </motion.div>

                {/* Metric 4 - Trend Status */}
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-4 text-white"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <Badge className="bg-white/20 text-white text-xs">Trend</Badge>
                  </div>
                  <div className="text-xl font-bold capitalize">{extendedStats?.improvementTrend || 'stable'}</div>
                  <div className="text-xs opacity-90 font-medium">Recent Progress</div>
                  <div className="bg-white/20 rounded px-2 py-1 text-xs font-medium mt-1">
                    {extendedStats?.topRecommendationType || 'mindfulness'}
                  </div>
                </motion.div>
              </div>

              {/* Divider */}
              <Separator className="bg-gray-200" />

              {/* Unified Analytics Section - Two Columns */}
              <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                
                {/* Left - Compact Weekly Trends */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    <h3 className="font-bold text-slate-800">Weekly Mood Trends</h3>
                  </div>
                  
                  {statistics?.weeklyTrend && statistics.weeklyTrend.length > 0 ? (
                    <div className="bg-gradient-to-t from-slate-50 to-white rounded-xl p-4 border border-slate-200">
                      <div className="flex items-end gap-2 h-32">
                        {statistics.weeklyTrend.map((day, index) => (
                          <motion.div 
                            key={day.date} 
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 0.6, delay: 0.6 + (index * 0.1) }}
                            className="flex flex-col items-center flex-1"
                          >
                            <div 
                              className="bg-gradient-to-t from-orange-500 to-red-400 rounded-t w-full mb-2 min-h-[8px]"
                              style={{ height: `${(day.mood / 5) * 100}px` }}
                            />
                            <div className="text-xs text-center">
                              <div className="font-bold text-slate-800">{day.mood.toFixed(1)}</div>
                              <div className="text-slate-500 text-xs">
                                {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 bg-white rounded-xl flex items-center justify-center border border-slate-200">
                      <div className="text-center">
                        <BarChart3 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <span className="text-slate-400 text-sm">Log more moods to see trends</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right - Compact Personal Analytics */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <h3 className="font-bold text-slate-800">Personal Analytics</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Compact Mood Distribution */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <h4 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                        <Heart className="h-4 w-4 text-orange-500" />
                        Mood Distribution
                      </h4>
                      <div className="space-y-2">
                        {statistics && Object.entries(statistics.moodDistribution).map(([level, count]) => (
                          <div key={level} className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700">Level {level}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(count / statistics.totalEntries) * 100}%` }}
                                  transition={{ duration: 1, delay: 0.8 }}
                                  className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full" 
                                />
                              </div>
                              <span className="w-6 text-right font-bold text-slate-800">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Compact Stress Analysis */}
                    {statistics?.averageStress > 0 && (
                      <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-700 mb-3 text-sm flex items-center gap-2">
                          <Brain className="h-4 w-4 text-purple-500" />
                          Stress Analysis
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-slate-700">Average Level</span>
                            <span className="font-bold text-slate-800">{statistics.averageStress.toFixed(1)}/5.0</span>
                          </div>
                          <Progress value={(statistics.averageStress / 5) * 100} className="h-2" />
                          <div className="text-xs text-slate-500">
                            📊 Based on {statistics.totalEntries} logs
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );
};

export default MoodStatistics;