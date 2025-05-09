import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SearchFilters } from '../components/search/GlobalSearchBar';
import { addToRecentSearches } from '../components/search/RecentSearches.tsx';

// Define the types for search results
export interface BaseSearchResult {
  id: string;
  type: string;
  division?: string;
}

export interface CustomerSearchResult extends BaseSearchResult {
  type: 'customer';
  name: string;
  company_name: string;
  metadata: { created_at: string };
}

export interface JobSearchResult extends BaseSearchResult {
  type: 'job';
  title: string;
  status: string;
  customer: { name: string };
  due_date: string;
}

export interface ContactSearchResult extends BaseSearchResult {
  type: 'contact';
  name: string;
  email: string;
  customer: { name: string };
}

export interface OpportunitySearchResult extends BaseSearchResult {
  type: 'opportunity';
  title: string;
  customer: { name: string };
  status: string;
}

export interface AssetSearchResult extends BaseSearchResult {
  type: 'asset';
  name: string;
  identifier: string;
  location: string;
}

export interface ReportSearchResult extends BaseSearchResult {
  type: 'report';
  title: string;
  job: { title: string };
  created_at: string;
}

// Union type for all search result types
export type SearchResult = 
  | CustomerSearchResult 
  | JobSearchResult 
  | ContactSearchResult
  | OpportunitySearchResult
  | AssetSearchResult
  | ReportSearchResult;

interface SearchContextType {
  query: string;
  filters: SearchFilters;
  searchResults: SearchResult[];
  loading: boolean;
  hasSearched: boolean;
  performSearch: (query: string, filters?: SearchFilters) => Promise<void>;
  clearSearch: () => void;
}

const defaultFilters: SearchFilters = {
  entityTypes: [],
  divisions: [],
  advancedMode: false
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Mock search API - would be replaced with actual API calls
const mockSearchAPI = async (query: string, filters: SearchFilters): Promise<SearchResult[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (!query.trim()) return [];
  
  // Generate mock results based on the query
  const results: SearchResult[] = [];
  const entityTypes = filters.entityTypes.length > 0 
    ? filters.entityTypes
    : ['customers', 'contacts', 'jobs', 'opportunities', 'assets', 'reports'];
  
  // Add some mock results for each entity type
  if (entityTypes.includes('customers')) {
    results.push(
      { 
        id: '1', 
        type: 'customer', 
        name: `${query} Corporation`, 
        company_name: `${query} Corporation`, 
        division: 'north_alabama',
        metadata: { created_at: new Date().toISOString() }
      },
      { 
        id: '2', 
        type: 'customer', 
        name: `Global ${query}`, 
        company_name: `Global ${query}`, 
        division: 'tennessee',
        metadata: { created_at: new Date().toISOString() }
      }
    );
  }
  
  if (entityTypes.includes('jobs')) {
    results.push(
      { 
        id: '101', 
        type: 'job', 
        title: `${query} Maintenance Job`, 
        status: 'active', 
        division: 'tennessee',
        customer: { name: 'ABC Corp' },
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      { 
        id: '102', 
        type: 'job', 
        title: `${query} Installation Project`, 
        status: 'pending', 
        division: 'north_alabama',
        customer: { name: 'XYZ Industries' },
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }
  
  if (entityTypes.includes('contacts')) {
    results.push(
      { 
        id: '201', 
        type: 'contact', 
        name: `John ${query}`, 
        email: `john${query.toLowerCase()}@example.com`, 
        customer: { name: 'ABC Corp' }
      },
      { 
        id: '202', 
        type: 'contact', 
        name: `Sarah ${query}`, 
        email: `sarah${query.toLowerCase()}@example.com`, 
        customer: { name: 'XYZ Industries' }
      }
    );
  }
  
  // Filter by divisions if specified
  if (filters.divisions.length > 0) {
    return results.filter(result => 
      !result.division || filters.divisions.includes(result.division)
    );
  }
  
  return results;
};

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider = ({ children }: SearchProviderProps) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters = filters) => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setQuery(searchQuery);
    setFilters(searchFilters);
    setLoading(true);
    setHasSearched(true);

    try {
      // In a real implementation, this would be an API call to a backend service
      const results = await mockSearchAPI(searchQuery, searchFilters);
      setSearchResults(results);
      
      // Add to recent searches
      if (searchQuery.trim()) {
        addToRecentSearches(searchQuery);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setHasSearched(false);
  }, []);

  return (
    <SearchContext.Provider
      value={{
        query,
        filters,
        searchResults,
        loading,
        hasSearched,
        performSearch,
        clearSearch
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export default SearchContext; 