import { ActorType } from '../../schema';

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

// Task manager for strategy execution
export class StrategyTaskManager {
  private tasks: StrategyTask[] = [
    {
      id: 'connect',
      name: 'Connexion',
      status: 'todo',
      message: 'Connexion en attente...'
    },
    {
      id: 'user-intent',
      name: 'Intention',
      status: 'todo',
      message: 'Extraction de l\'intention en attente...'
    },
    {
      id: 'advanced-reasoning',
      name: 'Raisonnement Avancé',
      status: 'todo',
      message: 'Évaluation du besoin de réflexion avancée...'
    },
    {
      id: 'retrieve',
      name: 'Récupération',
      status: 'todo',
      message: 'Récupération en attente...'
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