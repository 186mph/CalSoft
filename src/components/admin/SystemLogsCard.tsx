import React, { useState, useEffect } from 'react';
import { FileText, AlertCircle, RefreshCw, Bell, UserPlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Card, { CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { formatDistanceToNow } from 'date-fns';

interface AdminNotification {
  id: string;
  type: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

const NotificationIcon: React.FC<{ type: string }> = ({ type }) => {
  switch (type) {
    case 'new_user':
      return <UserPlus className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />;
    // Add more cases for different notification types
    default:
      return <Bell className="h-4 w-4 text-gray-500 mr-2 flex-shrink-0" />;
  }
};

export const SystemLogsCard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); // Add state to trigger refresh

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20); // Fetch latest 20 notifications

      if (fetchError) throw fetchError;

      setNotifications(data || []);
    } catch (err: any) {
      console.error("Error fetching admin notifications:", err);
      setError(`Failed to load notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [refreshKey]); // Re-fetch when refreshKey changes

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1); // Increment key to trigger useEffect
  };

  return (
    <Card className="border border-gray-200 dark:border-dark-300 bg-white dark:bg-dark-100 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-500" />
          Recent Activity
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3 mt-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mr-1"/> {error}
          </div>
        ) : notifications.length > 0 ? (
          <div className="mt-2 space-y-3 max-h-60 overflow-y-auto pr-2">
            {notifications.map((notification) => (
              <div key={notification.id} className="flex items-start text-sm">
                <NotificationIcon type={notification.type} />
                <div className="flex-grow">
                  <p className="text-gray-800 dark:text-gray-200">{notification.message}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {/* Optionally add a button to mark as read later */}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No recent activity found.</p>
        )}
      </CardContent>
    </Card>
  );
}; 