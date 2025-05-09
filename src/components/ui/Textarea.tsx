import React, { TextareaHTMLAttributes, forwardRef } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    label, 
    error, 
    hint, 
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
            className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={inputId}
          className={`
            block w-full p-2.5
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} 
            rounded-md shadow-sm
            focus:outline-none focus:ring-2 focus:ring-offset-0 
            ${error ? 'focus:ring-red-500' : 'focus:ring-orange-500 dark:focus:ring-orange-400'}
            disabled:bg-gray-100 dark:disabled:bg-gray-700
            disabled:text-gray-500 dark:disabled:text-gray-400
            disabled:cursor-not-allowed
            transition-colors
            resize-vertical
            ${className}
          `}
          {...props}
        />
        
        {(error || hint) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Export as TextArea for backward compatibility
export const TextArea = Textarea;

export default Textarea; 