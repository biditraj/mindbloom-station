import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw, User } from 'lucide-react';

interface DiagnosticResult {
  name: string;
  status: 'success' | 'error' | 'warning' | 'checking';
  message: string;
  details?: string;
}

const DatabaseDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { student } = useAuth();

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnosticResults: DiagnosticResult[] = [];

    // Test 1: Basic Supabase Connection
    try {
      const { data, error } = await supabase.from('students').select('count', { count: 'exact', head: true });
      if (error) {
        diagnosticResults.push({
          name: 'Supabase Connection',
          status: 'error',
          message: 'Failed to connect to Supabase',
          details: error.message
        });
      } else {
        diagnosticResults.push({
          name: 'Supabase Connection',
          status: 'success',
          message: 'Successfully connected to Supabase'
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        name: 'Supabase Connection',
        status: 'error',
        message: 'Connection failed',
        details: error.message
      });
    }

    // Test 2: Students Table Access
    try {
      const { data, error } = await supabase.from('students').select('id').limit(1);
      if (error) {
        diagnosticResults.push({
          name: 'Students Table',
          status: 'error',
          message: 'Cannot access students table',
          details: error.message
        });
      } else {
        diagnosticResults.push({
          name: 'Students Table',
          status: 'success',
          message: 'Students table accessible'
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        name: 'Students Table',
        status: 'error',
        message: 'Students table access failed',
        details: error.message
      });
    }

    // Test 3: Matchmaking Queue Table
    try {
      const { data, error } = await supabase.from('matchmaking_queue').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          diagnosticResults.push({
            name: 'Matchmaking Queue Table',
            status: 'error',
            message: 'Table does not exist',
            details: 'The video chat migration needs to be applied'
          });
        } else {
          diagnosticResults.push({
            name: 'Matchmaking Queue Table',
            status: 'error',
            message: 'Table access error',
            details: error.message
          });
        }
      } else {
        diagnosticResults.push({
          name: 'Matchmaking Queue Table',
          status: 'success',
          message: 'Matchmaking queue table exists and accessible'
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        name: 'Matchmaking Queue Table',
        status: 'error',
        message: 'Table check failed',
        details: error.message
      });
    }

    // Test 4: Video Chat Sessions Table
    try {
      const { data, error } = await supabase.from('video_chat_sessions').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          diagnosticResults.push({
            name: 'Video Chat Sessions Table',
            status: 'error',
            message: 'Table does not exist',
            details: 'The video chat migration needs to be applied'
          });
        } else {
          diagnosticResults.push({
            name: 'Video Chat Sessions Table',
            status: 'error',
            message: 'Table access error',
            details: error.message
          });
        }
      } else {
        diagnosticResults.push({
          name: 'Video Chat Sessions Table',
          status: 'success',
          message: 'Video chat sessions table exists and accessible'
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        name: 'Video Chat Sessions Table',
        status: 'error',
        message: 'Table check failed',
        details: error.message
      });
    }

    // Test 5: Signaling Messages Table
    try {
      const { data, error } = await supabase.from('signaling_messages').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          diagnosticResults.push({
            name: 'Signaling Messages Table',
            status: 'error',
            message: 'Table does not exist',
            details: 'The video chat migration needs to be applied'
          });
        } else {
          diagnosticResults.push({
            name: 'Signaling Messages Table',
            status: 'error',
            message: 'Table access error',
            details: error.message
          });
        }
      } else {
        diagnosticResults.push({
          name: 'Signaling Messages Table',
          status: 'success',
          message: 'Signaling messages table exists and accessible'
        });
      }
    } catch (error: any) {
      diagnosticResults.push({
        name: 'Signaling Messages Table',
        status: 'error',
        message: 'Table check failed',
        details: error.message
      });
    }

    setResults(diagnosticResults);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-500">OK</Badge>;
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-500">WARNING</Badge>;
      case 'checking':
        return <Badge variant="secondary">CHECKING</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Diagnostic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              Testing database connections and table availability
            </p>
            {student && (
              <div className="flex items-center gap-2 mt-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  User ID: {student.id}
                  {student.id.startsWith('temp_') && (
                    <Badge variant="destructive" className="ml-2 text-xs">LOCAL MODE</Badge>
                  )}
                </span>
              </div>
            )}
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            {isRunning ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Run Diagnostics
          </Button>
        </div>

        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className="flex items-start justify-between p-3 rounded-lg border bg-card"
            >
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(result.status)}
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{result.name}</p>
                    {getStatusBadge(result.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{result.message}</p>
                  {result.details && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {result.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {results.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-2">Summary:</h4>
            <p className="text-sm text-muted-foreground">
              {results.filter(r => r.status === 'success').length} of {results.length} tests passed.
              {results.some(r => r.status === 'error') && (
                <span className="block mt-1 text-red-600">
                  Some video chat tables are missing. The database migration needs to be applied.
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseDiagnostic;