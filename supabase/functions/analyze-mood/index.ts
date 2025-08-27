import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MoodAnalysisRequest {
  mood_log_id: string;
  mood_level: string;
  note?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { mood_log_id, mood_level, note }: MoodAnalysisRequest = await req.json()

    // Perform AI analysis based on mood level and note
    const analysis = await analyzeMood(mood_level, note)

    // Update the mood log with AI insights
    const { error: updateError } = await supabaseClient
      .from('mood_logs')
      .update({
        ai_sentiment: analysis.sentiment,
        ai_stress_level: analysis.stressLevel
      })
      .eq('id', mood_log_id)

    if (updateError) {
      throw updateError
    }

    // Generate personalized recommendations
    const recommendations = await generateRecommendations(mood_level, analysis.stressLevel)

    // Insert recommendations
    for (const rec of recommendations) {
      await supabaseClient
        .from('recommendations')
        .insert({
          mood_log_id,
          title: rec.title,
          description: rec.description,
          content_url: rec.content_url,
          type: rec.type
        })
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis,
        recommendations: recommendations.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in analyze-mood function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})

async function analyzeMood(moodLevel: string, note?: string) {
  const level = parseInt(moodLevel)
  
  // Simple AI-like analysis based on mood level and note content
  let sentiment = ""
  let stressLevel = 1

  // Analyze based on mood level
  if (level <= 2) {
    sentiment = "You seem to be experiencing some difficult emotions today. Remember that it's normal to have ups and downs, and reaching out for support is a sign of strength."
    stressLevel = level === 1 ? 5 : 4
  } else if (level === 3) {
    sentiment = "You're feeling okay today, which is perfectly normal. Consider some self-care activities to boost your mood a bit more."
    stressLevel = 3
  } else if (level === 4) {
    sentiment = "You're feeling good today! This is a great foundation to build on. Keep up the positive momentum."
    stressLevel = 2
  } else {
    sentiment = "You're feeling fantastic today! Your positive energy can be contagious - consider sharing some encouragement with peers."
    stressLevel = 1
  }

  // Enhance analysis if there's a note
  if (note && note.trim()) {
    const noteWords = note.toLowerCase()
    
    // Check for stress indicators
    const stressKeywords = ['stress', 'anxious', 'worried', 'overwhelmed', 'pressure', 'exam', 'deadline']
    const positiveKeywords = ['happy', 'good', 'great', 'excited', 'grateful', 'accomplished']
    const sadKeywords = ['sad', 'depressed', 'lonely', 'tired', 'exhausted', 'hopeless']
    
    const hasStressKeywords = stressKeywords.some(keyword => noteWords.includes(keyword))
    const hasPositiveKeywords = positiveKeywords.some(keyword => noteWords.includes(keyword))
    const hasSadKeywords = sadKeywords.some(keyword => noteWords.includes(keyword))
    
    if (hasStressKeywords) {
      stressLevel = Math.min(5, stressLevel + 1)
      sentiment += " I noticed you mentioned feeling stressed. Try some breathing exercises or take a short break."
    }
    
    if (hasSadKeywords) {
      sentiment += " It sounds like you're going through a tough time. Consider reaching out to a friend or counselor."
    }
    
    if (hasPositiveKeywords && level >= 3) {
      sentiment += " I can see you're focusing on positive aspects, which is wonderful for your mental health!"
    }
  }

  return {
    sentiment,
    stressLevel: Math.max(1, Math.min(5, stressLevel))
  }
}

async function generateRecommendations(moodLevel: string, stressLevel: number) {
  const level = parseInt(moodLevel)
  const recommendations = []

  // Stress-based recommendations
  if (stressLevel >= 4) {
    recommendations.push({
      title: "Immediate Stress Relief",
      description: "Quick breathing exercise to calm your nervous system",
      content_url: "https://www.youtube.com/watch?v=YRPh_GaiL8s",
      type: "breathing"
    })
  }

  if (stressLevel >= 3) {
    recommendations.push({
      title: "5-Minute Mindfulness Break",
      description: "Short meditation to center yourself",
      content_url: "https://www.headspace.com/meditation/5-minute-meditation",
      type: "mindfulness"
    })
  }

  // Mood-based recommendations
  if (level <= 2) {
    recommendations.push(
      {
        title: "Gentle Movement",
        description: "Light physical activity to boost endorphins",
        content_url: "/activities/gentle-movement",
        type: "activity"
      },
      {
        title: "Crisis Support Resources",
        description: "24/7 support when you need it most",
        content_url: "/resources/crisis-support",
        type: "article"
      }
    )
  } else if (level === 3) {
    recommendations.push({
      title: "Mood Boosting Activities",
      description: "Simple ways to lift your spirits",
      content_url: "/activities/mood-boost",
      type: "activity"
    })
  } else if (level >= 4) {
    recommendations.push({
      title: "Maintain Your Positive Energy",
      description: "Tips to keep feeling great",
      content_url: "/articles/positive-habits",
      type: "article"
    })
  }

  return recommendations.slice(0, 3) // Limit to 3 recommendations
}