import React from 'react';
import { useParams } from 'react-router-dom';

function RelayTestReport() {
  const { id: jobId, reportId } = useParams<{ id: string; reportId: string }>();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 dark:text-white">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Relay Test Report</h1>
      <div className="bg-white dark:bg-dark-150 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <p>Relay Test Report implementation coming soon...</p>
      </div>
    </div>
  );
}

export { RelayTestReport };
export default RelayTestReport; 