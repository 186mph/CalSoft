// Type declarations for search components

import { SearchFilters } from './GlobalSearchBar';
import React from 'react';

// SearchFilterPanel
export interface SearchFilterPanelProps {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  onClose: () => void;
}

export declare const SearchFilterPanel: React.FC<SearchFilterPanelProps>;

// RecentSearches
export interface RecentSearchesProps {
  onSelect: (searchTerm: string) => void;
  maxItems?: number;
}

export declare const RecentSearches: React.FC<RecentSearchesProps>;
export declare function addToRecentSearches(searchTerm: string): string[];

// SearchSuggestions
export interface SearchSuggestionsProps {
  query: string;
  onSelect: (suggestion: string) => void;
  maxSuggestions?: number;
}

export declare const SearchSuggestions: React.FC<SearchSuggestionsProps>; 