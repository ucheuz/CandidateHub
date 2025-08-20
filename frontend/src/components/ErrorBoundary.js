import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    
    // Safely set state with error information
    this.setState({
      error: error,
      errorInfo: errorInfo || { componentStack: 'No component stack available' }
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6', 
          borderRadius: '5px',
          margin: '20px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ color: '#dc3545' }}>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Error Details</summary>
            <p><strong>Error:</strong> {this.state.error ? this.state.error.toString() : 'Unknown error'}</p>
            {this.state.errorInfo && (
              <>
                <p><strong>Component Stack:</strong></p>
                <pre style={{ fontSize: '12px', backgroundColor: '#f1f3f4', padding: '10px', borderRadius: '3px' }}>
                  {this.state.errorInfo.componentStack || 'No component stack available'}
                </pre>
              </>
            )}
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
