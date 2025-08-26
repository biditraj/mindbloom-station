import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, MessageSquare, Brain, Calendar, AlertTriangle } from 'lucide-react';

interface DashboardData {
  totalStudents: number;
  totalMoodLogs: number;
  totalMessages: number;
  weeklyMoodTrends: Array<{ day: string; averageMood: number; count: number }>;
  moodDistribution: Array<{ mood: string; count: number; percentage: number }>;
  stressLevels: Array<{ level: string; count: number }>;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { student } = useAuth();

  useEffect(() => {
    if (student?.role === 'admin') {
      fetchDashboardData();
    }
  }, [student]);

  const fetchDashboardData = async () => {
    try {
      // Fetch total counts
      const [studentsRes, moodLogsRes, messagesRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('mood_logs').select('id', { count: 'exact' }),
        supabase.from('messages').select('id', { count: 'exact' })
      ]);

      // Fetch mood data for trends and distribution
      const { data: moodLogs } = await supabase
        .from('mood_logs')
        .select('mood_level, ai_stress_level, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);

      // Process weekly trends
      const weeklyData = processWeeklyTrends(moodLogs || []);
      const moodDistribution = processMoodDistribution(moodLogs || []);
      const stressLevels = processStressLevels(moodLogs || []);

      setData({
        totalStudents: studentsRes.count || 0,
        totalMoodLogs: moodLogsRes.count || 0,
        totalMessages: messagesRes.count || 0,
        weeklyMoodTrends: weeklyData,
        moodDistribution,
        stressLevels
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processWeeklyTrends = (moodLogs: any[]) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = days.map(day => ({ day, averageMood: 0, count: 0 }));

    const today = new Date();
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentLogs = moodLogs.filter(log => 
      new Date(log.created_at) >= oneWeekAgo
    );

    const dayGroups = recentLogs.reduce((acc, log) => {
      const date = new Date(log.created_at);
      const dayIndex = (date.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
      const dayName = days[dayIndex];
      
      if (!acc[dayName]) acc[dayName] = [];
      acc[dayName].push(parseInt(log.mood_level));
      return acc;
    }, {} as Record<string, number[]>);

    Object.entries(dayGroups).forEach(([day, moods]) => {
      const dayIndex = days.indexOf(day);
      if (dayIndex !== -1) {
        const average = moods.reduce((sum, mood) => sum + mood, 0) / moods.length;
        weekData[dayIndex] = {
          day,
          averageMood: Math.round(average * 100) / 100,
          count: moods.length
        };
      }
    });

    return weekData;
  };

  const processMoodDistribution = (moodLogs: any[]) => {
    const moodLabels = { '1': 'Very Low', '2': 'Low', '3': 'Okay', '4': 'Good', '5': 'Great' };
    const counts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

    moodLogs.forEach(log => {
      if (counts.hasOwnProperty(log.mood_level)) {
        counts[log.mood_level as keyof typeof counts]++;
      }
    });

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return Object.entries(counts).map(([mood, count]) => ({
      mood: moodLabels[mood as keyof typeof moodLabels],
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  };

  const processStressLevels = (moodLogs: any[]) => {
    const stressCounts = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    
    moodLogs
      .filter(log => log.ai_stress_level)
      .forEach(log => {
        const level = log.ai_stress_level.toString();
        if (stressCounts.hasOwnProperty(level)) {
          stressCounts[level as keyof typeof stressCounts]++;
        }
      });

    return Object.entries(stressCounts).map(([level, count]) => ({
      level: `Level ${level}`,
      count
    }));
  };

  if (student?.role !== 'admin') {
    return (
      <Card className="mood-card">
        <CardContent className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Access Denied</h3>
          <p className="text-muted-foreground text-sm">
            This dashboard is only available to administrators.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="mood-card animate-pulse">
              <div className="h-24 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in-up">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Institutional Dashboard</h1>
        <p className="text-muted-foreground">
          Anonymized mental health insights for student wellness
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="mood-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Students</p>
                <p className="text-2xl font-bold">{data?.totalStudents || 0}</p>
              </div>
              <Users className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="mood-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Mood Check-ins</p>
                <p className="text-2xl font-bold">{data?.totalMoodLogs || 0}</p>
              </div>
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="mood-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peer Messages</p>
                <p className="text-2xl font-bold">{data?.totalMessages || 0}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Mood Trends */}
        <Card className="mood-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Weekly Mood Trends
            </CardTitle>
            <CardDescription>
              Average mood levels over the past week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.weeklyMoodTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[1, 5]} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}`, 
                    name === 'averageMood' ? 'Average Mood' : name
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="averageMood" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Mood Distribution */}
        <Card className="mood-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Mood Distribution
            </CardTitle>
            <CardDescription>
              Overall mood levels among students
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.moodDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ mood, percentage }) => `${mood} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(data?.moodDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Stress Levels */}
      <Card className="mood-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI-Detected Stress Levels
          </CardTitle>
          <CardDescription>
            Distribution of stress levels identified by AI analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.stressLevels || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Summary Insights */}
      <Card className="mood-card">
        <CardHeader>
          <CardTitle>Weekly Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">This Week's Observations</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• {data?.totalMoodLogs || 0} mood check-ins completed</p>
                <p>• {data?.totalMessages || 0} peer support messages exchanged</p>
                <p>• Most active day: {
                  data?.weeklyMoodTrends.reduce((max, day) => 
                    day.count > max.count ? day : max, 
                    { day: 'None', count: 0 }
                  ).day || 'None'
                }</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Recommendations</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>• Continue promoting daily check-ins</p>
                <p>• Consider stress management workshops</p>
                <p>• Increase peer support program visibility</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;