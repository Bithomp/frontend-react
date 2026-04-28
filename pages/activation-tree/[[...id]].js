import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'

import SEO from '../../components/SEO'
import AddressInput from '../../components/UI/AddressInput'
import styles from '../../styles/pages/activation-tree.module.scss'

import { axiosServer, passHeaders } from '../../utils/axios'
import { explorerName, isAddressValid } from '../../utils'
import {
  AddressWithIcon,
  amountFormat,
  dateFormat,
  fullDateAndTime,
  shortHash,
  shortNiceNumber,
  userOrServiceName
} from '../../utils/format'

const DESCENDANT_DEPTH = 1
const INITIAL_ANCESTOR_DEPTH = 1
const ANCESTOR_STEP = 5
const INITIAL_VISIBLE_CHILDREN = 20
const INITIAL_VISIBLE_ROOT_CHILDREN = 10
const VISIBLE_CHILDREN_STEP = 20

const safeNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const buildDetailsData = (raw) => {
  if (!raw) return null
  const address = raw?.accountDetails?.address || raw?.address || raw?.account
  if (!address) return null
  const username = raw?.accountDetails?.username || raw?.username || raw?.addressDetails?.username || null
  const service =
    raw?.accountDetails?.service || raw?.service?.name || raw?.service?.domain || raw?.addressDetails?.service || null

  return {
    ...raw,
    address,
    addressDetails: {
      service,
      username
    }
  }
}

const countDescendants = (nodes) =>
  (nodes || []).reduce((sum, node) => sum + 1 + countDescendants(node?.descendants || []), 0)

const sortNodesByInception = (nodes) =>
  [...(nodes || [])].sort((a, b) => {
    const aInception = safeNumber(a?.inception) ?? Number.MAX_SAFE_INTEGER
    const bInception = safeNumber(b?.inception) ?? Number.MAX_SAFE_INTEGER
    if (aInception !== bInception) return aInception - bInception
    return String(a?.account || '').localeCompare(String(b?.account || ''))
  })

