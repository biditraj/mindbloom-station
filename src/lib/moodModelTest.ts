// Test script for TensorFlow.js mood analysis
// This file demonstrates how the mood analysis works

import { createMoodModel, trainModel, predictMood, getModelStatus } from './moodModel';

/**
 * Test the mood analysis functionality
 */
export async function testMoodAnalysis() {
  console.log('🧪 Testing TensorFlow.js Mood Analysis...');
  
  try {
    // Test model status
    console.log('📊 Initial model status:', getModelStatus());
    
    // Test training
    console.log('🏋️ Training model...');
    const model = await trainModel();
    console.log('✅ Model training completed');
    
    // Test predictions with different scenarios
    const testCases = [
      { text: 'feeling great today, everything is wonderful', mood: '5', expected: 'positive' },
      { text: 'overwhelmed with deadlines and stress', mood: '2', expected: 'stress detected' },
      { text: 'having a regular day at work', mood: '3', expected: 'neutral' },
      { text: 'anxious about upcoming exams', mood: '2', expected: 'stress detected' },
      { text: 'amazing workout session, feeling energetic', mood: '4', expected: 'positive' }
    ];
    
    console.log('🎯 Testing predictions:');
    for (const testCase of testCases) {
      const result = await predictMood(testCase.text, testCase.mood);
      console.log(`\nInput: "${testCase.text}" (mood: ${testCase.mood})`);
      console.log(`Prediction: ${result.sentiment} (confidence: ${result.confidence}, stress: ${result.stressLevel}/5)`);
      console.log(`Expected: ${testCase.expected}`);
      console.log(`✅ Test ${result.sentiment.includes(testCase.expected.split(' ')[0]) ? 'PASSED' : 'FAILED'}`);
    }
    
    // Test model status after training
    console.log('\n📊 Final model status:', getModelStatus());
    
    console.log('\n🎉 All tests completed!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testMoodAnalysis = testMoodAnalysis;
}