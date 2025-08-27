import * as tf from '@tensorflow/tfjs';

// Cache for the trained model to avoid retraining
let trainedModel: tf.Sequential | null = null;

// Model storage key for localStorage
const MODEL_STORAGE_KEY = 'localstorage://mood-model';
const MODEL_VERSION_KEY = 'mood-model-version';
const CURRENT_MODEL_VERSION = '3.0'; // Enhanced training data and feature extraction

// Interface for prediction results
interface PredictionResult {
  sentiment: string;
  confidence: number;
  stressLevel: number;
}

// Interface for model status
interface ModelStatus {
  isModelCached: boolean;
  isModelPersisted: boolean;
  modelVersion: string | null;
  backend: string;
  memoryInfo: tf.MemoryInfo;
  modelParams?: number;
  trainingDataSize: number;
}

// Interface for training data entry
interface TrainingDataEntry {
  text: string;
  mood: string;
  label: number;
}

// Interface for recommendation mapping
export interface RecommendationMapping {
  stressLevel: number;
  recommendation: {
    title: string;
    description: string;
    type: 'breathing' | 'mindfulness' | 'activity' | 'video' | 'article';
    content_url?: string;
  };
}

// Enhanced training dataset with 30+ realistic labeled examples
const ENHANCED_TRAINING_DATA = [
  // Positive examples (label: 0 for positive/low stress)
  { text: "feeling happy and relaxed today", mood: "5", label: 0 },
  { text: "motivated and energetic for the day ahead", mood: "4", label: 0 },
  { text: "accomplished my goals and feeling proud", mood: "4", label: 0 },
  { text: "great workout session, endorphins kicking in", mood: "4", label: 0 },
  { text: "peaceful morning with coffee and sunshine", mood: "4", label: 0 },
  { text: "excited about weekend plans with friends", mood: "5", label: 0 },
  { text: "grateful for all the good things in life", mood: "5", label: 0 },
  { text: "confident about upcoming presentation", mood: "4", label: 0 },
  { text: "love spending time with family", mood: "5", label: 0 },
  { text: "finished project early, feeling satisfied", mood: "4", label: 0 },
  { text: "beautiful day, going for a nature walk", mood: "4", label: 0 },
  { text: "meditation session helped clear my mind", mood: "4", label: 0 },
  { text: "achieved a personal milestone today", mood: "5", label: 0 },
  { text: "creative energy flowing, working on art", mood: "4", label: 0 },
  { text: "laughed so much with friends yesterday", mood: "5", label: 0 },
  { text: "feeling optimistic about the future", mood: "4", label: 0 },

  // High stress/negative examples (label: 1 for stress/negative)
  { text: "overwhelmed with deadlines and pressure", mood: "2", label: 1 },
  { text: "stressed about exams and final grades", mood: "2", label: 1 },
  { text: "burnout from overwork and long hours", mood: "1", label: 1 },
  { text: "anxious about job interview tomorrow", mood: "2", label: 1 },
  { text: "financial worries keeping me up at night", mood: "1", label: 1 },
  { text: "relationship problems causing distress", mood: "2", label: 1 },
  { text: "health issues making me worried", mood: "2", label: 1 },
  { text: "feeling isolated and lonely lately", mood: "1", label: 1 },
  { text: "panic attacks returning, need help", mood: "1", label: 1 },
  { text: "work pressure is becoming unbearable", mood: "1", label: 1 },
  { text: "family conflict causing emotional pain", mood: "2", label: 1 },
  { text: "imposter syndrome at work, doubt myself", mood: "2", label: 1 },
  { text: "constant worry about everything lately", mood: "2", label: 1 },
  { text: "feeling hopeless about my situation", mood: "1", label: 1 },
  { text: "struggling with depression and sadness", mood: "1", label: 1 },
  { text: "academic pressure is crushing me", mood: "2", label: 1 },

  // Moderate/mixed examples
  { text: "tired but satisfied with today's progress", mood: "3", label: 0 },
  { text: "regular day, nothing special happening", mood: "3", label: 0 },
  { text: "a bit concerned about future plans", mood: "3", label: 1 },
  { text: "feeling uncertain about career direction", mood: "3", label: 1 },
  { text: "minor headache but manageable", mood: "3", label: 0 },
  { text: "busy day but good productivity", mood: "3", label: 0 },
  { text: "social gathering was nice but draining", mood: "3", label: 1 },
  { text: "weather is gloomy, affects my mood slightly", mood: "3", label: 1 },
  { text: "mixed feelings about recent changes", mood: "3", label: 1 },
  { text: "steady progress but room for improvement", mood: "3", label: 0 }
];

