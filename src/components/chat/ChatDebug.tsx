import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '../ui/Button';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';

export const ChatDebug: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkDatabaseFunctions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Test if the common schema exists
      const { data: schemas, error: schemaError } = await supabase
        .from('pg_namespace')
        .select('nspname')
        .eq('nspname', 'common');
      
      if (schemaError) {
        throw new Error(`Schema check failed: ${schemaError.message}`);
      }
      
      const schemaExists = schemas && schemas.length > 0;
      
      // Check if the chat_rooms table exists
      let tableExists = false;
      if (schemaExists) {
        const { data: tables, error: tableError } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'common')
          .eq('tablename', 'chat_rooms');
          
        if (tableError) {
          throw new Error(`Table check failed: ${tableError.message}`);
        }
        
        tableExists = tables && tables.length > 0;
      }
      
      // Test if the functions exist
      const { data: functions, error: functionError } = await supabase
        .rpc('get_user_chat_rooms');
        
      if (functionError) {
        throw new Error(`Function check failed: ${functionError.message}`);
      }
      
      setResults({
        schemaExists,
        tableExists,
        functionsExist: !functionError,
        functionData: functions
      });
    } catch (err: any) {
      console.error('Chat debug error:', err);
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Chat System Diagnostics</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          onClick={checkDatabaseFunctions}
          disabled={loading}
          className="mb-4"
        >
          {loading ? 'Running Tests...' : 'Check Chat Database Setup'}
        </Button>

        {error && (
          <div className="p-4 mb-4 border border-red-200 rounded-md bg-red-50 text-red-800">
            <h3 className="font-semibold">Error</h3>
            <p>{error}</p>
          </div>
        )}

        {results && (
          <div className="p-4 border border-gray-200 rounded-md">
            <h3 className="font-semibold mb-2">Test Results</h3>
            <ul className="space-y-2">
              <li>
                <span className="font-medium">Common Schema:</span>{' '}
                {results.schemaExists ? (
                  <span className="text-green-600">✓ Exists</span>
                ) : (
                  <span className="text-red-600">✗ Not Found</span>
                )}
              </li>
              <li>
                <span className="font-medium">Chat Tables:</span>{' '}
                {results.tableExists ? (
                  <span className="text-green-600">✓ Exists</span>
                ) : (
                  <span className="text-red-600">✗ Not Found</span>
                )}
              </li>
              <li>
                <span className="font-medium">Chat Functions:</span>{' '}
                {results.functionsExist ? (
                  <span className="text-green-600">✓ Working</span>
                ) : (
                  <span className="text-red-600">✗ Not Working</span>
                )}
              </li>
            </ul>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Suggested Action:</h4>
              {results.schemaExists && results.tableExists && results.functionsExist ? (
                <p className="text-green-600">Chat system is properly set up!</p>
              ) : (
                <div className="text-yellow-600">
                  <p>The chat system needs to be set up. Please make sure you've applied the migration script:</p>
                  <code className="block mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
                    supabase/migrations/20250410_add_chat_functionality.sql
                  </code>
                  
                  <h4 className="font-medium mt-4 mb-2">How to Apply the Migration:</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-sm">
                    <li>
                      Connect to your Supabase project through the dashboard or CLI
                    </li>
                    <li>
                      Run the SQL script located at <code className="bg-gray-100 px-1 rounded">supabase/migrations/20250410_add_chat_functionality.sql</code>
                    </li>
                    <li>
                      You can use the Supabase dashboard's SQL editor to run the script
                    </li>
                    <li>
                      Alternatively, if you have the Supabase CLI installed, run:
                      <code className="block mt-1 p-2 bg-gray-100 rounded text-xs">
                        supabase db push --db-url your_db_connection_string
                      </code>
                    </li>
                    <li>
                      After applying the migration, refresh this page and run the test again
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatDebug; 