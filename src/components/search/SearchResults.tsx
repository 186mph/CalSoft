import React from 'react';
import { Users, Briefcase, User, FileText, Package, FileBarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  useSearch, 
  SearchResult,
  CustomerSearchResult,
  JobSearchResult,
  ContactSearchResult,
  OpportunitySearchResult,
  AssetSearchResult,
  ReportSearchResult
} from '../../context/SearchContext';
import { useDivision } from '../../App';

// Component to display an individual search result
const SearchResultCard = ({ 
  result, 
  onClick 
}: { 
  result: SearchResult,
  onClick?: (result: SearchResult) => void 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(result);
    }
  };

  // Return different card layouts based on result type
  const renderResultCard = () => {
    switch (result.type) {
      case 'customer': {
        const customerResult = result as CustomerSearchResult;
        return (
          <div onClick={handleClick} className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-md cursor-pointer">
            <div className="flex-shrink-0 mr-4">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-md">
                <Users size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                {customerResult.company_name}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Customer • {customerResult.division || 'Global'}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-500">
                Created: {new Date(customerResult.metadata.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      }
      
      case 'job': {
        const jobResult = result as JobSearchResult;
        return (
          <div onClick={handleClick} className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-md cursor-pointer">
            <div className="flex-shrink-0 mr-4">
              <div className="bg-green-100 dark:bg-green-900/20 p-2 rounded-md">
                <Briefcase size={20} className="text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                {jobResult.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Job • {jobResult.status} • {jobResult.division || 'Unknown Division'}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-500">
                Customer: {jobResult.customer.name} • Due: {new Date(jobResult.due_date).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      }
      
      case 'contact': {
        const contactResult = result as ContactSearchResult;
        return (
          <div onClick={handleClick} className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-md cursor-pointer">
            <div className="flex-shrink-0 mr-4">
              <div className="bg-purple-100 dark:bg-purple-900/20 p-2 rounded-md">
                <User size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                {contactResult.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Contact • {contactResult.email}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-500">
                Company: {contactResult.customer.name}
              </p>
            </div>
          </div>
        );
      }
        
      case 'opportunity': {
        const opportunityResult = result as OpportunitySearchResult;
        return (
          <div onClick={handleClick} className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-md cursor-pointer">
            <div className="flex-shrink-0 mr-4">
              <div className="bg-amber-100 dark:bg-amber-900/20 p-2 rounded-md">
                <FileText size={20} className="text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                {opportunityResult.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Opportunity • {opportunityResult.status}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-500">
                Customer: {opportunityResult.customer.name}
              </p>
            </div>
          </div>
        );
      }
      
      case 'asset': {
        const assetResult = result as AssetSearchResult;
        return (
          <div onClick={handleClick} className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-md cursor-pointer">
            <div className="flex-shrink-0 mr-4">
              <div className="bg-teal-100 dark:bg-teal-900/20 p-2 rounded-md">
                <Package size={20} className="text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                {assetResult.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Asset • {assetResult.identifier}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-500">
                Location: {assetResult.location}
              </p>
            </div>
          </div>
        );
      }
      
      case 'report': {
        const reportResult = result as ReportSearchResult;
        return (
          <div onClick={handleClick} className="flex items-start p-4 hover:bg-gray-50 dark:hover:bg-dark-200 rounded-md cursor-pointer">
            <div className="flex-shrink-0 mr-4">
              <div className="bg-red-100 dark:bg-red-900/20 p-2 rounded-md">
                <FileBarChart size={20} className="text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-dark-900 truncate">
                {reportResult.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-400">
                Report • {new Date(reportResult.created_at).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-500">
                Job: {reportResult.job.title}
              </p>
            </div>
          </div>
        );
      }
        
      default:
        return null;
    }
  };

  return renderResultCard();
};

export const SearchResults: React.FC = () => {
  const { query, filters, searchResults, loading, hasSearched } = useSearch();
  const navigate = useNavigate();
  const { division } = useDivision();

  // Handle result click to navigate to the appropriate page
  const handleResultClick = (result: SearchResult) => {
    // Determine the correct path based on result type and division
    const resultDivision = result.division || division;
    
    switch (result.type) {
      case 'customer':
        navigate(`/${resultDivision}/customers/${result.id}`);
        break;
      case 'job':
        navigate(`/${resultDivision}/jobs/${result.id}`);
        break;
      case 'contact':
        navigate(`/${resultDivision}/contacts/${result.id}`);
        break;
      case 'opportunity':
        navigate(`/${resultDivision}/opportunities/${result.id}`);
        break;
      case 'asset':
        navigate(`/${resultDivision}/assets/${result.id}`);
        break;
      case 'report':
        navigate(`/${resultDivision}/reports/${result.id}`);
        break;
      default: {
        // Use type assertion to tell TypeScript that result.type exists
        const type = (result as {type: string}).type;
        console.error('Unknown result type:', type);
        break;
      }
    }
  };

  // Group results by type using type casting for safety
  const groupedResults: Record<string, SearchResult[]> = {};
  
  // Safety check before grouping
  if (Array.isArray(searchResults)) {
    // More explicit typing for the item parameter
    searchResults.forEach((item) => {
      // Type guard to ensure item has the correct shape
      if (item && typeof item === 'object' && 'type' in item && 'id' in item) {
        // Now TypeScript knows item has a 'type' property of type string
        const result = item as SearchResult;
        const type = result.type;
        
        if (!groupedResults[type]) {
          groupedResults[type] = [];
        }
        groupedResults[type].push(result);
      }
    });
  }

  // If no results are found and we're not loading
  if (!loading && hasSearched && searchResults.length === 0) {
    return (
      <div className="mt-4 p-6 text-center bg-white dark:bg-dark-100 rounded-md shadow-sm border border-gray-200 dark:border-dark-300">
        <div className="text-gray-400 dark:text-dark-500 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-dark-900">No results found</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
          No matches were found for "{query}". Try adjusting your search terms or filters.
        </p>
      </div>
    );
  }

  // If we're loading
  if (loading) {
    return (
      <div className="mt-4 p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#f26722] border-r-transparent"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-dark-400">Searching...</p>
      </div>
    );
  }

  // If we haven't searched yet
  if (!hasSearched) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="bg-white dark:bg-dark-100 rounded-md shadow-sm border border-gray-200 dark:border-dark-300 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-dark-300">
          <h2 className="text-lg font-medium text-gray-900 dark:text-dark-900">
            Search Results
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-400">
            Found {searchResults.length} results for "{query}"
          </p>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-dark-300">
          {/* Render results by type */}
          {Object.entries(groupedResults).map(([type, results]) => (
            <div key={type} className="py-2">
              <h3 className="px-4 py-2 text-sm font-medium text-gray-500 dark:text-dark-400 uppercase tracking-wider">
                {type}s ({results.length})
              </h3>
              {results.map((result) => (
                <SearchResultCard 
                  key={`${result.type}-${result.id}`} 
                  result={result} 
                  onClick={handleResultClick} 
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SearchResults; 