import React, { useState } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import VideoDiagnostic from '@/components/VideoDiagnostic';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  Database,
  Video,
  Globe,
  Shield,
  User
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

const DebugTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { student } = useAuth();

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: string) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      const newTest = { name, status, message, details };
      if (existing) {
        return prev.map(t => t.name === name ? newTest : t);
      } else {
        return [...prev, newTest];
      }
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    // Test 1: Authentication
    updateTest('Authentication', 'pending', 'Checking authentication...');
    if (student) {
      updateTest('Authentication', 'success', 'User authenticated', `ID: ${student.anonymous_id}`);
    } else {
      updateTest('Authentication', 'error', 'No authenticated user');
    }

    // Test 2: WebRTC Support
    updateTest('WebRTC Support', 'pending', 'Checking WebRTC support...');
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      updateTest('WebRTC Support', 'success', 'WebRTC is supported');
    } else {
      updateTest('WebRTC Support', 'error', 'WebRTC not supported');
    }

    // Test 3: HTTPS Check
    updateTest('HTTPS', 'pending', 'Checking secure connection...');
    if (location.protocol === 'https:' || location.hostname === 'localhost') {
      updateTest('HTTPS', 'success', 'Secure connection available');
    } else {
      updateTest('HTTPS', 'warning', 'Not using HTTPS');
    }

    // Test 4: Media Permissions
    updateTest('Media Permissions', 'pending', 'Testing camera/microphone access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(track => track.stop());
      updateTest('Media Permissions', 'success', 'Media access granted');
    } catch (error: any) {
      updateTest('Media Permissions', 'error', 'Permission denied', error.message);
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'pending': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  return (
    <Layout>
      <div className="p-4 bg-white/80 backdrop-blur-sm min-h-full">
        <div className="mb-6 pb-4 border-b border-gray-200/60">
          <h1 className="text-2xl font-bold">Video Chat Debug Test</h1>
          <p className="text-slate-600 text-sm">System check for video chat functionality</p>
        </div>

        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              System Tests
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Diagnostic
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>System Tests</CardTitle>
                <CardDescription>Checking video chat requirements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button onClick={runTests} disabled={isRunning} className="w-full">
                    {isRunning ? 'Running Tests...' : 'Run System Check'}
                  </Button>

                  {tests.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(test.status)}
                        <div>
                          <div className="font-medium text-sm">{test.name}</div>
                          <div className="text-xs text-muted-foreground">{test.message}</div>
                          {test.details && (
                            <div className="text-xs text-muted-foreground font-mono mt-1">
                              {test.details}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {tests.length > 0 && tests.filter(t => t.status === 'error').length === 0 && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>System Ready!</strong> Video chat should work. 
                  <a href="/chat" className="underline ml-2">Test Video Chat</a>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <VideoDiagnostic />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DebugTest;