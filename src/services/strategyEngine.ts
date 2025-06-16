import { z } from 'zod';
import { 
  HistoryMessageType, 
  StrategyRunInput, 
  StrategyRunOutput, 
  FormattedContentType,
  ToolCallContentType,
  MarkdownBlockType,
  AttachmentType,
  ActorType
} from '../schema';
import { OllamaService } from './ollama';

// Task status system
export interface StrategyTask {
  id: string;
  name: string;
  status: 'todo' | 'inProgress' | 'completed' | 'error';
  message: string;
}

// Strategy execution status updates
export interface StrategyStatus {
  tasks: StrategyTask[];
  currentTask?: string;
  actor?: ActorType;
  responseType?: 'formatted' | 'toolCall';
  retryAttempt?: number;
  maxRetries?: number;
  streamingProgress?: number;
}

export type StrategyStatusCallback = (status: StrategyStatus) => void;

// Interface for tracking retry attempts
interface RetryAttempt {
  attempt: number;
  rawResponse: string;
  error: string;
}

// Task manager for strategy execution
class StrategyTaskManager {
  private tasks: StrategyTask[] = [
    {
      id: 'connect',
      name: 'Connexion',
      status: 'todo',
      message: 'Connexion en attente...'
    },
    {
      id: 'analyze',
      name: 'Analyse',
      status: 'todo',
      message: 'Analyse en attente...'
    },
    {
      id: 'identify-actor',
      name: 'Identification',
      status: 'todo',
      message: 'Identification en attente...'
    },
    {
      id: 'generate',
      name: 'Génération',
      status: 'todo',
      message: 'Génération en attente...'
    },
    {
      id: 'validate',
      name: 'Validation',
      status: 'todo',
      message: 'Validation en attente...'
    }
  ];

  private onStatusUpdate?: StrategyStatusCallback;

  constructor(onStatusUpdate?: StrategyStatusCallback) {
    this.onStatusUpdate = onStatusUpdate;
  }

  startTask(taskId: string, message?: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'inProgress';
      if (message) task.message = message;
      this.notifyUpdate(taskId);
    }
  }

  completeTask(taskId: string, message?: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      if (message) task.message = message;
      this.notifyUpdate();
    }
  }

  errorTask(taskId: string, message: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'error';
      task.message = message;
      this.notifyUpdate(taskId);
    }
  }

  updateTaskMessage(taskId: string, message: string): void {
    const task = this.tasks.find(t => t.id === taskId);
    if (task && task.status === 'inProgress') {
      task.message = message;
      this.notifyUpdate(taskId);
    }
  }

  setActor(actor: ActorType): void {
    this.completeTask('identify-actor', `Acteur: ${this.getActorDisplayName(actor)}`);
    this.notifyUpdate(undefined, actor);
  }

  setResponseType(responseType: 'formatted' | 'toolCall'): void {
    this.notifyUpdate(undefined, undefined, responseType);
  }

  setRetryInfo(attempt: number, maxRetries: number): void {
    const task = this.tasks.find(t => t.id === 'validate');
    if (task) {
      task.message = `Tentative ${attempt}/${maxRetries}`;
      this.notifyUpdate('validate', undefined, undefined, attempt, maxRetries);
    }
  }

  updateStreamingProgress(progress: number): void {
    const task = this.tasks.find(t => t.id === 'generate');
    if (task && task.status === 'inProgress') {
      task.message = `Streaming... ${Math.round(progress)}%`;
      this.notifyUpdate('generate', undefined, undefined, undefined, undefined, progress);
    }
  }

  private notifyUpdate(
    currentTask?: string, 
    actor?: ActorType, 
    responseType?: 'formatted' | 'toolCall',
    retryAttempt?: number,
    maxRetries?: number,
    streamingProgress?: number
  ): void {
    if (this.onStatusUpdate) {
      this.onStatusUpdate({
        tasks: [...this.tasks],
        currentTask,
        actor,
        responseType,
        retryAttempt,
        maxRetries,
        streamingProgress
      });
    }
  }

  private getActorDisplayName(actor: ActorType): string {
    const names = {
      'llm': 'Assistant IA',
      'agent': 'Agent IA',
      'tool': 'Outil',
      'user': 'Utilisateur'
    };
    return names[actor] || actor;
  }

  getTasks(): StrategyTask[] {
    return [...this.tasks];
  }

  hasErrors(): boolean {
    return this.tasks.some(task => task.status === 'error');
  }

  isComplete(): boolean {
    return this.tasks.every(task => task.status === 'completed' || task.status === 'error');
  }
}

