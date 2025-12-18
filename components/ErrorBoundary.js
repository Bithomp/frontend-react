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
      'String.prototype.search called on null or undefined',
      "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
      "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
      "Failed to read the 'localStorage' property from 'Window': Access is denied for this document.",
      'The operation is insecure.',
      'The object can not be found here.',
      "null is not an object (evaluating 'localStorage.getItem')",
      "Cannot read properties of null (reading 'getItem')",
      "Cannot read properties of null (reading 'createImageData')"
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
          <h1 className="contrast">Something went wrong, contact our support.</h1>
          <center>
            <Mailto email="support@bithomp.com" headers={{ subject: 'Frontend error' }} />
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
