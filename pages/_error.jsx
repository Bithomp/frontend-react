import Error from 'next/error'
import { reportErrorNotification } from '../utils/errorReporting'

const CustomErrorComponent = (props) => {
  return <Error statusCode={props.statusCode} />
}

CustomErrorComponent.getInitialProps = async (contextData) => {
  const errorInitialProps = await Error.getInitialProps(contextData)
  const statusCode = contextData?.res?.statusCode || contextData?.err?.statusCode || errorInitialProps?.statusCode || 500
  const shouldNotify = statusCode >= 500

  if (shouldNotify) {
    const path = contextData?.asPath || contextData?.req?.url || ''
    const fallbackError = `Next.js error page rendered with status ${statusCode}`

    await reportErrorNotification({
      source: 'next-ssr',
      error: contextData?.err || fallbackError,
      req: contextData?.req,
      url: path,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : contextData?.req?.headers?.['user-agent'],
      extra: {
        statusCode,
        path,
        method: contextData?.req?.method
      }
    })
  }

  return errorInitialProps
}

export default CustomErrorComponent
