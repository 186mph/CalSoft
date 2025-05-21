import React, { useLayoutEffect } from 'react';
import { useDivision } from '../../App';
import { ArmadilloDashboard as ArmadilloDetailsDashboard } from '../../components/dashboards/ArmadilloDashboard';

export const ArmadilloDashboard: React.FC = () => {
  const { division, setDivision } = useDivision();
  
  // Ensure correct division is set
  useLayoutEffect(() => {
    if (!division || division !== 'armadillo') {
      setDivision('armadillo');
    }
    
    // Scroll to top when the component mounts
    window.scrollTo(0, 0);
  }, [division, setDivision]);

  return <ArmadilloDetailsDashboard division="armadillo" />;
};

// Add both export styles to ensure compatibility with different import methods
export default ArmadilloDashboard; 