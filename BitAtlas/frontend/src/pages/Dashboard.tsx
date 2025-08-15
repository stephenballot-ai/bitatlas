import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import FileUpload from '../components/files/FileUpload';
import FileList from '../components/files/FileList';
import FileSearch from '../components/files/FileSearch';
import FilePreview from '../components/files/FilePreview';
import { FileMetadata, FileContent } from '../types';
import { apiService } from '../services/api';

export default function Dashboard() {
  const { state, logout } = useAuth();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [currentPath] = useState('/');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load files
  useEffect(() => {
    loadFiles();
  }, [currentPath, refreshTrigger]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let response;
      if (searchQuery.trim()) {
        response = await apiService.searchFiles({ query: searchQuery });
      } else {
        response = await apiService.listFiles({ path: currentPath });
      }
      
      setFiles(response.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUploaded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFileDeleted = () => {
    setRefreshTrigger(prev => prev + 1);
    setSelectedFile(null);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleFileSelect = async (file: FileMetadata) => {
    try {
      const response = await apiService.getFile(file.id);
      setSelectedFile(response.file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">BitAtlas</h1>
              <span className="ml-2 text-sm text-gray-500">European Cloud Storage</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {state.user?.email}
              </span>
              <button
                onClick={logout}
                className="btn btn-secondary text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Upload Files</h2>
                <p className="text-sm text-gray-600">Drag and drop files or click to browse</p>
              </div>
              <div className="card-body">
                <FileUpload
                  currentPath={currentPath}
                  onFileUploaded={handleFileUploaded}
                />
              </div>
            </div>

            {/* Search */}
            <div className="card">
              <div className="card-body">
                <FileSearch
                  onSearch={handleSearch}
                  isLoading={loading}
                />
              </div>
            </div>

            {/* File List */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">
                  Files {searchQuery ? `(Search: "${searchQuery}")` : `(${currentPath})`}
                </h2>
                <p className="text-sm text-gray-600">
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="card-body">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}
                
                <FileList
                  files={files}
                  loading={loading}
                  onFileSelect={handleFileSelect}
                  onFileDeleted={handleFileDeleted}
                  selectedFile={selectedFile}
                />
              </div>
            </div>
          </div>

          {/* Sidebar - File Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="card">
                <div className="card-header">
                  <h2 className="text-lg font-semibold text-gray-900">File Preview</h2>
                </div>
                <div className="card-body">
                  <FilePreview
                    file={selectedFile}
                    onClose={() => setSelectedFile(null)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}