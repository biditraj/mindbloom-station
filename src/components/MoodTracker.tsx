import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
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
  { 
    name: 'devastated', 
    emoji: '😭', 
    icon: Frown, 
    label: 'Devastated', 
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100 border-red-200',
    shadowColor: 'shadow-red-200',
    description: 'Feeling overwhelmed and very sad'
  },
  { 
    name: 'stressed', 
    emoji: '😰', 
    icon: Frown, 
    label: 'Stressed', 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    shadowColor: 'shadow-orange-200',
    description: 'Feeling anxious and under pressure'
  },
  { 
    name: 'sad', 
    emoji: '😢', 
    icon: Frown, 
    label: 'Sad', 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    shadowColor: 'shadow-blue-200',
    description: 'Feeling down and melancholy'
  },
  { 
    name: 'worried', 
    emoji: '😟', 
    icon: Meh, 
    label: 'Worried', 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200',
    shadowColor: 'shadow-yellow-200',
    description: 'Feeling concerned and uncertain'
  },
  { 
    name: 'neutral', 
    emoji: '😐', 
    icon: Meh, 
    label: 'Neutral', 
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100 border-gray-200',
    shadowColor: 'shadow-gray-200',
    description: 'Feeling balanced and calm'
  },
  { 
    name: 'content', 
    emoji: '😌', 
    icon: Smile, 
    label: 'Content', 
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100 border-green-200',
    shadowColor: 'shadow-green-200',
    description: 'Feeling peaceful and satisfied'
  },
  { 
    name: 'happy', 
    emoji: '😊', 
    icon: Smile, 
    label: 'Happy', 
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    shadowColor: 'shadow-emerald-200',
    description: 'Feeling joyful and positive'
  },
  { 
    name: 'excited', 
    emoji: '😄', 
    icon: Sun, 
    label: 'Excited', 
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200',
    shadowColor: 'shadow-cyan-200',
    description: 'Feeling energetic and enthusiastic'
  },
  { 
    name: 'euphoric', 
    emoji: '🤩', 
    icon: Sun, 
    label: 'Euphoric', 
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    shadowColor: 'shadow-purple-200',
    description: 'Feeling absolutely amazing and elated'
  }
];

