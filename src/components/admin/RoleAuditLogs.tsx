import React, { useState, useEffect } from 'react';
import { RoleAuditLog, getRoleAuditLogs } from '@/services/roleService';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Filter, RefreshCw, FileText, AlertCircle, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/Alert';
import { formatDistance } from 'date-fns';

interface RoleAuditLogsProps {
  roleName?: string;
  limit?: number;
}

export default function RoleAuditLogs({ roleName, limit = 50 }: RoleAuditLogsProps) {
  // State for audit logs
  const [logs, setLogs] = useState<RoleAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLog, setActiveLog] = useState<RoleAuditLog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Load audit logs
  useEffect(() => {
    loadLogs();
  }, [roleName, limit]);
  
  const loadLogs = async () => {
    try {
      setLoading(true);
      const auditLogs = await getRoleAuditLogs(limit, roleName);
      setLogs(auditLogs);
    } catch (err: any) {
      setError(`Failed to load audit logs: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Get action color
  const getActionColor = (action: string): string => {
    switch (action) {
      case 'create':
        return 'text-green-600 dark:text-green-400';
      case 'update':
        return 'text-blue-600 dark:text-blue-400';
      case 'delete':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  // Format action text
  const formatAction = (action: string): string => {
    return action.charAt(0).toUpperCase() + action.slice(1);
  };
  
  // Format time relative to now
  const formatTime = (timestamp: string): string => {
    try {
      return formatDistance(new Date(timestamp), new Date(), { addSuffix: true });
    } catch (err) {
      return timestamp;
    }
  };
  
  // Handle view details click
  const handleViewDetails = (log: RoleAuditLog) => {
    setActiveLog(log);
    setShowDetails(true);
  };
  
  // Close details modal
  const closeDetails = () => {
    setShowDetails(false);
    setActiveLog(null);
  };
  
  // Render the logs table
  const renderLogs = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center p-6">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }
    
    if (logs.length === 0) {
      return (
        <div className="text-center p-6 text-gray-500 border border-dashed rounded-md">
          No audit logs found {roleName ? `for role "${roleName}"` : ''}.
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left">Time</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Action</th>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {formatTime(log.created_at)}
                </td>
                <td className="px-4 py-3 font-medium">{log.role_name}</td>
                <td className={`px-4 py-3 ${getActionColor(log.action)}`}>
                  {formatAction(log.action)}
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                  {log.user_id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(log)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // Render the JSON diff between previous and new config
  const renderConfigDiff = () => {
    if (!activeLog) return null;
    
    const { action, previous_config, new_config } = activeLog;
    
    // For create action, just show the new config
    if (action === 'create') {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">New Configuration:</h3>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-96">
              {JSON.stringify(new_config, null, 2)}
            </pre>
          </div>
        </div>
      );
    }
    
    // For delete action, just show the previous config
    if (action === 'delete') {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Deleted Configuration:</h3>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-96">
              {JSON.stringify(previous_config, null, 2)}
            </pre>
          </div>
        </div>
      );
    }
    
    // For update action, show both configs side by side
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Previous Configuration:</h3>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-96">
              {JSON.stringify(previous_config, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">New Configuration:</h3>
            <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-96">
              {JSON.stringify(new_config, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };
  
  // Render the details modal
  const renderDetailsModal = () => {
    if (!showDetails || !activeLog) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-4xl mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-medium">
              {formatAction(activeLog.action)} Role: {activeLog.role_name}
            </h2>
            <Button variant="ghost" size="sm" onClick={closeDetails}>
              &times;
            </Button>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Time:</span>
                <span className="ml-2">{new Date(activeLog.created_at).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">User ID:</span>
                <span className="ml-2">{activeLog.user_id}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">IP Address:</span>
                <span className="ml-2">{activeLog.ip_address}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">User Agent:</span>
                <span className="ml-2 truncate">{activeLog.user_agent}</span>
              </div>
            </div>
            
            <div className="mt-4">
              <h3 className="text-md font-medium mb-2">Configuration Changes</h3>
              {renderConfigDiff()}
            </div>
          </div>
          <div className="p-4 border-t flex justify-end">
            <Button variant="outline" onClick={closeDetails}>Close</Button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Role Audit Logs</CardTitle>
            <CardDescription>
              Track changes to roles and permissions
              {roleName ? ` for "${roleName}"` : ''}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Actions</TabsTrigger>
            <TabsTrigger value="create">Created</TabsTrigger>
            <TabsTrigger value="update">Updated</TabsTrigger>
            <TabsTrigger value="delete">Deleted</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            {renderLogs()}
          </TabsContent>
          
          <TabsContent value="create">
            {renderLogs()}
          </TabsContent>
          
          <TabsContent value="update">
            {renderLogs()}
          </TabsContent>
          
          <TabsContent value="delete">
            {renderLogs()}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {renderDetailsModal()}
    </Card>
  );
} 