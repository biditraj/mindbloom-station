import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Smile, Meh, Frown, Heart, Sun, Brain, Sparkles, Video, Wind, MessageCircle, 
  Zap, Activity, BookOpen, TrendingUp 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  predictMood, 
  trainModel, 
  getRecommendationMapping, 
  getModelStatus,
  type RecommendationMapping,
  type PredictionResult
} from '@/lib/moodModel';

const moodEmojis = [
  { level: '1', emoji: '😢', icon: Frown, label: 'Very Low', color: 'text-red-500' },
  { level: '2', emoji: '😕', icon: Frown, label: 'Low', color: 'text-orange-500' },
  { level: '3', emoji: '😐', icon: Meh, label: 'Okay', color: 'text-yellow-500' },
  { level: '4', emoji: '😊', icon: Smile, label: 'Good', color: 'text-green-500' },
  { level: '5', emoji: '😄', icon: Sun, label: 'Great', color: 'text-emerald-500' }
];

interface MoodTrackerProps {
  onMoodLogged?: () => void;
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
  
  // Map types directly since all are now database compatible
  const dbCompatibleType = mapping.recommendation.type;
  
  return {
    ...mapping.recommendation,
    type: dbCompatibleType,
    icon: iconMap[dbCompatibleType] || Brain,
    color: colorMap[stressLevel as keyof typeof colorMap] || colorMap[3],
    urgency: stressLevel <= 2 ? 'low' : stressLevel === 3 ? 'medium' : 'high'
  };
};

