import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Briefcase, 
  DollarSign, 
  AlertOctagon, 
  Plus, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { useAuth } from '@/lib/AuthContext';
import { 
  getUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  dismissNotification,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  JobNotification,
  NotificationPreferences
} from '@/services/notificationService';

interface JobNotificationsProps {
  jobId?: string; // Optional - if provided, only shows notifications for this job
  buttonClassName?: string;
  showTray?: boolean; // Whether to show as a dropdown tray or in a dialog
}

export function JobNotifications({ jobId, buttonClassName, showTray = true }: JobNotificationsProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<JobNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await getUserNotifications(user.id, {
        jobId: jobId,
        limit: 100
      });
      
      if (error) throw error;
      
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    if (!user) return;
    
    try {
      const prefs = await getUserNotificationPreferences(user.id);
      setPreferences(prefs);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPreferences();
    }
  }, [user, jobId]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const { success, error } = await markNotificationAsRead(notificationId);
      
      if (error) throw error;
      
      if (success) {
        setNotifications(notifications.map(notification => 
          notification.id === notificationId ? { ...notification, is_read: true } : notification
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { success, error } = await markAllNotificationsAsRead(user.id);
      
      if (error) throw error;
      
      if (success) {
        setNotifications(notifications.map(notification => ({
          ...notification,
          is_read: true
        })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      const { success, error } = await dismissNotification(notificationId);
      
      if (error) throw error;
      
      if (success) {
        setNotifications(notifications.filter(notification => notification.id !== notificationId));
        // Update unread count if the dismissed notification was unread
        const wasUnread = notifications.find(n => n.id === notificationId && !n.is_read);
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  const handleUpdatePreferences = async (updatedPrefs: NotificationPreferences) => {
    if (!user) return;
    
    try {
      const { success } = await updateUserNotificationPreferences(user.id, updatedPrefs);
      
      if (success) {
        setPreferences(updatedPrefs);
      }
    } catch (err) {
      console.error('Error updating notification preferences:', err);
    }
  };

  const togglePreference = (
    category: 'enableNotifications' | 'emailNotifications', 
    value?: boolean
  ) => {
    if (!preferences) return;
    
    const updatedPrefs = {
      ...preferences,
      [category]: value !== undefined ? value : !preferences[category]
    };
    
    handleUpdatePreferences(updatedPrefs);
  };

  const toggleNotificationType = (type: string, value?: boolean) => {
    if (!preferences) return;
    
    const updatedPrefs = {
      ...preferences,
      notificationTypes: {
        ...preferences.notificationTypes,
        [type]: value !== undefined ? value : !preferences.notificationTypes[type as keyof typeof preferences.notificationTypes]
      }
    };
    
    handleUpdatePreferences(updatedPrefs);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'status_change':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'deadline_approaching':
        return <Calendar className="h-5 w-5 text-amber-500" />;
      case 'resource_assigned':
        return <Briefcase className="h-5 w-5 text-green-500" />;
      case 'cost_update':
        return <DollarSign className="h-5 w-5 text-purple-500" />;
      case 'sla_violation':
        return <AlertOctagon className="h-5 w-5 text-red-500" />;
      case 'new_job':
        return <Plus className="h-5 w-5 text-teal-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getFilteredNotifications = () => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter(notification => notification.type === activeFilter);
  };

  // Notification content to be displayed in either tray or dialog
  const renderNotificationContent = () => (
    <>
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h3 className="font-medium">Notifications</h3>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowPreferences(true)}
          >
            Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full">
        <TabsList className="px-3 pt-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="status_change">Status</TabsTrigger>
          <TabsTrigger value="deadline_approaching">Deadlines</TabsTrigger>
          <TabsTrigger value="resource_assigned">Resources</TabsTrigger>
          <TabsTrigger value="cost_update">Costs</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-2"></div>
            Loading notifications...
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
            {error}
          </div>
        ) : getFilteredNotifications().length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No notifications
          </div>
        ) : (
          getFilteredNotifications().map(notification => (
            <div
              key={notification.id}
              className={`p-3 border-b border-gray-100 dark:border-gray-700 flex gap-3 ${
                notification.is_read 
                  ? 'bg-gray-50 dark:bg-gray-800/50' 
                  : 'bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex-shrink-0 pt-1">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium">{notification.title}</p>
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0 flex flex-col gap-1">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="sr-only">Mark as read</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleDismiss(notification.id)}
                >
                  <X className="h-4 w-4 text-gray-500" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );

  // Preferences dialog content
  const renderPreferencesDialog = () => (
    <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {!preferences ? (
            <p className="text-center text-gray-500">Loading preferences...</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="enable-notifications">Enable notifications</Label>
                <Switch 
                  id="enable-notifications" 
                  checked={preferences.enableNotifications}
                  onCheckedChange={(checked) => togglePreference('enableNotifications', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications">Email notifications</Label>
                <Switch 
                  id="email-notifications" 
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => togglePreference('emailNotifications', checked)}
                  disabled={!preferences.enableNotifications}
                />
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-2">Notification Types</h4>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="status-change">Status changes</Label>
                    <Switch 
                      id="status-change" 
                      checked={preferences.notificationTypes.status_change}
                      onCheckedChange={(checked) => toggleNotificationType('status_change', checked)}
                      disabled={!preferences.enableNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="deadline">Deadline alerts</Label>
                    <Switch 
                      id="deadline" 
                      checked={preferences.notificationTypes.deadline_approaching}
                      onCheckedChange={(checked) => toggleNotificationType('deadline_approaching', checked)}
                      disabled={!preferences.enableNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="resource">Resource assignments</Label>
                    <Switch 
                      id="resource" 
                      checked={preferences.notificationTypes.resource_assigned}
                      onCheckedChange={(checked) => toggleNotificationType('resource_assigned', checked)}
                      disabled={!preferences.enableNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cost">Cost updates</Label>
                    <Switch 
                      id="cost" 
                      checked={preferences.notificationTypes.cost_update}
                      onCheckedChange={(checked) => toggleNotificationType('cost_update', checked)}
                      disabled={!preferences.enableNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sla">SLA violations</Label>
                    <Switch 
                      id="sla" 
                      checked={preferences.notificationTypes.sla_violation}
                      onCheckedChange={(checked) => toggleNotificationType('sla_violation', checked)}
                      disabled={!preferences.enableNotifications}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="new-job">New jobs</Label>
                    <Switch 
                      id="new-job" 
                      checked={preferences.notificationTypes.new_job}
                      onCheckedChange={(checked) => toggleNotificationType('new_job', checked)}
                      disabled={!preferences.enableNotifications}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button 
            variant="primary" 
            onClick={() => setShowPreferences(false)}
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Main button that opens notifications
  const renderNotificationButton = () => (
    <Button
      variant="ghost"
      className={`relative p-2 rounded-full ${buttonClassName || ''}`}
      onClick={() => setShowNotifications(!showNotifications)}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </div>
      )}
    </Button>
  );

  if (!user) return null;

  return (
    <div className="relative">
      {renderNotificationButton()}
      
      {showTray ? (
        <>
          {showNotifications && (
            <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-gray-800 shadow-lg rounded-md z-50 overflow-hidden">
              {renderNotificationContent()}
            </div>
          )}
        </>
      ) : (
        <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Notifications</DialogTitle>
            </DialogHeader>
            {renderNotificationContent()}
          </DialogContent>
        </Dialog>
      )}
      
      {renderPreferencesDialog()}
    </div>
  );
} 