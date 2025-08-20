import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  inline?: boolean;
}

export function LoadingSpinner({ 
  size = 'medium', 
  text = 'Loading...', 
  inline = false 
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: '20px',
    medium: '40px',
    large: '60px'
  };

  const spinnerSize = sizeMap[size];

  const spinnerStyle: React.CSSProperties = {
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #1d70b8',
    borderRadius: '50%',
    width: spinnerSize,
    height: spinnerSize,
    animation: 'spin 1s linear infinite',
    margin: inline ? '0 10px 0 0' : '0 auto'
  };

  const containerStyle: React.CSSProperties = {
    display: inline ? 'inline-flex' : 'flex',
    flexDirection: inline ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: inline ? 'flex-start' : 'center',
    padding: inline ? '0' : '20px',
    fontFamily: 'system-ui'
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={containerStyle}>
        <div style={spinnerStyle}></div>
        {text && (
          <div style={{ 
            marginTop: inline ? '0' : '15px', 
            marginLeft: inline ? '10px' : '0',
            color: '#505a5f',
            fontSize: size === 'large' ? '18px' : size === 'small' ? '14px' : '16px'
          }}>
            {text}
          </div>
        )}
      </div>
    </>
  );
}