const MoodTracker: React.FC<MoodTrackerProps> = ({ onMoodLogged }) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState<ReturnType<typeof getModelStatus> | null>(null);
  const [aiResult, setAiResult] = useState<PredictionResult | null>(null);
  const [showAiResult, setShowAiResult] = useState(false);
  const [recommendation, setRecommendation] = useState<EnhancedRecommendation | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const { student } = useAuth();
  const { toast } = useToast();

  // Load model status on component mount
  useEffect(() => {
    const loadModelStatus = async (): Promise<void> => {
      try {
        const status = getModelStatus();
        setModelStatus(status);
        if (process.env.NODE_ENV === 'development') {
          console.log('🎯 Model Status:', status);
        }
      } catch (error) {
        console.error('Error loading model status:', error);
      }
    };
    loadModelStatus();
  }, []);

  const handleSubmit = async () => {
    if (!selectedMood) {
      toast({
        title: "Please select your mood",
        description: "Choose a mood level from 1 to 5 to continue",
        variant: "destructive"
      });
      return;
    }

    if (!student) {
      toast({
        title: "Please log in first",
        description: "Authentication required to save mood data",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setAiResult(null);
      setShowAiResult(false);
      setRecommendation(null);
      setAnalysisProgress(0);

      if (process.env.NODE_ENV === 'development') {
        console.log('🧠 Starting enhanced TensorFlow.js mood analysis...');
      }
      
      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Train model and predict mood using enhanced TensorFlow.js
      if (process.env.NODE_ENV === 'development') {
        console.log('🏋️ Ensuring model is trained...');
      }
      await trainModel();
      setAnalysisProgress(50);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔮 Making enhanced prediction...');
      }
      const prediction = await predictMood(note.trim(), selectedMood);
      setAnalysisProgress(80);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Enhanced AI Analysis Result:', prediction);
      }
      setAiResult(prediction);

      // Generate enhanced recommendation based on stress level
      const enhancedRecommendation = getEnhancedRecommendationForStressLevel(prediction.stressLevel);
      setRecommendation(enhancedRecommendation);
      setAnalysisProgress(100);
      
      clearInterval(progressInterval);

      // Insert mood log with enhanced AI results
      const { data: moodLogData, error: moodLogError } = await supabase
        .from('mood_logs')
        .insert({
          student_id: student.id,
          mood_level: selectedMood as "1" | "2" | "3" | "4" | "5",
          note: note.trim() || null,
          ai_sentiment: prediction.sentiment,
          ai_stress_level: prediction.stressLevel
        })
        .select()
        .single();

      if (moodLogError) throw moodLogError;

      // Insert enhanced recommendation into Supabase
      const { error: recommendationError } = await supabase
        .from('recommendations')
        .insert({
          mood_log_id: moodLogData.id,
          title: enhancedRecommendation.title,
          description: enhancedRecommendation.description,
          content_url: enhancedRecommendation.content_url,
          type: enhancedRecommendation.type
        });

      if (recommendationError) {
        console.warn('Failed to save recommendation:', recommendationError);
      }

      // Show AI result with smooth animation
      setTimeout(() => setShowAiResult(true), 100);

      // Also call the existing edge function for additional analysis
      try {
        await supabase.functions.invoke('analyze-mood', {
          body: { 
            mood_log_id: moodLogData.id,
            mood_level: selectedMood,
            note: note.trim() || null
          }
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Edge function analysis completed');
        }
      } catch (edgeFunctionError) {
        console.warn('⚠️ Edge function failed, but local AI analysis succeeded:', edgeFunctionError);
      }

      toast({
        title: "Mood logged successfully! 🎉",
        description: `AI analysis completed with ${prediction.sentiment} sentiment and personalized recommendations.`
      });

      // Reset form after showing results
      setTimeout(() => {
        setSelectedMood(null);
        setNote('');
        setAiResult(null);
        setShowAiResult(false);
        setRecommendation(null);
        setAnalysisProgress(0);
        
        // Notify parent component
        onMoodLogged?.();
      }, 10000); // Extended time to show enhanced results

    } catch (error) {
      console.error('❌ Error logging mood:', error);
      toast({
        title: "Failed to log mood",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="mood-card shadow-lg border-2 border-blue-100">
        <CardHeader className="text-center bg-gradient-to-r from-blue-50 to-purple-50">
          <CardTitle className="flex items-center justify-center gap-2 text-xl">
            <Heart className="h-7 w-7 text-red-500 animate-pulse" />
            How are you feeling today?
          </CardTitle>
          <CardDescription className="text-gray-600">
            Your daily check-in helps us understand your wellbeing with AI-powered insights
          </CardDescription>
          {modelStatus && (
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant={modelStatus.isModelPersisted ? "default" : "secondary"} className="text-xs">
                🧠 Model v{modelStatus.modelVersion || 'Loading'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                📊 {modelStatus.trainingDataSize} examples
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Mood Selection */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-center flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Select your mood level
            </h3>
            <div className="flex justify-center gap-3 flex-wrap">
              {moodEmojis.map((mood, index) => (
                <motion.button
                  key={mood.level}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedMood(mood.level)}
                  className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                    selectedMood === mood.level
                      ? 'border-primary bg-primary/10 shadow-lg ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50 hover:shadow-md'
                  }`}
                >
                  <div className="text-center space-y-2">
                    <div className="text-3xl">{mood.emoji}</div>
                    <div className={`text-xs font-medium ${mood.color}`}>
                      {mood.label}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Optional Note */}
          <motion.div 
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              How are you feeling? Share your thoughts... (Optional)
            </label>
            <Textarea
              placeholder="Describe what's on your mind today. Our enhanced AI will analyze your text for better insights..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="resize-none min-h-[100px] border-2 focus:border-primary/50 transition-colors"
              rows={4}
            />
            {note.length > 0 && (
              <div className="text-xs text-gray-500 flex justify-between">
                <span>{note.length} characters</span>
                <span className="flex items-center gap-1">
                  <Brain className="h-3 w-3" />
                  AI analysis enabled
                </span>
              </div>
            )}
          </motion.div>

          {/* AI Analysis Progress */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
                  <span className="font-medium text-blue-800">AI Analysis in Progress</span>
                  <Sparkles className="h-4 w-4 text-purple-600 animate-spin" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Processing your mood data...</span>
                    <span>{analysisProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div 
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${analysisProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced AI Result Display */}
          <AnimatePresence>
            {aiResult && showAiResult && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 shadow-lg">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="h-6 w-6 text-blue-600" />
                      <span className="font-bold text-blue-800 text-lg">Enhanced AI Analysis</span>
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      <Badge variant="secondary" className="ml-auto">
                        v{modelStatus?.modelVersion || '3.0'}
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-3 border">
                          <div className="text-sm text-gray-600 mb-1">Sentiment Analysis</div>
                          <div className={`font-bold text-lg flex items-center gap-2 ${
                            aiResult.sentiment.includes('positive') 
                              ? 'text-green-700' 
                              : aiResult.sentiment.includes('stress') 
                              ? 'text-red-700'
                              : 'text-yellow-700'
                          }`}>
                            {aiResult.sentiment.includes('positive') && '😊'}
                            {aiResult.sentiment.includes('stress') && '⚠️'}
                            {!aiResult.sentiment.includes('positive') && !aiResult.sentiment.includes('stress') && '😐'}
                            <span className="capitalize">{aiResult.sentiment}</span>
                          </div>
                          {aiResult.sentimentPolarity !== undefined && (
                            <div className="text-xs text-gray-500 mt-1">
                              Polarity: {aiResult.sentimentPolarity.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div className="bg-white rounded-lg p-3 border">
                          <div className="text-sm text-gray-600 mb-1">Stress Level</div>
                          <div className="font-bold text-lg text-blue-700 flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            {aiResult.stressLevel}/5
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Confidence: {(aiResult.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      {/* Enhanced Model Performance Display */}
                      {aiResult.modelAccuracy && (
                        <div className="bg-white rounded-lg p-3 border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-gray-600">Model Performance</div>
                            <Badge variant="outline" className="text-xs">
                              Enhanced AI v4.0
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-gray-500">Model Accuracy</div>
                              <div className="font-semibold text-green-700">
                                {(aiResult.modelAccuracy * 100).toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500">Prediction Confidence</div>
                              <div className="font-semibold text-blue-700">
                                {(aiResult.confidence * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Stress Level Visualization</span>
                          <span>{aiResult.stressLevel === 1 ? 'Very Low' : aiResult.stressLevel === 2 ? 'Low' : aiResult.stressLevel === 3 ? 'Moderate' : aiResult.stressLevel === 4 ? 'High' : 'Very High'}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                          <motion.div 
                            className={`h-3 rounded-full transition-all duration-1000 ${
                              aiResult.stressLevel <= 2 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                              aiResult.stressLevel <= 3 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' : 
                              'bg-gradient-to-r from-red-400 to-red-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(aiResult.stressLevel / 5) * 100}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                          />
                        </div>
                      </div>
                      
                      <motion.div 
                        className="bg-white rounded-lg p-3 border-l-4 border-blue-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                      >
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {aiResult.sentiment.includes('positive') 
                            ? 'Great! Your mood analysis shows positive indicators. Your mental state appears balanced and healthy. Keep maintaining these good vibes!' 
                            : aiResult.stressLevel >= 4
                            ? 'I notice significant stress indicators in your input. This suggests you might benefit from stress-reduction techniques or reaching out for support.'
                            : 'Your mood shows some mixed signals. Consider taking time for self-care and mindfulness practices to maintain emotional balance.'}
                        </p>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Personalized Recommendation */}
          <AnimatePresence>
            {recommendation && showAiResult && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
              >
                <Card className={`bg-gradient-to-r ${recommendation.color} shadow-lg border-2`}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <recommendation.icon className="h-6 w-6 text-green-600" />
                      <span className="font-bold text-green-800 text-lg">Personalized Recommendation</span>
                      <Badge variant={recommendation.urgency === 'high' ? 'destructive' : recommendation.urgency === 'medium' ? 'default' : 'secondary'} className="ml-auto">
                        {recommendation.urgency} priority
                      </Badge>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border">
                        <h4 className="font-bold text-gray-900 text-lg mb-2 flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-yellow-500" />
                          {recommendation.title}
                        </h4>
                        <p className="text-gray-700 leading-relaxed mb-3">{recommendation.description}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Badge variant="outline">{recommendation.type}</Badge>
                          <span className="text-xs">•</span>
                          <span>Recommended for stress level {aiResult?.stressLevel}</span>
                        </div>
                      </div>
                      {recommendation.content_url && (
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Button
                            variant="default"
                            size="lg"
                            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg"
                            onClick={() => {
                              if (recommendation.content_url?.startsWith('http')) {
                                window.open(recommendation.content_url, '_blank');
                              } else {
                                window.location.href = recommendation.content_url!;
                              }
                            }}
                          >
                            <recommendation.icon className="h-5 w-5 mr-2" />
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
          </AnimatePresence>

          {/* Enhanced Submit Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedMood}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5 animate-pulse" />
                  <span>Analyzing with AI...</span>
                  <Sparkles className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Brain className="h-5 w-5" />
                  <span>Log Mood & Get AI Insights</span>
                  <Zap className="h-4 w-4" />
                </div>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MoodTracker;