/**
 * Attempts to load a pre-trained model from localStorage
 * @returns {Promise<tf.Sequential | null>} The loaded model or null if not found
 */
async function loadPersistedModel(): Promise<tf.Sequential | null> {
  try {
    // Check if model version matches
    const storedVersion = localStorage.getItem(MODEL_VERSION_KEY);
    if (storedVersion !== CURRENT_MODEL_VERSION) {
      console.log(`🔄 Model version mismatch (stored: ${storedVersion}, current: ${CURRENT_MODEL_VERSION}). Will retrain.`);
      return null;
    }

    console.log('🔍 Loading model from localStorage...');
    const model = await tf.loadLayersModel(MODEL_STORAGE_KEY) as tf.Sequential;
    console.log('✅ Model loaded successfully from localStorage');
    return model;
  } catch (error) {
    console.log('⚠️ No persisted model found or loading failed:', error.message);
    return null;
  }
}

/**
 * Saves the trained model to localStorage
 * @param {tf.Sequential} model - The model to save
 */
async function persistModel(model: tf.Sequential): Promise<void> {
  try {
    console.log('💾 Saving model to localStorage...');
    await model.save(MODEL_STORAGE_KEY);
    localStorage.setItem(MODEL_VERSION_KEY, CURRENT_MODEL_VERSION);
    console.log('✅ Model saved successfully to localStorage');
  } catch (error) {
    console.error('❌ Failed to save model:', error);
  }
}

/**
 * Creates an enhanced sequential TensorFlow.js model for mood analysis
 * @returns {tf.Sequential} The compiled model with improved architecture
 */
export function createMoodModel() {
  const model = tf.sequential({
    layers: [
      // Input layer - accepts feature vectors of length 10
      tf.layers.dense({
        inputShape: [10],
        units: 32, // Increased capacity
        activation: 'relu',
        kernelInitializer: 'glorotNormal',
        name: 'input_layer'
      }),
      // Dropout for regularization
      tf.layers.dropout({
        rate: 0.2,
        name: 'dropout_1'
      }),
      // Hidden layer 1
      tf.layers.dense({
        units: 16,
        activation: 'relu',
        kernelInitializer: 'glorotNormal',
        name: 'hidden_layer_1'
      }),
      // Hidden layer 2  
      tf.layers.dense({
        units: 8,
        activation: 'relu',
        kernelInitializer: 'glorotNormal',
        name: 'hidden_layer_2'
      }),
      // Output layer - binary classification (positive/stress)
      tf.layers.dense({
        units: 1,
        activation: 'sigmoid',
        kernelInitializer: 'glorotNormal',
        name: 'output_layer'
      })
    ]
  });

  // Compile the model with improved optimizer settings
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  console.log('🏗️ Enhanced model architecture created');
  console.log(`📊 Model summary: ${model.countParams()} parameters`);

  return model;
}

/**
 * Creates an enhanced feature vector from mood text using comprehensive keyword mapping
 * @param {string} text - The mood note text
 * @param {string} moodLevel - The selected mood level (1-5)
 * @returns {number[]} Feature vector of length 10
 */
