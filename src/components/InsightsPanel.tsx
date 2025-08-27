import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Brain, Play, BookOpen, Activity, ExternalLink, Sparkles, Zap, Video, Wind, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { type PredictionResult, getRecommendationMapping } from '@/lib/moodModel';

interface InsightsPanelProps {
  latestAiAnalysis?: PredictionResult | null;
  selectedMood?: string | null;
}

// Enhanced recommendations mapping with icons
interface EnhancedRecommendation {
  title: string;
  description: string;
  content_url?: string;
  type: 'breathing' | 'mindfulness' | 'activity' | 'video' | 'article';
  icon: React.ComponentType<any>;
  color: string;
  urgency: 'low' | 'medium' | 'high';
}

const getEnhancedRecommendationForStressLevel = (stressLevel: number): EnhancedRecommendation => {
  const mapping = getRecommendationMapping(stressLevel);
  const iconMap = {
    video: Video,
    breathing: Wind,
    mindfulness: Brain,
    activity: Activity,
    article: BookOpen
  };
  
  const colorMap = {
    1: 'from-green-50 to-emerald-50 border-green-200',
    2: 'from-green-50 to-emerald-50 border-green-200', 
    3: 'from-yellow-50 to-orange-50 border-yellow-200',
    4: 'from-orange-50 to-red-50 border-orange-200',
    5: 'from-red-50 to-red-100 border-red-300'
  };
  
  return {
    ...mapping.recommendation,
    type: mapping.recommendation.type,
    icon: iconMap[mapping.recommendation.type] || Brain,
    color: colorMap[stressLevel as keyof typeof colorMap] || colorMap[3],
    urgency: stressLevel <= 2 ? 'low' : stressLevel === 3 ? 'medium' : 'high'
  };
};


