import React, { useState, useCallback } from 'react';

interface FileSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function FileSearch({ onSearch, isLoading }: FileSearchProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  }, [query, onSearch]);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search files by name or content..."
            className="input pl-10 pr-10"
            disabled={isLoading}
          />
          
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              disabled={isLoading}
            >
              <svg
                className="h-5 w-5 text-gray-400 hover:text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
        
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="btn btn-primary flex items-center"
        >
          {isLoading ? (
            <>
              <div className="spinner mr-2 w-4 h-4"></div>
              Searching...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Search
            </>
          )}
        </button>
      </div>
      
      {/* Search Tips */}
      <div className="text-xs text-gray-500">
        <p>💡 <strong>Search tips:</strong></p>
        <ul className="list-disc list-inside mt-1 space-y-1">
          <li>Search by filename: <code className="bg-gray-100 px-1 rounded">report.pdf</code></li>
          <li>Search by content: <code className="bg-gray-100 px-1 rounded">quarterly results</code></li>
          <li>Use quotes for exact phrases: <code className="bg-gray-100 px-1 rounded">"project alpha"</code></li>
        </ul>
      </div>
    </form>
  );
}