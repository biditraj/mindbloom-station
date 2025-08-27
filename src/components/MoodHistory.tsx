import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import useMoodHistory from '@/hooks/useMoodHistory';
import MoodHistoryCard from '@/components/MoodHistoryCard';
import { 
  History, Filter, BarChart3, TrendingUp, Calendar, 
  RefreshCw, Smile, Brain, AlertCircle, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MoodHistory: React.FC = () => {
  const { 
    moodLogs, 
    loading, 
    error, 
    filters, 
    statistics, 
    updateFilters, 
    refreshHistory 
  } = useMoodHistory();

  const [showStats, setShowStats] = useState(true);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </CardHeader>
        </Card>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button size="sm" variant="outline" onClick={refreshHistory}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <History className="w-6 h-6 text-primary" />
                Your Mood History
              </CardTitle>
              <CardDescription>
                Track your emotional journey and see your progress over time
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                {showStats ? 'Hide Stats' : 'Show Stats'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshHistory}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics Panel */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Your Mood Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{statistics.totalEntries}</div>
                    <div className="text-sm text-muted-foreground">Total Entries</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{statistics.averageMood}</div>
                    <div className="text-sm text-muted-foreground">Average Mood</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{statistics.averageStress}</div>
                    <div className="text-sm text-muted-foreground">Average Stress</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{statistics.mostCommonMood}</div>
                    <div className="text-sm text-muted-foreground">Most Common Mood</div>
                  </div>
                </div>

                {/* Weekly Trend */}
                {statistics.weeklyTrend.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Weekly Trend
                    </h4>
                    <div className="flex items-end gap-2 h-32 bg-gray-50 p-4 rounded-lg overflow-x-auto">
                      {statistics.weeklyTrend.map((day, index) => (
                        <div key={day.date} className="flex flex-col items-center min-w-[60px]">
                          <div 
                            className="bg-blue-500 rounded-t w-8 mb-1 transition-all duration-300"
                            style={{ 
                              height: `${(day.mood / 5) * 80}px`,
                              minHeight: '4px'
                            }}
                          />
                          <div className="text-xs text-center">
                            <div className="font-medium">{day.mood}</div>
                            <div className="text-muted-foreground">
                              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5" />
            Filter & Sort
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Range</label>
              <Select 
                value={filters.dateRange} 
                onValueChange={(value: any) => updateFilters({ dateRange: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Mood Level</label>
              <Select 
                value={filters.moodLevel} 
                onValueChange={(value: any) => updateFilters({ moodLevel: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  <SelectItem value="5">🤩 Euphoric</SelectItem>
                  <SelectItem value="5">😄 Excited</SelectItem>
                  <SelectItem value="4">😊 Happy</SelectItem>
                  <SelectItem value="4">😌 Content</SelectItem>
                  <SelectItem value="3">😐 Neutral</SelectItem>
                  <SelectItem value="3">😟 Worried</SelectItem>
                  <SelectItem value="2">😢 Sad</SelectItem>
                  <SelectItem value="2">😰 Stressed</SelectItem>
                  <SelectItem value="1">😭 Devastated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort By</label>
              <Select 
                value={filters.sortBy} 
                onValueChange={(value: any) => updateFilters({ sortBy: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="mood_desc">Highest Mood First</SelectItem>
                  <SelectItem value="mood_asc">Lowest Mood First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {moodLogs.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          Showing {moodLogs.length} mood {moodLogs.length === 1 ? 'entry' : 'entries'}
          {filters.dateRange !== 'all' && ` from ${filters.dateRange}`}
          {filters.moodLevel !== 'all' && ` with mood level ${filters.moodLevel}`}
        </div>
      )}

      {/* Mood Logs */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {moodLogs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="text-center py-12">
                <CardContent>
                  <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No mood entries found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.dateRange !== 'all' || filters.moodLevel !== 'all'
                      ? 'Try adjusting your filters to see more entries.'
                      : 'Start by logging your first mood to see it appear here.'}
                  </p>
                  {filters.dateRange !== 'all' || filters.moodLevel !== 'all' ? (
                    <Button 
                      variant="outline" 
                      onClick={() => updateFilters({ dateRange: 'all', moodLevel: 'all' })}
                    >
                      Clear Filters
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            moodLogs.map((moodLog, index) => (
              <MoodHistoryCard 
                key={moodLog.id} 
                moodLog={moodLog} 
                index={index} 
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MoodHistory;