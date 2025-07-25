import React, { useState, useEffect } from 'react';
import { SalesGoal } from '../../types/sales';
import { fetchGoals } from '../../services/goalService';
import { getTimeElapsedPercentage, getDaysRemaining } from '../../utils/dateUtils';
import { calculateProgress } from '../../utils/salesUtils';
import Card from '../ui/Card';
import { Badge } from '../ui/Badge';
import { AlertTriangle, CheckCircle, Bell, X, TrendingUp, Clock } from 'lucide-react';
import { Button } from '../ui/Button';

export interface Notification {
  id: string;
  goalId: string;
  goalTitle: string;
  type: 'completed' | 'at-risk' | 'behind' | 'approaching';
  message: string;
  timestamp: Date;
  read: boolean;
}

export function GoalNotifications() {
  const [goals, setGoals] = useState<SalesGoal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadGoals = async () => {
      try {
        setIsLoading(true);
        const data = await fetchGoals();
        setGoals(data);
        setError(null);
      } catch (err) {
        setError('Failed to load goals. Please try again later.');
        console.error('Error loading goals:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadGoals();
  }, []);

  useEffect(() => {
    if (goals.length > 0) {
      generateNotifications();
    }
  }, [goals]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const generateNotifications = () => {
    const newNotifications: Notification[] = [];
    const now = new Date();

    goals.forEach(goal => {
      const progress = goal.currentValue / goal.targetValue;
      const timeElapsed = getTimeElapsedPercentage(goal.startDate, goal.endDate);
      const daysRemaining = getDaysRemaining(goal.endDate);
      const endDate = new Date(goal.endDate);
      
      // Goal completed notification
      if (progress >= 1) {
        newNotifications.push({
          id: `completed-${goal.id}`,
          goalId: goal.id,
          goalTitle: goal.title,
          type: 'completed',
          message: `Congratulations! Goal "${goal.title}" has been completed.`,
          timestamp: now,
          read: false
        });
      }
      
      // At risk notification
      else if (progress < timeElapsed / 100 && progress >= (timeElapsed / 100) - 0.15) {
        newNotifications.push({
          id: `at-risk-${goal.id}`,
          goalId: goal.id,
          goalTitle: goal.title,
          type: 'at-risk',
          message: `Goal "${goal.title}" is falling behind schedule and may be at risk.`,
          timestamp: now,
          read: false
        });
      }
      
      // Behind notification
      else if (progress < (timeElapsed / 100) - 0.15) {
        newNotifications.push({
          id: `behind-${goal.id}`,
          goalId: goal.id,
          goalTitle: goal.title,
          type: 'behind',
          message: `Goal "${goal.title}" is significantly behind schedule and needs attention.`,
          timestamp: now,
          read: false
        });
      }
      
      // Approaching deadline
      if (daysRemaining > 0 && daysRemaining <= 7) {
        newNotifications.push({
          id: `approaching-${goal.id}`,
          goalId: goal.id,
          goalTitle: goal.title,
          type: 'approaching',
          message: `Goal "${goal.title}" deadline is approaching in ${daysRemaining} days.`,
          timestamp: now,
          read: false
        });
      }
    });

    setNotifications(newNotifications);
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  if (isLoading) {
    return null;
  }

  if (error) {
    return null;
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'at-risk':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'behind':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'approaching':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className="relative p-2 rounded-full"
        onClick={() => setShowNotifications(!showNotifications)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </Button>

      {showNotifications && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white dark:bg-dark-100 shadow-lg rounded-md z-50">
          <div className="p-3 border-b border-gray-200 dark:border-dark-200 flex justify-between items-center">
            <h3 className="font-medium">Notifications</h3>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all as read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-gray-100 dark:border-dark-200 flex gap-3 ${
                    notification.read ? 'bg-gray-50 dark:bg-dark-200' : 'bg-white dark:bg-dark-100'
                  }`}
                >
                  <div className="flex-shrink-0 pt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="sr-only">Mark as read</span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => removeNotification(notification.id)}
                    >
                      <X className="h-4 w-4 text-gray-500" />
                      <span className="sr-only">Dismiss</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 