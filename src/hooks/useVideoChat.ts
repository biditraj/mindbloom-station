import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { videoChatService } from '@/lib/videoChatService';
import { useToast } from '@/components/ui/use-toast';
import SimplePeer from 'simple-peer';

export type ConnectionStatus = 
  | 'disconnected' 
  | 'connecting' 
  | 'searching' 
  | 'connected' 
  | 'error' 
  | 'permission_denied';

interface VideoError {
  message: string;
  recoverable: boolean;
}

interface VideoChatState {
  connectionStatus: ConnectionStatus;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  error: VideoError | null;
  queuePosition: number | null;
  currentSessionId: string | null;
  currentPartnerId: string | null;
}

export const useVideoChat = (userId: string | null) => {
  const { toast } = useToast();
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const [state, setState] = useState<VideoChatState>({
    connectionStatus: 'disconnected',
    localStream: null,
    remoteStream: null,
    isVideoEnabled: true,
    isAudioEnabled: true,
    error: null,
    queuePosition: null,
    currentSessionId: null,
    currentPartnerId: null
  });

  // Initialize media stream
  const initializeMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));

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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setState(prev => ({ 
        ...prev, 
        localStream: stream,
        connectionStatus: 'disconnected' 
      }));

      return stream;
    } catch (error: any) {
      console.error('Media access error:', error);
      
      let errorMessage = 'Failed to access camera or microphone';
      let status: ConnectionStatus = 'error';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = 'Camera and microphone access denied. Please allow permissions and try again.';
        status = 'permission_denied';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect devices and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera or microphone is being used by another application.';
      }

      setState(prev => ({
        ...prev,
        connectionStatus: status,
        error: { message: errorMessage, recoverable: true }
      }));

      return null;
    }
  }, []);

  // Join matchmaking queue
  const joinQueue = useCallback(async () => {
    if (!userId) {
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: { message: 'User authentication required', recoverable: false }
      }));
      return;
    }

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting', error: null }));

      // Initialize media first
      const stream = await initializeMedia();
      if (!stream) return;

      // Join queue with enhanced error handling
      try {
        await videoChatService.joinQueue(userId);
        
        setState(prev => ({ ...prev, connectionStatus: 'searching' }));

        toast({
          title: "Searching for peer...",
          description: "You've been added to the queue. Please wait while we find a match."
        });

        // Set a timeout to prevent infinite searching
        setTimeout(() => {
          if (state.connectionStatus === 'searching') {
            setState(prev => ({
              ...prev,
              connectionStatus: 'error',
              error: { 
                message: 'No peers available at the moment. Please try again later.', 
                recoverable: true 
              }
            }));
          }
        }, 60000); // 1 minute timeout

      } catch (queueError: any) {
        console.error('Queue join failed:', queueError);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: { 
            message: queueError.message || 'Failed to join queue. Please check your connection.', 
            recoverable: true 
          }
        }));
      }
    } catch (error: any) {
      console.error('Failed to join queue:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: { 
          message: 'Connection failed. Please check your internet connection and try again.', 
          recoverable: true 
        }
      }));
    }
  }, [userId, initializeMedia, toast, state.connectionStatus]);

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      // Stop peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }

      // Stop media streams
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }

      // End session if exists
      if (state.currentSessionId) {
        await videoChatService.endSession(state.currentSessionId);
      }

      // Leave queue
      if (userId) {
        await videoChatService.leaveQueue(userId);
      }

      setState({
        connectionStatus: 'disconnected',
        localStream: null,
        remoteStream: null,
        isVideoEnabled: true,
        isAudioEnabled: true,
        error: null,
        queuePosition: null,
        currentSessionId: null,
        currentPartnerId: null
      });

      toast({
        title: "Disconnected",
        description: "You've been disconnected from the video chat."
      });
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  }, [state.localStream, state.currentSessionId, userId, toast]);

  // Handle peer connection
  const createPeerConnection = useCallback(async (isInitiator: boolean, partnerId: string, sessionId: string) => {
    if (!state.localStream) {
      console.error('No local stream available for peer connection');
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: { message: 'Camera/microphone not available', recoverable: true }
      }));
      return;
    }

    try {
      console.log('Creating peer connection:', { isInitiator, partnerId, sessionId });
      
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false,
        stream: state.localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (state.connectionStatus !== 'connected') {
          peer.destroy();
          setState(prev => ({
            ...prev,
            connectionStatus: 'error',
            error: { message: 'Connection timeout. Please try again.', recoverable: true }
          }));
        }
      }, 30000); // 30 second timeout

      peer.on('signal', (data) => {
        console.log('Sending signaling data:', data);
        // Send signaling data through Supabase
        videoChatService.sendSignalingMessage(sessionId, userId!, isInitiator ? 'offer' : 'answer', data);
      });

      peer.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        clearTimeout(connectionTimeout);
        
        setState(prev => ({
          ...prev,
          remoteStream,
          connectionStatus: 'connected',
          currentPartnerId: partnerId,
          currentSessionId: sessionId,
          error: null
        }));

        toast({
          title: "Connected!",
          description: "You're now connected with a peer for video chat."
        });
      });

      peer.on('error', (error) => {
        console.error('Peer connection error:', error);
        clearTimeout(connectionTimeout);
        
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: { 
            message: 'Connection failed. Please check your network and try again.', 
            recoverable: true 
          }
        }));
      });

      peer.on('close', () => {
        console.log('Peer connection closed');
        clearTimeout(connectionTimeout);
        // Don't call handleDisconnect here to avoid circular dependency
        setState(prev => ({
          ...prev,
          connectionStatus: 'disconnected',
          remoteStream: null,
          currentPartnerId: null,
          currentSessionId: null
        }));
      });

      peerRef.current = peer;

      // Listen for signaling messages with error handling
      const signalChannel = supabase
        .channel(`signaling:${sessionId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'signaling_messages',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          try {
            const message = payload.new;
            if (message.sender_id !== userId && peer && !peer.destroyed) {
              console.log('Received signaling message:', message);
              peer.signal(message.message_data);
            }
          } catch (signalError) {
            console.error('Error processing signaling message:', signalError);
          }
        })
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') {
            console.error('Signaling subscription error');
            setState(prev => ({
              ...prev,
              connectionStatus: 'error',
              error: { message: 'Real-time connection failed', recoverable: true }
            }));
          }
        });

      return signalChannel;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: { message: 'Failed to establish connection. Please try again.', recoverable: true }
      }));
    }
  }, [state.localStream, userId, toast, state.connectionStatus]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (state.localStream) {
      const videoTracks = state.localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setState(prev => ({ ...prev, isVideoEnabled: !prev.isVideoEnabled }));
    }
  }, [state.localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (state.localStream) {
      const audioTracks = state.localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setState(prev => ({ ...prev, isAudioEnabled: !prev.isAudioEnabled }));
    }
  }, [state.localStream]);

  // Skip user (find new match)
  const skipUser = useCallback(async () => {
    if (state.currentSessionId) {
      await videoChatService.endSession(state.currentSessionId);
      handleDisconnect();
      // Rejoin queue after a brief delay
      setTimeout(() => {
        joinQueue();
      }, 1000);
    }
  }, [state.currentSessionId, handleDisconnect, joinQueue]);

  // Report user
  const reportUser = useCallback(async (reason: string, description?: string) => {
    if (!state.currentSessionId || !state.currentPartnerId || !userId) return false;

    try {
      await videoChatService.reportUser(
        state.currentSessionId,
        userId,
        state.currentPartnerId,
        reason,
        description
      );

      toast({
        title: "Report Submitted",
        description: "Thank you for helping keep our community safe."
      });

      // End session after reporting
      await handleDisconnect();
      return true;
    } catch (error) {
      console.error('Report error:', error);
      toast({
        title: "Report Failed",
        description: "Unable to submit report. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  }, [state.currentSessionId, state.currentPartnerId, userId, toast, handleDisconnect]);

  // Retry connection with enhanced error handling
  const retryConnection = useCallback(async () => {
    console.log('Retrying connection, current status:', state.connectionStatus);
    
    setState(prev => ({ ...prev, error: null }));
    
    try {
      if (state.connectionStatus === 'permission_denied') {
        console.log('Retrying media initialization...');
        const stream = await initializeMedia();
        if (stream) {
          toast({
            title: "Permissions granted",
            description: "Camera and microphone access restored. You can now join the queue."
          });
        }
      } else {
        console.log('Retrying queue join...');
        // First disconnect any existing connections
        await handleDisconnect();
        
        // Wait a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to join queue again
        await joinQueue();
      }
    } catch (error: any) {
      console.error('Retry failed:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: { 
          message: error.message || 'Retry failed. Please check your connection and try again.', 
          recoverable: true 
        }
      }));
    }
  }, [state.connectionStatus, initializeMedia, handleDisconnect, joinQueue, toast]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Listen for matches with enhanced error handling
  useEffect(() => {
    if (!userId || state.connectionStatus !== 'searching') return;

    console.log('Setting up match listener for user:', userId);

    // Listen for both participant_1 and participant_2 matches
    const matchChannel = supabase
      .channel('video_chat_matches')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'video_chat_sessions'
      }, async (payload) => {
        try {
          const session = payload.new;
          console.log('New session detected:', session);
          
          // Check if this user is involved in the session
          if (session.participant_1_id === userId || session.participant_2_id === userId) {
            console.log('Match found for current user:', session);
            
            if (session.status === 'matched' && session.participant_2_id) {
              const isInitiator = session.participant_1_id === userId;
              const partnerId = isInitiator ? session.participant_2_id : session.participant_1_id;
              
              console.log('Creating peer connection:', { isInitiator, partnerId });
              await createPeerConnection(isInitiator, partnerId, session.session_id);
            }
          }
        } catch (error) {
          console.error('Error processing match:', error);
          setState(prev => ({
            ...prev,
            connectionStatus: 'error',
            error: { message: 'Failed to process match. Please try again.', recoverable: true }
          }));
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_chat_sessions'
      }, async (payload) => {
        try {
          const session = payload.new;
          console.log('Session updated:', session);
          
          // Check if this user is involved in the session
          if ((session.participant_1_id === userId || session.participant_2_id === userId) &&
              session.status === 'matched' && session.participant_2_id) {
            console.log('Updated session match found:', session);
            
            const isInitiator = session.participant_1_id === userId;
            const partnerId = isInitiator ? session.participant_2_id : session.participant_1_id;
            
            await createPeerConnection(isInitiator, partnerId, session.session_id);
          }
        } catch (error) {
          console.error('Error processing session update:', error);
          setState(prev => ({
            ...prev,
            connectionStatus: 'error',
            error: { message: 'Failed to process session update. Please try again.', recoverable: true }
          }));
        }
      })
      .subscribe((status) => {
        console.log('Match subscription status:', status);
        if (status !== 'SUBSCRIBED') {
          console.error('Match subscription failed');
          setState(prev => ({
            ...prev,
            connectionStatus: 'error',
            error: { message: 'Real-time matching service unavailable', recoverable: true }
          }));
        }
      });

    return () => {
      console.log('Cleaning up match listener');
      supabase.removeChannel(matchChannel);
    };
  }, [userId, state.connectionStatus, createPeerConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      if (state.localStream) {
        state.localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Periodic queue monitoring and matching attempts
  useEffect(() => {
    if (!userId || state.connectionStatus !== 'searching') return;

    console.log('Starting periodic matching attempts for user:', userId);
    
    const matchingInterval = setInterval(async () => {
      try {
        console.log('Attempting to find match...');
        
        // Try to create a match
        const session = await videoChatService.tryCreateMatch(userId);
        
        if (session) {
          console.log('Match created via periodic attempt:', session);
          clearInterval(matchingInterval);
        } else {
          console.log('No match found, will try again...');
        }
      } catch (error) {
        console.error('Error in periodic matching attempt:', error);
      }
    }, 5000); // Try every 5 seconds

    // Clear interval when component unmounts or status changes
    return () => {
      console.log('Clearing periodic matching interval');
      clearInterval(matchingInterval);
    };
  }, [userId, state.connectionStatus]);

  // Monitor queue position
  useEffect(() => {
    if (!userId || state.connectionStatus !== 'searching') return;

    const positionInterval = setInterval(async () => {
      try {
        const position = await videoChatService.getQueuePosition(userId);
        if (position !== null && position !== state.queuePosition) {
          setState(prev => ({ ...prev, queuePosition: position }));
        }
      } catch (error) {
        console.error('Error getting queue position:', error);
      }
    }, 3000); // Update every 3 seconds

    return () => {
      clearInterval(positionInterval);
    };
  }, [userId, state.connectionStatus, state.queuePosition]);

  return {
    state,
    actions: {
      joinQueue,
      handleDisconnect,
      toggleVideo,
      toggleAudio,
      skipUser,
      reportUser,
      retryConnection,
      clearError
    }
  };
};

export default useVideoChat;