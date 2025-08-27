-- Add ai_confidence column to mood_logs table
-- This will store the prediction confidence score from the AI model (0.0 to 1.0)

ALTER TABLE public.mood_logs 
ADD COLUMN ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0.0 AND ai_confidence <= 1.0);

-- Add index for better query performance when filtering by confidence
CREATE INDEX idx_mood_logs_ai_confidence ON public.mood_logs(ai_confidence);

-- Add comment for documentation
COMMENT ON COLUMN public.mood_logs.ai_confidence IS 'AI model prediction confidence score (0.0 to 1.0)';