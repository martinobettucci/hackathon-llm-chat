import React, { useState, useEffect } from 'react';
import { Server, TestTube, RotateCcw, CheckCircle, XCircle, Loader2, Bot, Zap, Search, Cpu } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Input } from '../UI/Input';
import { Button } from '../UI/Button';
import { Slider } from '../UI/Slider';
import { ModelSelector } from './ModelSelector';
import { 
  getCurrentOllamaHost, 
  getDefaultOllamaHost, 
  setOllamaHost, 
  isUsingDefaultHost,
  getSelectedGenerationModel,
  setSelectedGenerationModel,
  clearSelectedGenerationModel,
  isUsingDefaultGenerationModel,
  getDefaultGenerationModel,
  getSelectedEmbeddingModel,
  setSelectedEmbeddingModel,
  clearSelectedEmbeddingModel,
  isUsingDefaultEmbeddingModel,
  getDefaultEmbeddingModel,
  getSelectedIntermediateModel,
  setSelectedIntermediateModel,
  clearSelectedIntermediateModel,
  isUsingDefaultIntermediateModel,
  getDefaultIntermediateModel,
  OllamaService 
} from '../../services/ollama';
import { 
  getSimilarityThreshold, 
  setSimilarityThreshold, 
  getDefaultSimilarityThreshold,
  isUsingDefaultSimilarityThreshold,
  resetSimilarityThreshold
} from '../../services/settingsService';

interface OllamaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  models?: string[];
}

