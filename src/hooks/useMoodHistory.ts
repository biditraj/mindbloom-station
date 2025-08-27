import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MoodLogWithRecommendations {
  id: string;
  mood_level: '1' | '2' | '3' | '4' | '5';
  note: string | null;
  ai_sentiment: string | null;
  ai_stress_level: number | null;
  created_at: string;
  recommendations: Array<{
    id: string;
    title: string;
    description: string | null;
    content_url: string | null;
    type: 'breathing' | 'mindfulness' | 'activity' | 'video' | 'article';
  }>;
}

export interface MoodHistoryFilters {
  dateRange: 'all' | 'week' | 'month' | '3months';
  moodLevel: 'all' | '1' | '2' | '3' | '4' | '5';
  sortBy: 'newest' | 'oldest' | 'mood_asc' | 'mood_desc';
}

export interface MoodHistoryStats {
  totalEntries: number;
  averageMood: number;
  averageStress: number;
  mostCommonMood: string;
  moodDistribution: Record<string, number>;
  weeklyTrend: Array<{ date: string; mood: number; stress?: number }>;
}

const useMoodHistory = () => {
  const { student } = useAuth();
  const [moodLogs, setMoodLogs] = useState<MoodLogWithRecommendations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MoodHistoryFilters>({
    dateRange: 'all',
    moodLevel: 'all',
    sortBy: 'newest'
  });

  const fetchMoodHistory = async () => {
    if (!student?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build date filter
      let dateFilter = '';
      const now = new Date();
      if (filters.dateRange !== 'all') {
        const daysBack = {
          week: 7,
          month: 30,
          '3months': 90
        }[filters.dateRange];
        
        const filterDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
        dateFilter = filterDate.toISOString();
      }

      // Build query
      let query = supabase
        .from('mood_logs')
        .select(`
          id,
          mood_level,
          note,
          ai_sentiment,
          ai_stress_level,
          created_at,
          recommendations:recommendations!mood_log_id (
            id,
            title,
            description,
            content_url,
            type
          )
        `)
        .eq('student_id', student.id);

      // Apply date filter
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      // Apply mood level filter
      if (filters.moodLevel !== 'all') {
        query = query.eq('mood_level', filters.moodLevel);
      }

      // Apply sorting
      const sortColumn = filters.sortBy.includes('mood') ? 'mood_level' : 'created_at';
      const ascending = filters.sortBy.includes('asc') || filters.sortBy === 'oldest';
      query = query.order(sortColumn, { ascending });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching mood history:', fetchError);
        setError('Failed to load mood history. Please try again.');
        return;
      }

      setMoodLogs(data || []);
    } catch (err) {
      console.error('Error in fetchMoodHistory:', err);
      setError('An unexpected error occurred while loading mood history.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics based on current data
  const statistics: MoodHistoryStats = useMemo(() => {
    if (moodLogs.length === 0) {
      return {
        totalEntries: 0,
        averageMood: 0,
        averageStress: 0,
        mostCommonMood: '3',
        moodDistribution: {},
        weeklyTrend: []
      };
    }

    // Basic stats
    const totalEntries = moodLogs.length;
    const moodSum = moodLogs.reduce((sum, log) => sum + parseInt(log.mood_level), 0);
    const averageMood = moodSum / totalEntries;

    const stressLogs = moodLogs.filter(log => log.ai_stress_level !== null);
    const stressSum = stressLogs.reduce((sum, log) => sum + (log.ai_stress_level || 0), 0);
    const averageStress = stressLogs.length > 0 ? stressSum / stressLogs.length : 0;

    // Mood distribution
    const moodDistribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    moodLogs.forEach(log => {
      moodDistribution[log.mood_level] = (moodDistribution[log.mood_level] || 0) + 1;
    });

    // Most common mood
    const mostCommonMood = Object.entries(moodDistribution)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    // Weekly trend (last 7 days)
    const weeklyTrend: Array<{ date: string; mood: number; stress?: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayLogs = moodLogs.filter(log => 
        log.created_at.startsWith(dateStr)
      );

      if (dayLogs.length > 0) {
        const dayMoodAvg = dayLogs.reduce((sum, log) => sum + parseInt(log.mood_level), 0) / dayLogs.length;
        const dayStressLogs = dayLogs.filter(log => log.ai_stress_level !== null);
        const dayStressAvg = dayStressLogs.length > 0 
          ? dayStressLogs.reduce((sum, log) => sum + (log.ai_stress_level || 0), 0) / dayStressLogs.length
          : undefined;

        weeklyTrend.push({
          date: dateStr,
          mood: Math.round(dayMoodAvg * 10) / 10,
          stress: dayStressAvg ? Math.round(dayStressAvg * 10) / 10 : undefined
        });
      }
    }

    return {
      totalEntries,
      averageMood: Math.round(averageMood * 10) / 10,
      averageStress: Math.round(averageStress * 10) / 10,
      mostCommonMood,
      moodDistribution,
      weeklyTrend
    };
  }, [moodLogs]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchMoodHistory();
  }, [student?.id, filters]);

  const updateFilters = (newFilters: Partial<MoodHistoryFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const refreshHistory = () => {
    fetchMoodHistory();
  };

  return {
    moodLogs,
    loading,
    error,
    filters,
    statistics,
    updateFilters,
    refreshHistory
  };
};

export default useMoodHistory;