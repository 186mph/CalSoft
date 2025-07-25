import React, { ButtonHTMLAttributes } from 'react';
import { useDivision } from '../../App';
import { getDivisionAccentClasses } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  className = '',
  disabled,
  ...props
}) => {
  const { division } = useDivision();
  const accentClasses = getDivisionAccentClasses(division);
  
  // Check if explicit background color is provided in className
  const hasExplicitBg = className.includes('bg-[') || className.includes('bg-') && !className.includes('bg-dark-');
  
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: hasExplicitBg 
      ? 'text-white shadow-sm' // Don't override explicit background colors
      : `${accentClasses.bg} ${accentClasses.bgHover} text-white ${accentClasses.ring} shadow-sm`, // Use division-aware colors only when no explicit bg
    secondary: 'bg-dark-secondary/20 hover:bg-dark-secondary/30 text-dark-primary focus:ring-dark-secondary shadow-sm dark:bg-dark-700 dark:hover:bg-dark-700/90 dark:text-white',
    outline: 'border border-dark-accent/30 hover:bg-dark-accent/10 text-dark-primary focus:ring-dark-accent dark:border-dark-700 dark:hover:bg-dark-700/20 dark:text-white',
    ghost: className.includes('hover:bg-[#339C5E]') 
      ? 'text-dark-primary focus:ring-dark-accent dark:text-dark-700 dark:hover:text-dark-700/90' // Remove default hover bg when green hover is specified
      : 'hover:bg-dark-accent/10 text-dark-primary focus:ring-dark-accent dark:hover:bg-dark-700/20 dark:text-dark-700 dark:hover:text-dark-700/90',
    link: hasExplicitBg
      ? 'underline-offset-4 hover:underline focus:ring-0' // Don't override explicit colors for links
      : `${accentClasses.text} ${accentClasses.textHover} underline-offset-4 hover:underline focus:ring-0`,
    destructive: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-sm dark:bg-red-800 dark:hover:bg-red-700'
  };
  
  const sizeStyles = {
    sm: 'text-sm px-3 py-1.5 rounded-lg',
    md: 'text-base px-4 py-2 rounded-lg',
    lg: 'text-lg px-6 py-3 rounded-xl',
    icon: 'p-2'
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button; 