export function OllamaSettingsModal({ isOpen, onClose }: OllamaSettingsModalProps) {
  const [customUrl, setCustomUrl] = useState('');
  const [selectedGenerationModelState, setSelectedGenerationModelState] = useState<string | null>(null);
  const [selectedEmbeddingModelState, setSelectedEmbeddingModelState] = useState<string | null>(null);
  const [selectedIntermediateModelState, setSelectedIntermediateModelState] = useState<string | null>(null);
  const [similarityThreshold, setSimilarityThresholdState] = useState(0.7);
  const [availableGenerationModels, setAvailableGenerationModels] = useState<string[]>([]);
  const [availableEmbeddingModels, setAvailableEmbeddingModels] = useState<string[]>([]);
  const [availableIntermediateModels, setAvailableIntermediateModels] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentHost = getCurrentOllamaHost();
      const currentGenerationModel = getSelectedGenerationModel();
      const currentEmbeddingModel = getSelectedEmbeddingModel();
      const currentIntermediateModel = getSelectedIntermediateModel();
      const currentSimilarityThreshold = getSimilarityThreshold();
      
      setCustomUrl(currentHost);
      setSelectedGenerationModelState(currentGenerationModel);
      setSelectedEmbeddingModelState(currentEmbeddingModel);
      setSelectedIntermediateModelState(currentIntermediateModel);
      setSimilarityThresholdState(currentSimilarityThreshold);
      setTestResult(null);
      setHasUnsavedChanges(false);
      setAvailableGenerationModels([]);
      setAvailableEmbeddingModels([]);
      setAvailableIntermediateModels([]);
    }
  }, [isOpen]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setCustomUrl(newUrl);
    setHasUnsavedChanges(newUrl !== getCurrentOllamaHost());
    setTestResult(null);
    setAvailableGenerationModels([]);
    setAvailableEmbeddingModels([]);
    setAvailableIntermediateModels([]);
  };

  const handleSimilarityThresholdChange = (value: number) => {
    setSimilarityThresholdState(value);
    setHasUnsavedChanges(true);
  };

  const handleTestConnection = async () => {
    if (!customUrl.trim()) return;
    
    setIsTesting(true);
    setTestResult(null);
    setAvailableGenerationModels([]);
    setAvailableEmbeddingModels([]);
    setAvailableIntermediateModels([]);
    
    try {
      // Temporarily set the URL for testing
      const originalHost = getCurrentOllamaHost();
      setOllamaHost(customUrl.trim());
      
      const result = await OllamaService.testConnection();
      setTestResult(result);
      
      if (result.success && result.models) {
        // All models can be used for any purpose, but we'll show them in all three categories
        setAvailableGenerationModels(result.models);
        setAvailableEmbeddingModels(result.models);
        setAvailableIntermediateModels(result.models);
      }
      
      // If test failed, revert to original host
      if (!result.success) {
        setOllamaHost(originalHost);
        setHasUnsavedChanges(true);
      } else {
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Test failed'
      });
      setAvailableGenerationModels([]);
      setAvailableEmbeddingModels([]);
      setAvailableIntermediateModels([]);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSelectGenerationModel = (model: string) => {
    setSelectedGenerationModelState(model);
    setSelectedGenerationModel(model);
  };

  const handleSelectEmbeddingModel = (model: string) => {
    setSelectedEmbeddingModelState(model);
    setSelectedEmbeddingModel(model);
  };

  const handleSelectIntermediateModel = (model: string) => {
    setSelectedIntermediateModelState(model);
    setSelectedIntermediateModel(model);
  };

  const handleResetGenerationModelToDefault = () => {
    setSelectedGenerationModelState(null);
    clearSelectedGenerationModel();
  };

  const handleResetEmbeddingModelToDefault = () => {
    setSelectedEmbeddingModelState(null);
    clearSelectedEmbeddingModel();
  };

  const handleResetIntermediateModelToDefault = () => {
    setSelectedIntermediateModelState(null);
    clearSelectedIntermediateModel();
  };

  const handleResetSimilarityThresholdToDefault = () => {
    const defaultThreshold = getDefaultSimilarityThreshold();
    setSimilarityThresholdState(defaultThreshold);
    resetSimilarityThreshold();
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!customUrl.trim()) return;
    
    setOllamaHost(customUrl.trim());
    setSimilarityThreshold(similarityThreshold);
    setHasUnsavedChanges(false);
    
    // Clear any previous test results when saving
    setTestResult(null);
    
    // Test the connection with the new URL
    await handleTestConnection();
  };

  const handleResetToDefault = () => {
    const defaultHost = getDefaultOllamaHost();
    const defaultThreshold = getDefaultSimilarityThreshold();
    
    setCustomUrl(defaultHost);
    setSimilarityThresholdState(defaultThreshold);
    setOllamaHost(defaultHost);
    resetSimilarityThreshold();
    setHasUnsavedChanges(false);
    setTestResult(null);
    setAvailableGenerationModels([]);
    setAvailableEmbeddingModels([]);
    setAvailableIntermediateModels([]);
  };

  const handleClose = () => {
    onClose();
  };

  const getConnectionStatusIcon = () => {
    if (isTesting) {
      return <Loader2 className="w-4 h-4 animate-spin text-gray-500" />;
    }
    if (testResult?.success) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (testResult && !testResult.success) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const getConnectionStatusColor = () => {
    if (testResult?.success) {
      return 'border-green-300 bg-green-50';
    }
    if (testResult && !testResult.success) {
      return 'border-red-300 bg-red-50';
    }
    if (isTesting) {
      return 'border-blue-300 bg-blue-50';
    }
    return 'border-gray-300 bg-gray-50';
  };

  const hasSettingsChanges = hasUnsavedChanges || (similarityThreshold !== getSimilarityThreshold());

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="⚙️ Configuration Ollama" size="lg">
      <div className="space-y-6">
        {/* Current Status */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
          <div className="flex items-center space-x-3 mb-2">
            <Server className="w-5 h-5 text-purple-600" />
            <span className="font-semibold text-purple-800">Configuration Actuelle</span>
          </div>
          <p className="text-sm text-purple-700">
            <strong>URL:</strong> {getCurrentOllamaHost()}
          </p>
          <p className="text-sm text-purple-700">
            <strong>Statut:</strong> {isUsingDefaultHost() ? 'URL par défaut' : 'URL personnalisée'}
          </p>
          <p className="text-sm text-purple-700">
            <strong>Modèle de génération:</strong> {selectedGenerationModelState || `${getDefaultGenerationModel()} (par défaut)`}
          </p>
          <p className="text-sm text-purple-700">
            <strong>Modèle d'embedding:</strong> {selectedEmbeddingModelState || `${getDefaultEmbeddingModel()} (par défaut)`}
          </p>
          <p className="text-sm text-purple-700">
            <strong>Modèle léger:</strong> {selectedIntermediateModelState || `${getDefaultIntermediateModel()} (par défaut)`}
          </p>
          <p className="text-sm text-purple-700">
            <strong>Seuil de similarité:</strong> {similarityThreshold.toFixed(2)} {isUsingDefaultSimilarityThreshold() ? '(par défaut)' : '(personnalisé)'}
          </p>
        </div>

        {/* URL Configuration */}
        <div className="space-y-4">
          <Input
            label="🔗 URL du serveur Ollama"
            value={customUrl}
            onChange={handleUrlChange}
            placeholder="https://your-ollama-server.com"
            hint="Entrez l'URL complète de votre serveur Ollama (ex: https://localhost:11434)"
          />

          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              icon={TestTube}
              onClick={handleTestConnection}
              disabled={!customUrl.trim() || isTesting}
              loading={isTesting}
            >
              Tester la connexion
            </Button>

            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={handleResetToDefault}
              disabled={isUsingDefaultHost() && isUsingDefaultSimilarityThreshold() && !hasUnsavedChanges}
            >
              Réinitialiser tout
            </Button>
          </div>
        </div>

        {/* Connection Test Results */}
        {(testResult || isTesting) && (
          <div className={`rounded-xl p-4 border-2 ${getConnectionStatusColor()}`}>
            <div className="flex items-start space-x-3">
              {getConnectionStatusIcon()}
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  {isTesting ? 'Test de connexion en cours...' : 'Résultat du test'}
                </p>
                {testResult && (
                  <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Base Settings */}
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border-2 border-cyan-200">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="w-5 h-5 text-cyan-600" />
            <h4 className="font-semibold text-cyan-800">🔍 Paramètres de la Base de Connaissances</h4>
          </div>
          
          <div className="space-y-4">
            <Slider
              label="🎯 Seuil de Similarité"
              value={similarityThreshold}
              onChange={handleSimilarityThresholdChange}
              min={0}
              max={1}
              step={0.01}
              hint="Plus le seuil est élevé, plus les documents doivent être similaires à la requête pour être inclus dans le contexte."
            />
            
            <div className="flex items-center justify-between text-sm">
              <div className="text-cyan-700">
                <p><strong>Valeur actuelle:</strong> {similarityThreshold.toFixed(2)}</p>
                <p><strong>Recommandé:</strong> 0.70 (équilibre précision/rappel)</p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                icon={RotateCcw}
                onClick={handleResetSimilarityThresholdToDefault}
                disabled={isUsingDefaultSimilarityThreshold()}
              >
                Par défaut
              </Button>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 text-sm">
                <strong>💡 Guide des valeurs:</strong>
              </p>
              <ul className="text-blue-700 text-xs mt-1 space-y-1">
                <li>• <strong>0.80-1.00:</strong> Très strict - seuls les documents très similaires</li>
                <li>• <strong>0.70-0.79:</strong> Équilibré - bon compromis (recommandé)</li>
                <li>• <strong>0.50-0.69:</strong> Souple - plus de documents, moins de précision</li>
                <li>• <strong>0.00-0.49:</strong> Très souple - beaucoup de bruit</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        {testResult?.success && (
          <div className="space-y-6">
            {/* Generation Model Selector */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-800">🤖 Modèle de Génération</h4>
              </div>
              <div className="mb-3 text-sm text-blue-700">
                <p>Modèle principal utilisé pour générer les réponses finales. Privilégiez un modèle puissant et précis.</p>
              </div>
              <ModelSelector
                availableModels={availableGenerationModels}
                selectedModel={selectedGenerationModelState}
                onSelectModel={handleSelectGenerationModel}
                onResetToDefault={handleResetGenerationModelToDefault}
                isUsingDefault={isUsingDefaultGenerationModel()}
                defaultModel={getDefaultGenerationModel()}
              />
            </div>

            {/* Intermediate Model Selector */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-center space-x-2 mb-4">
                <Cpu className="w-5 h-5 text-orange-600" />
                <h4 className="font-semibold text-orange-800">⚡ Modèle Léger (Étapes Intermédiaires)</h4>
              </div>
              <div className="mb-3 text-sm text-orange-700">
                <p><strong>Utilisé pour:</strong> Extraction d'intention, décision du mode de réflexion</p>
                <p><strong>Avantages:</strong> Plus rapide, consomme moins de ressources pour les tâches simples</p>
                <p><strong>Recommandation:</strong> Choisissez un modèle petit et rapide (ex: gemma2:2b, qwen2.5:3b)</p>
              </div>
              <ModelSelector
                availableModels={availableIntermediateModels}
                selectedModel={selectedIntermediateModelState}
                onSelectModel={handleSelectIntermediateModel}
                onResetToDefault={handleResetIntermediateModelToDefault}
                isUsingDefault={isUsingDefaultIntermediateModel()}
                defaultModel={getDefaultIntermediateModel()}
              />
            </div>

            {/* Embedding Model Selector */}
            <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-4 border-2 border-green-200">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-800">🔗 Modèle d'Embedding</h4>
              </div>
              <div className="mb-3 text-sm text-green-700">
                <p>Modèle spécialisé pour créer des représentations vectorielles des documents et requêtes (recherche sémantique).</p>
              </div>
              <ModelSelector
                availableModels={availableEmbeddingModels}
                selectedModel={selectedEmbeddingModelState}
                onSelectModel={handleSelectEmbeddingModel}
                onResetToDefault={handleResetEmbeddingModelToDefault}
                isUsingDefault={isUsingDefaultEmbeddingModel()}
                defaultModel={getDefaultEmbeddingModel()}
              />
            </div>
          </div>
        )}

        {/* Information */}
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border-2 border-cyan-200">
          <h4 className="font-semibold text-cyan-800 mb-2">💡 Informations</h4>
          <ul className="text-sm text-cyan-700 space-y-1">
            <li>• L'URL par défaut est : <code className="bg-cyan-100 px-1 rounded">{getDefaultOllamaHost()}</code></li>
            <li>• Le modèle de génération par défaut est : <code className="bg-cyan-100 px-1 rounded">{getDefaultGenerationModel()}</code></li>
            <li>• Le modèle d'embedding par défaut est : <code className="bg-cyan-100 px-1 rounded">{getDefaultEmbeddingModel()}</code></li>
            <li>• Le modèle léger par défaut est : <code className="bg-cyan-100 px-1 rounded">{getDefaultIntermediateModel()}</code></li>
            <li>• Le seuil de similarité par défaut est : <code className="bg-cyan-100 px-1 rounded">{getDefaultSimilarityThreshold()}</code></li>
            <li>• <strong>Modèle de génération:</strong> Conversations principales (le plus important)</li>
            <li>• <strong>Modèle léger:</strong> Tâches rapides (intention, décision réflexion) - économise les ressources</li>
            <li>• <strong>Modèle d'embedding:</strong> Recherche sémantique dans la base de connaissances</li>
            <li>• Le seuil de similarité détermine quels documents sont inclus dans le contexte</li>
            <li>• Assurez-vous que votre serveur Ollama autorise les requêtes CORS</li>
            <li>• Testez toujours la connexion avant de sauvegarder</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200">
          <Button variant="secondary" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={!customUrl.trim() || (!hasSettingsChanges && !testResult?.success)}
          >
            {hasSettingsChanges ? 'Sauvegarder et tester' : 'Fermer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}