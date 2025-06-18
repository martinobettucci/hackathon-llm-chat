// Interface for tracking retry attempts
export interface RetryAttempt {
  attempt: number;
  rawResponse: string;
  error: string;
}

export class ValidationError extends Error {
  constructor(message: string, public attempts: RetryAttempt[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function formatRetryAttemptsForDisplay(attempts: RetryAttempt[]): string {
  const sections = attempts.map(attempt => {
    // Show more of the raw response for better debugging
    const truncatedResponse = attempt.rawResponse.length > 800 
      ? attempt.rawResponse.substring(0, 800) + '...' 
      : attempt.rawResponse;
    
    return `<details>
<summary><strong>Tentative ${attempt.attempt}</strong> - ${attempt.error}</summary>

**Réponse brute reçue:**
\`\`\`
${truncatedResponse || 'Aucune réponse reçue'}
\`\`\`

**Détails de l'erreur:** ${attempt.error}

**Longueur de la réponse:** ${attempt.rawResponse.length} caractères
</details>`;
  }).join('\n\n');

  return `**Échecs de validation du schéma après ${attempts.length} tentatives:**

${sections}

**Diagnostic:**
- La réponse du modèle IA ne correspond pas au format JSON attendu
- Cela peut indiquer un problème avec le prompt système ou le modèle
- Consultez les détails ci-dessus pour identifier le problème spécifique

**Solutions:**
- Vérifiez que le modèle sélectionné supporte le format JSON structuré
- Si le problème persiste, essayez de reformuler votre question
- Contactez le support si les erreurs se répètent`;
}