const uniqueByAccount = (nodes) => {
  const seen = new Set()

  return (nodes || []).filter((node) => {
    const key = node?.account || node?.address || node?.details?.address
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const decorateDescendantTree = (nodes) =>
  (nodes || []).map((node) => {
    const descendants = decorateDescendantTree(node.descendants || [])

    return {
      ...node,
      details: buildDetailsData(node),
      descendants,
      totalDescendants: countDescendants(descendants)
    }
  })

const decorateAncestors = (nodes) =>
  (nodes || []).map((node) => ({
    ...node,
    details: buildDetailsData(node),
    descendants: []
  }))

const fetchApiPayload = async (url, req) => {
  const response = req
    ? await axiosServer({
        method: 'get',
        url,
        headers: passHeaders(req)
      })
    : await axios(url)

  const payload = response?.data || {}
  if (payload?.error) {
    throw new Error(payload.error)
  }

  return payload
}

const fetchGenesisServer = async (req) => {
  const response = await axiosServer({
    method: 'get',
    url: 'v2/genesis',
    headers: passHeaders(req)
  })

  return response?.data || {}
}

const resolveUsernameClient = async (value) => {
  const response = await axios(`v2/username/${encodeURIComponent(value)}?username=true&service=true`)
  const payload = response?.data
  if (!payload?.address || payload?.error) {
    throw new Error(payload?.error || payload?.message || 'Failed to resolve username')
  }
  return payload.address
}

const fetchDescendants = (address, req) =>
  fetchApiPayload(`v2/account/${address}/descendants?depth=${DESCENDANT_DEPTH}`, req)
const fetchAncestors = (address, depth, req) => fetchApiPayload(`v2/account/${address}/ancestors?depth=${depth}`, req)

const buildTreeState = async (address, req, ancestorsDepth = INITIAL_ANCESTOR_DEPTH) => {
  const [descendantsData, ancestorsData] = await Promise.all([
    fetchDescendants(address, req),
    fetchAncestors(address, ancestorsDepth, req)
  ])
  const descendantsTree = decorateDescendantTree(descendantsData?.descendants || [])
  const ancestors = decorateAncestors(ancestorsData?.ancestors || [])
  const initialBalance = descendantsData?.initialBalance ?? ancestorsData?.initialBalance
  const genesisBalance =
    descendantsData?.genesisBalance ??
    ancestorsData?.genesisBalance ??
    descendantsData?.genesis_balance ??
    ancestorsData?.genesis_balance
  const rootHasGenesisBalance = initialBalance == null && safeNumber(genesisBalance) !== null
  const rootData = buildDetailsData({
    account: descendantsData?.account ?? ancestorsData?.account ?? address,
    accountDetails: descendantsData?.accountDetails ?? ancestorsData?.accountDetails ?? { address },
    initialBalance,
    genesisBalance,
    balance: descendantsData?.balance ?? ancestorsData?.balance,
    inception: descendantsData?.inception ?? ancestorsData?.inception
  })

  return {
    pageMode: 'tree',
    initialError: '',
    rootData,
    ancestors,
    ancestorsDepth,
    ancestorsHasMore: !rootHasGenesisBalance && ancestors.length >= ancestorsDepth,
    descendantsTree,
    totalDescendants: countDescendants(descendantsTree),
    genesisStarters: []
  }
}

const sanitizeForProps = (value) => JSON.parse(JSON.stringify(value))

export async function getServerSideProps(context) {
  const { locale, req, params } = context
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id
  const address = idParam || ''

  let pageMode = 'genesis'
  let initialError = ''
  let rootData = null
  let ancestors = []
  let descendantsTree = []
  let totalDescendants = 0
  let genesisStarters = []

  if (address) {
    if (!isAddressValid(address)) {
      initialError = 'invalid-address'
    } else {
      try {
        ;({ pageMode, initialError, rootData, ancestors, descendantsTree, totalDescendants } = await buildTreeState(
          address,
          req
        ))
      } catch (error) {
        initialError = error?.message || 'failed'
      }
    }
  } else {
    try {
      const genesisData = await fetchGenesisServer(req)
      genesisStarters = genesisData?.genesis || []
    } catch {
      initialError = 'failed'
    }
  }

  return {
    props: {
      pageMode,
      initialError,
      rootData: sanitizeForProps(rootData || null),
      ancestors: sanitizeForProps(ancestors),
      ancestorsDepth: sanitizeForProps(pageMode === 'tree' ? INITIAL_ANCESTOR_DEPTH : 0),
      ancestorsHasMore: sanitizeForProps(pageMode === 'tree' ? ancestors.length >= INITIAL_ANCESTOR_DEPTH : false),
      descendantsTree: sanitizeForProps(descendantsTree),
      totalDescendants,
      genesisStarters: sanitizeForProps(genesisStarters),
      ...(await serverSideTranslations(locale, ['common', 'activation-tree']))
    }
  }
}

function NodeCard({
  node,
  isFocus,
  isPendingFocus = false,
  isLoading = false,
  subtitle,
  extraClassName,
  defaultExpanded = false,
  showFamilyCounts = true,
  onFocusAddress,
  branchControl,
  showCollapsedTime = false
}) {
  const { t } = useTranslation(['activation-tree', 'common'])
  const isVisuallyFocused = Boolean(isFocus || isPendingFocus)
  const expanded = !isLoading && (defaultExpanded || isVisuallyFocused)
  const data = node?.details || node
  const address = data?.address || node?.account
  const activationBalance = safeNumber(node?.initialBalance ?? data?.initialBalance)
  const genesisBalance = safeNumber(
    node?.genesisBalance ?? data?.genesisBalance ?? node?.genesis_balance ?? data?.genesis_balance
  )
  const initialBalance = activationBalance ?? genesisBalance
  const balance = safeNumber(node?.balance ?? data?.balance)
  const inception = safeNumber(node?.inception ?? data?.inception)
  const descendantsCount = Array.isArray(node?.descendants) ? node.descendants.length : null
  const apiChildrenCount = Math.max(0, safeNumber(node?.children ?? data?.children) ?? 0)
  const childrenCount = descendantsCount && descendantsCount > 0 ? descendantsCount : apiChildrenCount
  const isClickable = Boolean(address) && !isVisuallyFocused && typeof onFocusAddress === 'function'
  const serviceName = data?.service?.name || data?.service?.domain || data?.addressDetails?.service || null
  const username = data?.username || data?.addressDetails?.username || null
  const hasCustomLabel = Boolean(serviceName || username)

  const onActivate = () => {
    if (!isClickable) return
    onFocusAddress(address)
  }

  return (
    <div
      className={`${styles.nodeCard} ${isVisuallyFocused ? styles.nodeCardFocus : ''} ${isClickable ? styles.nodeCardClickable : ''} ${
        isLoading ? styles.nodeCardLoading : ''
      } ${extraClassName || ''}`}
      onClick={onActivate}
      onKeyDown={(event) => {
        if (!isClickable) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onActivate()
        }
      }}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-busy={isLoading ? 'true' : undefined}
    >
      <div className={styles.nodeGlow} />
      {isLoading && (
        <div className={styles.nodeLoadingOverlay}>
          <span className={styles.nodeLoadingSpinner} />
          <span className={styles.nodeLoadingText}>{t('general.loading', { ns: 'common' })}</span>
        </div>
      )}
      {subtitle && <div className={styles.nodeKicker}>{subtitle}</div>}
      <div className={styles.nodeTop}>
        <AddressWithIcon address={address}>
          <div className={`${styles.nodeText} ${!hasCustomLabel ? styles.nodeTextSingle : ''}`}>
            <div className={styles.nodeTitle}>
              {userOrServiceName({ service: serviceName, username }) || shortHash(address, 8)}
            </div>
            {hasCustomLabel && <div className={styles.nodeAddress}>{address ? shortHash(address, 8) : '-'}</div>}
          </div>
        </AddressWithIcon>
      </div>

      {!expanded && (
        <div className={styles.nodePreview}>
          <div className={styles.previewBalances}>
            {(initialBalance ?? balance) !== null && (
              <span className={styles.previewCurrent}>{shortNiceNumber(initialBalance ?? balance, 0, 1)} XRP</span>
            )}
            {balance !== null && <span className={styles.previewStrong}>{shortNiceNumber(balance, 0, 1)} XRP</span>}
          </div>
          {(inception || showFamilyCounts) && (
            <div className={styles.previewMeta}>
              {inception && (
                <span className={`${styles.previewMuted} ${styles.previewDate}`}>
                  {showCollapsedTime ? fullDateAndTime(inception) : dateFormat(inception)}
                </span>
              )}
              {showFamilyCounts && (
                <span className={`${styles.previewMuted} ${styles.previewCount}`}>
                  {t('child-count', { count: childrenCount })}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {address && (
        <div className={styles.nodeActions}>
          <Link
            href={`/account/${address}`}
            className={`${styles.nodeLink} ${styles.nodeLinkSmall}`}
            onClick={(event) => event.stopPropagation()}
          >
            {t('open-account')}
          </Link>
        </div>
      )}

      {expanded && (
        <>
          <div className={styles.nodeDivider} />

          <dl className={styles.nodeDetails}>
            {balance !== null && (
              <>
                <dt>{t('label-current-balance')}</dt>
                <dd>{amountFormat(Math.round(balance * 1000000), { maxFractionDigits: 6, noSpace: false })}</dd>
              </>
            )}
            {initialBalance !== null && (
              <>
                <dt>{activationBalance !== null ? t('label-activation-balance') : t('label-genesis-balance')}</dt>
                <dd>{amountFormat(Math.round(initialBalance * 1000000), { maxFractionDigits: 6, noSpace: false })}</dd>
              </>
            )}
            {inception && (
              <>
                <dt>{t('label-activated')}</dt>
                <dd suppressHydrationWarning>{fullDateAndTime(inception, null, { asText: true })}</dd>
              </>
            )}
            {serviceName && (
              <>
                <dt>Service</dt>
                <dd>
                  <span className="green bold">{serviceName}</span>
                </dd>
              </>
            )}
            {username && (
              <>
                <dt>Username</dt>
                <dd>
                  <span className="blue bold">{username}</span>
                </dd>
              </>
            )}
          </dl>

          <div
            className={styles.nodeActions}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {!isVisuallyFocused && (
              <Link href={`/activation-tree/${address}`} className={styles.nodeLinkAlt}>
                {t('focus-tree')}
              </Link>
            )}
          </div>

          {branchControl && (
            <div
              className={styles.nodeBranchControl}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {branchControl}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ChildrenExpander({ hiddenCount, onExpand }) {
  const { t } = useTranslation('activation-tree')
  const showCount = Math.min(VISIBLE_CHILDREN_STEP, hiddenCount)
  const leftCount = Math.max(0, hiddenCount - showCount)

  return (
    <button type="button" className={styles.showMoreButton} onClick={onExpand}>
      {leftCount > 0
        ? t('show-more-children-left', { count: showCount, left: leftCount })
        : t('show-more-children', { count: showCount })}
    </button>
  )
}

function DescendantBranch({ node, level = 0, onFocusAddress, pendingFocusAddress }) {
  const { t } = useTranslation('activation-tree')
  const [visibleChildren, setVisibleChildren] = useState(INITIAL_VISIBLE_CHILDREN)
  const [branchExpanded, setBranchExpanded] = useState(false)
  const orderedChildren = useMemo(() => sortNodesByInception(node?.descendants || []), [node?.descendants])
  const shownChildren = orderedChildren.slice(0, visibleChildren)
  const hiddenCount = Math.max(0, orderedChildren.length - shownChildren.length)

  return (
    <div className={styles.branch}>
      <NodeCard
        node={node}
        isPendingFocus={pendingFocusAddress === node?.account}
        isLoading={pendingFocusAddress === node?.account}
        onFocusAddress={onFocusAddress}
        branchControl={
          !!orderedChildren.length &&
          !branchExpanded && (
            <button
              type="button"
              className={styles.showMoreButton}
              onClick={() => setBranchExpanded((value) => !value)}
            >
              {t('show-children', { count: orderedChildren.length })}
            </button>
          )
        }
      />
      {!!orderedChildren.length && branchExpanded && (
        <>
          <div className={styles.branchConnectorDown} />
          <div className={styles.childrenWrap}>
            <div className={styles.childrenRail} />
            <div className={styles.childrenRow}>
              {shownChildren.map((child) => (
                <DescendantBranch
                  key={child.account}
                  node={child}
                  level={level + 1}
                  onFocusAddress={onFocusAddress}
                  pendingFocusAddress={pendingFocusAddress}
                />
              ))}
            </div>
            {hiddenCount > 0 && (
              <div className={styles.showMoreWrap}>
                <ChildrenExpander
                  hiddenCount={hiddenCount}
                  onExpand={() => setVisibleChildren((value) => value + VISIBLE_CHILDREN_STEP)}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function RootChildrenSection({ descendantsTree, onFocusAddress, pendingFocusAddress, visible = true }) {
  const { t } = useTranslation('activation-tree')
  const [visibleChildren, setVisibleChildren] = useState(INITIAL_VISIBLE_ROOT_CHILDREN)
  const orderedChildren = useMemo(() => sortNodesByInception(descendantsTree || []), [descendantsTree])
  const shownChildren = orderedChildren.slice(0, visibleChildren)
  const pendingChildVisible = shownChildren.find((child) => child.account === pendingFocusAddress)
  const displayedChildren = pendingChildVisible ? [pendingChildVisible] : shownChildren
  const hiddenCount = Math.max(0, orderedChildren.length - shownChildren.length)

  if (!visible) return null

  return (
    <div className={styles.descendantZone}>
      <div className={styles.rootConnector} />
      <div className={styles.relationLabel}>{t('child-count', { count: orderedChildren.length })}</div>
      <div className={styles.childrenWrap}>
        <div className={styles.childrenRail} />
        <div className={styles.childrenRow}>
          {displayedChildren.map((child) => (
            <DescendantBranch
              key={child.account}
              node={child}
              onFocusAddress={onFocusAddress}
              pendingFocusAddress={pendingFocusAddress}
            />
          ))}
        </div>
      </div>
      {!pendingChildVisible && hiddenCount > 0 && (
        <div className={styles.showMoreWrap}>
          <ChildrenExpander
            hiddenCount={hiddenCount}
            onExpand={() => setVisibleChildren((value) => value + VISIBLE_CHILDREN_STEP)}
          />
        </div>
      )}
    </div>
  )
}

function AncestorsStack({ ancestors, ancestorsHasMore, onFocusAddress, pendingFocusAddress }) {
  const { t } = useTranslation('activation-tree')
  const visibleAncestors = [...(ancestors || [])].reverse()

  return (
    <div className={styles.ancestorsColumn}>
      {visibleAncestors.map((ancestor, index) => (
        <div key={ancestor.address} className={styles.ancestorItem}>
          <NodeCard
            node={ancestor}
            isPendingFocus={pendingFocusAddress === ancestor?.account}
            isLoading={pendingFocusAddress === ancestor?.account}
            subtitle={
              index === visibleAncestors.length - 1 || (!ancestorsHasMore && index === 0)
                ? t('ancestor-near')
                : t('ancestor-top')
            }
            onFocusAddress={onFocusAddress}
          />
          <div className={styles.ancestorConnector} />
        </div>
      ))}
    </div>
  )
}

export default function ActivationTreePage({
  pageMode,
  initialError,
  rootData,
  ancestors,
  ancestorsDepth,
  ancestorsHasMore,
  descendantsTree,
  totalDescendants,
  genesisStarters
}) {
  const router = useRouter()
  const { t } = useTranslation('activation-tree')
  const [treeState, setTreeState] = useState({
    pageMode,
    initialError,
    rootData,
    ancestors,
    ancestorsDepth,
    ancestorsHasMore,
    descendantsTree,
    totalDescendants,
    genesisStarters
  })
  const [isTreeLoading, setIsTreeLoading] = useState(false)
  const [pendingFocusAddress, setPendingFocusAddress] = useState('')
  const [searchValue, setSearchValue] = useState(rootData?.address || '')
  const [searchAddress, setSearchAddress] = useState(rootData?.address || '')
  const [searchError, setSearchError] = useState('')
  const skipAutoSubmitRef = useRef(true)
  const rootHasGenesisBalance =
    safeNumber(treeState.rootData?.initialBalance) === null &&
    safeNumber(treeState.rootData?.genesisBalance ?? treeState.rootData?.genesis_balance) !== null

  useEffect(() => {
    setTreeState({
      pageMode,
      initialError,
      rootData,
      ancestors,
      ancestorsDepth,
      ancestorsHasMore,
      descendantsTree,
      totalDescendants,
      genesisStarters
    })
    setSearchValue(rootData?.address || '')
    setSearchAddress(rootData?.address || '')
    setPendingFocusAddress('')
    skipAutoSubmitRef.current = true
  }, [
    pageMode,
    initialError,
    rootData,
    ancestors,
    ancestorsDepth,
    ancestorsHasMore,
    descendantsTree,
    totalDescendants,
    genesisStarters
  ])

  useEffect(() => {
    if (skipAutoSubmitRef.current) {
      skipAutoSubmitRef.current = false
      return
    }

    if (!isAddressValid(searchAddress) || searchAddress === treeState.rootData?.address) return

    router.push(`/activation-tree/${searchAddress}`)
  }, [router, searchAddress, treeState.rootData?.address])

  const onFocusAddress = async (address) => {
    if (!address || address === treeState.rootData?.address || isTreeLoading) return

    setIsTreeLoading(true)
    setPendingFocusAddress(address)
    setSearchError('')

    try {
      const nextState = await buildTreeState(address)
      setTreeState(nextState)
      setSearchValue(address)
      setSearchAddress(address)

      router.replace(`/activation-tree/${address}`, undefined, { shallow: true, scroll: false })
    } catch {
      setSearchError(t('errors.failed'))
    } finally {
      setPendingFocusAddress('')
      setIsTreeLoading(false)
    }
  }

  const onLoadMoreAncestors = async () => {
    if (!treeState.rootData?.address || isTreeLoading || !treeState.ancestorsHasMore || rootHasGenesisBalance) return

    setIsTreeLoading(true)
    setSearchError('')

    const oldestLoadedAncestor = treeState.ancestors?.[treeState.ancestors.length - 1]
    const targetAddress = oldestLoadedAncestor?.account || oldestLoadedAncestor?.address || treeState.rootData.address

    try {
      const response = await fetchAncestors(targetAddress, ANCESTOR_STEP)
      const loadedAncestors = decorateAncestors(response?.ancestors || [])
      setTreeState((prev) => ({
        ...prev,
        ancestors: uniqueByAccount([...(prev.ancestors || []), ...loadedAncestors]),
        ancestorsDepth: (prev.ancestorsDepth || INITIAL_ANCESTOR_DEPTH) + loadedAncestors.length,
        ancestorsHasMore: loadedAncestors.length >= ANCESTOR_STEP
      }))
    } catch {
      setSearchError(t('errors.failed'))
    } finally {
      setIsTreeLoading(false)
    }
  }

  const pageTitle = useMemo(() => {
    if (treeState.rootData?.address) return `${t('title')} • ${shortHash(treeState.rootData.address, 8)}`
    return t('title')
  }, [treeState.rootData?.address, t])

  const onSubmit = async (e) => {
    e.preventDefault()
    const rawValue = String(searchValue || '').trim()
    const resolvedValue = String(searchAddress || '').trim()
    const goToTree = (address) => router.push(`/activation-tree/${address}`)

    if (!rawValue) {
      setSearchError(t('invalid-address'))
      return
    }

    if (isAddressValid(resolvedValue)) {
      setSearchError('')
      goToTree(resolvedValue)
      return
    }

    if (isAddressValid(rawValue)) {
      setSearchError('')
      goToTree(rawValue)
      return
    }

    try {
      const resolvedAddress = await resolveUsernameClient(rawValue)
      setSearchError('')
      setSearchAddress(resolvedAddress)
      goToTree(resolvedAddress)
    } catch {
      setSearchError(t('invalid-address'))
    }
  }

  return (
    <>
      <SEO title={pageTitle} description={t('description', { explorerName })} />
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroAura} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.heroEyebrow}>{explorerName}</div>
              <h1>{t('title')}</h1>
              <p>{t('description', { explorerName })}</p>
            </div>

            <form className={styles.searchCard} onSubmit={onSubmit}>
              <label className={styles.searchLabel}>{t('search-label')}</label>
              <AddressInput
                placeholder={t('search-placeholder')}
                title={t('search-title')}
                setValue={setSearchAddress}
                setInnerValue={setSearchValue}
              />
              {searchError && <div className="red">{searchError}</div>}
              {!searchError && treeState.initialError && (
                <div className="orange">{t(`errors.${treeState.initialError}`)}</div>
              )}
            </form>
          </div>
        </section>

        {treeState.pageMode === 'genesis' ? (
          <section className={styles.genesisSection}>
            <div className={styles.sectionHeader}>
              <h2>{t('genesis-title')}</h2>
              <p>{t('genesis-description')}</p>
            </div>

            <div className={styles.genesisGrid}>
              {treeState.genesisStarters.map((account) => (
                <NodeCard
                  key={account.address}
                  node={{
                    details: {
                      address: account.address,
                      genesisBalance: safeNumber(account.genesis_balance),
                      balance: safeNumber(account.balance)
                    },
                    account: account.address,
                    genesisBalance: safeNumber(account.genesis_balance),
                    balance: safeNumber(account.balance),
                    inception: account.inception,
                    descendants: []
                  }}
                  subtitle={`#${account.genesis_index}`}
                  extraClassName={styles.genesisCard}
                  isPendingFocus={pendingFocusAddress === account.address}
                  isLoading={pendingFocusAddress === account.address}
                  onFocusAddress={onFocusAddress}
                  showFamilyCounts={false}
                  showCollapsedTime={true}
                />
              ))}
            </div>
          </section>
        ) : (
          treeState.rootData && (
            <section className={styles.treeShell} key={treeState.rootData.address}>
              <div className={styles.sectionHeader}>
                <h2>{t('focus-title')}</h2>
              </div>

              {treeState.ancestorsHasMore && !rootHasGenesisBalance && (
                <div className={styles.topExpandWrap}>
                  <button type="button" className={styles.showMoreButton} onClick={onLoadMoreAncestors}>
                    {t('load-more-ancestors')}
                  </button>
                </div>
              )}
              {!!treeState.ancestors?.length && (
                <AncestorsStack
                  ancestors={treeState.ancestors}
                  ancestorsHasMore={treeState.ancestorsHasMore}
                  onFocusAddress={onFocusAddress}
                  pendingFocusAddress={pendingFocusAddress}
                />
              )}

              <div className={styles.focusWrap}>
                <NodeCard
                  node={{
                    ...treeState.rootData,
                    details: treeState.rootData.details || buildDetailsData(treeState.rootData),
                    descendants: treeState.descendantsTree,
                    totalDescendants: treeState.totalDescendants
                  }}
                  isFocus={!pendingFocusAddress}
                  subtitle={t('focus-node')}
                  defaultExpanded={!pendingFocusAddress}
                />
              </div>

              {!!treeState.descendantsTree?.length ? (
                <RootChildrenSection
                  descendantsTree={treeState.descendantsTree}
                  onFocusAddress={onFocusAddress}
                  pendingFocusAddress={pendingFocusAddress}
                  visible={true}
                />
              ) : (
                <div className={styles.emptyState}>{t('no-descendants')}</div>
              )}
            </section>
          )
        )}
      </div>
    </>
  )
}