// Live streaming JSON analyzer
class StreamingJSONAnalyzer {
  private buffer = '';
  private detectedActor: ActorType | null = null;
  private detectedResponseType: 'formatted' | 'toolCall' | null = null;
  private detectedToolName: string | null = null;
  private contentStarted = false;
  private estimatedProgress = 0;
  private taskManager: StrategyTaskManager;

  constructor(taskManager: StrategyTaskManager) {
    this.taskManager = taskManager;
  }

  reset() {
    this.buffer = '';
    this.detectedActor = null;
    this.detectedResponseType = null;
    this.detectedToolName = null;
    this.contentStarted = false;
    this.estimatedProgress = 0;
  }

  addChunk(chunk: string): void {
    this.buffer += chunk;
    this.analyzeBuffer();
  }

  private analyzeBuffer(): void {
    // Try to detect actor if not already detected
    if (!this.detectedActor) {
      const actorMatch = this.buffer.match(/"actor"\s*:\s*"([^"]+)"/);
      if (actorMatch) {
        const actor = actorMatch[1] as ActorType;
        // Validate it's a valid actor
        if (['user', 'llm', 'agent', 'tool'].includes(actor)) {
          this.detectedActor = actor;
          this.taskManager.setActor(actor);
        }
      }
    }

    // Try to detect response type if not already detected
    if (!this.detectedResponseType && this.buffer.includes('"content"')) {
      const typeMatch = this.buffer.match(/"content"\s*:\s*{[^}]*"type"\s*:\s*"([^"]+)"/);
      if (typeMatch) {
        const type = typeMatch[1];
        if (type === 'formatted' || type === 'toolCall') {
          this.detectedResponseType = type;
          this.taskManager.setResponseType(type);
        }
      }
    }

    // Try to detect tool name for tool calls
    if (this.detectedResponseType === 'toolCall' && !this.detectedToolName) {
      const toolNameMatch = this.buffer.match(/"name"\s*:\s*"([^"]+)"/);
      if (toolNameMatch) {
        this.detectedToolName = toolNameMatch[1];
        this.taskManager.updateTaskMessage('generate', `Outil: ${this.detectedToolName}`);
      }
    }

    // Detect if we're streaming content
    if (this.detectedResponseType === 'formatted' && !this.contentStarted) {
      if (this.buffer.includes('"text"') || this.buffer.includes('"blocks"')) {
        this.contentStarted = true;
        this.taskManager.updateTaskMessage('generate', 'Réception du contenu...');
      }
    }

    // Update streaming progress
    const newProgress = this.estimateStreamingProgress();
    if (newProgress > this.estimatedProgress + 5) { // Only update if significant change
      this.estimatedProgress = newProgress;
      this.taskManager.updateStreamingProgress(newProgress);
    }
  }

  private estimateStreamingProgress(): number {
    // Estimate progress based on JSON structure completeness
    let progress = 0;
    
    // Basic structure checks
    if (this.buffer.includes('{')) progress += 10;
    if (this.detectedActor) progress += 20;
    if (this.detectedResponseType) progress += 20;
    if (this.buffer.includes('"content"')) progress += 15;
    
    if (this.detectedResponseType === 'formatted') {
      if (this.buffer.includes('"blocks"')) progress += 15;
      if (this.buffer.includes('"text"')) progress += 10;
      // Estimate text completion
      const textMatches = this.buffer.match(/"text"\s*:\s*"([^"\\]|\\.)*"/g);
      if (textMatches && textMatches.length > 0) {
        const textContent = textMatches[textMatches.length - 1];
        progress += Math.min(textContent.length / 50, 10); // Rough estimate
      }
    } else if (this.detectedResponseType === 'toolCall') {
      if (this.detectedToolName) progress += 10;
      if (this.buffer.includes('"params"')) progress += 10;
      if (this.buffer.includes('"display"')) progress += 10;
    }
    
    // Check for closing braces
    const openBraces = (this.buffer.match(/{/g) || []).length;
    const closeBraces = (this.buffer.match(/}/g) || []).length;
    if (openBraces > 0) {
      progress += Math.min((closeBraces / openBraces) * 10, 10);
    }
    
    return Math.min(progress, 100);
  }

  getBuffer(): string {
    return this.buffer;
  }

  isComplete(): boolean {
    // Basic heuristic to check if JSON might be complete
    if (!this.buffer.trim()) return false;
    
    const openBraces = (this.buffer.match(/{/g) || []).length;
    const closeBraces = (this.buffer.match(/}/g) || []).length;
    
    return openBraces > 0 && openBraces === closeBraces && this.buffer.trim().endsWith('}');
  }
}

