import { useState } from 'react';
import { FileMetadata, FileContent } from '../../types';
import { apiService } from '../../services/api';

interface FileListProps {
  files: FileMetadata[];
  loading: boolean;
  onFileSelect: (file: FileMetadata) => void;
  onFileDeleted: () => void;
  selectedFile: FileContent | null;
}

export default function FileList({ 
  files, 
  loading, 
  onFileSelect, 
  onFileDeleted, 
  selectedFile 
}: FileListProps) {
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'txt':
      case 'md':
        return '📄';
      case 'pdf':
        return '📕';
      case 'doc':
      case 'docx':
        return '📘';
      case 'xls':
      case 'xlsx':
        return '📗';
      case 'ppt':
      case 'pptx':
        return '📙';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎬';
      case 'mp3':
      case 'wav':
        return '🎵';
      case 'zip':
      case 'rar':
        return '📦';
      case 'js':
      case 'ts':
      case 'py':
      case 'java':
        return '💻';
      default:
        return '📄';
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    setDeletingFileId(fileId);
    try {
      await apiService.deleteFile(fileId);
      onFileDeleted();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete file');
    } finally {
      setDeletingFileId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-gray-600">Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        <p className="text-gray-600">No files found</p>
        <p className="text-sm text-gray-500 mt-1">Upload some files to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div
          key={file.id}
          className={`
            flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors
            ${selectedFile?.id === file.id 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }
          `}
          onClick={() => onFileSelect(file)}
        >
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <span className="text-2xl">{getFileIcon(file.name)}</span>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {file.name}
              </h3>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{formatFileSize(file.size)}</span>
                <span>{formatDate(file.updatedAt)}</span>
                <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                  {file.path}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFileSelect(file);
              }}
              className="btn btn-secondary text-xs"
              title="View file"
            >
              View
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(file.id, file.name);
              }}
              disabled={deletingFileId === file.id}
              className="btn bg-red-50 text-red-600 hover:bg-red-100 text-xs"
              title="Delete file"
            >
              {deletingFileId === file.id ? (
                <div className="spinner w-3 h-3"></div>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}