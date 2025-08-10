import React from 'react'
import axios from 'axios'
import Mailto from 'react-protected-mailto'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    //componentDidCatch(error, errorInfo)
    const knownErrorMessages = [
      "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
      "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
      "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
      'The operation is insecure.',
      'The object can not be found here.',
      "null is not an object (evaluating 'localStorage.getItem')"
    ]

    if (process.env.NODE_ENV === 'development') {
      // do not report errors on localhost
      return
    }

    if (knownErrorMessages.includes(error.message)) {
      // Ignore known errors
      return
    }
    // send error details to backend
    axios
      .post('/client/ntf', {
        message: error.message,
        //stack: error.stack,
        //componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
      .catch(() => {
        // ignore errors in error reporting
      })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="center">
          <br />
          <h1>Something went wrong, contact our support.</h1>
          <Mailto email="support@bithomp.com" headers={{ subject: 'Front-end error' }} />
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
