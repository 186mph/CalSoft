import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    hint, 
    leftIcon, 
    rightIcon, 
    className = '', 
    fullWidth = true,
    id,
    ...props 
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block mb-1.5 text-sm font-medium text-dark-primary dark:text-dark-secondary"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-dark-primary/60 dark:text-dark-secondary/60">{leftIcon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full px-4 py-2.5 bg-white dark:bg-dark-200 text-dark-primary dark:text-dark-secondary
              border-2 ${error ? 'border-red-500' : 'border-dark-accent/30 dark:border-dark-300'} 
              rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-offset-0 
              ${error ? 'focus:ring-red-500' : 'focus:ring-dark-accent dark:focus:ring-dark-accent'}
              ${leftIcon ? 'pl-10' : ''} ${rightIcon ? 'pr-10' : ''}
              placeholder:text-dark-primary/40 dark:placeholder:text-dark-secondary/40
              disabled:bg-dark-primary/5 dark:disabled:bg-dark-200 disabled:text-dark-primary/40 dark:disabled:text-dark-secondary/40
              disabled:cursor-not-allowed
              transition-colors
              ${className}
            `}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-dark-primary/60 dark:text-dark-secondary/60">{rightIcon}</span>
            </div>
          )}
        </div>
        
        {(error || hint) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-dark-primary/60 dark:text-dark-secondary/60'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 