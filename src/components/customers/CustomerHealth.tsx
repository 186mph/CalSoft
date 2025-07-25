import React from 'react';
import { format } from 'date-fns';

interface CustomerHealthMonitoringProps {
  customerId: string;
}

const CustomerHealthMonitoring: React.FC<CustomerHealthMonitoringProps> = ({ customerId }) => {
  // Static dummy data for presentation
  const lastUpdated = new Date('2023-04-12');
  
  return (
    <div className="p-6 relative z-10">
      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4 flex flex-col items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Overall Health</div>
          <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-2">
            <span className="text-white text-3xl font-bold">85</span>
          </div>
          <div className="font-medium text-green-600 dark:text-green-400">Good</div>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Engagement</div>
          <div className="flex items-end mt-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">85%</div>
            <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 5%</div>
          </div>
          <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "85%" }}></div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Satisfaction</div>
          <div className="flex items-end mt-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">92%</div>
            <div className="text-xs text-green-600 dark:text-green-400 ml-2 mb-1">▲ 3%</div>
          </div>
          <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "92%" }}></div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Response Time</div>
          <div className="flex items-end mt-1">
            <div className="text-xl font-bold text-gray-900 dark:text-white">78%</div>
            <div className="text-xs text-yellow-600 dark:text-yellow-400 ml-2 mb-1">▼ 2%</div>
          </div>
          <div className="mt-2 h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
            <div className="h-full bg-yellow-500 rounded-full" style={{ width: "78%" }}></div>
          </div>
        </div>
      </div>
      
      {/* Health Trend */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Health Trend</h3>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="h-64 flex items-end justify-between px-2">
            <div className="w-1/12 flex flex-col items-center">
              <div className="h-32 w-4 bg-accent-color rounded-t-sm"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Jan</div>
            </div>
            <div className="w-1/12 flex flex-col items-center">
              <div className="h-24 w-4 bg-accent-color rounded-t-sm"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Feb</div>
            </div>
            <div className="w-1/12 flex flex-col items-center">
              <div className="h-40 w-4 bg-accent-color rounded-t-sm"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Mar</div>
            </div>
            <div className="w-1/12 flex flex-col items-center">
              <div className="h-36 w-4 bg-accent-color rounded-t-sm"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Apr</div>
            </div>
            <div className="w-1/12 flex flex-col items-center">
              <div className="h-44 w-4 bg-accent-color rounded-t-sm"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">May</div>
            </div>
            <div className="w-1/12 flex flex-col items-center">
              <div className="h-48 w-4 bg-accent-color rounded-t-sm"></div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">Jun</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Recent Surveys */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Recent Surveys</h3>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Q1 Satisfaction Survey</span>
                <span className="ml-3 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">High</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Score: 9/10</div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Completed: Mar 15, 2023</div>
            <div className="text-sm mb-1">Satisfaction</div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
              <div className="h-full bg-green-500 rounded-full" style={{ width: "90%" }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Support Response Survey</span>
                <span className="ml-3 bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">Medium</span>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Score: 7/10</div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Completed: Feb 10, 2023</div>
            <div className="text-sm mb-1">Satisfaction</div>
            <div className="h-2 w-full bg-gray-200 dark:bg-gray-600 rounded-full">
              <div className="h-full bg-yellow-500 rounded-full" style={{ width: "70%" }}></div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <a href="#" className="text-sm text-accent-color hover:underline">View all surveys</a>
          </div>
        </div>
      </div>
      
      {/* Two-Column Layout for Risk Factors and Activity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Risk Factors */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Risk Factors</h3>
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-600">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-5 h-5 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Slow response times</h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Average response time increased by 15% in the last 30 days
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-5 h-5 text-yellow-400">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Delayed project milestones</h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    2 milestones have been delayed in the current quarter
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recommended Actions</h4>
              <ul className="space-y-2">
                <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg className="w-4 h-4 mr-1.5 text-green-500 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  Schedule quarterly review meeting
                </li>
                <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg className="w-4 h-4 mr-1.5 text-green-500 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  Review support ticket response workflows
                </li>
                <li className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg className="w-4 h-4 mr-1.5 text-green-500 dark:text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                  Conduct satisfaction survey
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Activity Metrics */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Activity Metrics</h3>
          <div className="bg-white dark:bg-gray-700 rounded-lg shadow p-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Support Tickets</div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white mr-2">8</span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    2 (20%)
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Active Users</div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white mr-2">12</span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    3 (33%)
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Feature Usage</div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white mr-2">85%</span>
                  <span className="text-sm text-green-600 dark:text-green-400">
                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    5%
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Key features</div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400">Login Frequency</div>
                <div className="flex items-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white mr-2">4.2</span>
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">
                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    0.3
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per week avg.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Generate Report Button */}
      <div className="mt-8 flex justify-end">
        <button className="inline-flex items-center justify-center rounded-md border border-transparent bg-accent-color px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-color/90 focus:outline-none focus:ring-2 focus:ring-accent-color focus:ring-offset-2">
          Generate Health Report
        </button>
      </div>
      
      {/* Last updated info */}
      <div className="mt-4 text-right text-xs text-gray-500 dark:text-gray-400">
        Last updated: {format(lastUpdated, 'MMM d, yyyy')}
      </div>
    </div>
  );
};

export default CustomerHealthMonitoring; 