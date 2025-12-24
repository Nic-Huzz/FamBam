import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-content">
            <span className="error-icon">😅</span>
            <h1>Oops! Something went wrong</h1>
            <p>We're sorry, but something unexpected happened.</p>
            <div className="error-actions">
              <button
                className="btn-primary"
                onClick={() => window.location.href = '/feed'}
              >
                Go to Feed
              </button>
              <button
                className="btn-secondary"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
