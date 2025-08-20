import { Component, ErrorInfo, ReactNode } from 'react';

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.state.errorInfo!);
      }

      return (
        <div style={{
          padding: '20px',
          background: '#fef7f7',
          border: '1px solid #d4351c',
          borderRadius: '4px',
          margin: '20px',
          fontFamily: 'system-ui'
        }}>
          <h2 style={{ color: '#d4351c', marginTop: 0 }}>Something went wrong</h2>
          <p style={{ marginBottom: '15px' }}>
            An unexpected error occurred. Please refresh the page and try again.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '15px' }}>
              <summary style={{ cursor: 'pointer', marginBottom: '10px' }}>
                Error Details (Development)
              </summary>
              <pre style={{
                background: '#2b2b2b',
                color: '#f8f8f2',
                padding: '10px',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                maxHeight: '300px'
              }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#1d70b8',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Reload Page
            </button>
            
            <button
              onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
              style={{
                background: '#00703c',
                color: 'white',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}