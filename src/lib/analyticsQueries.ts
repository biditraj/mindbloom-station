import { supabase } from '@/integrations/supabase/client';

// Interface definitions for analytics data
export interface WeeklyStressTrend {
  week: string;
  avg_stress: number;
  total_logs: number;
}

export interface SentimentDistribution {
  ai_sentiment: string;
  count: number;
  percentage: number;
}

export interface DailyActivity {
  day: string;
  count: number;
  avg_mood_level: number;
}

export interface StressLevelDistribution {
  ai_stress_level: number;
  count: number;
  percentage: number;
}

export interface StudentOverview {
  total_students: number;
  active_students_7_days: number;
  total_mood_logs: number;
  avg_stress_level: number;
}

/**
 * Fetches weekly stress trends for the last 12 weeks
 */
export async function getWeeklyStressTrends(): Promise<WeeklyStressTrend[]> {
  try {
    const { data, error } = await supabase.rpc('get_weekly_stress_trends');
    
    if (error) {
      // Fallback to direct query if RPC function doesn't exist
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('mood_logs')
        .select('created_at, ai_stress_level')
        .not('ai_stress_level', 'is', null)
        .gte('created_at', new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString()) // Last 12 weeks
        .order('created_at', { ascending: true });
      
      if (fallbackError) throw fallbackError;
      
      // Process data client-side
      const weeklyData: { [key: string]: { total_stress: number; count: number } } = {};
      
      fallbackData?.forEach(log => {
        const date = new Date(log.created_at);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { total_stress: 0, count: 0 };
        }
        
        weeklyData[weekKey].total_stress += log.ai_stress_level;
        weeklyData[weekKey].count += 1;
      });
      
      return Object.entries(weeklyData).map(([week, data]) => ({
        week,
        avg_stress: Number((data.total_stress / data.count).toFixed(2)),
        total_logs: data.count
      }));
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching weekly stress trends:', error);
    return [];
  }
}

/**
 * Fetches sentiment distribution data
 */
export async function getSentimentDistribution(): Promise<SentimentDistribution[]> {
  try {
    const { data, error } = await supabase
      .from('mood_logs')
      .select('ai_sentiment')
      .not('ai_sentiment', 'is', null);
    
    if (error) throw error;
    
    // Count sentiments
    const sentimentCounts: { [key: string]: number } = {};
    const total = data?.length || 0;
    
    data?.forEach(log => {
      const sentiment = log.ai_sentiment || 'unknown';
      sentimentCounts[sentiment] = (sentimentCounts[sentiment] || 0) + 1;
    });
    
    // Convert to array with percentages
    return Object.entries(sentimentCounts).map(([sentiment, count]) => ({
      ai_sentiment: sentiment,
      count,
      percentage: Number(((count / total) * 100).toFixed(1))
    }));
  } catch (error) {
    console.error('Error fetching sentiment distribution:', error);
    return [];
  }
}

/**
 * Fetches daily activity heatmap data for the last 30 days
 */
export async function getDailyActivity(): Promise<DailyActivity[]> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('mood_logs')
      .select('created_at, mood_level')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // Group by day
    const dailyData: { [key: string]: { count: number; total_mood: number } } = {};
    
    data?.forEach(log => {
      const day = log.created_at.split('T')[0];
      const moodLevel = parseInt(log.mood_level);
      
      if (!dailyData[day]) {
        dailyData[day] = { count: 0, total_mood: 0 };
      }
      
      dailyData[day].count += 1;
      dailyData[day].total_mood += moodLevel;
    });
    
    return Object.entries(dailyData).map(([day, data]) => ({
      day,
      count: data.count,
      avg_mood_level: Number((data.total_mood / data.count).toFixed(1))
    }));
  } catch (error) {
    console.error('Error fetching daily activity:', error);
    return [];
  }
}

/**
 * Fetches stress level distribution
 */
export async function getStressLevelDistribution(): Promise<StressLevelDistribution[]> {
  try {
    const { data, error } = await supabase
      .from('mood_logs')
      .select('ai_stress_level')
      .not('ai_stress_level', 'is', null);
    
    if (error) throw error;
    
    // Count stress levels
    const stressLevelCounts: { [key: number]: number } = {};
    const total = data?.length || 0;
    
    data?.forEach(log => {
      const stressLevel = log.ai_stress_level;
      stressLevelCounts[stressLevel] = (stressLevelCounts[stressLevel] || 0) + 1;
    });
    
    // Convert to array with percentages, ensure all levels 1-5 are represented
    const result: StressLevelDistribution[] = [];
    for (let level = 1; level <= 5; level++) {
      const count = stressLevelCounts[level] || 0;
      result.push({
        ai_stress_level: level,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error fetching stress level distribution:', error);
    return [];
  }
}

/**
 * Fetches student overview statistics
 */
export async function getStudentOverview(): Promise<StudentOverview> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Get total students
    const { count: totalStudents } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true });
    
    // Get active students in last 7 days
    const { data: activeStudents } = await supabase
      .from('mood_logs')
      .select('student_id')
      .gte('created_at', sevenDaysAgo);
    
    const activeStudentIds = new Set(activeStudents?.map(log => log.student_id));
    
    // Get total mood logs
    const { count: totalMoodLogs } = await supabase
      .from('mood_logs')
      .select('*', { count: 'exact', head: true });
    
    // Get average stress level
    const { data: stressData } = await supabase
      .from('mood_logs')
      .select('ai_stress_level')
      .not('ai_stress_level', 'is', null);
    
    const avgStress = stressData?.length > 0 
      ? stressData.reduce((sum, log) => sum + log.ai_stress_level, 0) / stressData.length
      : 0;
    
    return {
      total_students: totalStudents || 0,
      active_students_7_days: activeStudentIds.size,
      total_mood_logs: totalMoodLogs || 0,
      avg_stress_level: Number(avgStress.toFixed(2))
    };
  } catch (error) {
    console.error('Error fetching student overview:', error);
    return {
      total_students: 0,
      active_students_7_days: 0,
      total_mood_logs: 0,
      avg_stress_level: 0
    };
  }
}

/**
 * SQL queries that can be run directly in Supabase dashboard for reference
 */
export const SQL_QUERIES = {
  weeklyStressTrend: `
    SELECT 
      date_trunc('week', created_at) as week,
      AVG(ai_stress_level) as avg_stress,
      COUNT(*) as total_logs
    FROM mood_logs 
    WHERE ai_stress_level IS NOT NULL 
      AND created_at >= NOW() - INTERVAL '12 weeks'
    GROUP BY week 
    ORDER BY week;
  `,
  
  sentimentDistribution: `
    SELECT 
      ai_sentiment,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM mood_logs WHERE ai_sentiment IS NOT NULL)), 1) as percentage
    FROM mood_logs 
    WHERE ai_sentiment IS NOT NULL
    GROUP BY ai_sentiment
    ORDER BY count DESC;
  `,
  
  dailyActivity: `
    SELECT 
      DATE(created_at) as day,
      COUNT(*) as count,
      AVG(CAST(mood_level AS INTEGER)) as avg_mood_level
    FROM mood_logs 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY day 
    ORDER BY day;
  `,
  
  stressLevelDistribution: `
    SELECT 
      ai_stress_level,
      COUNT(*) as count,
      ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM mood_logs WHERE ai_stress_level IS NOT NULL)), 1) as percentage
    FROM mood_logs 
    WHERE ai_stress_level IS NOT NULL
    GROUP BY ai_stress_level 
    ORDER BY ai_stress_level;
  `
};