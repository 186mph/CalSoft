import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type DivisionContextType = {
  division: string | null;
  setDivision: (division: string) => void;
};

const DivisionContext = createContext<DivisionContextType | undefined>(undefined);

export const DivisionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [division, setDivision] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract division from URL pathname
    const pathname = window.location.pathname;
    const pathSegments = pathname.split('/').filter(Boolean);
    
    if (pathSegments.length > 0) {
      const possibleDivision = pathSegments[0];
      if (['neta', 'lab', 'scavs'].includes(possibleDivision)) {
        setDivision(possibleDivision);
      }
    }
  }, []);

  return (
    <DivisionContext.Provider value={{ division, setDivision }}>
      {children}
    </DivisionContext.Provider>
  );
};

export const useDivision = (): DivisionContextType => {
  const context = useContext(DivisionContext);
  if (context === undefined) {
    throw new Error('useDivision must be used within a DivisionProvider');
  }
  return context;
};

export default DivisionContext; 