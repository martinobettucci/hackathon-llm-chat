import { z } from 'zod';
import { 
  HistoryMessageType, 
  StrategyRunInput, 
  AttachmentType,
  MarkdownBlockType,
  ActorType
} from '../../schema';
import { OllamaService } from '../ollama';
import { StrategyTaskManager, StrategyStatusCallback } from './strategyTaskManager';
import { attemptLLMCall } from './llmCallHandler';
import { ToolRegistry } from './toolRegistry';
import { retrieveRelevantDocuments } from './ragRetrieval';
import { shouldActivateAdvancedReasoning } from './advancedReasoning';
import { ValidationError, formatRetryAttemptsForDisplay } from './validationError';

export async function runStrategy(
  history: HistoryMessageType[],
  context: AttachmentType[] = [],
  onStatusUpdate?: StrategyStatusCallback,
  projectId?: string
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

    // Task 2: Extract user intent from conversation history
    let extractedUserIntent = '';
    const lastUserMessage = [...history].reverse().find(msg => msg.actor === 'user');
    
    if (lastUserMessage && history.length > 2) { // Only extract intent if there's a conversation history
      taskManager.startTask('user-intent', 'Extraction de l\'intention utilisateur...');
      
      try {
        // Convert history to chat messages for intent extraction
        const chatHistory = history
          .filter(msg => ['user', 'llm', 'agent'].includes(msg.actor))
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
              role: msg.actor === 'llm' ? 'assistant' as const : msg.actor === 'agent' ? 'assistant' as const : 'user' as const,
              content
            };
          });

        taskManager.updateTaskMessage('user-intent', 'Reformulation de l\'intention complète...');
        extractedUserIntent = await OllamaService.extractUserIntent(chatHistory);
        
        taskManager.completeTask('user-intent', `Intention extraite: "${extractedUserIntent.substring(0, 50)}${extractedUserIntent.length > 50 ? '...' : ''}"`);
        
      } catch (error) {
        console.error('Error extracting user intent:', error);
        taskManager.errorTask('user-intent', 'Erreur d\'extraction d\'intention');
        
        // Fallback to the last user message
        if (lastUserMessage.content.type === 'formatted') {
          extractedUserIntent = lastUserMessage.content.blocks
            .map(block => block.type === 'markdown' ? block.text : block.code)
            .join(' ');
        }
      }
    } else if (lastUserMessage) {
      // No conversation history, use the current message directly
      taskManager.startTask('user-intent', 'Utilisation du message actuel...');
      
      if (lastUserMessage.content.type === 'formatted') {
        extractedUserIntent = lastUserMessage.content.blocks
          .map(block => block.type === 'markdown' ? block.text : block.code)
          .join(' ');
      }
      
      taskManager.completeTask('user-intent', 'Message actuel utilisé');
    }

    // Task 3: Advanced reasoning decision
    taskManager.startTask('advanced-reasoning', 'Évaluation du besoin de réflexion avancée...');
    
    const activateThinkMode = await shouldActivateAdvancedReasoning(
      history,
      extractedUserIntent,
      taskManager
    );

    // Set thinking mode in task manager when activated
    if (activateThinkMode) {
      taskManager.setThinkingMode(true);
    }

    // Task 4: Retrieve relevant documents from knowledge base using extracted intent
    let augmentedContext = '';
    let ragAgentMessage: HistoryMessageType | null = null;

    if (extractedUserIntent && projectId) {
      const { documents, contextInfo } = await retrieveRelevantDocuments(
        extractedUserIntent, // Use extracted intent instead of just the last message
        projectId,
        taskManager
      );

      if (documents.length > 0) {
        // Create augmented context for the LLM using chunks with hierarchical headers
        augmentedContext = documents.map(doc => {
          let chunkContext = `## ${doc.title}\n${doc.content}\n`;
          
          // Add parent document context if different from chunk title
          if (doc.parentDocumentTitle && doc.parentDocumentTitle !== doc.title) {
            chunkContext = `### Provenance: ${doc.parentDocumentTitle} (Section ${doc.chunkOrder + 1})\n${chunkContext}`;
          }
          
          return chunkContext;
        }).join('\n');

        // Create enhanced agent message to inform the user about context augmentation
        const documentList = documents.map(doc => {
          if (doc.parentDocumentTitle && doc.parentDocumentTitle !== doc.title) {
            return `• **${doc.title}** (de "${doc.parentDocumentTitle}")`;
          }
          return `• **${doc.title}**`;
        }).join('\n');

        ragAgentMessage = {
          id: crypto.randomUUID(),
          actor: 'agent',
          content: {
            type: 'formatted',
            blocks: [{
              type: 'markdown',
              text: `🔍 **${contextInfo}**\n\nSections trouvées:\n${documentList}\n\nJ'ai analysé votre intention dans le contexte de notre conversation et trouvé des sections pertinentes dans votre base de connaissances. Ces informations contextuelles, incluant leurs chapitres hiérarchiques, m'aideront à vous fournir une réponse plus précise et personnalisée basée sur vos documents.`
            } as MarkdownBlockType]
          },
          timestamp: new Date(),
          chatId: lastUserMessage?.chatId || ''
        };
      }
    }

    // Task 5: Analyze request
    taskManager.startTask('analyze', 'Analyse de la requête...');

    // Build system prompt for structured output
    let systemPrompt = `You are part of a composite AI system. You MUST respond with valid JSON that matches this exact schema:

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

    // Append augmented context if available
    if (augmentedContext) {
      systemPrompt += `

