import React, { forwardRef } from 'react';

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
}

const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ children, className, maxHeight = '400px', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-auto ${className || ''}`}
        style={{ maxHeight }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

export { ScrollArea }; 