import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Shield, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';

interface RLSTest {
  name: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

const RLSTroubleshooter: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<RLSTest[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (name: string, status: RLSTest['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, status, message, details } : t);
      } else {
        return [...prev, { name, status, message, details }];
      }
    });
  };

  const runRLSTests = async () => {
    if (!user) {
      updateTest('auth', 'error', 'No user authenticated');
      return;
    }

    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: Check user record access
      updateTest('user-access', 'running', 'Testing user record access...');
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, anonymous_id, role')
          .eq('id', user.id)
          .single();

        if (error) {
          updateTest('user-access', 'error', `Failed: ${error.message}`, error);
        } else {
          updateTest('user-access', 'success', 'Student record accessible', data);
        }
      } catch (error: any) {
        updateTest('user-access', 'error', `Error: ${error.message}`, error);
      }

      // Test 2: Test RLS config function
      updateTest('rls-config', 'running', 'Testing RLS config function...');
      try {
        await (supabase as any).rpc('set_config', {
          setting_name: 'app.anonymous_id',
          setting_value: user.anonymous_id
        });
        updateTest('rls-config', 'success', 'RLS config function works');
      } catch (error: any) {
        updateTest('rls-config', 'error', `RLS config failed: ${error.message}`, error);
      }

      // Test 3: Test matchmaking queue access after RLS setup
      updateTest('queue-access', 'running', 'Testing queue access after RLS setup...');
      try {
        // Try to set RLS config first
        await (supabase as any).rpc('set_config', {
          setting_name: 'app.anonymous_id',
          setting_value: user.anonymous_id
        });

        // Then test queue access
        const { data, error } = await supabase
          .from('matchmaking_queue')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          updateTest('queue-access', 'error', `Queue access failed: ${error.message}`, error);
        } else {
          updateTest('queue-access', 'success', 'Queue access successful after RLS setup', data);
        }
      } catch (error: any) {
        updateTest('queue-access', 'error', `Queue access error: ${error.message}`, error);
      }

      // Test 4: Test video chat sessions access
      updateTest('sessions-access', 'running', 'Testing sessions table access...');
      try {
        const { data, error } = await supabase
          .from('video_chat_sessions')
          .select('id')
          .limit(1);

        if (error) {
          updateTest('sessions-access', 'error', `Sessions access failed: ${error.message}`, error);
        } else {
          updateTest('sessions-access', 'success', 'Sessions table accessible', data);
        }
      } catch (error: any) {
        updateTest('sessions-access', 'error', `Sessions access error: ${error.message}`, error);
      }

    } catch (error: any) {
      updateTest('general-error', 'error', `Unexpected error: ${error.message}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const fixRLSIssues = async () => {
    if (!user || user.id.startsWith('temp_')) {
      alert('Cannot fix RLS for temporary/local mode users. Please refresh and log in with a stable internet connection.');
      return;
    }

    setIsRunning(true);
    try {
      // Set the RLS configuration
      await (supabase as any).rpc('set_config', {
        setting_name: 'app.anonymous_id',
        setting_value: user.anonymous_id
      });

      // Re-run tests
      await runRLSTests();
    } catch (error: any) {
      alert(`Failed to fix RLS: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: RLSTest['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please log in to test RLS policies</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            RLS Troubleshooter
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={runRLSTests} 
              disabled={isRunning}
              size="sm"
              variant="outline"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Test RLS
            </Button>
            <Button 
              onClick={fixRLSIssues} 
              disabled={isRunning || user.id.startsWith('temp_')}
              size="sm"
              variant="default"
            >
              Fix RLS
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {user.id.startsWith('temp_') && (
          <Alert className="mb-4" variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You are in local mode. RLS policies cannot be fixed for temporary users. 
              Please refresh and log in with a stable internet connection.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-3">
          {tests.map((test, index) => (
            <div key={test.name} className="flex items-start gap-3 p-3 rounded-lg border">
              {getStatusIcon(test.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm capitalize">
                    {test.name.replace('-', ' ')}
                  </span>
                  <Badge variant={
                    test.status === 'success' ? 'default' :
                    test.status === 'error' ? 'destructive' :
                    test.status === 'running' ? 'secondary' :
                    'outline'
                  }>
                    {test.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {test.message}
                </p>
                {test.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Show details
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {tests.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Click "Test RLS" to check Row Level Security policies
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RLSTroubleshooter;