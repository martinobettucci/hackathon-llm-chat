import { ActorType } from '../../schema';
import { StrategyTaskManager } from './strategyTaskManager';

// Live streaming JSON analyzer
export class StreamingJSONAnalyzer {
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