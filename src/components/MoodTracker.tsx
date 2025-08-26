import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Smile, Meh, Frown, Heart, Sun } from 'lucide-react';

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

const MoodTracker: React.FC<MoodTrackerProps> = ({ onMoodLogged }) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { student } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedMood) {
      toast({
        title: "Please select your mood",
        variant: "destructive"
      });
      return;
    }

    if (!student) {
      toast({
        title: "Please log in first",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Insert mood log
      const { data, error } = await supabase
        .from('mood_logs')
        .insert({
          student_id: student.id,
          mood_level: selectedMood,
          note: note.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      // Call the AI analysis edge function
      await supabase.functions.invoke('analyze-mood', {
        body: { 
          mood_log_id: data.id,
          mood_level: selectedMood,
          note: note.trim() || null
        }
      });

      toast({
        title: "Mood logged successfully",
        description: "Thank you for sharing how you're feeling"
      });

      // Reset form
      setSelectedMood(null);
      setNote('');
      
      // Notify parent component
      onMoodLogged?.();

    } catch (error) {
      console.error('Error logging mood:', error);
      toast({
        title: "Failed to log mood",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mood-card">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          How are you feeling today?
        </CardTitle>
        <CardDescription>
          Your daily check-in helps us understand your wellbeing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mood Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-center">Select your mood level</h3>
          <div className="flex justify-center gap-3 flex-wrap">
            {moodEmojis.map((mood) => (
              <button
                key={mood.level}
                onClick={() => setSelectedMood(mood.level)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  selectedMood === mood.level
                    ? 'border-primary bg-primary/10 shadow-lg'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="text-center space-y-2">
                  <div className="text-3xl">{mood.emoji}</div>
                  <div className={`text-xs font-medium ${mood.color}`}>
                    {mood.label}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Optional Note */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Anything specific on your mind? (Optional)
          </label>
          <Textarea
            placeholder="Share what's affecting your mood today..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="resize-none"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedMood}
          className="w-full"
          size="lg"
        >
          {loading ? "Logging..." : "Log My Mood"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MoodTracker;