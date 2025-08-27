// Test the TensorFlow.js mood analysis system
// Run this in browser console to validate functionality

import { testMoodAnalysis } from './src/lib/moodModelTest.ts';

// This will test the mood analysis system
console.log('🧪 Starting TensorFlow.js Mood Analysis Test...');

// Test function to be called from browser console
async function runMoodTest() {
  try {
    await testMoodAnalysis();
    console.log('✅ All TensorFlow.js tests completed successfully!');
  } catch (error) {
    console.error('❌ TensorFlow.js test failed:', error);
  }
}

// Export for browser console testing
window.runMoodTest = runMoodTest;

console.log('✅ Test functions loaded. Run window.runMoodTest() in browser console to test.');