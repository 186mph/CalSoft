import React, { useState, useEffect } from 'react';
import { Download, Upload, FileText, RotateCw, Calendar, Clock, AlertCircle, Check, UploadCloud, Database, ServerOff, Server } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Card, { CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { toast } from 'react-hot-toast';

// Create a simple Progress component since it doesn't exist in UI components
const Progress: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 ${className}`}>
      <div 
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
        style={{ width: `${value}%` }}
      ></div>
    </div>
  );
};

interface BackupRecord {
  id: string;
  name: string;
  size: string;
  created_at: string;
  status: 'completed' | 'pending' | 'failed';
  type: 'manual' | 'scheduled';
}

interface RestoreStatus {
  inProgress: boolean;
  progress: number;
  error: string | null;
}

interface BackupSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string;
  retention: number; // Days to keep backups
  lastRun: string | null;
}

export const DataBackupControls: React.FC = () => {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>({
    inProgress: false,
    progress: 0,
    error: null
  });
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule>({
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    retention: 30,
    lastRun: '2023-05-18T02:00:00Z'
  });
  const [lastBackupStatus, setLastBackupStatus] = useState<{
    status: 'online' | 'offline' | 'warning';
    message: string;
  }>({
    status: 'online',
    message: 'Last backup completed successfully at 2023-05-18 02:00 AM'
  });

  // Mock data for demo
  const mockBackups: BackupRecord[] = [
    { 
      id: '1', 
      name: 'Full System Backup - May 18, 2023', 
      size: '1.2 GB', 
      created_at: '2023-05-18T02:00:00Z',
      status: 'completed',
      type: 'scheduled'
    },
    { 
      id: '2', 
      name: 'Pre-Deployment Backup - May 15, 2023', 
      size: '1.18 GB', 
      created_at: '2023-05-15T14:30:00Z',
      status: 'completed',
      type: 'manual'
    },
    { 
      id: '3', 
      name: 'Weekly Backup - May 11, 2023', 
      size: '1.15 GB', 
      created_at: '2023-05-11T02:00:00Z',
      status: 'completed',
      type: 'scheduled'
    },
    { 
      id: '4', 
      name: 'Database Schema Update Backup', 
      size: '850 MB', 
      created_at: '2023-05-08T09:45:00Z',
      status: 'completed',
      type: 'manual'
    },
    { 
      id: '5', 
      name: 'Automatic Daily Backup', 
      size: 'N/A', 
      created_at: '2023-05-07T02:00:00Z',
      status: 'failed',
      type: 'scheduled'
    }
  ];

  const fetchBackups = async () => {
    setLoading(true);
    try {
      // Simulate API request with a delay
      setTimeout(() => {
        // In a real app, you would fetch from your database
        // const { data, error } = await supabase.from('backups').select('*').order('created_at', { ascending: false });
        // if (error) throw error;
        // setBackups(data);
        setBackups(mockBackups);
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      console.error("Error fetching backups:", err);
      toast.error(`Failed to load backups: ${err.message}`);
      setLoading(false);
    }
  };

  const createBackup = async () => {
    if (!backupName.trim()) {
      toast.error('Please enter a backup name');
      return;
    }

    setCreating(true);
    try {
      // Simulate API request with a delay
      setTimeout(() => {
        // In a real app, you would create a backup on your server
        // const { data, error } = await supabase.from('backups').insert([{ name: backupName, status: 'pending' }]);
        // if (error) throw error;

        const newBackup: BackupRecord = {
          id: (Math.random() * 1000).toFixed(0),
          name: backupName,
          size: 'Pending...',
          created_at: new Date().toISOString(),
          status: 'pending',
          type: 'manual'
        };

        setBackups([newBackup, ...backups]);
        setBackupName('');
        toast.success('Backup initiated successfully');
        
        // Simulate backup completion after 3 seconds
        setTimeout(() => {
          setBackups(prev => prev.map(b => 
            b.id === newBackup.id 
              ? { ...b, status: 'completed', size: '1.22 GB' } 
              : b
          ));
          toast.success('Backup completed successfully');
        }, 3000);
        
        setCreating(false);
      }, 1000);
    } catch (err: any) {
      console.error("Error creating backup:", err);
      toast.error(`Failed to create backup: ${err.message}`);
      setCreating(false);
    }
  };

  const startRestore = async (backupId: string) => {
    setSelectedBackup(backupId);
    setRestoreStatus({
      inProgress: true,
      progress: 0,
      error: null
    });

    // Simulate restore progress
    const interval = setInterval(() => {
      setRestoreStatus(prev => {
        if (prev.progress >= 100) {
          clearInterval(interval);
          toast.success('Restore completed successfully');
          return { ...prev, inProgress: false };
        }
        return { ...prev, progress: prev.progress + 10 };
      });
    }, 800);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  const getStatusBadge = (status: 'completed' | 'pending' | 'failed') => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Failed</Badge>;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: 'manual' | 'scheduled') => {
    switch (type) {
      case 'manual':
        return <Badge variant="outline" className="text-gray-800 border-gray-300">Manual</Badge>;
      case 'scheduled':
        return <Badge variant="outline" className="text-purple-800 border-purple-300">Scheduled</Badge>;
      default:
        return null;
    }
  };

  const updateBackupSchedule = (field: keyof BackupSchedule, value: any) => {
    setBackupSchedule({
      ...backupSchedule,
      [field]: value
    });
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Data Backup & Restore</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage system backups and restore points
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchBackups}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* System Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Backup System Status</CardTitle>
            <CardDescription>Current status of backup systems</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {lastBackupStatus.status === 'online' ? (
                  <Server className="h-5 w-5 text-green-500" />
                ) : lastBackupStatus.status === 'offline' ? (
                  <ServerOff className="h-5 w-5 text-red-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span className="font-medium">Backup Storage</span>
              </div>
              <Badge 
                className={`
                  ${lastBackupStatus.status === 'online' ? 'bg-green-100 text-green-800 border-green-300' : 
                  lastBackupStatus.status === 'offline' ? 'bg-red-100 text-red-800 border-red-300' : 
                  'bg-yellow-100 text-yellow-800 border-yellow-300'}
                `}
              >
                {lastBackupStatus.status === 'online' ? 'Online' : 
                 lastBackupStatus.status === 'offline' ? 'Offline' : 'Warning'}
              </Badge>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-300">
              {lastBackupStatus.message}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Storage Used</span>
                <span className="font-medium">7.4 GB / 20 GB</span>
              </div>
              <Progress value={37} className="h-2" />
            </div>

            <div className="pt-2">
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                <Database className="h-4 w-4" />
                <span>View Detailed Health</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create Backup Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create Backup</CardTitle>
            <CardDescription>Create a new manual backup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="backup-name" className="text-sm font-medium">
                Backup Name
              </label>
              <Input
                id="backup-name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="Enter backup description"
                disabled={creating}
              />
            </div>
            <Button
              onClick={createBackup}
              disabled={creating || !backupName.trim()}
              className="w-full flex items-center justify-center gap-2 mt-2"
            >
              <Upload className="h-4 w-4" />
              {creating ? 'Creating Backup...' : 'Create Backup Now'}
            </Button>
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card>
          <CardHeader>
            <CardTitle>Backup Schedule</CardTitle>
            <CardDescription>Configure automatic backup schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span className="font-medium">Automatic Backups</span>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="auto-backup-toggle"
                  checked={backupSchedule.enabled} 
                  onChange={(e) => updateBackupSchedule('enabled', e.target.checked)}
                  className="sr-only"
                />
                <label
                  htmlFor="auto-backup-toggle"
                  className={`
                    block overflow-hidden h-6 rounded-full cursor-pointer
                    ${backupSchedule.enabled ? 'bg-green-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      block h-6 w-6 rounded-full bg-white shadow transform transition-transform
                      ${backupSchedule.enabled ? 'translate-x-4' : 'translate-x-0'}
                    `}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="backup-frequency" className="text-sm font-medium">
                Frequency
              </label>
              <select
                id="backup-frequency"
                value={backupSchedule.frequency}
                onChange={(e) => updateBackupSchedule('frequency', e.target.value)}
                disabled={!backupSchedule.enabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="backup-time" className="text-sm font-medium">
                Backup Time
              </label>
              <Input
                type="time"
                id="backup-time"
                value={backupSchedule.time}
                onChange={(e) => updateBackupSchedule('time', e.target.value)}
                disabled={!backupSchedule.enabled}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="backup-retention" className="text-sm font-medium">
                Retention Period (days)
              </label>
              <Input
                type="number"
                id="backup-retention"
                value={backupSchedule.retention}
                onChange={(e) => updateBackupSchedule('retention', parseInt(e.target.value))}
                min={1}
                max={365}
                disabled={!backupSchedule.enabled}
              />
              <p className="text-xs text-gray-500">
                Backups older than {backupSchedule.retention} days will be automatically deleted
              </p>
            </div>

            <div className="pt-2">
              <Button variant="outline" className="w-full">
                <Clock className="h-4 w-4 mr-2" />
                <span>Save Schedule</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>All system backups and recovery points</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <UploadCloud className="h-12 w-12 mx-auto text-gray-400" />
              <p className="mt-2">No backups found</p>
              <Button className="mt-4" onClick={() => setBackupName('System Backup')}>
                Create First Backup
              </Button>
            </div>
          ) : (
            <div className="space-y-4 overflow-auto max-h-96">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className={`
                    p-4 border rounded-md relative 
                    ${backup.status === 'failed' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}
                    ${selectedBackup === backup.id && restoreStatus.inProgress ? 'border-blue-300 bg-blue-50' : ''}
                  `}
                >
                  <div className="flex flex-col sm:flex-row justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="font-medium">{backup.name}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Created: {formatDate(backup.created_at)}
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{backup.size}</span>
                        {getStatusBadge(backup.status)}
                        {getTypeBadge(backup.type)}
                      </div>
                      <div className="flex gap-2 mt-2 sm:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </Button>
                        {backup.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            onClick={() => startRestore(backup.id)}
                            disabled={restoreStatus.inProgress}
                          >
                            <RotateCw className="h-4 w-4" />
                            <span>Restore</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {selectedBackup === backup.id && restoreStatus.inProgress && (
                    <div className="mt-3">
                      <div className="flex justify-between mb-1 text-sm">
                        <span>Restoring backup...</span>
                        <span>{restoreStatus.progress}%</span>
                      </div>
                      <Progress value={restoreStatus.progress} className="h-2" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DataBackupControls; 