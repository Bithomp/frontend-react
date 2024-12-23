import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'next-i18next'
import Link from 'next/link'
import InfiniteScroll from 'react-infinite-scroll-component'

export default function InfiniteScrolling({
  dataLength,
  loadMore,
  hasMore,
  errorMessage,
  subscriptionExpired,
  sessionToken,
  height,
  children
}) {
  const { t } = useTranslation()

  const [rendered, setRendered] = useState(false)

  useEffect(() => {
    setRendered(true)
  }, [])

  return (
    <InfiniteScroll
      dataLength={dataLength}
      next={loadMore}
      hasMore={hasMore}
      height={height}
      loader={
        !errorMessage &&
        rendered && (
          <p className="center">
            {hasMore !== 'first' ? (
              <>
                {!sessionToken ? (
                  <Trans i18nKey="general.login-to-bithomp-pro">
                    Loading more data is available to <Link href="/admin">logged-in</Link> Bithomp Pro subscribers.
                  </Trans>
                ) : (
                  <>
                    {!subscriptionExpired ? (
                      t('general.loading')
                    ) : (
                      <Trans i18nKey="general.renew-bithomp-pro">
                        Your Bithomp Pro subscription has expired.
                        <Link href="/admin/subscriptions">Renew your subscription</Link>.
                      </Trans>
                    )}
                  </>
                )}
              </>
            ) : (
              t('general.loading')
            )}
          </p>
        )
      }
      endMessage={<p className="center">End of list</p>}
    >
      {children}
    </InfiniteScroll>
  )
}
