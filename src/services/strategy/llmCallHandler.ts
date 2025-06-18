import { z } from 'zod';
import { StrategyRunOutput } from '../../schema';
import { OllamaService } from '../ollama';
import { StrategyTaskManager } from './strategyTaskManager';
import { StreamingJSONAnalyzer } from './streamingJSONAnalyzer';
import { ValidationError, RetryAttempt } from './validationError';
import { extractJSONFromResponse } from './jsonExtraction';

export async function attemptLLMCall(
  messagesWithSystem: Array<{role: 'user' | 'assistant' | 'system', content: string}>,
  taskManager: StrategyTaskManager,
  activateThinkMode: boolean = false,
  attemptNumber: number = 1
): Promise<{response: z.infer<typeof StrategyRunOutput>, rawResponse: string}> {
  const maxRetries = 3;
  const retryAttempts: RetryAttempt[] = [];

  // Set thinking mode in task manager
  taskManager.setThinkingMode(activateThinkMode);

  for (let attempt = attemptNumber; attempt <= maxRetries; attempt++) {
    const analyzer = new StreamingJSONAnalyzer(taskManager);
    
    try {
      if (attempt > 1) {
        taskManager.setRetryInfo(attempt, maxRetries);
        taskManager.startTask('validate', `Tentative ${attempt}/${maxRetries}`);
      }

      // Start generation task with appropriate message
      const generationMessage = attempt === 1 
        ? (activateThinkMode ? '🧠 Le modèle réfléchit...' : 'Génération en cours...')
        : `Tentative ${attempt}/${maxRetries}`;
      
      taskManager.startTask('generate', generationMessage);

      let fullResponse = '';
      
      try {
        // CRITICAL: If think mode is activated, DO NOT use streaming
        if (activateThinkMode) {
          console.log('[DEBUG] Think mode activated - using non-streaming chat');
          
          // Use non-streaming approach when thinking mode is active
          taskManager.updateTaskMessage('generate', '🧠 Réflexion en cours...');
          
          fullResponse = await OllamaService.chat(messagesWithSystem, undefined, true);
          
          // Still analyze the full response for feedback
          analyzer.reset();
          analyzer.addChunk(fullResponse);
          
        } else {
          console.log('[DEBUG] Normal mode - using streaming chat');
          
          // Use streaming approach when thinking mode is NOT active
          const stream = await OllamaService.chatStream(messagesWithSystem, undefined, false);
          
          // Start streaming analysis
          taskManager.updateTaskMessage('generate', 'Analyse du streaming...');
          analyzer.reset();
          
          let lastUpdateTime = Date.now();
          
          for await (const part of stream) {
            if (part.message?.content) {
              const chunk = part.message.content;
              fullResponse += chunk;
              
              // Analyze the chunk for live feedback
              analyzer.addChunk(chunk);
              
              // Throttle updates to avoid spamming
              const now = Date.now();
              if (now - lastUpdateTime > 200) { // Update every 200ms max
                lastUpdateTime = now;
              }
            }
          }
        }
        
      } catch (streamError) {
        console.error('LLM call error, trying fallback:', streamError);
        
        // Fallback to non-streaming approach regardless of think mode
        taskManager.updateTaskMessage('generate', 'Erreur streaming, mode direct...');
        
        fullResponse = await OllamaService.chat(messagesWithSystem, undefined, activateThinkMode);
        
        // Still analyze the full response for feedback
        analyzer.reset();
        analyzer.addChunk(fullResponse);
      }

      // Complete generation task with appropriate message
      const completionMessage = activateThinkMode 
        ? '🧠 Réflexion terminée' 
        : 'Réponse reçue';
      
      taskManager.completeTask('generate', completionMessage);

      // Start validation task
      taskManager.startTask('validate', 'Extraction JSON...');

      // Log the full response for debugging
      console.log(`[DEBUG] Full response from LLM (attempt ${attempt}, think: ${activateThinkMode}):`, fullResponse);

      // Extract JSON content from the response
      let jsonContent: string;
      try {
        jsonContent = extractJSONFromResponse(fullResponse);
        taskManager.updateTaskMessage('validate', 'JSON extrait, validation...');
        
        // Log the extracted JSON for debugging
        console.log(`[DEBUG] Extracted JSON content (attempt ${attempt}):`, jsonContent);
        
      } catch (extractError) {
        const errorMessage = extractError instanceof Error ? extractError.message : 'Erreur d\'extraction JSON inconnue';
        
        // Record this failed attempt with full details
        retryAttempts.push({
          attempt,
          rawResponse: fullResponse,
          error: `JSON extraction failed: ${errorMessage}`
        });

        console.error(`[ERROR] JSON extraction error on attempt ${attempt}:`, extractError);
        console.log(`[DEBUG] Problematic raw response (attempt ${attempt}):`, fullResponse.substring(0, 1000) + (fullResponse.length > 1000 ? '...' : ''));

        // Mark validation as error
        taskManager.errorTask('validate', `Extraction JSON échouée (${attempt}/${maxRetries})`);

        // If this was the last attempt, throw with all attempt details
        if (attempt === maxRetries) {
          throw new ValidationError('JSON extraction failed after all retries', retryAttempts);
        }
        
        // Continue to next retry attempt
        continue;
      }

      // Try to parse the extracted JSON content
      try {
        const jsonResponse = JSON.parse(jsonContent);
        const parsedResponse = StrategyRunOutput.parse(jsonResponse);
        
        // Success! Complete validation
        taskManager.completeTask('validate', 'JSON valide');
        
        console.log(`[SUCCESS] JSON successfully parsed and validated on attempt ${attempt} (think: ${activateThinkMode})`);
        
        return { response: parsedResponse, rawResponse: fullResponse };
        
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Erreur de parsing inconnue';
        
        // Record this failed attempt with full details
        retryAttempts.push({
          attempt,
          rawResponse: fullResponse,
          error: `JSON parsing/validation failed: ${errorMessage}`
        });

        console.error(`[ERROR] Parse/validation error on attempt ${attempt}:`, parseError);
        console.log(`[DEBUG] Failed to parse JSON content (attempt ${attempt}):`, jsonContent);
        console.log(`[DEBUG] Full raw response (attempt ${attempt}):`, fullResponse.substring(0, 1000) + (fullResponse.length > 1000 ? '...' : ''));

        // Mark validation as error
        taskManager.errorTask('validate', `Validation échouée (${attempt}/${maxRetries})`);

        // If this was the last attempt, throw with all attempt details
        if (attempt === maxRetries) {
          throw new ValidationError('Schema validation failed after all retries', retryAttempts);
        }
        
        // Continue to next retry attempt
        continue;
      }

    } catch (error) {
      // If it's a ValidationError, re-throw it
      if (error instanceof ValidationError) {
        throw error;
      }

      // For other errors (network, etc.), record and potentially retry
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      retryAttempts.push({
        attempt,
        rawResponse: analyzer.getBuffer(),
        error: errorMessage
      });

      console.error(`[ERROR] Network/service error on attempt ${attempt}:`, error);

      // Mark generation as error
      taskManager.errorTask('generate', `Erreur réseau (${attempt}/${maxRetries})`);

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw error;
      }
      
      // For network errors, wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      
    } finally {
      // Always reset thinking mode when done (success or failure)
      taskManager.setThinkingMode(false);
    }
  }

  // This should never be reached, but just in case
  throw new Error('Unexpected error in retry logic');
}