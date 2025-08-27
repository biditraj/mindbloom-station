import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Heart, Shield } from 'lucide-react';

const Auth = () => {
  const [anonymousId, setAnonymousId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 Auth form submitted with:', { anonymousId, isAdmin });
    
    // Validate input
    if (!anonymousId.trim()) {
      console.warn('⚠️ Empty anonymous ID provided');
      toast({
        title: "Please enter an anonymous ID",
        description: "You need an ID to access the platform",
        variant: "destructive"
      });
      return;
    }

    if (anonymousId.trim().length < 3) {
      console.warn('⚠️ Anonymous ID too short:', anonymousId.trim().length);
      toast({
        title: "ID too short",
        description: "Anonymous ID must be at least 3 characters long",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      console.log('🚀 Starting authentication process...');
      
      await login(anonymousId.trim(), isAdmin);
      
      console.log('✅ Authentication successful!');
      toast({
        title: "Welcome to MindBloom Station",
        description: "You're now connected anonymously"
      });
      navigate('/');
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      
      // Show specific error message from the authentication system
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      console.log('💬 Showing error to user:', errorMessage);
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log('🔚 Authentication process completed');
    }
  };

  const generateAnonymousId = () => {
    const randomId = `user_${Math.random().toString(36).substring(2, 10)}`;
    setAnonymousId(randomId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in-up">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm rounded-full px-4 py-2 border border-border/50">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-xl font-semibold">MindBloom Station</span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Anonymous mental health support for students
          </p>
        </div>

        <Card className="mood-card">
          <CardHeader>
            <CardTitle className="text-center">Get Started</CardTitle>
            <CardDescription className="text-center">
              Choose an anonymous ID to protect your privacy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anonymousId">Anonymous ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="anonymousId"
                    type="text"
                    placeholder="Enter your anonymous ID"
                    value={anonymousId}
                    onChange={(e) => setAnonymousId(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateAnonymousId}
                    className="px-3"
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the same ID to access your previous mood logs
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="adminMode"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="adminMode" className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin Access (for institutional dashboard)
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? "Connecting..." : "Enter Anonymously"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Your privacy is protected. All data is anonymized.</p>
          <p className="mt-2 text-xs">
            Having trouble? Check the browser console (F12) for detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;