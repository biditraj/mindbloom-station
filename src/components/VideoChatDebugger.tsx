import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { videoChatService } from '@/lib/videoChatService';
import { 
  Bug, 
  ChevronDown, 
  ChevronRight, 
  Copy, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Info,
  Database,
  User,
  Users,
  Phone,
  Wifi
} from 'lucide-react';

interface DebugStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  timestamp?: string;
}

const VideoChatDebugger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<DebugStep[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { student } = useAuth();

  const updateStep = (id: string, updates: Partial<DebugStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === id 
        ? { ...step, ...updates, timestamp: new Date().toLocaleTimeString() }
        : step
    ));
  };

  const addStep = (step: DebugStep) => {
    setSteps(prev => [...prev, { ...step, timestamp: new Date().toLocaleTimeString() }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setSteps([]);

    // Initialize steps
    const initialSteps: DebugStep[] = [
      { id: '1', name: 'User Authentication Check', status: 'pending', message: 'Checking user authentication...' },
      { id: '2', name: 'Database Connection Test', status: 'pending', message: 'Testing database connectivity...' },
      { id: '3', name: 'Video Chat Tables Check', status: 'pending', message: 'Verifying video chat tables...' },
      { id: '4', name: 'User Permissions Test', status: 'pending', message: 'Testing user permissions...' },
      { id: '5', name: 'Queue Join Simulation', status: 'pending', message: 'Simulating queue join...' },
      { id: '6', name: 'Real-time Subscription Test', status: 'pending', message: 'Testing real-time subscriptions...' },
      { id: '7', name: 'Media Permissions Check', status: 'pending', message: 'Checking camera/microphone...' }
    ];

    setSteps(initialSteps);

    try {
      // Step 1: User Authentication Check
      updateStep('1', { status: 'running' });
      if (!student) {
        updateStep('1', { 
          status: 'error', 
          message: 'User not authenticated',
          details: 'No student object found in AuthContext'
        });
        return;
      }

      const isLocalMode = student.id.startsWith('temp_');
      updateStep('1', { 
        status: isLocalMode ? 'warning' : 'success', 
        message: isLocalMode ? `Local mode detected (ID: ${student.id})` : `Authenticated user (ID: ${student.id})`,
        details: { 
          studentId: student.id, 
          isLocalMode,
          studentData: student 
        }
      });

      if (isLocalMode) {
        updateStep('2', { status: 'error', message: 'Skipping database tests - local mode active' });
        updateStep('3', { status: 'error', message: 'Skipping table checks - local mode active' });
        updateStep('4', { status: 'error', message: 'Skipping permissions - local mode active' });
        updateStep('5', { status: 'error', message: 'Cannot join queue in local mode' });
        setIsRunning(false);
        return;
      }

      // Step 2: Database Connection Test
      updateStep('2', { status: 'running' });
      try {
        const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
        if (error) throw error;
        updateStep('2', { 
          status: 'success', 
          message: 'Database connection successful',
          details: { response: data }
        });
      } catch (error: any) {
        updateStep('2', { 
          status: 'error', 
          message: 'Database connection failed',
          details: { error: error.message, code: error.code }
        });
        setIsRunning(false);
        return;
      }

      // Step 3: Video Chat Tables Check
      updateStep('3', { status: 'running' });
      const tableChecks = [
        { name: 'matchmaking_queue', table: 'matchmaking_queue' as const },
        { name: 'video_chat_sessions', table: 'video_chat_sessions' as const },
        { name: 'signaling_messages', table: 'signaling_messages' as const }
      ];

      const tableResults = [];
      for (const check of tableChecks) {
        try {
          const { error } = await supabase.from(check.table).select('id').limit(1);
          if (error) {
            if (error.code === '42P01') {
              tableResults.push({ table: check.name, exists: false, error: 'Table does not exist' });
            } else {
              tableResults.push({ table: check.name, exists: true, accessible: false, error: error.message });
            }
          } else {
            tableResults.push({ table: check.name, exists: true, accessible: true });
          }
        } catch (error: any) {
          tableResults.push({ table: check.name, exists: false, error: error.message });
        }
      }

      const missingTables = tableResults.filter(r => !r.exists);
      if (missingTables.length > 0) {
        updateStep('3', { 
          status: 'error', 
          message: `Missing tables: ${missingTables.map(t => t.table).join(', ')}`,
          details: tableResults
        });
        setIsRunning(false);
        return;
      }

      const inaccessibleTables = tableResults.filter(r => r.exists && !r.accessible);
      if (inaccessibleTables.length > 0) {
        updateStep('3', { 
          status: 'warning', 
          message: `Inaccessible tables: ${inaccessibleTables.map(t => t.table).join(', ')}`,
          details: tableResults
        });
      } else {
        updateStep('3', { 
          status: 'success', 
          message: 'All video chat tables exist and accessible',
          details: tableResults
        });
      }

      // Step 4: User Permissions Test
      updateStep('4', { status: 'running' });
      try {
        // Test if user can read their own student record with available columns
        const { data: userData, error: userError } = await supabase
          .from('students')
          .select('id, anonymous_id, role')
          .eq('id', student.id)
          .single();

        if (userError) throw userError;

        updateStep('4', { 
          status: 'success', 
          message: 'User permissions verified',
          details: { userData }
        });
      } catch (error: any) {
        updateStep('4', { 
          status: 'error', 
          message: 'User permission check failed',
          details: { error: error.message, code: error.code }
        });
      }

      // Step 5: Queue Join Simulation
      updateStep('5', { status: 'running' });
      try {
        // First, clean up any existing queue entries
        await supabase.from('matchmaking_queue').delete().eq('student_id', student.id);
        
        // Try to join the queue
        const queueResult = await videoChatService.joinQueue(student.id);
        
        updateStep('5', { 
          status: 'success', 
          message: 'Successfully joined queue',
          details: { queueResult }
        });

        // Clean up after test
        await videoChatService.leaveQueue(student.id);
      } catch (error: any) {
        updateStep('5', { 
          status: 'error', 
          message: `Queue join failed: ${error.message}`,
          details: { 
            error: error.message, 
            stack: error.stack,
            name: error.name
          }
        });
      }

      // Step 6: Real-time Subscription Test
      updateStep('6', { status: 'running' });
      try {
        const testChannel = supabase.channel('debug-test-' + Date.now());
        
        const subscriptionPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Subscription timeout'));
          }, 5000);

          testChannel.subscribe((status) => {
            clearTimeout(timeout);
            if (status === 'SUBSCRIBED') {
              resolve(status);
            } else {
              reject(new Error(`Subscription failed with status: ${status}`));
            }
          });
        });

        await subscriptionPromise;
        supabase.removeChannel(testChannel);

        updateStep('6', { 
          status: 'success', 
          message: 'Real-time subscriptions working',
          details: { status: 'SUBSCRIBED' }
        });
      } catch (error: any) {
        updateStep('6', { 
          status: 'error', 
          message: `Real-time subscription failed: ${error.message}`,
          details: { error: error.message }
        });
      }

      // Step 7: Media Permissions Check
      updateStep('7', { status: 'running' });
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        // Stop the stream immediately after testing
        stream.getTracks().forEach(track => track.stop());
        
        updateStep('7', { 
          status: 'success', 
          message: 'Camera and microphone access granted',
          details: { 
            video: stream.getVideoTracks().length > 0,
            audio: stream.getAudioTracks().length > 0
          }
        });
      } catch (error: any) {
        updateStep('7', { 
          status: 'error', 
          message: `Media access denied: ${error.message}`,
          details: { error: error.message, name: error.name }
        });
      }

    } catch (error: any) {
      console.error('Diagnostic error:', error);
      addStep({
        id: 'error',
        name: 'Diagnostic Error',
        status: 'error',
        message: `Unexpected error: ${error.message}`,
        details: error
      });
    } finally {
      setIsRunning(false);
    }
  };

  const copyDebugInfo = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      student: student ? { id: student.id, isLocalMode: student.id.startsWith('temp_') } : null,
      steps: steps,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
  };

  const getStatusIcon = (status: DebugStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Video Chat Debugger
                <Badge variant="outline" className="text-xs">Advanced</Badge>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Comprehensive diagnostics for video chat issues
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={runDiagnostics}
                  disabled={isRunning}
                  size="sm"
                  variant="outline"
                >
                  {isRunning ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bug className="h-4 w-4 mr-2" />
                  )}
                  Run Diagnostics
                </Button>
                {steps.length > 0 && (
                  <Button
                    onClick={copyDebugInfo}
                    size="sm"
                    variant="ghost"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Debug Info
                  </Button>
                )}
              </div>
            </div>

            {steps.length > 0 && (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {getStatusIcon(step.status)}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{step.name}</span>
                          {step.timestamp && (
                            <span className="text-xs text-muted-foreground">
                              {step.timestamp}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {step.message}
                        </p>
                        {step.details && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer">
                              Show details
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isRunning && steps.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Summary:</h4>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">
                    ✓ {steps.filter(s => s.status === 'success').length} passed
                  </span>
                  <span className="text-red-600">
                    ✗ {steps.filter(s => s.status === 'error').length} failed
                  </span>
                  <span className="text-yellow-600">
                    ⚠ {steps.filter(s => s.status === 'warning').length} warnings
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default VideoChatDebugger;