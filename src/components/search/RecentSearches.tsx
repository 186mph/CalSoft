import React, { useState, useEffect } from 'react';
import { Clock, X } from 'lucide-react';

interface RecentSearchesProps {
  onSelect: (searchTerm: string) => void;
  maxItems?: number;
}

// Maximum number of recent searches to store
const MAX_RECENT_SEARCHES = 5;
// Local storage key for recent searches
const RECENT_SEARCHES_KEY = 'amp_recent_searches';

export const RecentSearches: React.FC<RecentSearchesProps> = ({ 
  onSelect, 
  maxItems = MAX_RECENT_SEARCHES 
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Load recent searches from localStorage on component mount
  useEffect(() => {
    const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (storedSearches) {
      try {
        const parsedSearches = JSON.parse(storedSearches);
        setRecentSearches(Array.isArray(parsedSearches) ? parsedSearches : []);
      } catch (error) {
        console.error('Error parsing recent searches from localStorage:', error);
        setRecentSearches([]);
      }
    }
  }, []);

  // Add a search term to recent searches
  const addRecentSearch = (searchTerm: string) => {
    setRecentSearches(prev => {
      // Create a new array with the new term at the start, removing any duplicates
      const updatedSearches = [
        searchTerm,
        ...prev.filter(term => term !== searchTerm)
      ].slice(0, maxItems);
      
      // Store in localStorage
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
      
      return updatedSearches;
    });
  };

  // Remove a search term from recent searches
  const removeRecentSearch = (searchTerm: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent click handler
    
    setRecentSearches(prev => {
      const updatedSearches = prev.filter(term => term !== searchTerm);
      
      // Update localStorage
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
      
      return updatedSearches;
    });
  };

  // Clear all recent searches
  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  // Handle selection of a recent search
  const handleSelect = (searchTerm: string) => {
    addRecentSearch(searchTerm); // Move to top of list
    onSelect(searchTerm);
  };

  // If there are no recent searches, don't render anything
  if (recentSearches.length === 0) {
    return (
      <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-dark-100 shadow-lg rounded-md border border-gray-200 dark:border-dark-300 p-3">
        <div className="text-sm text-gray-500 dark:text-dark-400 italic">
          No recent searches
        </div>
      </div>
    );
  }

  return (
    <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-dark-100 shadow-lg rounded-md border border-gray-200 dark:border-dark-300">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-dark-300">
        <h3 className="text-sm font-medium text-gray-700 dark:text-dark-300">Recent Searches</h3>
        <button 
          onClick={clearAllRecentSearches}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-300"
        >
          Clear All
        </button>
      </div>
      
      <div className="p-1">
        {recentSearches.map((searchTerm, index) => (
          <div
            key={index}
            onClick={() => handleSelect(searchTerm)}
            className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-200 cursor-pointer rounded-md"
          >
            <div className="flex items-center">
              <Clock size={16} className="text-gray-400 dark:text-dark-500 mr-2" />
              <span className="text-sm text-gray-800 dark:text-dark-200">{searchTerm}</span>
            </div>
            <button
              onClick={(e) => removeRecentSearch(searchTerm, e)}
              className="text-gray-400 hover:text-gray-600 dark:text-dark-500 dark:hover:text-dark-300"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Utility method for adding a search to recent searches (for use by other components)
export const addToRecentSearches = (searchTerm: string) => {
  const storedSearches = localStorage.getItem(RECENT_SEARCHES_KEY);
  let recentSearches: string[] = [];
  
  if (storedSearches) {
    try {
      const parsedSearches = JSON.parse(storedSearches);
      recentSearches = Array.isArray(parsedSearches) ? parsedSearches : [];
    } catch (error) {
      console.error('Error parsing recent searches from localStorage:', error);
    }
  }
  
  // Create a new array with the new term at the start, removing any duplicates
  const updatedSearches = [
    searchTerm,
    ...recentSearches.filter(term => term !== searchTerm)
  ].slice(0, MAX_RECENT_SEARCHES);
  
  // Store in localStorage
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedSearches));
  
  return updatedSearches;
};

export default RecentSearches; 