function createFeatureVector(text = '', moodLevel = '3') {
  // Initialize feature vector
  const features = new Array(10).fill(0);
  const lowerText = text.toLowerCase();
  
  // Mood level as normalized feature (0-1)
  features[0] = parseInt(moodLevel) / 5;
  
  // Text length normalized (longer text might indicate more complex emotional state)
  features[1] = Math.min(text.length / 200, 1);
  
  // Enhanced positive keywords with emotional strength indicators
  const positiveWords = [
    'happy', 'good', 'great', 'awesome', 'wonderful', 'excellent', 'fantastic', 'amazing', 
    'love', 'joy', 'excited', 'grateful', 'blessed', 'peaceful', 'calm', 'relaxed', 
    'confident', 'optimistic', 'satisfied', 'proud', 'accomplished', 'motivated', 
    'energetic', 'creative', 'inspired', 'successful', 'achieving', 'thriving'
  ];
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  features[2] = Math.min(positiveCount / 3, 1); // Normalize to 0-1 based on multiple positive words
  
  // Enhanced negative keywords with severity indicators
  const negativeWords = [
    'sad', 'bad', 'terrible', 'awful', 'horrible', 'hate', 'angry', 'mad', 'frustrated', 
    'depressed', 'anxious', 'worried', 'stressed', 'overwhelmed', 'tired', 'exhausted',
    'hopeless', 'helpless', 'desperate', 'crying', 'miserable', 'devastated', 'broken'
  ];
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  features[3] = Math.min(negativeCount / 3, 1);
  
  // Enhanced stress indicators with academic and work context
  const stressWords = [
    'stress', 'pressure', 'deadline', 'exam', 'test', 'work', 'busy', 'rush', 'overwhelm', 
    'panic', 'nervous', 'anxiety', 'burnout', 'workload', 'assignment', 'finals', 
    'interview', 'presentation', 'performance', 'competition', 'financial', 'money'
  ];
  const stressCount = stressWords.filter(word => lowerText.includes(word)).length;
  features[4] = Math.min(stressCount / 2, 1);
  
  // Energy level indicators (both positive and negative energy)
  const lowEnergyWords = ['tired', 'exhausted', 'sleepy', 'drained', 'fatigue', 'weary'];
  const highEnergyWords = ['energetic', 'active', 'motivated', 'vigorous', 'dynamic'];
  const lowEnergyCount = lowEnergyWords.filter(word => lowerText.includes(word)).length;
  const highEnergyCount = highEnergyWords.filter(word => lowerText.includes(word)).length;
  features[5] = highEnergyCount > 0 ? 1 : (lowEnergyCount > 0 ? 0 : 0.5);
  
  // Social indicators (both positive and negative social experiences)
  const socialWords = [
    'friend', 'family', 'alone', 'lonely', 'together', 'social', 'people', 'relationship',
    'community', 'support', 'isolated', 'connected', 'conversation', 'party', 'gathering'
  ];
  const socialCount = socialWords.filter(word => lowerText.includes(word)).length;
  features[6] = Math.min(socialCount / 2, 1);
  
  // Health indicators (physical and mental health markers)
  const healthWords = [
    'sick', 'healthy', 'pain', 'hurt', 'doctor', 'medicine', 'exercise', 'sleep',
    'headache', 'illness', 'recovery', 'fitness', 'workout', 'therapy', 'treatment'
  ];
  const healthCount = healthWords.filter(word => lowerText.includes(word)).length;
  features[7] = Math.min(healthCount / 2, 1);
  
  // Achievement indicators (success and progress markers)
  const achievementWords = [
    'success', 'achieve', 'goal', 'accomplish', 'win', 'victory', 'proud', 'milestone',
    'progress', 'improvement', 'breakthrough', 'completion', 'finished', 'solved',
    'mastered', 'learned', 'graduated', 'promoted', 'recognized'
  ];
  const achievementCount = achievementWords.filter(word => lowerText.includes(word)).length;
  features[8] = Math.min(achievementCount / 2, 1);
  
  // Uncertainty indicators (confusion and doubt markers)
  const uncertaintyWords = [
    'confused', 'unsure', 'doubt', 'maybe', 'perhaps', 'might', 'uncertain', 'unclear',
    'questioning', 'wondering', 'hesitant', 'indecisive', 'conflicted', 'torn',
    'undecided', 'ambiguous', 'mixed', 'complicated'
  ];
  const uncertaintyCount = uncertaintyWords.filter(word => lowerText.includes(word)).length;
  features[9] = Math.min(uncertaintyCount / 2, 1);
  
  return features;
}

/**
 * Trains the model with enhanced realistic dataset and comprehensive tensor management
 * @param {tf.Sequential} model - The model to train
 * @returns {Promise<tf.Sequential>} The trained model
 */
