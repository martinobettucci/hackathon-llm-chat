import React from 'react';
import { DivideIcon as LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 relative overflow-hidden';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white focus:ring-teal-300 shadow-teal-200',
    secondary: 'bg-gradient-to-r from-orange-400 to-pink-400 hover:from-orange-500 hover:to-pink-500 text-white focus:ring-orange-300 shadow-orange-200',
    ghost: 'hover:bg-gradient-to-r hover:from-purple-100 hover:to-pink-100 text-purple-700 focus:ring-purple-300 shadow-purple-100 hover:text-purple-900',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white focus:ring-red-300 shadow-red-200'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-sm',
    lg: 'px-6 py-4 text-base'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  // If there's no icon, show content normally
  if (!Icon) {
    return (
      <button
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        )}
        {children}
      </button>
    );
  }

  return (
    <button
      className={`${classes} expand-on-hover`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {/* Icon - always visible */}
          {iconPosition === 'left' && <Icon className="w-4 h-4 flex-shrink-0" />}
          
          {/* Text content - hidden by default, shown on button hover */}
          {children && (
            <span className="
              button-text max-w-0 overflow-hidden whitespace-nowrap opacity-0 
              transition-all duration-300 ease-out
            ">
              {children}
            </span>
          )}
          
          {iconPosition === 'right' && <Icon className="w-4 h-4 flex-shrink-0" />}
        </>
      )}
      
      <style>{`
        .expand-on-hover:hover .button-text {
          max-width: 8rem;
          opacity: 1;
          margin-left: 0.5rem;
        }
      `}</style>
    </button>
  );
}