import React, { useState, useEffect } from 'react';
import { Server, TestTube, RotateCcw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Input } from '../UI/Input';
import { Button } from '../UI/Button';
import { 
  getCurrentOllamaHost, 
  getDefaultOllamaHost, 
  setOllamaHost, 
  isUsingDefaultHost,
  OllamaService 
} from '../../services/ollama';

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
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentHost = getCurrentOllamaHost();
      setCustomUrl(currentHost);
      setTestResult(null);
      setHasUnsavedChanges(false);
    }
  }, [isOpen]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setCustomUrl(newUrl);
    setHasUnsavedChanges(newUrl !== getCurrentOllamaHost());
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!customUrl.trim()) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      // Temporarily set the URL for testing
      const originalHost = getCurrentOllamaHost();
      setOllamaHost(customUrl.trim());
      
      const result = await OllamaService.testConnection();
      setTestResult(result);
      
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
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!customUrl.trim()) return;
    
    setOllamaHost(customUrl.trim());
    setHasUnsavedChanges(false);
    
    // Clear any previous test results when saving
    setTestResult(null);
    
    // Test the connection with the new URL
    await handleTestConnection();
  };

  const handleResetToDefault = () => {
    const defaultHost = getDefaultOllamaHost();
    setCustomUrl(defaultHost);
    setOllamaHost(defaultHost);
    setHasUnsavedChanges(false);
    setTestResult(null);
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
              disabled={isUsingDefaultHost() && !hasUnsavedChanges}
            >
              Réinitialiser
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
                  <>
                    <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.message}
                    </p>
                    {testResult.success && testResult.models && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-green-700 mb-1">
                          Modèles disponibles :
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {testResult.models.slice(0, 5).map((model, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                            >
                              {model}
                            </span>
                          ))}
                          {testResult.models.length > 5 && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              +{testResult.models.length - 5} autres
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Information */}
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border-2 border-cyan-200">
          <h4 className="font-semibold text-cyan-800 mb-2">💡 Informations</h4>
          <ul className="text-sm text-cyan-700 space-y-1">
            <li>• L'URL par défaut est : <code className="bg-cyan-100 px-1 rounded">{getDefaultOllamaHost()}</code></li>
            <li>• Assurez-vous que votre serveur Ollama autorise les requêtes CORS</li>
            <li>• Le serveur doit être accessible depuis votre navigateur</li>
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
            disabled={!customUrl.trim() || (!hasUnsavedChanges && !testResult?.success)}
          >
            {hasUnsavedChanges ? 'Sauvegarder et tester' : 'Fermer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}