export async function trainModel(model: tf.Sequential | null = null): Promise<tf.Sequential> {
  // Try to load persisted model first
  let loadedModel = await loadPersistedModel();
  if (loadedModel) {
    trainedModel = loadedModel;
    return loadedModel;
  }

  // Return cached model if available and version is current
  if (trainedModel) {
    return trainedModel;
  }

  // Create model if not provided
  if (!model) {
    model = createMoodModel();
  }

  console.log('🧠 Training enhanced mood analysis model...');
  console.log(`📚 Training dataset size: ${ENHANCED_TRAINING_DATA.length} examples`);

  // Use enhanced training data
  const trainingData = ENHANCED_TRAINING_DATA;

  // Convert to feature vectors
  const features = trainingData.map(item => createFeatureVector(item.text, item.mood));
  const labels = trainingData.map(item => item.label);

  // Convert to tensors with explicit disposal tracking
  const xs = tf.tensor2d(features);
  const ys = tf.tensor2d(labels, [labels.length, 1]);

  let trainingHistory;
  
  try {
    // Train the model with enhanced parameters
    trainingHistory = await model.fit(xs, ys, {
      epochs: 150, // Increased epochs for better convergence
      batchSize: 8,
      validationSplit: 0.25, // Increased validation split
      verbose: 0,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 25 === 0) {
            console.log(`🔄 Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}, accuracy = ${logs?.acc?.toFixed(4)}, val_loss = ${logs?.val_loss?.toFixed(4) || 'N/A'}, val_acc = ${logs?.val_acc?.toFixed(4) || 'N/A'}`);
          }
        },
        onTrainEnd: () => {
          console.log('✅ Training completed successfully!');
        }
      }
    });

    const finalAccuracy = trainingHistory.history.acc[trainingHistory.history.acc.length - 1] as number;
    const finalValAccuracy = trainingHistory.history.val_acc ? trainingHistory.history.val_acc[trainingHistory.history.val_acc.length - 1] as number : null;
    const finalLoss = trainingHistory.history.loss[trainingHistory.history.loss.length - 1] as number;
    
    console.log('📊 Final training metrics:');
    console.log(`   Training accuracy: ${finalAccuracy.toFixed(4)}`);
    console.log(`   Training loss: ${finalLoss.toFixed(4)}`);
    if (finalValAccuracy) {
      console.log(`   Validation accuracy: ${finalValAccuracy.toFixed(4)}`);
    }

    // Cache and persist the trained model
    trainedModel = model;
    await persistModel(model);

    return model;
  } catch (error) {
    console.error('❌ Error training model:', error);
    throw error;
  } finally {
    // Clean up tensors to prevent memory leaks
    xs.dispose();
    ys.dispose();
    
    // Log memory usage after training
    const memoryInfo = tf.memory();
    console.log(`🧠 Memory usage after training: ${memoryInfo.numTensors} tensors, ${(memoryInfo.numBytes / 1024 / 1024).toFixed(2)} MB`);
  }
}

/**
 * Predicts mood sentiment and stress level from input with enhanced accuracy
 * @param {string} text - The mood note text
 * @param {string} moodLevel - The selected mood level (1-5)
 * @returns {Promise<PredictionResult>} Enhanced prediction results
 */
export async function predictMood(text = '', moodLevel = '3'): Promise<PredictionResult> {
  let inputTensor: tf.Tensor | null = null;
  let prediction: tf.Tensor | null = null;
  
  try {
    // Ensure model is trained
    let model = trainedModel;
    if (!model) {
      console.log('🔄 No trained model found, training new model...');
      model = await trainModel();
    }

    // Create enhanced feature vector
    const features = createFeatureVector(text, moodLevel);
    inputTensor = tf.tensor2d([features]);

    // Make prediction
    prediction = model.predict(inputTensor) as tf.Tensor;
    const predictionValue = await prediction.data();
    
    const confidence = predictionValue[0];
    
    // Enhanced interpretation with more nuanced sentiment analysis
    let sentiment: string;
    if (confidence < 0.3) {
      sentiment = 'very positive';
    } else if (confidence < 0.5) {
      sentiment = 'positive';
    } else if (confidence < 0.7) {
      sentiment = 'moderate stress';
    } else {
      sentiment = 'high stress detected';
    }
    
    // Enhanced stress level calculation with mood level integration
    let stressLevel: number;
    const moodLevelNum = parseInt(moodLevel);
    
    // Combine AI confidence with mood level for more accurate stress assessment
    const combinedScore = (confidence * 0.7) + ((5 - moodLevelNum) / 5 * 0.3);
    
    if (combinedScore < 0.2) {
      stressLevel = 1; // Very low stress
    } else if (combinedScore < 0.4) {
      stressLevel = 2; // Low stress  
    } else if (combinedScore < 0.6) {
      stressLevel = 3; // Moderate stress
    } else if (combinedScore < 0.8) {
      stressLevel = 4; // High stress
    } else {
      stressLevel = 5; // Very high stress
    }

    const result = {
      sentiment,
      confidence: Math.round(confidence * 100) / 100,
      stressLevel
    };

    console.log(`🎯 Enhanced mood prediction:`, result);
    console.log(`📊 Features used:`, features.map(f => f.toFixed(2)).join(', '));

    return result;
  } catch (error) {
    console.error('❌ Error predicting mood:', error);
    // Return intelligent default based on mood level
    const moodLevelNum = parseInt(moodLevel);
    return {
      sentiment: moodLevelNum >= 4 ? 'positive' : moodLevelNum === 3 ? 'neutral' : 'stress detected',
      confidence: 0.5,
      stressLevel: Math.max(1, 6 - moodLevelNum)
    };
  } finally {
    // Clean up tensors
    if (inputTensor) inputTensor.dispose();
    if (prediction) prediction.dispose();
  }
}

