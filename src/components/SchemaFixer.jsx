import React, { useState } from 'react';
import { refreshLabCustomersSchema } from '../utils/refreshSchema';
import SchemaFixerModal from './SchemaFixerModal';

export default function SchemaFixer() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fixSchema = async () => {
    setLoading(true);
    try {
      const result = await refreshLabCustomersSchema();
      setResult(result);
      
      if (result.success) {
        alert('Schema fix attempted! Please reload the page completely (Ctrl+F5) and try again.');
      } else {
        // If automatic fix fails, show the modal with manual instructions
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error in schema fix:', error);
      setResult({ success: false, error });
      // Show the modal with manual instructions
      setIsModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={fixSchema}
          disabled={loading}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md shadow-md flex items-center space-x-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Fixing Schema...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              <span>Fix Schema Error</span>
            </>
          )}
        </button>
        
        {result && (
          <div className={`mt-2 p-2 rounded-md text-sm ${result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {result.success ? 'Schema fix attempted!' : 'Error fixing schema'}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="ml-2 underline hover:no-underline"
            >
              Need help?
            </button>
          </div>
        )}
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-2 text-xs text-blue-500 hover:underline block"
        >
          Show manual fix instructions
        </button>
      </div>
      
      <SchemaFixerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
} 