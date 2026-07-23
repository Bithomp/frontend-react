import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import axios from 'axios'

import SEO from '../../components/SEO'
import FullHash from '../../components/UI/FullHash'
import AddressInput from '../../components/UI/AddressInput'
import styles from '../../styles/pages/activation-tree.module.scss'

import { axiosServer, passHeaders } from '../../utils/axios'
import { explorerName, ledgerName, nativeCurrency } from '../../utils'
import { shouldIndexAccount } from '../../utils/seo'
import {
  AddressWithIcon,
  dateFormat,
  fullDateAndTime,
  fullNiceNumber,
  shortHash,
  shortNiceNumber,
  userOrServiceName
} from '../../utils/format'

const TREE_DEPTH = 1
const ANCESTOR_STEP = 5
const INITIAL_VISIBLE_CHILDREN = 20
const INITIAL_VISIBLE_ROOT_CHILDREN = 10
const VISIBLE_CHILDREN_STEP = 20

const safeNumber = (value) => {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const buildDetailsData = (raw) => {
  if (!raw) return null
  const accountDetails = raw?.accountDetails || {}
  const address = accountDetails.address || raw?.address || raw?.account
  if (!address) return null

  return {
    ...raw,
    address,
    addressDetails: {
      service: accountDetails.service || null,
      username: accountDetails.username || null,
      nickname: accountDetails.nickname || null
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

const getNodeData = (node) => node?.details || node

const getKnownChildrenCount = (node) => safeNumber(getNodeData(node)?.children)

const hasCheckedChildren = (node) => node?._childrenLoaded === true || node?.details?._childrenLoaded === true

const hasGenesisBalance = (node) => {
  const data = getNodeData(node)
  const initialBalance = safeNumber(data?.initialBalance)
  const genesisBalance = safeNumber(data?.genesisBalance)

  return initialBalance === null && genesisBalance !== null
}

const decorateDescendantTree = (nodes, { childrenLoaded = false } = {}) =>
  (nodes || []).map((node) => {
    const descendants = decorateDescendantTree(node.descendants || [], { childrenLoaded })

    return {
      ...node,
      _childrenLoaded: childrenLoaded,
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

const accountPathParam = (account) => encodeURIComponent(account)

const fetchDescendants = (account, req, depth = TREE_DEPTH) =>
  fetchApiPayload(`v2/account/${accountPathParam(account)}/descendants?depth=${depth}`, req)
const fetchAncestors = (account, depth, req) =>
  fetchApiPayload(`v2/account/${accountPathParam(account)}/ancestors?depth=${depth}`, req)

const getAccountUsername = (account) =>
  account?.addressDetails?.username ||
  account?.details?.addressDetails?.username ||
  account?.accountDetails?.username ||
  account?.username ||
  ''

const buildTreeState = async (address, req, ancestorsDepth = TREE_DEPTH) => {
  const [descendantsData, ancestorsData] = await Promise.all([
    fetchDescendants(address, req),
    fetchAncestors(address, ancestorsDepth, req)
  ])
  const descendantsTree = decorateDescendantTree(descendantsData?.descendants || [])
  const ancestors = decorateAncestors(ancestorsData?.ancestors || [])
  const rootData = buildDetailsData({
    account: descendantsData?.parent,
    accountDetails: descendantsData?.parentDetails,
    initialBalance: descendantsData?.initialBalance,
    genesisBalance: descendantsData?.genesisBalance,
    balance: descendantsData?.balance,
    inception: descendantsData?.inception
  })
  const reachedGenesis = hasGenesisBalance(rootData) || ancestors.some(hasGenesisBalance)

  return {
    pageMode: 'tree',
    initialError: '',
    rootData,
    ancestors,
    ancestorsDepth,
    ancestorsHasMore: !reachedGenesis && ancestors.length >= ancestorsDepth,
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
  let ancestorsDepth = 0
  let ancestorsHasMore = false
  let descendantsTree = []
  let totalDescendants = 0
  let genesisStarters = []

  if (address) {
    try {
      ;({
        pageMode,
        initialError,
        rootData,
        ancestors,
        ancestorsDepth,
        ancestorsHasMore,
        descendantsTree,
        totalDescendants
      } = await buildTreeState(address, req))
    } catch (error) {
      initialError = error?.message || 'failed'
    }
  } else {
    try {
      const genesisData = await fetchDescendants('genesis', req)
      genesisStarters = decorateDescendantTree(genesisData?.genesis || genesisData?.descendants || [])
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
      ancestorsDepth: sanitizeForProps(ancestorsDepth),
      ancestorsHasMore: sanitizeForProps(ancestorsHasMore),
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
  const data = getNodeData(node)
  const address = data?.address || data?.account
  const activationBalance = safeNumber(data?.initialBalance)
  const genesisBalance = safeNumber(data?.genesisBalance)
  const initialBalance = activationBalance ?? genesisBalance
  const balance = safeNumber(data?.balance)
  const inception = safeNumber(data?.inception)
  const descendantsCount = Array.isArray(node?.descendants) ? node.descendants.length : null
  const apiChildrenCount = Math.max(0, safeNumber(data?.children) ?? 0)
  const childrenCount = descendantsCount && descendantsCount > 0 ? descendantsCount : apiChildrenCount
  const isClickable = Boolean(address) && !isVisuallyFocused && typeof onFocusAddress === 'function'
  const { service: serviceName, username, nickname } = data?.addressDetails || {}
  const displayName =
    userOrServiceName({ service: serviceName, username }) ||
    (nickname ? <span className="orange bold">{nickname}</span> : <FullHash value={address} length={8} />)
  const hasCustomLabel = Boolean(serviceName || username || nickname)

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
            <div className={styles.nodeTitle}>{displayName}</div>
            {hasCustomLabel && (
              <div className={styles.nodeAddress}>{address ? <FullHash value={address} length={8} /> : '-'}</div>
            )}
          </div>
        </AddressWithIcon>
      </div>

      {!expanded && (
        <div className={styles.nodePreview}>
          <div className={styles.previewBalances}>
            {(initialBalance ?? balance) !== null && (
              <span className={styles.previewCurrent}>
                {shortNiceNumber(initialBalance ?? balance, 0, 1)} {nativeCurrency}
              </span>
            )}
            {balance !== null && (
              <span className={styles.previewStrong}>
                {shortNiceNumber(balance, 0, 1)} {nativeCurrency}
              </span>
            )}
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

      {(address || branchControl) && (
        <div className={styles.nodeActions}>
          {address && (
            <Link
              href={`/account/${address}`}
              className={`${styles.nodeLink} ${styles.nodeLinkSmall}`}
              onClick={(event) => event.stopPropagation()}
            >
              {t('open-account')}
            </Link>
          )}
          {branchControl && (
            <div
              className={styles.nodeActionControl}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              {branchControl}
            </div>
          )}
        </div>
      )}

      {expanded && (
        <>
          <div className={styles.nodeDivider} />

          <dl className={styles.nodeDetails}>
            {balance !== null && (
              <>
                <dt>{t('label-current-balance')}</dt>
                <dd>
                  {fullNiceNumber(balance)} {nativeCurrency}
                </dd>
              </>
            )}
            {initialBalance !== null && (
              <>
                <dt>{activationBalance !== null ? t('label-activation-balance') : t('label-genesis-balance')}</dt>
                <dd>
                  {fullNiceNumber(initialBalance)} {nativeCurrency}
                </dd>
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
                <dt>{t('label-service')}</dt>
                <dd>
                  <span className="green bold">{serviceName}</span>
                </dd>
              </>
            )}
            {username && (
              <>
                <dt>{t('label-username')}</dt>
                <dd>
                  <span className="blue bold">{username}</span>
                </dd>
              </>
            )}
            {nickname && (
              <>
                <dt>{t('label-nickname')}</dt>
                <dd>
                  <span className="orange bold">{nickname}</span>
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
        </>
      )}
    </div>
  )
}

function ChildrenExpander({ hiddenCount, onExpand }) {
  const { t } = useTranslation('activation-tree')
  const showCount = Math.min(VISIBLE_CHILDREN_STEP, hiddenCount)

  return (
    <button type="button" className={styles.showMoreButton} onClick={onExpand}>
      {hiddenCount > showCount
        ? t('show-more-children-left', { count: showCount, left: hiddenCount })
        : t('show-more-children', { count: showCount })}
    </button>
  )
}

function DescendantBranch({
  node,
  level = 0,
  onFocusAddress,
  pendingFocusAddress,
  nodeSubtitle,
  nodeExtraClassName,
  showCollapsedTime = false,
  showFamilyCounts = true
}) {
  const { t } = useTranslation(['activation-tree', 'common'])
  const [visibleChildren, setVisibleChildren] = useState(INITIAL_VISIBLE_CHILDREN)
  const [branchExpanded, setBranchExpanded] = useState(false)
  const [loadedChildren, setLoadedChildren] = useState(node?.descendants || [])
  const [childrenLoaded, setChildrenLoaded] = useState(hasCheckedChildren(node) || getKnownChildrenCount(node) === 0)
  const [isChildrenLoading, setIsChildrenLoading] = useState(false)
  const address = node?.details?.address || node?.account || node?.address
  const knownChildrenCount = getKnownChildrenCount(node)
  const orderedChildren = useMemo(() => sortNodesByInception(loadedChildren), [loadedChildren])
  const shownChildren = orderedChildren.slice(0, visibleChildren)
  const hiddenCount = Math.max(0, orderedChildren.length - shownChildren.length)
  const canToggleChildren = orderedChildren.length > 0 || !childrenLoaded
  const nodeWithLoadedChildren = {
    ...node,
    children: childrenLoaded ? loadedChildren.length : node?.children,
    descendants: loadedChildren
  }
  const showLoadedFamilyCounts =
    showFamilyCounts && (childrenLoaded || orderedChildren.length > 0 || knownChildrenCount !== null)

  useEffect(() => {
    const nextChildren = node?.descendants || []
    setLoadedChildren(nextChildren)
    setChildrenLoaded(hasCheckedChildren(node) || getKnownChildrenCount(node) === 0)
    setBranchExpanded(false)
    setVisibleChildren(INITIAL_VISIBLE_CHILDREN)
  }, [node])

  const onToggleChildren = async (event) => {
    event.stopPropagation()

    if (branchExpanded) {
      setBranchExpanded(false)
      return
    }

    if (childrenLoaded) {
      setBranchExpanded(orderedChildren.length > 0)
      return
    }

    if (!address || isChildrenLoading) return

    if (orderedChildren.length > 0) {
      setBranchExpanded(true)
    }

    setIsChildrenLoading(true)
    try {
      const response = await fetchDescendants(address)
      const nextChildren = decorateDescendantTree(response?.descendants || [], { childrenLoaded: true })
      setLoadedChildren(nextChildren)
      setChildrenLoaded(true)
      setVisibleChildren(INITIAL_VISIBLE_CHILDREN)
      setBranchExpanded((value) => value || nextChildren.length > 0)
    } catch {
      setChildrenLoaded(false)
    } finally {
      setIsChildrenLoading(false)
    }
  }

  const branchToggle =
    canToggleChildren && (
      <button
        type="button"
        className={styles.showMoreButton}
        onClick={onToggleChildren}
        disabled={isChildrenLoading}
        aria-busy={isChildrenLoading ? 'true' : undefined}
      >
        {isChildrenLoading
          ? t('general.loading', { ns: 'common' })
          : branchExpanded
            ? t('hide-children')
            : t('show-children')}
      </button>
    )

  return (
    <div className={styles.branch}>
      <NodeCard
        node={nodeWithLoadedChildren}
        isPendingFocus={pendingFocusAddress === node?.account}
        isLoading={pendingFocusAddress === node?.account}
        onFocusAddress={onFocusAddress}
        subtitle={nodeSubtitle}
        extraClassName={nodeExtraClassName}
        showCollapsedTime={showCollapsedTime}
        showFamilyCounts={showLoadedFamilyCounts}
        branchControl={branchToggle}
      />
      {!!orderedChildren.length && branchExpanded && (
        <>
          <div className={styles.branchConnectorDown} />
          <div className={`${styles.childrenWrap} ${styles.childrenGroup}`}>
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
  const [isAncestorsLoading, setIsAncestorsLoading] = useState(false)
  const [pendingFocusAddress, setPendingFocusAddress] = useState('')
  const [searchError, setSearchError] = useState('')
  const treeHasGenesisBalance =
    hasGenesisBalance(treeState.rootData) || (treeState.ancestors || []).some(hasGenesisBalance)
  const isIndexableTree = treeState.pageMode === 'genesis' || shouldIndexAccount(treeState.rootData)

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
    setPendingFocusAddress('')
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

  const onFocusAddress = async (address) => {
    if (!address || address === treeState.rootData?.address || isTreeLoading) return

    setIsTreeLoading(true)
    setPendingFocusAddress(address)
    setSearchError('')

    try {
      const nextState = await buildTreeState(address)
      setTreeState(nextState)

      router.push(`/activation-tree/${address}`, undefined, { shallow: true, scroll: false })
    } catch {
      setSearchError(t('errors.failed'))
    } finally {
      setPendingFocusAddress('')
      setIsTreeLoading(false)
    }
  }

  const onLoadMoreAncestors = async () => {
    if (
      !treeState.rootData?.address ||
      isTreeLoading ||
      isAncestorsLoading ||
      !treeState.ancestorsHasMore ||
      treeHasGenesisBalance
    )
      return

    setIsAncestorsLoading(true)
    setIsTreeLoading(true)
    setSearchError('')

    const oldestLoadedAncestor = treeState.ancestors?.[treeState.ancestors.length - 1]
    const targetAddress = oldestLoadedAncestor?.account || oldestLoadedAncestor?.address || treeState.rootData.address

    try {
      const response = await fetchAncestors(targetAddress, ANCESTOR_STEP)
      const loadedAncestors = decorateAncestors(response?.ancestors || [])
      setTreeState((prev) => {
        const nextAncestors = uniqueByAccount([...(prev.ancestors || []), ...loadedAncestors])

        return {
          ...prev,
          ancestors: nextAncestors,
          ancestorsDepth: (prev.ancestorsDepth || TREE_DEPTH) + loadedAncestors.length,
          ancestorsHasMore: !nextAncestors.some(hasGenesisBalance) && loadedAncestors.length >= ANCESTOR_STEP
        }
      })
    } catch {
      setSearchError(t('errors.failed'))
    } finally {
      setIsAncestorsLoading(false)
      setIsTreeLoading(false)
    }
  }

  const pageTitle = useMemo(() => {
    if (treeState.rootData?.address) return `${t('title')} • ${shortHash(treeState.rootData.address, 8)}`
    return t('title')
  }, [treeState.rootData?.address, t])
  const pageDescription = useMemo(
    () => t('description', { explorerName, ledgerName, nativeCurrency }),
    [t]
  )
  const searchPlaceholder = useMemo(() => t('search-placeholder', { nativeCurrency }), [t])
  const addressInputData = useMemo(() => {
    const address = treeState.rootData?.address
    if (!address) return {}

    const details =
      treeState.rootData?.addressDetails || treeState.rootData?.details?.addressDetails || treeState.rootData?.accountDetails || {}
    const username = getAccountUsername(treeState.rootData)

    return {
      address,
      addressDetails: {
        username,
        service: details.service || treeState.rootData?.service?.name || treeState.rootData?.service?.domain
      }
    }
  }, [treeState.rootData])

  useEffect(() => {
    const username = getAccountUsername(treeState.rootData)
    const routeAccount = Array.isArray(router.query.id) ? router.query.id[0] : router.query.id

    if (!username || !routeAccount || routeAccount === username) return

    router.replace(`/activation-tree/${encodeURIComponent(username)}`, undefined, { shallow: true, scroll: false })
  }, [router, treeState.rootData])

  const goToTree = (account) => {
    const rawValue = String(account || '').trim()
    if (!rawValue) {
      setSearchError('')
      return
    }

    setSearchError('')
    router.push(`/activation-tree/${encodeURIComponent(rawValue)}`)
  }

  return (
    <>
      <SEO title={pageTitle} description={pageDescription} noindex={!isIndexableTree} />
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroAura} />
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <div className={styles.heroEyebrow}>{explorerName}</div>
              <h1>{t('title')}</h1>
              <p>{pageDescription}</p>
            </div>

            <div className={styles.searchCard}>
              <label className={styles.searchLabel}>{t('search-label')}</label>
              <AddressInput
                placeholder={searchPlaceholder}
                title={t('search-title')}
                setValue={goToTree}
                rawData={addressInputData}
                type="address"
                skipUsernameResolveOnEnter={true}
                preferUsernameOnSelect={true}
              />
              {searchError && <div className="red">{searchError}</div>}
              {!searchError && treeState.initialError && (
                <div className="orange">{t(`errors.${treeState.initialError}`, { ledgerName })}</div>
              )}
            </div>
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
                <DescendantBranch
                  key={account.account || account.address || account.details?.address}
                  node={account}
                  onFocusAddress={onFocusAddress}
                  pendingFocusAddress={pendingFocusAddress}
                  nodeExtraClassName={styles.genesisCard}
                  showCollapsedTime={true}
                  showFamilyCounts={true}
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

              {treeState.ancestorsHasMore && !treeHasGenesisBalance && (
                <div className={styles.topExpandWrap}>
                  <button
                    type="button"
                    className={styles.showMoreButton}
                    onClick={onLoadMoreAncestors}
                    disabled={isAncestorsLoading}
                    aria-busy={isAncestorsLoading ? 'true' : undefined}
                  >
                    {isAncestorsLoading ? t('loading-ancestors') : t('load-more-ancestors')}
                  </button>
                </div>
              )}
              {treeHasGenesisBalance && (
                <div className={styles.topExpandWrap}>
                  <Link href="/activation-tree" className={styles.showMoreButton}>
                    {t('back-to-genesis')}
                  </Link>
                </div>
              )}
              {!!treeState.ancestors?.length && (
                <AncestorsStack
                  ancestors={treeState.ancestors}
                  ancestorsHasMore={treeState.ancestorsHasMore && !treeHasGenesisBalance}
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
