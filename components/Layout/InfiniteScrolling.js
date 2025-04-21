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
  endMessage,
  loadMoreMessage,
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
                    Use different filter options or select other search parameters to explore more NFTs that match your interests. Log in to <Link href="/admin">Bithomp Pro</Link> to enable infinite scroll and access all existing results!
                  </Trans>
                ) : (
                  <>
                    {!subscriptionExpired ? (
                      loadMoreMessage || t('general.loading')
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
              loadMoreMessage || t('general.loading')
            )}
          </p>
        )
      }
      endMessage={<p className="center">{endMessage || 'End of list'}</p>}
    >
      {children}
    </InfiniteScroll>
  )
}
