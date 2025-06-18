import { ollama, getCurrentOllamaHost } from './ollamaClient';
import { getAvailableModel, setServiceUnavailable } from './ollamaModels';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

function stripSelfRepeatingPrefix(response: string, maxPrefix = 20): string {
  for (let len = maxPrefix; len >= 1; len--) {
    const prefix = response.slice(0, len)
    const doubled = prefix + prefix

    if (response.startsWith(doubled)) {
      return response.slice(len)
    }
  }
  return response
}

export async function chat(messages: ChatMessage[], model?: string, think?: boolean): Promise<string> {
  try {
    const selectedModel = model || await getAvailableModel();
    
    // Filter messages to only include valid roles for Ollama
    const validMessages = messages.filter(msg => 
      ['user', 'assistant', 'system'].includes(msg.role)
    ).map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
    
    const chatOptions: any = {
      model: selectedModel,
      messages: validMessages,
      stream: false,
      format: 'json' // Request JSON format for structured output
    };

    // Add think parameter if specified
    if (think !== undefined) {
      chatOptions.think = think;
    } 
    
    const rawResponse = await ollama.chat(chatOptions);
    const response = think ? stripSelfRepeatingPrefix(rawResponse) : rawResponse
    
    // Reset service unavailable flag on successful response
    setServiceUnavailable(false);
    
    return response.message.content;
  } catch (error) {
    console.error('Ollama chat error:', error);
    
    const currentHost = getCurrentOllamaHost();
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      setServiceUnavailable(true);
      throw new Error(`Connection to AI service failed at ${currentHost}. This appears to be a network connectivity issue.`);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new Error('The requested AI model is not available. Please try again or contact support.');
      }
      
      if (error.message.includes('CORS')) {
        setServiceUnavailable(true);
        throw new Error(`Cross-origin request blocked. The Ollama server at ${currentHost} needs to be configured to allow requests from this domain.`);
      }
    }
    
    setServiceUnavailable(true);
    throw new Error('Failed to get response from AI model. Please check your connection and try again.');
  } 
}

export async function chatStream(messages: ChatMessage[], model?: string, think?: boolean) {
  try {
    const selectedModel = model || await getAvailableModel();
    
    // Filter messages to only include valid roles for Ollama
    const validMessages = messages.filter(msg => 
      ['user', 'assistant', 'system'].includes(msg.role)
    ).map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
    
    const chatOptions: any = {
      model: selectedModel,
      messages: validMessages,
      stream: true,
      format: 'json' // Request JSON format for structured output
    };

    // Add think parameter if specified
    if (think !== undefined) {
      chatOptions.think = think; 
    }
    
    const response = await ollama.chat(chatOptions);
    
    // Reset service unavailable flag on successful response
    setServiceUnavailable(false);
    
    return response;
  } catch (error) {
    console.error('Ollama stream error:', error);
    
    const currentHost = getCurrentOllamaHost();
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      setServiceUnavailable(true);
      throw new Error(`Connection to AI service failed at ${currentHost}. This appears to be a network connectivity issue.`);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        throw new Error('The requested AI model is not available. Please try again or contact support.');
      }
      
      if (error.message.includes('CORS')) {
        setServiceUnavailable(true);
        throw new Error(`Cross-origin request blocked. The Ollama server at ${currentHost} needs to be configured to allow requests from this domain.`);
      }
    }
    
    setServiceUnavailable(true);
    throw new Error('Failed to get streamed response from AI model. Please check your connection and try again.');
  }
}