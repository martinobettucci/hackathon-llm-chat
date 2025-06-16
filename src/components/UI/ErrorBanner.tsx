import React from 'react';
import { AlertCircle, Wifi } from 'lucide-react';
import { Button } from './Button';

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
  type?: 'error' | 'warning';
}

export function ErrorBanner({ message, onRetry, type = 'error' }: ErrorBannerProps) {
  const isWarning = type === 'warning';
  
  return (
    <div className={`${
      isWarning 
        ? 'bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300' 
        : 'bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-300'
    } p-4 m-4 rounded-2xl shadow-lg`}>
      <div className="flex items-start space-x-3">
        {isWarning ? (
          <Wifi className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p className={`${isWarning ? 'text-orange-800' : 'text-red-800'} text-sm font-medium`}>
            {message}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            🔄 Try again
          </Button>
        </div>
      </div>
    </div>
  );
}