import { ollama } from './ollamaClient';

const OLLAMA_GENERATION_MODEL_KEY = 'ollama_selected_generation_model';
const OLLAMA_EMBEDDING_MODEL_KEY = 'ollama_selected_embedding_model';
const OLLAMA_INTERMEDIATE_MODEL_KEY = 'ollama_selected_intermediate_model';

// Preferred models in order of preference for generation
const PREFERRED_MODELS = [
  'magistral'
];

// Embedding model for knowledge base
const EMBEDDING_MODEL = 'nomic-embed-text';

// Lightweight model for intermediate steps (intent extraction, reasoning decisions)
const INTERMEDIATE_MODEL = 'gemma2:2b';

let cachedAvailableModel: string | null = null;
let serviceUnavailable = false;

// Generation model functions
export function getSelectedGenerationModel(): string | null {
  try {
    return localStorage.getItem(OLLAMA_GENERATION_MODEL_KEY);
  } catch {
    return null;
  }
}

export function setSelectedGenerationModel(model: string): void {
  try {
    localStorage.setItem(OLLAMA_GENERATION_MODEL_KEY, model);
    // Clear cached model to force using the selected one
    cachedAvailableModel = model;
  } catch (error) {
    console.error('Error setting selected generation model:', error);
  }
}

export function clearSelectedGenerationModel(): void {
  try {
    localStorage.removeItem(OLLAMA_GENERATION_MODEL_KEY);
    cachedAvailableModel = null;
  } catch (error) {
    console.error('Error clearing selected generation model:', error);
  }
}

export function isUsingDefaultGenerationModel(): boolean {
  return !getSelectedGenerationModel();
}

export function getDefaultGenerationModel(): string {
  return PREFERRED_MODELS[0];
}

// Embedding model functions
export function getSelectedEmbeddingModel(): string | null {
  try {
    return localStorage.getItem(OLLAMA_EMBEDDING_MODEL_KEY);
  } catch {
    return null;
  }
}

export function setSelectedEmbeddingModel(model: string): void {
  try {
    localStorage.setItem(OLLAMA_EMBEDDING_MODEL_KEY, model);
  } catch (error) {
    console.error('Error setting selected embedding model:', error);
  }
}

export function clearSelectedEmbeddingModel(): void {
  try {
    localStorage.removeItem(OLLAMA_EMBEDDING_MODEL_KEY);
  } catch (error) {
    console.error('Error clearing selected embedding model:', error);
  }
}

export function isUsingDefaultEmbeddingModel(): boolean {
  return !getSelectedEmbeddingModel();
}

export function getDefaultEmbeddingModel(): string {
  return EMBEDDING_MODEL;
}

// Intermediate model functions (NEW)
export function getSelectedIntermediateModel(): string | null {
  try {
    return localStorage.getItem(OLLAMA_INTERMEDIATE_MODEL_KEY);
  } catch {
    return null;
  }
}

export function setSelectedIntermediateModel(model: string): void {
  try {
    localStorage.setItem(OLLAMA_INTERMEDIATE_MODEL_KEY, model);
  } catch (error) {
    console.error('Error setting selected intermediate model:', error);
  }
}

export function clearSelectedIntermediateModel(): void {
  try {
    localStorage.removeItem(OLLAMA_INTERMEDIATE_MODEL_KEY);
  } catch (error) {
    console.error('Error clearing selected intermediate model:', error);
  }
}

export function isUsingDefaultIntermediateModel(): boolean {
  return !getSelectedIntermediateModel();
}

export function getDefaultIntermediateModel(): string {
  return INTERMEDIATE_MODEL;
}