const InsightsPanel: React.FC<InsightsPanelProps> = ({ latestAiAnalysis, selectedMood }) => {
  const [enhancedRecommendation, setEnhancedRecommendation] = useState<EnhancedRecommendation | null>(null);
  const { student } = useAuth();
  const isMobile = useIsMobile();

  // Update enhanced recommendation when latest AI analysis changes
  useEffect(() => {
    if (latestAiAnalysis) {
      const recommendation = getEnhancedRecommendationForStressLevel(latestAiAnalysis.stressLevel);
      setEnhancedRecommendation(recommendation);
    }
  }, [latestAiAnalysis]);


  if (!latestAiAnalysis) {
    return (
      <div className="space-y-4">
        <Card className="mood-card">
          <CardContent className={`text-center ${isMobile ? 'py-6 px-4' : 'py-8'}`}>
            <Brain className={`text-muted-foreground mx-auto mb-4 ${isMobile ? 'h-10 w-10' : 'h-12 w-12'}`} />
            <h3 className={`font-medium mb-2 ${isMobile ? 'text-sm' : ''}`}>No insights available yet</h3>
            <p className={`text-muted-foreground mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              To get personalized insights and AI-powered recommendations, you need to:
            </p>
            <div className={`space-y-2 text-left max-w-md mx-auto ${isMobile ? 'text-xs' : 'text-sm'}`}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Log your first mood using the Mood Check-in page</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Share some details about how you're feeling</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Get AI-powered insights and personalized recommendations</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Sample insights preview */}
        <Card className="mood-card border-dashed border-gray-300">
          <CardHeader className={isMobile ? 'pb-3' : ''}>
            <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Preview: What You'll Get
            </CardTitle>
            <CardDescription className={isMobile ? 'text-xs' : ''}>
              Here's an example of the insights you'll receive once you start logging your mood
            </CardDescription>
          </CardHeader>
          <CardContent className={isMobile ? 'pt-0' : ''}>
            <div className={`grid gap-4 mb-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <div className={`bg-gray-50 rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className={`text-gray-600 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Sentiment Analysis</div>
                <div className={`font-bold text-green-700 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                  😊 <span>Positive</span>
                </div>
              </div>
              <div className={`bg-gray-50 rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}>
                <div className={`text-gray-600 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Stress Level</div>
                <div className={`font-bold text-blue-700 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                  <Zap className="h-5 w-5" />
                  2/5
                </div>
              </div>
            </div>
            <div className={`bg-gray-50 rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}>
              <div className={`text-gray-700 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                💡 <strong>Personalized recommendations</strong> like guided meditations, breathing exercises, or motivational content based on your mood patterns.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 fade-in-up">
      {/* Enhanced AI Analysis Display */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg mood-card">
          <CardContent className={`${isMobile ? 'pt-3 px-4' : 'pt-4'}`}>
            <div className={`flex items-center gap-2 mb-4 ${isMobile ? 'flex-wrap' : ''}`}>
              <Brain className="h-6 w-6 text-blue-600" />
              <span className={`font-bold text-blue-800 ${isMobile ? 'text-base' : 'text-lg'}`}>Enhanced AI Analysis</span>
              <Sparkles className="h-5 w-5 text-purple-600" />
              <Badge variant="secondary" className={`${isMobile ? 'ml-0 mt-1' : 'ml-auto'} text-xs`}>
                v4.0
              </Badge>
            </div>
            <div className="space-y-4">
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className={`bg-white rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}>
                  <div className={`text-gray-600 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Sentiment Analysis</div>
                  <div className={`font-bold flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'} ${
                    latestAiAnalysis.sentiment.includes('positive') 
                      ? 'text-green-700' 
                      : latestAiAnalysis.sentiment.includes('stress') 
                      ? 'text-red-700'
                      : 'text-yellow-700'
                  }`}>
                    {latestAiAnalysis.sentiment.includes('positive') && '😊'}
                    {latestAiAnalysis.sentiment.includes('stress') && '⚠️'}
                    {!latestAiAnalysis.sentiment.includes('positive') && !latestAiAnalysis.sentiment.includes('stress') && '😐'}
                    <span className="capitalize">{latestAiAnalysis.sentiment}</span>
                  </div>
                  {latestAiAnalysis.sentimentPolarity !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      Polarity: {latestAiAnalysis.sentimentPolarity.toFixed(2)}
                    </div>
                  )}
                </div>
                <div className={`bg-white rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}>
                  <div className={`text-gray-600 mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>Stress Level</div>
                  <div className={`font-bold text-blue-700 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    <Zap className="h-5 w-5" />
                    {latestAiAnalysis.stressLevel}/5
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Confidence: {(latestAiAnalysis.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              
              {/* Enhanced Model Performance Display */}
              {latestAiAnalysis.modelAccuracy && (
                <div className={`bg-white rounded-lg border ${isMobile ? 'p-2' : 'p-3'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Model Performance</div>
                    <Badge variant="outline" className="text-xs">
                      Enhanced AI v4.0
                    </Badge>
                  </div>
                  <div className={`grid gap-4 ${isMobile ? 'grid-cols-1 text-xs' : 'grid-cols-2 text-sm'}`}>
                    <div>
                      <div className="text-gray-500">Model Accuracy</div>
                      <div className="font-semibold text-green-700">
                        {(latestAiAnalysis.modelAccuracy * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">Prediction Confidence</div>
                      <div className="font-semibold text-blue-700">
                        {(latestAiAnalysis.confidence * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <div className={`flex justify-between text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  <span>Stress Level Visualization</span>
                  <span>{latestAiAnalysis.stressLevel === 1 ? 'Very Low' : latestAiAnalysis.stressLevel === 2 ? 'Low' : latestAiAnalysis.stressLevel === 3 ? 'Moderate' : latestAiAnalysis.stressLevel === 4 ? 'High' : 'Very High'}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    className={`h-3 rounded-full transition-all duration-1000 ${
                      latestAiAnalysis.stressLevel <= 2 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                      latestAiAnalysis.stressLevel <= 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                      'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(latestAiAnalysis.stressLevel / 5) * 100}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>
              </div>
              
              <motion.div 
                className={`bg-white rounded-lg border-l-4 border-blue-400 ${isMobile ? 'p-2' : 'p-3'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <p className={`text-gray-700 leading-relaxed ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {latestAiAnalysis.sentiment.includes('positive') 
                    ? 'Great! Your mood analysis shows positive indicators. Your mental state appears balanced and healthy. Keep maintaining these good vibes!' 
                    : latestAiAnalysis.stressLevel >= 4
                    ? 'I notice significant stress indicators in your input. This suggests you might benefit from stress-reduction techniques or reaching out for support.'
                    : 'Your mood shows some mixed signals. Consider taking time for self-care and mindfulness practices to maintain emotional balance.'}
                </p>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Personalized Recommendation */}
      {enhancedRecommendation && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <Card className={`bg-gradient-to-r ${enhancedRecommendation.color} shadow-lg border-2 mood-card`}>
            <CardContent className={`${isMobile ? 'pt-3 px-4' : 'pt-4'}`}>
              <div className={`flex items-center gap-2 mb-4 ${isMobile ? 'flex-wrap' : ''}`}>
                <enhancedRecommendation.icon className="h-6 w-6 text-green-600" />
                <span className={`font-bold text-green-800 ${isMobile ? 'text-base' : 'text-lg'}`}>Personalized Recommendation</span>
                <Badge variant={enhancedRecommendation.urgency === 'high' ? 'destructive' : enhancedRecommendation.urgency === 'medium' ? 'default' : 'secondary'} className={`${isMobile ? 'ml-0 mt-1' : 'ml-auto'} text-xs`}>
                  {enhancedRecommendation.urgency} priority
                </Badge>
              </div>
              <div className="space-y-4">
                <div className={`bg-white rounded-lg border ${isMobile ? 'p-3' : 'p-4'}`}>
                  <h4 className={`font-bold text-gray-900 mb-2 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                    <Sparkles className="h-5 w-5 text-yellow-500" />
                    {enhancedRecommendation.title}
                  </h4>
                  <p className={`text-gray-700 leading-relaxed mb-3 ${isMobile ? 'text-sm' : ''}`}>{enhancedRecommendation.description}</p>
                  <div className={`flex items-center gap-2 text-gray-600 ${isMobile ? 'text-xs flex-wrap' : 'text-sm'}`}>
                    <Badge variant="outline">{enhancedRecommendation.type}</Badge>
                    <span className="text-xs">•</span>
                    <span>Recommended for stress level {latestAiAnalysis.stressLevel}</span>
                  </div>
                </div>
                {enhancedRecommendation.content_url && (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="default"
                      size={isMobile ? "default" : "lg"}
                      className={`w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg ${isMobile ? 'py-2 text-sm' : ''}`}
                      onClick={() => {
                        if (enhancedRecommendation.content_url?.startsWith('http')) {
                          window.open(enhancedRecommendation.content_url, '_blank');
                        } else {
                          window.location.href = enhancedRecommendation.content_url!;
                        }
                      }}
                    >
                      <enhancedRecommendation.icon className="h-5 w-5 mr-2" />
                      Start Recommended Activity
                      <Zap className="h-4 w-4 ml-2" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default InsightsPanel;