/**
 * Clears the cached trained model and persisted model with comprehensive cleanup
 */
export function clearModel(): void {
  // Dispose of cached model to free GPU memory
  if (trainedModel) {
    try {
      trainedModel.dispose();
      console.log('🗑️ Cached model disposed successfully');
    } catch (error) {
      console.warn('⚠️ Error disposing cached model:', error);
    }
    trainedModel = null;
  }
  
  // Clear persisted model from localStorage
  try {
    localStorage.removeItem(MODEL_VERSION_KEY);
    // Note: TensorFlow.js IndexedDB storage will be overwritten on next save
    console.log('🗑️ Model cache and persistence cleared');
  } catch (error) {
    console.error('❌ Error clearing persisted model:', error);
  }
  
  // Optional: Force garbage collection of tensors
  if (typeof window !== 'undefined' && (window as any).gc) {
    (window as any).gc();
  }
  
  // Log final memory state
  const memoryInfo = tf.memory();
  console.log(`🧠 Memory after cleanup: ${memoryInfo.numTensors} tensors, ${(memoryInfo.numBytes / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Gets comprehensive model status information with enhanced metrics
 * @returns {ModelStatus} Enhanced model status
 */
export function getModelStatus(): ModelStatus {
  const storedVersion = localStorage.getItem(MODEL_VERSION_KEY);
  return {
    isModelCached: trainedModel !== null,
    isModelPersisted: storedVersion === CURRENT_MODEL_VERSION,
    modelVersion: storedVersion,
    backend: tf.getBackend(),
    memoryInfo: tf.memory(),
    modelParams: trainedModel?.countParams(),
    trainingDataSize: ENHANCED_TRAINING_DATA.length
  };
}

/**
 * Smart recommendations mapping based on stress levels
 * @param {number} stressLevel - The predicted stress level (1-5)
 * @returns {RecommendationMapping} Mapped recommendation
 */
export function getRecommendationMapping(stressLevel: number): RecommendationMapping {
  const mappings: Record<number, RecommendationMapping['recommendation']> = {
    1: {
      title: 'Motivational Video',
      description: 'Keep up the great energy with some inspiring content to maintain your positive momentum!',
      type: 'video',
      content_url: 'https://www.youtube.com/watch?v=ZmInkxbvlCs'
    },
    2: {
      title: 'Motivational Content',
      description: 'You\'re doing well! Here\'s some uplifting content to boost your already positive mood.',
      type: 'video',
      content_url: 'https://www.youtube.com/watch?v=k2rqUlYlcQM'
    },
    3: {
      title: 'Quick Breathing Exercise',
      description: 'Take 5 minutes for deep breathing to reset your mind and find your center.',
      type: 'breathing',
      content_url: 'https://www.headspace.com/meditation/breathing-exercises'
    },
    4: {
      title: 'Guided Meditation',
      description: 'A calming guided meditation session to help reduce stress and restore balance.',
      type: 'mindfulness',
      content_url: 'https://www.calm.com/meditate'
    },
    5: {
      title: 'Peer Support & Professional Help',
      description: 'Reach out to peers for support or consider speaking with a mental health professional.',
      type: 'mindfulness', // Using mindfulness as fallback for database compatibility
      content_url: '/peer-support'
    }
  };

  return {
    stressLevel,
    recommendation: mappings[stressLevel] || mappings[3] // Default to breathing exercise
  };
}

/**
 * Validates a feature vector for correctness
 * @param {number[]} features - Feature vector to validate
 * @returns {boolean} Whether the feature vector is valid
 */
export function validateFeatureVector(features: number[]): boolean {
  if (!Array.isArray(features) || features.length !== 10) {
    return false;
  }
  
  return features.every(feature => 
    typeof feature === 'number' && 
    !isNaN(feature) && 
    isFinite(feature) &&
    feature >= 0 && 
    feature <= 1
  );
}

/**
 * Analyzes text complexity for feature engineering
 * @param {string} text - Text to analyze
 * @returns {object} Text analysis metrics
 */
export function analyzeTextComplexity(text: string) {
  const words = text.toLowerCase().split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence: sentences.length > 0 ? words.length / sentences.length : 0,
    uniqueWords: new Set(words).size,
    lexicalDiversity: words.length > 0 ? new Set(words).size / words.length : 0
  };
}