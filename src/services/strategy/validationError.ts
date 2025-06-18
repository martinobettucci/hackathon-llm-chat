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