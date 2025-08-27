import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface VideoSession {
  id: string;
  session_id: string;
  participant_1_id: string;
  participant_2_id: string | null;
  status: 'waiting' | 'matched' | 'active' | 'ended' | 'reported';
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface QueueEntry {
  id: string;
  student_id: string;
  is_active: boolean;
  preferences: any; // Using any to match Json type from Supabase
  created_at: string;
  updated_at: string;
}

export interface SignalingMessage {
  id: string;
  session_id: string;
  sender_id: string;
  message_type: 'offer' | 'answer' | 'ice-candidate' | 'ready';
  message_data: any;
  created_at: string;
}

export class VideoChatService {
  /**
   * Add user to matchmaking queue - FALLBACK VERSION
   */
  static async joinQueue(studentId: string): Promise<QueueEntry | null> {
    try {
      // First, remove any existing queue entries for this user
      await this.leaveQueue(studentId);

      // For now, simulate queue entry since tables might not exist
      console.log('Adding user to queue:', studentId);
      
      // Try to create queue entry if table exists, otherwise continue
      try {
        const { data, error } = await supabase
          .from('matchmaking_queue')
          .insert({
            student_id: studentId,
            is_active: true,
            preferences: {}
          })
          .select()
          .single();

        if (error) {
          console.warn('Queue table not available, using fallback:', error.message);
          // Return simulated queue entry
          return {
            id: 'fallback-' + Date.now(),
            student_id: studentId,
            is_active: true,
            preferences: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        return data;
      } catch (tableError) {
        console.warn('Matchmaking queue table not found, using fallback mode');
        return {
          id: 'fallback-' + Date.now(),
          student_id: studentId,
          is_active: true,
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error joining queue:', error);
      return null;
    }
  }

  /**
   * Remove user from matchmaking queue - FALLBACK VERSION
   */
  static async leaveQueue(studentId: string): Promise<boolean> {
    try {
      console.log('Removing user from queue:', studentId);
      
      try {
        const { error } = await supabase
          .from('matchmaking_queue')
          .delete()
          .eq('student_id', studentId);

        if (error && !error.message.includes('relation "public.matchmaking_queue" does not exist')) {
          throw error;
        }
        return true;
      } catch (tableError) {
        console.warn('Matchmaking queue table not found, continuing...');
        return true;
      }
    } catch (error) {
      console.error('Error leaving queue:', error);
      return false;
    }
  }

  /**
   * Find a match for the current user
   */
  static async findMatch(studentId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('find_match_for_user', {
        user_id: studentId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error finding match:', error);
      return null;
    }
  }

  /**
   * Create a new video chat session - FALLBACK VERSION
   */
  static async createSession(participant1Id: string, participant2Id: string): Promise<VideoSession | null> {
    try {
      const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      // Remove both users from queue
      await this.leaveQueue(participant1Id);
      await this.leaveQueue(participant2Id);

      console.log('Creating video session:', sessionId);

      try {
        const { data, error } = await supabase
          .from('video_chat_sessions')
          .insert({
            session_id: sessionId,
            participant_1_id: participant1Id,
            participant_2_id: participant2Id,
            status: 'matched'
          })
          .select()
          .single();

        if (error) {
          console.warn('Video chat sessions table not available, using fallback:', error.message);
          // Return simulated session
          return {
            id: 'fallback-' + Date.now(),
            session_id: sessionId,
            participant_1_id: participant1Id,
            participant_2_id: participant2Id,
            status: 'matched',
            started_at: null,
            ended_at: null,
            duration_seconds: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }
        return data;
      } catch (tableError) {
        console.warn('Video chat sessions table not found, using fallback mode');
        return {
          id: 'fallback-' + Date.now(),
          session_id: sessionId,
          participant_1_id: participant1Id,
          participant_2_id: participant2Id,
          status: 'matched',
          started_at: null,
          ended_at: null,
          duration_seconds: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  /**
   * Update session status
   */
  static async updateSessionStatus(
    sessionId: string, 
    status: VideoSession['status'], 
    additionalData?: Partial<VideoSession>
  ): Promise<boolean> {
    try {
      const updateData: any = { status };

      if (status === 'active') {
        updateData.started_at = new Date().toISOString();
      }
      
      if (status === 'ended') {
        updateData.ended_at = new Date().toISOString();
      }

      // Merge any additional data
      Object.assign(updateData, additionalData);

      const { error } = await supabase
        .from('video_chat_sessions')
        .update(updateData)
        .eq('session_id', sessionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating session status:', error);
      return false;
    }
  }

  /**
   * Get current session for a user
   */
  static async getCurrentSession(studentId: string): Promise<VideoSession | null> {
    try {
      const { data, error } = await supabase
        .from('video_chat_sessions')
        .select('*')
        .or(`participant_1_id.eq.${studentId},participant_2_id.eq.${studentId}`)
        .in('status', ['matched', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  /**
   * Send signaling message
   */
  static async sendSignalingMessage(
    sessionId: string,
    senderId: string,
    messageType: SignalingMessage['message_type'],
    messageData: any
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('signaling_messages')
        .insert({
          session_id: sessionId,
          sender_id: senderId,
          message_type: messageType,
          message_data: messageData
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error sending signaling message:', error);
      return false;
    }
  }

  /**
   * Report a user
   */
  static async reportUser(
    sessionId: string,
    reporterId: string,
    reportedUserId: string,
    reason: string,
    description?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('session_reports')
        .insert({
          session_id: sessionId,
          reporter_id: reporterId,
          reported_user_id: reportedUserId,
          reason,
          description: description || null
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error reporting user:', error);
      return false;
    }
  }

  /**
   * Log connection status for debugging
   */
  static async logConnection(
    sessionId: string,
    studentId: string,
    status: 'connecting' | 'connected' | 'disconnected' | 'failed',
    errorMessage?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('connection_logs')
        .insert({
          session_id: sessionId,
          student_id: studentId,
          status,
          error_message: errorMessage || null,
          metadata: metadata || {}
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error logging connection:', error);
      return false;
    }
  }

  /**
   * Get queue position for a user (approximate)
   */
  static async getQueuePosition(studentId: string): Promise<number | null> {
    try {
      // Get all queue entries ordered by creation time
      const { data, error } = await supabase
        .from('matchmaking_queue')
        .select('student_id, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return null;

      // Find the position of the current user
      const position = data.findIndex(entry => entry.student_id === studentId);
      return position >= 0 ? position + 1 : null;
    } catch (error) {
      console.error('Error getting queue position:', error);
      return null;
    }
  }

  /**
   * Clean up old sessions and queue entries
   */
  static async cleanup(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('cleanup_old_queue_entries');
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error during cleanup:', error);
      return false;
    }
  }

  /**
   * Check if user has camera/microphone permissions
   */
  static async checkMediaPermissions(): Promise<{
    camera: boolean;
    microphone: boolean;
    error?: string;
  }> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Stop all tracks immediately
      stream.getTracks().forEach(track => track.stop());

      return {
        camera: true,
        microphone: true
      };
    } catch (error) {
      console.error('Media permissions error:', error);
      
      if (error instanceof Error) {
        return {
          camera: false,
          microphone: false,
          error: error.message
        };
      }

      return {
        camera: false,
        microphone: false,
        error: 'Unknown media access error'
      };
    }
  }

  /**
   * Calculate session duration
   */
  static calculateSessionDuration(startTime: string, endTime?: string): number {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    return Math.floor((end.getTime() - start.getTime()) / 1000);
  }

  /**
   * Subscribe to queue updates for matchmaking
   */
  static subscribeToQueueUpdates(
    studentId: string,
    onMatch: (session: VideoSession) => void
  ) {
    return supabase
      .channel('queue-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'video_chat_sessions',
          filter: `participant_2_id=eq.${studentId}`
        },
        (payload) => {
          const session = payload.new as VideoSession;
          onMatch(session);
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to signaling messages
   */
  static subscribeToSignaling(
    sessionId: string,
    studentId: string,
    onMessage: (message: SignalingMessage) => void
  ) {
    return supabase
      .channel(`signaling-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signaling_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const message = payload.new as SignalingMessage;
          // Only process messages from other users
          if (message.sender_id !== studentId) {
            onMessage(message);
          }
        }
      )
      .subscribe();
  }

  /**
   * Subscribe to session status updates
   */
  static subscribeToSessionUpdates(
    sessionId: string,
    onUpdate: (session: VideoSession) => void
  ) {
    return supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'video_chat_sessions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const session = payload.new as VideoSession;
          onUpdate(session);
        }
      )
      .subscribe();
  }
}

export const videoChatService = {
  joinQueue: VideoChatService.joinQueue,
  leaveQueue: VideoChatService.leaveQueue,
  findMatch: VideoChatService.findMatch,
  createSession: VideoChatService.createSession,
  updateSessionStatus: VideoChatService.updateSessionStatus,
  getCurrentSession: VideoChatService.getCurrentSession,
  sendSignalingMessage: VideoChatService.sendSignalingMessage,
  reportUser: VideoChatService.reportUser,
  logConnection: VideoChatService.logConnection,
  getQueuePosition: VideoChatService.getQueuePosition,
  cleanup: VideoChatService.cleanup,
  checkMediaPermissions: VideoChatService.checkMediaPermissions,
  calculateSessionDuration: VideoChatService.calculateSessionDuration,
  subscribeToQueueUpdates: VideoChatService.subscribeToQueueUpdates,
  subscribeToSignaling: VideoChatService.subscribeToSignaling,
  subscribeToSessionUpdates: VideoChatService.subscribeToSessionUpdates,
  // Add endSession method
  endSession: async (sessionId: string) => {
    return VideoChatService.updateSessionStatus(sessionId, 'ended');
  }
};

export default VideoChatService;