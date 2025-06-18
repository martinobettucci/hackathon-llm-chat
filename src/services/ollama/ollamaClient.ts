import { Ollama } from 'ollama/browser';

const DEFAULT_OLLAMA_HOST = 'https://hackathon.journeesdecouverte.fr/ollama';
const OLLAMA_URL_KEY = 'ollama_custom_url';

export const ollama = new Ollama({ 
  host: getOllamaHost() 
});

let currentHost: string = getOllamaHost();

function getOllamaHost(): string {
  try {
    return localStorage.getItem(OLLAMA_URL_KEY) || DEFAULT_OLLAMA_HOST;
  } catch {
    return DEFAULT_OLLAMA_HOST;
  }
}

export function setOllamaHost(host: string): void {
  try {
    if (host === DEFAULT_OLLAMA_HOST) {
      localStorage.removeItem(OLLAMA_URL_KEY);
    } else {
      localStorage.setItem(OLLAMA_URL_KEY, host);
    }
    currentHost = host;
    
    // Update the ollama instance
    (ollama as any).config.host = host;
  } catch (error) {
    console.error('Error setting Ollama host:', error);
  }
}

export function getCurrentOllamaHost(): string {
  return currentHost;
}

export function getDefaultOllamaHost(): string {
  return DEFAULT_OLLAMA_HOST;
}

export function isUsingDefaultHost(): boolean {
  return currentHost === DEFAULT_OLLAMA_HOST;
}