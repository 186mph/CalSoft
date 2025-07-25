import { supabase } from '../lib/supabase';
import { toast } from '../components/ui/toast';

export interface JobNotification {
  id: string;
  job_id: string;
  user_id: string | null; // null for notifications to all users
  title: string;
  message: string;
  type: 'status_change' | 'deadline_approaching' | 'resource_assigned' | 'cost_update' | 'sla_violation' | 'new_job' | 'other';
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  updated_at: string;
  metadata: any; // Additional data like source, priority, etc.
}

export interface NotificationPreferences {
  enableNotifications: boolean;
  emailNotifications: boolean;
  notificationTypes: {
    status_change: boolean;
    deadline_approaching: boolean;
    resource_assigned: boolean;
    cost_update: boolean;
    sla_violation: boolean;
    new_job: boolean;
  }
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enableNotifications: true,
  emailNotifications: false,
  notificationTypes: {
    status_change: true,
    deadline_approaching: true,
    resource_assigned: true,
    cost_update: true,
    sla_violation: true,
    new_job: true
  }
};

// Get user notification preferences
export const getUserNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('user_preferences')
      .select('notification_preferences')
      .eq('user_id', userId)
      .single();
      
    if (error) throw error;
    
    return data?.notification_preferences || DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

// Update user notification preferences
export const updateUserNotificationPreferences = async (
  userId: string, 
  preferences: NotificationPreferences
): Promise<{ success: boolean }> => {
  try {
    const { error } = await supabase
      .schema('common')
      .from('user_preferences')
      .upsert({
        user_id: userId,
        notification_preferences: preferences,
        updated_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return { success: false };
  }
};

// Get user notifications with optional filtering
export const getUserNotifications = async (
  userId: string,
  options: {
    limit?: number;
    unreadOnly?: boolean;
    types?: string[];
    jobId?: string;
  } = {}
): Promise<{ data: JobNotification[], error: any }> => {
  try {
    const { limit = 50, unreadOnly = false, types, jobId } = options;
    
    let query = supabase
      .schema('common')
      .from('job_notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.is.null`) // Get user's notifications and global ones
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }
    
    if (types && types.length > 0) {
      query = query.in('type', types);
    }
    
    if (jobId) {
      query = query.eq('job_id', jobId);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error getting notifications:', error);
    return { data: [], error };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (
  notificationId: string
): Promise<{ success: boolean, error: any }> => {
  try {
    const { error } = await supabase
      .schema('common')
      .from('job_notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
      
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error };
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (
  userId: string
): Promise<{ success: boolean, error: any }> => {
  try {
    const { error } = await supabase
      .schema('common')
      .from('job_notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .or(`user_id.eq.${userId},user_id.is.null`);
      
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error };
  }
};

// Dismiss notification (hide without deleting)
export const dismissNotification = async (
  notificationId: string
): Promise<{ success: boolean, error: any }> => {
  try {
    const { error } = await supabase
      .schema('common')
      .from('job_notifications')
      .update({ 
        is_dismissed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);
      
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Error dismissing notification:', error);
    return { success: false, error };
  }
};

// Create a new notification
export const createJobNotification = async (
  notification: Omit<JobNotification, 'id' | 'is_read' | 'is_dismissed' | 'created_at' | 'updated_at'>
): Promise<{ data: JobNotification | null, error: any }> => {
  try {
    const { data, error } = await supabase
      .schema('common')
      .from('job_notifications')
      .insert({
        ...notification,
        is_read: false,
        is_dismissed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error creating notification:', error);
    return { data: null, error };
  }
};

// Show toast notification
export const showToastNotification = (notification: JobNotification) => {
  const variant = getVariantForNotificationType(notification.type);
  
  toast({
    title: notification.title,
    description: notification.message,
    variant
  });
};

// Helper to get appropriate toast variant based on notification type
const getVariantForNotificationType = (type: string): 'default' | 'success' | 'warning' | 'destructive' | 'info' => {
  switch (type) {
    case 'status_change':
      return 'info';
    case 'deadline_approaching':
      return 'warning';
    case 'resource_assigned':
      return 'info';
    case 'cost_update':
      return 'info';
    case 'sla_violation':
      return 'destructive';
    case 'new_job':
      return 'success';
    default:
      return 'default';
  }
};

// Get unread notification count for a user
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .schema('common')
      .from('job_notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${userId},user_id.is.null`)
      .eq('is_read', false)
      .eq('is_dismissed', false);
      
    if (error) throw error;
    
    return count || 0;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}; 