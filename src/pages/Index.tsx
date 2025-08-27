import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import Layout from '@/components/Layout';
import MoodTracker from '@/components/MoodTracker';
import Auth from './Auth';
import { Loader2 } from 'lucide-react';
import { type PredictionResult } from '@/lib/moodModel';

const Index = () => {
  const { student, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [refreshInsights, setRefreshInsights] = useState(0);
  const [latestAiAnalysis, setLatestAiAnalysis] = useState<PredictionResult | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleMoodLogged = (aiResult?: PredictionResult, moodLevel?: string) => {
    if (aiResult) {
      setLatestAiAnalysis(aiResult);
    }
    if (moodLevel) {
      setSelectedMood(moodLevel);
    }
    setRefreshInsights(prev => prev + 1);
    // Navigate to insights page after mood logging
    navigate('/insights');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading MindBloom Station...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return <Auth />;
  }

  return (
    <Layout>
      <div className={`bg-white/80 backdrop-blur-sm min-h-full ${isMobile ? 'p-3' : 'p-4'}`}>
        <div className={`mb-6 pb-4 border-b border-gray-200/60 ${isMobile ? 'mb-4 pb-3' : ''}`}>
          <h1 className={`font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent ${isMobile ? 'text-xl' : 'text-2xl'}`}>Mood Check-in</h1>
          <p className={`text-slate-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>How are you feeling today? Track your mood and get personalized insights.</p>
        </div>
        <div className={isMobile ? 'pb-6' : 'pb-8'}>
          <MoodTracker onMoodLogged={handleMoodLogged} />
        </div>
      </div>
    </Layout>
  );
};

export default Index;
