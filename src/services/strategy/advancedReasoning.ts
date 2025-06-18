import { HistoryMessageType } from '../../schema';
import { StrategyTaskManager } from './strategyTaskManager';

// Advanced reasoning decision function
export async function shouldActivateAdvancedReasoning(
  history: HistoryMessageType[],
  userIntent: string,
  taskManager: StrategyTaskManager
): Promise<boolean> {
  try {
    taskManager.updateTaskMessage('advanced-reasoning', 'Analyse des indicateurs de complexité...');

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
      'recherche', 'hypothèse', 'méthodologie', 'comparaison', 'évaluation'
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
    
    // Decision threshold - activate thinking if score >= 2
    const shouldActivate = totalScore >= 2;

    // Log decision details for debugging
    console.log('Advanced reasoning decision:', {
      complexityScore,
      frustrationScore,
      repetitionScore,
      longConversationBonus,
      backAndForthBonus,
      totalScore,
      shouldActivate,
      userIntent: userIntent.substring(0, 100)
    });

    const reasoningDetails = [];
    if (complexityScore > 0) reasoningDetails.push(`complexité: ${complexityScore}`);
    if (frustrationScore > 0) reasoningDetails.push(`frustration: ${frustrationScore}`);
    if (repetitionScore > 0) reasoningDetails.push(`répétition: ${repetitionScore}`);
    if (longConversationBonus > 0) reasoningDetails.push('conversation longue');
    if (backAndForthBonus > 0) reasoningDetails.push('échanges multiples');

    if (shouldActivate) {
      taskManager.completeTask('advanced-reasoning', `Activé (score: ${totalScore} - ${reasoningDetails.join(', ')})`);
    } else {
      taskManager.completeTask('advanced-reasoning', `Non nécessaire (score: ${totalScore})`);
    }

    return shouldActivate;

  } catch (error) {
    console.error('Error in advanced reasoning analysis:', error);
    taskManager.errorTask('advanced-reasoning', 'Erreur d\'analyse');
    return false; // Default to no advanced reasoning on error
  }
}