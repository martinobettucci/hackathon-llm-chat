import { HistoryMessageType } from '../../schema';
import { OllamaService } from '../ollama';
import { StrategyTaskManager } from './strategyTaskManager';

interface ReasoningIndicators {
  complexityScore: number;
  frustrationScore: number;
  repetitionScore: number;
  longConversationBonus: number;
  backAndForthBonus: number;
  totalScore: number;
}

// Calculate reasoning indicators based on conversation analysis
function calculateReasoningIndicators(history: HistoryMessageType[], userIntent: string): ReasoningIndicators {
  // Extract all conversation content for analysis
  const conversationContent = history
    .map(msg => {
      if (msg.content.type === 'formatted') {
        return msg.content.blocks
          .map(block => block.type === 'markdown' ? block.text : block.code)
          .join(' ');
      } else if (msg.content.type === 'toolCall') {
        return msg.content.display;
      }
      return '';
    })
    .join(' ')
    .toLowerCase();

  const fullContext = `${conversationContent} ${userIntent}`.toLowerCase();
  
  // Keywords indicating complex reasoning needs
  const complexityKeywords = [
    // Mathematics and calculations
    'calcul', 'math', 'équation', 'algorithme', 'formule', 'démonstration',
    'preuve', 'théorème', 'intégrale', 'dérivée', 'statistique', 'probabilité',
    
    // Programming and debugging
    'code', 'programme', 'debug', 'erreur', 'bug', 'algorithme', 'logique',
    'optimisation', 'performance', 'architecture', 'design pattern',
    
    // Complex analysis
    'analyse', 'réflexion', 'raisonnement', 'complexe', 'difficile',
    'logique', 'stratégie', 'solution', 'problème', 'résoudre',
    
    // Scientific reasoning
    'recherche', 'hypothèse', 'méthodologie', 'comparaison', 'évaluation',
    
    // Decision making
    'décision', 'choix', 'option', 'alternative', 'peser', 'considérer',
    
    // Step-by-step reasoning
    'étape', 'processus', 'méthode', 'procédure', 'séquence'
  ];

  // Frustration indicators
  const frustrationKeywords = [
    'bête', 'idiot', 'stupide', 'nul', 'mauvais', 'incompétent',
    'réfléchis', 'reflechis', 'pense', 'regarde mieux', 'écoute moi bien',
    'écoute-moi bien', 'attention', 'concentre', 'focus',
    'encore', 'toujours', 'jamais', 'arrête', 'stop',
    'frustré', 'énervé', 'agacé', 'en colère', 'fâché'
  ];

  // Repetition/confusion indicators
  const repetitionKeywords = [
    'répète', 'encore une fois', 'redis', 'redites', 'expliquez encore',
    'je ne comprends pas', 'comprends pas', 'confus', 'perdu',
    'tourne en rond', 'circle', 'même chose', 'pareil'
  ];

  // Count occurrences
  let complexityScore = 0;
  let frustrationScore = 0;
  let repetitionScore = 0;

  complexityKeywords.forEach(keyword => {
    const matches = (fullContext.match(new RegExp(keyword, 'g')) || []).length;
    complexityScore += matches;
  });

  frustrationKeywords.forEach(keyword => {
    const matches = (fullContext.match(new RegExp(keyword, 'g')) || []).length;
    frustrationScore += matches * 2; // Frustration is a strong indicator
  });

  repetitionKeywords.forEach(keyword => {
    const matches = (fullContext.match(new RegExp(keyword, 'g')) || []).length;
    repetitionScore += matches * 1.5; // Repetition is a moderate indicator
  });

  // Check conversation length - longer conversations might benefit from thinking
  const conversationLength = history.length;
  const longConversationBonus = conversationLength > 10 ? 1 : 0;

  // Check for back-and-forth patterns (potential confusion)
  const userMessages = history.filter(msg => msg.actor === 'user');
  const backAndForthBonus = userMessages.length > 3 ? 1 : 0;

  const totalScore = complexityScore + frustrationScore + repetitionScore + longConversationBonus + backAndForthBonus;

  return {
    complexityScore,
    frustrationScore,
    repetitionScore,
    longConversationBonus,
    backAndForthBonus,
    totalScore
  };
}

