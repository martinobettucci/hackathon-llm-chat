import { ollama } from './ollamaClient';
import { chat, chatStream, ChatMessage } from './ollamaChat';
import { generateEmbeddings } from './ollamaEmbeddings';
import { cleanAndOrganizeContent } from './ollamaContentCuration';
import { extractUserIntent } from './ollamaIntentExtraction';

// Re-export client functions
export {
  getCurrentOllamaHost,
  getDefaultOllamaHost,
  setOllamaHost,
  isUsingDefaultHost
} from './ollamaClient';

// Re-export model functions
export {
  getSelectedGenerationModel,
  setSelectedGenerationModel,
  clearSelectedGenerationModel,
  isUsingDefaultGenerationModel,
  getDefaultGenerationModel,
  getSelectedEmbeddingModel,
  setSelectedEmbeddingModel,
  clearSelectedEmbeddingModel,
  isUsingDefaultEmbeddingModel,
  getDefaultEmbeddingModel,
  getAvailableModel,
  getAvailableEmbeddingModel,
  listModels,
  isModelAvailable,
  isEmbeddingModelAvailable,
  clearModelCache,
  isServiceUnavailable,
  resetServiceStatus
} from './ollamaModels';

// Re-export types
export type { ChatMessage } from './ollamaChat';

// Main OllamaService class that wraps all functionality
export class OllamaService {
  static async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      const { listModels } = await import('./ollamaModels');
      const models = await listModels();
      const modelNames = models.map(m => m.name);
      
      if (modelNames.length === 0) {
        return {
          success: false,
          message: 'Connected but no models available'
        };
      }

      const { getDefaultGenerationModel, getDefaultEmbeddingModel } = await import('./ollamaModels');
      
      // Check if default models are available
      const hasGenerationModel = modelNames.some(name => 
        name.includes(getDefaultGenerationModel()) || name === getDefaultGenerationModel()
      );
      const hasEmbeddingModel = modelNames.some(name => 
        name.includes(getDefaultEmbeddingModel()) || name === getDefaultEmbeddingModel()
      );
      
      let message = `Connected successfully! Found ${modelNames.length} model(s)`;
      
      if (!hasGenerationModel) {
        message += `. Warning: Default generation model "${getDefaultGenerationModel()}" not found.`;
      }
      if (!hasEmbeddingModel) {
        message += ` Warning: Default embedding model "${getDefaultEmbeddingModel()}" not found - knowledge base features may be limited.`;
      }
      
      return {
        success: true,
        message,
        models: modelNames
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      
      let message = 'Connection failed';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        message = 'Cannot connect to server. Check URL and CORS settings.';
      } else if (error instanceof Error) {
        message = error.message;
      }
      
      return {
        success: false,
        message
      };
    }
  }

  static async chat(messages: ChatMessage[], model?: string, think?: boolean): Promise<string> {
    return chat(messages, model, think);
  }

  static async chatStream(messages: ChatMessage[], model?: string, think?: boolean) {
    return chatStream(messages, model, think);
  }

  static async generateEmbeddings(text: string): Promise<number[]> {
    return generateEmbeddings(text);
  }

  static async cleanAndOrganizeContent(
    rawContent: string, 
    existingTitle?: string
  ): Promise<{ content: string; title?: string }> {
    return cleanAndOrganizeContent(rawContent, existingTitle);
  }

  static async extractUserIntent(conversationHistory: ChatMessage[]): Promise<string> {
    return extractUserIntent(conversationHistory);
  }

  // Legacy methods for compatibility
  static async getAvailableModel(): Promise<string> {
    const { getAvailableModel } = await import('./ollamaModels');
    return getAvailableModel();
  }

  static async listModels() {
    const { listModels } = await import('./ollamaModels');
    return listModels();
  }

  static async isModelAvailable(model: string) {
    const { isModelAvailable } = await import('./ollamaModels');
    return isModelAvailable(model);
  }

  static async isEmbeddingModelAvailable(): Promise<boolean> {
    const { isEmbeddingModelAvailable } = await import('./ollamaModels');
    return isEmbeddingModelAvailable();
  }

  static clearModelCache() {
    const { clearModelCache } = require('./ollamaModels');
    clearModelCache();
  }

  static isServiceUnavailable(): boolean {
    const { isServiceUnavailable } = require('./ollamaModels');
    return isServiceUnavailable();
  }

  static resetServiceStatus() {
    const { resetServiceStatus } = require('./ollamaModels');
    resetServiceStatus();
  }
}