ADDITIONAL CONTEXT FROM KNOWLEDGE BASE:
The following information has been retrieved from the user's knowledge base based on their complete intent analysis from the conversation history. Each section includes its hierarchical context (titles, chapters, etc.) for better understanding. Use this context to inform your response, but integrate it naturally without explicitly mentioning that you're using external context unless specifically asked:

${augmentedContext}

Use this contextual information to provide a more informed, accurate, and personalized response. When referencing information from the knowledge base, you can naturally mention the source chapter or document if it helps provide context. Prioritize information from the knowledge base when it's relevant to the user's question.`;
    }

    // Convert history to chat messages for Ollama (including agent messages)
    const chatMessages = history
      .filter(msg => ['user', 'llm', 'agent'].includes(msg.actor))
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
          role: msg.actor === 'llm' ? 'assistant' as const : msg.actor === 'agent' ? 'assistant' as const : 'user' as const,
          content
        };
      });

    // Add system message
    const messagesWithSystem = [
      { role: 'system' as const, content: systemPrompt },
      ...chatMessages
    ];

    taskManager.completeTask('analyze', 'Requête analysée');

    // Tasks 6-8: Will be managed by the LLM call with live streaming analysis
    taskManager.startTask('identify-actor', 'Identification en cours...');

    // Attempt LLM call with live streaming analysis, retries, and advanced reasoning
    const { response: parsedResponse, rawResponse } = await attemptLLMCall(
      messagesWithSystem, 
      taskManager, 
      activateThinkMode
    );

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

    // Create the LLM response
    let llmResponse: HistoryMessageType = {
      id: crypto.randomUUID(),
      actor: parsedResponse.actor,
      content: parsedResponse.content,
      timestamp: new Date(),
      chatId: history[history.length - 1]?.chatId || ''
    };

    // Add subtle notification if advanced reasoning was activated
    if (activateThinkMode && parsedResponse.content.type === 'formatted') {
      const thinkingNotification: MarkdownBlockType = {
        type: 'markdown',
        text: '_🧠 Cette réponse a été générée avec un raisonnement avancé._'
      };
      
      // Add the notification as the last block
      llmResponse.content.blocks.push(thinkingNotification);
    }

    // Store the RAG agent message for the calling code to handle
    if (ragAgentMessage) {
      (llmResponse as any).ragAgentMessage = ragAgentMessage;
    }

    return llmResponse;

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
        errorMessage = `**Erreur de connexion au service IA**\n\n${error.message}\n\n**Solutions possibles:**\n- Vérifiez si le serveur Ollama fonctionne\n- Assurez-vous que le serveur autorise les requêtes CORS\n- Contactez votre administrateur système si le problème persiste`;
        
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
    
  } finally {
    // Always ensure thinking mode is reset
    taskManager.setThinkingMode(false);
  }
}