interface MoodTrackerProps {
  onMoodLogged?: (aiResult?: PredictionResult, moodLevel?: string) => void;
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
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Load model status on component mount for development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const loadModelStatus = async (): Promise<void> => {
        try {
          const status = getModelStatus();
          console.log('🎯 Model Status:', status);
        } catch (error) {
          console.error('Error loading model status:', error);
        }
      };
      loadModelStatus();
    }
  }, []);

  const handleSubmit = async () => {
    if (!selectedMood) {
      toast({
        title: "Please select your mood",
        description: "Choose how you're feeling to continue",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Please log in first",
        description: "Authentication required to save mood data",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      setAnalysisProgress(0);

      if (process.env.NODE_ENV === 'development') {
        console.log('🧠 Starting enhanced TensorFlow.js mood analysis...');
      }
      
      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // Map mood names to database mood levels (1-5)
      const moodLevelMapping: Record<string, "1" | "2" | "3" | "4" | "5"> = {
        'devastated': '1',
        'stressed': '2', 
        'sad': '2',
        'worried': '3',
        'neutral': '3',
        'content': '4',
        'happy': '4', 
        'excited': '5',
        'euphoric': '5'
      };
      
      const moodLevel = moodLevelMapping[selectedMood] || '3';
      
      // Train model and predict mood using enhanced TensorFlow.js
      if (process.env.NODE_ENV === 'development') {
        console.log('🏋️ Ensuring model is trained...');
      }
      await trainModel();
      setAnalysisProgress(50);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔮 Making enhanced prediction...');
      }
      const prediction = await predictMood(note.trim(), moodLevel);
      setAnalysisProgress(80);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 Enhanced AI Analysis Result:', prediction);
      }

      // Generate enhanced recommendation based on stress level
      const enhancedRecommendation = getEnhancedRecommendationForStressLevel(prediction.stressLevel);
      setAnalysisProgress(100);
      
      clearInterval(progressInterval);

      if (process.env.NODE_ENV === 'development') {
        console.log('📊 About to insert mood log with data:', {
          user_id: user.id,
          mood_name: selectedMood,
          mood_level: moodLevel,
          note: note.trim() || null,
          ai_sentiment: prediction.sentiment,
          ai_stress_level: prediction.stressLevel
        });
      }

      // Insert mood log with enhanced AI results
      const { data: moodLogData, error: moodLogError } = await supabase
        .from('mood_logs')
        .insert({
          user_id: user.id,
          mood_level: moodLevel,
          note: note.trim() || null,
          ai_sentiment: prediction.sentiment,
          ai_stress_level: prediction.stressLevel
          // ai_confidence: prediction.confidence // TODO: Add after migration
        })
        .select()
        .single();

      if (moodLogError) {
        console.error('❌ Database insert error:', moodLogError);
        throw moodLogError;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Mood log inserted successfully:', moodLogData);
      }

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



      // Also call the existing edge function for additional analysis
      try {
        await supabase.functions.invoke('analyze-mood', {
          body: { 
            mood_log_id: moodLogData.id,
            mood_level: moodLevel,
            note: note.trim() || null
          }
        });
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Edge function analysis completed');
        }
      } catch (edgeFunctionError) {
        console.warn('⚠️ Edge function failed, but local AI analysis succeeded:', edgeFunctionError);
      }

      const selectedMoodEmoji = moodEmojis.find(m => m.name === selectedMood);
      
      toast({
        title: "Mood logged successfully! 🎉",
        description: `${selectedMoodEmoji?.emoji} Feeling ${selectedMoodEmoji?.label} - AI analysis completed with ${prediction.sentiment} sentiment and personalized recommendations.`
      });

      // Reset form and immediately notify parent with AI results
      setSelectedMood(null);
      setNote('');
      setAnalysisProgress(0);
      
      // Notify parent component with AI analysis data
      onMoodLogged?.(prediction, selectedMood);

    } catch (error) {
      console.error('❌ Error logging mood:', error);
      
      // Log detailed error information for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Log current state for debugging
      console.error('Debug info:', {
        selectedMood,
        noteLength: note.length,
        studentExists: !!user,
        studentId: user?.id
      });
      
      let errorMessage = "Please try again";
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          errorMessage = "Network connection issue. Please check your internet connection.";
        } else if (error.message.includes('permission') || error.message.includes('denied')) {
          errorMessage = "Database access denied. Please try logging in again.";
        } else if (error.message.includes('constraint') || error.message.includes('invalid')) {
          errorMessage = "Invalid data format. Please check your inputs.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Failed to log mood",
        description: errorMessage,
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
      className="mb-8"
    >
      <Card className="mood-card shadow-lg border-2 border-blue-100">
        <CardHeader className={`text-center bg-gradient-to-r from-blue-50 to-purple-50 ${isMobile ? 'pb-4' : ''}`}>
          <CardTitle className={`flex items-center justify-center gap-2 ${isMobile ? 'text-lg' : 'text-xl'}`}>
            <Heart className="h-7 w-7 text-red-500 animate-pulse" />
            How are you feeling today?
          </CardTitle>
          <CardDescription className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
            Your daily check-in helps us understand your wellbeing with AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent className={`space-y-6 ${isMobile ? 'p-4' : 'p-6'}`}>
          {/* Enhanced Mood Selection */}
          <div className="space-y-6">
            <div className="text-center">
              <h3 className={`font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                <Sparkles className="h-5 w-5 text-purple-600" />
                How are you feeling?
              </h3>
              <p className={`text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>Choose the emoji that best represents your current mood</p>
            </div>
            
            {/* Mood Emoji Grid */}
            <div className={`grid gap-3 mx-auto ${isMobile ? 'grid-cols-3 max-w-sm' : 'grid-cols-3 lg:grid-cols-3 max-w-lg'}`}>
              {moodEmojis.map((mood, index) => (
                <motion.button
                  key={mood.name}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ 
                    delay: index * 0.1, 
                    duration: 0.4,
                    type: "spring",
                    stiffness: 100 
                  }}
                  whileHover={{ 
                    scale: 1.15, 
                    rotate: [0, -5, 5, 0],
                    transition: { duration: 0.3 }
                  }}
                  whileTap={{ scale: 0.9 }}
                  onHoverStart={() => setHoveredMood(mood.name)}
                  onHoverEnd={() => setHoveredMood(null)}
                  onClick={() => setSelectedMood(mood.name)}
                  className={`relative rounded-2xl border-2 transition-all duration-300 group touch-manipulation ${isMobile ? 'p-3 active:scale-95' : 'p-4'} ${
                    selectedMood === mood.name
                      ? `${mood.bgColor} border-4 border-current shadow-xl ${mood.shadowColor} ring-4 ring-opacity-30 transform scale-105`
                      : `${mood.bgColor} border-gray-200 hover:border-current hover:shadow-lg`
                  }`}
                >
                  <div className="text-center space-y-2">
                    {/* Animated Emoji */}
                    <motion.div 
                      className={`select-none ${isMobile ? 'text-3xl' : 'text-4xl'}`}
                      animate={{
                        scale: selectedMood === mood.name ? [1, 1.2, 1] : hoveredMood === mood.name ? 1.1 : 1,
                        rotate: hoveredMood === mood.name ? [0, -3, 3, 0] : 0
                      }}
                      transition={{ duration: 0.5, repeat: selectedMood === mood.name ? Infinity : 0, repeatDelay: 1 }}
                    >
                      {mood.emoji}
                    </motion.div>
                    
                    {/* Mood Label */}
                    <div className={`font-semibold transition-colors duration-200 ${isMobile ? 'text-xs' : 'text-sm'} ${
                      selectedMood === mood.name ? mood.color : 'text-gray-600 group-hover:' + mood.color
                    }`}>
                      {mood.label}
                    </div>
                  </div>
                  
                  {/* Selection Indicator */}
                  <AnimatePresence>
                    {selectedMood === mood.name && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1 }}
                          className="text-white text-xs font-bold"
                        >
                          ✓
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Floating Particles Effect on Hover */}
                  <AnimatePresence>
                    {hoveredMood === mood.name && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none"
                      >
                        {[...Array(3)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, x: '50%', y: '50%' }}
                            animate={{ 
                              scale: [0, 1, 0],
                              x: `${50 + (Math.random() - 0.5) * 100}%`,
                              y: `${50 + (Math.random() - 0.5) * 100}%`
                            }}
                            transition={{ 
                              duration: 1,
                              delay: i * 0.2,
                              repeat: Infinity,
                              repeatDelay: 1
                            }}
                            className={`absolute w-1 h-1 rounded-full bg-current opacity-60`}
                            style={{ color: mood.color.replace('text-', '') }}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
            
            {/* Mood Description */}
            <AnimatePresence mode="wait">
              {(hoveredMood || selectedMood) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md border">
                    <div className="text-lg">
                      {moodEmojis.find(m => m.name === (hoveredMood || selectedMood))?.emoji}
                    </div>
                    <div className="text-sm text-gray-700 font-medium">
                      {moodEmojis.find(m => m.name === (hoveredMood || selectedMood))?.description}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
              className={`resize-none border-2 focus:border-primary/50 transition-colors ${isMobile ? 'min-h-[80px] text-base' : 'min-h-[100px]'}`}
              rows={isMobile ? 3 : 4}
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

          {/* Enhanced Submit Button */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button
              onClick={handleSubmit}
              disabled={loading || !selectedMood}
              className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${isMobile ? 'py-3 text-base' : 'py-4 text-lg'}`}
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