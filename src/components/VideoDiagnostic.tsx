import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  VideoOff, 
  Camera, 
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Monitor,
  Smartphone
} from 'lucide-react';

interface VideoTest {
  id: string;
  name: string;
  constraints: MediaStreamConstraints;
  stream: MediaStream | null;
  status: 'idle' | 'testing' | 'success' | 'failed';
  error?: string;
  dimensions?: { width: number; height: number };
}

const VideoDiagnostic: React.FC = () => {
  const [tests, setTests] = useState<VideoTest[]>([
    {
      id: 'basic',
      name: 'Basic Camera',
      constraints: { video: true, audio: false },
      stream: null,
      status: 'idle'
    },
    {
      id: 'hd',
      name: 'HD Camera (720p)',
      constraints: { 
        video: { width: 1280, height: 720 }, 
        audio: false 
      },
      stream: null,
      status: 'idle'
    },
    {
      id: 'vga',
      name: 'VGA Camera (480p)',
      constraints: { 
        video: { width: 640, height: 480 }, 
        audio: false 
      },
      stream: null,
      status: 'idle'
    },
    {
      id: 'front',
      name: 'Front Camera',
      constraints: { 
        video: { facingMode: 'user' }, 
        audio: false 
      },
      stream: null,
      status: 'idle'
    },
    {
      id: 'back',
      name: 'Back Camera',
      constraints: { 
        video: { facingMode: 'environment' }, 
        audio: false 
      },
      stream: null,
      status: 'idle'
    }
  ]);

  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [browserInfo, setBrowserInfo] = useState<string>('');
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  // Get browser info
  useEffect(() => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    setBrowserInfo(browser);
  }, []);

  // Get available devices
  const getDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setDeviceList(devices.filter(d => d.kind === 'videoinput'));
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
    }
  };

  useEffect(() => {
    getDevices();
  }, []);

  // Test a specific configuration
  const testConfiguration = async (testId: string) => {
    const test = tests.find(t => t.id === testId);
    if (!test) return;

    // Update status to testing
    setTests(prev => prev.map(t => 
      t.id === testId 
        ? { ...t, status: 'testing', error: undefined, stream: null, dimensions: undefined }
        : t
    ));

    try {
      // Stop existing stream if any
      if (test.stream) {
        test.stream.getTracks().forEach(track => track.stop());
      }

      console.log(`Testing ${test.name} with constraints:`, test.constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(test.constraints);
      
      // Set up video element
      const videoElement = videoRefs.current[testId];
      if (videoElement) {
        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        
        // Wait for video to load and get dimensions
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Video load timeout'));
          }, 5000);

          videoElement.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log(`${test.name} dimensions:`, videoElement.videoWidth, 'x', videoElement.videoHeight);
            resolve();
          };

          videoElement.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('Video element error'));
          };
        });

        await videoElement.play();

        // Get final dimensions
        const dimensions = {
          width: videoElement.videoWidth,
          height: videoElement.videoHeight
        };

        setTests(prev => prev.map(t => 
          t.id === testId 
            ? { ...t, status: 'success', stream, dimensions }
            : t
        ));

      } else {
        throw new Error('Video element not available');
      }

    } catch (error: any) {
      console.error(`Test ${test.name} failed:`, error);
      
      setTests(prev => prev.map(t => 
        t.id === testId 
          ? { ...t, status: 'failed', error: error.message }
          : t
      ));
    }
  };

  // Stop a test
  const stopTest = (testId: string) => {
    const test = tests.find(t => t.id === testId);
    if (test?.stream) {
      test.stream.getTracks().forEach(track => track.stop());
    }

    setTests(prev => prev.map(t => 
      t.id === testId 
        ? { ...t, status: 'idle', stream: null, dimensions: undefined, error: undefined }
        : t
    ));

    const videoElement = videoRefs.current[testId];
    if (videoElement) {
      videoElement.srcObject = null;
    }
  };

  // Stop all tests
  const stopAllTests = () => {
    tests.forEach(test => {
      if (test.stream) {
        test.stream.getTracks().forEach(track => track.stop());
      }
    });

    setTests(prev => prev.map(t => ({
      ...t,
      status: 'idle',
      stream: null,
      dimensions: undefined,
      error: undefined
    })));

    Object.values(videoRefs.current).forEach(video => {
      if (video) video.srcObject = null;
    });
  };

  // Test all configurations
  const testAll = async () => {
    stopAllTests();
    
    for (const test of tests) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
      await testConfiguration(test.id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Video Diagnostic Tool
          </CardTitle>
          <CardDescription>
            Test different camera configurations to diagnose black screen issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* System Info */}
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>System Info:</strong> Browser: {browserInfo} | 
                Video Devices: {deviceList.length} | 
                WebRTC Support: {navigator.mediaDevices ? '✅' : '❌'}
              </AlertDescription>
            </Alert>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button onClick={testAll} size="sm">
                <Camera className="h-4 w-4 mr-2" />
                Test All Configurations
              </Button>
              <Button onClick={stopAllTests} variant="outline" size="sm">
                <VideoOff className="h-4 w-4 mr-2" />
                Stop All Tests
              </Button>
              <Button onClick={getDevices} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Devices
              </Button>
            </div>

            {/* Device List */}
            {deviceList.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <strong>Available Cameras:</strong>
                <ul className="list-disc list-inside mt-1">
                  {deviceList.map((device, index) => (
                    <li key={device.deviceId}>
                      {device.label || `Camera ${index + 1}`} ({device.deviceId.substring(0, 8)}...)
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Test Results Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map((test) => (
                <Card key={test.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{test.name}</CardTitle>
                      <Badge variant={
                        test.status === 'success' ? 'default' :
                        test.status === 'testing' ? 'secondary' :
                        test.status === 'failed' ? 'destructive' :
                        'outline'
                      }>
                        {test.status === 'idle' && 'Ready'}
                        {test.status === 'testing' && 'Testing...'}
                        {test.status === 'success' && 'Success'}
                        {test.status === 'failed' && 'Failed'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Video Element */}
                    <div className="relative bg-black rounded aspect-video overflow-hidden">
                      <video
                        ref={(el) => videoRefs.current[test.id] = el}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                      {test.status === 'idle' && (
                        <div className="absolute inset-0 flex items-center justify-center text-white text-xs">
                          Click Test to Start
                        </div>
                      )}
                      {test.status === 'testing' && (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                          <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                      {test.status === 'failed' && (
                        <div className="absolute inset-0 flex items-center justify-center text-red-400">
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                      )}
                    </div>

                    {/* Dimensions */}
                    {test.dimensions && (
                      <div className="text-xs text-muted-foreground">
                        Resolution: {test.dimensions.width} × {test.dimensions.height}
                      </div>
                    )}

                    {/* Error */}
                    {test.error && (
                      <div className="text-xs text-red-500">
                        Error: {test.error}
                      </div>
                    )}

                    {/* Constraints */}
                    <div className="text-xs text-muted-foreground">
                      <details>
                        <summary className="cursor-pointer">Constraints</summary>
                        <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                          {JSON.stringify(test.constraints, null, 2)}
                        </pre>
                      </details>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={test.status === 'success' ? 'outline' : 'default'}
                        onClick={() => testConfiguration(test.id)}
                        disabled={test.status === 'testing'}
                        className="flex-1 text-xs"
                      >
                        {test.status === 'success' ? 'Retest' : 'Test'}
                      </Button>
                      {test.status === 'success' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => stopTest(test.id)}
                          className="text-xs"
                        >
                          Stop
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tips */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Troubleshooting Tips:</strong>
                <ul className="list-disc list-inside mt-1 text-sm">
                  <li>If all tests fail, check browser permissions</li>
                  <li>If only HD tests fail, your camera may not support high resolutions</li>
                  <li>If video shows but is black, try different browsers</li>
                  <li>Close other applications that might be using the camera</li>
                  <li>Try using HTTPS if on HTTP (some browsers require secure context)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoDiagnostic;