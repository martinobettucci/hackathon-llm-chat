const SIMILARITY_THRESHOLD_KEY = 'similarity_threshold';
const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

export function getSimilarityThreshold(): number {
  try {
    const stored = localStorage.getItem(SIMILARITY_THRESHOLD_KEY);
    if (stored !== null) {
      const parsed = parseFloat(stored);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error getting similarity threshold:', error);
  }
  return DEFAULT_SIMILARITY_THRESHOLD;
}

export function setSimilarityThreshold(threshold: number): void {
  try {
    // Validate threshold is between 0 and 1
    if (threshold < 0 || threshold > 1 || isNaN(threshold)) {
      throw new Error('Similarity threshold must be between 0 and 1');
    }
    localStorage.setItem(SIMILARITY_THRESHOLD_KEY, threshold.toString());
  } catch (error) {
    console.error('Error setting similarity threshold:', error);
    throw error;
  }
}

export function getDefaultSimilarityThreshold(): number {
  return DEFAULT_SIMILARITY_THRESHOLD;
}

export function isUsingDefaultSimilarityThreshold(): boolean {
  const current = getSimilarityThreshold();
  return current === DEFAULT_SIMILARITY_THRESHOLD;
}

export function resetSimilarityThreshold(): void {
  try {
    localStorage.removeItem(SIMILARITY_THRESHOLD_KEY);
  } catch (error) {
    console.error('Error resetting similarity threshold:', error);
  }
}