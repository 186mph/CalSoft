import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function DebugTableCheck() {
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<{ url: string; connected: boolean } | null>(null);

  useEffect(() => {
    async function checkConnection() {
      try {
        // Check if we can connect to Supabase at all
        const { data, error } = await supabase.auth.getSession();
        
        // Get the supabase URL (masked for security)
        const supabaseUrl = (supabase as any).supabaseUrl || 'unknown';
        const maskedUrl = supabaseUrl.replace(/^(https?:\/\/[^.]+).*$/, '$1.***');
        
        setConnectionInfo({
          url: maskedUrl,
          connected: !error
        });
        
        if (error) {
          console.error('Supabase connection error:', error);
        }
      } catch (err) {
        console.error('Error checking connection:', err);
      }
    }
    
    async function checkTables() {
      try {
        // Try to query the table directly
        console.log('Checking transformer_reports table...');
        const { data, error } = await supabase
          .from('transformer_reports')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error('Error checking table:', error);
          setError(`Table check error: ${error.message}, code: ${error.code}`);
          
          // Try to list all tables
          try {
            console.log('Checking available tables...');
            const { data: tableData, error: tableError } = await supabase
              .from('pg_tables')
              .select('tablename')
              .eq('schemaname', 'public');
              
            if (tableError) {
              console.error('Error listing tables:', tableError);
            } else {
              const tableNames = tableData?.map(t => t.tablename) || [];
              setTables(tableNames);
              console.log('Available tables:', tableNames);
            }
          } catch (err) {
            console.error('Error listing tables:', err);
          }
        } else {
          setTables(['transformer_reports exists']);
          console.log('transformer_reports exists:', data);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    checkConnection();
    checkTables();
  }, []);

  const createTable = async () => {
    try {
      setLoading(true);
      
      const sql = `
        CREATE TABLE IF NOT EXISTS transformer_reports (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
          report_data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        
        ALTER TABLE transformer_reports ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Allow all access" ON transformer_reports
          USING (true) 
          WITH CHECK (true);
      `;
      
      // Execute the SQL
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        console.error('Error creating table:', error);
        setCreationResult({
          success: false,
          message: `Failed to create table: ${error.message}`
        });
      } else {
        console.log('Table created successfully');
        setCreationResult({
          success: true,
          message: 'Table created successfully! You can now save reports.'
        });
        
        // Refresh the table list
        const { data } = await supabase
          .from('transformer_reports')
          .select('id')
          .limit(1);
          
        setTables(['transformer_reports exists']);
      }
    } catch (err) {
      console.error('Error in createTable:', err);
      setCreationResult({
        success: false,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Database Troubleshooting</h1>
      
      {connectionInfo && (
        <div className={`mb-4 p-3 rounded ${connectionInfo.connected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h2 className="font-medium">Connection Status:</h2>
          <p>Database URL: {connectionInfo.url}</p>
          <p>Status: {connectionInfo.connected ? 'Connected' : 'Connection Issues'}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded p-6">
          <h2 className="text-lg font-semibold mb-4">Database Tables</h2>
          <div className="mb-6">
            <h3 className="font-medium mb-2">Available tables:</h3>
            {tables.length === 0 ? (
              <p className="italic text-gray-500">No tables found</p>
            ) : (
              <ul className="list-disc pl-5">
                {tables.map((table, index) => (
                  <li key={index} className={table === 'transformer_reports' ? 'text-green-600 font-medium' : ''}>
                    {table}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {!tables.includes('transformer_reports') && !tables.includes('transformer_reports exists') && (
            <div className="mb-6">
              <h3 className="font-medium mb-2">Create transformer_reports table:</h3>
              <button
                onClick={createTable}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Table'}
              </button>
            </div>
          )}
          
          {creationResult && (
            <div className={`mt-4 p-3 rounded ${creationResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              <p>{creationResult.message}</p>
            </div>
          )}

          <div className="mt-6 border-t pt-4">
            <h3 className="font-medium mb-2">Manual Fix Instructions:</h3>
            <p className="mb-2">If automatic creation doesn't work, run the following in Supabase SQL Editor:</p>
            <pre className="bg-gray-100 p-3 rounded mt-2 overflow-x-auto text-sm">
              {`-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS transformer_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE transformer_reports ENABLE ROW LEVEL SECURITY;

-- Create basic policies for testing
CREATE POLICY "Allow all access" ON transformer_reports
  USING (true) 
  WITH CHECK (true);`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
} 