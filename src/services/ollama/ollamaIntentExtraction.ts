import { ollama, getCurrentOllamaHost } from './ollamaClient';
import { getAvailableModel, setServiceUnavailable } from './ollamaModels';
import { ChatMessage } from './ollamaChat';

export async function extractUserIntent(conversationHistory: ChatMessage[]): Promise<string> {
  try {
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

    const selectedModel = await getAvailableModel();
    
    const response = await ollama.chat({
      model: selectedModel,
      messages,
      stream: false,
      think: true               // Active le "thinking"
    });
    
    // Reset service unavailable flag on successful response
    setServiceUnavailable(false);
    
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
      
      // Re-throw our custom error messages
      if (error.message.includes('No conversation history provided')) {
        throw error;
      }
    }
    
    setServiceUnavailable(true);
    throw new Error('Failed to extract user intent. Please check your connection and try again.');
  }
}