-- Create enum for session status
CREATE TYPE public.session_status AS ENUM ('waiting', 'matched', 'active', 'ended', 'reported');

-- Create enum for connection status  
CREATE TYPE public.connection_status AS ENUM ('connecting', 'connected', 'disconnected', 'failed');

-- Create matchmaking_queue table for user pairing
CREATE TABLE public.matchmaking_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  preferences JSONB DEFAULT '{}', -- Future: age, interests, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_chat_sessions table to track active sessions
CREATE TABLE public.video_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE, -- Used for WebRTC signaling room
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
CREATE TABLE public.signaling_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES public.video_chat_sessions(session_id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- offer, answer, ice-candidate
  message_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_reports table for safety reporting
CREATE TABLE public.session_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.video_chat_sessions(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create connection_logs table for debugging and analytics
CREATE TABLE public.connection_logs (
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
CREATE POLICY "Users can manage their own queue entries" 
ON public.matchmaking_queue 
FOR ALL
USING (student_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

-- Create policies for video_chat_sessions table
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

CREATE POLICY "System can manage sessions" 
ON public.video_chat_sessions 
FOR ALL
USING (true);

-- Create policies for signaling_messages table
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

CREATE POLICY "Users can send signaling messages" 
ON public.signaling_messages 
FOR INSERT
WITH CHECK (sender_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

-- Create policies for session_reports table
CREATE POLICY "Users can create reports for their sessions" 
ON public.session_reports 
FOR INSERT
WITH CHECK (reporter_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

CREATE POLICY "Admins can view all reports" 
ON public.session_reports 
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true) 
  AND role = 'admin'
));

-- Create policies for connection_logs table
CREATE POLICY "Users can create their own connection logs" 
ON public.connection_logs 
FOR INSERT
WITH CHECK (student_id IN (
  SELECT id FROM public.students 
  WHERE anonymous_id = current_setting('app.anonymous_id', true)
));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_matchmaking_queue_updated_at
BEFORE UPDATE ON public.matchmaking_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_chat_sessions_updated_at
BEFORE UPDATE ON public.video_chat_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_matchmaking_queue_active ON public.matchmaking_queue(is_active) WHERE is_active = true;
CREATE INDEX idx_matchmaking_queue_created ON public.matchmaking_queue(created_at);
CREATE INDEX idx_video_chat_sessions_status ON public.video_chat_sessions(status);
CREATE INDEX idx_video_chat_sessions_participants ON public.video_chat_sessions(participant_1_id, participant_2_id);
CREATE INDEX idx_signaling_messages_session ON public.signaling_messages(session_id, created_at);

-- Enable realtime for signaling
ALTER TABLE public.signaling_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.signaling_messages;

-- Enable realtime for session updates
ALTER TABLE public.video_chat_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_chat_sessions;

-- Enable realtime for matchmaking queue
ALTER TABLE public.matchmaking_queue REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;

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