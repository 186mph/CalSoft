import React from 'react';
import { createRoot } from 'react-dom/client';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  duration?: number;
  onClose?: () => void;
}

export interface ToastOptions extends Omit<ToastProps, 'onClose'> {}

const ToastContainer: React.FC<ToastProps> = ({
  title,
  description,
  variant = 'default',
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300); // Animation duration
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'destructive':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'destructive':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
    }
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'}
        ${getVariantStyles()}
        border rounded-lg shadow-md p-4
      `}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 mt-0.5">{getIcon()}</div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h3>
          {description && (
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">{description}</div>
          )}
        </div>
        <button
          type="button"
          className="ml-4 inline-flex flex-shrink-0 text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => {
              onClose?.();
            }, 300);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

let toastContainer: HTMLDivElement | null = null;

const createToastContainer = () => {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
};

export const toast = (options: ToastOptions) => {
  const container = createToastContainer();
  const toastId = `toast-${Date.now()}`;
  
  const toastElement = document.createElement('div');
  toastElement.id = toastId;
  container.appendChild(toastElement);
  
  const root = createRoot(toastElement);
  
  const onClose = () => {
    root.unmount();
    if (toastElement.parentNode) {
      toastElement.parentNode.removeChild(toastElement);
    }
  };
  
  root.render(
    <ToastContainer
      {...options}
      onClose={onClose}
    />
  );
  
  return {
    close: onClose
  };
};

export default toast; 