import React, { useState } from 'react';

export default function SchemaFixerModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Fix Schema Cache Issue
        </h2>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-red-600 dark:text-red-400 font-medium">
            The application is encountering a schema cache issue with missing columns in the lab_customers table.
            Here are two ways to fix this:
          </p>
          
          <h3 className="text-lg font-semibold mt-4">Option 1: Manual SQL in Supabase Dashboard</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Log in to your Supabase project dashboard</li>
            <li>Go to the SQL Editor</li>
            <li>Create a new query</li>
            <li>Paste this SQL code and run it:
              <pre className="bg-gray-100 dark:bg-gray-700 p-3 rounded overflow-x-auto mt-2 text-sm">
                {`-- Add all required columns to lab_customers table
ALTER TABLE lab_ops.lab_customers 
ADD COLUMN IF NOT EXISTS company_id TEXT;

ALTER TABLE lab_ops.lab_customers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE lab_ops.lab_customers 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES common.customer_categories(id);

-- Refresh schema cache
SELECT pg_notify('reload_schema', '');`}
              </pre>
            </li>
            <li>Return to this application and click the "Fix Schema" button (bottom right)</li>
            <li>Reload the page and try creating a customer again</li>
          </ol>
          
          <h3 className="text-lg font-semibold mt-6">Option 2: Workaround in this App</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click "Close" to dismiss this modal</li>
            <li>Click the yellow "Fix Schema Error" button at the bottom right of the screen</li>
            <li>Reload the page completely (Ctrl+F5 or Cmd+Shift+R)</li>
            <li>Try creating a customer again</li>
          </ol>
          
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            <strong>Note:</strong> Schema cache issues typically happen when the database structure 
            has been changed but the application's cache hasn't been updated. The solutions above
            attempt to refresh that cache.
          </p>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#f26722] text-white rounded-md hover:bg-[#e05612]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 