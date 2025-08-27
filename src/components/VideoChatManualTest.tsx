import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { videoChatService } from '@/lib/videoChatService';
import { supabase } from '@/integrations/supabase/client';
import { Play, Square, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface TestResult {
  step: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

const VideoChatManualTest: React.FC = () => {
  const { student } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (step: string, status: TestResult['status'], message: string, details?: any) => {
    setResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step ? { ...r, status, message, details } : r);
      } else {
        return [...prev, { step, status, message, details }];
      }
    });
  };

  const runManualTest = async () => {
    if (!student) {
      updateResult('auth', 'error', 'No student authenticated');
      return;
    }

    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Check student ID
      updateResult('student-check', 'running', 'Checking student authentication...');
      
      if (student.id.startsWith('temp_')) {
        updateResult('student-check', 'error', 'Student is in local mode - cannot use video chat', {
          studentId: student.id,
          isLocalMode: true
        });
        setIsRunning(false);
        return;
      }
      
      updateResult('student-check', 'success', `Authenticated as ${student.id}`, {
        studentId: student.id,
        isLocalMode: false
      });

      // Test 2: Database connection
      updateResult('db-connection', 'running', 'Testing database connection...');
      try {
        const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
        if (error) throw error;
        updateResult('db-connection', 'success', 'Database connection successful');
      } catch (error: any) {
        updateResult('db-connection', 'error', 'Database connection failed', error);
        setIsRunning(false);
        return;
      }

      // Test 3: Check queue table
      updateResult('queue-table', 'running', 'Checking matchmaking queue table...');
      try {
        const { error } = await supabase.from('matchmaking_queue').select('id').limit(1);
        if (error) {
          if (error.code === '42P01') {
            updateResult('queue-table', 'error', 'Matchmaking queue table does not exist', error);
            setIsRunning(false);
            return;
          }
          throw error;
        }
        updateResult('queue-table', 'success', 'Matchmaking queue table accessible');
      } catch (error: any) {
        updateResult('queue-table', 'error', 'Queue table check failed', error);
        setIsRunning(false);
        return;
      }

      // Test 4: Clean existing queue entries
      updateResult('queue-cleanup', 'running', 'Cleaning existing queue entries...');
      try {
        await supabase.from('matchmaking_queue').delete().eq('student_id', student.id);
        updateResult('queue-cleanup', 'success', 'Queue cleanup completed');
      } catch (error: any) {
        updateResult('queue-cleanup', 'error', 'Queue cleanup failed', error);
      }

      // Test 5: Attempt to join queue
      updateResult('queue-join', 'running', 'Attempting to join queue...');
      try {
        console.log('=== MANUAL TEST: Starting queue join ===');
        console.log('Student ID:', student.id);
        console.log('Timestamp:', new Date().toISOString());
        
        const queueEntry = await videoChatService.joinQueue(student.id);
        
        console.log('=== MANUAL TEST: Queue join result ===');
        console.log('Queue entry:', queueEntry);
        
        updateResult('queue-join', 'success', 'Successfully joined queue', queueEntry);
        
        // Test 6: Leave queue
        updateResult('queue-leave', 'running', 'Leaving queue...');
        try {
          await videoChatService.leaveQueue(student.id);
          updateResult('queue-leave', 'success', 'Successfully left queue');
        } catch (error: any) {
          updateResult('queue-leave', 'error', 'Failed to leave queue', error);
        }
        
      } catch (error: any) {
        console.log('=== MANUAL TEST: Queue join failed ===');
        console.log('Error:', error);
        console.log('Error message:', error.message);
        console.log('Error stack:', error.stack);
        
        updateResult('queue-join', 'error', `Queue join failed: ${error.message}`, {
          error: error.message,
          stack: error.stack,
          name: error.name
        });
      }

    } catch (error: any) {
      updateResult('general-error', 'error', `Unexpected error: ${error.message}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!student) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Please log in to run video chat tests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Manual Video Chat Test</span>
          <Button 
            onClick={runManualTest} 
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            {isRunning ? (
              <Square className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? 'Running...' : 'Run Test'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {student.id.startsWith('temp_') && (
          <Alert className="mb-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You are in local mode (Student ID: {student.id}). Video chat requires a database connection.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-3">
          {results.map((result, index) => (
            <div key={result.step} className="flex items-start gap-3 p-3 rounded-lg border">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm capitalize">
                    {result.step.replace('-', ' ')}
                  </span>
                  <Badge variant={
                    result.status === 'success' ? 'default' :
                    result.status === 'error' ? 'destructive' :
                    result.status === 'running' ? 'secondary' :
                    'outline'
                  }>
                    {result.status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {result.message}
                </p>
                {result.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer">
                      Show details
                    </summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                      {JSON.stringify(result.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {results.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Click "Run Test" to start manual video chat testing
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoChatManualTest;