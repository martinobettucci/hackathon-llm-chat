import { ollama, getCurrentOllamaHost } from './ollamaClient';
import { getAvailableEmbeddingModel, setServiceUnavailable } from './ollamaModels';

export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    // Ensure we have content to embed
    if (!text || !text.trim()) {
      throw new Error('Cannot generate embeddings for empty text');
    }

    // Clean up the text (remove excessive whitespace, normalize)
    const cleanText = text.trim().replace(/\s+/g, ' ');

    // Use the selected embedding model or default
    const embeddingModel = await getAvailableEmbeddingModel();

    const response = await ollama.embeddings({
      model: embeddingModel,
      prompt: cleanText
    });

    // Reset service unavailable flag on successful response
    setServiceUnavailable(false);
    
    if (!response.embedding || !Array.isArray(response.embedding)) {
      throw new Error('Invalid embedding response from Ollama service');
    }

    return response.embedding;
  } catch (error) {
    console.error('Ollama embeddings error:', error);
    
    const currentHost = getCurrentOllamaHost();
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      setServiceUnavailable(true);
      throw new Error(`Connection to AI service failed at ${currentHost}. This appears to be a network connectivity issue.`);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new Error(`The embedding model is not available. Please ensure it's installed on the Ollama server.`);
      }
      
      if (error.message.includes('CORS')) {
        setServiceUnavailable(true);
        throw new Error(`Cross-origin request blocked. The Ollama server at ${currentHost} needs to be configured to allow requests from this domain.`);
      }
      
      // Re-throw our custom error messages
      if (error.message.includes('Cannot generate embeddings for empty text') ||
          error.message.includes('Invalid embedding response')) {
        throw error;
      }
    }
    
    setServiceUnavailable(true);
    throw new Error('Failed to generate embeddings. Please check your connection and try again.');
  }
}