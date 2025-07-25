import React, { useState, useEffect } from 'react';
import { SearchIcon } from 'lucide-react';

interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
  maxSuggestions?: number;
}

// This is a simplified mockup for suggestions
// In a real implementation, this would likely be fetched from an API
const getMockSuggestions = (query: string): string[] => {
  if (!query || query.length < 2) return [];
  
  // Mock suggestions based on common entities
  const allSuggestions = [
    // Customers
    'customer:ABC Corporation',
    'customer:XYZ Industries',
    'customer:Acme Systems',
    'customer:Global Technologies',
    // Jobs
    'job:Annual Testing North Alabama',
    'job:Switchgear Installation Tennessee',
    'job:Circuit Breaker Maintenance',
    'job:Transformer Testing International',
    // Contacts
    'contact:John Smith',
    'contact:Jane Doe',
    'contact:Robert Johnson',
    'contact:Sarah Williams',
    // Opportunities
    'opportunity:New Equipment Sale',
    'opportunity:Service Contract Renewal',
    'opportunity:Testing Service Expansion',
    // Assets
    'asset:Transformer TR-1001',
    'asset:Circuit Breaker CB-324',
    'asset:Switchgear SG-555',
    // Reports
    'report:Annual Maintenance Report',
    'report:Equipment Testing Results',
    'report:Safety Inspection',
  ];
  
  // Filter suggestions that contain the query (case-insensitive)
  const lowerQuery = query.toLowerCase();
  return allSuggestions
    .filter(suggestion => suggestion.toLowerCase().includes(lowerQuery))
    .slice(0, 10); // Limit to 10 results
};

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({ 
  query, 
  onSelect, 
  maxSuggestions = 7 
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Update suggestions when the query changes
  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Simulate API call with loading state
    setLoading(true);
    
    // In a real implementation, this would be an API call
    const timer = setTimeout(() => {
      const results = getMockSuggestions(query);
      setSuggestions(results.slice(0, maxSuggestions));
      setLoading(false);
    }, 300); // Debounce time
    
    return () => clearTimeout(timer);
  }, [query, maxSuggestions]);

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: string) => {
    onSelect(suggestion);
  };

  // Format the suggestion to highlight the matched part
  const formatSuggestion = (suggestion: string) => {
    // Simple formatting: Handle types (e.g., "customer:ABC Corporation")
    const parts = suggestion.split(':');
    if (parts.length > 1) {
      return (
        <>
          <span className="text-xs text-gray-500 dark:text-dark-400 mr-1">
            {parts[0]}:
          </span>
          <span>{parts.slice(1).join(':')}</span>
        </>
      );
    }
    return suggestion;
  };

  // If there are no suggestions and we're not loading, don't render anything
  if (suggestions.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-dark-100 shadow-lg rounded-md border border-gray-200 dark:border-dark-300">
      {loading ? (
        <div className="p-3 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-solid border-accent-color border-r-transparent"></div>
          <span className="ml-2 text-sm text-gray-500 dark:text-dark-400">Searching...</span>
        </div>
      ) : (
        <div className="p-1">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSelectSuggestion(suggestion)}
              className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-dark-200 cursor-pointer rounded-md"
            >
              <SearchIcon size={16} className="text-gray-400 dark:text-dark-500 mr-2" />
              <span className="text-sm text-gray-800 dark:text-dark-200">
                {formatSuggestion(suggestion)}
              </span>
            </div>
          ))}
          
          {/* Show search by query option */}
          <div
            onClick={() => handleSelectSuggestion(query)}
            className="flex items-center px-3 py-2 mt-1 hover:bg-gray-100 dark:hover:bg-dark-200 cursor-pointer rounded-md border-t border-gray-200 dark:border-dark-300"
          >
            <SearchIcon size={16} className="text-accent-color mr-2" />
            <span className="text-sm text-gray-800 dark:text-dark-200">
              Search for "{query}"
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions; 