// Use LLM to make the final decision about advanced reasoning
async function decideAdvancedReasoningWithLLM(
  history: HistoryMessageType[],
  userIntent: string,
  indicators: ReasoningIndicators,
  taskManager: StrategyTaskManager
): Promise<boolean> {
  try {
    taskManager.updateTaskMessage('advanced-reasoning', 'Consultation du modèle pour la décision...');

    // Build system prompt for the reasoning evaluator
    const systemPrompt = `You are a reasoning evaluator. Your job is to determine whether a complex AI reasoning mode (thinking mode) should be activated for a user's query.

DECISION CRITERIA:
- Activate thinking mode for: complex mathematical problems, multi-step reasoning, debugging, analysis requiring step-by-step logic, scientific reasoning, decision-making with trade-offs
- Do NOT activate for: simple questions, basic information requests, straightforward tasks, casual conversation

ANALYSIS CONTEXT:
You have access to conversation indicators that have been pre-analyzed:
- Complexity score: ${indicators.complexityScore} (keywords indicating complex reasoning needs)
- Frustration score: ${indicators.frustrationScore} (user showing frustration or difficulty)
- Repetition score: ${indicators.repetitionScore} (user asking for clarification or repetition)
- Long conversation bonus: ${indicators.longConversationBonus} (extended back-and-forth)
- Back-and-forth bonus: ${indicators.backAndForthBonus} (multiple user interactions)
- Total preliminary score: ${indicators.totalScore}

CONVERSATION LENGTH: ${history.length} messages
USER INTENT: "${userIntent}"

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "activate_thinking_mode": true/false,
  "reason": "Brief explanation of your decision (max 100 characters)"
}

Consider the conversation context, user intent, and indicators to make your decision.`;

    // Build user prompt with conversation summary
    const recentMessages = history.slice(-6); // Last 6 messages for context
    const conversationSummary = recentMessages.map((msg, index) => {
      const content = msg.content.type === 'formatted' 
        ? msg.content.blocks.map(block => block.type === 'markdown' ? block.text : block.code).join(' ')
        : msg.content.display;
      
      return `${msg.actor.toUpperCase()}: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`;
    }).join('\n');

    const userPrompt = `CONVERSATION CONTEXT (recent messages):
${conversationSummary}

EXTRACTED USER INTENT: "${userIntent}"

ANALYSIS SUMMARY:
- Total complexity indicators: ${indicators.totalScore}
- Primary factors: ${indicators.complexityScore > 0 ? `complexity (${indicators.complexityScore})` : ''} ${indicators.frustrationScore > 0 ? `frustration (${indicators.frustrationScore})` : ''} ${indicators.repetitionScore > 0 ? `repetition (${indicators.repetitionScore})` : ''}
- Conversation factors: ${indicators.longConversationBonus > 0 ? 'long conversation' : ''} ${indicators.backAndForthBonus > 0 ? 'multiple exchanges' : ''}

Should thinking mode be activated for this user query?`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userPrompt }
    ];

    // Call the LLM to make the decision (without think mode to avoid recursion)
    const response = await OllamaService.chat(messages, undefined, false);

    taskManager.updateTaskMessage('advanced-reasoning', 'Analyse de la décision du modèle...');

    // Parse the JSON response
    let decision: { activate_thinking_mode: boolean; reason: string };
    
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      decision = JSON.parse(jsonMatch[0]);
      
      if (typeof decision.activate_thinking_mode !== 'boolean' || typeof decision.reason !== 'string') {
        throw new Error('Invalid decision format');
      }
      
    } catch (parseError) {
      console.warn('Failed to parse LLM decision, falling back to score-based decision:', parseError);
      console.log('Raw LLM response:', response);
      
      // Fallback to score-based decision if parsing fails
      const fallbackDecision = indicators.totalScore >= 3;
      decision = {
        activate_thinking_mode: fallbackDecision,
        reason: `Fallback: score ${indicators.totalScore} ${fallbackDecision ? '>=' : '<'} 3`
      };
    }

    // Log the LLM decision details
    console.log('🤖 [ADVANCED-REASONING] LLM Decision Report:');
    console.log(`   🎯 User Intent: "${userIntent}"`);
    console.log(`   📊 Calculated Indicators:`);
    console.log(`      - Complexity: ${indicators.complexityScore}`);
    console.log(`      - Frustration: ${indicators.frustrationScore}`);
    console.log(`      - Repetition: ${indicators.repetitionScore}`);
    console.log(`      - Long conversation: ${indicators.longConversationBonus}`);
    console.log(`      - Back-and-forth: ${indicators.backAndForthBonus}`);
    console.log(`      - Total Score: ${indicators.totalScore}`);
    console.log(`   🧠 LLM Decision: ${decision.activate_thinking_mode ? 'ACTIVATE' : 'SKIP'} thinking mode`);
    console.log(`   💬 LLM Reason: "${decision.reason}"`);
    console.log(`   📝 Conversation Length: ${history.length} messages`);

    return decision.activate_thinking_mode;

  } catch (error) {
    console.error('Error in LLM-based reasoning decision:', error);
    console.log('🚨 [ADVANCED-REASONING] LLM decision failed, using fallback');
    
    taskManager.updateTaskMessage('advanced-reasoning', 'Erreur LLM, fallback sur score...');
    
    // Fallback to score-based decision
    const fallbackDecision = indicators.totalScore >= 3;
    
    console.log(`   🔄 Fallback Decision: ${fallbackDecision ? 'ACTIVATE' : 'SKIP'} (score: ${indicators.totalScore})`);
    
    return fallbackDecision;
  }
}

