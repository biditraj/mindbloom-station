import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users,
  Shield,
  AlertTriangle,
  Loader2,
  Play,
  Camera,
  CheckCircle
} from 'lucide-react';

type DemoStatus = 'disconnected' | 'requesting_permission' | 'demo_ready' | 'error';

interface MediaError {
  name: string;
  message: string;
}

const DemoVideoChat: React.FC = () => {
  const [status, setStatus] = useState<DemoStatus>('disconnected');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaDevices, setMediaDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
  }>({ cameras: [], microphones: [] });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if WebRTC is supported
  const isWebRTCSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  };

  // Get available media devices
  const getMediaDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const microphones = devices.filter(device => device.kind === 'audioinput');
      
      setMediaDevices({ cameras, microphones });
    } catch (error) {
      console.warn('Could not enumerate devices:', error);
    }
  };

  // Initialize camera and microphone
  const initializeMedia = async () => {
    try {
      if (!isWebRTCSupported()) {
        throw new Error('WebRTC is not supported in this browser');
      }

      setStatus('requesting_permission');
      setError(null);

      // Request permissions with constraints
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      };

      console.log('Requesting media access with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Media access granted:', {
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length
      });

      setLocalStream(stream);
      
      // Set up video element with enhanced black screen prevention
      if (localVideoRef.current) {
        const videoElement = localVideoRef.current;
        
        // Clear any existing src before setting new one
        videoElement.srcObject = null;
        
        // Set video properties for better compatibility
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.controls = false;
        
        // Add comprehensive event handlers
        videoElement.onloadstart = () => console.log('Video load started');
        videoElement.onloadeddata = () => console.log('Video data loaded');
        videoElement.oncanplay = () => {
          console.log('Video can play, dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
          // Force play if not already playing
          if (videoElement.paused) {
            videoElement.play().catch(e => console.warn('CanPlay auto-play failed:', e));
          }
        };
        
        videoElement.onloadedmetadata = () => {
          console.log('Video metadata loaded, dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
          
          // Ensure video plays
          const playVideo = async () => {
            try {
              await videoElement.play();
              console.log('Video playing successfully');
              
              // Double-check after a moment
              setTimeout(() => {
                if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                  console.warn('Video dimensions still 0 after play, restarting...');
                  videoElement.srcObject = null;
                  setTimeout(() => {
                    videoElement.srcObject = stream;
                  }, 50);
                }
              }, 500);
            } catch (error) {
              console.warn('Video play failed:', error);
              // Try with user interaction
              setTimeout(() => {
                videoElement.play().catch(e => console.warn('Retry play failed:', e));
              }, 100);
            }
          };
          
          playVideo();
        };
        
        videoElement.onerror = (e) => {
          console.error('Video element error:', e);
        };
        
        // Set the stream after setting up all handlers
        setTimeout(() => {
          videoElement.srcObject = stream;
        }, 50);
      }

      setStatus('demo_ready');
      
      toast({
        title: "Camera Access Granted! ✅",
        description: "Your camera and microphone are working perfectly!"
      });

      // Get device list after successful access
      await getMediaDevices();

    } catch (error: any) {
      console.error('Media access error:', error);
      setStatus('error');
      
      let errorMessage = 'Failed to access camera or microphone.';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera and microphone access denied. Please click "Allow" when prompted and try again.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a camera and microphone.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = 'Camera or microphone is being used by another application. Please close other apps and try again.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Camera or microphone does not meet requirements. Trying with basic settings...';
        // Try again with basic constraints
        setTimeout(() => tryBasicConstraints(), 1000);
        return;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      toast({
        title: "Media Access Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  // Try with basic constraints if advanced ones fail
  const tryBasicConstraints = async () => {
    try {
      setStatus('requesting_permission');
      setError(null);
      
      const basicConstraints: MediaStreamConstraints = {
        video: true,
        audio: true
      };

      console.log('Trying basic constraints:', basicConstraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
      
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
        
        // Enhanced video setup for basic constraints
        const videoElement = localVideoRef.current;
        videoElement.muted = true;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        
        const playVideo = async () => {
          try {
            if (videoElement) {
              await videoElement.play();
              console.log('Basic constraints video playing successfully');
              
              // Check dimensions after play
              setTimeout(() => {
                console.log('Video dimensions after play:', videoElement.videoWidth, 'x', videoElement.videoHeight);
                if (videoElement.videoWidth === 0) {
                  console.warn('Still no video dimensions, forcing refresh...');
                  videoElement.srcObject = null;
                  setTimeout(() => videoElement.srcObject = stream, 100);
                }
              }, 200);
            }
          } catch (error) {
            console.warn('Basic constraints video play failed:', error);
          }
        };
        
        videoElement.onloadedmetadata = playVideo;
        videoElement.oncanplay = playVideo;
        
        // Set stream after handlers
        setTimeout(() => {
          videoElement.srcObject = stream;
        }, 50);
      }

      setStatus('demo_ready');
      
      toast({
        title: "Camera Access Granted! ✅",
        description: "Using basic camera settings."
      });

    } catch (error: any) {
      console.error('Basic constraints also failed:', error);
      setStatus('error');
      setError('Unable to access camera or microphone with any settings.');
    }
  };

  // Stop media stream
  const stopMedia = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => {
        track.stop();
        console.log('Stopped track:', track.kind);
      });
      setLocalStream(null);
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    setStatus('disconnected');
    setError(null);
    
    toast({
      title: "Camera Stopped",
      description: "Camera and microphone access has been released."
    });
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log('Video track enabled:', track.enabled);
      });
      setIsVideoEnabled(!isVideoEnabled);
      
      toast({
        title: isVideoEnabled ? "Video Disabled" : "Video Enabled",
        description: isVideoEnabled ? "Your camera is now off" : "Your camera is now on"
      });
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log('Audio track enabled:', track.enabled);
      });
      setIsAudioEnabled(!isAudioEnabled);
      
      toast({
        title: isAudioEnabled ? "Microphone Muted" : "Microphone Unmuted", 
        description: isAudioEnabled ? "Your microphone is now muted" : "Your microphone is now active"
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    // Get device list on mount
    getMediaDevices();
    
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Enhanced video monitoring and auto-recovery
  useEffect(() => {
    if (localStream && localVideoRef.current && status === 'demo_ready') {
      const videoElement = localVideoRef.current;
      let retryCount = 0;
      const maxRetries = 3;
      
      // More aggressive monitoring every 1 second
      const checkVideo = setInterval(() => {
        const hasValidDimensions = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;
        const isPlaying = !videoElement.paused && !videoElement.ended;
        
        if (!hasValidDimensions && retryCount < maxRetries) {
          retryCount++;
          console.warn(`Video black screen detected (attempt ${retryCount}/${maxRetries}), attempting fix...`);
          
          // Progressive fix attempts
          const fixAttempt = async () => {
            try {
              // Stop all tracks and restart
              const tracks = localStream.getTracks();
              
              // Method 1: Refresh video element
              videoElement.srcObject = null;
              await new Promise(resolve => setTimeout(resolve, 100));
              
              videoElement.muted = true;
              videoElement.autoplay = true;
              videoElement.playsInline = true;
              
              videoElement.srcObject = localStream;
              
              // Force metadata load
              videoElement.load();
              
              await videoElement.play();
              
              console.log(`Fix attempt ${retryCount} completed`);
              
              // Verify fix worked
              setTimeout(() => {
                if (videoElement.videoWidth > 0) {
                  console.log('Video fix successful!');
                  retryCount = 0; // Reset counter on success
                }
              }, 500);
              
            } catch (error) {
              console.warn(`Fix attempt ${retryCount} failed:`, error);
            }
          };
          
          fixAttempt();
        } else if (hasValidDimensions) {
          retryCount = 0; // Reset on success
        }
        
        // Log status for debugging
        if (retryCount === 0) {
          console.log(`Video status: ${videoElement.videoWidth}x${videoElement.videoHeight}, playing: ${isPlaying}`);
        }
      }, 1000);
      
      // Additional stream monitoring
      const monitorStream = setInterval(() => {
        if (localStream) {
          const videoTrack = localStream.getVideoTracks()[0];
          if (videoTrack) {
            console.log('Video track status:', {
              enabled: videoTrack.enabled,
              readyState: videoTrack.readyState,
              muted: videoTrack.muted
            });
            
            // Try to fix muted track
            if (videoTrack.muted && videoTrack.enabled) {
              console.warn('Video track is muted, attempting to restart...');
              videoElement.srcObject = null;
              setTimeout(() => {
                videoElement.srcObject = localStream;
                videoElement.play();
              }, 100);
            }
          }
        }
      }, 3000);
      
      return () => {
        clearInterval(checkVideo);
        clearInterval(monitorStream);
      };
    }
  }, [localStream, status]);

  // Check for WebRTC support on mount
  useEffect(() => {
    if (!isWebRTCSupported()) {
      setStatus('error');
      setError('WebRTC is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
    }
  }, []);

  if (!user) {
    return (
      <Card className="mood-card">
        <CardContent className="text-center py-8">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Please log in</h3>
          <p className="text-muted-foreground text-sm mb-4">
            You need to be logged in to access video chat.
          </p>
          <div className="text-xs text-muted-foreground">
            <p>Debug: No user object found</p>
            <p>Auth status: {user === null ? 'null' : 'undefined'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Video Demo Area */}
      <Card className="mood-card lg:col-span-2 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Video Chat Demo
              </CardTitle>
              <CardDescription>
                Test your camera and microphone before connecting
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={
                status === 'demo_ready' ? "default" : 
                status === 'requesting_permission' ? "secondary" : 
                "destructive"
              }>
                {status === 'demo_ready' && 'Camera Ready'}
                {status === 'requesting_permission' && 'Requesting Access...'}
                {status === 'disconnected' && 'Disconnected'}
                {status === 'error' && 'Error'}
              </Badge>
              {user && (
                <div className="text-xs text-muted-foreground">
                  User: {user.email}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={initializeMedia}
                  className="h-6 px-2 text-xs ml-4"
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Device Info Alert */}
          {status === 'disconnected' && mediaDevices.cameras.length > 0 && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Devices Found:</strong> {mediaDevices.cameras.length} camera(s), {mediaDevices.microphones.length} microphone(s)
              </AlertDescription>
            </Alert>
          )}

          {/* WebRTC Support Check */}
          {!isWebRTCSupported() && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Browser Not Supported:</strong> Please use Chrome, Firefox, Safari, or Edge for video chat.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Alert */}
          <Alert className="mb-4">
            <Camera className="h-4 w-4" />
            <AlertDescription>
              <strong>Demo Mode:</strong> This tests your camera and microphone. 
              The full video chat with random matching will be available once the database is updated.
            </AlertDescription>
          </Alert>

          {/* Video Container */}
          <div className="flex-1 relative bg-black rounded-lg overflow-hidden mb-4">
            {status === 'demo_ready' ? (
              <div className="relative w-full h-full">
                {/* Local Video (Full Screen in Demo) */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                  onLoadedMetadata={() => {
                    console.log('Video metadata loaded');
                    if (localVideoRef.current) {
                      console.log('Video dimensions:', localVideoRef.current.videoWidth, 'x', localVideoRef.current.videoHeight);
                    }
                  }}
                  onError={(e) => {
                    console.error('Video element error:', e);
                  }}
                  onCanPlay={() => {
                    console.log('Video can play');
                  }}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                    <VideoOff className="h-16 w-16 text-white" />
                    <p className="text-white ml-4">Video Disabled</p>
                  </div>
                )}
                
                {/* Debug overlay for black screen issues */}
                {isVideoEnabled && localStream && localVideoRef.current && localVideoRef.current.videoWidth === 0 && (
                  <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center text-white text-center p-4">
                    <div>
                      <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
                      <p className="font-medium">Camera Stream Issue</p>
                      <p className="text-sm mt-1">Stream active but no video data</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2 bg-white/20 hover:bg-white/30" 
                        onClick={() => {
                          if (localVideoRef.current && localStream) {
                            localVideoRef.current.srcObject = null;
                            setTimeout(() => {
                              if (localVideoRef.current) {
                                localVideoRef.current.srcObject = localStream;
                                localVideoRef.current.play();
                              }
                            }, 100);
                          }
                        }}
                      >
                        Retry Stream
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Demo Overlay */}
                <div className="absolute top-4 left-4 bg-black/70 rounded-lg px-3 py-2">
                  <p className="text-white text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Demo Mode - Your Camera
                  </p>
                </div>
                
                {/* Status Overlay */}
                <div className="absolute bottom-4 right-4 bg-black/70 rounded-lg px-3 py-2">
                  <p className="text-white text-xs">
                    Video: {isVideoEnabled ? 'ON' : 'OFF'} | Audio: {isAudioEnabled ? 'ON' : 'OFF'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                {status === 'disconnected' && (
                  <div className="text-center text-white">
                    <Camera className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Test Your Camera</h3>
                    <p className="text-sm opacity-75">Click the button below to test your devices</p>
                  </div>
                )}
                {status === 'requesting_permission' && (
                  <div className="text-center text-white">
                    <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                    <h3 className="text-lg font-medium mb-2">Requesting Permission</h3>
                    <p className="text-sm opacity-75">Please allow camera and microphone access</p>
                  </div>
                )}
                {status === 'error' && (
                  <div className="text-center text-white">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                    <h3 className="text-lg font-medium mb-2">Camera Error</h3>
                    <p className="text-sm opacity-75">Please check your camera and microphone</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-4">
            {/* Control Buttons */}
            <div className="flex items-center justify-center gap-4">
              {status === 'disconnected' && (
                <Button onClick={initializeMedia} size="lg" className="px-8" disabled={!isWebRTCSupported()}>
                  <Play className="h-5 w-5 mr-2" />
                  {mediaDevices.cameras.length > 0 ? 'Test Camera & Microphone' : 'Start Camera Test'}
                </Button>
              )}
              
              {status === 'demo_ready' && (
                <>
                  <Button
                    variant={isVideoEnabled ? "default" : "secondary"}
                    size="sm"
                    onClick={toggleVideo}
                    className="min-w-[100px]"
                  >
                    {isVideoEnabled ? (
                      <><Video className="h-4 w-4 mr-2" />Video ON</>
                    ) : (
                      <><VideoOff className="h-4 w-4 mr-2" />Video OFF</>
                    )}
                  </Button>
                  
                  <Button
                    variant={isAudioEnabled ? "default" : "secondary"}
                    size="sm"
                    onClick={toggleAudio}
                    className="min-w-[110px]"
                  >
                    {isAudioEnabled ? (
                      <><Mic className="h-4 w-4 mr-2" />Audio ON</>
                    ) : (
                      <><MicOff className="h-4 w-4 mr-2" />Audio OFF</>
                    )}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={stopMedia}
                  >
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Stop Test
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Force refresh video element
                      if (localVideoRef.current && localStream) {
                        localVideoRef.current.srcObject = null;
                        setTimeout(() => {
                          if (localVideoRef.current && localStream) {
                            localVideoRef.current.srcObject = localStream;
                            localVideoRef.current.play();
                          }
                        }, 100);
                      }
                    }}
                  >
                    Refresh Video
                  </Button>
                </>
              )}
              
              {status === 'error' && (
                <Button onClick={initializeMedia} size="lg" className="px-8">
                  <Camera className="h-5 w-5 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
            
            {/* Status Text */}
            {status === 'demo_ready' && localStream && (
              <div className="text-center text-sm text-muted-foreground">
                <p>✅ Camera and microphone are working!</p>
                <div className="text-xs mt-1 space-y-1">
                  <p>
                    Video tracks: {localStream.getVideoTracks().length} | 
                    Audio tracks: {localStream.getAudioTracks().length}
                  </p>
                  {localStream.getVideoTracks().length > 0 && (
                    <p>
                      Video: {localStream.getVideoTracks()[0].label || 'Unnamed'} 
                      ({localStream.getVideoTracks()[0].enabled ? 'Enabled' : 'Disabled'})
                    </p>
                  )}
                  {localVideoRef.current && (
                    <p>
                      Video Element: {localVideoRef.current.videoWidth}x{localVideoRef.current.videoHeight}
                      {localVideoRef.current.paused ? ' (Paused)' : ' (Playing)'}
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {status === 'requesting_permission' && (
              <div className="text-center text-sm text-muted-foreground">
                <p>Please allow camera and microphone access when prompted...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info & Guidelines */}
      <Card className="mood-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Demo Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Camera className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>This demo tests your camera and microphone</p>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>No data is recorded or transmitted</p>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Full peer-to-peer video chat coming soon</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Next Steps</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Database migration required for full functionality</p>
              <p>• Random user matching will be enabled</p>
              <p>• Safety features and reporting system</p>
              <p>• Anonymous peer-to-peer connections</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Troubleshooting</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Click "Allow" when browser asks for permissions</p>
              <p>• Close other apps using camera/microphone</p>
              <p>• Try refreshing the page if issues persist</p>
              <p>• Check camera/microphone in browser settings</p>
              <p>• Use Chrome, Firefox, Safari, or Edge browser</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Browser Requirements</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• HTTPS required for camera access</p>
              <p>• Modern browser with WebRTC support</p>
              <p>• Allow permissions when prompted</p>
              <p>• Hardware: Camera and microphone</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoVideoChat;