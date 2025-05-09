import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { SearchFilterPanel } from './SearchFilterPanel.tsx';
import { RecentSearches } from './RecentSearches.tsx';
import { SearchSuggestions } from './SearchSuggestions.tsx';

export interface GlobalSearchBarProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  placeholder?: string;
  className?: string;
}

export interface SearchFilters {
  entityTypes: string[];
  divisions: string[];
  advancedMode: boolean;
}

const defaultFilters: SearchFilters = {
  entityTypes: [],
  divisions: [],
  advancedMode: false
};

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  onSearch,
  placeholder = 'Search across all portals...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setShowRecentSearches(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // '/' key to focus search
      if (event.key === '/' && document.activeElement !== containerRef.current) {
        event.preventDefault();
        const inputElement = containerRef.current?.querySelector('input');
        if (inputElement) {
          inputElement.focus();
        }
      }
      
      // Escape key to close dropdowns
      if (event.key === 'Escape') {
        setShowSuggestions(false);
        setShowRecentSearches(false);
        setShowFilters(false);
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.trim()) {
      setShowSuggestions(true);
      setShowRecentSearches(false);
    } else {
      setShowSuggestions(false);
      setShowRecentSearches(true);
    }
  };

  const handleInputFocus = () => {
    if (query.trim()) {
      setShowSuggestions(true);
    } else {
      setShowRecentSearches(true);
    }
  };

  const handleClearSearch = () => {
    setQuery('');
    setShowSuggestions(false);
    setShowRecentSearches(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, filters);
      // Store in recent searches (implementation details omitted)
      // Add to localStorage or state management...
      
      // Close dropdowns
      setShowSuggestions(false);
      setShowRecentSearches(false);
    }
  };

  const handleFilterChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion);
    onSearch(suggestion, filters);
    setShowSuggestions(false);
  };

  const handleSelectRecentSearch = (recentSearch: string) => {
    setQuery(recentSearch);
    onSearch(recentSearch, filters);
    setShowSuggestions(false);
    setShowRecentSearches(false);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
    >
      <form onSubmit={handleSubmit} className="relative">
        <Input
          leftIcon={<Search size={18} />}
          rightIcon={
            <div className="flex items-center">
              {query && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-300"
                >
                  <X size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="ml-1 p-1 text-gray-500 hover:text-gray-700 dark:text-dark-400 dark:hover:text-dark-300"
              >
                {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          }
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full pr-16"
          aria-label="Search across portals"
        />
      </form>

      {/* Filter Panel */}
      {showFilters && (
        <SearchFilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && query.trim() && (
        <SearchSuggestions
          query={query}
          onSelect={handleSelectSuggestion}
        />
      )}

      {/* Recent Searches Dropdown */}
      {showRecentSearches && !query.trim() && (
        <RecentSearches
          onSelect={handleSelectRecentSearch}
        />
      )}

      {/* Keyboard shortcut hint */}
      <div className="absolute right-3 bottom-[-20px] text-xs text-gray-500 dark:text-dark-500">
        Press / to search
      </div>
    </div>
  );
};

export default GlobalSearchBar; 