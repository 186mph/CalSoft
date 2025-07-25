import React from 'react';
import { useParams } from 'react-router-dom';
import { DivisionDashboard } from '../../components/dashboards/DivisionDashboard';
import { NETAMetrics } from '../../components/metrics/NETAMetrics';

/**
 * This component serves as a fallback for any division dashboard
 * that doesn't have a specific implementation.
 */
export const Dashboard: React.FC = () => {
  // Get the division from URL params
  const { division } = useParams<{ division: string }>();
  
  // Format the division name for display
  const formatDivisionName = (div: string = 'unknown') => {
    return div
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const divisionName = formatDivisionName(division);

  return (
    <div>
      <DivisionDashboard
        division={division || 'main'}
        divisionName={formatDivisionName(division) || 'Main Dashboard'}
        showTechnicians={false}
        showDocumentation={false}
      />
      
      {/* We render the NETA metrics separately for better control */}
      <div className="container mx-auto px-4">
        <NETAMetrics division={division || 'unknown'} />
      </div>
    </div>
  );
};

// Add both export styles to ensure compatibility with different import methods
export default Dashboard; 