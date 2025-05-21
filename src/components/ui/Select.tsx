import React, { SelectHTMLAttributes, forwardRef, createContext, useContext, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    label, 
    error, 
    hint, 
    options, 
    className = '', 
    size = 'md', 
    fullWidth = true,
    icon,
    id,
    ...props 
  }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    const sizeClasses = {
      sm: 'py-1.5 text-sm',
      md: 'py-2.5',
      lg: 'py-3 text-lg'
    };
    
    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-4`}>
        {label && (
          <label 
            htmlFor={inputId} 
            className="block mb-1.5 text-sm font-medium text-cozy-wood-800 dark:text-dark-800"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-cozy-wood-500 dark:text-dark-500">{icon}</span>
            </div>
          )}
          
          <select
            ref={ref}
            id={inputId}
            className={`
              appearance-none w-full px-4 ${sizeClasses[size]} 
              bg-white dark:bg-dark-200 text-cozy-wood-900 dark:text-dark-900
              border ${error ? 'border-red-500' : 'border-cozy-wood-300 dark:border-dark-400'} 
              rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-offset-0 
              ${error ? 'focus:ring-red-500' : 'focus:ring-cozy-terracotta-500 dark:focus:ring-cozy-terracotta-400'}
              ${icon ? 'pl-10' : ''}
              pr-10
              disabled:bg-cozy-wood-50 dark:disabled:bg-dark-300 
              disabled:text-cozy-wood-500 dark:disabled:text-dark-600
              disabled:cursor-not-allowed
              transition-colors
              ${className}
            `}
            {...props}
          >
            {options.map((option) => (
              <option 
                key={option.value} 
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown className="h-4 w-4 text-cozy-wood-500 dark:text-dark-500" />
          </div>
        </div>
        
        {(error || hint) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-red-500' : 'text-cozy-wood-500 dark:text-dark-600'}`}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

// New enhanced select components

// Create context for the select state
type SelectContextType = {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SelectContext = createContext<SelectContextType | undefined>(undefined);

function useSelectContext() {
  const context = useContext(SelectContext);
  if (!context) {
    throw new Error("Select components must be used within a SelectProvider");
  }
  return context;
}

interface EnhancedSelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export const SelectRoot: React.FC<EnhancedSelectProps> = ({
  value: controlledValue,
  defaultValue = "",
  onValueChange,
  children,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : uncontrolledValue;
  
  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setUncontrolledValue(newValue);
    }
    onValueChange?.(newValue);
    setOpen(false);
  };
  
  return (
    <SelectContext.Provider value={{ value, onValueChange: handleValueChange, open, setOpen }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  placeholder?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  children,
  placeholder,
  className = "",
  ...props
}) => {
  const { value, setOpen, open } = useSelectContext();
  
  return (
    <div
      className={`flex items-center justify-between w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 cursor-pointer text-gray-900 dark:text-gray-100 ${open ? 'ring-2 ring-blue-500 outline-none' : ''} ${className}`}
      onClick={() => setOpen(!open)}
      {...props}
    >
      {value ? children : placeholder || "Select an option"}
      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
    </div>
  );
};

interface SelectValueProps {
  placeholder?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder
}) => {
  const { value } = useSelectContext();
  
  return <span>{value || placeholder || ""}</span>;
};

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  align?: 'start' | 'center' | 'end';
}

export const SelectContent: React.FC<SelectContentProps> = ({
  children,
  className = "",
  align = 'start'
}) => {
  const { open } = useSelectContext();
  
  if (!open) return null;
  
  const alignClasses = {
    start: "left-0",
    center: "left-1/2 transform -translate-x-1/2",
    end: "right-0"
  };
  
  return (
    <div
      className={`absolute z-50 mt-1 w-full overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg max-h-60 py-1 ${alignClasses[align]} ${className}`}
    >
      {children}
    </div>
  );
};

interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  children,
  value,
  disabled = false,
  className = "",
  ...props
}) => {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;
  
  const handleSelect = () => {
    if (!disabled) {
      onValueChange(value);
    }
  };
  
  return (
    <div
      className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={handleSelect}
      data-selected={isSelected}
      data-disabled={disabled}
      {...props}
    >
      {children}
    </div>
  );
};

export default Select; 