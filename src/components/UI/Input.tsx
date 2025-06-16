import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-transparent bg-gradient-to-r from-teal-700 to-purple-700 bg-clip-text">
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={`
          block w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm
          placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-teal-200 focus:border-teal-400
          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
          bg-gradient-to-r from-white to-cyan-25 text-gray-800 font-medium
          transition-all duration-200 hover:shadow-md
          ${error ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      
      {hint && !error && (
        <p className="text-sm text-gray-500 font-medium">{hint}</p>
      )}
      
      {error && (
        <p className="text-sm text-red-600 font-medium">{error}</p>
      )}
    </div>
  );
}