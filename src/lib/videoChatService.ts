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
   * Set the anonymous_id for RLS policies
   */
  private static async setAnonymousIdForRLS(studentId: string): Promise<void> {
    try {
      console.log('🛡️ RLS SETUP: Starting setAnonymousIdForRLS for studentId:', studentId);
      
      // Skip RLS setup for temporary students
      if (studentId.startsWith('temp_')) {
        console.warn('⚠️ RLS SETUP: Skipping RLS setup for temporary student');
        return;
      }
      
      console.log('🛡️ RLS SETUP: Fetching student data for anonymous_id...');
      // First, get the anonymous_id for this student
      const { data: student, error } = await supabase
        .from('students')
        .select('anonymous_id')
        .eq('id', studentId)
        .single();

      console.log('🛡️ RLS SETUP: Student query result:', { student, error });

      if (error || !student) {
        console.warn('⚠️ RLS SETUP: Could not fetch anonymous_id for RLS:', error);
        console.warn('⚠️ RLS SETUP: Student data:', student);
        console.warn('⚠️ RLS SETUP: Error details:', {
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint
        });
        throw new Error('Database access denied. Please check your connection.');
      }

      console.log('🛡️ RLS SETUP: Setting RLS config with anonymous_id:', student.anonymous_id);
      // Set the anonymous_id for RLS policies
      await (supabase as any).rpc('set_config', {
        setting_name: 'app.anonymous_id',
        setting_value: student.anonymous_id
      });
      
      console.log('✅ RLS SETUP: Set anonymous_id for RLS:', student.anonymous_id);
    } catch (error: any) {
      console.error('⚠️ RLS SETUP: RLS setup failed:', error);
      console.error('⚠️ RLS SETUP: Error name:', error.name);
      console.error('⚠️ RLS SETUP: Error message:', error.message);
      console.error('⚠️ RLS SETUP: Error code:', error.code);
      console.error('⚠️ RLS SETUP: Error stack:', error.stack);
      throw new Error('Database access denied. Please check your connection.');
    }
  }

  /**
   * Add user to matchmaking queue - ENHANCED VERSION WITH MATCHING
   */
  static async joinQueue(studentId: string): Promise<QueueEntry | null> {
    try {
      console.log('🚀 VideoChatService.joinQueue called with studentId:', studentId);
      
      // Validate student ID
      if (!studentId || studentId.trim().length === 0) {
        throw new Error('User authentication required. Please log in.');
      }
      
      // Check if this is a temporary student ID (from local-only mode)
      if (studentId.startsWith('temp_')) {
        console.warn('⚠️ Temporary student ID detected. Video chat requires a real database connection.');
        console.warn('⚠️ Student ID:', studentId);
        console.warn('⚠️ This usually happens when:');
        console.warn('   1. Database connection failed during login');
        console.warn('   2. RLS policies are blocking user access');
        console.warn('   3. User is in offline/local mode');
        throw new Error('Video chat is not available in offline mode. Please check your internet connection and try logging in again.');
      }
      
      console.log('🚀 Starting queue join process...');
      console.log('📊 Environment check:', {
        studentId,
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
        timestamp: new Date().toISOString()
      });
      
      // Set up RLS policies before database operations
      console.log('🛡️ Setting up RLS policies...');
      await VideoChatService.setAnonymousIdForRLS(studentId);
      
      // First, remove any existing queue entries for this user
      console.log('🧹 Cleaning up existing queue entries...');
      await this.leaveQueue(studentId);
      console.log('✅ Cleanup completed');

      console.log('🎯 Adding user to queue:', studentId);
      
      // Try to create queue entry
      try {
        console.log('📊 Attempting to insert into matchmaking_queue table...');
        console.log('📊 Insert payload:', {
          student_id: studentId,
          is_active: true,
          preferences: {}
        });
        
        const { data: queueEntry, error } = await supabase
          .from('matchmaking_queue')
          .insert({
            student_id: studentId,
            is_active: true,
            preferences: {}
          })
          .select()
          .single();

        console.log('📊 Supabase response:', { data: queueEntry, error });
        console.log('📊 Response type:', typeof queueEntry);
        console.log('📊 Error type:', typeof error);

        if (error) {
          console.error('❌ Queue table error:', error);
          console.error('❌ Error code:', error.code);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error details:', error.details);
          console.error('❌ Error hint:', error.hint);
          
          // Check for specific error types
          if (error.code === '42P01') {
            throw new Error('Video chat system not initialized. Please contact support.');
          } else if (error.code === '23505') {
            throw new Error('You are already in the queue. Please wait for a match.');
          } else if (error.code === '42501') {
            throw new Error('Database access denied. Please check your connection.');
          } else if (error.code === '23503') {
            throw new Error('User authentication required. Please log in again.');
          } else if (error.code === 'PGRST116') {
            throw new Error('Video chat tables not found. The feature may not be set up yet.');
          } else {
            throw new Error(`Database error (${error.code}): ${error.message}`);
          }
        }

        console.log('✅ Successfully added to queue:', queueEntry);

        // After joining queue, immediately try to find a match
        setTimeout(async () => {
          try {
            console.log('🔍 Attempting initial match search...');
            await this.tryCreateMatch(studentId);
          } catch (matchError) {
            console.warn('⚠️ Initial match attempt failed:', matchError);
          }
        }, 1000); // Small delay to ensure queue entry is processed

        return queueEntry;
      } catch (tableError: any) {
        console.error('❌ Matchmaking queue error:', tableError);
        console.error('❌ TableError name:', tableError.name);
        console.error('❌ TableError message:', tableError.message);
        console.error('❌ TableError stack:', tableError.stack);
        
        // Provide specific error messages based on error type
        if (tableError.message?.includes('relation "public.matchmaking_queue" does not exist')) {
          throw new Error('Video chat system not set up. Please contact support to enable this feature.');
        } else if (tableError.message?.includes('permission denied')) {
          throw new Error('Database permissions error. Please try logging out and back in.');
        } else if (tableError.message?.includes('network')) {
          throw new Error('Network connection error. Please check your internet connection.');
        } else if (tableError.code === 'PGRST116') {
          throw new Error('Database table not found. The video chat feature may not be enabled.');
        } else {
          throw new Error(`Failed to join queue: ${tableError.message || 'Unknown database error'}`);
        }
      }
    } catch (error: any) {
      console.error('❌ GENERIC CATCH: Error joining queue:', error);
      console.error('❌ GENERIC CATCH: Error name:', error.name);
      console.error('❌ GENERIC CATCH: Error message:', error.message);
      console.error('❌ GENERIC CATCH: Error code:', error.code);
      console.error('❌ GENERIC CATCH: Error details:', error.details);
      console.error('❌ GENERIC CATCH: Error stack:', error.stack);
      console.error('❌ GENERIC CATCH: Error constructor:', error.constructor.name);
      console.error('❌ GENERIC CATCH: Full error object:', JSON.stringify(error, null, 2));
      
      // If it's already a formatted error, re-throw it
      if (error.message && (error.message.includes('Video chat system') || error.message.includes('Database') || error.message.includes('authentication') || error.message.includes('offline mode'))) {
        console.log('🔄 GENERIC CATCH: Re-throwing formatted error:', error.message);
        throw error;
      }
      
      // Log why we're falling back to generic error
      console.error('❌ GENERIC CATCH: No specific error pattern matched, using generic error');
      console.error('❌ GENERIC CATCH: Available error message for pattern matching:', error.message);
      
      // Otherwise, provide a generic error but include the original error details for debugging
      throw new Error(`Failed to join matchmaking queue. Please check your connection and try again. (Debug: ${error.message || error.name || 'Unknown error'})`);
    }
  }

  /**
   * Handle fallback queue when database is not available
   */
  private static handleFallbackQueue(studentId: string): QueueEntry {
    return {
      id: 'fallback-' + Date.now(),
      student_id: studentId,
      is_active: true,
      preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Try to create a match for the given user
   */
  static async tryCreateMatch(studentId: string): Promise<VideoSession | null> {
    try {
      console.log('🔍 Trying to create match for user:', studentId);

      // Skip matching for temporary students
      if (studentId.startsWith('temp_')) {
        console.log('Skipping match creation for temporary student');
        return null;
      }
      
      // Set up RLS policies before database operations
      await VideoChatService.setAnonymousIdForRLS(studentId);

      // Check if tables exist before querying
      try {
        // Find the oldest waiting user that's not the current user
        const { data: waitingUsers, error: queueError } = await supabase
          .from('matchmaking_queue')
          .select('student_id, created_at')
          .eq('is_active', true)
          .neq('student_id', studentId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (queueError) {
          console.error('❌ Error querying queue:', queueError);
          
          if (queueError.code === '42P01') {
            console.warn('⚠️ Matchmaking queue table does not exist');
            return null;
          }
          
          throw queueError;
        }

        if (!waitingUsers || waitingUsers.length === 0) {
          console.log('🔍 No waiting users found for matching');
          return null;
        }

        const matchedUserId = waitingUsers[0].student_id;
        console.log('✨ Found match:', studentId, 'with', matchedUserId);

        // Create a session for the matched users
        const session = await this.createSession(studentId, matchedUserId);
        
        if (session) {
          console.log('✅ Match created successfully:', session.session_id);
          
          // Notify both users about the match by updating the session
          await this.updateSessionStatus(session.session_id, 'matched');
          
          return session;
        }

        return null;
      } catch (tableError: any) {
        console.warn('⚠️ Table access error in tryCreateMatch:', tableError.message);
        
        if (tableError.message?.includes('relation') && tableError.message?.includes('does not exist')) {
          console.log('📄 Video chat tables not set up yet');
          return null;
        }
        
        throw tableError;
      }
    } catch (error: any) {
      console.error('❌ Error creating match:', error);
      return null;
    }
  }

  /**
   * Remove user from matchmaking queue - ENHANCED VERSION
   */
  static async leaveQueue(studentId: string): Promise<boolean> {
    try {
      console.log('Removing user from queue:', studentId);
      
      // Skip database operations for temporary students
      if (studentId.startsWith('temp_')) {
        console.log('Skipping queue leave for temporary student');
        return true;
      }
      
      // Set up RLS policies before database operations
      await VideoChatService.setAnonymousIdForRLS(studentId);
      
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
      throw new Error('Failed to leave matchmaking queue. Please try again.');
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
   * Create a new video chat session - ENHANCED VERSION WITH ERROR HANDLING
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
          throw new Error('Failed to create video session in database');
        }
        
        console.log('Session created in database:', data);
        return data;
      } catch (tableError) {
        console.error('Video chat sessions table error:', tableError);
        throw new Error('Database connection failed. Please check your internet connection and try again.');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Update session status - ENHANCED WITH ERROR HANDLING
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

      if (error) {
        console.error('Error updating session status:', error);
        throw new Error(`Failed to update session status: ${error.message}`);
      }
      
      console.log(`Session ${sessionId} status updated to:`, status);
      return true;
    } catch (error) {
      console.error('Error updating session status:', error);
      throw error;
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
  tryCreateMatch: VideoChatService.tryCreateMatch,
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