// Placeholder Tool Registry
class ToolRegistry {
  static async run(name: string, params: Record<string, unknown>): Promise<FormattedContentType> {
    console.log(`Executing tool: ${name} with params:`, params);
    
    // Placeholder implementation - in reality, this would dispatch to actual tools
    const result = `Tool "${name}" executed successfully with parameters: ${JSON.stringify(params, null, 2)}`;
    
    return {
      type: 'formatted',
      blocks: [{
        type: 'markdown',
        text: `**Tool Execution Result:**\n\n\`\`\`json\n${result}\n\`\`\``
      } as MarkdownBlockType]
    };
  }
}

async function attemptLLMCall(
  messagesWithSystem: Array<{role: 'user' | 'assistant' | 'system', content: string}>,
  taskManager: StrategyTaskManager,
  attemptNumber: number = 1
): Promise<{response: z.infer<typeof StrategyRunOutput>, rawResponse: string}> {
  const maxRetries = 3;
  const retryAttempts: RetryAttempt[] = [];

  for (let attempt = attemptNumber; attempt <= maxRetries; attempt++) {
    const analyzer = new StreamingJSONAnalyzer(taskManager);
    
    try {
      if (attempt > 1) {
        taskManager.setRetryInfo(attempt, maxRetries);
        taskManager.startTask('validate', `Tentative ${attempt}/${maxRetries}`);
      }

      // Start generation task
      taskManager.startTask('generate', attempt === 1 ? 'Génération en cours...' : `Tentative ${attempt}/${maxRetries}`);

      let fullResponse = '';
      let lastUpdateTime = Date.now();
      
      try {
        // Try streaming first
        const stream = await OllamaService.chatStream(messagesWithSystem);
        
        // Start streaming analysis
        taskManager.updateTaskMessage('generate', 'Analyse du streaming...');
        analyzer.reset();
        
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
        
      } catch (streamError) {
        console.error('Streaming error, falling back to regular chat:', streamError);
        
        // Fallback to non-streaming approach
        taskManager.updateTaskMessage('generate', 'Streaming échoué, mode direct...');
        
        fullResponse = await OllamaService.chat(messagesWithSystem);
        
        // Still analyze the full response for feedback
        analyzer.reset();
        analyzer.addChunk(fullResponse);
      }

      // Complete generation task
      taskManager.completeTask('generate', 'Réponse reçue');

      // Start validation task
      taskManager.startTask('validate', 'Validation JSON...');

      // Try to parse the complete response
      try {
        const jsonResponse = JSON.parse(fullResponse);
        const parsedResponse = StrategyRunOutput.parse(jsonResponse);
        
        // Success! Complete validation
        taskManager.completeTask('validate', 'JSON valide');
        
        return { response: parsedResponse, rawResponse: fullResponse };
        
      } catch (parseError) {
        const errorMessage = parseError instanceof Error ? parseError.message : 'Erreur de parsing inconnue';
        
        // Record this failed attempt
        retryAttempts.push({
          attempt,
          rawResponse: fullResponse,
          error: errorMessage
        });

        console.error(`Parse/validation error on attempt ${attempt}:`, parseError);
        console.log(`Raw response attempt ${attempt}:`, fullResponse);

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

      console.error(`Network/service error on attempt ${attempt}:`, error);

      // Mark generation as error
      taskManager.errorTask('generate', `Erreur réseau (${attempt}/${maxRetries})`);

      // If this was the last attempt, throw
      if (attempt === maxRetries) {
        throw error;
      }
      
      // For network errors, wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // This should never be reached, but just in case
  throw new Error('Unexpected error in retry logic');
}

class ValidationError extends Error {
  constructor(message: string, public attempts: RetryAttempt[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

function formatRetryAttemptsForDisplay(attempts: RetryAttempt[]): string {
  const sections = attempts.map(attempt => {
    const truncatedResponse = attempt.rawResponse.length > 500 
      ? attempt.rawResponse.substring(0, 500) + '...' 
      : attempt.rawResponse;
    
    return `<details>
<summary><strong>Tentative ${attempt.attempt}</strong> - ${attempt.error}</summary>

\`\`\`json
${truncatedResponse || 'Aucune réponse reçue'}
\`\`\`

**Détails de l'erreur:** ${attempt.error}
</details>`;
  }).join('\n\n');

  return `**Échecs de validation du schéma:**

${sections}

**Signification:** La réponse du modèle IA ne correspond pas au format attendu après ${attempts.length} tentatives. Cela indique généralement que le modèle a besoin de meilleures instructions ou qu'il y a un problème temporaire avec le formatage de la réponse.`;
}

export async function runStrategy(
  history: HistoryMessageType[],
  context: AttachmentType[] = [],
  onStatusUpdate?: StrategyStatusCallback
): Promise<HistoryMessageType> {
  const taskManager = new StrategyTaskManager(onStatusUpdate);

  try {
    // Task 1: Connect to AI service
    taskManager.startTask('connect', 'Connexion au service IA...');
    
    // Build strategy input
    const strategyInput: z.infer<typeof StrategyRunInput> = {
      history,
      context: context.length > 0 ? context : undefined
    };

    // Validate input
    StrategyRunInput.parse(strategyInput);
    taskManager.completeTask('connect', 'Connecté');

    // Task 2: Analyze request
    taskManager.startTask('analyze', 'Analyse de la requête...');

    // Build system prompt for structured output
    const systemPrompt = `You are part of a composite AI system. You MUST respond with valid JSON that matches this exact schema:

    {
      "actor": "llm" | "agent" | "tool",
      "content": {
        "type": "formatted",
        "blocks": [
          {
            "type": "markdown",
            "text": "Your response in markdown format"
          }
        ]
      }
    }

    OR for tool calls:

    {
      "actor": "tool",
      "content": {
        "type": "toolCall",
        "name": "tool_name",
        "params": { "key": "value" },
        "display": "User-visible description of what the tool will do"
      }
    }

    CRITICAL RULES:
    1. ALWAYS respond with valid JSON only - no other text before or after
    2. Use "formatted" type for regular responses
    3. Use "toolCall" type only when you need to execute a tool
    4. For formatted responses, use markdown in the text field
    5. Available tools: none (respond with formatted content only for now)
    6. The JSON must be parseable and valid
    7. All required fields must be present
    8. Do not include any explanation or commentary outside the JSON
    9. Start your response immediately with the opening brace {
    10. End your response with the closing brace }
    
    Respond to the user's message naturally, but in the structured format above.`;

    // Convert history to chat messages for Ollama
    const chatMessages = history
      .filter(msg => ['user', 'llm'].includes(msg.actor))
      .map(msg => {
        let content = '';
        
        if (msg.content.type === 'formatted') {
          content = msg.content.blocks
            .map(block => block.type === 'markdown' ? block.text : `\`\`\`${block.language || ''}\n${block.code}\n\`\`\``)
            .join('\n\n');
        } else if (msg.content.type === 'toolCall') {
          content = msg.content.display;
        }
        
        return {
          role: msg.actor === 'llm' ? 'assistant' as const : 'user' as const,
          content
        };
      });

    // Add system message
    const messagesWithSystem = [
      { role: 'system' as const, content: systemPrompt },
      ...chatMessages
    ];

    taskManager.completeTask('analyze', 'Requête analysée');

    // Tasks 3-5: Will be managed by the LLM call with live streaming analysis
    taskManager.startTask('identify-actor', 'Identification en cours...');

    // Attempt LLM call with live streaming analysis and retries
    const { response: parsedResponse, rawResponse } = await attemptLLMCall(messagesWithSystem, taskManager);

    // Handle tool calls
    if (parsedResponse.content.type === 'toolCall') {
      const toolResult = await ToolRegistry.run(
        parsedResponse.content.name,
        parsedResponse.content.params
      );

      return {
        id: crypto.randomUUID(),
        actor: 'tool',
        content: toolResult,
        timestamp: new Date(),
        chatId: history[history.length - 1]?.chatId || ''
      };
    }

    return {
      id: crypto.randomUUID(),
      actor: parsedResponse.actor,
      content: parsedResponse.content,
      timestamp: new Date(),
      chatId: history[history.length - 1]?.chatId || ''
    };

  } catch (error) {
    console.error('Strategy execution error:', error);
    
    let errorMessage = 'Une erreur inattendue s\'est produite lors du traitement de votre demande.';
    
    if (error instanceof ValidationError) {
      // Special handling for validation errors with retry information
      const retryDetails = formatRetryAttemptsForDisplay(error.attempts);
      
      errorMessage = `**Échec de validation du schéma après ${error.attempts.length} tentatives**\n\n${retryDetails}\n\n**Étapes suivantes:**\n- Il s'agit généralement d'un problème temporaire avec le format de réponse du modèle IA\n- Veuillez reformuler votre question ou réessayer\n- Si le problème persiste, le service IA peut nécessiter une attention`;
      
      taskManager.errorTask('validate', `Échec après ${error.attempts.length} tentatives`);
      
    } else if (error instanceof Error) {
      // Handle specific connection and service errors
      if (error.message.includes('Connection to AI service failed') ||
          error.message.includes('Unable to connect to the AI service') ||
          error.message.includes('AI service is currently unavailable') ||
          error.message.includes('Cross-origin request blocked')) {
        errorMessage = `**Erreur de connexion au service IA**\n\n${error.message}\n\n**Solutions possibles:**\n- Vérifiez si le serveur Ollama fonctionne à \`https://hackathon.journeesdecouverte.fr/ollama\`\n- Assurez-vous que le serveur autorise les requêtes CORS depuis \`http://localhost:5173\`\n- Contactez votre administrateur système si le problème persiste`;
        
        taskManager.errorTask('connect', 'Connexion échouée');
        
      } else if (error.message.includes('Failed to get response from AI model')) {
        errorMessage = `**Erreur du modèle IA**\n\n${error.message}\n\nVeuillez vérifier votre connexion et réessayer. Si le problème persiste, le service IA peut être temporairement indisponible.`;
        
        taskManager.errorTask('generate', 'Génération échouée');
        
      } else {
        errorMessage = `**Erreur:** ${error.message}`;
      }
    }
    
    // Return error message as structured content
    return {
      id: crypto.randomUUID(),
      actor: 'llm',
      content: {
        type: 'formatted',
        blocks: [{
          type: 'markdown',
          text: `Je m'excuse, mais j'ai rencontré une erreur lors du traitement de votre demande.\n\n${errorMessage}\n\nVeuillez réessayer, et si le problème persiste, contactez le support.`
        }]
      },
      timestamp: new Date(),
      chatId: history[history.length - 1]?.chatId || ''
    };
  }
}