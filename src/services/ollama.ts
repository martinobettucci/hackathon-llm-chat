import { Ollama } from 'ollama/browser';
import { StrategyRunOutputType } from '../schema';

const DEFAULT_OLLAMA_HOST = 'https://hackathon.journeesdecouverte.fr/ollama';
const OLLAMA_URL_KEY = 'ollama_custom_url';
const OLLAMA_GENERATION_MODEL_KEY = 'ollama_selected_generation_model';
const OLLAMA_EMBEDDING_MODEL_KEY = 'ollama_selected_embedding_model';

export const ollama = new Ollama({ 
  host: getOllamaHost() 
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Preferred models in order of preference for generation
const PREFERRED_MODELS = [
  'magistral'
];

// Embedding model for knowledge base
const EMBEDDING_MODEL = 'nomic-embed-text';

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

export class OllamaService {
  static async getAvailableModel(): Promise<string> {
    // Check if user has selected a specific generation model
    const selectedModel = getSelectedGenerationModel();
    if (selectedModel && cachedAvailableModel === selectedModel) {
      return selectedModel;
    }

    try {
      const models = await this.listModels();
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
        throw new Error(`Unable to connect to the AI service at ${currentHost}. This may be due to network issues or CORS restrictions. Please check if the Ollama server is running and properly configured for cross-origin requests.`);
      }
      
      throw new Error(`Failed to connect to Ollama server at ${currentHost} or no models available`);
    }
  }

  static async getAvailableEmbeddingModel(): Promise<string> {
    // Check if user has selected a specific embedding model
    const selectedModel = getSelectedEmbeddingModel();
    if (selectedModel) {
      try {
        const models = await this.listModels();
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

  static async extractUserIntent(conversationHistory: ChatMessage[]): Promise<string> {
    try {
      // Check if service was previously unavailable
      if (serviceUnavailable) {
        throw new Error('AI service is currently unavailable. Please try again later.');
      }

      if (conversationHistory.length === 0) {
        throw new Error('No conversation history provided for intent extraction');
      }

      const systemPrompt = `You are an intent extraction assistant. Your task is to analyze the complete conversation history and reformulate the user's COMPLETE CURRENT INTENT.

CRITICAL INSTRUCTIONS:
1. Look at the ENTIRE conversation, not just the last message
2. The user's intent may have evolved or been clarified through the conversation
3. Context from earlier messages often clarifies what the user is REALLY asking about
4. Return ONLY the reformulated complete intent as a clear, standalone question or statement
5. Do NOT include any explanations, greetings, or additional commentary
6. The intent should be specific enough to retrieve relevant documents from a knowledge base
7. If the user corrected or clarified their intent, use the corrected/clarified version

EXAMPLES:
Input conversation:
U: "tu connais granite?"
A: "C'est une boisson glacée italienne."
U: "no, je veux dire, le modèle embedding"

Output: "Qu'est-ce que le modèle embedding Granite de IBM?"

Input conversation:
U: "Comment installer Python?"
A: "Vous pouvez télécharger Python depuis python.org..."
U: "Je veux dire sur Ubuntu spécifiquement"

Output: "Comment installer Python sur Ubuntu?"

Your task: Analyze this conversation and extract the user's complete current intent:`;

      const conversationText = conversationHistory.map(msg => `${msg.role.toUpperCase()}: "${msg.content}"`).join('\n');

      const userPrompt = `Conversation:\n${conversationText}\n\nExtracted intent:`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const selectedModel = await this.getAvailableModel();
      
      const response = await ollama.chat({
        model: selectedModel,
        messages,
        stream: false
      });
      
      // Reset service unavailable flag on successful response
      serviceUnavailable = false;
      
      // Clean the response - remove any extra formatting
      let intent = response.message.content.trim();
      
      // Remove common response prefixes
      const prefixesToRemove = [
        'Intent:', 'Extracted intent:', 'User intent:', 'Complete intent:',
        'The user wants to know:', 'The user is asking about:',
        'Reformulated intent:', 'Current intent:'
      ];
      
      for (const prefix of prefixesToRemove) {
        if (intent.toLowerCase().startsWith(prefix.toLowerCase())) {
          intent = intent.substring(prefix.length).trim();
          break;
        }
      }
      
      // Remove quotes if they wrap the entire intent
      if (intent.startsWith('"') && intent.endsWith('"')) {
        intent = intent.slice(1, -1).trim();
      }
      if (intent.startsWith("'") && intent.endsWith("'")) {
        intent = intent.slice(1, -1).trim();
      }
      
      // Ensure we have meaningful content
      if (!intent || intent.length < 3) {
        console.warn('Intent extraction returned very short result, using last user message');
        const lastUserMessage = [...conversationHistory].reverse().find(msg => msg.role === 'user');
        return lastUserMessage?.content || 'User query';
      }
      
      return intent;
      
    } catch (error) {
      console.error('Intent extraction error:', error);
      
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
            error.message.includes('No conversation history provided')) {
          throw error;
        }
      }
      
      serviceUnavailable = true;
      throw new Error('Failed to extract user intent. Please check your connection and try again.');
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

  static async cleanAndOrganizeContent(
    rawContent: string, 
    existingTitle?: string
  ): Promise<{ content: string; title?: string }> {
    try {
      // Check if service was previously unavailable
      if (serviceUnavailable) {
        throw new Error('AI service is currently unavailable. Please try again later.');
      }

      // Ensure we have content to clean
      if (!rawContent || !rawContent.trim()) {
        throw new Error('Cannot clean empty content');
      }

      const needsTitle = !existingTitle || !existingTitle.trim();

      const systemPrompt = `You are a content organization assistant. Your task is to clean, structure, and organize text content into well-formatted Markdown${needsTitle ? ' and generate an appropriate title' : ''}.

INSTRUCTIONS:
1. Clean up the text by removing unnecessary whitespace, fixing formatting issues, and correcting obvious typos
2. Organize the content with proper Markdown structure using headers, lists, and formatting
3. Create a logical flow with appropriate sections and subsections
4. Preserve all important information while making it more readable
5. Use proper Markdown syntax for formatting (headers, lists, code blocks, links, etc.)
6. Remove redundant or irrelevant content (like navigation text, ads, etc.)
7. Ensure the content is well-structured and easy to read
${needsTitle ? '8. Generate a catchy, descriptive title that summarizes the main topic' : ''}

${needsTitle ? `RESPONSE FORMAT:
Return a JSON object with this structure:
{
  "title": "A catchy, descriptive title (max 80 characters)",
  "content": "The cleaned and organized Markdown content"
}

TITLE GUIDELINES:
- Make it catchy and engaging
- Keep it under 80 characters
- Capture the main topic or theme
- Make it suitable for a knowledge base entry
- Avoid generic titles like "Article" or "Content"
` : `IMPORTANT: 
- Only return the cleaned Markdown content, no additional commentary
- Preserve the original meaning and all important information
- Use appropriate Markdown formatting for better readability`}`;

      const userPrompt = existingTitle 
        ? `Please clean and organize this content about "${existingTitle}":\n\n${rawContent}`
        : `Please clean and organize this content and generate an appropriate title:\n\n${rawContent}`;

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const selectedModel = await this.getAvailableModel();
      
      const response = await ollama.chat({
        model: selectedModel,
        messages,
        stream: false,
        ...(needsTitle ? { format: 'json' } : {})
      });
      
      // Reset service unavailable flag on successful response
      serviceUnavailable = false;
      
      let result: { content: string; title?: string };

      if (needsTitle) {
        try {
          // Try to parse as JSON for title + content
          const jsonResponse = JSON.parse(response.message.content);
          
          if (jsonResponse.title && jsonResponse.content) {
            result = {
              content: jsonResponse.content.trim(),
              title: jsonResponse.title.trim()
            };
          } else {
            // Fallback: treat as content only
            console.warn('AI response missing title or content fields, using as content only');
            result = { content: response.message.content.trim() };
          }
        } catch (parseError) {
          console.warn('Failed to parse AI response as JSON, treating as content only');
          result = { content: response.message.content.trim() };
        }
      } else {
        // Clean up the response (remove any extra formatting or explanations)
        let cleanedContent = response.message.content.trim();
        
        // Remove common AI response prefixes/suffixes
        const prefixesToRemove = [
          'Here is the cleaned and organized content:',
          'Here\'s the cleaned and organized content:',
          'The cleaned and organized content is:',
          'Cleaned and organized content:',
          '```markdown',
          '```'
        ];
        
        for (const prefix of prefixesToRemove) {
          if (cleanedContent.toLowerCase().startsWith(prefix.toLowerCase())) {
            cleanedContent = cleanedContent.substring(prefix.length).trim();
          }
          if (cleanedContent.toLowerCase().endsWith(prefix.toLowerCase())) {
            cleanedContent = cleanedContent.substring(0, cleanedContent.length - prefix.length).trim();
          }
        }
        
        result = { content: cleanedContent };
      }
      
      // Validate we have meaningful content
      if (!result.content || result.content.length < 10) {
        console.warn('AI returned very short content, using original');
        result.content = rawContent;
      }

      // Validate title if generated
      if (result.title) {
        if (result.title.length > 100) {
          result.title = result.title.substring(0, 97) + '...';
        }
        if (result.title.length < 3) {
          console.warn('AI generated very short title, removing it');
          delete result.title;
        }
      }
      
      return result;
      
    } catch (error) {
      console.error('Content cleaning error:', error);
      
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
            error.message.includes('Cannot clean empty content')) {
          throw error;
        }
      }
      
      serviceUnavailable = true;
      throw new Error('Failed to clean content with AI. Please check your connection and try again.');
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

  static async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Check if service was previously unavailable
      if (serviceUnavailable) {
        throw new Error('AI service is currently unavailable. Please try again later.');
      }

      // Ensure we have content to embed
      if (!text || !text.trim()) {
        throw new Error('Cannot generate embeddings for empty text');
      }

      // Clean up the text (remove excessive whitespace, normalize)
      const cleanText = text.trim().replace(/\s+/g, ' ');

      // Use the selected embedding model or default
      const embeddingModel = await this.getAvailableEmbeddingModel();

      const response = await ollama.embeddings({
        model: embeddingModel,
        prompt: cleanText
      });

      // Reset service unavailable flag on successful response
      serviceUnavailable = false;
      
      if (!response.embedding || !Array.isArray(response.embedding)) {
        throw new Error('Invalid embedding response from Ollama service');
      }

      return response.embedding;
    } catch (error) {
      console.error('Ollama embeddings error:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        serviceUnavailable = true;
        throw new Error(`Connection to AI service failed at ${currentHost}. This appears to be a network connectivity issue. Please ensure the Ollama server is running and accessible from your browser.`);
      }
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          const embeddingModel = getSelectedEmbeddingModel() || getDefaultEmbeddingModel();
          throw new Error(`The embedding model "${embeddingModel}" is not available. Please ensure it's installed on the Ollama server.`);
        }
        
        if (error.message.includes('CORS')) {
          serviceUnavailable = true;
          throw new Error(`Cross-origin request blocked. The Ollama server at ${currentHost} needs to be configured to allow requests from this domain.`);
        }
        
        // Re-throw our custom error messages
        if (error.message.includes('AI service is currently unavailable') || 
            error.message.includes('Connection to AI service failed') ||
            error.message.includes('Cannot generate embeddings for empty text') ||
            error.message.includes('Invalid embedding response')) {
          throw error;
        }
      }
      
      serviceUnavailable = true;
      throw new Error('Failed to generate embeddings. Please check your connection and try again.');
    }
  }

  static async isEmbeddingModelAvailable(): Promise<boolean> {
    try {
      const models = await this.listModels();
      const embeddingModel = getSelectedEmbeddingModel() || getDefaultEmbeddingModel();
      return models.some(m => m.name === embeddingModel || m.name.includes(embeddingModel));
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