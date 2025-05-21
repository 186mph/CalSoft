import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { AlertCircle, RefreshCw, Database, Zap, Clock, Server, CheckCircle, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface SystemStats {
  database: {
    status: 'healthy' | 'degraded' | 'error';
    connectionTime: number;
    size: string;
    tables: number;
    rows: number;
    functions: number;
    lastErrorTime?: string;
    lastError?: string;
  };
  api: {
    status: 'healthy' | 'degraded' | 'error';
    endpoints: {
      name: string;
      status: 'up' | 'down';
      responseTime: number;
    }[];
    averageResponseTime: number;
  };
  system: {
    status: 'healthy' | 'degraded' | 'error';
    uptime: string;
    lastRestart: string;
    activeUsers: number;
    cacheHitRate: number;
  };
  historyData: {
    timestamp: string;
    apiResponseTime: number;
    databaseResponseTime: number;
    activeUsers: number;
  }[];
}

export const SystemHealthMonitoring: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchSystemStats();
  }, [refreshKey]);

  const fetchSystemStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Measure database connection time
      const startTime = performance.now();
      
      // Fetch database statistics from the function we found
      const { data: dbStatsData, error: dbStatsError } = await supabase.rpc('get_database_statistics');
      
      const endTime = performance.now();
      const connectionTime = Math.round(endTime - startTime);
      
      if (dbStatsError) {
        throw dbStatsError;
      }
      
      // Mock API endpoints status (in a real app, we would check actual endpoints)
      const endpoints: {
        name: string;
        status: 'up' | 'down';
        responseTime: number;
      }[] = [
        { name: 'Authentication', status: 'up', responseTime: 120 },
        { name: 'Users', status: 'up', responseTime: 150 },
        { name: 'Documents', status: 'up', responseTime: 180 },
        { name: 'Reports', status: 'up', responseTime: 200 },
      ];
      
      // Calculate average response time
      const avgResponseTime = Math.round(
        endpoints.reduce((sum, endpoint) => sum + endpoint.responseTime, 0) / endpoints.length
      );
      
      // Mock history data (in a real app, this would come from a database table)
      const historyData = Array.from({ length: 24 }, (_, i) => {
        const hours = 23 - i;
        return {
          timestamp: `${hours}h ago`,
          apiResponseTime: Math.floor(140 + Math.random() * 100),
          databaseResponseTime: Math.floor(50 + Math.random() * 70),
          activeUsers: Math.floor(10 + Math.random() * 90)
        };
      });
      
      // Format database size
      const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      // Create system stats object
      const systemStats: SystemStats = {
        database: {
          status: connectionTime < 200 ? 'healthy' : connectionTime < 500 ? 'degraded' : 'error',
          connectionTime,
          size: formatBytes(dbStatsData.total_size_bytes || 0),
          tables: dbStatsData.table_count || 0,
          rows: dbStatsData.total_rows_estimate || 0,
          functions: dbStatsData.function_count || 0
        },
        api: {
          status: avgResponseTime < 300 ? 'healthy' : avgResponseTime < 600 ? 'degraded' : 'error',
          endpoints,
          averageResponseTime: avgResponseTime
        },
        system: {
          status: 'healthy', // Mocked for now
          uptime: '14d 6h 32m',
          lastRestart: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          activeUsers: 42,
          cacheHitRate: 89.5
        },
        historyData
      };
      
      setStats(systemStats);
    } catch (err: any) {
      console.error('Error fetching system stats:', err);
      setError(`Failed to load system statistics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'error') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'healthy' | 'degraded' | 'error') => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
    }
  };

  const getResponseTimeColor = (time: number) => {
    if (time < 100) return 'text-green-500';
    if (time < 300) return 'text-green-700';
    if (time < 500) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className="border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <Server className="h-5 w-5 mr-2 text-purple-500" />
          System Health Monitoring
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 rounded-md bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-md border border-gray-200 dark:border-dark-300 flex items-start">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20 mr-3">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium">Database</h3>
                    <span className="ml-2">{getStatusIcon(stats.database.status)}</span>
                  </div>
                  <p className={`text-xs ${getStatusColor(stats.database.status)}`}>
                    {stats.database.status === 'healthy' 
                      ? 'All systems operational' 
                      : stats.database.status === 'degraded' 
                        ? 'Performance degraded' 
                        : 'System errors detected'}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">Response:</span>{' '}
                    <span className={getResponseTimeColor(stats.database.connectionTime)}>
                      {stats.database.connectionTime}ms
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="p-4 rounded-md border border-gray-200 dark:border-dark-300 flex items-start">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/20 mr-3">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium">API</h3>
                    <span className="ml-2">{getStatusIcon(stats.api.status)}</span>
                  </div>
                  <p className={`text-xs ${getStatusColor(stats.api.status)}`}>
                    {stats.api.status === 'healthy' 
                      ? 'All endpoints operational' 
                      : stats.api.status === 'degraded' 
                        ? 'Some endpoints slow' 
                        : 'Endpoint errors detected'}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">Avg Response:</span>{' '}
                    <span className={getResponseTimeColor(stats.api.averageResponseTime)}>
                      {stats.api.averageResponseTime}ms
                    </span>
                  </p>
                </div>
              </div>
              
              <div className="p-4 rounded-md border border-gray-200 dark:border-dark-300 flex items-start">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/20 mr-3">
                  <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="flex items-center">
                    <h3 className="text-sm font-medium">System</h3>
                    <span className="ml-2">{getStatusIcon(stats.system.status)}</span>
                  </div>
                  <p className={`text-xs ${getStatusColor(stats.system.status)}`}>
                    {stats.system.status === 'healthy' 
                      ? 'System running normally' 
                      : stats.system.status === 'degraded' 
                        ? 'Performance issues detected' 
                        : 'Critical system errors'}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="font-medium">Uptime:</span> {stats.system.uptime}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Detailed Metrics */}
            <Tabs defaultValue="performance">
              <TabsList className="w-full">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="database">Database</TabsTrigger>
                <TabsTrigger value="api">API</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
              
              <TabsContent value="performance" className="mt-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.historyData}>
                      <XAxis dataKey="timestamp" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="apiResponseTime" 
                        name="API Response (ms)" 
                        stroke="#9f7aea" 
                        strokeWidth={2} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="databaseResponseTime" 
                        name="DB Response (ms)" 
                        stroke="#4299e1" 
                        strokeWidth={2} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="activeUsers" 
                        name="Active Users" 
                        stroke="#48bb78" 
                        strokeWidth={2} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="database" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Database Size</h4>
                      <p className="text-2xl font-bold">{stats.database.size}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Tables</h4>
                      <p className="text-2xl font-bold">{stats.database.tables}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Total Rows</h4>
                      <p className="text-2xl font-bold">{stats.database.rows.toLocaleString()}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Functions</h4>
                      <p className="text-2xl font-bold">{stats.database.functions}</p>
                    </Card>
                  </div>
                  
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Connection Time History</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.historyData}>
                          <XAxis dataKey="timestamp" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="databaseResponseTime" 
                            name="Response Time (ms)" 
                            stroke="#4299e1" 
                            strokeWidth={2} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="api" className="mt-4">
                <div className="space-y-4">
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Endpoint Status</h4>
                    <div className="space-y-3">
                      {stats.api.endpoints.map((endpoint, i) => (
                        <div key={i} className="flex justify-between items-center border-b pb-2 last:border-0">
                          <div className="flex items-center">
                            {endpoint.status === 'up' ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500 mr-2" />
                            )}
                            <span>{endpoint.name}</span>
                          </div>
                          <span className={getResponseTimeColor(endpoint.responseTime)}>
                            {endpoint.responseTime}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                  
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">API Response Time History</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.historyData}>
                          <XAxis dataKey="timestamp" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="apiResponseTime" 
                            name="Response Time (ms)" 
                            stroke="#9f7aea" 
                            strokeWidth={2} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="system" className="mt-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Uptime</h4>
                      <p className="text-2xl font-bold">{stats.system.uptime}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Last Restart</h4>
                      <p className="text-2xl font-bold">{stats.system.lastRestart}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Active Users</h4>
                      <p className="text-2xl font-bold">{stats.system.activeUsers}</p>
                    </Card>
                    <Card className="p-4">
                      <h4 className="text-sm font-medium text-gray-500">Cache Hit Rate</h4>
                      <p className="text-2xl font-bold">{stats.system.cacheHitRate}%</p>
                    </Card>
                  </div>
                  
                  <Card className="p-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Active Users History</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={stats.historyData}>
                          <XAxis dataKey="timestamp" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="activeUsers" 
                            name="Active Users" 
                            stroke="#48bb78" 
                            strokeWidth={2} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <p>No data available</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthMonitoring; 