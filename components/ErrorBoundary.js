import React from 'react'
import { reportErrorNotification } from '../utils/errorReporting'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    void reportErrorNotification({
      source: 'frontend',
      error,
      url: window.location.href,
      userAgent: navigator.userAgent,
      extra: {
        componentStack: errorInfo?.componentStack
      },
      ignoreKnownClientErrors: true
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="center">
          <br />
          <h1 className="contrast">Something went wrong.</h1>
          <center>
            <a href="https://discord.gg/ZahGJ29WEs" target="_blank" rel="noreferrer">
              Contact our support on Discord
            </a>
          </center>
          <br />
          <span className="contrast">
            For technical enquiries only, send a link to this page <b>{window?.location?.href ?? ''}</b>
            <br /> where the error occurred and a brief description of what you did.
          </span>
          <br />
          <br />
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