// Main function: Advanced reasoning decision with LLM consultation
export async function shouldActivateAdvancedReasoning(
  history: HistoryMessageType[],
  userIntent: string,
  taskManager: StrategyTaskManager
): Promise<boolean> {
  try {
    taskManager.updateTaskMessage('advanced-reasoning', 'Analyse des indicateurs de complexité...');

    // Step 1: Calculate reasoning indicators
    const indicators = calculateReasoningIndicators(history, userIntent);
    
    // Step 2: Check preliminary threshold
    if (indicators.totalScore < 3) {
      // Below threshold - skip thinking mode without consulting LLM
      taskManager.completeTask('advanced-reasoning', `Score insuffisant (${indicators.totalScore} < 3)`);
      
      console.log('🎯 [ADVANCED-REASONING] Quick Decision - Below Threshold:');
      console.log(`   📊 Total Score: ${indicators.totalScore} < 3`);
      console.log(`   ⚡ Decision: SKIP (no LLM consultation needed)`);
      
      return false;
    }

    // Step 3: Above threshold - consult LLM for final decision
    taskManager.updateTaskMessage('advanced-reasoning', 'Seuil atteint, consultation du modèle...');
    
    const llmDecision = await decideAdvancedReasoningWithLLM(
      history,
      userIntent,
      indicators,
      taskManager
    );

    // Complete the task with appropriate message
    const reasoningDetails = [];
    if (indicators.complexityScore > 0) reasoningDetails.push(`complexité: ${indicators.complexityScore}`);
    if (indicators.frustrationScore > 0) reasoningDetails.push(`frustration: ${indicators.frustrationScore}`);
    if (indicators.repetitionScore > 0) reasoningDetails.push(`répétition: ${indicators.repetitionScore}`);
    if (indicators.longConversationBonus > 0) reasoningDetails.push('conversation longue');
    if (indicators.backAndForthBonus > 0) reasoningDetails.push('échanges multiples');

    if (llmDecision) {
      taskManager.completeTask('advanced-reasoning', `Activé par LLM (score: ${indicators.totalScore} - ${reasoningDetails.join(', ')})`);
    } else {
      taskManager.completeTask('advanced-reasoning', `Refusé par LLM (score: ${indicators.totalScore} - ${reasoningDetails.join(', ')})`);
    }

    return llmDecision;

  } catch (error) {
    console.error('Error in advanced reasoning analysis:', error);
    taskManager.errorTask('advanced-reasoning', 'Erreur d\'analyse');
    
    // 🚨 LOG: Erreur d'analyse de raisonnement avancé
    console.error('❌ [ADVANCED-REASONING] Erreur lors de l\'analyse:', error instanceof Error ? error.message : 'Erreur inconnue');
    
    return false; // Default to no advanced reasoning on error
  }
}