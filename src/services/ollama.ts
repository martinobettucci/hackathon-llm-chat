import { Ollama } from 'ollama/browser';
import { StrategyRunOutputType } from '../schema';

const DEFAULT_OLLAMA_HOST = 'https://hackathon.journeesdecouverte.fr/ollama';
const OLLAMA_URL_KEY = 'ollama_custom_url';

export const ollama = new Ollama({ 
  host: getOllamaHost() 
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Preferred models in order of preference
const PREFERRED_MODELS = [
  'gemma3:27b-it-qat'
];

let cachedAvailableModel: string | null = null;
let serviceUnavailable = false;
let currentHost: string = getOllamaHost();

function getOllamaHost(): string {
  try {
    return localStorage.getItem(OLLAMA_URL_KEY) || DEFAULT_OLLAMA_HOST;
  } catch {
    return DEFAULT_OLLAMA_HOST;
  }
}

export function setOllamaHost(host: string): void {
  try {
    if (host === DEFAULT_OLLAMA_HOST) {
      localStorage.removeItem(OLLAMA_URL_KEY);
    } else {
      localStorage.setItem(OLLAMA_URL_KEY, host);
    }
    currentHost = host;
    
    // Update the ollama instance
    (ollama as any).config.host = host;
    
    // Clear cache to force re-detection
    cachedAvailableModel = null;
    serviceUnavailable = false;
  } catch (error) {
    console.error('Error setting Ollama host:', error);
  }
}

export function getCurrentOllamaHost(): string {
  return currentHost;
}

export function getDefaultOllamaHost(): string {
  return DEFAULT_OLLAMA_HOST;
}

export function isUsingDefaultHost(): boolean {
  return currentHost === DEFAULT_OLLAMA_HOST;
}

export class OllamaService {
  static async getAvailableModel(): Promise<string> {
    // Return cached model if available
    if (cachedAvailableModel) {
      return cachedAvailableModel;
    }

    try {
      const models = await this.listModels();
      const modelNames = models.map(m => m.name);
      
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
        throw new Error(`Unable to connect to the AI service at ${currentHost}. This may be due to network issues or CORS restrictions. Please check if the Ollama server is running and properly configured for cross-origin requests.`);
      }
      
      throw new Error(`Failed to connect to Ollama server at ${currentHost} or no models available`);
    }
  }

  static async testConnection(): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      const models = await this.listModels();
      const modelNames = models.map(m => m.name);
      
      if (modelNames.length === 0) {
        return {
          success: false,
          message: 'Connected but no models available'
        };
      }
      
      return {
        success: true,
        message: `Connected successfully! Found ${modelNames.length} model(s)`,
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

  static async chat(messages: ChatMessage[], model?: string): Promise<string> {
    try {
      // Check if service was previously unavailable
      if (serviceUnavailable) {
        throw new Error('AI service is currently unavailable. Please try again later.');
      }

      const selectedModel = model || await this.getAvailableModel();
      
      // Filter messages to only include valid roles for Ollama
      const validMessages = messages.filter(msg => 
        ['user', 'assistant', 'system'].includes(msg.role)
      ).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      
      const response = await ollama.chat({
        model: selectedModel,
        messages: validMessages,
        stream: false,
        format: 'json' // Request JSON format for structured output
      });
      
      // Reset service unavailable flag on successful response
      serviceUnavailable = false;
      
      return response.message.content;
    } catch (error) {
      console.error('Ollama chat error:', error);
      
      // Clear cached model in case it's no longer available
      cachedAvailableModel = null;
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        serviceUnavailable = true;
        throw new Error(`Connection to AI service failed at ${currentHost}. This appears to be a network connectivity issue. Please ensure the Ollama server is running and accessible from your browser.`);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new Error('The requested AI model is not available. Please try again or contact support.');
        }
        
        if (error.message.includes('CORS')) {
          serviceUnavailable = true;
          throw new Error(`Cross-origin request blocked. The Ollama server at ${currentHost} needs to be configured to allow requests from this domain.`);
        }
        
        // Re-throw our custom error messages
        if (error.message.includes('AI service is currently unavailable') || 
            error.message.includes('Connection to AI service failed') ||
            error.message.includes('Unable to connect to the AI service')) {
          throw error;
        }
      }
      
      serviceUnavailable = true;
      throw new Error('Failed to get response from AI model. Please check your connection and try again.');
    }
  }

  static async chatStream(messages: ChatMessage[], model?: string) {
    try {
      // Check if service was previously unavailable
      if (serviceUnavailable) {
        throw new Error('AI service is currently unavailable. Please try again later.');
      }

      const selectedModel = model || await this.getAvailableModel();
      
      // Filter messages to only include valid roles for Ollama
      const validMessages = messages.filter(msg => 
        ['user', 'assistant', 'system'].includes(msg.role)
      ).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }));
      
      const response = await ollama.chat({
        model: selectedModel,
        messages: validMessages,
        stream: true,
        format: 'json' // Request JSON format for structured output
      });
      
      // Reset service unavailable flag on successful response
      serviceUnavailable = false;
      
      return response;
    } catch (error) {
      console.error('Ollama stream error:', error);
      
      // Clear cached model in case it's no longer available
      cachedAvailableModel = null;
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        serviceUnavailable = true;
        throw new Error(`Connection to AI service failed at ${currentHost}. This appears to be a network connectivity issue. Please ensure the Ollama server is running and accessible from your browser.`);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw new Error('The requested AI model is not available. Please try again or contact support.');
        }
        
        if (error.message.includes('CORS')) {
          serviceUnavailable = true;
          throw new Error(`Cross-origin request blocked. The Ollama server at ${currentHost} needs to be configured to allow requests from this domain.`);
        }
        
        // Re-throw our custom error messages
        if (error.message.includes('AI service is currently unavailable') || 
            error.message.includes('Connection to AI service failed') ||
            error.message.includes('Unable to connect to the AI service')) {
          throw error;
        }
      }
      
      serviceUnavailable = true;
      throw new Error('Failed to get streamed response from AI model. Please check your connection and try again.');
    }
  }

  static async listModels() {
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

  static async isModelAvailable(model: string) {
    try {
      const models = await this.listModels();
      return models.some(m => m.name === model || m.name.includes(model));
    } catch (error) {
      return false;
    }
  }

  static clearModelCache() {
    cachedAvailableModel = null;
    serviceUnavailable = false;
  }

  static isServiceUnavailable(): boolean {
    return serviceUnavailable;
  }

  static resetServiceStatus() {
    serviceUnavailable = false;
  }
}