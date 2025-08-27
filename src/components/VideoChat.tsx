import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useVideoChat } from '@/hooks/useVideoChat';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  PhoneOff, 
  SkipForward, 
  Flag, 
  Users,
  Shield,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Clock
} from 'lucide-react';

const VideoChat: React.FC = () => {
  // Hooks
  const { student } = useAuth();
  const { state, actions } = useVideoChat(student?.id || null);
  
  // Local state for UI
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Update video elements when streams change
  React.useEffect(() => {
    if (localVideoRef.current && state.localStream) {
      localVideoRef.current.srcObject = state.localStream;
    }
  }, [state.localStream]);

  React.useEffect(() => {
    if (remoteVideoRef.current && state.remoteStream) {
      remoteVideoRef.current.srcObject = state.remoteStream;
    }
  }, [state.remoteStream]);

  // Handle report submission
  const handleReportSubmit = async () => {
    if (!reportReason) return;
    
    const success = await actions.reportUser(reportReason, reportDescription);
    if (success) {
      setShowReportDialog(false);
      setReportReason('');
      setReportDescription('');
    }
  };

  if (!student) {
    return (
      <Card className="mood-card">
        <CardContent className="text-center py-8">
          <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-medium mb-2">Please log in</h3>
          <p className="text-muted-foreground text-sm">
            You need to be logged in to access video chat.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
      {/* Video Chat Area */}
      <Card className="mood-card lg:col-span-2 flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Video Chat
              </CardTitle>
              <CardDescription>
                Anonymous video support with peers
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                state.connectionStatus === 'connected' ? "default" : 
                state.connectionStatus === 'connecting' || state.connectionStatus === 'searching' ? "secondary" : 
                state.connectionStatus === 'permission_denied' ? "destructive" :
                "destructive"
              }>
                {state.connectionStatus === 'connected' && 'Connected'}
                {state.connectionStatus === 'connecting' && 'Connecting...'}
                {state.connectionStatus === 'searching' && (
                  <div className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Finding peer...
                    {state.queuePosition && <span className="ml-1">#{state.queuePosition}</span>}
                  </div>
                )}
                {state.connectionStatus === 'disconnected' && 'Disconnected'}
                {state.connectionStatus === 'error' && 'Error'}
                {state.connectionStatus === 'permission_denied' && 'Permission Denied'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col">
          {/* Error Alert */}
          {state.error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{state.error.message}</span>
                <div className="flex gap-2 ml-4">
                  {state.error.recoverable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={actions.retryConnection}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={actions.clearError}
                    className="h-6 px-2 text-xs"
                  >
                    Dismiss
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Queue Status */}
          {state.connectionStatus === 'searching' && state.queuePosition && (
            <Alert className="mb-4">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                You are #{state.queuePosition} in the queue. Estimated wait time: {Math.max(1, state.queuePosition * 0.5)} minutes.
              </AlertDescription>
            </Alert>
          )}

          {/* Video Container */}
          <div className="flex-1 relative bg-black rounded-lg overflow-hidden mb-4">
            {state.connectionStatus === 'connected' ? (
              <>
                {/* Remote Video (Main) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* Local Video (Picture-in-Picture) */}
                <div className="absolute top-4 right-4 w-32 h-24 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  {!state.isVideoEnabled && (
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                      <VideoOff className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                {state.connectionStatus === 'disconnected' && (
                  <div className="text-center text-white">
                    <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Ready to connect</h3>
                    <p className="text-sm opacity-75">Click start to find a peer</p>
                  </div>
                )}
                {(state.connectionStatus === 'searching' || state.connectionStatus === 'connecting') && (
                  <div className="text-center text-white">
                    <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin" />
                    <h3 className="text-lg font-medium mb-2">
                      {state.connectionStatus === 'searching' ? 'Finding a peer...' : 'Connecting...'}
                    </h3>
                    <p className="text-sm opacity-75">
                      {state.connectionStatus === 'searching' && state.queuePosition 
                        ? `Position in queue: #${state.queuePosition}` 
                        : 'This may take a moment'
                      }
                    </p>
                  </div>
                )}
                {(state.connectionStatus === 'error' || state.connectionStatus === 'permission_denied') && (
                  <div className="text-center text-white">
                    <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-400" />
                    <h3 className="text-lg font-medium mb-2">
                      {state.connectionStatus === 'permission_denied' ? 'Permission Required' : 'Connection Error'}
                    </h3>
                    <p className="text-sm opacity-75 mb-4">
                      {state.connectionStatus === 'permission_denied' 
                        ? 'Please allow camera and microphone access'
                        : 'Please check your connection and try again'
                      }
                    </p>
                    {state.error?.recoverable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={actions.retryConnection}
                        className="bg-white/10 hover:bg-white/20 border-white/20"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {state.connectionStatus === 'disconnected' && (
              <Button onClick={actions.joinQueue} size="lg" className="px-8">
                <Video className="h-5 w-5 mr-2" />
                Start Video Chat
              </Button>
            )}
            
            {(state.connectionStatus === 'searching' || state.connectionStatus === 'connecting' || state.connectionStatus === 'connected') && (
              <>
                <Button
                  variant={state.isVideoEnabled ? "default" : "secondary"}
                  size="sm"
                  onClick={actions.toggleVideo}
                >
                  {state.isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>
                
                <Button
                  variant={state.isAudioEnabled ? "default" : "secondary"}
                  size="sm"
                  onClick={actions.toggleAudio}
                >
                  {state.isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                
                {state.connectionStatus === 'connected' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={actions.skipUser}
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Skip
                    </Button>
                    
                    <AlertDialog open={showReportDialog} onOpenChange={setShowReportDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Flag className="h-4 w-4 mr-2" />
                          Report
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Report User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Please select a reason for reporting this user.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-4">
                          <Select value={reportReason} onValueChange={setReportReason}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inappropriate_behavior">Inappropriate behavior</SelectItem>
                              <SelectItem value="harassment">Harassment</SelectItem>
                              <SelectItem value="spam">Spam</SelectItem>
                              <SelectItem value="inappropriate_content">Inappropriate content</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Additional details (optional)"
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleReportSubmit} disabled={!reportReason}>
                            Submit Report
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={actions.handleDisconnect}
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Chat
                </Button>
              </>
            )}
            
            {(state.connectionStatus === 'error' || state.connectionStatus === 'permission_denied') && (
              <Button onClick={actions.retryConnection} size="lg" className="px-8">
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Guidelines & Safety */}
      <Card className="mood-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            Safety Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Your identity remains completely anonymous</p>
            </div>
            <div className="flex items-start gap-2">
              <Video className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Video calls are not recorded or monitored</p>
            </div>
            <div className="flex items-start gap-2">
              <Flag className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Report inappropriate behavior immediately</p>
            </div>
            <div className="flex items-start gap-2">
              <SkipForward className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p>Skip to the next person anytime</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Be Respectful</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>• Keep conversations supportive</p>
              <p>• Respect others' privacy</p>
              <p>• No inappropriate content</p>
              <p>• Be kind and understanding</p>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-sm mb-2">Crisis Resources</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>Crisis Text Line: Text HOME to 741741</p>
              <p>National Suicide Prevention Lifeline: 988</p>
              <p>Campus Counseling Services: Available 24/7</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoChat;