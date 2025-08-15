import { useState } from 'react';
import { FileContent } from '../../types';

interface FilePreviewProps {
  file: FileContent | null;
  onClose: () => void;
}

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  const [showFullContent, setShowFullContent] = useState(false);

  if (!file) {
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
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <p className="text-gray-600">Select a file to preview</p>
        <p className="text-sm text-gray-500 mt-1">Click on any file from the list</p>
      </div>
    );
  }

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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileType = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    
    const typeMap: Record<string, string> = {
      'txt': 'Text',
      'md': 'Markdown',
      'pdf': 'PDF Document',
      'doc': 'Word Document',
      'docx': 'Word Document',
      'xls': 'Excel Spreadsheet',
      'xlsx': 'Excel Spreadsheet',
      'ppt': 'PowerPoint',
      'pptx': 'PowerPoint',
      'jpg': 'JPEG Image',
      'jpeg': 'JPEG Image',
      'png': 'PNG Image',
      'gif': 'GIF Image',
      'mp4': 'MP4 Video',
      'avi': 'AVI Video',
      'mov': 'QuickTime Video',
      'mp3': 'MP3 Audio',
      'wav': 'WAV Audio',
      'zip': 'ZIP Archive',
      'rar': 'RAR Archive',
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'py': 'Python',
      'java': 'Java',
      'json': 'JSON',
      'xml': 'XML',
      'csv': 'CSV',
    };

    return typeMap[extension || ''] || 'Unknown';
  };

  const isTextFile = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const textExtensions = ['txt', 'md', 'js', 'ts', 'py', 'java', 'json', 'xml', 'csv', 'html', 'css'];
    return textExtensions.includes(extension || '');
  };

  const isImageFile = (fileName: string): boolean => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    return imageExtensions.includes(extension || '');
  };

  const renderContent = () => {
    if (isTextFile(file.name)) {
      const content = file.content || '';
      const lines = content.split('\n');
      const previewLines = showFullContent ? lines : lines.slice(0, 20);
      const hasMore = lines.length > 20;

      return (
        <div className="space-y-4">
          <div className="bg-gray-50 border rounded-lg p-4">
            <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono overflow-x-auto">
              {previewLines.join('\n')}
            </pre>
            
            {hasMore && !showFullContent && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowFullContent(true)}
                  className="btn btn-secondary text-sm"
                >
                  Show Full Content ({lines.length} lines)
                </button>
              </div>
            )}
            
            {showFullContent && hasMore && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowFullContent(false)}
                  className="btn btn-secondary text-sm"
                >
                  Show Preview Only
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isImageFile(file.name)) {
      // For demo purposes, show a placeholder
      return (
        <div className="text-center py-8">
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-600">Image Preview</p>
            <p className="text-sm text-gray-500 mt-1">
              {file.name}
            </p>
          </div>
        </div>
      );
    }

    // For other file types, show file info
    return (
      <div className="text-center py-8">
        <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600">Binary File</p>
          <p className="text-sm text-gray-500 mt-1">
            Preview not available for this file type
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* File Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {file.name}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {getFileType(file.name)}
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600"
          title="Close preview"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* File Metadata */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Size:</span>
          <span className="font-medium">{formatFileSize(file.size)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Created:</span>
          <span className="font-medium">{formatDate(file.createdAt)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Modified:</span>
          <span className="font-medium">{formatDate(file.updatedAt)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Path:</span>
          <span className="font-mono text-xs bg-white px-2 py-1 rounded border">
            {file.path}
          </span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">ID:</span>
          <span className="font-mono text-xs bg-white px-2 py-1 rounded border">
            {file.id}
          </span>
        </div>
      </div>

      {/* File Content */}
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Content Preview</h4>
        {renderContent()}
      </div>
    </div>
  );
}