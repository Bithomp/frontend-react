import React from 'react'
import axios from 'axios'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // send error details to backend
    axios
      .post('/client/ntf', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
      .catch(() => {
        // ignore errors in error reporting
      })
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong, contact our support.</h1>
    }

    return this.props.children
  }
}

export default ErrorBoundary
