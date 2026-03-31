import { useCallback, useEffect, useMemo, useState } from 'react'
import CheckBox from '../UI/CheckBox'
import { shortAddress } from '../../utils/format'
import {
  ledgerwalletBuildConnectSelection,
  ledgerwalletForceReset,
  ledgerwalletGetAddressesWithBalances,
  ledgerwalletNeedsReconnectFromStatus
} from '../../utils/ledgerwallet'
import { dcentBuildConnectSelection, dcentGetAddressesWithBalances } from '../../utils/dcent'

const BATCH_SIZE = 5
const DCENT_INITIAL_COUNT = 1
const DCENT_APPEND_COUNT = 1

export default function AddressSelectionPanel({
  walletType,
  active,
  buttonStyle,
  nativeCurrencyValue,
  onConnectSelection
}) {
  const [status, setStatus] = useState('')
  const [awaiting, setAwaiting] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [selectedAddresses, setSelectedAddresses] = useState([])
  const [dcentAccountIndex, setDcentAccountIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  const isLedger = walletType === 'ledgerwallet'
  const title = 'Select addresses to connect'
  const scanMoreCount = isLedger ? BATCH_SIZE : DCENT_APPEND_COUNT

  const resetLocalState = () => {
    setStatus('')
    setAwaiting(false)
    setAccounts([])
    setSelectedAddresses([])
    setDcentAccountIndex(0)
    setLoaded(false)
  }

  const loadDcentAddresses = useCallback(
    async ({ append = false } = {}) => {
      setAwaiting(true)
      const startIdx = append ? dcentAccountIndex : 0

      if (!append) {
        setAccounts([])
        setSelectedAddresses([])
        setDcentAccountIndex(DCENT_INITIAL_COUNT)
        setStatus("Connect your D'Cent Biometric Wallet via USB and approve in D'Cent Bridge. Reading addresses...")
      } else {
        setStatus('Reading next ' + DCENT_APPEND_COUNT + ' address...')
        setDcentAccountIndex((prev) => prev + DCENT_APPEND_COUNT)
      }

      try {
        const dcentCount = append ? DCENT_APPEND_COUNT : DCENT_INITIAL_COUNT
        const { rows: newRows, enrichPromise } = await dcentGetAddressesWithBalances({
          startIndex: startIdx,
          count: dcentCount
        })

        if (newRows.length > 0) {
          const baseRows = append ? [...accounts, ...newRows] : newRows
          setStatus('Loading balances...')

          const enriched = await enrichPromise
          const enrichedMap = Object.fromEntries(enriched.map((item) => [item.address, item]))
          const mergedRows = baseRows.map((item) => enrichedMap[item.address] || item)
          setAccounts(mergedRows)

          const funded = mergedRows.filter((item) => item.isFunded)
          if (!append) {
            const initialSelection = funded.length
              ? funded.map((item) => item.address)
              : mergedRows.slice(0, 1).map((x) => x.address)
            setSelectedAddresses(initialSelection)
          }

          setStatus(
            funded.length
              ? `Found ${funded.length} funded address(es).\nSelect one or more to connect.`
              : `No funded address found yet.\nSelect address(es) to connect.`
          )
        } else if (!append) {
          setStatus("No addresses found. Make sure your D'Cent device is connected and D'Cent Bridge is running.")
        }
      } catch (err) {
        setStatus(err?.message || "Failed to read addresses from D'Cent device.")
      } finally {
        setAwaiting(false)
      }
    },
    [accounts, dcentAccountIndex]
  )

  const loadLedgerAddresses = useCallback(
    async ({ append = false } = {}) => {
      try {
        setAwaiting(true)

        const start = append ? accounts.length : 0

        if (!append) {
          const previousNeedsReconnect = ledgerwalletNeedsReconnectFromStatus({
            statusText: status,
            nativeCurrencyValue
          })

          if (previousNeedsReconnect) {
            setStatus('Reconnecting to Ledger...')
            await ledgerwalletForceReset()
            await new Promise((resolve) => setTimeout(resolve, 800))
          }

          const isFirstScan = accounts.length === 0
          setStatus(
            isFirstScan
              ? 'Connect Ledger and open the ' + nativeCurrencyValue + ' app. Reading addresses...'
              : 'Reading addresses from Ledger...'
          )
          setAccounts([])
          setSelectedAddresses([])
        } else {
          setStatus('Reading next ' + BATCH_SIZE + ' addresses...')
        }

        const { rows: newRows, enrichPromise } = await ledgerwalletGetAddressesWithBalances({
          start,
          count: BATCH_SIZE,
          nativeCurrencyValue
        })

        const baseRows = append ? [...accounts, ...newRows] : newRows
        setStatus('Loading balances...')

        const enriched = await enrichPromise
        const enrichedMap = Object.fromEntries(enriched.map((item) => [item.address, item]))
        const mergedRows = baseRows.map((item) => enrichedMap[item.address] || item)
        setAccounts(mergedRows)

        const funded = mergedRows.filter((item) => item.isFunded)
        if (!append) {
          const initialSelection = funded.length
            ? funded.map((item) => item.address)
            : mergedRows.slice(0, 1).map((x) => x.address)
          setSelectedAddresses(initialSelection)
        }

        setStatus(
          funded.length
            ? `Found ${funded.length} funded address(es).\nSelect one or more to connect.`
            : `No funded address found yet.\nSelect address(es) to connect.`
        )
      } catch (err) {
        setStatus(err?.message || 'Unable to read addresses from Ledger.')
      } finally {
        setAwaiting(false)
      }
    },
    [accounts, nativeCurrencyValue, status]
  )

  useEffect(() => {
    if (!active) {
      resetLocalState()
      return
    }

    if (loaded) return

    setLoaded(true)
    if (isLedger) {
      loadLedgerAddresses()
    } else {
      loadDcentAddresses()
    }
  }, [active, isLedger, loadDcentAddresses, loadLedgerAddresses, loaded])

  const ledgerStatusText = String(status || '').toLowerCase()
  const ledgerNeedsRetry =
    isLedger &&
    (!accounts.length ||
      ledgerStatusText.includes('locked') ||
      ledgerStatusText.includes('already in use') ||
      ledgerStatusText.includes('already open') ||
      ledgerStatusText.includes('unable to read addresses') ||
      ledgerStatusText.includes('ledger error'))
  const ledgerRetryLabel = ledgerStatusText.includes('locked')
    ? 'I unlocked PIN'
    : ledgerStatusText.includes('open the xrp app')
      ? 'I opened XRP app'
      : 'Retry scan'
  const showScanMore = !!accounts.length && !awaiting

  const toggleAddress = (addressValue) => {
    setSelectedAddresses((prev) => {
      if (prev.includes(addressValue)) return prev.filter((item) => item !== addressValue)
      return [...prev, addressValue]
    })
  }

  const connectSelectedAddresses = async () => {
    const selection = isLedger
      ? ledgerwalletBuildConnectSelection({
          ledgerAccounts: accounts,
          ledgerSelectedAddresses: selectedAddresses
        })
      : dcentBuildConnectSelection({
          accounts,
          selectedAddresses
        })

    if (!selection) {
      setStatus('Please select at least one address to connect.')
      return
    }

    setAwaiting(true)
    setStatus(isLedger ? 'Connecting selected Ledger addresses...' : 'Connecting...')
    try {
      await onConnectSelection?.({
        wallet: isLedger ? 'ledgerwallet' : 'dcent',
        addresses: selection.addresses,
        walletMetaMap: selection.walletMetaMap,
        usernameMap: selection.usernameMap,
        statusSetter: setStatus
      })
    } finally {
      setAwaiting(false)
    }
  }

  const list = useMemo(() => {
    return (
      <div
        style={{
          maxHeight: 280,
          overflowY: 'auto',
          border: '1px solid var(--card-border)',
          borderRadius: 12,
          padding: 8,
          textAlign: 'left',
          margin: '0 52px'
        }}
      >
        {accounts.map((entry) => {
          const isSelected = selectedAddresses.includes(entry.address)
          const balanceLoading = entry.balanceDrops === null
          const displayBalance = balanceLoading
            ? '...'
            : `${Number(entry.balanceDrops).toFixed(6)} ${nativeCurrencyValue}`
          return (
            <CheckBox
              key={entry.address}
              checked={isSelected}
              setChecked={() => toggleAddress(entry.address)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '6px 8px',
                paddingLeft: 36,
                borderRadius: 10,
                marginTop: 0,
                marginBottom: 4,
                background: isSelected ? 'var(--background-secondary)' : 'transparent',
                cursor: 'pointer'
              }}
            >
              <span
                className="bold"
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {entry.username || shortAddress(entry.address)}
              </span>
              <span className="no-brake text-small grey" style={{ flexShrink: 0 }}>
                {displayBalance}
              </span>
            </CheckBox>
          )
        })}
      </div>
    )
  }, [accounts, selectedAddresses, nativeCurrencyValue])

  if (!active) return null

  return (
    <>
      <div className="header">{title}</div>

      <div className="orange bold center" style={{ margin: '30px', whiteSpace: 'pre-line' }}>
        {awaiting ? (
          <>
            <span className="waiting"></span>
            <br />
            <br />
          </>
        ) : null}
        {status}
      </div>

      {showScanMore ? (
        <div className="center text-small grey" style={{ margin: '-12px 30px 18px', lineHeight: 1.5 }}>
          Scanned first {accounts.length} address{accounts.length === 1 ? '' : 'es'}.{' '}
          <button
            type="button"
            onClick={() => (isLedger ? loadLedgerAddresses({ append: true }) : loadDcentAddresses({ append: true }))}
            disabled={awaiting}
            style={{
              border: 0,
              padding: 0,
              margin: 0,
              background: 'transparent',
              color: 'var(--accent-icon)',
              cursor: awaiting ? 'default' : 'pointer',
              font: 'inherit',
              textDecoration: 'underline'
            }}
          >
            Scan next {scanMoreCount}
          </button>
        </div>
      ) : null}

      {!!accounts.length ? (
        <>
          {list}
          <div style={{ marginTop: 14 }}>
            <button
              type="button"
              className="button-action"
              onClick={connectSelectedAddresses}
              style={buttonStyle}
              disabled={awaiting || !selectedAddresses.length}
            >
              {isLedger ? 'Connect selected' : 'Connect selected'}
            </button>
          </div>
        </>
      ) : null}

      {!awaiting && (!accounts.length || (isLedger && ledgerNeedsRetry)) ? (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            className="button-action"
            onClick={isLedger ? () => loadLedgerAddresses() : loadDcentAddresses}
            style={buttonStyle}
            disabled={awaiting}
          >
            {isLedger ? ledgerRetryLabel : 'Retry'}
          </button>
        </div>
      ) : null}
    </>
  )
}
