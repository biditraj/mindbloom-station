import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import MoodTracker from '@/components/MoodTracker';
import InsightsPanel from '@/components/InsightsPanel';
import PeerSupportChat from '@/components/PeerSupportChat';
import AdminDashboard from '@/components/AdminDashboard';
import Auth from './Auth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { student, loading } = useAuth();
  const [currentView, setCurrentView] = useState('mood');
  const [refreshInsights, setRefreshInsights] = useState(0);

  const handleMoodLogged = () => {
    setRefreshInsights(prev => prev + 1);
    setCurrentView('insights');
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

  const renderCurrentView = () => {
    switch (currentView) {
      case 'mood':
        return <MoodTracker onMoodLogged={handleMoodLogged} />;
      case 'insights':
        return <InsightsPanel key={refreshInsights} />;
      case 'chat':
        return <PeerSupportChat />;
      case 'dashboard':
        return <AdminDashboard />;
      default:
        return <MoodTracker onMoodLogged={handleMoodLogged} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/3 via-secondary/3 to-accent/3 calm-gradient">
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {renderCurrentView()}
        </div>
      </main>
    </div>
  );
};

export default Index;
