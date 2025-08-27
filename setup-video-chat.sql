-- Video Chat Database Setup Script
-- Run this in your Supabase SQL Editor to enable full video chat functionality

-- Create enum for session status
DO $$ BEGIN
    CREATE TYPE public.session_status AS ENUM ('waiting', 'matched', 'active', 'ended', 'reported');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create enum for connection status  
DO $$ BEGIN
    CREATE TYPE public.connection_status AS ENUM ('connecting', 'connected', 'disconnected', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create matchmaking_queue table for user pairing
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_chat_sessions table to track active sessions
CREATE TABLE IF NOT EXISTS public.video_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  participant_1_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  participant_2_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  status session_status NOT NULL DEFAULT 'waiting',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create signaling_messages table for WebRTC signaling
CREATE TABLE IF NOT EXISTS public.signaling_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.video_chat_sessions(session_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL,
  message_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_reports table for safety reporting
CREATE TABLE IF NOT EXISTS public.session_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.video_chat_sessions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create connection_logs table for debugging and analytics
CREATE TABLE IF NOT EXISTS public.connection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.video_chat_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status connection_status NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on new tables
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signaling_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for matchmaking_queue table
DROP POLICY IF EXISTS "Users can manage their own queue entries" ON public.matchmaking_queue;
CREATE POLICY "Users can manage their own queue entries" 
ON public.matchmaking_queue 
FOR ALL
USING (student_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

-- Create policies for video_chat_sessions table
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.video_chat_sessions;
CREATE POLICY "Users can view their own sessions" 
ON public.video_chat_sessions 
FOR SELECT
USING (
  participant_1_id IN (
    SELECT id FROM public.students 
    WHERE anonymous_id = current_setting('app.anonymous_id', true)
  ) OR 
  participant_2_id IN (
    SELECT id FROM public.students 
    WHERE anonymous_id = current_setting('app.anonymous_id', true)
  )
);

DROP POLICY IF EXISTS "System can manage sessions" ON public.video_chat_sessions;
CREATE POLICY "System can manage sessions" 
ON public.video_chat_sessions 
FOR ALL
USING (true);

-- Create policies for signaling_messages table
DROP POLICY IF EXISTS "Users can view signaling for their sessions" ON public.signaling_messages;
CREATE POLICY "Users can view signaling for their sessions" 
ON public.signaling_messages 
FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM public.video_chat_sessions 
    WHERE participant_1_id IN (
      SELECT id FROM public.students 
      WHERE anonymous_id = current_setting('app.anonymous_id', true)
    ) OR participant_2_id IN (
      SELECT id FROM public.students 
      WHERE anonymous_id = current_setting('app.anonymous_id', true)
    )
  )
);

DROP POLICY IF EXISTS "Users can send signaling messages" ON public.signaling_messages;
CREATE POLICY "Users can send signaling messages" 
ON public.signaling_messages 
FOR INSERT
WITH CHECK (sender_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

-- Create policies for session_reports table
DROP POLICY IF EXISTS "Users can create reports for their sessions" ON public.session_reports;
CREATE POLICY "Users can create reports for their sessions" 
ON public.session_reports 
FOR INSERT
WITH CHECK (reporter_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

DROP POLICY IF EXISTS "Admins can view all reports" ON public.session_reports;
CREATE POLICY "Admins can view all reports" 
ON public.session_reports 
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true) 
  AND role = 'admin'
));

-- Create policies for connection_logs table
DROP POLICY IF EXISTS "Users can create their own connection logs" ON public.connection_logs;
CREATE POLICY "Users can create their own connection logs" 
ON public.connection_logs 
FOR INSERT
WITH CHECK (student_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

-- Create triggers for automatic timestamp updates (only if update_updated_at_column function exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        DROP TRIGGER IF EXISTS update_matchmaking_queue_updated_at ON public.matchmaking_queue;
        CREATE TRIGGER update_matchmaking_queue_updated_at
        BEFORE UPDATE ON public.matchmaking_queue
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_video_chat_sessions_updated_at ON public.video_chat_sessions;
        CREATE TRIGGER update_video_chat_sessions_updated_at
        BEFORE UPDATE ON public.video_chat_sessions
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_active ON public.matchmaking_queue(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_created ON public.matchmaking_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_video_chat_sessions_status ON public.video_chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_video_chat_sessions_participants ON public.video_chat_sessions(participant_1_id, participant_2_id);
CREATE INDEX IF NOT EXISTS idx_signaling_messages_session ON public.signaling_messages(session_id, created_at);

-- Enable realtime for signaling (only if realtime is enabled)
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.signaling_messages REPLICA IDENTITY FULL;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.signaling_messages;
    EXCEPTION
        WHEN OTHERS THEN 
            -- Realtime not available, continue without it
            NULL;
    END;
    
    BEGIN
        ALTER TABLE public.video_chat_sessions REPLICA IDENTITY FULL;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.video_chat_sessions;
    EXCEPTION
        WHEN OTHERS THEN 
            NULL;
    END;
    
    BEGIN
        ALTER TABLE public.matchmaking_queue REPLICA IDENTITY FULL;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;
    EXCEPTION
        WHEN OTHERS THEN 
            NULL;
    END;
END $$;

-- Create function to clean up old queue entries
CREATE OR REPLACE FUNCTION public.cleanup_old_queue_entries()
RETURNS void AS $$
BEGIN
  -- Remove queue entries older than 1 hour
  DELETE FROM public.matchmaking_queue 
  WHERE created_at < NOW() - INTERVAL '1 hour';
  
  -- Remove ended sessions older than 24 hours
  DELETE FROM public.video_chat_sessions 
  WHERE status = 'ended' AND ended_at < NOW() - INTERVAL '24 hours';
  
  -- Remove old signaling messages (older than 1 hour)
  DELETE FROM public.signaling_messages 
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create function to find a match for a user
CREATE OR REPLACE FUNCTION public.find_match_for_user(user_id UUID)
RETURNS UUID AS $$
DECLARE
  match_id UUID;
BEGIN
  -- Find the oldest waiting user that's not the current user
  SELECT student_id INTO match_id
  FROM public.matchmaking_queue 
  WHERE is_active = true 
    AND student_id != user_id
  ORDER BY created_at ASC
  LIMIT 1;
  
  RETURN match_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$ BEGIN
    RAISE NOTICE 'Video chat database setup complete! You can now switch back to the full VideoChat component.';
END $$;