export async function getAvailableModel(): Promise<string> {
  // Check if user has selected a specific generation model
  const selectedModel = getSelectedGenerationModel();
  if (selectedModel && cachedAvailableModel === selectedModel) {
    return selectedModel;
  }

  try {
    const models = await listModels();
    const modelNames = models.map(m => m.name);
    
    // If user has selected a model, verify it's still available
    if (selectedModel) {
      const isSelectedAvailable = modelNames.some(name => 
        name.includes(selectedModel) || name === selectedModel
      );
      if (isSelectedAvailable) {
        cachedAvailableModel = selectedModel;
        serviceUnavailable = false;
        return selectedModel;
      } else {
        // Selected model is no longer available, clear it
        clearSelectedGenerationModel();
      }
    }
    
    // Find the first preferred model that's available
    for (const preferredModel of PREFERRED_MODELS) {
      const availableModel = modelNames.find(name => 
        name.includes(preferredModel) || name === preferredModel
      );
      if (availableModel) {
        cachedAvailableModel = availableModel;
        serviceUnavailable = false;
        return availableModel;
      }
    }
    
    // If no preferred models found, use the first available model
    if (modelNames.length > 0) {
      cachedAvailableModel = modelNames[0];
      serviceUnavailable = false;
      return modelNames[0];
    }
    
    throw new Error('No models available on the Ollama server');
  } catch (error) {
    console.error('Error getting available model:', error);
    serviceUnavailable = true;
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Unable to connect to the AI service. This may be due to network issues or CORS restrictions.`);
    }
    
    throw new Error(`Failed to connect to Ollama server or no models available`);
  }
}

export async function getAvailableEmbeddingModel(): Promise<string> {
  // Check if user has selected a specific embedding model
  const selectedModel = getSelectedEmbeddingModel();
  if (selectedModel) {
    try {
      const models = await listModels();
      const modelNames = models.map(m => m.name);
      
      const isSelectedAvailable = modelNames.some(name => 
        name.includes(selectedModel) || name === selectedModel
      );
      if (isSelectedAvailable) {
        return selectedModel;
      } else {
        // Selected model is no longer available, clear it and fall back to default
        clearSelectedEmbeddingModel();
      }
    } catch (error) {
      console.error('Error checking selected embedding model availability:', error);
    }
  }
  
  // Use default embedding model
  return EMBEDDING_MODEL;
}

export async function getAvailableIntermediateModel(): Promise<string> {
  // Check if user has selected a specific intermediate model
  const selectedModel = getSelectedIntermediateModel();
  if (selectedModel) {
    try {
      const models = await listModels();
      const modelNames = models.map(m => m.name);
      
      const isSelectedAvailable = modelNames.some(name => 
        name.includes(selectedModel) || name === selectedModel
      );
      if (isSelectedAvailable) {
        return selectedModel;
      } else {
        // Selected model is no longer available, clear it and fall back to default
        clearSelectedIntermediateModel();
      }
    } catch (error) {
      console.error('Error checking selected intermediate model availability:', error);
    }
  }
  
  // Use default intermediate model
  return INTERMEDIATE_MODEL;
}

export async function listModels() {
  try {
    const response = await ollama.list();
    serviceUnavailable = false;
    return response.models;
  } catch (error) {
    console.error('Error listing models:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      serviceUnavailable = true;
    }
    
    return [];
  }
}

export async function isModelAvailable(model: string) {
  try {
    const models = await listModels();
    return models.some(m => m.name === model || m.name.includes(model));
  } catch (error) {
    return false;
  }
}

export async function isEmbeddingModelAvailable(): Promise<boolean> {
  try {
    const models = await listModels();
    const embeddingModel = getSelectedEmbeddingModel() || getDefaultEmbeddingModel();
    return models.some(m => m.name === embeddingModel || m.name.includes(embeddingModel));
  } catch (error) {
    return false;
  }
}

export async function isIntermediateModelAvailable(): Promise<boolean> {
  try {
    const models = await listModels();
    const intermediateModel = getSelectedIntermediateModel() || getDefaultIntermediateModel();
    return models.some(m => m.name === intermediateModel || m.name.includes(intermediateModel));
  } catch (error) {
    return false;
  }
}

export function clearModelCache() {
  cachedAvailableModel = null;
  serviceUnavailable = false;
}

export function isServiceUnavailable(): boolean {
  return serviceUnavailable;
}

export function resetServiceStatus() {
  serviceUnavailable = false;
}

export function setServiceUnavailable(status: boolean) {
  serviceUnavailable = status;
}