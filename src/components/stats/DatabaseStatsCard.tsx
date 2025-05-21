import React, { useState, useEffect } from 'react';
import { Database, FileText, Hash, Sigma } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Card, { CardContent, CardHeader, CardTitle } from './ui/Card';
import { Skeleton } from './ui/Skeleton';

interface DbStats {
  total_size_bytes: number;
  total_rows_estimate: number;
  table_count: number;
  function_count: number;
}

// Helper to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const DatabaseStatsCard: React.FC = () => {
  const [stats, setStats] = useState<DbStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('get_database_statistics');
        if (rpcError) throw rpcError;
        setStats(data);
      } catch (err: any) {
        console.error("Error fetching database stats:", err);
        setError(`Failed to load stats: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <Card className="border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Database className="h-5 w-5 mr-2 text-purple-500" />
          Database Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4 mt-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
        ) : stats ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 flex items-center"><Sigma className="h-4 w-4 mr-2"/>Total Size:</span>
              <span className="font-medium text-gray-900 dark:text-white">{formatBytes(stats.total_size_bytes)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 flex items-center"><Hash className="h-4 w-4 mr-2"/>Est. Rows:</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats.total_rows_estimate.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 flex items-center"><FileText className="h-4 w-4 mr-2"/>Tables:</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats.table_count}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400 flex items-center"><Sigma className="h-4 w-4 mr-2"/>Functions:</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats.function_count}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No statistics available.</p>
        )}
      </CardContent>
    </Card>
  );
}; 