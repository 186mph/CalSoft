import React from 'react';
import { GoalProgress as GoalProgressType } from '../../lib/types';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle 
} from 'lucide-react';

interface GoalProgressProps {
  progress: GoalProgressType;
  showDetails?: boolean;
}

export const GoalProgress: React.FC<GoalProgressProps> = ({ 
  progress, 
  showDetails = false 
}) => {
  const { 
    percentage, 
    status, 
    timeRemaining, 
    projectedValue 
  } = progress;
  
  // Determine color based on status
  let statusColor = '';
  let statusIcon: React.ReactNode = null;
  
  switch (status) {
    case 'completed':
      statusColor = 'bg-green-500';
      statusIcon = <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />;
      break;
    case 'on_track':
      statusColor = 'bg-blue-500';
      statusIcon = null;
      break;
    case 'at_risk':
      statusColor = 'bg-amber-500';
      statusIcon = <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />;
      break;
    case 'behind':
      statusColor = 'bg-red-500';
      statusIcon = <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      break;
  }
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {percentage.toFixed(0)}% Complete
        </span>
        {statusIcon && (
          <div className="flex items-center">
            {statusIcon}
            <span className="ml-1 text-xs">
              {status === 'completed' 
                ? 'Completed' 
                : status === 'on_track' 
                  ? 'On Track' 
                  : status === 'at_risk' 
                    ? 'At Risk' 
                    : 'Behind'}
            </span>
          </div>
        )}
      </div>
      
      <div className="w-full h-2 bg-gray-200 dark:bg-dark-300 rounded-full overflow-hidden">
        <div 
          className={`h-full ${statusColor} rounded-full`} 
          style={{ width: `${Math.min(100, percentage)}%` }}
        ></div>
      </div>
      
      {showDetails && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div>
            <span className="block font-medium">Time Remaining</span>
            <span>{timeRemaining} days</span>
          </div>
          {projectedValue !== undefined && (
            <div>
              <span className="block font-medium">Projected</span>
              <span>
                {projectedValue >= 1000000
                  ? `$${(projectedValue / 1000000).toFixed(1)}M`
                  : projectedValue >= 1000
                  ? `$${(projectedValue / 1000).toFixed(1)}K`
                  : `$${projectedValue.toFixed(2)}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 