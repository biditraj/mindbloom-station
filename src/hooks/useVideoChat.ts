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
    if (!userId) return;

    try {
      setState(prev => ({ ...prev, connectionStatus: 'connecting' }));

      // Initialize media first
      const stream = await initializeMedia();
      if (!stream) return;

      // Join queue
      await videoChatService.joinQueue(userId);
      
      setState(prev => ({ ...prev, connectionStatus: 'searching' }));

      toast({
        title: "Searching for peer...",
        description: "You've been added to the queue. Please wait."
      });
    } catch (error: any) {
      console.error('Failed to join queue:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: { message: error.message, recoverable: true }
      }));
    }
  }, [userId, initializeMedia, toast]);

  // Handle peer connection
  const createPeerConnection = useCallback(async (isInitiator: boolean, partnerId: string, sessionId: string) => {
    if (!state.localStream) return;

    try {
      const peer = new SimplePeer({
        initiator: isInitiator,
        trickle: false,
        stream: state.localStream
      });

      peer.on('signal', (data) => {
        // Send signaling data through Supabase
        videoChatService.sendSignalingMessage(sessionId, userId!, isInitiator ? 'offer' : 'answer', data);
      });

      peer.on('stream', (remoteStream) => {
        setState(prev => ({
          ...prev,
          remoteStream,
          connectionStatus: 'connected',
          currentPartnerId: partnerId,
          currentSessionId: sessionId
        }));

        toast({
          title: "Connected!",
          description: "You're now connected with a peer."
        });
      });

      peer.on('error', (error) => {
        console.error('Peer connection error:', error);
        setState(prev => ({
          ...prev,
          connectionStatus: 'error',
          error: { message: 'Connection failed', recoverable: true }
        }));
      });

      peer.on('close', () => {
        handleDisconnect();
      });

      peerRef.current = peer;

      // Listen for signaling messages
      const signalChannel = supabase
        .channel(`signaling:${sessionId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'signaling_messages',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          const message = payload.new;
          if (message.sender_id !== userId && peer) {
            peer.signal(message.message_data);
          }
        })
        .subscribe();

      return signalChannel;
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      setState(prev => ({
        ...prev,
        connectionStatus: 'error',
        error: { message: 'Failed to establish connection', recoverable: true }
      }));
    }
  }, [state.localStream, userId, toast]);

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

  // Retry connection
  const retryConnection = useCallback(async () => {
    setState(prev => ({ ...prev, error: null }));
    if (state.connectionStatus === 'permission_denied') {
      await initializeMedia();
    } else {
      await joinQueue();
    }
  }, [state.connectionStatus, initializeMedia, joinQueue]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Listen for matches
  useEffect(() => {
    if (!userId || state.connectionStatus !== 'searching') return;

    const matchChannel = supabase
      .channel('video_chat_matches')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'video_chat_sessions',
        filter: `participant_1_id=eq.${userId},participant_2_id=eq.${userId}`
      }, async (payload) => {
        const session = payload.new;
        if (session.status === 'matched' && session.participant_2_id) {
          const isInitiator = session.participant_1_id === userId;
          const partnerId = isInitiator ? session.participant_2_id : session.participant_1_id;
          
          await createPeerConnection(isInitiator, partnerId, session.session_id);
        }
      })
      .subscribe();

    return () => {
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