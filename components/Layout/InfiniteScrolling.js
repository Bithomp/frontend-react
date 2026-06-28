import { useState, useEffect, useRef } from 'react'
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
  noSessionTokenMessage,
  height,
  endMessage,
  loadMoreMessage,
  children,
  openEmailLogin
}) {
  const { t } = useTranslation()

  const [rendered, setRendered] = useState(false)
  const loadMoreRef = useRef(loadMore)
  const wasLoadMoreBlockedRef = useRef(false)
  const hasMoreData = !!hasMore
  const isInitialLoad = hasMore === 'first'
  const isLoadMoreBlocked = hasMoreData && !isInitialLoad && (!sessionToken || subscriptionExpired)
  const canLoadMore = hasMoreData && !isLoadMoreBlocked

  const gatedMessage = !errorMessage && rendered && isLoadMoreBlocked && (
    <p className="center">
      {!sessionToken ? (
        <>
          <Trans i18nKey="general.login-to-bithomp-pro">
            Loading more data is available to{' '}
            <span className="link" onClick={() => openEmailLogin?.()}>
              logged-in
            </span>{' '}
            Bithomp Pro subscribers.
          </Trans>
          {noSessionTokenMessage && (
            <>
              <br />
              {noSessionTokenMessage}
            </>
          )}
        </>
      ) : (
        <Trans i18nKey="general.renew-bithomp-pro">
          Your Bithomp Pro subscription has expired.
          <Link href="/admin#bithomp-pro-subscription">Renew your subscription</Link>.
        </Trans>
      )}
    </p>
  )

  useEffect(() => {
    setRendered(true)
  }, [])

  useEffect(() => {
    loadMoreRef.current = loadMore
  }, [loadMore])

  useEffect(() => {
    if (rendered && wasLoadMoreBlockedRef.current && canLoadMore) {
      loadMoreRef.current?.()
    }

    wasLoadMoreBlockedRef.current = isLoadMoreBlocked
  }, [canLoadMore, isLoadMoreBlocked, rendered])

  return (
    <InfiniteScroll
      dataLength={dataLength}
      next={loadMore}
      hasMore={canLoadMore}
      height={height}
      loader={
        !errorMessage &&
        rendered &&
        canLoadMore && (
          <p className="center">
            {loadMoreMessage || t('general.loading')}
          </p>
        )
      }
      endMessage={gatedMessage || <p className="center">{errorMessage || endMessage || 'End of list.'}</p>}
    >
      {children}
    </InfiniteScroll>
  )
}
