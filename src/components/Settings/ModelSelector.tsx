import React from 'react';
import { Bot, RotateCcw } from 'lucide-react';
import { Button } from '../UI/Button';

interface ModelSelectorProps {
  availableModels: string[];
  selectedModel: string | null;
  onSelectModel: (model: string) => void;
  onResetToDefault: () => void;
  isUsingDefault: boolean;
  defaultModel: string;
}

export function ModelSelector({
  availableModels,
  selectedModel,
  onSelectModel,
  onResetToDefault,
  isUsingDefault,
  defaultModel
}: ModelSelectorProps) {
  if (availableModels.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-4 border-2 border-gray-200">
        <div className="flex items-center space-x-3">
          <Bot className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600 font-medium">Aucun modèle disponible</span>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Connectez-vous d'abord au serveur pour voir les modèles disponibles
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text">
          🤖 Modèle IA
        </label>
        <Button
          variant="ghost"
          size="sm"
          icon={RotateCcw}
          onClick={onResetToDefault}
          disabled={isUsingDefault}
        >
          Par défaut
        </Button>
      </div>

      <div className="space-y-2">
        {availableModels.map((model) => {
          const isSelected = selectedModel === model || (isUsingDefault && model === defaultModel);
          const isDefault = model === defaultModel;
          
          return (
            <button
              key={model}
              onClick={() => onSelectModel(model)}
              className={`
                w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200 text-left
                ${isSelected 
                  ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-300 text-teal-800' 
                  : 'bg-white border-gray-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-300 text-gray-700'
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <Bot className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-gray-500'}`} />
                <div>
                  <div className="font-medium">{model}</div>
                  {isDefault && (
                    <div className="text-xs opacity-75">Recommandé</div>
                  )}
                </div>
              </div>
              
              {isSelected && (
                <div className="flex items-center space-x-2">
                  {isUsingDefault && isDefault && (
                    <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">
                      Par défaut
                    </span>
                  )}
                  <div className="w-2 h-2 bg-teal-500 rounded-full" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border-2 border-blue-200">
        <p className="text-sm text-blue-700">
          <strong>Modèle actuel:</strong> {selectedModel || `${defaultModel} (par défaut)`}
        </p>
      </div>
    </div>
  );
}