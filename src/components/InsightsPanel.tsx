import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, Play, BookOpen, Activity, ExternalLink, Sparkles } from 'lucide-react';

interface MoodLog {
  id: string;
  mood_level: string;
  ai_sentiment: string | null;
  ai_stress_level: number | null;
  created_at: string;
}

interface Recommendation {
  id: string;
  title: string;
  description: string;
  content_url: string;
  type: 'breathing' | 'mindfulness' | 'activity' | 'video' | 'article';
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'breathing': return <Activity className="h-4 w-4" />;
    case 'mindfulness': return <Brain className="h-4 w-4" />;
    case 'activity': return <Play className="h-4 w-4" />;
    case 'video': return <Play className="h-4 w-4" />;
    case 'article': return <BookOpen className="h-4 w-4" />;
    default: return <Sparkles className="h-4 w-4" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'breathing': return 'bg-blue-100 text-blue-800';
    case 'mindfulness': return 'bg-purple-100 text-purple-800';
    case 'activity': return 'bg-green-100 text-green-800';
    case 'video': return 'bg-red-100 text-red-800';
    case 'article': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const InsightsPanel: React.FC = () => {
  const [recentMood, setRecentMood] = useState<MoodLog | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { student } = useAuth();

  useEffect(() => {
    if (student) {
      fetchInsights();
    }
  }, [student]);

  const fetchInsights = async () => {
    if (!student) return;

    try {
      // Fetch most recent mood log
      const { data: moodData, error: moodError } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (moodError && moodError.code !== 'PGRST116') {
        console.error('Error fetching mood:', moodError);
      } else if (moodData) {
        setRecentMood(moodData);

        // Fetch recommendations for this mood log
        const { data: recData, error: recError } = await supabase
          .from('recommendations')
          .select('*')
          .eq('mood_log_id', moodData.id);

        if (recError) {
          console.error('Error fetching recommendations:', recError);
        } else if (recData && recData.length > 0) {
          setRecommendations(recData);
        } else {
          // Fetch general recommendations based on mood level
          const { data: generalRecs } = await supabase
            .from('recommendations')
            .select('*')
            .is('mood_log_id', null)
            .limit(3);
          
          if (generalRecs) {
            setRecommendations(generalRecs);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchInsights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentMessage = (mood: MoodLog) => {
    const level = parseInt(mood.mood_level);
    if (mood.ai_sentiment) {
      return mood.ai_sentiment;
    }
    
    // Fallback messages based on mood level
    if (level <= 2) {
      return "You seem to be going through a tough time. Remember, it's okay to not be okay.";
    } else if (level === 3) {
      return "You're managing okay today. Consider some self-care activities.";
    } else {
      return "You're feeling positive today! Keep up the good energy.";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="mood-card animate-pulse">
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!recentMood) {
    return (
      <Card className="mood-card">
        <CardContent className="text-center py-8">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">No insights yet</h3>
          <p className="text-muted-foreground text-sm">
            Log your first mood to get personalized insights and recommendations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 fade-in-up">
      {/* AI Insights */}
      <Card className="mood-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-secondary/20 rounded-lg">
              <p className="text-sm mb-2">{getSentimentMessage(recentMood)}</p>
              {recentMood.ai_stress_level && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Stress Level:</span>
                  <Badge variant="outline">{recentMood.ai_stress_level}/5</Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="mood-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Recommended for You
            </CardTitle>
            <CardDescription>
              Personalized activities to help boost your mood
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.id}
                  className="slide-in-right p-4 border border-border rounded-lg hover:bg-secondary/10 transition-colors"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      {getTypeIcon(rec.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{rec.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={getTypeColor(rec.type)}
                      >
                        {rec.type}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(rec.content_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InsightsPanel;