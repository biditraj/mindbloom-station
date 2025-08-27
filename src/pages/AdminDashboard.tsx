import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';
import { 
  Users, Brain, TrendingUp, Calendar, AlertTriangle, CheckCircle, 
  RefreshCw, BarChart3, Zap, Activity, Clock, Database, Wifi, WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getWeeklyStressTrends,
  getSentimentDistribution,
  getDailyActivity,
  getStressLevelDistribution,
  getStudentOverview,
  getModelPerformanceMetrics,
  getModelConfidenceDistribution,
  getFeatureImportance,
  type WeeklyStressTrend,
  type SentimentDistribution,
  type DailyActivity,
  type StressLevelDistribution,
  type StudentOverview,
  type ModelPerformanceMetrics,
  type ModelConfidenceDistribution,
  type FeatureImportance
} from '@/lib/analyticsQueries';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Color schemes for charts
const COLORS = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  teal: '#14B8A6'
};

const SENTIMENT_COLORS: Record<string, string> = {
  'positive': COLORS.success,
  'stress detected': COLORS.danger,
  'neutral': COLORS.warning
};

const STRESS_COLORS = [COLORS.success, '#84CC16', COLORS.warning, '#F97316', COLORS.danger];

const AdminDashboard: React.FC = () => {
  // State for analytics data
  const [overview, setOverview] = useState<StudentOverview | null>(null);
  const [weeklyStress, setWeeklyStress] = useState<WeeklyStressTrend[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentDistribution[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [stressDistribution, setStressDistribution] = useState<StressLevelDistribution[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelPerformanceMetrics | null>(null);
  const [confidenceDistribution, setConfidenceDistribution] = useState<ModelConfidenceDistribution[]>([]);
  const [featureImportance, setFeatureImportance] = useState<FeatureImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [newDataCount, setNewDataCount] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Ref for cleanup
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // Enhanced analytics loading with error handling
  const loadAnalytics = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      console.log('📊 Loading enhanced dashboard analytics...');
      
      const startTime = Date.now();
      const [overviewData, weeklyData, sentiments, daily, stressLevels, modelPerf, confidence, features] = await Promise.all([
        getStudentOverview(),
        getWeeklyStressTrends(),
        getSentimentDistribution(),
        getDailyActivity(),
        getStressLevelDistribution(),
        getModelPerformanceMetrics(),
        getModelConfidenceDistribution(),
        getFeatureImportance()
      ]);
      
      const loadTime = Date.now() - startTime;
      console.log(`✅ Dashboard analytics loaded in ${loadTime}ms`);
      
      setOverview(overviewData);
      setWeeklyStress(weeklyData);
      setSentimentData(sentiments);
      setDailyActivity(daily);
      setStressDistribution(stressLevels);
      setModelMetrics(modelPerf);
      setConfidenceDistribution(confidence);
      setFeatureImportance(features);
      setLastUpdated(new Date());

      console.log('📊 Enhanced analytics summary:', {
        totalStudents: overviewData.total_students,
        totalLogs: overviewData.total_mood_logs,
        avgStress: overviewData.avg_stress_level?.toFixed(1),
        modelVersion: modelPerf.modelVersion,
        modelAccuracy: (modelPerf.trainingAccuracy * 100).toFixed(1) + '%'
      });

    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  // Real-time subscription setup
  useEffect(() => {
    if (!autoRefresh) return;
    
    const setupRealtimeSubscription = async () => {
      try {
        console.log('🔄 Setting up real-time dashboard subscriptions...');
        
        // Subscribe to mood_logs changes
        const subscription = supabase
          .channel('dashboard-updates')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'mood_logs'
            },
            (payload) => {
              console.log('🔄 Real-time update received:', payload.eventType);
              setNewDataCount(prev => prev + 1);
              
              // Auto-refresh analytics on new data
              setTimeout(() => {
                loadAnalytics(false);
              }, 1000); // Debounce updates
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public', 
              table: 'recommendations'
            },
            (payload) => {
              console.log('📋 Recommendation update:', payload.eventType);
            }
          )
          .subscribe((status) => {
            console.log('📡 Subscription status:', status);
            setIsRealTimeConnected(status === 'SUBSCRIBED');
          });
        
        subscriptionRef.current = subscription;
      } catch (error) {
        console.error('❌ Error setting up real-time subscription:', error);
        setIsRealTimeConnected(false);
      }
    };
    
    setupRealtimeSubscription();
    
    // Cleanup subscription
    return () => {
      if (subscriptionRef.current) {
        console.log('🗚 Cleaning up real-time subscription');
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [autoRefresh, loadAnalytics]);

  // Initial load
  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Format week for display
  const formatWeek = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 h-full flex items-center justify-center">
          <motion.div 
            className="flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center space-x-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </motion.div>
              <div>
                <div className="text-xl font-semibold text-gray-700">Loading Analytics...</div>
                <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <Database className="h-4 w-4" />
                  Fetching real-time data
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <motion.div 
        className="p-6 bg-white/80 backdrop-blur-sm overflow-auto h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Enhanced Header */}
        <motion.div 
          className="flex justify-between items-start"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </motion.div>
              Institutional Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              Mental health analytics and insights powered by enhanced AI
            </p>
            <div className="flex items-center gap-4 mt-3">
              <Badge variant={isRealTimeConnected ? "default" : "destructive"} className="flex items-center gap-1">
                {isRealTimeConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isRealTimeConnected ? 'Real-time Connected' : 'Offline Mode'}
              </Badge>
              {newDataCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-1 text-sm text-blue-600"
                >
                  <Activity className="h-4 w-4 animate-pulse" />
                  {newDataCount} new update{newDataCount > 1 ? 's' : ''}
                </motion.div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-3">
            <div className="flex items-center space-x-3">
              {lastUpdated && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-1" />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={autoRefresh ? 'border-green-300 text-green-700' : 'border-gray-300'}
                >
                  <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
                  Auto-refresh
                </Button>
                <Button onClick={() => loadAnalytics()} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Overview Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Students</p>
                    <motion.p 
                      className="text-3xl font-bold text-blue-900"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3, type: "spring" }}
                    >
                      {overview?.total_students || 0}
                    </motion.p>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Users className="h-10 w-10 text-blue-600" />
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Active This Week</p>
                    <motion.p 
                      className="text-3xl font-bold text-green-900"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                    >
                      {overview?.active_students_7_days || 0}
                    </motion.p>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </motion.div>
                </div>
                {overview && overview.total_students > 0 && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {((overview.active_students_7_days / overview.total_students) * 100).toFixed(1)}% engagement
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-600 text-sm font-medium">Total Mood Logs</p>
                    <motion.p 
                      className="text-3xl font-bold text-purple-900"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: "spring" }}
                    >
                      {overview?.total_mood_logs || 0}
                    </motion.p>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Brain className="h-10 w-10 text-purple-600" />
                  </motion.div>
                </div>
                {overview && overview.total_students > 0 && (
                  <div className="mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {(overview.total_mood_logs / overview.total_students).toFixed(1)} avg per student
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card className={`bg-gradient-to-br border-2 shadow-lg hover:shadow-xl transition-shadow ${
              (overview?.avg_stress_level || 0) <= 2 
                ? 'from-green-50 to-green-100 border-green-200'
                : (overview?.avg_stress_level || 0) <= 3
                ? 'from-yellow-50 to-yellow-100 border-yellow-200' 
                : 'from-red-50 to-red-100 border-red-200'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${
                      (overview?.avg_stress_level || 0) <= 2 ? 'text-green-600'
                      : (overview?.avg_stress_level || 0) <= 3 ? 'text-yellow-600'
                      : 'text-red-600'
                    }`}>
                      Average Stress Level
                    </p>
                    <motion.p 
                      className={`text-3xl font-bold ${
                        (overview?.avg_stress_level || 0) <= 2 ? 'text-green-900'
                        : (overview?.avg_stress_level || 0) <= 3 ? 'text-yellow-900'
                        : 'text-red-900'
                      }`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6, type: "spring" }}
                    >
                      {overview?.avg_stress_level?.toFixed(1) || '0.0'}/5
                    </motion.p>
                  </div>
                  <motion.div
                    whileHover={{ rotate: 10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <AlertTriangle className={`h-10 w-10 ${
                      (overview?.avg_stress_level || 0) <= 2 ? 'text-green-600'
                      : (overview?.avg_stress_level || 0) <= 3 ? 'text-yellow-600'
                      : 'text-red-600'
                    }`} />
                  </motion.div>
                </div>
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div 
                      className={`h-2 rounded-full ${
                        (overview?.avg_stress_level || 0) <= 2 ? 'bg-green-500'
                        : (overview?.avg_stress_level || 0) <= 3 ? 'bg-yellow-500'
                        : 'bg-red-500'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${((overview?.avg_stress_level || 0) / 5) * 100}%` }}
                      transition={{ delay: 0.8, duration: 1 }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Enhanced Analytics Tabs */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Tabs defaultValue="trends" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg border-2 border-blue-100">
              <TabsTrigger value="trends" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                Stress Trends
              </TabsTrigger>
              <TabsTrigger value="sentiment" className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700">
                <Brain className="h-4 w-4 mr-2" />
                Sentiment Analysis
              </TabsTrigger>
              <TabsTrigger value="activity" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                <Calendar className="h-4 w-4 mr-2" />
                Activity Patterns
              </TabsTrigger>
              <TabsTrigger value="distribution" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-700">
                <BarChart3 className="h-4 w-4 mr-2" />
                Stress Distribution
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trends">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="shadow-lg border-2 border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <TrendingUp className="h-6 w-6 text-blue-600" />
                      Weekly Stress Trends
                      <Badge variant="secondary" className="ml-auto">
                        {weeklyStress.length} weeks
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Average stress levels over the past 12 weeks with enhanced AI analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyStress}>
                          <defs>
                            <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                          <XAxis 
                            dataKey="week" 
                            tickFormatter={formatWeek}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            stroke="#64748b"
                          />
                          <YAxis domain={[1, 5]} stroke="#64748b" />
                          <Tooltip 
                            labelFormatter={(value) => `Week of ${formatWeek(String(value))}`}
                            contentStyle={{ 
                              backgroundColor: '#f8fafc', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="avg_stress" 
                            stroke={COLORS.primary} 
                            strokeWidth={3}
                            fill="url(#stressGradient)"
                            dot={{ fill: COLORS.primary, strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: COLORS.primary, strokeWidth: 2 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            <TabsContent value="sentiment">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                <Card className="shadow-lg border-2 border-purple-100">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-purple-600" />
                      Sentiment Distribution
                      <Badge variant="secondary" className="ml-auto">
                        {sentimentData.reduce((sum, item) => sum + item.count, 0)} total
                      </Badge>
                    </CardTitle>
                    <CardDescription>AI-detected sentiments from mood analysis</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sentimentData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry) => `${entry.ai_sentiment}: ${entry.percentage}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                          >
                            {sentimentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.ai_sentiment] || COLORS.primary} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name) => [value, 'Count']}
                            contentStyle={{ 
                              backgroundColor: '#f8fafc', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-2 border-purple-100">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      Sentiment Statistics
                    </CardTitle>
                    <CardDescription>Detailed sentiment metrics and insights</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <AnimatePresence>
                        {sentimentData.map((sentiment, index) => (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center space-x-3">
                              <motion.div 
                                className="w-5 h-5 rounded-full" 
                                style={{ backgroundColor: SENTIMENT_COLORS[sentiment.ai_sentiment] || COLORS.primary }}
                                whileHover={{ scale: 1.2 }}
                              />
                              <span className="font-medium capitalize text-gray-800">{sentiment.ai_sentiment}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                {sentiment.count} logs
                              </Badge>
                              <Badge variant="outline" className="border-purple-300 text-purple-700">
                                {sentiment.percentage}%
                              </Badge>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Daily Activity Heatmap
                </CardTitle>
                <CardDescription>
                  Check-in frequency and average mood over the past 30 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="day" 
                        tickFormatter={formatDate}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" domain={[1, 5]} />
                      <Tooltip 
                        labelFormatter={(value) => `Date: ${formatDate(String(value))}`}
                      />
                      <Bar yAxisId="left" dataKey="count" fill={COLORS.primary} name="Check-ins" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution">
            <Card>
              <CardHeader>
                <CardTitle>Stress Level Distribution</CardTitle>
                <CardDescription>
                  Distribution of AI-assessed stress levels (1 = Very Low, 5 = Very High)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stressDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="ai_stress_level" 
                        tickFormatter={(value) => `Level ${value}`}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" name="count">
                        {stressDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={STRESS_COLORS[index] || COLORS.primary} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {stressDistribution.map((level, index) => (
                    <div key={index} className="text-center p-2 bg-gray-50 rounded">
                      <div className="text-lg font-bold" style={{ color: STRESS_COLORS[index] }}>
                        {level.count}
                      </div>
                      <div className="text-xs text-gray-600">Level {level.ai_stress_level}</div>
                      <div className="text-xs text-gray-500">{level.percentage}%</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </motion.div>
    </Layout>
  );
};

export default AdminDashboard;