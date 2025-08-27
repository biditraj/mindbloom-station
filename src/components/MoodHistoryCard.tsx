import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Smile, Meh, Frown, Sun, Brain, Activity, Video, BookOpen, Wind,
  Calendar, MessageSquare, TrendingUp, ExternalLink
} from 'lucide-react';
import { MoodLogWithRecommendations } from '@/hooks/useMoodHistory';
import { motion } from 'framer-motion';

interface MoodHistoryCardProps {
  moodLog: MoodLogWithRecommendations;
  index: number;
}

const moodConfig = {
  '1': { emoji: '😭', icon: Frown, label: 'Devastated', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  '2': { emoji: '😰', icon: Frown, label: 'Stressed / Sad', color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-50' },
  '3': { emoji: '😐', icon: Meh, label: 'Neutral / Worried', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  '4': { emoji: '😊', icon: Smile, label: 'Happy / Content', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  '5': { emoji: '🤩', icon: Sun, label: 'Excited / Euphoric', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' }
};

const stressLevelConfig = {
  1: { label: 'Very Low', color: 'bg-green-500' },
  2: { label: 'Low', color: 'bg-lime-500' },
  3: { label: 'Moderate', color: 'bg-yellow-500' },
  4: { label: 'High', color: 'bg-orange-500' },
  5: { label: 'Very High', color: 'bg-red-500' }
};

const recommendationIcons = {
  breathing: Wind,
  mindfulness: Brain,
  activity: Activity,
  video: Video,
  article: BookOpen
};

const MoodHistoryCard: React.FC<MoodHistoryCardProps> = ({ moodLog, index }) => {
  const mood = moodConfig[moodLog.mood_level];
  const MoodIcon = mood.icon;
  const formattedDate = new Date(moodLog.created_at).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = new Date(moodLog.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
    >
      <Card className={`${mood.bgLight} border-l-4 border-l-current ${mood.textColor} hover:shadow-lg transition-all duration-200`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full ${mood.color} flex items-center justify-center text-white`}>
                <MoodIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {mood.emoji} Feeling {mood.label}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate} at {formattedTime}</span>
                </div>
              </div>
            </div>
            <Badge variant="outline" className={mood.color + ' text-white border-transparent'}>
              Mood Level {moodLog.mood_level}/5
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* User Note */}
          {moodLog.note && (
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Your Note:</p>
                  <p className="text-sm">{moodLog.note}</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Analysis */}
          {(moodLog.ai_sentiment || moodLog.ai_stress_level) && (
            <div className="bg-white/50 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Brain className="w-4 h-4 mt-0.5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-2">AI Analysis:</p>
                  <div className="space-y-2">
                    {moodLog.ai_sentiment && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Sentiment:</p>
                        <p className="text-sm bg-purple-50 p-2 rounded text-purple-900">
                          {moodLog.ai_sentiment}
                        </p>
                      </div>
                    )}
                    {moodLog.ai_stress_level && (
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Stress Level:</span>
                        <Badge 
                          variant="outline" 
                          className={`${stressLevelConfig[moodLog.ai_stress_level as keyof typeof stressLevelConfig]?.color} text-white border-transparent text-xs`}
                        >
                          {stressLevelConfig[moodLog.ai_stress_level as keyof typeof stressLevelConfig]?.label || 'Unknown'} ({moodLog.ai_stress_level}/5)
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {moodLog.recommendations && moodLog.recommendations.length > 0 && (
            <div className="bg-white/50 p-3 rounded-lg">
              <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Personalized Recommendations:
              </p>
              <div className="space-y-2">
                {moodLog.recommendations.map((rec) => {
                  const RecIcon = recommendationIcons[rec.type] || Activity;
                  return (
                    <div key={rec.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                      <RecIcon className="w-4 h-4 mt-0.5 text-blue-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{rec.title}</p>
                        {rec.description && (
                          <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {rec.type}
                          </Badge>
                          {rec.content_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => window.open(rec.content_url!, '_blank')}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MoodHistoryCard;