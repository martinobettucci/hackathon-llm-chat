import React from 'react';
import { CheckCircle, Loader2, AlertCircle, Brain } from 'lucide-react';
import { StrategyStatus } from '../../services/strategy';

interface StrategyStatusIndicatorProps {
  status: StrategyStatus;
}

export function StrategyStatusIndicator({ status }: StrategyStatusIndicatorProps) {
  // Find the current active task
  const activeTask = status.tasks.find(task => task.status === 'inProgress');
  const errorTask = status.tasks.find(task => task.status === 'error');
  
  // Count completed tasks
  const completedCount = status.tasks.filter(t => t.status === 'completed').length;
  const totalCount = status.tasks.length;

  // Determine what to show
  const currentTask = errorTask || activeTask;
  if (!currentTask) return null;

  const getStatusIcon = () => {
    if (errorTask) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (activeTask) {
      // Show brain icon for thinking mode, regular loader for normal processing
      return status.isThinkingMode ? (
        <Brain className="w-4 h-4 text-purple-500 animate-pulse" />
      ) : (
        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
      );
    }
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getStatusColor = () => {
    if (errorTask) return 'bg-red-50 border-red-200 text-red-700';
    if (activeTask) {
      // Special styling for thinking mode
      return status.isThinkingMode 
        ? 'bg-purple-50 border-purple-200 text-purple-700'
        : 'bg-blue-50 border-blue-200 text-blue-700';
    }
    return 'bg-green-50 border-green-200 text-green-700';
  };

  return (
    <div className="space-y-3">
      {/* Main status message */}
      <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 ${getStatusColor()}`}>
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {currentTask.message}
          </p>
          
          {/* Progress indicator */}
          <div className="text-xs opacity-75 mt-1">
            {completedCount}/{totalCount} tâches • {status.actor && `${status.actor}`}
            {status.responseType && ` • ${status.responseType}`}
            {status.isThinkingMode && ' • Mode réflexion'}
          </div>
        </div>
      </div>

      {/* Thinking mode special indicator */}
      {status.isThinkingMode && activeTask && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-3 border border-purple-200">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-purple-800">
                🧠 Réflexion approfondie en cours...
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Le modèle analyse la complexité de votre demande et génère une réponse réfléchie.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Retry info if present */}
      {status.retryAttempt && status.maxRetries && (
        <div className="text-xs text-orange-600 text-center">
          Tentative {status.retryAttempt}/{status.maxRetries} - Validation du schéma...
        </div>
      )}

      {/* Streaming progress bar - only show if NOT in thinking mode */}
      {!status.isThinkingMode && status.streamingProgress !== undefined && status.streamingProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full transition-all duration-300 bg-gradient-to-r from-blue-500 to-cyan-500"
            style={{ width: `${status.streamingProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}